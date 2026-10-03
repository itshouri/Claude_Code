project({
  id: "i08",
  level: "intermediate",
  title: "Prior-authorisation packet assembly workflow",
  industry: "Healthcare (provider operations)",
  client: "Summit Specialty Care: an orthopaedic and imaging network submitting ≈3,000 prior-auth requests a month",
  time: "6–8 hours",
  summary: "A state-machine workflow that matches chart evidence to payer criteria, assembles the submission packet, and requires clinician sign-off, with PHI minimisation and a full audit trail.",
  newConcepts: ["Workflow as explicit states", "Criteria-checklist matching with evidence", "PHI minimisation", "Audit log by design", "Resumable, idempotent steps"],
  patterns: ["workflow-state-machine", "structured-output", "rag", "human-in-loop", "guardrails", "idempotency", "observability"],
  skills: ["Designing for regulated workflows", "Deterministic orchestration around model steps", "Auditability"],

  brief: md`
> "Before an MRI or a knee replacement, the insurer needs a prior authorisation. Our staff dig through chart notes to prove the patient meets the payer's criteria (six weeks of physical therapy, failed medication, imaging findings) and then fill in forms. It takes 30–45 minutes each, and denials for missing documentation are common."
> (Director of Revenue Cycle, Summit Specialty Care)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| What are the steps today? | Receive order → find payer + procedure criteria → search chart for evidence → fill payer form → clinician signs → submit via portal → track | **A known process**, so a workflow, not an agent |
| Criteria source? | Payer policy documents (PDF), 40 payers × top 30 procedures, updated quarterly | Criteria as structured checklists, retrieved by (payer, procedure code) |
| Why denials? | Missing documentation (60%), wrong codes, expired requests | Gap detection *before* submission is the biggest win |
| Regulation? | HIPAA: minimum necessary PHI, BAAs with vendors, access logs, retention | Redact what isn't needed, audit every access, no PHI in general logs |
| Who decides? | **A clinician must attest** that the packet is accurate. The AI never submits on its own | Mandatory human state |
| Turnaround? | Urgent requests within 24 h; standard within 3 days | State timers and SLA alerts |

**Success:** staff time per request < 10 min, documentation-related denials down 50%, zero submissions without clinician attestation, a complete audit trail for every case.
`,

  frame: md`
**Shapes:** *Retrieve* (payer criteria) → *Extract* (evidence from chart notes, per criterion) → *Generate* (letter of medical necessity) → *Decide* (complete or gaps?), all inside a **business process with mandatory human steps**.

**Why a state machine, not an agent?**
- The process is known and regulated. Auditors will ask "what happened, in what order, who approved it?"
- Cases last hours to days (waiting for clinicians, for missing notes). They must **survive restarts** and resume exactly where they left off.
- Each step must be **idempotent** so retries never create duplicate submissions.

The model does narrow, checkable jobs *inside* states: matching evidence to criteria, and drafting the letter. Code owns every transition. See [[p:workflow-state-machine]] and [[c:workflow-vs-agent]].
`,

  design: md`
~~~text
  RECEIVED ──▶ CRITERIA_LOADED ──▶ EVIDENCE_MATCHED ──┬──▶ GAPS_FOUND ──(staff adds notes)──┐
                (lookup by payer+CPT)  (model per         │      ▲                           │
                                        criterion)        │      └──────── re-match ◀────────┘
                                                          ▼
                                                    PACKET_DRAFTED (letter + form fields)
                                                          │
                                                          ▼
                                              AWAITING_CLINICIAN  ── rejects ──▶ CRITERIA_LOADED (re-match)
                                                          │ attests (signature, timestamp)
                                                          ▼
                                                     SUBMITTED (idempotent: portal ref stored)
                                                          │
                                                          ▼
                                              APPROVED / DENIED / PENDED  (from payer status polling)

 Every transition → audit_log(case_id, from, to, actor, inputs_hash, outputs, model, prompt_version, ts)
~~~
`,

  tree: txt`
prior-auth/
├── states.py          # enum + allowed transitions
├── store.py           # case persistence + audit log (append-only)
├── criteria/          # payer checklists as YAML, from policy PDFs (reviewed by staff)
├── phi.py             # minimum-necessary filtering
├── steps.py           # one function per state; idempotent
├── engine.py          # advance(case_id): runs steps until a human/wait state
└── evals/criteria_match_eval.py
`,

  build: [
    {
      file: "states.py",
      patterns: ["workflow-state-machine"],
      note: md`Allowed transitions are **data**. An illegal transition (e.g. ~EVIDENCE_MATCHED → SUBMITTED~, skipping the clinician) raises an error. Safety is part of the structure, not just a promise in a prompt.`,
      code: py`
from enum import Enum


class S(str, Enum):
    RECEIVED = "received"
    CRITERIA_LOADED = "criteria_loaded"
    EVIDENCE_MATCHED = "evidence_matched"
    GAPS_FOUND = "gaps_found"
    PACKET_DRAFTED = "packet_drafted"
    AWAITING_CLINICIAN = "awaiting_clinician"
    SUBMITTED = "submitted"
    DECIDED = "decided"
    NEEDS_STAFF = "needs_staff"            # any unexpected failure lands here


ALLOWED = {
    S.RECEIVED: {S.CRITERIA_LOADED, S.NEEDS_STAFF},
    S.CRITERIA_LOADED: {S.EVIDENCE_MATCHED, S.NEEDS_STAFF},
    S.EVIDENCE_MATCHED: {S.GAPS_FOUND, S.PACKET_DRAFTED, S.NEEDS_STAFF},
    S.GAPS_FOUND: {S.CRITERIA_LOADED, S.NEEDS_STAFF},                     # staff added notes → re-match
    S.PACKET_DRAFTED: {S.AWAITING_CLINICIAN, S.NEEDS_STAFF},
    S.AWAITING_CLINICIAN: {S.SUBMITTED, S.CRITERIA_LOADED},               # attest, or send back → re-match
    S.SUBMITTED: {S.DECIDED},
    S.NEEDS_STAFF: {S.CRITERIA_LOADED, S.EVIDENCE_MATCHED},
}
HUMAN_OR_WAIT = {S.GAPS_FOUND, S.AWAITING_CLINICIAN, S.SUBMITTED, S.DECIDED, S.NEEDS_STAFF}


def check_transition(a: S, b: S) -> None:
    if b not in ALLOWED.get(a, set()):
        raise ValueError(f"Illegal transition {a} → {b}")
`,
    },
    {
      file: "criteria/aetna_73721.yaml (illustrative)",
      lang: "yaml",
      note: md`Payer policies are long PDFs, but the *decision* is a checklist. Converting each policy into a reviewed checklist (model-drafted, staff-verified, versioned) turns fuzzy retrieval into a **lookup by (payer, procedure)**.`,
      code: txt`
payer: ExamplePayer
procedure: "MRI knee without contrast (CPT 73721)"
policy_version: "2026-Q3"
source: "policies/examplepayer_imaging_2026q3.pdf#page=14"
criteria:
  - id: conservative_tx_6wk
    text: At least 6 weeks of conservative treatment (PT, NSAIDs, activity modification) within the last 6 months
    evidence_hint: PT notes, medication list, visit notes mentioning duration
  - id: xray_first
    text: Plain radiographs performed within the last 3 months
  - id: exam_findings
    text: Documented physical exam findings suggesting internal derangement (e.g. positive McMurray, effusion, locking)
  any_of_exceptions:
    - id: red_flags
      text: Suspected fracture, infection or tumor (bypasses conservative treatment requirement)
`,
    },
    {
      file: "phi.py",
      patterns: ["guardrails"],
      note: md`**Minimum necessary:** the model sees only notes relevant to this request, from a relevant date window, with direct identifiers removed. The patient's name and MRN aren't needed to judge whether PT lasted six weeks.`,
      code: py`
import re
from datetime import date, timedelta

IDENTIFIERS = [
    (re.compile(r"\bMRN[:#]?\s*\d+\b", re.I), "[MRN]"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN]"),
    (re.compile(r"\b\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b"), "[PHONE]"),
]
RELEVANT_TYPES = {"progress_note", "pt_note", "imaging_report", "medication_list", "referral"}


def minimum_necessary(notes: list[dict], patient_name: str, window_days: int = 270) -> list[dict]:
    cutoff = date.today() - timedelta(days=window_days)
    out = []
    for n in notes:
        if n["type"] not in RELEVANT_TYPES or date.fromisoformat(n["date"]) < cutoff:
            continue
        text = n["text"]
        for part in patient_name.split():
            text = re.sub(rf"\b{re.escape(part)}\b", "[PATIENT]", text, flags=re.I)
        for pat, repl in IDENTIFIERS:
            text = pat.sub(repl, text)
        out.append({"id": n["id"], "type": n["type"], "date": n["date"], "text": text})
    return out
`,
    },
    {
      file: "steps.py",
      patterns: ["structured-output", "rag", "idempotency"],
      note: md`One function per state. Each returns ~(next_state, output)~ and is **idempotent**: if it already ran and stored output for this case version, it returns the stored result instead of calling the model again. Evidence matching is per criterion with **note ids and quotes**, so the clinician can click through to the source.`,
      code: py`
from typing import Literal

import yaml
from pydantic import BaseModel, Field

import llm
from phi import minimum_necessary
from states import S


class CriterionEvidence(BaseModel):
    criterion_id: str
    status: Literal["met", "not_met", "insufficient_documentation"]
    note_ids: list[str]
    quotes: list[str] = Field(description="Verbatim excerpts from the cited notes")
    explanation: str


class Match(BaseModel):
    results: list[CriterionEvidence]


MATCH_SYSTEM = """You help prior-authorisation staff check documentation against payer criteria.
For each criterion, find supporting evidence in the notes. Quote verbatim and cite note ids.
'met' only with explicit documentation (dates/durations must support the requirement).
'insufficient_documentation' if it may be true but isn't documented clearly. Never assume."""


def load_criteria(case, ctx):
    path = f"criteria/{case.payer_id}_{case.cpt}.yaml"
    try:
        crit = yaml.safe_load(open(path))
    except FileNotFoundError:
        return S.NEEDS_STAFF, {"reason": f"No reviewed checklist for {case.payer_id}/{case.cpt}"}
    return S.CRITERIA_LOADED, {"criteria": crit}


def match_evidence(case, ctx):
    crit = case.outputs["criteria"]
    notes = minimum_necessary(ctx.ehr.notes(case.patient_id), ctx.ehr.patient_name(case.patient_id))
    docs = "\n\n".join(f'<note id="{n["id"]}" type="{n["type"]}" date="{n["date"]}">\n{n["text"]}\n</note>' for n in notes)
    checklist = "\n".join(f"- {c['id']}: {c['text']}" for c in crit["criteria"] + crit.get("any_of_exceptions", []))
    m = llm.parse(MATCH_SYSTEM, f"<criteria>\n{checklist}\n</criteria>\n<notes>\n{docs}\n</notes>", Match, max_tokens=4000)

    by_id = {n["id"]: n["text"] for n in notes}
    for r in m.results:                                  # verify quotes against cited notes
        cited = " ".join(by_id.get(i, "") for i in r.note_ids)
        if r.status == "met" and not all(q in cited for q in r.quotes):
            r.status, r.explanation = "insufficient_documentation", "Quote not verifiable; staff to check. " + r.explanation

    required = {c["id"] for c in crit["criteria"]}
    exception_met = any(r.status == "met" for r in m.results if r.criterion_id not in required)
    gaps = [r for r in m.results if r.criterion_id in required and r.status != "met"]
    nxt = S.PACKET_DRAFTED if (not gaps or exception_met) else S.GAPS_FOUND
    return S.EVIDENCE_MATCHED, {"match": m.model_dump(), "gaps": [g.criterion_id for g in gaps], "next": nxt}


def draft_packet(case, ctx):
    m = case.outputs["match"]
    letter = llm.complete(
        "Draft a concise letter of medical necessity for a prior-authorisation request using ONLY the "
        "matched evidence provided. Reference dates and findings exactly. Clinical, factual tone. "
        "End with a signature block for the ordering clinician.",
        f"<procedure>{case.cpt}</procedure>\n<evidence>{m}</evidence>", max_tokens=1500)
    return S.PACKET_DRAFTED, {"letter": letter, "form_fields": ctx.forms.prefill(case, m)}


def submit(case, ctx):
    if not case.outputs.get("attestation"):
        raise PermissionError("No clinician attestation: refusing to submit")       # belt and braces
    ref = ctx.portal.submit(case.payer_id, case.outputs["form_fields"], case.outputs["letter"],
                            idempotency_key=f"{case.id}:v{case.version}")
    return S.SUBMITTED, {"portal_ref": ref}
`,
    },
    {
      file: "engine.py",
      patterns: ["workflow-state-machine", "observability", "human-in-loop"],
      note: md`The engine runs automatic steps until the case reaches a human or waiting state. Every transition is written to an **append-only audit log** with the model and prompt version, and a hash of the inputs (not the PHI itself).`,
      code: py`
import hashlib
import json

from states import HUMAN_OR_WAIT, S, check_transition
from steps import draft_packet, load_criteria, match_evidence


def route_after_match(case, ctx):
    if case.outputs.get("next") == S.GAPS_FOUND:
        ctx.notify_staff(case.id, gaps=case.outputs["gaps"])      # staff add notes, then re-match
        return S.GAPS_FOUND, {}
    return draft_packet(case, ctx)


def request_signature(case, ctx):
    ctx.notify_clinician(case.ordering_clinician_id, case.id)
    return S.AWAITING_CLINICIAN, {}


AUTO = {S.RECEIVED: load_criteria, S.CRITERIA_LOADED: match_evidence,
        S.EVIDENCE_MATCHED: route_after_match, S.PACKET_DRAFTED: request_signature}


def advance(case_id: str, store, ctx) -> S:
    case = store.load(case_id)
    while case.state in AUTO and case.state not in HUMAN_OR_WAIT:
        step = AUTO[case.state]
        try:
            new_state, output = step(case, ctx)
        except Exception as e:
            new_state, output = S.NEEDS_STAFF, {"error": type(e).__name__}
        check_transition(case.state, new_state)
        store.transition(case_id, case.state, new_state, output, audit={
            "actor": "system", "step": step.__name__,
            "model": ctx.model_id, "prompt_version": ctx.prompt_versions.get(step.__name__),
            "inputs_hash": hashlib.sha256(json.dumps(case.outputs, sort_keys=True, default=str).encode()).hexdigest(),
        })
        case = store.load(case_id)
    return case.state


def clinician_attest(case_id: str, clinician, store, ctx, approve: bool, comment: str = ""):
    case = store.load(case_id)
    new = S.SUBMITTED if approve else S.CRITERIA_LOADED
    check_transition(case.state, new)
    if approve:
        store.save_outputs(case_id, {"attestation": {"by": clinician.npi, "comment": comment}})
        from steps import submit
        _, out = submit(store.load(case_id), ctx)
        store.transition(case_id, case.state, new, out, audit={"actor": clinician.npi, "step": "attest+submit"})
    else:
        store.transition(case_id, case.state, new, {"rejected_reason": comment}, audit={"actor": clinician.npi, "step": "reject"})
`,
    },
    {
      file: "evals/criteria_match_eval.py",
      patterns: ["eval-harness"],
      note: md`Experienced prior-auth nurses labelled 120 historical cases criterion by criterion. **The critical error is "met" when the truth is "not met"**, because that's what causes denials and compliance risk, so report it separately.`,
      code: py`
from collections import Counter


def evaluate(cases, run_match):
    confusion = Counter()
    for c in cases:                                   # c.labels: {criterion_id: status}
        pred = {r.criterion_id: r.status for r in run_match(c).results}
        for crit, truth in c.labels.items():
            confusion[(truth, pred.get(crit, "missing"))] += 1
    total = sum(confusion.values())
    false_met = sum(v for (t, p), v in confusion.items() if p == "met" and t != "met")
    print("accuracy:", round(sum(v for (t, p), v in confusion.items() if t == p) / total, 3))
    print("FALSE 'met' rate (must be ~0):", round(false_met / total, 4))
    print("gap detection recall:", round(
        sum(v for (t, p), v in confusion.items() if t != "met" and p != "met") /
        max(sum(v for (t, _), v in confusion.items() if t != "met"), 1), 3))
`,
    },
  ],

  evaluate: md`
| Metric | Target | Why |
|---|---|---|
| False "met" rate | ≈ 0% (< 0.5%) | Prevents unsupported submissions |
| Gap detection recall | ≥ 95% | Gaps found *before* submission = fewer denials |
| Quote verification | 100% of "met" have verified quotes | Auditability |
| Time per case (pilot) | < 10 min staff + clinician review | The business case |
| Denial rate for documentation (3-month pilot vs control) | −50% | The outcome that matters, measured with the payer's actual decisions |

> **Measure outcomes, not just outputs.** The real eval here is the payer's decision months later. Plan a pilot with a control group from day one.
`,

  operate: md`
- **SLA timers:** urgent cases stuck in ~AWAITING_CLINICIAN~ > 4 h page the clinic lead.
- **Restarts:** the engine is stateless, and all state lives in the store, so a crashed worker just re-runs ~advance()~, and idempotency prevents duplicates.
- **Policy updates:** quarterly payer updates → regenerate checklists (model draft + staff review) → new version files. Old cases keep their checklist version.
- **Compliance:** BAAs with all vendors handling PHI, access logs, retention policies, and no PHI in application logs (hashes and ids only).
- **Monitoring:** cases per state, time in state, ~NEEDS_STAFF~ reasons, clinician send-back rate (a quality signal), and denial reasons from payers.
`,

  levelUp: md`
- **Thousands of cases with long waits, retries and timers?** Use a durable workflow engine instead of a hand-rolled one: [[proj:a02]].
- **Evidence across many systems and document types?** Permission-aware retrieval: [[proj:a01]].
- **Payer portals without APIs?** Computer-use agents are possible, but they need extreme guardrails. Prefer clearinghouse APIs where they exist.
`,

  exercises: [
    "Write a test proving that no sequence of calls can reach ~SUBMITTED~ without an attestation.",
    "Add a ~PENDED~ path: the payer requests more information. Which states does it go back through?",
    "Measure how many tokens ~minimum_necessary()~ removes per case, and whether evidence-matching accuracy changes.",
    "Design the audit-log query an auditor would run to reconstruct a case. What's missing from the current log?",
  ],

  interview: md`
> "Prior authorisation is a regulated, multi-day process, so I built a state machine with allowed transitions as data, a mandatory clinician-attestation state that code (not a prompt) enforces, idempotent steps, and an append-only audit log recording model and prompt versions per transition. Payer policies became reviewed checklists looked up by payer and procedure code. The model matches chart evidence per criterion with note ids and verbatim quotes, which are verified in code, after minimum-necessary PHI filtering. Gaps are flagged before submission, which is where most denials come from. The key metric was a near-zero false-'met' rate on 120 nurse-labelled cases, with the real outcome, documentation-related denials, measured in a controlled pilot."
`,
});
