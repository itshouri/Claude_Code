project({
  id: "a02",
  level: "advanced",
  title: "Durable auto-claims processing pipeline",
  industry: "Insurance (P&C)",
  client: "Atlas Mutual: a regional auto insurer handling ≈3,000 new claims a day",
  time: "2–3 days of study",
  summary: "A durable workflow (Temporal) that classifies and extracts claim documents, checks coverage, scores fraud signals, fast-tracks simple claims and routes the rest to adjusters, surviving failures and waiting days for humans.",
  newConcepts: ["Durable execution (workflows + activities)", "Signals and timers for human steps", "Retry policies per activity", "Straight-through processing (STP) with guardrails", "Decision explanations and regulatory constraints"],
  patterns: ["workflow-state-machine", "idempotency", "human-in-loop", "structured-output", "validate-retry", "classify-route", "observability", "guardrails"],
  skills: ["Long-running process architecture", "Reliability engineering around model calls", "Designing automation levels by risk"],

  brief: md`
> "A simple claim (rear-ended, police report, repair estimate from a network shop) takes us 9 days to pay, and most of that is the claim waiting for someone to read documents. We want simple claims paid in 24 hours and adjusters spending their time on the hard ones. Regulators will scrutinise anything automated."
> (COO, Atlas Mutual)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Claim inputs? | First notice of loss (FNOL) form, photos, police report, repair estimate, rental receipts, medical bills (injury claims) | Document classification + per-type extraction |
| Which claims are "simple"? | Property damage only, no injury, clear liability, estimate < $6,000, network repair shop, policy active, no fraud indicators | Explicit STP eligibility rules |
| Steps and waits? | Documents arrive over days; adjuster review can take days; payment via a payments system | **Long-running**, so the workflow must wait and resume |
| Failure tolerance? | "We can't lose a claim or pay twice" | Durable state + idempotent activities |
| Regulation? | Unfair claims practices rules; adverse decisions need explanation and human review; model risk management | **No automated denials**: automation may approve, never deny |
| Fraud? | SIU (special investigations) team; known fraud indicators | Signals route to SIU, never auto-decisions |

**Success:** ≥ 35% of claims straight-through within 24 h; zero duplicate payments; 100% of non-approvals reviewed by a human; adjuster time per complex claim −30%.
`,

  frame: md`
**Shapes:** *Classify* (documents) → *Extract* (per type) → *Validate* (coverage, consistency) → *Decide* (eligibility rules) → *Act* (pay or route), over days, with people in the loop.

**The new problem is time and failure, not intelligence.** A claim's process lives for days. Workers restart, model APIs rate-limit, payment systems time out, adjusters go on holiday. A hand-rolled state machine ([[proj:i08]]) works at small scale. At 3,000 claims/day with timers, retries and human waits, use a **durable execution engine** (Temporal here, though AWS Step Functions and others play the same role):

- **Workflow code** is ordinary Python that the engine makes durable: every step's result is persisted, and if a worker dies, another resumes *exactly* where it left off.
- **Activities** are the side-effectful steps (model calls, DB writes, payments), each with its own **timeout and retry policy**.
- **Signals** deliver human decisions into a waiting workflow, and **timers** implement "escalate if no decision in 2 days".

**Automation level by risk:** the system may **approve** simple claims automatically, **never deny**. Every non-approval goes to a human with an explanation. That's a design choice driven by regulation and fairness, and it shapes the whole workflow.
`,

  design: md`
~~~text
 FNOL submitted ──▶ start_workflow(id="claim-<claim_no>")   (workflow id = idempotency for the whole claim)
                                    │
           ┌────────────────────────▼─────────────────────────────────────────────┐
           │ ClaimWorkflow (durable)                                              │
           │  1 wait for required docs (signal: document_added) or 7-day timer    │
           │  2 activity: classify docs              retry 5x, backoff            │
           │  3 activity: extract per doc type       retry 3x; validate → repair  │
           │  4 activity: coverage check (policy DB) retry 10x (system of record) │
           │  5 activity: consistency + fraud signals (rules + model)             │
           │  6 decide (pure code): STP-eligible?                                 │
           │      yes → 7a activity: issue payment (idempotency key) → notify     │
           │      no  → 7b activity: create adjuster task with summary + reasons  │
           │             wait for signal adjuster_decision (timer: escalate 48h)  │
           │             → pay / request info / deny-with-letter (human-authored) │
           └──────────────────────────────────────────────────────────────────────┘
 Every activity: traced (claim id, model, prompt version, tokens); every decision: audit record + explanation
~~~
`,

  tree: txt`
claims/
├── workflow.py        # ClaimWorkflow: orchestration only (deterministic)
├── activities/
│   ├── documents.py   # classify + extract (model calls)
│   ├── coverage.py    # policy system lookups
│   ├── signals.py     # consistency + fraud indicators
│   ├── payments.py    # idempotent payment
│   └── tasks.py       # adjuster task creation
├── rules.py           # STP eligibility: pure, versioned, unit-tested
├── worker.py
├── api.py             # FNOL intake, document upload → signals
└── evals/
    ├── extraction_eval.py
    └── replay_eval.py # historical claims through the workflow in a sandbox
`,

  build: [
    {
      file: "rules.py",
      patterns: ["parse-then-act", "guardrails"],
      note: md`**The decision is code, not a model.** STP eligibility is a short list of explicit, auditable rules that compliance can read. The model's job is upstream: turning documents into the facts these rules consume. Each failed rule becomes a human-readable reason.`,
      code: py`
from dataclasses import dataclass, field

RULES_VERSION = "stp-2026.09"
MAX_STP_AMOUNT = 6000.00


@dataclass
class ClaimFacts:
    policy_active_on_loss_date: bool
    coverage_type_applies: bool
    injury_reported: bool
    liability_clear: bool                 # e.g. insured rear-ended, police report assigns fault to other party
    estimate_total: float
    repair_shop_in_network: bool
    estimate_matches_photos: bool
    fraud_indicators: list[str] = field(default_factory=list)
    extraction_issues: list[str] = field(default_factory=list)


def stp_decision(f: ClaimFacts) -> tuple[bool, list[str]]:
    reasons = []
    if not f.policy_active_on_loss_date: reasons.append("Policy not active on loss date: needs review")
    if not f.coverage_type_applies: reasons.append("Coverage applicability unclear")
    if f.injury_reported: reasons.append("Injury reported: always adjuster-handled")
    if not f.liability_clear: reasons.append("Liability not clear from documents")
    if f.estimate_total > MAX_STP_AMOUNT: reasons.append(f"Estimate {f.estimate_total:.2f} above STP limit")
    if not f.repair_shop_in_network: reasons.append("Out-of-network repair shop")
    if not f.estimate_matches_photos: reasons.append("Estimate/photo consistency not confirmed")
    if f.fraud_indicators: reasons.append("Fraud indicators present: SIU review")
    if f.extraction_issues: reasons.append("Document extraction issues")
    return (not reasons), reasons          # eligible only if NO rule fails; never auto-deny
`,
    },
    {
      file: "activities/documents.py",
      patterns: ["structured-output", "validate-retry", "classify-route"],
      note: md`Activities are where model calls live. Each is **idempotent** (results keyed by claim and document id, so a retried activity returns the stored result) and raises on transient failures so the engine's **retry policy** handles them. Validation failures that a retry can't fix are returned as *data* ("issues"), not exceptions.`,
      code: py`
from typing import Literal, Optional

from pydantic import BaseModel, Field
from temporalio import activity

import llm
from store import results

DocType = Literal["police_report", "repair_estimate", "photo", "rental_receipt", "medical_bill", "fnol", "other"]


class DocClass(BaseModel):
    doc_type: DocType
    confidence: float = Field(ge=0, le=1)


class Estimate(BaseModel):
    shop_name: str
    shop_tax_id: Optional[str]
    vehicle_vin: Optional[str]
    labor_total: float
    parts_total: float
    tax: float
    total: float
    damaged_areas: list[str] = Field(description="e.g. 'rear bumper', 'trunk lid', 'left tail light'")


class PoliceReport(BaseModel):
    report_number: str
    incident_date: str
    at_fault_party: Literal["insured", "other_party", "shared", "undetermined"]
    injuries_noted: bool
    narrative_summary: str


SCHEMAS = {"repair_estimate": Estimate, "police_report": PoliceReport}


@activity.defn
async def classify_and_extract(claim_id: str, doc_id: str) -> dict:
    key = f"{claim_id}:{doc_id}:extract:v3"
    if (cached := results.get(key)) is not None:            # idempotent: retries reuse the result
        return cached
    content = docs_store.as_content_blocks(doc_id)          # PDF/image blocks
    cls = await llm.aparse("Classify this insurance claim document.", content, DocClass, tier="fast")
    out = {"doc_id": doc_id, "doc_type": cls.doc_type, "data": None, "issues": []}
    schema = SCHEMAS.get(cls.doc_type)
    if schema:
        data = await llm.aparse(f"Extract the {cls.doc_type.replace('_', ' ')} fields exactly as written.", content, schema)
        if isinstance(data, Estimate) and abs(data.labor_total + data.parts_total + data.tax - data.total) > 1.0:
            out["issues"].append("estimate totals don't add up")
        out["data"] = data.model_dump()
    results.put(key, out)
    return out
`,
    },
    {
      file: "activities/signals.py",
      patterns: ["guardrails"],
      note: md`**Fraud and consistency signals** combine deterministic checks (duplicate VIN across recent claims, policy bought days before the loss) with one model check: does the damage in the photos match the estimate's damaged areas? Signals only *route* to humans. They never deny.`,
      code: py`
from datetime import date

from pydantic import BaseModel
from temporalio import activity

import llm


class PhotoConsistency(BaseModel):
    visible_damage_areas: list[str]
    matches_estimate: bool
    notes: str


@activity.defn
async def consistency_and_fraud(claim: dict, extracted: list[dict]) -> dict:
    indicators = []
    est = next((d["data"] for d in extracted if d["doc_type"] == "repair_estimate"), None)
    if claim["policy_start"] and (date.fromisoformat(claim["loss_date"]) - date.fromisoformat(claim["policy_start"])).days < 14:
        indicators.append("loss within 14 days of policy inception")
    if est and est.get("vehicle_vin") and await claims_db.recent_claims_with_vin(est["vehicle_vin"], days=365) > 1:
        indicators.append("multiple claims on this VIN in 12 months")

    photos = [d["doc_id"] for d in extracted if d["doc_type"] == "photo"]
    matches = False
    if est and photos:
        blocks = [b for pid in photos[:6] for b in docs_store.as_content_blocks(pid)]
        pc = await llm.aparse(
            "Compare vehicle damage visible in the photos with the damaged areas listed in the estimate. "
            "Be conservative: matches_estimate=true only if every listed area is visibly damaged.",
            blocks + [{"type": "text", "text": f"Estimate damaged areas: {est['damaged_areas']}"}], PhotoConsistency)
        matches = pc.matches_estimate
    return {"fraud_indicators": indicators, "estimate_matches_photos": matches}
`,
    },
    {
      file: "workflow.py",
      patterns: ["workflow-state-machine", "human-in-loop", "idempotency"],
      note: md`**The durable workflow.** It reads like a normal async function, but every ~await workflow.execute_activity(...)~ result is persisted by the engine. A crash mid-claim resumes from the last completed step. Waiting two days for an adjuster is just ~await workflow.wait_condition(...)~. Workflow code must be **deterministic** (no direct I/O, no random, no wall-clock time), so all side effects live in activities.`,
      code: py`
import asyncio
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from activities.coverage import coverage_check
    from activities.documents import classify_and_extract
    from activities.payments import issue_payment
    from activities.signals import consistency_and_fraud
    from activities.tasks import create_adjuster_task, escalate, notify_claimant
    from rules import RULES_VERSION, ClaimFacts, stp_decision

MODEL_RETRY = RetryPolicy(initial_interval=timedelta(seconds=2), backoff_coefficient=2.0, maximum_attempts=5)
SOR_RETRY = RetryPolicy(initial_interval=timedelta(seconds=5), maximum_attempts=10)
REQUIRED = {"repair_estimate", "police_report"}


@workflow.defn
class ClaimWorkflow:
    def __init__(self) -> None:
        self.doc_ids: list[str] = []
        self.decision: dict | None = None
        self.stage = "awaiting_documents"

    @workflow.signal
    def document_added(self, doc_id: str) -> None:
        self.doc_ids.append(doc_id)

    @workflow.signal
    def adjuster_decision(self, decision: dict) -> None:     # {"action": "pay"|"request_info"|"deny", "by": ..., "amount": ...}
        self.decision = decision

    @workflow.query
    def status(self) -> str:
        return self.stage

    @workflow.run
    async def run(self, claim: dict) -> dict:
        extracted: list[dict] = []
        seen: set[str] = set()
        for _ in range(3):                                   # up to 3 rounds of waiting for documents
            try:
                await workflow.wait_condition(lambda: len(self.doc_ids) > len(seen), timeout=timedelta(days=7))
            except asyncio.TimeoutError:
                break
            for doc_id in [d for d in self.doc_ids if d not in seen]:
                seen.add(doc_id)
                extracted.append(await workflow.execute_activity(
                    classify_and_extract, args=[claim["id"], doc_id],
                    start_to_close_timeout=timedelta(minutes=5), retry_policy=MODEL_RETRY))
            if REQUIRED <= {d["doc_type"] for d in extracted}:
                break

        self.stage = "checking"
        cov = await workflow.execute_activity(coverage_check, claim, start_to_close_timeout=timedelta(minutes=1),
                                              retry_policy=SOR_RETRY)
        sig = await workflow.execute_activity(consistency_and_fraud, args=[claim, extracted],
                                              start_to_close_timeout=timedelta(minutes=5), retry_policy=MODEL_RETRY)
        est = next((d["data"] for d in extracted if d["doc_type"] == "repair_estimate"), None) or {}
        pr = next((d["data"] for d in extracted if d["doc_type"] == "police_report"), None) or {}
        facts = ClaimFacts(
            policy_active_on_loss_date=cov["active"], coverage_type_applies=cov["applies"],
            injury_reported=claim["injury_reported"] or pr.get("injuries_noted", False),
            liability_clear=pr.get("at_fault_party") == "other_party",
            estimate_total=est.get("total", 1e9), repair_shop_in_network=cov["shop_in_network"],
            estimate_matches_photos=sig["estimate_matches_photos"], fraud_indicators=sig["fraud_indicators"],
            extraction_issues=[i for d in extracted for i in d["issues"]] +
                              ([] if REQUIRED <= {d["doc_type"] for d in extracted} else ["required documents missing"]),
        )
        eligible, reasons = stp_decision(facts)

        if eligible:
            self.stage = "paying"
            pay = await workflow.execute_activity(issue_payment, args=[claim["id"], est["total"], f"claim-{claim['id']}-stp"],
                                                  start_to_close_timeout=timedelta(minutes=2), retry_policy=SOR_RETRY)
            await workflow.execute_activity(notify_claimant, args=[claim["id"], "approved"], start_to_close_timeout=timedelta(minutes=1))
            return {"outcome": "stp_paid", "payment": pay, "rules_version": RULES_VERSION}

        self.stage = "adjuster_review"
        await workflow.execute_activity(create_adjuster_task, args=[claim["id"], facts.__dict__, reasons, extracted],
                                        start_to_close_timeout=timedelta(minutes=1), retry_policy=SOR_RETRY)
        while self.decision is None:
            try:
                await workflow.wait_condition(lambda: self.decision is not None, timeout=timedelta(hours=48))
            except asyncio.TimeoutError:
                await workflow.execute_activity(escalate, claim["id"], start_to_close_timeout=timedelta(minutes=1))
        d = self.decision
        if d["action"] == "pay":
            await workflow.execute_activity(issue_payment, args=[claim["id"], d["amount"], f"claim-{claim['id']}-adj"],
                                            start_to_close_timeout=timedelta(minutes=2), retry_policy=SOR_RETRY)
        return {"outcome": f"adjuster_{d['action']}", "by": d["by"], "reasons_shown": reasons, "rules_version": RULES_VERSION}
`,
    },
    {
      file: "activities/payments.py",
      patterns: ["idempotency"],
      note: md`The **most important idempotency key in the system**. Activities can be retried after a timeout even if the first attempt actually succeeded, so the payments API must deduplicate on the key. Never generate the key inside the activity with randomness: it comes from the workflow and is derived from the claim.`,
      code: py`
from temporalio import activity


@activity.defn
async def issue_payment(claim_id: str, amount: float, idempotency_key: str) -> dict:
    existing = await payments_db.find_by_key(idempotency_key)
    if existing:
        return existing                                     # retry after a "timeout" that actually succeeded
    resp = await payments_api.create(claim_id=claim_id, amount=round(amount, 2), idempotency_key=idempotency_key)
    await payments_db.save(idempotency_key, resp)
    return resp
`,
    },
    {
      file: "worker.py + api.py",
      note: md`Starting a workflow with **id = claim number** makes intake idempotent: a duplicate FNOL submission can't start a second workflow. Uploads and adjuster decisions become **signals** to the running workflow.`,
      code: py`
# worker.py
import asyncio

from temporalio.client import Client
from temporalio.worker import Worker

from activities import coverage, documents, payments, signals, tasks
from workflow import ClaimWorkflow


async def main():
    client = await Client.connect("temporal:7233")
    await Worker(client, task_queue="claims", workflows=[ClaimWorkflow],
                 activities=[documents.classify_and_extract, coverage.coverage_check, signals.consistency_and_fraud,
                             payments.issue_payment, tasks.create_adjuster_task, tasks.escalate,
                             tasks.notify_claimant]).run()

asyncio.run(main())

# api.py (excerpt)
async def submit_fnol(claim: dict):
    await temporal.start_workflow(ClaimWorkflow.run, claim, id=f"claim-{claim['id']}", task_queue="claims")

async def upload_document(claim_id: str, doc_id: str):
    await temporal.get_workflow_handle(f"claim-{claim_id}").signal(ClaimWorkflow.document_added, doc_id)

async def adjuster_decides(claim_id: str, decision: dict):
    await temporal.get_workflow_handle(f"claim-{claim_id}").signal(ClaimWorkflow.adjuster_decision, decision)
`,
    },
    {
      file: "evals/replay_eval.py",
      patterns: ["eval-harness"],
      note: md`**Replay history through the system.** Take 1,000 closed claims with known outcomes, run them through the workflow in a sandbox (with fake payments), and compare: would we have fast-tracked claims that adjusters later found problematic? That's the **false-STP rate**, the key safety metric.`,
      code: py`
def replay(closed_claims, run_in_sandbox) -> dict:
    stp = false_stp = missed_stp = 0
    for c in closed_claims:                      # c.outcome: paid_as_filed | adjusted | denied | siu
        r = run_in_sandbox(c)                    # time-skipping test environment; fake external systems
        if r["outcome"] == "stp_paid":
            stp += 1
            if c.outcome != "paid_as_filed" or abs(c.paid_amount - r["payment"]["amount"]) > 50:
                false_stp += 1                   # we'd have paid something an adjuster changed
        elif c.outcome == "paid_as_filed" and c.simple_by_adjuster_judgement:
            missed_stp += 1
    n = len(closed_claims)
    return {"stp_rate": stp / n, "false_stp_rate": false_stp / max(stp, 1), "missed_stp": missed_stp / n}
`,
    },
  ],

  evaluate: md`
| Eval | Target | Notes |
|---|---|---|
| Document classification | ≥ 98% | Errors cascade into wrong extraction |
| Field extraction (estimate totals, at-fault party) | ≥ 98% exact on totals; ≥ 95% on at-fault | Per field, per document type |
| **False-STP rate** (replay) | ≤ 1% of STP claims | The core safety metric: claims we'd have paid that an adjuster changed |
| STP rate (replay) | ≥ 35% | The core value metric |
| Photo-estimate consistency | High precision (≥ 95%) on "matches" | Conservative by design: false "no match" just costs an adjuster review |
| Durability chaos test | Kill workers randomly during 500 sandbox claims | 0 lost claims, 0 duplicate payments |

> **Durability is evaluated too.** Chaos testing (killing workers, injecting API timeouts) is how you prove "never lose a claim, never pay twice." The engine helps, but idempotent activities are your responsibility.
`,

  operate: md`
- **Throughput:** 3,000 claims/day × ≈6–12 model calls each. Rate limits are spread by worker concurrency limits per activity type.
- **Cost:** vision-heavy documents dominate (photos, PDFs). Expect tens of cents to a few dollars per claim, against days of handling time and faster payouts (customer satisfaction, rental-cost savings).
- **Versioning:** rules version, prompt versions and model ids are stored in every outcome. Changing workflow code needs the engine's versioning features (running claims keep their old code path).
- **Regulatory evidence:** for every claim, a reconstructable record of documents, extracted facts, failed rules, decisions and who made them.
- **Monitoring:** STP rate per day, false-STP from post-payment audits (sample 5% of STP claims for human audit), time in each stage, escalations, activity retry rates.
`,

  levelUp: md`
- **Adjusters get an AI assistant for complex claims?** RAG over policy wording and claim history with permissions: [[proj:a01]].
- **Fraud detection with network analysis?** Classic ML + graph analytics. LLMs help explain, not detect.
- **Several business lines (home, commercial) on the same platform?** Shared activities + per-line rules; platform thinking: [[proj:a04]].
`,

  exercises: [
    "Write unit tests for ~stp_decision()~ covering every rule, plus a property test: no input with injury_reported=True is ever eligible.",
    "Add a 'request more information' path: the adjuster signals request_info, the claimant is notified, and the workflow waits for new documents again.",
    "Run the workflow in Temporal's time-skipping test environment and verify the 48-hour escalation fires.",
    "Design the post-payment audit sampling: how many STP claims per week must you audit to detect a false-STP rate rising from 1% to 3% within a month?",
  ],

  interview: md`
> "Atlas wanted simple auto claims paid within 24 hours under regulatory scrutiny. The hard part was time and failure, so I used a durable workflow engine: workflow code orchestrates, activities hold every side effect with their own retry policies, uploads and adjuster decisions arrive as signals, and timers escalate stale reviews. Models classify and extract documents and check photo–estimate consistency, but the straight-through decision is a short, versioned rule set in code that can approve and never deny. Every non-approval goes to an adjuster with explicit reasons. Payments use claim-derived idempotency keys, and the workflow id is the claim number. I evaluated by replaying 1,000 closed claims in a sandbox, measuring STP rate against false-STP rate, plus chaos tests that kill workers mid-claim."
`,
});
