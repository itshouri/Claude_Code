project({
  id: "a07",
  level: "advanced",
  title: "Evaluation and feedback flywheel for an AI tutor",
  industry: "Education technology",
  client: "BrightPath Learning: an AI maths tutor used by 300,000 students aged 11–16",
  time: "2 days of study",
  summary: "Production quality at scale: interaction logging, online sampling, specialised judges (pedagogy, maths correctness verified with code, safety), failure clustering, dataset versioning and A/B tests with guardrail metrics.",
  newConcepts: ["Online evaluation", "Specialised judges + code verification", "Failure clustering", "Versioned eval datasets", "A/B testing with guardrail metrics", "Child-safety requirements"],
  patterns: ["feedback-flywheel", "llm-judge", "eval-harness", "observability", "prompt-ci", "human-in-loop", "guardrails"],
  skills: ["Running AI quality as a continuous process", "Designing metrics that match the product goal", "Experimentation"],

  brief: md`
> "Teachers love the tutor, but we keep getting screenshots of it either giving away the final answer, which defeats the purpose, or being confidently wrong about algebra. We fix one prompt and something else breaks. We need to know our quality every day, not when a teacher tweets."
> (Chief Product Officer, BrightPath Learning)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| What does "good tutoring" mean? | Socratic: hints, not answers; correct maths; encouraging; age-appropriate; adapts to the student's mistake | A **pedagogy rubric** with education specialists |
| Scale? | ≈2M tutor messages/day | You can't judge everything: **sample** |
| Existing signals? | Thumbs up/down (5% of messages), "I'm stuck" button, teacher flags, session abandonment | Biased but valuable; combine with random samples |
| What's critical? | Maths errors; giving away answers on graded homework; anything unsafe for minors (self-harm disclosures need a safe response + escalation per policy) | Separate **critical** metrics with zero tolerance or strict thresholds |
| Who can label? | 6 maths teachers on contract, ≈200 labels/day | Precious human labels go to calibration and hard cases |
| Change cadence? | Prompt updates weekly, model updates quarterly | CI gates + online A/B for big changes |

**Success:** daily quality dashboard; maths-error rate measured and below 0.5% of hint messages; answer-giveaway rate < 2% on homework mode; every regression detected within 24 h; teacher-flag rate halved in two quarters.
`,

  frame: md`
Every earlier project had an eval. This one is about the **system that keeps evals true over time**: the [[p:feedback-flywheel]].

~~~text
         ┌────────────── 1 LOG every interaction (structured) ───────────────┐
         ▼                                                                   │
  2 SAMPLE: random 0.5% + all thumbs-down + all teacher flags + "stuck"      │
         ▼                                                                   │
  3 JUDGE: pedagogy judge · maths verifier (code) · safety classifier        │
         ▼                                                                   │
  4 DASHBOARD + ALERTS (daily, by grade level, topic, mode, prompt version)  │
         ▼                                                                   │
  5 MINE failures: cluster → name → prioritise                               │
         ▼                                                                   │
  6 CURATE: representative failures → golden set vN+1 (teachers label)       │
         ▼                                                                   │
  7 FIX: prompt / retrieval / guardrail → CI gate on golden set (I10)        │
         ▼                                                                   │
  8 SHIP via A/B with guardrail metrics ─────────────────────────────────────┘
~~~

**Key principles:**
- **Use the cheapest reliable grader per criterion.** Maths correctness can often be **verified with code** (sympy), which beats any judge. Pedagogy needs a judge calibrated against teachers. Safety uses a dedicated classifier plus policy rules.
- **Feedback is biased:** thumbs-down over-represents frustration. Always pair it with **random samples** to estimate true rates.
- **The golden set is a living, versioned product.** It grows from production failures, so it stays representative.
`,

  design: md`
~~~text
 tutor service ──▶ interaction log (event stream → warehouse)
   │  {session, student_grade, mode, topic, problem, student_msg, tutor_msg, prompt_version, model,
   │   latency, tokens, feedback?, teacher_flag?}  (pseudonymous student ids; minimal data)
   ▼
 sampler (hourly) ──▶ judge workers (Batches API for cost) ──▶ scores table
                                  │
                ┌─────────────────┼────────────────────────┐
                ▼                 ▼                        ▼
       pedagogy judge      maths verifier            safety classifier
       (rubric, calibrated (extract claimed steps →  (+ rules; any hit →
        vs teachers)        sympy check)              human review queue)
                │                 │                        │
                └─────────────────┴──────▶ daily metrics, alerts, drill-down
                                                  │
                     failure miner: embed failures → cluster → LLM names clusters → triage board
                                                  │
                     teachers label representatives → golden set vN+1 (versioned) → CI (I10) → A/B
~~~
`,

  tree: txt`
quality/
├── logging_schema.py
├── sampler.py
├── judges/
│   ├── pedagogy.py      # rubric judge
│   ├── maths.py         # sympy verification of claimed steps
│   └── safety.py
├── metrics.py           # daily aggregates with confidence intervals
├── mining.py            # clustering + naming
├── datasets.py          # versioned golden sets
└── experiments.py       # A/B analysis with guardrails
`,

  build: [
    {
      file: "sampler.py",
      patterns: ["feedback-flywheel"],
      note: md`**Stratified sampling with weights.** Random samples estimate true rates, and targeted samples (thumbs-down, flags) find failures faster. Keep the **inclusion weight**, so dashboard rates are computed only from the random stratum (or re-weighted), never from the biased one.`,
      code: py`
import random


def sample(interactions, random_rate: float = 0.005):
    """Yield (interaction, stratum, weight). Only 'random' contributes to unbiased rate estimates."""
    for it in interactions:
        if random.random() < random_rate:
            yield it, "random", 1 / random_rate
        if it.feedback == "down":
            yield it, "thumbs_down", None
        if it.teacher_flag:
            yield it, "teacher_flag", None
        if it.stuck_pressed_after:
            yield it, "stuck", None
`,
    },
    {
      file: "judges/maths.py",
      patterns: ["eval-harness"],
      note: md`**Verify with code wherever you can.** The model extracts the mathematical claims in the tutor's message (e.g. "x = 4", "3(x+2) = 3x+6"), and **sympy checks them**. A judge saying "looks right" isn't verification. A symbolic check is. Claims that can't be parsed are marked unverifiable and go to the judge or a teacher.`,
      code: py`
from typing import Literal

import sympy as sp
from pydantic import BaseModel, Field

import llm


class MathClaim(BaseModel):
    kind: Literal["equation_solution", "identity", "numeric"]
    left: str = Field(description="Left side in sympy syntax, e.g. '3*(x+2)'")
    right: str = Field(description="Right side in sympy syntax, e.g. '3*x+6'")
    variable: str | None = None


class Claims(BaseModel):
    claims: list[MathClaim]


def check_claim(c: MathClaim, problem_equation: str | None) -> Literal["correct", "wrong", "unverifiable"]:
    try:
        L, R = sp.sympify(c.left), sp.sympify(c.right)
        if c.kind in ("identity", "numeric"):
            return "correct" if sp.simplify(L - R) == 0 else "wrong"
        if c.kind == "equation_solution" and problem_equation and c.variable:
            lhs, rhs = problem_equation.split("=")
            var = sp.Symbol(c.variable)
            sols = sp.solve(sp.sympify(lhs) - sp.sympify(rhs), var)
            return "correct" if sp.sympify(c.right) in sols else "wrong"
    except (sp.SympifyError, TypeError, ValueError, SyntaxError):
        pass
    return "unverifiable"


def verify_message(tutor_msg: str, problem_equation: str | None) -> dict:
    ex = llm.parse("Extract every mathematical statement the tutor asserts as true (not questions to the student). "
                   "Write each as left/right expressions in sympy syntax.",
                   f"<tutor_message>{tutor_msg}</tutor_message>", Claims, tier="fast")
    results = [check_claim(c, problem_equation) for c in ex.claims]
    return {"n_claims": len(results), "wrong": results.count("wrong"), "unverifiable": results.count("unverifiable")}
`,
    },
    {
      file: "judges/pedagogy.py",
      patterns: ["llm-judge"],
      note: md`The **pedagogy rubric** was written with teachers as binary criteria, *conditional on mode* (homework mode forbids final answers, while exam-review mode allows worked solutions). Calibrated against teacher labels per criterion ([[proj:i07]]) before use.`,
      code: py`
from pydantic import BaseModel

import llm

CRITERIA = {
    "no_final_answer": "Does NOT state the final answer to the student's problem (homework mode only).",
    "addresses_mistake": "Responds to the student's specific mistake or question, not a generic hint.",
    "one_step": "Moves the student forward by one step; does not solve multiple steps at once.",
    "checks_understanding": "Ends with a question or prompt for the student to try.",
    "age_appropriate": "Language suits a {grade}th grader; encouraging, not condescending.",
}


class C(BaseModel):
    criterion: str
    evidence: str
    passed: bool


class PedagogyGrade(BaseModel):
    results: list[C]


def judge(it) -> dict:
    crit = {k: v.format(grade=it.student_grade) for k, v in CRITERIA.items()
            if not (k == "no_final_answer" and it.mode != "homework")}
    g = llm.parse("You are an experienced maths teacher grading an AI tutor's reply against each criterion. "
                  "Quote evidence, then pass/fail. Grade the reply, not the student.",
                  f"<criteria>{crit}</criteria>\n<problem>{it.problem}</problem>\n"
                  f"<student>{it.student_msg}</student>\n<tutor>{it.tutor_msg}</tutor>", PedagogyGrade, tier="smart")
    return {r.criterion: r.passed for r in g.results}
`,
    },
    {
      file: "mining.py",
      patterns: ["feedback-flywheel"],
      note: md`**Failure mining:** embed failing interactions, cluster them, and have a model *name* each cluster from a few examples ("gives away the answer when the student says 'just tell me'", "sign errors when distributing negatives"). Ranking clusters by size × severity tells you what to fix this week.`,
      code: py`
import numpy as np
from pydantic import BaseModel
from sklearn.cluster import KMeans

import llm


class ClusterName(BaseModel):
    name: str
    description: str
    likely_cause: str
    suggested_fix_area: str          # prompt | retrieval | guardrail | model | product


def mine(failures: list[dict], embed, k: int = 12) -> list[dict]:
    texts = [f"{f['problem']} || student: {f['student_msg']} || tutor: {f['tutor_msg']} || failed: {f['failed']}"
             for f in failures]
    X = np.array(embed(texts))
    labels = KMeans(n_clusters=min(k, len(failures)), n_init="auto", random_state=0).fit_predict(X)
    out = []
    for c in sorted(set(labels)):
        members = [f for f, l in zip(failures, labels) if l == c]
        examples = "\n---\n".join([texts[i] for i, l in enumerate(labels) if l == c][:6])
        name = llm.parse("Name this cluster of AI-tutor failures for an engineering triage board.",
                         f"<examples>\n{examples}\n</examples>", ClusterName, tier="smart")
        severity = max(m["severity"] for m in members)
        out.append({**name.model_dump(), "size": len(members), "severity": severity,
                    "priority": len(members) * {"critical": 10, "major": 3, "minor": 1}[severity],
                    "example_ids": [m["id"] for m in members[:20]]})
    return sorted(out, key=lambda x: x["priority"], reverse=True)
`,
      after: md`> Clusters dominated by a single student or session (one person hammering the same problem) can look like systemic failures. Count *distinct students* per cluster before prioritising.`,
    },
    {
      file: "datasets.py",
      patterns: ["eval-harness", "prompt-ci"],
      note: md`**Golden sets are versioned artefacts**: immutable versions with a manifest (sources, counts by stratum, label provenance). CI ([[proj:i10]]) pins a version, and metrics are only comparable *within* a version. When you add hard cases, scores drop, and that's expected rather than a regression. Report both versions during the transition.`,
      code: py`
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path("golden")


def publish(name: str, rows: list[dict], notes: str) -> str:
    prev = sorted((ROOT / name).glob("v*"), key=lambda p: int(p.name[1:]))
    version = f"v{int(prev[-1].name[1:]) + 1 if prev else 1}"
    d = ROOT / name / version
    d.mkdir(parents=True)
    body = "\n".join(json.dumps(r, sort_keys=True) for r in rows)
    (d / "data.jsonl").write_text(body)
    manifest = {"name": name, "version": version, "created": date.today().isoformat(), "n": len(rows),
                "by_source": _count(rows, "source"), "by_topic": _count(rows, "topic"),
                "label_provenance": _count(rows, "labelled_by"), "sha256": hashlib.sha256(body.encode()).hexdigest(),
                "notes": notes}
    (d / "manifest.json").write_text(json.dumps(manifest, indent=2))
    return version


def _count(rows, key):
    out = {}
    for r in rows:
        out[r.get(key, "unknown")] = out.get(r.get(key, "unknown"), 0) + 1
    return out
`,
    },
    {
      file: "experiments.py",
      note: md`**A/B tests with guardrail metrics.** A new prompt might raise the *primary* metric (problems solved per session) by giving more away. **Guardrails** (answer-giveaway rate, maths-error rate, safety) must not get worse, so the ship decision requires *both*.`,
      code: py`
import math


def diff_with_ci(a_success: int, a_n: int, b_success: int, b_n: int, z: float = 1.96):
    pa, pb = a_success / a_n, b_success / b_n
    se = math.sqrt(pa * (1 - pa) / a_n + pb * (1 - pb) / b_n)
    return pb - pa, (pb - pa - z * se, pb - pa + z * se)


def ship_decision(results: dict) -> dict:
    """results[metric] = (a_success, a_n, b_success, b_n); higher is better for primary, lower for guardrails."""
    d, ci = diff_with_ci(*results["solved_per_session"])
    primary_win = ci[0] > 0
    guard = {}
    for g in ("answer_giveaway", "maths_error", "safety_incident"):
        gd, gci = diff_with_ci(*results[g])
        guard[g] = {"diff": round(gd, 4), "ci": tuple(round(x, 4) for x in gci), "ok": gci[1] <= 0.002}
    return {"primary": {"diff": round(d, 4), "ci": tuple(round(x, 4) for x in ci), "win": primary_win},
            "guardrails": guard, "ship": primary_win and all(v["ok"] for v in guard.values())}
`,
    },
  ],

  evaluate: md`
## Evaluating the evaluators
| Grader | Calibration | Target |
|---|---|---|
| Maths verifier | 300 teacher-checked messages: precision/recall of "wrong" | Precision ≥ 95%; unverifiable < 15% |
| Pedagogy judge | 400 teacher labels, kappa per criterion vs teacher–teacher | κ within 0.05 of human–human |
| Safety classifier | Curated sensitive-disclosure set + policy rules | Recall ≈ 100% for self-harm disclosures; all positives go to human review |

## The daily dashboard (from the random stratum)
- Maths-error rate in hint messages (with CI), by topic and grade.
- Answer-giveaway rate in homework mode.
- Pedagogy pass rate per criterion.
- Safety: incidents, time to human review.
- Volume, latency, cost per session, by prompt version and model.

> **Alert on change, not just level:** "maths-error rate on quadratics rose from 0.3% to 1.1% after prompt v41" is actionable within a day.
`,

  operate: md`
- **Judging cost:** 0.5% of 2M messages ≈ 10k/day plus targeted samples. Run judges through the Batches API (half price) hourly, keeping a small synchronous path for teacher flags.
- **Privacy for minors:** pseudonymous ids, data minimisation, retention limits, parental/school agreements, and no use of student data for anything beyond tutoring quality without consent. Safety escalations follow a documented policy with trained humans.
- **Weekly quality review:** top clusters → owners → fixes → CI → A/B. The flywheel is a *meeting* as much as code.
- **Teacher labelling budget:** spend it on (1) calibrating judges, (2) labelling cluster representatives, (3) auditing auto-labels. Never on random easy cases.
`,

  levelUp: md`
- **Every AI feature in a company running this loop?** A platform eval service with shared judges and dataset tooling: [[proj:a04]].
- **Agents (multi-turn, tool-using tutors)?** Session-level and trajectory evaluation, plus simulated students ([[proj:i09]], [[proj:a05]]).
- **Deciding what to build next based on quality data?** [[proj:a08]].
`,

  exercises: [
    "Add distinct-student counts to ~mine()~ and down-rank clusters where one student accounts for more than half the failures.",
    "Extend ~check_claim~ to verify inequality solutions and fraction simplification.",
    "Simulate how many random samples per day you need to detect a maths-error increase from 0.3% to 0.6% within 3 days at 95% confidence.",
    "Design the teacher labelling UI: what information do teachers need to label pedagogy criteria in under 30 seconds per item?",
  ],

  interview: md`
> "BrightPath's tutor serves 2M messages a day, so I built the quality system rather than a one-off eval. Interactions are logged in structured form and sampled in strata: a random 0.5% for unbiased rates, plus every thumbs-down, teacher flag and 'stuck' event for failure discovery. Each criterion uses the cheapest reliable grader: maths claims are extracted and verified with sympy, pedagogy uses a mode-aware binary rubric judge calibrated against teacher labels with kappa, and safety uses a classifier and rules with human review. Failures get embedded, clustered and named into a triage board ranked by size × severity, representatives become new versions of an immutable golden set, fixes pass the CI gate, and bigger changes ship through A/B tests that need a primary-metric win and no guardrail regression."
`,
});
