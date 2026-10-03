project({
  id: "a08",
  level: "advanced",
  title: "Capstone: an AI roadmap for a whole company",
  industry: "Home services (HVAC, plumbing, electrical)",
  client: "Cedar & Pine Home Services: 900 employees, 420 technicians, 2 call centres, 14 branches",
  time: "3 days of study",
  summary: "From 'we want to use AI' to a prioritised roadmap: value-chain mapping, stakeholder interviews, opportunity scoring, ROI modelling with uncertainty, a reference architecture reusing every pattern in this lab, governance, and the proposal.",
  newConcepts: ["Value-chain opportunity mapping", "Opportunity scoring (value × feasibility ÷ risk)", "ROI with ranges, not points", "Platform-first sequencing", "Change management and adoption", "Writing the proposal"],
  patterns: ["classify-route", "rag", "parse-then-act", "human-in-loop", "llm-gateway", "eval-harness", "feedback-flywheel", "workflow-state-machine", "llm-judge", "structured-output"],
  skills: ["Business analysis for AI", "Prioritisation and sequencing", "Executive communication", "Seeing the same patterns across a whole company"],

  brief: md`
> "Our board keeps asking about our AI strategy. We don't have one. We're a home services company: we answer phones, send technicians, fix furnaces and send invoices. Where would AI actually help, what should we do first, and what will it cost and return? I don't want a chatbot for the sake of it."
> (CEO, Cedar & Pine Home Services)
`,

  discovery: md`
## Step 1: map the value chain
~~~text
 ATTRACT ──▶ BOOK ──▶ DISPATCH ──▶ DIAGNOSE & FIX ──▶ INVOICE & COLLECT ──▶ RETAIN ──▶ (support/complaints)
 marketing   call      scheduling   technicians        billing, financing     memberships   call centre
 reviews     centre    routing      parts, manuals     warranty claims        reminders     QA
~~~

## Step 2: interview stakeholders (30 minutes each, same questions every time)
"Walk me through a normal day. Where do you wait, search, re-type or guess? What do you do 50 times a day? What mistakes are expensive?"

| Area | What we heard | Numbers collected |
|---|---|---|
| Call centre | "Half of calls are 'when is my tech coming?' or rescheduling. Agents type notes while customers talk." | 1,900 calls/day; AHT 6.5 min; 22% abandonment at peak |
| Dispatch | "Matching skills, parts and geography is in the dispatchers' heads." | 1,100 jobs/day; 9% repeat visits ("second truck roll") |
| Technicians | "Finding the right manual or error code for a 15-year-old furnace takes forever. Junior techs call senior techs." | ≈35 min/day searching; 9% repeat visits partly from misdiagnosis |
| Billing | "Warranty claims to manufacturers are paperwork hell. We give up on small ones." | ≈$1.1M/yr unclaimed warranty parts |
| Marketing | "We reply to Google reviews when we remember." | 2,400 reviews/yr; response rate 30% |
| QA | "We listen to 2% of calls." | — |
| Leadership | "We don't know why customers churn from memberships." | 18% annual churn |

## Step 3: check the foundations
Data access (CRM, field-service system and telephony all have APIs), call recordings (yes, with consent notices), manuals (≈6,000 PDFs from manufacturers), IT capacity (small team, so **buy where possible**), and policy constraints (consumer privacy, call-recording laws, payment data).
`,

  frame: md`
## Turn interviews into candidate use cases, each mapped to a pattern you already know
| # | Candidate | Shape | Patterns (projects) |
|---|---|---|---|
| 1 | Call summarisation + CRM notes after every call | Extract | [[p:structured-output]] ([[proj:b06]]) |
| 2 | SMS/voice self-service: "when is my tech coming", reschedule | Classify + act | [[p:parse-then-act]] ([[proj:b04]]) |
| 3 | Technician assistant: manuals + error codes + past jobs Q&A | Retrieve + answer | [[p:rag]] ([[proj:b05]], [[proj:i01]]) |
| 4 | Warranty claim packet assembly | Extract + workflow | [[p:workflow-state-machine]] ([[proj:b02]], [[proj:i08]]) |
| 5 | Review response drafts | Generate + approve | [[p:human-in-loop]] ([[proj:b07]], [[proj:b08]]) |
| 6 | 100% call QA scoring | Judge | [[p:llm-judge]] ([[proj:i07]]) |
| 7 | Dispatch optimisation | **Optimisation, mostly not an LLM problem** | OR solvers + ML; the LLM only explains |
| 8 | Membership churn insights | Aggregate + narrate | [[p:map-reduce]] ([[proj:b03]]) + classic analytics |
| 9 | "AI chatbot on the website" (the board's idea) | Converse | [[p:memory]] ([[proj:i09]]): only after 2 and 3 exist to power it |

> **The capstone lesson:** nine "different" AI initiatives turn out to be combinations of about ten patterns from this lab. A company's AI roadmap is mostly a *sequencing* problem.

Note #7. A senior engineer says out loud: **"This one isn't an LLM problem."** Route optimisation is a solved field (vehicle routing solvers). Recommending the right non-LLM tool builds more trust than forcing AI into it.
`,

  design: md`
## Reference architecture: shared platform first, then use cases on top
~~~text
             USE CASES  (each = prompts + schemas + evals + UI)
   ┌──────────┬───────────┬────────────┬──────────┬───────────┬──────────┐
   │ call     │ self-     │ technician │ warranty │ review    │ call QA  │
   │ summaries│ service   │ assistant  │ packets  │ responses │ scoring  │
   └────┬─────┴─────┬─────┴──────┬─────┴────┬─────┴─────┬─────┴────┬─────┘
        └───────────┴────────────┴──────────┴───────────┴──────────┘
                                   │
   SHARED PLATFORM ────────────────┼──────────────────────────────────────────
   LLM gateway (A04-lite): auth, routing, PII redaction, cost metering, logging
   Document index (I01): manuals, past job notes, policies (+ permissions)
   Integration layer: CRM, field-service, telephony APIs (as MCP servers, I03)
   Eval & feedback service (I10, A07): golden sets, CI gates, dashboards
   Workflow engine (A02) for multi-day processes (warranty)
~~~
Building the platform pieces as part of the **first two use cases**, rather than as a separate six-month project, gets value early *and* makes use cases 3–6 cheaper.
`,

  tree: txt`
strategy-engagement/
├── interviews/              # notes per stakeholder (template-driven)
├── opportunities.yaml       # candidates with estimates and ranges
├── score.py                 # prioritisation
├── roi.py                   # ROI with uncertainty (simple Monte Carlo)
├── roadmap.md               # phases, milestones, owners
├── architecture.md          # the reference architecture above
├── governance.md            # policy, risk tiers, review process
└── proposal.md              # the 3-page document for the CEO and board
`,

  build: [
    {
      file: "opportunities.yaml (excerpt)",
      lang: "yaml",
      note: md`Every estimate is a **range** (low, likely, high), with its **source** (an interview, a system report, an assumption). Executives trust ranges with sources more than precise-looking numbers.`,
      code: txt`
- id: call_summaries
  description: Auto-generate CRM call notes and dispositions after every call; agent reviews in 10 s.
  volume_per_year: 480000                 # 1,900/day × 250 days (telephony report)
  minutes_saved_per_unit: [0.8, 1.2, 1.8] # interviews + 1-week time study
  cost_per_minute: 0.65                   # loaded agent cost (finance)
  automation_share: [0.7, 0.85, 0.95]
  ai_cost_per_unit: [0.01, 0.02, 0.04]
  build_cost: [40000, 60000, 90000]
  run_cost_per_year: [15000, 25000, 40000]
  verifiability: high                     # agent sees and edits every note
  risk: low
  integration_effort: low                 # telephony has transcripts + CRM API
  strategic_platform_value: high          # builds gateway + eval tooling
- id: technician_assistant
  description: Mobile Q&A over manuals, error codes, and past job notes for the same model/serial.
  volume_per_year: 275000                 # jobs
  minutes_saved_per_unit: [3, 6, 10]
  cost_per_minute: 1.10
  automation_share: [0.3, 0.5, 0.7]       # share of jobs where it's used
  second_truck_roll_reduction: [0.05, 0.12, 0.2]   # relative reduction of the 9% repeat-visit rate
  cost_per_repeat_visit: 180
  build_cost: [120000, 180000, 260000]
  run_cost_per_year: [40000, 60000, 90000]
  verifiability: medium
  risk: medium                            # safety-relevant advice (gas, electrical): strict scope + citations
  integration_effort: medium              # 6,000 PDFs, many scanned
  strategic_platform_value: high          # builds the document index
- id: dispatch_optimisation_llm
  description: Use an LLM to assign jobs to technicians.
  note: Not recommended: use a routing/optimisation solver; LLM at most explains assignments.
  verifiability: low
  risk: high
`,
    },
    {
      file: "score.py",
      note: md`A transparent scoring model. Nobody should accept a black-box priority list. The formula is the one from [[f:reading-a-company]], and its weights are **agreed with the leadership team** in a workshop. Running it live with them is a powerful alignment tool.`,
      code: py`
import yaml

LEVEL = {"low": 1, "medium": 2, "high": 3}


def likely(v):
    return v[1] if isinstance(v, list) else v


def annual_value(o: dict) -> float:
    v = o.get("volume_per_year", 0) * likely(o.get("minutes_saved_per_unit", [0, 0, 0])) \
        * o.get("cost_per_minute", 0) * likely(o.get("automation_share", [0, 0, 0]))
    if "second_truck_roll_reduction" in o:
        v += o["volume_per_year"] * 0.09 * likely(o["second_truck_roll_reduction"]) * o["cost_per_repeat_visit"]
    return v


def score(o: dict, weights=None) -> float:
    w = weights or {"value": 1.0, "verifiability": 1.0, "platform": 0.5, "risk": 1.0, "effort": 0.7}
    value = annual_value(o) / 100_000                     # in units of $100k/yr
    num = (value ** w["value"]) * (LEVEL[o.get("verifiability", "low")] ** w["verifiability"]) \
          * (1 + w["platform"] * (LEVEL[o.get("strategic_platform_value", "low")] - 1))
    den = (LEVEL[o.get("risk", "high")] ** w["risk"]) * (LEVEL[o.get("integration_effort", "high")] ** w["effort"])
    return round(num / den, 2)


if __name__ == "__main__":
    opps = yaml.safe_load(open("opportunities.yaml"))
    for o in sorted(opps, key=score, reverse=True):
        print(f"{o['id']:28s} score={score(o):6.2f}  value≈\${annual_value(o):,.0f}/yr  risk={o.get('risk')}")
`,
    },
    {
      file: "roi.py",
      note: md`**ROI with uncertainty.** Sample each ranged input from a triangular distribution and report P10/P50/P90 payback. The message to the CEO becomes "90% likely to pay back within 9 months" rather than one optimistic number. Also run a **sensitivity** check: which assumption moves the result most? That's what to measure first in the pilot.`,
      code: py`
import random
import statistics

import yaml


def tri(v):
    return random.triangular(v[0], v[2], v[1]) if isinstance(v, list) else v


def simulate(o: dict, n: int = 5000) -> dict:
    paybacks, npv3 = [], []
    for _ in range(n):
        value = o.get("volume_per_year", 0) * tri(o.get("minutes_saved_per_unit", [0, 0, 0])) \
                * o.get("cost_per_minute", 0) * tri(o.get("automation_share", [0, 0, 0]))
        if "second_truck_roll_reduction" in o:
            value += o["volume_per_year"] * 0.09 * tri(o["second_truck_roll_reduction"]) * o["cost_per_repeat_visit"]
        ai = o.get("volume_per_year", 0) * tri(o.get("ai_cost_per_unit", [0, 0, 0]))
        run = tri(o.get("run_cost_per_year", [0, 0, 0])) + ai
        build = tri(o.get("build_cost", [0, 0, 0]))
        net = value - run
        paybacks.append(build / net * 12 if net > 0 else float("inf"))
        npv3.append(sum(net / (1.1 ** y) for y in (1, 2, 3)) - build)
    q = lambda xs, p: sorted(xs)[int(p * (len(xs) - 1))]
    return {"payback_months": {"p10": round(q(paybacks, .1), 1), "p50": round(q(paybacks, .5), 1), "p90": round(q(paybacks, .9), 1)},
            "npv_3yr": {"p10": round(q(npv3, .1)), "p50": round(q(npv3, .5)), "p90": round(q(npv3, .9))},
            "prob_negative_npv": round(sum(x < 0 for x in npv3) / n, 3)}


def sensitivity(o: dict, key: str) -> float:
    lo, hi = dict(o), dict(o)
    lo[key], hi[key] = [o[key][0]] * 3, [o[key][2]] * 3
    return statistics.median([simulate(hi, 500)["npv_3yr"]["p50"] - simulate(lo, 500)["npv_3yr"]["p50"]])


if __name__ == "__main__":
    for o in yaml.safe_load(open("opportunities.yaml")):
        if "build_cost" in o:
            print(o["id"], simulate(o))
            ranged = [k for k, v in o.items() if isinstance(v, list) and len(v) == 3]
            print("  most sensitive:", sorted(ranged, key=lambda k: -abs(sensitivity(o, k)))[:2])
`,
    },
    {
      file: "roadmap.md",
      lang: "markdown",
      note: md`Sequencing logic: **quick wins that build platform pieces** first, **bigger bets** once evals, logging and trust exist, and **autonomy** last and earned per use case with data.`,
      code: txt`
# Cedar & Pine AI roadmap (18 months)

## Phase 1: Foundations through quick wins (months 0-4)
- Call summaries → CRM (pilot 1 call centre, 40 agents; then all)       → builds: gateway, logging, eval CI
- Review response drafts with manager approval                          → builds: approval UX pattern
- Success gates: agent edit rate < 20%; AHT -45s; review response rate 30% → 90%

## Phase 2: Knowledge + workflows (months 4-10)
- Technician assistant (one branch pilot: 30 techs, HVAC only)         → builds: document index, citations
  - Scope: manuals/error codes/past jobs. Out of scope: gas/electrical safety procedures beyond citing manuals.
- Warranty claim packets (top 5 manufacturers)                          → builds: workflow engine
- Call QA scoring (100% of calls, calibrated vs QA team)
- Success gates: repeat-visit rate -1pt in pilot branch; warranty recovery +$300k/yr run-rate; QA kappa >= QA-team baseline

## Phase 3: Customer-facing automation (months 10-18)
- SMS/voice self-service for ETA + reschedule (parse-then-act, no payments)
- Website assistant powered by the same tools + index
- Success gates: containment >= 40% with CSAT not lower than agents; zero wrong-appointment changes

## Not doing (and why)
- LLM-based dispatch: use a routing solver (separate optimisation project).
- Autonomous refunds/discounts: revisit after 6 months of approval data.
`,
    },
    {
      file: "governance.md (excerpt)",
      lang: "markdown",
      patterns: ["human-in-loop", "eval-harness", "feedback-flywheel"],
      note: md`**Lightweight governance** sized to a mid-sized company: risk tiers, who approves what, and the minimum evidence per tier. Heavy enough to be safe, light enough that teams don't route around it.`,
      code: txt`
| Tier | Examples | Requirements before launch | Ongoing |
|------|----------|----------------------------|---------|
| 1 internal assist, human edits everything | call summaries, review drafts | eval set >= 100 items; owner named | monthly metrics review |
| 2 internal decisions support | technician assistant, warranty packets, QA scores | + calibrated evals; red-team for scope; pilot with control group | weekly flywheel; quarterly re-calibration |
| 3 customer-facing or automated actions | self-service rescheduling, website assistant | + security review; injection tests; kill switch; escalation path | daily dashboard; incident runbook |

Principles: AI drafts, humans decide until data earns autonomy · every use case has an owner, an eval and a kill switch ·
customer data goes only through the gateway · vendors under enterprise terms (no training on our data, retention limits).
`,
    },
  ],

  evaluate: md`
For a strategy engagement, **"evaluate" means defining how the roadmap itself will be judged**, and building that into every phase:

| Level | Question | Measure |
|---|---|---|
| Use case | Does it work? | The eval targets from each use case's own project (accuracy, edit rate, recall, kappa…) |
| Business | Does it pay? | Pilot vs control: AHT, repeat-visit rate, warranty recovery, review response rate, CSAT |
| Adoption | Do people use it? | Weekly active users among target staff; qualitative interviews at week 2 and week 8 |
| Platform | Is the next use case cheaper? | Time and cost to launch use case N vs N−1 |
| Risk | Are we safe? | Incidents, red-team results, governance compliance |

**Kill criteria** are as important as success criteria: "If the technician pilot doesn't reduce repeat visits by ≥ 0.5 points in 3 months, we stop or re-scope." Writing kill criteria up front is what makes leadership trust the plan.
`,

  operate: md`
## Change management (where most AI programmes actually fail)
- **Co-design with frontline champions:** two call-centre agents and two senior technicians are part of the pilot team and help write the eval sets.
- **Position it as removing drudgery, not jobs**, and mean it. Measure time saved and show where it went (more calls answered at peak, fewer second visits).
- **Train for verification:** "AI drafts, you check" only works if people know *what* to check.
- **Feedback buttons everywhere**, routed to the flywheel ([[proj:a07]]). Show staff that their feedback changed something within two weeks.

## The proposal (3 pages for the CEO and board)
1. **The opportunity in one table**: the top 6 use cases with P50 annual value, payback ranges and risk tier.
2. **What we'll do first and why**: phase 1, success gates and kill criteria.
3. **What it costs**: build and run ranges by phase, team needed (2–3 engineers + 1 product person + vendor support).
4. **How we'll stay safe**: the governance table.
5. **What we're deliberately not doing.**
`,

  levelUp: md`
You've reached the end of the lab. The level-up is now **your own company or industry**:
- Pick a business you know (an employer, a family business, a public company's annual report).
- Run the discovery template, map the value chain, and fill ~opportunities.yaml~.
- Pick the top use case and build it end to end with the patterns from the projects listed above.
- Write the 3-page proposal. That proposal plus one evaluated build is a stronger portfolio than ten tutorials.

Revisit [[f:the-loop]]: you've now used every stage at every scale, from one ticket to one company.
`,

  exercises: [
    "Run ~score.py~ with three different weight sets (risk-averse CFO, growth-focused CEO, IT-capacity-constrained CTO). Does the top 3 change? What does that tell you about the workshop?",
    "Add the 'website chatbot' opportunity with honest ranges. Where does it land, and how would you explain that to the board member who suggested it?",
    "Run ~roi.py~'s sensitivity analysis for the technician assistant. Design the pilot measurement for its most sensitive assumption.",
    "Write the 3-page proposal for a company you know. Ask someone non-technical to read it and summarise the plan back to you.",
  ],

  interview: md`
> "When a company says 'we want an AI strategy', I start with the value chain and short, identical interviews per function, collecting volumes, times and error costs. Here that produced nine candidates, which mapped onto about ten patterns: extraction, parse-then-act, RAG, workflows, judges, map-reduce. One, dispatch, I explicitly said wasn't an LLM problem. I scored opportunities with a transparent value × verifiability × platform-value ÷ risk × effort model whose weights leadership agreed on, and modelled ROI with ranges to give P10/P50/P90 payback plus the most sensitive assumption to measure in each pilot. The roadmap sequences quick wins that build shared platform pieces (gateway, evals, document index) before customer-facing automation, with tiered governance, explicit success gates and kill criteria for every phase."
`,
});
