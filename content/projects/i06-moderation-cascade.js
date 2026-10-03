project({
  id: "i06",
  level: "intermediate",
  title: "Marketplace moderation with a cost-aware cascade",
  industry: "Online marketplace / trust & safety",
  client: "Kindred Market: a peer-to-peer marketplace with ≈400,000 new listings a day",
  time: "6–8 hours",
  summary: "Rules, then a fast model, then a strong model, then humans. Choose thresholds from eval data, simulate the blended cost and precision, and grow the gateway into a router.",
  newConcepts: ["Tiered cascades", "Operating points and thresholds", "Blended cost simulation", "Precision/recall per policy", "Gateway v2: routing + fallbacks"],
  patterns: ["model-cascade", "classify-route", "llm-gateway", "human-in-loop", "caching", "eval-harness", "batch-async"],
  skills: ["Unit economics at high volume", "Choosing thresholds with data", "Policy-as-prompt design", "Operating trade-offs (cost vs recall vs reviewer load)"],

  brief: md`
> "We get 400k listings a day. Some are prohibited (weapons, drugs, counterfeits), some are scams. Our 40 moderators review user reports, which means bad listings stay up for hours. We tried keyword filters and they're both leaky and noisy. We need something smarter, but at our volume cost matters."
> (Head of Trust & Safety, Kindred Market)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Policies? | 14 policy categories (weapons, drugs, adult, counterfeit, animals, scams, hate symbols, ...) with written guidelines | Policy text = cached context |
| Volume and peaks? | 400k/day ≈ 5/s average, 20/s peak | Throughput and rate limits matter; batching helps |
| Latency? | Listing should be checked before or within minutes of going live | Near-real-time queue, not the 24 h Batches API |
| Budget? | "Under $1,500/day all-in" | **≈$0.004 per listing**: strong model on everything won't fit |
| Error costs? | Missed scam/weapon = harm + regulatory risk; false removal = angry seller, appeal workload | **Per-policy** thresholds: strict on weapons, lenient on "low quality photo" |
| Moderator capacity? | 40 people ≈ 12,000 reviews/day | Human tier volume cap! |
| Labels? | 2 years of moderator decisions (≈1.5M) | Rich eval and threshold-setting data |

**Success:** recall ≥ 95% on high-severity policies, false-removal rate < 0.5% of listings, human queue ≤ 10k/day, cost ≤ $1,500/day.
`,

  frame: md`
**Shape:** *Classify* at extreme volume with asymmetric costs, the textbook case for a **cascade** ([[p:model-cascade]]):

~~~text
 Tier 0  rules/hashes      free, exact        known bad images, banned keywords, price anomalies
 Tier 1  fast model        ≈$0.0006/listing   most listings stop here (clearly fine / clearly bad)
 Tier 2  strong model      ≈$0.01/listing     the uncertain ≈10%
 Tier 3  human             ≈$0.40/listing     the still-uncertain or high-severity ≈2%
~~~

**The thresholds are the product.** Where you set "confident enough to stop at tier 1" decides cost, recall and reviewer load *simultaneously*. You don't guess them: you compute them on labelled data ([[f:evaluation-mindset]]).

**Baseline to beat (2026 advice):** before building a cascade, measure the *strong model at low effort* on everything. If it fits the budget, one model is simpler, with no threshold maintenance and one cache namespace. At this client's budget it doesn't fit, so the cascade earns its complexity. Write that comparison down. It's the justification for the design.
`,

  design: md`
~~~text
 listing created ──▶ queue (Kafka/SQS) ──▶ worker pool
                                             │
                     Tier 0 rules ──hit──▶ action (block/flag) ───────────────┐
                        │ miss                                                │
                     Tier 1: gateway.parse(tier="fast")                       │
                        │  per-policy scores + "uncertain" flag               │
                        ├── all clear (max score < τ_clear) ──▶ publish       │
                        ├── confident violation (score > τ_block[p]) ──▶ block + notify seller (appealable)
                        └── in between ──▶ Tier 2: gateway.parse(tier="smart", detailed policy)
                                              ├── clear ──▶ publish
                                              ├── violation, low severity ──▶ block (appealable)
                                              └── high severity or still unsure ──▶ Tier 3 human queue
 All decisions logged → moderator labels + appeals → threshold re-tuning weekly
~~~
`,

  tree: txt`
moderation/
├── llm.py              # gateway v2: tiers, fallbacks, per-tier metrics
├── policies/           # one markdown file per policy, versioned
├── rules.py            # tier 0
├── schema.py
├── cascade.py          # the routing logic with thresholds
├── thresholds.yaml     # chosen operating points (from simulate.py)
└── evals/
    ├── score_tiers.py  # run tier 1 and tier 2 on a labelled sample, store scores
    └── simulate.py     # sweep thresholds → cost, recall, precision, human load
`,

  build: [
    {
      file: "llm.py (v2: routing and fallbacks)",
      patterns: ["llm-gateway"],
      note: md`The gateway grows again. **Tiers** are named routes (~fast~, ~smart~) with their own model, effort and token limits. **Fallback**: if a tier is rate-limited or erroring, try the next route instead of failing the listing. **Metrics** per tier feed the cost dashboard.`,
      code: py`
import time
from collections import Counter

import anthropic

_client = anthropic.Anthropic(max_retries=2)
ROUTES = {
    "fast":  {"model": "claude-haiku-4-5", "max_tokens": 400},
    "smart": {"model": "claude-opus-5-5", "max_tokens": 1200},
}
FALLBACK = {"fast": "smart", "smart": None}       # escalate on failure rather than drop
STATS = Counter()


def parse(system, user, schema, *, tier="smart", **kw):
    route = ROUTES[tier]
    t0 = time.perf_counter()
    try:
        resp = _client.messages.parse(model=route["model"], max_tokens=kw.get("max_tokens", route["max_tokens"]),
                                      system=system, messages=[{"role": "user", "content": user}],
                                      output_format=schema)
    except (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError):
        STATS[f"{tier}.fallback"] += 1
        if FALLBACK[tier] is None:
            raise
        return parse(system, user, schema, tier=FALLBACK[tier], **kw)
    STATS[f"{tier}.calls"] += 1
    STATS[f"{tier}.in_tokens"] += resp.usage.input_tokens
    STATS[f"{tier}.cache_read"] += resp.usage.cache_read_input_tokens or 0
    STATS[f"{tier}.out_tokens"] += resp.usage.output_tokens
    STATS[f"{tier}.ms"] += int((time.perf_counter() - t0) * 1000)
    return resp.parsed_output
`,
    },
    {
      file: "schema.py",
      patterns: ["structured-output"],
      note: md`Per-policy scores rather than one label: a listing can be both a counterfeit and a scam. Scores are the model's estimate, and **thresholds calibrated on data** turn them into decisions.`,
      code: py`
from typing import Literal

from pydantic import BaseModel, Field

Policy = Literal["weapons", "drugs", "adult", "counterfeit", "animals", "scam", "hate", "recalled",
                 "alcohol_tobacco", "personal_data", "stolen_goods", "medical", "gambling", "other"]


class PolicyScore(BaseModel):
    policy: Policy
    score: float = Field(ge=0, le=1, description="Probability the listing violates this policy")
    evidence: str


class Assessment(BaseModel):
    violations: list[PolicyScore] = Field(description="Only policies with score >= 0.05")
    uncertain: bool = Field(description="True if key information is missing or the case is genuinely borderline")
`,
    },
    {
      file: "rules.py",
      note: md`**Tier 0** is boring and essential: exact matches on known-bad image hashes, banned phrases, and price anomalies ("iPhone 17 Pro, $40"). Free, instant and explainable.`,
      code: py`
import re

BANNED = [(re.compile(r"\b(ghost gun|glock switch|auto sear)\b", re.I), "weapons"),
          (re.compile(r"\b(oxy(contin)?|fentanyl|xanax bars)\b", re.I), "drugs")]


def tier0(listing, bad_hashes: set[str], price_floor: dict[str, float]) -> tuple[str, str] | None:
    if any(h in bad_hashes for h in listing.image_phashes):
        return "block", "known prohibited image"
    text = f"{listing.title} {listing.description}"
    for pat, policy in BANNED:
        if pat.search(text):
            return "human", f"banned phrase ({policy})"          # phrases can be benign: human checks
    floor = price_floor.get(listing.category)
    if floor and listing.price < 0.2 * floor and listing.brand_flagged:
        return "tier2", "price anomaly on high-counterfeit brand"
    return None
`,
    },
    {
      file: "cascade.py",
      patterns: ["model-cascade", "classify-route", "human-in-loop", "caching"],
      note: md`The routing logic, with thresholds loaded from a file produced by the simulation. Policy text is the **stable, cached** system prompt. Tier 2 gets the *detailed* guidelines, while tier 1 gets a compact version.`,
      code: py`
import yaml

import llm
from rules import tier0
from schema import Assessment

T = yaml.safe_load(open("thresholds.yaml"))
# thresholds.yaml (output of simulate.py):
#   clear: 0.08                                  # tier1 max score below → publish
#   block: {weapons: 0.97, drugs: 0.95, scam: 0.9, default: 0.93}
#   tier2_block: {default: 0.8}
#   human_always: [weapons, drugs, hate]         # high severity: human confirms tier-2 blocks
COMPACT = open("policies/_compact.md").read()     # ≈1.5k tokens
DETAILED = "\n\n".join(open(f"policies/{p}.md").read() for p in T["policy_files"])   # ≈12k tokens, cached


def render(l) -> str:
    return (f"<listing category='{l.category}' price='{l.price}'>\n<title>{l.title}</title>\n"
            f"<description>{l.description[:3000]}</description>\n</listing>")


def decide(listing, ctx) -> dict:
    r0 = tier0(listing, ctx.bad_hashes, ctx.price_floor)
    if r0 and r0[0] in ("block", "human"):
        return {"action": r0[0], "tier": 0, "reason": r0[1]}

    if not r0:                                                    # tier 1
        a1 = llm.parse(COMPACT, render(listing), Assessment, tier="fast")
        top = max(a1.violations, key=lambda v: v.score, default=None)
        if top is None or (top.score < T["clear"] and not a1.uncertain):
            return {"action": "publish", "tier": 1}
        if top.score >= T["block"].get(top.policy, T["block"]["default"]) and top.policy not in T["human_always"]:
            return {"action": "block", "tier": 1, "policy": top.policy, "evidence": top.evidence}

    a2 = llm.parse(DETAILED, render(listing), Assessment, tier="smart")   # tier 2
    top = max(a2.violations, key=lambda v: v.score, default=None)
    if top is None or top.score < T["clear"]:
        return {"action": "publish", "tier": 2}
    if top.policy in T["human_always"] or a2.uncertain or top.score < T["tier2_block"]["default"]:
        return {"action": "human", "tier": 2, "policy": top.policy, "evidence": top.evidence}
    return {"action": "block", "tier": 2, "policy": top.policy, "evidence": top.evidence}
`,
    },
    {
      file: "evals/simulate.py",
      patterns: ["eval-harness"],
      note: md`**The most important file.** Run tier 1 and tier 2 *once* on a labelled sample (≈5,000 listings, oversampling violations), store the scores, then sweep thresholds **offline** to see cost, recall, precision and human load for each combination. Choosing operating points becomes a business conversation backed by a table, not a guess.`,
      code: py`
import itertools
import json

COST = {"t1": 0.0006, "t2": 0.010, "human": 0.40}     # $ per listing, measured from gateway STATS
DAILY = 400_000


def simulate(rows, clear, block, t2_block, human_always=("weapons", "drugs", "hate")):
    """rows: [{label: policy|None, t1: {policy: score}, t1_uncertain, t2: {...}, t2_uncertain, weight}]"""
    cost = tp = fp = fn = human = 0.0
    for r in rows:
        w = r["weight"]                                    # undo oversampling
        cost += COST["t1"] * w
        p1, s1 = max(r["t1"].items(), key=lambda x: x[1], default=(None, 0))
        if s1 < clear and not r["t1_uncertain"]:
            decision = None
        elif s1 >= block and p1 not in human_always:
            decision = p1
        else:
            cost += COST["t2"] * w
            p2, s2 = max(r["t2"].items(), key=lambda x: x[1], default=(None, 0))
            if s2 < clear:
                decision = None
            elif p2 in human_always or r["t2_uncertain"] or s2 < t2_block:
                cost += COST["human"] * w
                human += w
                decision = r["label"]                      # assume humans are right (check that!)
            else:
                decision = p2
        if r["label"] and decision == r["label"]:
            tp += w
        elif decision and decision != r["label"]:
            fp += w
        elif r["label"] and not decision:
            fn += w
    n = sum(r["weight"] for r in rows)
    return {"cost_per_day": round(cost / n * DAILY), "recall": round(tp / (tp + fn), 3),
            "false_removal_rate": round(fp / n, 4), "human_per_day": round(human / n * DAILY)}


if __name__ == "__main__":
    rows = [json.loads(l) for l in open("evals/scored_sample.jsonl")]
    for clear, block, t2b in itertools.product([0.03, 0.08, 0.15], [0.9, 0.95, 0.98], [0.7, 0.8, 0.9]):
        print(clear, block, t2b, simulate(rows, clear, block, t2b))
`,
    },
  ],

  evaluate: md`
## Simulation output (illustrative)
| clear | block | t2_block | cost/day | recall (high-sev) | false removal | human/day |
|---|---|---|---|---|---|---|
| 0.03 | 0.98 | 0.9 | $1,980 | 0.98 | 0.2% | 14,800 |
| **0.08** | **0.95** | **0.8** | **$1,310** | **0.96** | **0.4%** | **9,200** |
| 0.15 | 0.90 | 0.7 | $820 | 0.91 | 0.9% | 5,100 |

The middle row meets every constraint, so that's the proposal. The **table** is what you take to the Head of T&S: they can choose a different trade-off knowingly.

## Also report
- **Per-policy** recall and precision (weapons at 0.96 overall can hide "3D-printed parts" at 0.7).
- **Single-model baseline:** strong model at low effort on everything, with its cost and recall. That's the honest justification for the cascade.
- **Moderator agreement:** two moderators on 500 items. Humans aren't perfect either, so that's your ceiling.
`,

  operate: md`
- **Weekly re-tuning:** re-score a fresh labelled sample (moderator decisions + appeals), re-run the simulation, and adjust thresholds with a change log.
- **Adversarial drift:** scammers adapt ("gl0ck", emojis, images with text). Track tier-0 hit rates and new-pattern clusters from human decisions ([[p:feedback-flywheel]]).
- **Appeals** are labelled false positives. Review them as eval cases.
- **Capacity guard:** if the human queue exceeds capacity, the system must degrade *safely* (e.g. hold high-severity listings unpublished, publish low-severity ones with post-review) rather than silently auto-approving.
- **Caching:** the detailed policy prompt (≈12k tokens) is identical for every tier-2 call, so cache reads make tier 2 far cheaper than its raw token count suggests.
`,

  levelUp: md`
- **Images as primary evidence?** Vision tiers, perceptual hashing at tier 0, and image-specific evals.
- **A central platform where many teams' cascades share budgets and policies?** [[proj:a04]].
- **Continuous quality monitoring and flywheel at scale?** [[proj:a07]].
`,

  exercises: [
    "Build the single-model baseline row in the simulation (strong model, low effort, every listing). At what daily volume does the cascade stop being worth it?",
    "Add per-policy block thresholds to ~simulate()~ and find the cheapest configuration that keeps weapons recall ≥ 0.98.",
    "Implement the capacity guard: when the human queue is over capacity, what does ~decide()~ return for each severity?",
    "Measure how often tier 1 falls back to tier 2 because of rate limits during a load test. What does that do to cost?",
  ],

  interview: md`
> "Kindred had 400k listings a day and a budget near half a cent per listing, so the strong model on everything wasn't viable, and I documented that baseline. I built a four-tier cascade: rules and image hashes, a fast model with per-policy scores, a strong model with detailed cached policy text for the uncertain ≈10%, and moderators for high-severity or unresolved cases. The thresholds were the product decision. I scored a labelled, oversampled sample once with both tiers, then swept thresholds offline to produce a table of cost, high-severity recall, false-removal rate and human load. The chosen point met all four constraints. The gateway grew tier routing, escalation on rate-limit errors and per-tier cost metrics, and thresholds get re-tuned weekly from moderator decisions and appeals."
`,
});
