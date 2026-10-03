project({
  id: "b08",
  level: "beginner",
  title: "Property listing writer with compliance loop",
  industry: "Real estate",
  client: "Redwood Realty: 140 agents, ≈300 new listings a month",
  time: "3–4 hours",
  summary: "Generate listing descriptions from structured facts, then check them for fair-housing compliance and factual faithfulness, revising until they pass.",
  newConcepts: ["Generate → critique → revise", "Faithfulness to facts", "Rubric scoring", "Pairwise preference evals"],
  patterns: ["evaluator-optimizer", "guardrails", "llm-judge", "prompt-as-code", "structured-output", "eval-harness"],
  skills: ["Constraint-heavy generation", "Separating rule checks from judgement checks", "Evaluating creative output"],

  brief: md`
> "Our agents write listing descriptions at 11pm. They're inconsistent, sometimes exaggerated, and last year we got a complaint because a description said 'perfect for young families.' We want great descriptions in our brand voice that never get us in trouble."
> (Broker of Record, Redwood Realty)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Inputs? | Structured listing data from the MLS form: beds, baths, sqft, features, upgrades, lot, HOA, school district, agent's bullet notes | Facts schema |
| Legal risk? | **Fair housing**: no language that indicates preference based on protected classes (familial status, religion, disability, race, etc.), e.g. "perfect for families", "walking distance to church", "no wheelchairs" | Rule list + judgement check |
| Accuracy risk? | Inventing features ("renovated kitchen" when it isn't) = misrepresentation | Every claim must come from the facts |
| Format? | MLS remarks field max 1,000 characters; a separate 280-char social version | Hard limits checked in code |
| Brand voice? | Warm, specific, no clichés ("must see!", "won't last!") | Style guide + examples |

**Success:** zero compliance violations, zero invented features, and agents prefer the AI draft over their own ≥ 60% of the time in blind tests.
`,

  frame: md`
**Shape:** *Generate* under many constraints.

One prompt with 30 rules works most of the time. "Most of the time" isn't good enough when one bad listing creates legal exposure. So we use **generate → critique → revise** ([[p:evaluator-optimizer]]):

1. **Draft** from the facts.
2. **Check**: deterministic rules first (length, banned phrases), then a model **critic** for fair-housing judgement and faithfulness (every claim must trace to a fact).
3. **Revise** with the specific violations. Stop after 2 rounds and send to a human with the issues highlighted.

The critic is a *different prompt with a different job*. Generators are bad at checking themselves in the same breath, while a separate, narrow checking pass is much better at it.
`,

  design: md`
~~~text
 MLS facts (structured) ──▶ write(facts, style guide)  ──▶ draft
                                                             │
                     ┌───────────────────────────────────────┘
                     ▼
            rule_checks(draft)            (code: length, banned phrases, clichés)
            critic(draft, facts)          (model: fair housing + unsupported claims)
                     │
            issues? ─┴─ none ──▶ agent review UI ──▶ MLS
               │yes (round < 2)
               ▼
            revise(draft, issues, facts) ──▶ back to checks
               │round == 2 and still issues
               ▼
            agent review with issues highlighted
~~~
`,

  tree: txt`
listing-writer/
├── schema.py        # ListingFacts, Critique
├── prompts/
│   ├── writer_v4.md      # style guide + 3 exemplary listings
│   ├── critic_v2.md
│   └── reviser_v1.md
├── rules.py         # deterministic checks
├── write.py         # the loop
└── evals/
    ├── rubric.py
    └── pairwise.py
`,

  build: [
    {
      file: "schema.py",
      patterns: ["structured-output"],
      code: py`
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ListingFacts(BaseModel):
    property_type: Literal["single_family", "condo", "townhouse", "multi_family", "land"]
    beds: int
    baths: float
    sqft: int
    year_built: Optional[int] = None
    lot_sqft: Optional[int] = None
    features: list[str]              # "south-facing backyard", "quartz counters (2024)"
    upgrades: list[str] = []
    neighborhood_facts: list[str] = []   # objective only: "0.3 mi to Caltrain station"
    hoa_monthly: Optional[int] = None
    agent_notes: str = ""


class Issue(BaseModel):
    kind: Literal["fair_housing", "unsupported_claim", "style"]
    quote: str = Field(description="Exact text from the draft")
    why: str
    fix: str


class Critique(BaseModel):
    issues: list[Issue]
`,
    },
    {
      file: "rules.py",
      patterns: ["guardrails"],
      note: md`The cheap, deterministic layer. It's not a substitute for judgement, since fair-housing violations are often contextual, but it catches the obvious ones for free and never has an off day.`,
      code: py`
import re

MAX_MLS_CHARS = 1000
BANNED = {
    r"\b(perfect|ideal|great) for (young )?(families|couples|singles|retirees|kids)\b": "familial status preference",
    r"\b(walking distance|close) to (church|synagogue|mosque|temple)\b": "religious reference",
    r"\b(exclusive|private) (community|neighborhood)\b": "exclusionary language",
    r"\bno (kids|children|wheelchairs)\b": "explicit exclusion",
    r"\b(master)\b": "use 'primary' (brokerage style policy)",
    r"\bsafe (neighborhood|area)\b": "subjective safety claim (steering risk)",
}
CLICHES = ["must see", "won't last", "priced to sell", "dream home", "nestled"]


def rule_checks(text: str) -> list[str]:
    issues = []
    if len(text) > MAX_MLS_CHARS:
        issues.append(f"style: {len(text)} chars exceeds MLS limit {MAX_MLS_CHARS}")
    for pat, why in BANNED.items():
        if (m := re.search(pat, text, re.I)):
            issues.append(f"fair_housing: '{m.group(0)}' ({why})")
    for c in CLICHES:
        if c in text.lower():
            issues.append(f"style: cliché '{c}'")
    return issues
`,
    },
    {
      file: "write.py",
      patterns: ["evaluator-optimizer", "llm-judge"],
      note: md`The loop. Notice the **critic receives the facts**, so it can catch unsupported claims ("renovated kitchen" isn't in the features list). Rounds are capped, and the final state is always *explicit*: either clean, or flagged for a human with the reasons.`,
      code: py`
from dataclasses import dataclass, field
from pathlib import Path

import llm
from rules import rule_checks
from schema import Critique, ListingFacts

P = Path(__file__).parent / "prompts"
WRITER, CRITIC, REVISER = ((P / f).read_text() for f in ("writer_v4.md", "critic_v2.md", "reviser_v1.md"))


@dataclass
class Result:
    text: str
    clean: bool
    rounds: int
    open_issues: list[str] = field(default_factory=list)


def check(text: str, facts_json: str) -> list[str]:
    issues = rule_checks(text)
    crit = llm.parse(CRITIC, f"<facts>{facts_json}</facts>\n<draft>{text}</draft>", Critique, tier="smart")
    issues += [f"{i.kind}: '{i.quote}' ({i.why}) → {i.fix}" for i in crit.issues]
    return issues


def write_listing(facts: ListingFacts, max_rounds: int = 2) -> Result:
    facts_json = facts.model_dump_json(indent=1)
    text = llm.complete(WRITER, f"<facts>{facts_json}</facts>", max_tokens=800)
    for rnd in range(max_rounds + 1):
        issues = check(text, facts_json)
        if not issues:
            return Result(text, True, rnd)
        if rnd == max_rounds:
            return Result(text, False, rnd, issues)
        text = llm.complete(REVISER, f"<facts>{facts_json}</facts>\n<draft>{text}</draft>\n"
                                     f"<issues>\n- " + "\n- ".join(issues) + "\n</issues>", max_tokens=800)
`,
    },
    {
      file: "prompts/critic_v2.md",
      lang: "markdown",
      note: md`The critic's prompt is **narrow** and asks for exact quotes. Narrow judges are more reliable than "rate this listing 1–10."`,
      code: txt`
You review a real-estate listing draft before publication. Report ONLY real problems.

1. fair_housing: any wording that states or implies a preference or limitation based on race,
   color, religion, sex, disability, familial status, national origin (and local protected classes),
   including describing the people who would or should live there, rather than the property.
   Describe the property, not the buyer.
2. unsupported_claim: any feature, condition, measurement, or neighborhood statement that does
   not appear in <facts>. "Updated kitchen" is unsupported if no kitchen update is listed.
   Reasonable descriptive language about listed facts is fine ("sun-filled" for "south-facing").
3. style: clichés or exaggerated superlatives ("stunning", "best in town").

Quote the exact text for each issue. If there are no issues, return an empty list.
`,
    },
    {
      file: "evals/pairwise.py",
      patterns: ["eval-harness", "llm-judge"],
      note: md`For creative output, **pairwise preference** ("which is better, A or B?") is more reliable than absolute scores. Randomise the order to cancel position bias. Use agents as the judges first, then check whether a model judge agrees with them.`,
      code: py`
import random
from typing import Literal

from pydantic import BaseModel

import llm


class Pref(BaseModel):
    reasoning: str
    winner: Literal["A", "B", "tie"]


JUDGE = """You compare two listing descriptions for the same property for a real-estate brokerage.
Criteria in order: factual accuracy to the facts, compliance, specificity, readability, brand voice
(warm, concrete, no clichés). Explain briefly, then pick a winner."""


def compare(facts: str, ours: str, theirs: str) -> str:
    flip = random.random() < 0.5
    a, b = (theirs, ours) if flip else (ours, theirs)
    p = llm.parse(JUDGE, f"<facts>{facts}</facts>\n<A>{a}</A>\n<B>{b}</B>", Pref)
    if p.winner == "tie":
        return "tie"
    ours_won = (p.winner == "B") if flip else (p.winner == "A")
    return "ours" if ours_won else "theirs"


def win_rate(rows: list[dict]) -> dict:
    results = [compare(r["facts"], r["ai"], r["human"]) for r in rows]
    n = len(results)
    return {k: round(results.count(k) / n, 3) for k in ("ours", "theirs", "tie")}
`,
    },
  ],

  evaluate: md`
| Eval | Data | Target |
|---|---|---|
| **Compliance red-team** | 30 fact sets with "tempting" agent notes ("great for a growing family!", "quiet Christian neighborhood") | 0 violations in final output |
| **Faithfulness** | 50 listings: a human checks every claim against the facts | 0 invented features |
| **Preference** | 50 listings: AI vs the agent's original, blind and order-randomised, judged by 3 agents | AI preferred ≥ 60% |
| **Judge agreement** | Same 50 pairs judged by the model judge | Agreement with the agent majority ≥ 80% before using the judge at scale |
| **Loop value** | % of drafts clean at round 0 / 1 / 2 | Tells you if round 2 is worth paying for |

> **Insight you'll likely see:** the critic catches unsupported claims the writer produced from *agent notes* ("probably the best views on the street"). The right fix is upstream: tell the writer that agent notes are hints, not facts. Fix causes, not just symptoms.
`,

  operate: md`
- **Cost:** writer + critic + (sometimes) reviser ≈ 3–5 calls per listing. 300 listings/month costs a few dollars. Quality matters far more than cost here.
- **Latency:** ≈10–20 s total. The agent clicks "generate" and waits, so show progress ("drafting… checking compliance…").
- **Audit:** store facts, every draft, and the issues found per round. If there's ever a complaint, you can show your diligence.
- **Policy updates:** the banned list and critic prompt are reviewed by the broker of record quarterly, and every change re-runs the red-team set.
`,

  levelUp: md`
- **Photos as input** ("describe the kitchen from the photos")? That needs vision, plus a stricter faithfulness check: the model may hallucinate from images.
- **Thousands of listings for a portal, in 5 languages?** Batch generation ([[p:batch-async]]) and per-language critics.
- **Measuring quality continuously in production?** [[proj:a07]].
`,

  exercises: [
    "Add 10 more red-team fact sets. Which ones does the regex layer catch, and which need the critic?",
    "Measure how often round 2 changes the outcome. Would you remove it?",
    "Write a 280-char social media variant with its own constraints. Can you reuse the same loop with a different rule set?",
    "Run the pairwise judge with and without order randomisation. How big is the position bias?",
  ],

  interview: md`
> "For a brokerage's listing descriptions, the risks were fair-housing language and invented features. I used a generate–critique–revise loop: a writer drafts from structured MLS facts, a deterministic rule layer checks length, banned phrases and clichés, and a separate narrow critic prompt flags fair-housing issues and any claim not traceable to the facts, with exact quotes. Violations go back for at most two revisions, then to a human with the issues highlighted. I evaluated with a compliance red-team set (target zero), human faithfulness checks, and blind order-randomised pairwise preference against the agents' own descriptions, and calibrated the model judge against agent votes before using it at scale."
`,
});
