project({
  id: "i05",
  level: "intermediate",
  title: "Contract review against a legal playbook",
  industry: "Legal",
  client: "Hale & Moreno LLP: a 60-lawyer commercial firm reviewing ≈250 vendor contracts a month for corporate clients",
  time: "6–8 hours",
  summary: "Segment contracts into clauses, classify them, compare each against the client's playbook position, and produce a verified issues list. Also extract terms into a database for portfolio questions.",
  newConcepts: ["Clause segmentation", "Playbook-as-data", "Per-clause map with retrieval", "Verbatim quote verification", "Extract-once-then-query for aggregation"],
  patterns: ["map-reduce", "structured-output", "rag", "grounded-citations", "human-in-loop", "eval-harness", "batch-async"],
  skills: ["Expert-workflow design", "Recall-oriented evaluation with experts", "Knowing when to stop using RAG and build a database"],

  brief: md`
> "Associates spend 2–3 hours on first-pass review of every vendor contract, checking it against the client's playbook: liability caps, indemnities, auto-renewal, data protection, governing law. It's important work, but it's repetitive. We want a first pass in minutes that a lawyer then checks."
> (Partner, Hale & Moreno LLP)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| What's a playbook? | Per client: for each clause type, the preferred position, acceptable fallbacks, and red lines (e.g. "liability cap ≥ 12 months' fees; uncapped for data breach") | Playbook = **structured data**, versioned per client |
| Output? | An issues list: clause, quote, playbook position, deviation, severity, suggested redline | Schema |
| What's worst? | **Missing** a red-line issue (malpractice risk) | Optimise **recall**; lawyers filter false positives |
| Contracts? | 10–80 pages, PDF or DOCX, varied structure, sometimes amendments that override earlier clauses | Segmentation, cross-references |
| Confidentiality? | Privileged and confidential | Enterprise terms, no training on data, access controls, retention |
| Portfolio questions? | "Which of our client's 400 vendor contracts auto-renew in Q1?" | **Aggregation**, which RAG handles badly → extract terms into a DB |

**Success:** red-line issue recall ≥ 95% vs associate review, first pass < 10 minutes, associate time per contract halved.
`,

  frame: md`
**Shapes:** *Extract* (segment + classify clauses) → *Retrieve* (the matching playbook position) → *Judge* (compare clause vs position) → *Aggregate* (issues report). It's a **workflow**, a map-reduce over clauses.

**Why per-clause processing?** Asking "review this 60-page contract against this 20-rule playbook" in one call tends to produce plausible but **incomplete** reviews. Splitting the work into ≈100 small, focused comparisons (clause × relevant rule) gives each one full attention, makes results verifiable, and makes the eval granular.

**Two kinds of questions, two architectures** (see [[c:rag-vs-context-vs-finetune]]):
- *"Is this contract OK?"* → the per-clause review workflow above.
- *"Which contracts auto-renew in Q1?"* → **not RAG**. Extract key terms (renewal type, notice period, cap amount, governing law) into a table once per contract, then answer with SQL. Retrieval over 400 contracts can't reliably *count*.
`,

  design: md`
~~~text
 contract.pdf/docx ──▶ text with page numbers ──▶ segment into clauses (headings + numbering)
                                                       │
                              ┌────────────────────────┼─────────────────────────┐   MAP (parallel)
                              ▼                        ▼                         ▼
                       classify clause type     classify clause type      classify ...
                       (enum from playbook)          │
                              ▼                        ▼
                    playbook rule(s) for that type (lookup, not search: types are keys)
                              ▼
                    assess(clause, rule) → Finding{deviation, severity, quote, redline}
                              │
                              ▼
          verify quotes ⊂ clause text (code)  ──▶  missing-clause check (code): required types absent?
                              │
                              ▼                                                 REDUCE
                  issues report sorted by severity ──▶ LAWYER reviews/edits ──▶ client memo
                              │
                              └──▶ key terms table (renewal, notice, cap, law) ──▶ portfolio SQL
~~~
Note that the playbook "retrieval" here is a **lookup by clause type**, not semantic search. Once classification gives you a key, use the key. Reach for vector search only when there's no key.
`,

  tree: txt`
contract-review/
├── playbooks/acme_corp_v7.yaml   # client playbook as data
├── segment.py                    # text → clauses with page refs
├── schema.py
├── review.py                     # classify → assess per clause (parallel)
├── missing.py                    # required-but-absent clause check
├── terms.py                      # key-terms extraction → DB
└── evals/
    ├── gold/                     # 25 contracts with associate issue lists
    └── issue_recall.py
`,

  build: [
    {
      file: "playbooks/acme_corp_v7.yaml (excerpt)",
      lang: "yaml",
      note: md`Lawyers own this file. Turning tacit expertise into explicit, versioned data is often the **most valuable deliverable** of the whole engagement, even before any AI runs.`,
      code: txt`
client: Acme Corp
version: 7
clause_types:
  limitation_of_liability:
    required: true
    preferred: "Mutual cap at >= 12 months' fees. Carve-outs (uncapped): confidentiality breach, data protection breach, indemnities, gross negligence/wilful misconduct."
    acceptable: "Cap >= 6 months' fees if vendor's data-protection breach liability is >= 2x the general cap."
    red_lines:
      - "Any cap on vendor liability for data protection breaches below 2x annual fees"
      - "Exclusion of liability for vendor's gross negligence or wilful misconduct"
  auto_renewal:
    required: false
    preferred: "No auto-renewal, or auto-renewal with >= 60 days' notice to terminate and no price increase > CPI."
    red_lines:
      - "Auto-renewal with notice period > 90 days"
  governing_law:
    required: true
    preferred: "Laws of New York; courts of New York County."
    acceptable: "Delaware."
    red_lines: ["Any non-US governing law"]
`,
    },
    {
      file: "segment.py",
      note: md`Clause segmentation by numbering and headings (~12.3~, ~Section 7~, ~ARTICLE IX~). Keep **page numbers** so findings can point lawyers to the exact page. Plain code handles most contracts. Use a model call for the odd ones.`,
      code: py`
import re
from dataclasses import dataclass

HEADING = re.compile(r"^\s*((ARTICLE|Section)\s+[IVXLC\d]+|\d+(\.\d+)*\.?)\s+[A-Z][^\n]{0,120}$", re.M)


@dataclass
class Clause:
    id: str
    heading: str
    text: str
    page: int


def segment(pages: list[str]) -> list[Clause]:
    clauses, cur, buf, cur_page = [], None, [], 1
    for pno, page in enumerate(pages, 1):
        for line in page.splitlines():
            if HEADING.match(line):
                if cur:
                    clauses.append(Clause(f"c{len(clauses)+1}", cur, "\n".join(buf).strip(), cur_page))
                cur, buf, cur_page = line.strip(), [], pno
            else:
                buf.append(line)
    if cur:
        clauses.append(Clause(f"c{len(clauses)+1}", cur, "\n".join(buf).strip(), cur_page))
    return [c for c in clauses if len(c.text) > 40]
`,
    },
    {
      file: "schema.py",
      patterns: ["structured-output"],
      code: py`
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ClauseType(BaseModel):
    types: list[str] = Field(description="Playbook clause types this clause addresses (may be several), or ['other']")


class Finding(BaseModel):
    position: Literal["preferred", "acceptable", "deviation", "red_line"]
    analysis: str = Field(description="Compare the clause with the playbook in 2-4 sentences")
    quote: str = Field(description="Verbatim clause text that drives the assessment")
    suggested_redline: Optional[str] = Field(None, description="Replacement wording if not preferred")
    cross_reference_note: Optional[str] = Field(None, description="If the clause depends on definitions/other sections")
`,
    },
    {
      file: "review.py",
      patterns: ["map-reduce", "grounded-citations"],
      note: md`The per-clause **map**. Classification uses the playbook's own clause types as a dynamic enum (like [[proj:b09]]). Assessment gets one clause and the exact playbook rule. Quotes are verified in code, and an unverifiable quote becomes a "check manually" flag, never a silent pass.`,
      code: py`
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

import yaml
from pydantic import BaseModel, create_model

import llm
from schema import Finding

PB = yaml.safe_load(open("playbooks/acme_corp_v7.yaml"))
TYPES = tuple(PB["clause_types"]) + ("definitions", "other")
TypeList = create_model("TypeList", types=(list[Literal[TYPES]], ...))
norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()

ASSESS = """You are a senior commercial lawyer doing first-pass review for a client.
Compare the contract clause with the client's playbook position for this clause type.
- red_line: violates a red line. deviation: worse than acceptable. acceptable / preferred as defined.
- Quote the decisive words verbatim. If the clause depends on a defined term or another section
  you cannot see, say so in cross_reference_note rather than assuming.
- Be precise and conservative: when unsure between two positions, choose the worse one."""


def classify(clause) -> list[str]:
    r = llm.parse("Classify this contract clause by the playbook clause types it addresses.",
                  f"<heading>{clause.heading}</heading>\n<clause>{clause.text[:6000]}</clause>",
                  TypeList, tier="fast", max_tokens=200)
    return r.types


def assess(clause, ctype: str) -> dict:
    rule = PB["clause_types"][ctype]
    f = llm.parse(ASSESS, f"<playbook type='{ctype}'>\n{yaml.safe_dump(rule)}\n</playbook>\n"
                          f"<clause id='{clause.id}' page='{clause.page}' heading='{clause.heading}'>\n{clause.text}\n</clause>",
                  Finding)
    verified = norm(f.quote) in norm(clause.text)
    return {"clause_id": clause.id, "page": clause.page, "heading": clause.heading, "type": ctype,
            **f.model_dump(), "quote_verified": verified}


def review(clauses) -> tuple[list[dict], dict[str, list]]:
    with ThreadPoolExecutor(max_workers=8) as pool:
        types = list(pool.map(classify, clauses))
    jobs = [(c, t) for c, ts in zip(clauses, types) for t in ts if t in PB["clause_types"]]
    with ThreadPoolExecutor(max_workers=8) as pool:
        findings = list(pool.map(lambda ct: assess(*ct), jobs))
    by_type: dict[str, list] = {}
    for c, ts in zip(clauses, types):
        for t in ts:
            by_type.setdefault(t, []).append(c.id)
    order = {"red_line": 0, "deviation": 1, "acceptable": 2, "preferred": 3}
    findings.sort(key=lambda f: (order[f["position"]], not f["quote_verified"]))
    return findings, by_type
`,
    },
    {
      file: "missing.py",
      note: md`What the per-clause map **can't** see is a clause that isn't there. A contract with no limitation-of-liability clause is a red-line issue in itself. This check is pure code over the classification results.`,
      code: py`
def missing_required(by_type: dict[str, list], playbook: dict) -> list[dict]:
    return [{"type": t, "position": "red_line", "analysis": f"No {t.replace('_', ' ')} clause found.",
             "quote": "", "quote_verified": True}
            for t, rule in playbook["clause_types"].items()
            if rule.get("required") and t not in by_type]
`,
    },
    {
      file: "terms.py",
      patterns: ["structured-output", "batch-async"],
      note: md`**Extract once, query forever.** Key commercial terms go into a table. Then "which contracts auto-renew in Q1 with > 60 days' notice?" is a SQL query, exact and instant. Back-fill the 400 existing contracts overnight with the Batches API.`,
      code: py`
from typing import Literal, Optional

from pydantic import BaseModel, Field

import llm


class KeyTerms(BaseModel):
    counterparty: str
    effective_date: Optional[str]
    initial_term_months: Optional[int]
    auto_renews: bool
    renewal_notice_days: Optional[int] = Field(None, description="Days' notice required to stop renewal")
    liability_cap: Optional[str] = Field(None, description="As written, e.g. '12 months fees'")
    governing_law: Optional[str]
    termination_for_convenience: Literal["either_party", "client_only", "vendor_only", "none", "unclear"]


def extract_terms(full_text: str) -> KeyTerms:
    return llm.parse("Extract key commercial terms from this contract. Use null when not stated; "
                     "do not infer from industry norms.", f"<contract>{full_text}</contract>", KeyTerms,
                     max_tokens=1500)

# INSERT INTO contract_terms (...) VALUES (...);
# SELECT counterparty FROM contract_terms
#  WHERE auto_renews AND renewal_notice_days > 60
#    AND (effective_date::date + (initial_term_months || ' months')::interval) BETWEEN '2027-01-01' AND '2027-03-31';
`,
    },
    {
      file: "evals/issue_recall.py",
      patterns: ["eval-harness", "human-in-loop"],
      note: md`Associates produced issue lists for 25 contracts. Score **recall by severity** (red lines matter most) and track **precision** to keep lawyer trust. A clause-level match key (clause id + type) makes matching deterministic.`,
      code: py`
import json
from collections import defaultdict
from pathlib import Path


def score(gold_dir="evals/gold", pred_dir="evals/pred"):
    recall = defaultdict(lambda: [0, 0])     # severity → [found, total]
    fp = tp = 0
    for gold_file in Path(gold_dir).glob("*.json"):
        gold = json.loads(gold_file.read_text())          # [{clause_id|type, position}]
        pred = json.loads((Path(pred_dir) / gold_file.name).read_text())
        pred_keys = {(p.get("clause_id"), p["type"]) for p in pred if p["position"] in ("red_line", "deviation")}
        gold_keys = {(g.get("clause_id"), g["type"]): g["position"] for g in gold}
        for key, sev in gold_keys.items():
            recall[sev][1] += 1
            recall[sev][0] += key in pred_keys
        tp += len(pred_keys & gold_keys.keys())
        fp += len(pred_keys - gold_keys.keys())
    for sev, (f, t) in recall.items():
        print(f"{sev:10s} recall {f}/{t} = {f/t:.1%}")
    print(f"precision {tp/(tp+fp):.1%}  (false positives cost lawyer time, not risk)")
`,
    },
  ],

  evaluate: md`
## Gold set
25 contracts reviewed by associates and checked by a partner, about 600 clauses and 140 issues (31 red lines).

## Targets and typical outcomes
| Metric | Target | Notes |
|---|---|---|
| Red-line recall | ≥ 95% | Misses usually involve **cross-references** ("as defined in Schedule 3") |
| Deviation recall | ≥ 85% | |
| Precision | ≥ 60% | Lawyers accept some false positives for high recall |
| Quote verification rate | ≥ 98% | Unverified quotes are flagged for manual checking |
| Missing-clause detection | 100% | Pure code, so it should be perfect |

**Cross-reference failures** are the classic issue: the cap clause says "the Fees" and the definition lives elsewhere. Fixes: include the definitions clause with every assessment, or a pre-pass that resolves defined terms into a glossary sent with each clause.
`,

  operate: md`
- **Cost:** a 40-page contract ≈ 100 clauses → ≈100 classifications (fast tier) + ≈60 assessments (flagship) ≈ 300–500k tokens. Roughly a few dollars per contract, against 2–3 associate hours.
- **Latency:** parallel map → 2–5 minutes per contract. Run as an async job and notify the lawyer.
- **Versioning:** every report records the playbook version, prompt versions and model, so old reviews stay explainable.
- **Human in the loop:** the AI report is a *draft work product*. The lawyer edits findings, and edits are logged as eval data.
`,

  levelUp: md`
- **Negotiation support:** generate redline documents (tracked changes) from accepted findings, with careful formatting work and lawyer approval.
- **Firm-wide knowledge** ("how did we negotiate this clause with this vendor last year?"): permission-aware RAG: [[proj:a01]].
- **Many document types (NDAs, MSAs, DPAs) with routing:** classification first, type-specific playbooks: [[p:classify-route]].
`,

  exercises: [
    "Write a defined-terms pre-pass: extract a glossary from the definitions section and include the relevant terms with each clause. Re-measure red-line recall.",
    "Add an ~amendments~ handler: if a later amendment modifies a clause, the finding must use the amended text.",
    "Compare one-shot whole-contract review with the per-clause map on 5 contracts. Count misses.",
    "Write five portfolio questions and answer them with SQL over ~contract_terms~. Which would RAG have gotten wrong?",
  ],

  interview: md`
> "For a law firm's first-pass contract review, I made the client playbook structured data owned by the lawyers, and built a per-clause map-reduce: segment by numbering with page refs, classify clause types with a dynamic enum from the playbook, look up the rule by type (no vector search needed once you have a key), and assess each clause against it with verbatim quotes verified in code. A code check catches required clauses that are missing. Evaluated against associate reviews on 25 contracts, red-line recall was the gate. Most misses came from cross-referenced definitions, which a glossary pre-pass fixed. For portfolio questions like 'which contracts auto-renew next quarter', I extracted key terms into a table and used SQL, because retrieval can't count."
`,
});
