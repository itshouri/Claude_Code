project({
  id: "b10",
  level: "beginner",
  title: "Responsible resume screening assistant",
  industry: "Recruiting / HR tech",
  client: "Peak Staffing: a recruiting agency that receives ≈2,000 applications per role",
  time: "4 hours",
  summary: "Score resumes against a job's explicit requirements with evidence, blind the inputs, test for bias with counterfactuals, and keep the recruiter as the decision-maker.",
  newConcepts: ["Rubric scoring with evidence", "Blinding inputs", "Counterfactual fairness tests", "Agreement with expert decisions", "High-risk AI regulation"],
  patterns: ["structured-output", "llm-judge", "guardrails", "human-in-loop", "eval-harness"],
  skills: ["Evaluation beyond accuracy (fairness, consistency)", "Designing for regulated, high-risk domains", "Rubric design"],

  brief: md`
> "Our recruiters can't read 2,000 resumes for a role. We need AI to find the top 50. And honestly, we're nervous. We've read about biased AI hiring tools."
> (Head of Delivery, Peak Staffing)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Decision the AI makes? | **None.** It should prioritise reading order, not reject anyone | Ranking + explanations; recruiter decides |
| Criteria? | Each job has must-haves (e.g. "3+ years Python", "work authorisation in Canada") and nice-to-haves | Rubric generated from the job post, **approved by the recruiter** |
| Legal context? | Hiring is classed as **high-risk AI** in several jurisdictions (e.g. the EU AI Act), and some cities require bias audits for automated employment decision tools | Documentation, bias testing, human oversight, candidate notice |
| What signals are risky? | Name, photo, age, gender, nationality, gaps (caregiving), school prestige as a proxy | **Blind** inputs; ban proxy criteria |
| Ground truth? | Past roles: which applicants recruiters advanced to interview | Agreement metric, while knowing historical decisions can themselves be biased |

**Success:** recruiters find their eventual interviewees in the top 10% of the AI ranking ≥ 85% of the time; **no significant score difference** under counterfactual swaps of protected attributes; every score has quoted evidence.
`,

  frame: md`
**Shape:** *Judge against a rubric*. The model acts like a structured grader, which is exactly the [[p:llm-judge]] pattern applied to a business task rather than to evals.

**Design principles for a high-risk domain:**
1. **Criteria are explicit, job-related, and approved by a human** before any resume is scored. No "overall impression" score.
2. **Evidence or it didn't happen:** each criterion is met / partially met / not evidenced, with a quote from the resume.
3. **Blind the inputs:** remove name, contact details, photos, age signals, and graduation years; replace the school name with the degree level and field.
4. **Rank, don't reject.** Every application remains viewable, and the recruiter decides.
5. **Test for bias** with counterfactual pairs: the same resume with different names, pronouns or a career gap. Scores must not move.
`,

  design: md`
~~~text
 Job post ──▶ draft rubric (model) ──▶ RECRUITER edits & approves rubric (versioned)
                                                │
 Resume (PDF) ──▶ text ──▶ blind() (code + model PII pass) ──▶ score(rubric, blinded) ──▶ CriterionScores + quotes
                                                                        │
                                                       verify quotes exist in the resume (code)
                                                                        │
                                                    total = weighted sum (code, not model)
                                                                        │
                                                         ranked list + evidence ──▶ RECRUITER decides
~~~
The total score is computed **in code** from per-criterion results. Weights are visible and owned by the recruiter, not hidden inside a model's holistic judgement.
`,

  tree: txt`
screening/
├── rubric.py        # draft rubric from job post → human approval
├── blind.py         # remove identity signals
├── score.py         # per-criterion evidence scoring
├── rank.py          # weighted totals in code
└── evals/
    ├── agreement.py     # vs recruiter advance decisions
    └── counterfactual.py
`,

  build: [
    {
      file: "rubric.py",
      patterns: ["structured-output", "human-in-loop"],
      note: md`The model **drafts** criteria from the job post, and the recruiter edits and approves them. Proxy criteria (school prestige, "culture fit", years since graduation) are explicitly forbidden.`,
      code: py`
from typing import Literal

from pydantic import BaseModel, Field

import llm


class Criterion(BaseModel):
    id: str
    description: str = Field(description="Specific, observable, job-related, e.g. '3+ years professional Python'")
    kind: Literal["must_have", "nice_to_have"]
    weight: int = Field(ge=1, le=5)


class Rubric(BaseModel):
    criteria: list[Criterion]


SYSTEM = """Draft a screening rubric from a job posting. Criteria must be job-related skills,
experience, certifications or legal requirements stated or clearly implied by the posting.
Never include: school prestige, age/years since graduation, gender, nationality, 'culture fit',
employment gaps, or anything not observable in a resume. 4-8 criteria."""


def draft_rubric(job_post: str) -> Rubric:
    return llm.parse(SYSTEM, f"<job_post>{job_post}</job_post>", Rubric)
# → shown in a UI; the recruiter edits, then saves as rubric_v{n} with their name and timestamp
`,
    },
    {
      file: "blind.py",
      patterns: ["guardrails"],
      note: md`Blinding is **defence in depth**: regex for structured PII, then a model pass that rewrites identity signals to neutral placeholders. Check the blinded output on samples, because blinding failures are invisible otherwise.`,
      code: py`
import re

from pydantic import BaseModel

import llm

PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[EMAIL]"),
    (re.compile(r"\+?\d[\d\s().-]{7,}\d"), "[PHONE]"),
    (re.compile(r"https?://\S+|linkedin\.com/\S+"), "[URL]"),
    (re.compile(r"\b(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}\b"), "[DATES]"),   # keep durations, drop years
]


class Blinded(BaseModel):
    text: str


SYSTEM = """Rewrite this resume text removing identity signals while keeping all job-relevant content.
Replace: person names → [CANDIDATE]; pronouns → they; nationality, ethnicity, religion, age, marital
status, photos → remove; school names → '[UNIVERSITY], <degree> in <field>'; addresses → city-level
removed entirely. Convert date ranges to durations (e.g. '3 years'). Do not summarise or omit skills."""


def blind(resume_text: str) -> str:
    t = resume_text
    for pat, repl in PATTERNS:
        t = pat.sub(repl, t)
    return llm.parse(SYSTEM, f"<resume>{t[:20000]}</resume>", Blinded, max_tokens=8000).text
`,
    },
    {
      file: "score.py",
      patterns: ["llm-judge", "structured-output"],
      note: md`One result per criterion, with **evidence before verdict**. "not_evidenced" is different from "not met": the resume may simply not mention it, which is something the recruiter can ask about.`,
      code: py`
from typing import Literal

from pydantic import BaseModel, Field

import llm
from rubric import Rubric


class CriterionResult(BaseModel):
    criterion_id: str
    evidence: list[str] = Field(description="Verbatim quotes from the resume; empty if none")
    verdict: Literal["met", "partially_met", "not_evidenced"]
    note: str = Field(description="One short sentence for the recruiter")


class Screening(BaseModel):
    results: list[CriterionResult]


SYSTEM = """You assess a blinded resume against each rubric criterion independently.
For each criterion: quote evidence verbatim, then decide met / partially_met / not_evidenced.
Judge only what is written. Do not infer from writing style, formatting, or employer prestige."""


def score(resume_blinded: str, rubric: Rubric) -> Screening:
    crit = "\n".join(f"- {c.id} ({c.kind}): {c.description}" for c in rubric.criteria)
    s = llm.parse(SYSTEM, f"<rubric>\n{crit}\n</rubric>\n<resume>\n{resume_blinded}\n</resume>", Screening)
    for r in s.results:                                 # drop unverifiable evidence
        kept = [q for q in r.evidence if q.strip() and q.strip() in resume_blinded]
        if r.evidence and not kept and r.verdict != "not_evidenced":
            r.verdict, r.note = "not_evidenced", "Evidence quote could not be verified; please check."
        r.evidence = kept
    return s
`,
    },
    {
      file: "rank.py",
      note: md`**Arithmetic in code.** Must-haves that aren't evidenced lower priority but **never auto-reject**. The candidate stays visible, sorted lower, with a clear reason.`,
      code: py`
POINTS = {"met": 1.0, "partially_met": 0.5, "not_evidenced": 0.0}


def total(screening, rubric) -> dict:
    by_id = {c.id: c for c in rubric.criteria}
    score = sum(POINTS[r.verdict] * by_id[r.criterion_id].weight
                for r in screening.results if r.criterion_id in by_id)
    max_score = sum(c.weight for c in rubric.criteria)
    missing_must = [r.criterion_id for r in screening.results
                    if by_id.get(r.criterion_id) and by_id[r.criterion_id].kind == "must_have"
                    and r.verdict == "not_evidenced"]
    return {"score": round(score / max_score, 3), "missing_must_haves": missing_must}
`,
    },
    {
      file: "evals/counterfactual.py",
      patterns: ["eval-harness"],
      note: md`**Counterfactual fairness test:** take real resumes, create variants that differ *only* in a protected attribute (name, pronouns, a caregiving gap, an age signal), run them through the **full** pipeline (blinding included), and compare scores. The blinding step should make most variants identical, and this test proves whether it does.`,
      code: py`
import statistics

from blind import blind
from rank import total
from score import score

VARIANTS = {
    "name": [("Emily Walsh", "Lakisha Washington"), ("Greg Baker", "Jamal Jones"), ("Wei Zhang", "John Smith")],
    "pronoun": [("she", "he"), ("her", "his")],
    "gap": [("", "\nCareer break (2 years): full-time caregiver.")],
}


def run(base_resumes: list[str], rubric) -> dict:
    report = {}
    for kind, swaps in VARIANTS.items():
        diffs = []
        for res in base_resumes:
            for a, b in swaps:
                r_a = res.replace("{X}", a) if "{X}" in res else res + a
                r_b = res.replace("{X}", b) if "{X}" in res else res + b
                s_a = total(score(blind(r_a), rubric), rubric)["score"]
                s_b = total(score(blind(r_b), rubric), rubric)["score"]
                diffs.append(s_b - s_a)
        report[kind] = {"mean_diff": round(statistics.mean(diffs), 4),
                        "max_abs_diff": round(max(map(abs, diffs)), 4),
                        "n": len(diffs)}
    return report     # gate: |mean_diff| < 0.01 and investigate any max_abs_diff > 0.1
`,
      after: md`> Also run each resume **twice without changes**. LLMs aren't perfectly deterministic, and that run-to-run variance is the noise floor: a counterfactual difference smaller than the noise isn't evidence of bias, and one larger than it needs investigating.`,
    },
  ],

  evaluate: md`
| Eval | Method | Target |
|---|---|---|
| **Usefulness** | For 8 past roles: do recruiter-advanced candidates appear in the AI top 10%? | ≥ 85% |
| **Evidence validity** | % of quotes verified in the resume (automatic) + 50 manual checks of verdicts | ≥ 98% / ≥ 90% |
| **Consistency** | Same resume scored 3 times; score standard deviation | Small enough not to reorder the top decile |
| **Counterfactual fairness** | Name / pronoun / gap swaps | Mean difference ≈ 0, within the noise floor |
| **Group outcomes** | If demographic data is available (self-reported, held separately), compare selection rates per group (adverse-impact ratio) | Follow your jurisdiction's audit methodology |

> **Caution about "agreement with recruiters":** historical decisions may contain bias. Matching them perfectly isn't the goal. Treat agreement as a usefulness signal, and fairness tests as constraints.
`,

  operate: md`
- **Cost:** blinding + scoring ≈ 2 calls per resume, ≈ 6–10k tokens. 2,000 resumes per role costs tens of dollars, against days of recruiter time.
- **Batch:** applications arrive over days, so score them nightly with the Batches API.
- **Governance:** version every rubric, prompt and model, keep the counterfactual reports, notify candidates where the law requires it, and keep a human-review guarantee. Re-run the fairness suite on *every* model or prompt change.
- **Access:** recruiters see blinded evidence first and the full resume on click, so the first impression is evidence-based.
`,

  levelUp: md`
- **Evaluating your evaluator formally (kappa, calibration)?** [[proj:i07]].
- **Continuous monitoring of outcomes in production?** [[proj:a07]].
- **Governance across many AI use cases in a company?** [[proj:a04]] and [[proj:a08]].
`,

  exercises: [
    "Write 5 more counterfactual variant types (e.g. age signal via 'graduated 1988', disability-related volunteer work). Does blinding neutralise them?",
    "Measure run-to-run noise: score 20 resumes 3 times each. How does that change your interpretation of the counterfactual results?",
    "Draft a one-page 'model card' for this system: purpose, data, evaluation, limitations, human oversight.",
    "What would you tell the client if counterfactual tests failed for one attribute? Write the email.",
  ],

  interview: md`
> "Resume screening is high-risk, so I designed for oversight from the start. The model drafts a rubric of job-related, observable criteria, which the recruiter approves. Resumes are blinded with regex plus a rewriting pass, then each criterion is scored independently with verbatim evidence that's verified in code. The total is computed in code with visible weights, and nobody is auto-rejected. Beyond usefulness (recruiter-advanced candidates in the top 10%), I evaluated consistency and counterfactual fairness, swapping names, pronouns and caregiving gaps against the run-to-run noise floor, and every model or prompt change re-runs that suite."
`,
});
