project({
  id: "b02",
  level: "beginner",
  title: "Invoice data extractor",
  industry: "Accounting",
  client: "Northwind Bookkeeping: a 25-person firm doing books for 60 small businesses",
  time: "3–4 hours",
  summary: "Turn supplier invoice PDFs into validated, structured records for the accounting system, with a repair loop and a human review queue.",
  newConcepts: ["PDF input to a model", "Business-rule validators", "Repair loop with feedback", "Field-level accuracy", "Review queue"],
  patterns: ["llm-gateway", "structured-output", "validate-retry", "human-in-loop", "eval-harness"],
  skills: ["Extraction with schemas", "Separating 'valid shape' from 'correct values'", "Designing review thresholds", "Field-level evaluation with normalisation"],

  brief: md`
> "Our bookkeepers type invoices into QuickBooks all day. About 9,000 a month, all PDFs, every supplier with a different layout. We tried a template-based OCR tool and it broke every time a supplier changed their invoice design."
> (Managing Partner, Northwind Bookkeeping)
`,

  discovery: md`
| Question | Answer | Design impact |
|---|---|---|
| What fields do you enter? | Supplier, invoice number, date, due date, currency, line items (description, qty, unit price, amount), subtotal, tax, total | The schema |
| What's a costly mistake? | Wrong **total** or **duplicate** invoice → client pays twice or books are wrong | Arithmetic and duplicate checks are mandatory |
| How long per invoice today? | ≈4 minutes typing + checking | 9,000 × 4 min = 600 hours/month |
| Are PDFs scanned or digital? | ~70% digital, 30% scans/phone photos | Need vision-capable PDF input |
| Will a human still check? | Yes, they want to review anything uncertain, but not everything | Thresholds + review queue |
| History? | 5 years of PDFs + what was entered in QuickBooks | Instant eval set |

**Success:** ≥ 70% of invoices need *zero* human edits; **0 wrong totals posted without review**; review time on the rest under 1 minute.
`,

  frame: md`
**Shape:** *Extract* (document → typed fields).

**Rung:** single model call with a schema, plus **deterministic validators**. The model reads the PDF directly (no separate OCR step), because modern models handle layout, tables and scans in one pass.

**The key insight:** a schema guarantees the *shape* (a total is a number), not *truth* (the total is right). Invoices are full of **internal consistency checks** you can run for free: line amounts = qty × price, the sum of lines = subtotal, subtotal + tax = total, due date ≥ invoice date. Any failure is either a model error or a weird invoice, and **both should go to a human**.
`,

  design: md`
~~~text
 PDF upload ──▶ extract(pdf) ──▶ llm.parse(content=[pdf, instructions], Invoice)
                    │                         │
                    │              ┌──────────┘
                    ▼              ▼
              validate(invoice) ──errors?──yes──▶ retry with errors (max 2)
                    │ no                                 │ still failing
                    ▼                                    ▼
         duplicate check (DB)                     REVIEW QUEUE (human)
                    │                                    ▲
                    ├── low confidence / new supplier ───┘
                    ▼
            post to accounting API (draft bill)
~~~

| Decision | Choice | Why |
|---|---|---|
| OCR? | No separate OCR; send the PDF to the model | Fewer moving parts; handles layout changes |
| Money type | ~Decimal~ in validators | Floats make 0.1 + 0.2 ≠ 0.3 |
| Retries | Max 2, *with* the specific errors | Blind retries just re-roll |
| Posting | Create *draft* bills only | A human approves payment in the accounting system anyway |
`,

  tree: txt`
invoice-extractor/
├── llm.py              # gateway v1.1: now accepts content blocks (PDFs, images)
├── schema.py           # Invoice + LineItem
├── validators.py       # pure-Python business rules
├── extract.py          # extract → validate → repair loop → decision
├── review.py           # routing to auto-post vs. review queue
└── evals/
    ├── golden/         # 150 PDFs + expected JSON (from past QuickBooks entries)
    └── field_eval.py
`,

  build: [
    {
      file: "llm.py (change)",
      patterns: ["llm-gateway"],
      note: md`The gateway from [[proj:b01]] grows by **one line of capability**: ~user~ can be a string *or* a list of content blocks (PDF, images, text). Every caller stays the same.`,
      code: py`
def parse(system: str, user: str | list, schema: type[BaseModel], *, tier: str = "smart",
          max_tokens: int = 4096) -> BaseModel:
    model, t0 = MODELS[tier], time.perf_counter()
    resp = _client.messages.parse(
        model=model, max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}],   # str or list of blocks: same API
        output_format=schema,
    )
    _log("parse", model, resp, t0)
    if resp.stop_reason in ("refusal", "max_tokens"):
        raise RuntimeError(f"LLM stop_reason={resp.stop_reason}")
    return resp.parsed_output
`,
    },
    {
      file: "schema.py",
      patterns: ["structured-output"],
      note: md`Amounts are strings in the schema, so the model copies exactly what's printed ("1.234,50" stays as printed). Code normalises them. ~Optional~ fields plus "never invent" instructions prevent hallucinated due dates.`,
      code: py`
from typing import Optional

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str
    quantity: str = Field(description="As printed, e.g. '2' or '1.5'")
    unit_price: str = Field(description="As printed, without currency symbol")
    amount: str = Field(description="Line total as printed")


class Invoice(BaseModel):
    supplier_name: str
    supplier_tax_id: Optional[str] = Field(None, description="VAT/EIN if printed, else null")
    invoice_number: str
    invoice_date: str = Field(description="ISO format YYYY-MM-DD")
    due_date: Optional[str] = Field(None, description="ISO date, or null if not printed. Never compute it.")
    currency: str = Field(description="ISO 4217 code, e.g. USD, EUR")
    line_items: list[LineItem]
    subtotal: str
    tax: str = Field(description="Total tax; '0' if none shown")
    total: str
    notes_for_reviewer: str = Field(description="Anything unusual: handwriting, partial pages, credit note, etc. Empty if none.")
`,
    },
    {
      file: "validators.py",
      patterns: ["validate-retry"],
      note: md`**Pure Python, no model.** These rules catch most extraction errors. Each error message is written for the *model* to read on retry, and for a *human* in the review queue.`,
      code: py`
from datetime import date
from decimal import Decimal, InvalidOperation

from schema import Invoice

TOLERANCE = Decimal("0.02")


def money(s: str) -> Decimal:
    s = s.strip().replace(" ", "")
    if "," in s and "." in s:                       # 1.234,50 or 1,234.50
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:                                  # 1234,50
        s = s.replace(",", ".")
    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError(f"not a number: {s!r}")


def validate_invoice(inv: Invoice) -> list[str]:
    errors: list[str] = []
    try:
        lines = [(money(li.quantity), money(li.unit_price), money(li.amount)) for li in inv.line_items]
        subtotal, tax, total = money(inv.subtotal), money(inv.tax), money(inv.total)
    except ValueError as e:
        return [f"Unparseable amount: {e}"]

    for i, (q, p, a) in enumerate(lines, 1):
        if abs(q * p - a) > TOLERANCE:
            errors.append(f"Line {i}: quantity × unit_price = {q * p} but amount is {a}")
    if lines and abs(sum(a for _, _, a in lines) - subtotal) > TOLERANCE:
        errors.append(f"Sum of line amounts {sum(a for *_, a in lines)} != subtotal {subtotal}")
    if abs(subtotal + tax - total) > TOLERANCE:
        errors.append(f"subtotal {subtotal} + tax {tax} != total {total}")

    try:
        d = date.fromisoformat(inv.invoice_date)
        if d > date.today():
            errors.append(f"invoice_date {d} is in the future")
        if inv.due_date and date.fromisoformat(inv.due_date) < d:
            errors.append("due_date is before invoice_date")
    except ValueError:
        errors.append("invoice_date/due_date not in ISO format YYYY-MM-DD")

    if len(inv.currency) != 3:
        errors.append(f"currency {inv.currency!r} is not an ISO 4217 code")
    return errors
`,
    },
    {
      file: "extract.py",
      patterns: ["validate-retry", "structured-output"],
      note: md`The repair loop. On a retry the model sees **exactly what was wrong**. It often notices it misread a "7" as a "1", or missed a discount line.`,
      code: py`
import base64
from dataclasses import dataclass, field
from pathlib import Path

import llm as default_llm
from schema import Invoice
from validators import validate_invoice

SYSTEM = """You extract data from supplier invoices for a bookkeeping firm.
Copy values exactly as printed. Use ISO dates. Never invent values: use null where allowed.
Include every line item, including discounts (negative amounts) and shipping."""


@dataclass
class ExtractionResult:
    invoice: Invoice | None
    errors: list[str] = field(default_factory=list)
    attempts: int = 0


def pdf_block(path: Path) -> dict:
    return {"type": "document",
            "source": {"type": "base64", "media_type": "application/pdf",
                       "data": base64.standard_b64encode(path.read_bytes()).decode()}}


def extract(path: Path, llm=default_llm, max_attempts: int = 3) -> ExtractionResult:
    doc = pdf_block(path)
    instructions = "Extract this invoice."
    inv, errors = None, []
    for attempt in range(1, max_attempts + 1):
        inv = llm.parse(SYSTEM, [doc, {"type": "text", "text": instructions}], Invoice)
        errors = validate_invoice(inv)
        if not errors:
            return ExtractionResult(inv, [], attempt)
        instructions = ("Extract this invoice. A previous extraction failed these checks; "
                        "look again carefully at the document (it may also be the invoice itself "
                        "that is inconsistent, in which case say so in notes_for_reviewer):\n- "
                        + "\n- ".join(errors))
    return ExtractionResult(inv, errors, max_attempts)
`,
    },
    {
      file: "review.py",
      patterns: ["human-in-loop"],
      note: md`The **decision layer**. Notice the rules come from discovery: new suppliers, large amounts and duplicates always get human eyes.`,
      code: py`
from dataclasses import dataclass
from decimal import Decimal

from extract import ExtractionResult
from validators import money

REVIEW_ABOVE = Decimal("5000")


@dataclass
class Decision:
    action: str          # "auto_draft" | "review"
    reasons: list[str]


def decide(res: ExtractionResult, known_suppliers: set[str], seen_numbers: set[tuple[str, str]]) -> Decision:
    reasons = list(res.errors)
    inv = res.invoice
    if inv is None:
        return Decision("review", ["extraction failed"])
    if (inv.supplier_name.lower(), inv.invoice_number) in seen_numbers:
        reasons.append("possible DUPLICATE: same supplier + invoice number already booked")
    if inv.supplier_name.lower() not in known_suppliers:
        reasons.append("new supplier")
    if not res.errors and money(inv.total) > REVIEW_ABOVE:
        reasons.append(f"total above {REVIEW_ABOVE}")
    if inv.notes_for_reviewer.strip():
        reasons.append("model note: " + inv.notes_for_reviewer.strip())
    if res.attempts > 1 and not res.errors:
        reasons.append("needed a repair retry")      # usually fine, but audit a sample
    return Decision("review" if reasons else "auto_draft", reasons)
`,
      after: md`> **Where's the confidence score?** Here we don't need one. The validators and business rules are a *better*, verifiable signal than the model's self-reported confidence. Prefer checkable signals whenever the domain gives you them.`,
    },
    {
      file: "evals/field_eval.py",
      patterns: ["eval-harness"],
      note: md`**Field-level** accuracy with normalisation (so "2026-03-01" and "2026-03-01 " match). We also measure the **business** metric: the share of invoices needing zero edits, and whether any wrong total escaped review.`,
      code: py`
import json
from pathlib import Path

from extract import extract
from review import decide
from validators import money

FIELDS = ["supplier_name", "invoice_number", "invoice_date", "due_date", "currency", "subtotal", "tax", "total"]


def norm(field: str, v):
    if v is None:
        return None
    if field in {"subtotal", "tax", "total"}:
        return str(money(v))
    return str(v).strip().lower()


def run(golden_dir: Path):
    stats = {f: 0 for f in FIELDS}
    perfect = escaped_wrong_total = n = 0
    for pdf in sorted(golden_dir.glob("*.pdf")):
        expected = json.loads(pdf.with_suffix(".json").read_text())
        res = extract(pdf)
        got = res.invoice.model_dump() if res.invoice else {}
        ok = {f: norm(f, got.get(f)) == norm(f, expected.get(f)) for f in FIELDS}
        for f, hit in ok.items():
            stats[f] += hit
        n += 1
        perfect += all(ok.values())
        auto = decide(res, known_suppliers=set(), seen_numbers=set()).action == "auto_draft"
        if auto and not ok["total"]:
            escaped_wrong_total += 1          # THE number that must be zero
            print("!! wrong total auto-posted:", pdf.name)
    print({f: round(c / n, 3) for f, c in stats.items()})
    print(f"zero-edit invoices: {perfect / n:.1%}   wrong totals escaping review: {escaped_wrong_total}")


if __name__ == "__main__":
    run(Path("evals/golden"))
`,
    },
  ],

  evaluate: md`
## Golden set
Pull **150** past invoices with what bookkeepers entered in QuickBooks: 100 digital, 50 scans, at least 30 different suppliers. Include messy ones: multi-page, credit notes, foreign currency, handwritten corrections.

## Metrics
| Metric | Target | Why |
|---|---|---|
| Field accuracy (per field) | ≥ 98% on totals and dates | Finds which field the prompt struggles with |
| Zero-edit rate | ≥ 70% | The business value |
| Wrong totals escaping review | **0** | The safety requirement |
| Review rate | Track it | Too high = no time saved; too low = suspicious |

## Typical findings
- Dates: US vs EU formats (03/04/2026). Fix: tell the model to use the supplier's country and the currency as clues, and flag ambiguous dates in ~notes_for_reviewer~.
- Scans: occasional digit misreads, nearly all caught by the arithmetic validators, which is exactly why they exist.
`,

  operate: md`
| Concern | Plan |
|---|---|
| Cost | A 1–2 page PDF is roughly 1.5–3k input tokens + ≈600 output tokens. 9,000/month × ≈$0.02 ≈ $180/month. Compare with 600 hours of manual typing. |
| Throughput | Uploads arrive in bursts at month-end. Process with a small worker pool (or the Batches API overnight at half price). |
| Failure | Model/API failure → invoice goes to the review queue with "extraction failed". Nothing is lost. |
| Monitoring | Review rate, repair-retry rate, per-field *human edit* rate. **Every human correction is a new labelled example.** |
| Security | Invoices contain bank details. Restrict access, set retention, and don't log raw PDFs. |
`,

  levelUp: md`
- **Receipts from phone photos, 100k/month?** Batch processing, plus an image-quality pre-check that asks the user to retake the photo.
- **Contracts instead of invoices?** Longer documents, clause-level extraction and retrieval of a playbook: [[proj:i05]].
- **Multi-step processing with approvals over days?** A durable workflow: [[proj:a02]].
`,

  exercises: [
    "Add a validator that checks ~supplier_tax_id~ format per country (e.g. EU VAT prefixes). Measure how many extra errors it catches.",
    "Create five synthetic 'evil' invoices where the *invoice itself* has an arithmetic error. Does your pipeline flag them instead of 'fixing' them?",
    "Measure what fraction of first-attempt failures the repair loop fixes. Is the second retry worth its cost?",
    "Rewrite ~decide()~ so each reason has a severity, and show reviewers the most severe first.",
  ],

  interview: md`
> "A bookkeeping firm was hand-typing 9,000 invoices a month. Template OCR kept breaking, so I sent PDFs directly to a vision-capable model with a strict schema, but the key design choice was the **validators**: invoices are internally consistent, so line arithmetic, subtotal + tax = total, and date ordering catch nearly all extraction errors deterministically. Failures trigger one repair retry with the exact errors, then go to a human queue along with duplicates, new suppliers and large amounts. I evaluated per field on 150 historical invoices with normalisation, and tracked the business metric (73% zero-edit) plus a hard safety metric: zero wrong totals auto-posted."
`,
});
