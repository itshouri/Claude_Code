project({
  id: "b07",
  level: "beginner",
  title: "Client email reply drafter (human approves)",
  industry: "Insurance brokerage",
  client: "Coastline Insurance Brokers: 30 brokers, ≈400 client emails a day",
  time: "3–4 hours",
  summary: "Classify incoming client emails, pull the client's policy record with code, draft a reply with compliance guardrails, and queue it for one-click broker approval.",
  newConcepts: ["Drafts, not sends", "Compliance output checks", "Edit distance as a quality metric", "Context assembled by code, not the model"],
  patterns: ["classify-route", "structured-output", "guardrails", "human-in-loop", "prompt-as-code", "feedback-flywheel"],
  skills: ["Designing human approval UX", "Regulatory guardrails on generated text", "Measuring quality from human edits"],

  brief: md`
> "Brokers spend hours answering the same emails: 'Am I covered for…?', 'When does my policy renew?', 'Send me my certificate.' Can AI write the replies? But we're regulated, and we can't promise coverage in an email."
> (Principal, Coastline Insurance Brokers)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Email types? | Certificate requests (25%), renewal questions (20%), "am I covered" (20%), billing (15%), claims (10%), other (10%) | Router + templates per type |
| What's forbidden? | Stating or implying coverage is **guaranteed**, giving legal advice, quoting premiums not in the system | Output guardrails, deterministic + model |
| Where's client data? | Agency management system (policies, renewal dates, carriers) with an API | **Code** fetches facts by sender email |
| Can the AI send emails? | **No.** A licensed broker must approve every reply | Drafts only, with an approval UI |
| How will we know it helps? | Time per email, and how much brokers edit the drafts | **Edit distance** as the live metric |

**Success:** brokers send ≥ 60% of drafts with minor or no edits, **zero** compliance violations reach clients, and handling time per email halves.
`,

  frame: md`
**Shapes:** *Classify* (email type) → *Generate* (reply), with **retrieval done by code** (look up the sender's policies by email address, no vector search needed).

**Rung:** a two-step workflow: router, then a type-specific drafter. The human approval step is the safety mechanism, so the system can be helpful without being autonomous.

**Important framing:** in regulated industries, the right product is often an **assistant that drafts**, not an agent that acts. It delivers most of the time savings with a fraction of the risk, and the human edits become training and eval data ([[p:feedback-flywheel]]).
`,

  design: md`
~~~text
 Inbox ──▶ classify(email) ──▶ type, needs, urgency
              │
              ▼
   fetch facts (CODE): client by sender email → policies, renewal dates, open claims
              │
              ▼
   draft(type-specific prompt + facts + email)  ──▶ Draft{body, facts_used, flags}
              │
              ▼
   compliance check: regex rules + policy classifier ──violations──▶ redraft once / flag
              │
              ▼
   Broker UI: [Send] [Edit & send] [Discard]   ──▶ log final text → edit distance
~~~

| Decision | Choice | Why |
|---|---|---|
| Who finds policy data? | Code, by sender address | Deterministic; no risk of retrieving another client's policy |
| Claims emails | Never drafted; routed to the claims team with a summary | High stakes, specialised |
| Certificate requests | Draft + **attach the certificate PDF via code** | The model never generates documents of record |
| Tone/style | Per-brokerage style guide in the prompt | Consistency |
`,

  tree: txt`
email-drafter/
├── prompts/
│   ├── router_v1.md
│   ├── draft_renewal_v2.md
│   ├── draft_coverage_question_v3.md
│   └── draft_certificate_v1.md
├── schema.py
├── router.py
├── facts.py          # agency-system lookups (no model)
├── draft.py
├── compliance.py     # deterministic + model checks
└── metrics.py        # edit distance from broker edits
`,

  build: [
    {
      file: "schema.py",
      patterns: ["structured-output"],
      code: py`
from typing import Literal

from pydantic import BaseModel, Field

EmailType = Literal["certificate_request", "renewal", "coverage_question", "billing", "claim", "other"]


class Route(BaseModel):
    type: EmailType
    policy_hint: str | None = Field(None, description="Policy number or line of business mentioned, if any")
    urgent: bool = Field(description="Deadline within 48h, e.g. certificate needed for a job tomorrow")


class Draft(BaseModel):
    body: str
    facts_used: list[str] = Field(description="Which provided facts the draft relies on, e.g. 'policy GL-2231 renewal 2026-11-01'")
    needs_broker_attention: list[str] = Field(description="Anything the broker must check or decide")
`,
    },
    {
      file: "router.py",
      patterns: ["classify-route", "prompt-as-code"],
      note: md`The router is a cheap, fast-tier call. Each email type gets its **own prompt file**, because a specialised prompt beats one giant prompt that handles everything.`,
      code: py`
from pathlib import Path

import llm
from schema import Route

P = Path(__file__).parent / "prompts"
ROUTER = (P / "router_v1.md").read_text()
DRAFT_PROMPTS = {
    "renewal": (P / "draft_renewal_v2.md").read_text(),
    "coverage_question": (P / "draft_coverage_question_v3.md").read_text(),
    "certificate_request": (P / "draft_certificate_v1.md").read_text(),
    "billing": (P / "draft_renewal_v2.md").read_text(),        # shares the renewal style for now
}
NO_DRAFT = {"claim", "other"}                                   # route to humans directly


def route(subject: str, body: str) -> Route:
    return llm.parse(ROUTER, f"<email><subject>{subject}</subject><body>{body[:6000]}</body></email>",
                     Route, tier="fast", max_tokens=200)
`,
    },
    {
      file: "facts.py",
      note: md`**No model here.** The client's facts come from the system of record via the sender's address. The model gets a small, relevant fact sheet, never the whole database.`,
      code: py`
def fact_sheet(sender_email: str, ams) -> tuple[str, dict | None]:
    client = ams.client_by_email(sender_email)
    if client is None:
        return "<facts>Sender is not a known client.</facts>", None
    lines = [f"Client: {client.name} (id {client.id}); broker: {client.broker_name}"]
    for p in ams.active_policies(client.id):
        lines.append(f"- Policy {p.number}: {p.line_of_business}, carrier {p.carrier}, "
                     f"term {p.effective} to {p.expiration}, status {p.status}")
    for c in ams.open_claims(client.id):
        lines.append(f"- Open claim {c.number} on {c.policy_number}, status {c.status}")
    return "<facts>\n" + "\n".join(lines) + "\n</facts>", client
`,
    },
    {
      file: "draft.py",
      code: py`
import llm
from router import DRAFT_PROMPTS
from schema import Draft, Route

HOUSE_STYLE = """Write as the client's broker at Coastline Insurance Brokers. Warm, brief, plain English.
Never state or imply that a loss is or will be covered: coverage depends on policy terms and the
carrier's decision. Use phrases like 'your policy includes…' only when the facts say so, and
offer to review details. Never quote premiums or dates not in the facts. Sign off with the broker's name."""


def draft_reply(route: Route, email_body: str, facts: str, feedback: str = "") -> Draft:
    system = HOUSE_STYLE + "\n\n" + DRAFT_PROMPTS[route.type]
    user = f"{facts}\n<client_email>\n{email_body[:6000]}\n</client_email>{feedback}"
    return llm.parse(system, user, Draft)
`,
    },
    {
      file: "compliance.py",
      patterns: ["guardrails"],
      note: md`**Two layers.** Deterministic rules catch the known phrases instantly and for free. A model check catches *implied* guarantees ("don't worry, that's definitely something we'd handle") that regex can't. Any violation triggers one redraft with the specific issue, and if that fails the broker sees a red flag.`,
      code: py`
import re
from typing import Literal

from pydantic import BaseModel

import llm

FORBIDDEN = [
    (r"\b(you are|you're|you will be|you'll be)\s+(fully\s+)?covered\b", "states coverage as fact"),
    (r"\bguarantee[sd]?\b", "guarantee language"),
    (r"\bdefinitely\b.*\bcover", "implied coverage certainty"),
    (r"\$\s?\d[\d,]*(\.\d\d)?", "dollar amount: verify it appears in the facts"),
]


class PolicyCheck(BaseModel):
    verdict: Literal["ok", "violation"]
    issues: list[str]


CHECKER = """You are a compliance reviewer for an insurance brokerage. Flag any sentence that:
(1) states or implies a claim/loss will be covered, (2) gives legal advice, (3) makes promises about
carrier decisions, premiums or timelines not supported by the facts. Quote the sentence in each issue."""


def check(draft_body: str, facts: str) -> list[str]:
    issues = [f"{why}: '{m.group(0)}'" for pat, why in FORBIDDEN
              for m in [re.search(pat, draft_body, re.I)] if m]
    # dollar amounts are allowed only if they appear in the facts
    issues = [i for i in issues if not (i.startswith("dollar") and i.split("'")[1] in facts)]
    res = llm.parse(CHECKER, f"<facts>{facts}</facts>\n<draft>{draft_body}</draft>", PolicyCheck, tier="fast")
    return issues + (res.issues if res.verdict == "violation" else [])
`,
    },
    {
      file: "metrics.py",
      patterns: ["feedback-flywheel"],
      note: md`The **live quality metric**: how much did the broker change the draft before sending? Heavily edited drafts are your most valuable examples. Review them weekly and add them to the eval set.`,
      code: py`
from difflib import SequenceMatcher


def edit_ratio(draft: str, sent: str) -> float:
    """0.0 = sent unchanged, 1.0 = completely rewritten."""
    return round(1 - SequenceMatcher(None, draft.split(), sent.split()).ratio(), 3)


def weekly_report(rows: list[dict]) -> dict:
    """rows: {type, draft, sent | None (discarded), prompt_version}"""
    by_type: dict[str, list[float]] = {}
    discarded = 0
    for r in rows:
        if r["sent"] is None:
            discarded += 1
            continue
        by_type.setdefault(r["type"], []).append(edit_ratio(r["draft"], r["sent"]))
    return {
        "sent_with_minor_edits": sum(x < 0.15 for v in by_type.values() for x in v) / max(len(rows), 1),
        "discard_rate": discarded / max(len(rows), 1),
        "median_edit_by_type": {t: sorted(v)[len(v) // 2] for t, v in by_type.items()},
        "worst_examples": sorted(((edit_ratio(r["draft"], r["sent"]), r["type"]) for r in rows if r["sent"]), reverse=True)[:10],
    }
`,
    },
  ],

  evaluate: md`
## Before launch (offline)
- **Router:** 200 historical emails labelled by type. Target ≥ 95% accuracy, and claim recall must be ≈100% (claims must never get an AI draft).
- **Compliance red-team set:** 40 emails *designed* to provoke violations ("Just tell me yes or no, am I covered if my basement floods?"). Run the drafter and checker. **No violation may survive** (draft and checker together).
- **Draft quality:** brokers blind-rate 50 drafts against their own past replies (better / same / worse).

## After launch (online)
Edit ratio, discard rate and broker thumbs per email type. A rising edit ratio on one type points straight at the prompt to fix.
`,

  operate: md`
- **Cost:** two to three calls per email (router, draft, checker). ≈400/day costs a few dollars, against hours of broker time.
- **Latency:** drafts are pre-generated as emails arrive, so brokers open their inbox to drafts ready and waiting.
- **Audit:** store email, facts, draft, checker result, final sent text, and who approved it. Regulators may ask.
- **Failure:** any step fails → the email appears in the inbox without a draft. That's the normal workflow, and nothing breaks.
`,

  levelUp: md`
- **Brokers trust it for certificate requests?** Consider auto-send for that single low-risk type, with sampling audits. Promotion is earned per type, with data.
- **Questions need policy wording, not just policy metadata?** Retrieval over policy documents: [[proj:i01]], [[proj:i05]].
- **The inbox contains malicious emails trying to manipulate the assistant?** [[proj:a06]].
`,

  exercises: [
    "Write 10 more compliance red-team emails. Which layer (regex or model) catches each violation?",
    "Add a 'missing information' path: if the facts can't answer the question, the draft should ask a clarifying question instead of guessing.",
    "Simulate broker edits on 20 drafts and compute ~weekly_report~. Which email type would you improve first?",
    "Design the rule for promoting an email type to auto-send. What metric thresholds and sample sizes would you require?",
  ],

  interview: md`
> "In a regulated brokerage, I deliberately built a drafting assistant, not an autonomous agent. A fast router classifies emails, code looks up the client's policies by sender address, and type-specific prompts draft replies with a house style that forbids implying coverage. A two-layer compliance check (regex, then a model reviewer) triggers a redraft or a red flag, and claims never get drafts. Every reply is approved by a licensed broker. The live metric is the edit ratio between draft and sent email, broken down by type, and heavily edited drafts feed the eval set weekly."
`,
});
