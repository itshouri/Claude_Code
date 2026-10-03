project({
  id: "i07",
  level: "intermediate",
  title: "Sales call scorecards with a calibrated judge",
  industry: "B2B sales / revenue operations",
  client: "Vantage CRM: 150 account executives, ≈4,000 recorded discovery calls a month",
  time: "5–7 hours",
  summary: "Score call transcripts against a sales methodology rubric with quoted evidence, then calibrate the judge against manager scores using Cohen's kappa until it can be trusted.",
  newConcepts: ["Rubric engineering", "Binary criteria vs 1–10 scales", "Cohen's kappa", "Judge calibration loop", "Aggregate trends over noisy per-item scores"],
  patterns: ["llm-judge", "eval-harness", "structured-output", "grounded-citations", "feedback-flywheel"],
  skills: ["Building judges people trust", "Measuring agreement properly", "Iterating rubric wording with data"],

  brief: md`
> "Our managers are supposed to review calls and coach reps, but each manager listens to maybe two calls per rep per month. We want every discovery call scored against our methodology, so coaching is based on patterns, not anecdotes. But if the scores feel random, reps will ignore them."
> (VP Sales Enablement, Vantage CRM)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Methodology? | A MEDDICC-style discovery checklist: metrics, economic buyer, decision criteria, decision process, pain, champion, next steps | Rubric criteria |
| How do managers score today? | A 1–5 scale per area, inconsistently | 1–5 scales are notoriously unreliable, even between humans |
| Trust? | "If a rep disputes a score, we need to show *why*" | Quoted evidence per criterion |
| What will scores drive? | Coaching focus and team trends. **Not** compensation | Lower stakes allow per-call noise if aggregates are right; say so explicitly |
| Labels? | Managers will score 80 calls for calibration | Calibration set |

**Success:** judge–manager agreement on each criterion at least as high as manager–manager agreement; reps dispute < 5% of scores; managers say the trends match their intuition.
`,

  frame: md`
**Shape:** *Judge against a rubric*. This is the [[p:llm-judge]] pattern as the product itself.

**The design choices that make judges reliable:**
1. **Binary, observable criteria** instead of 1–5 scales. "Did the rep ask about the budget-approval process?" can be checked. "Rate the qualification quality 1–5" can't.
2. **Evidence first, verdict second.** The judge quotes the transcript, then decides. Quotes are verified in code.
3. **One criterion at a time, or a few at a time**, so each gets focus.
4. **Calibrate against humans with the right statistic.** Raw percent agreement is inflated when one answer is common. **Cohen's kappa** corrects for chance agreement.
5. **Compare with human–human agreement.** If two managers agree at κ = 0.6, a judge at κ = 0.65 is as good as a manager.
`,

  design: md`
~~~text
                         ┌──────────── calibration loop (offline) ────────────┐
                         │ 80 calls × 2 managers → human labels               │
 rubric_v1 ─────────────▶│ judge(rubric_vN) on same calls → kappa per crit.   │──▶ rubric_vN+1
                         │ read disagreements → reword / split criteria       │    (until κ ≥ human–human)
                         └────────────────────────────────────────────────────┘
                                                    │ frozen rubric + prompt version
                                                    ▼
 call transcript ──▶ judge(rubric) ──▶ per-criterion {evidence[], verdict} ──▶ verify quotes
                                                    │
                                                    ▼
                    scorecard UI (with quotes) ── rep dispute? ──▶ manager decides ──▶ new label
                                                    │
                                                    ▼
                         team/rep trends (rolling 30 calls) ──▶ coaching dashboard
~~~
`,

  tree: txt`
call-scorecards/
├── rubric/discovery_v4.yaml
├── judge.py
├── calibrate.py      # kappa per criterion, human-human baseline, disagreement dump
├── trends.py         # per-rep rolling aggregates with uncertainty
└── data/
    ├── calibration_labels.jsonl   # call_id, criterion, manager_a, manager_b
    └── transcripts/
`,

  build: [
    {
      file: "rubric/discovery_v4.yaml",
      lang: "yaml",
      note: md`v4 because v1–v3 failed calibration. Notice the **"does not count"** lines. They come straight from reading disagreements between the judge and managers.`,
      code: txt`
version: 4
criteria:
  - id: pain_quantified
    question: Did the rep get the prospect to state the business impact of the problem in numbers (money, hours, error rate, churn)?
    counts: Prospect states or confirms a number or a concrete measurable impact.
    does_not_count: Rep states a number the prospect doesn't confirm. Vague words like "a lot" or "significant".
  - id: economic_buyer
    question: Did the rep identify who has final budget authority, by name or role?
    counts: A named person or role is identified as approving the spend.
    does_not_count: "I'll check with my team." Assumptions by the rep.
  - id: decision_process
    question: Did the rep learn the steps and timeline for the purchase decision?
    counts: At least two concrete steps (e.g. security review, legal, board) or a date.
  - id: next_step_committed
    question: Did the call end with a specific next step that has a date and an owner on the prospect side?
    counts: Calendar invite agreed, or a dated action by the prospect.
    does_not_count: "Let's touch base soon." A next step only for the rep.
`,
    },
    {
      file: "judge.py",
      patterns: ["llm-judge", "grounded-citations", "structured-output"],
      note: md`The judge returns **evidence before verdict** for each criterion, plus a third option, ~unclear~, for genuinely ambiguous calls. Quotes that can't be found in the transcript downgrade the verdict, so a judge can't "pass" a rep on invented evidence.`,
      code: py`
import re
from typing import Literal

import yaml
from pydantic import BaseModel, Field

import llm

RUBRIC = yaml.safe_load(open("rubric/discovery_v4.yaml"))
VERSION = f"discovery_v{RUBRIC['version']}"


class CriterionVerdict(BaseModel):
    criterion_id: str
    evidence: list[str] = Field(description="Verbatim transcript quotes (with speaker) relevant to this criterion")
    reasoning: str
    verdict: Literal["yes", "no", "unclear"]


class Scorecard(BaseModel):
    results: list[CriterionVerdict]


SYSTEM = """You assess a B2B sales discovery call against a rubric, one criterion at a time.
For each criterion: first quote the relevant transcript lines verbatim, then reason briefly, then decide.
Apply 'counts' and 'does not count' literally. Use 'unclear' only if the transcript is genuinely ambiguous
(e.g. audio gaps), not when the rep simply didn't do it (that is 'no')."""


def render_rubric() -> str:
    return "\n".join(f"- {c['id']}: {c['question']}\n  counts: {c['counts']}\n  does not count: {c.get('does_not_count', '-')}"
                     for c in RUBRIC["criteria"])


norm = lambda s: re.sub(r"\W+", " ", s).lower().strip()


def score_call(transcript: str) -> Scorecard:
    card = llm.parse(SYSTEM, f"<rubric>\n{render_rubric()}\n</rubric>\n<transcript>\n{transcript}\n</transcript>",
                     Scorecard, max_tokens=4000)
    t = norm(transcript)
    for r in card.results:
        real = [q for q in r.evidence if norm(q.split(":", 1)[-1])[:60] in t]
        if r.verdict == "yes" and not real:
            r.verdict, r.reasoning = "unclear", "Evidence could not be verified in the transcript. " + r.reasoning
        r.evidence = real
    return card
`,
    },
    {
      file: "calibrate.py",
      patterns: ["eval-harness"],
      note: md`**Cohen's kappa from scratch** so you understand it: κ = (observed agreement − chance agreement) / (1 − chance agreement). Report it per criterion for **manager vs manager** and **judge vs each manager**. Then *print the disagreements*. Reading them is how rubric v1 becomes v4.`,
      code: py`
import json
from collections import Counter, defaultdict

from judge import VERSION, score_call

LABELS = ("yes", "no", "unclear")


def kappa(a: list[str], b: list[str]) -> float:
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    pe = sum((ca[l] / n) * (cb[l] / n) for l in LABELS)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def run(labels_path="data/calibration_labels.jsonl"):
    rows = [json.loads(l) for l in open(labels_path)]
    by_call = defaultdict(list)
    for r in rows:
        by_call[r["call_id"]].append(r)

    judge = {}
    for call_id in by_call:
        card = score_call(open(f"data/transcripts/{call_id}.txt").read())
        judge.update({(call_id, r.criterion_id): r for r in card.results})

    print(f"rubric {VERSION}")
    for crit in sorted({r["criterion"] for r in rows}):
        rs = [r for r in rows if r["criterion"] == crit]
        A = [r["manager_a"] for r in rs]
        B = [r["manager_b"] for r in rs]
        J = [judge[(r["call_id"], crit)].verdict for r in rs]
        print(f"{crit:22s} κ(A,B)={kappa(A,B):.2f}  κ(J,A)={kappa(J,A):.2f}  κ(J,B)={kappa(J,B):.2f}")
        for r, j in zip(rs, J):
            if r["manager_a"] == r["manager_b"] != j:          # both humans agree, judge differs
                v = judge[(r["call_id"], crit)]
                print(f"   ✗ {r['call_id']}: humans={r['manager_a']} judge={j} | {v.reasoning[:120]}")
`,
    },
    {
      file: "trends.py",
      note: md`Per-call scores are noisy (for judges *and* managers). Coaching decisions should rest on **aggregates with uncertainty**. A rep at 40% "pain quantified" over 30 calls is a real pattern. A single call is an anecdote.`,
      code: py`
import math


def rate_with_interval(yes: int, n: int, z: float = 1.96) -> tuple[float, float, float]:
    """Wilson score interval: better than ±sqrt(p(1-p)/n) for small n."""
    if n == 0:
        return 0.0, 0.0, 1.0
    p = yes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return p, max(0.0, centre - half), min(1.0, centre + half)


def rep_profile(cards: list[dict], last_n: int = 30) -> dict:
    recent = cards[-last_n:]
    out = {}
    for crit in {r["criterion_id"] for c in recent for r in c["results"]}:
        verdicts = [r["verdict"] for c in recent for r in c["results"] if r["criterion_id"] == crit and r["verdict"] != "unclear"]
        p, lo, hi = rate_with_interval(verdicts.count("yes"), len(verdicts))
        out[crit] = {"rate": round(p, 2), "ci": (round(lo, 2), round(hi, 2)), "n": len(verdicts)}
    return out
`,
    },
  ],

  evaluate: md`
## The calibration journey (typical)
| Rubric | pain_quantified κ(J,A) | economic_buyer | next_step_committed | Change made |
|---|---|---|---|---|
| v1 (1–5 scales) | 0.21 | 0.30 | 0.25 | Humans only reached κ ≈ 0.35 with each other too |
| v2 (binary questions) | 0.48 | 0.55 | 0.61 | Switched to yes/no criteria |
| v3 (+ "counts") | 0.58 | 0.66 | 0.70 | Defined what counts |
| v4 (+ "does not count") | **0.66** | **0.71** | **0.78** | Added exclusions from disagreements |
| Manager–manager | 0.63 | 0.70 | 0.74 | The ceiling |

v4 matches human–human agreement, so the judge is as consistent as a second manager, and far more scalable. **Freeze the version**, and re-calibrate on any rubric, prompt or model change.

> Kappa interpretation is a rough guide: < 0.4 poor, 0.4–0.6 moderate, 0.6–0.8 substantial, > 0.8 near-perfect. Compare against the human baseline, not against 1.0.
`,

  operate: md`
- **Cost:** a 45-minute call ≈ 10k tokens; 4,000 calls/month on the flagship model costs tens to low hundreds of dollars. Run nightly through the Batches API at half price.
- **Disputes** are gold: a rep disputes, a manager decides, and the decision becomes a calibration label. Track the dispute rate per criterion.
- **Drift:** new products change how good calls sound. Re-run calibration quarterly on fresh labels.
- **Ethics:** scores must not silently become compensation inputs. If they do, the stakes change and you need stricter accuracy, appeal processes and governance.
`,

  levelUp: md`
- **Judges as eval infrastructure for every AI feature?** [[proj:i10]], [[proj:a07]].
- **Judging agents' multi-step trajectories?** [[proj:a05]].
- **Coaching suggestions generated from patterns across calls?** Aggregate first (code), then narrate (model), as in [[proj:b03]].
`,

  exercises: [
    "Compute raw percent agreement and kappa for a criterion where 90% of answers are 'no'. Why are they so different?",
    "Split ~decision_process~ into two criteria (steps vs timeline). Does kappa go up?",
    "Swap the judge model and re-run calibration. How much does the model matter compared with rubric wording?",
    "Implement position-of-evidence bias checks: does the judge miss evidence in the last 10 minutes of long calls more often?",
  ],

  interview: md`
> "Vantage wanted every sales call scored, but scores only help if people trust them. I replaced 1–5 scales with binary, observable criteria, each with 'counts' and 'does not count' definitions, and the judge quotes evidence before each verdict, with quotes verified in code. I calibrated against 80 calls double-scored by managers using Cohen's kappa per criterion, with manager–manager agreement as the ceiling. Reading disagreements drove four rubric versions until judge–manager kappa matched manager–manager (around 0.65–0.78). In production we show quotes for every score, aggregate trends with Wilson intervals rather than judging reps on single calls, and turn rep disputes into new calibration labels."
`,
});
