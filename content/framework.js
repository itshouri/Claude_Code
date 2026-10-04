window.HOME_INTRO = md`
> **New to all this?** Every page starts with an **"In simple words"** box and an everyday comparison. Any word you don't know is in the [Glossary](#/glossary). Read the simple box first, then the details.

## How this lab works

Every project is a **client engagement**: a company has a problem, hires you, and you take it from a vague brief to a system that runs, has been evaluated, and has a cost figure attached. Every project follows the same eight stages. That repetition is on purpose, because it is how working AI engineers actually operate:

1. **Brief.** What the client says they want.
2. **Discover.** What they actually need: the questions you ask, the numbers you collect, what success means.
3. **Frame.** What *kind* of problem this is, and the **simplest** thing that could work.
4. **Design.** Architecture, data flow, and the trade-offs you chose.
5. **Build.** Real Python, file by file, with every pattern named.
6. **Evaluate.** How you'd prove it works before anyone trusts it.
7. **Operate.** Cost, latency, failure modes, monitoring.
8. **Level up.** What breaks at 10x scale, and which project tackles that.

> **How to study a project:** read the Brief and stop. Spend 10 minutes sketching your own design on paper. Then read the rest and compare. The gap between your sketch and the design is exactly what you're here to learn.

## Suggested path

- Read [[f:the-loop]], [[f:complexity-ladder]] and [[f:probabilistic-core]] first. They're short and every project depends on them.
- Do the beginner projects **in order**. B01 builds the ~llm.py~ gateway that every later project reuses.
- After each level, open the [Pattern matrix](#/matrix) and follow a few patterns across projects.
- Read [Hiring & skills](#/skills) before you start building a portfolio.

> All code uses the Anthropic Python SDK (2026 API: ~messages.parse~ structured outputs, the tool runner, prompt caching, the Batches API and MCP) behind a small gateway, so you can swap providers in one file. The *patterns* are provider-agnostic, and that's the actual lesson.
`;

window.FRAMEWORK_INTRO = md`
> These chapters are the thinking toolkit. Each project page applies them, and the chapters link to projects so you can see each idea in use.
`;

chapter({
  id: "the-loop",
  title: "The AI engineering loop",
  summary: "The eight-stage loop every project in this lab follows, and why the order matters.",
  body: md`
Most people learning AI engineering start at step 5: they open an editor and write a prompt. Experienced AI engineers spend most of their thinking time in steps 2, 3 and 6. The code is often the easy part.

~~~text
  ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐
  │ 1 Brief  │──▶│2 Discover│──▶│ 3 Frame │──▶│ 4 Design │
  └──────────┘   └──────────┘   └─────────┘   └────┬─────┘
                                                    │
  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────▼─────┐
  │8 Level up│◀──│7 Operate │◀──│6 Evaluate│◀──│ 5 Build  │
  └────┬─────┘   └──────────┘   └────▲─────┘   └──────────┘
       │                             │
       └──────── new requirements ───┘   (evaluate → change → evaluate …)
~~~

## 1. Brief: hear the request, but don't trust it yet
Clients describe **solutions** ("we want a chatbot") when they have **problems** ("our support team is drowning and response time is 3 days"). Write down the brief word for word, then translate it into a problem statement.

## 2. Discover: find the real problem and how it's measured
Ask about volume, current process, cost of the current process, what a mistake costs, who's affected, what data exists, and what "good" means *in numbers*. See [[f:discovery]].

## 3. Frame: name the problem shape and pick the simplest tier
Is this classification, extraction, generation, retrieval, or deciding and acting? (See [[f:problem-shapes]].) Then climb the [[f:complexity-ladder]] only as far as you have to. Frequently the right answer is "one well-designed model call."

## 4. Design: draw boxes before writing code
Inputs, outputs, components, data stores, where the model sits, where **deterministic code** sits, where humans sit. Write down the 2–3 decisions that matter and what you traded away.

## 5. Build: small, typed, testable
Isolate the model behind a gateway, use schemas for outputs, keep prompts in files, and inject dependencies so you can test without the network.

## 6. Evaluate: prove it before anyone trusts it
Build a labelled test set *before* you tune prompts. Measure. Change one thing. Measure again. See [[f:evaluation-mindset]].

## 7. Operate: cost, latency, failure, feedback
Every system has a cost per request, a latency budget, failure modes and a monitoring plan. See [[f:cost-latency]] and [[f:failure-modes]].

## 8. Level up: what breaks at 10x
Volume, new languages, new customers, regulation. The answer is usually one of the intermediate or advanced patterns, which is why the projects are ordered the way they are.

> **The meta-pattern:** steps 5 to 7 form a loop. *Evaluate → change one thing → evaluate.* AI engineers who skip the eval set are guessing, and their systems drift.
`,
});

chapter({
  id: "complexity-ladder",
  title: "The complexity ladder: start simple",
  summary: "Seven rungs from plain code to multi-agent systems. Climb only when an eval proves the lower rung isn't enough.",
  body: md`
The most common beginner mistake is building an "agent" for a problem a single prompt could solve. The most common senior skill is **refusing to add complexity until the data demands it**.

~~~text
 Rung 7  Multi-agent (orchestrator + workers)    ▲ cost, latency, failure modes,
 Rung 6  Agent (model chooses tools in a loop)   │ debugging difficulty all go UP
 Rung 5  Tool use (model calls your functions)   │
 Rung 4  Retrieval (RAG: fetch context first)    │
 Rung 3  Workflow (fixed chain of model calls)   │
 Rung 2  Single model call (+ schema)            │ predictability, testability,
 Rung 1  Deterministic code (regex, SQL, rules)  ▼ cheapness all go UP
~~~

| Rung | Use it when | Example project |
|---|---|---|
| 1. Plain code | The rule can be written down | The date/slot checks in [[proj:b04]] |
| 2. Single call | One input → one output, all context fits | [[proj:b01]] ticket triage |
| 3. Workflow | Steps are known in advance | [[proj:b06]] meeting notes, [[proj:i08]] prior-auth |
| 4. Retrieval | The answer lives in documents the model hasn't seen | [[proj:b05]], [[proj:i01]] |
| 5. Tool use | The model must read or write live systems | [[proj:i02]] order agent |
| 6. Agent | The *path* can't be known in advance | [[proj:a05]] incident agent |
| 7. Multi-agent | Work splits into parallel, independent sub-tasks | [[proj:a03]] deep research |

## The rule
> Start one rung lower than you think you need. Build the eval. Move up a rung only when the eval shows a failure that the higher rung fixes.

## Workflows vs agents (the most important distinction)
- A **workflow** is code you wrote that calls a model at fixed points. *You* own the control flow, so it's predictable, testable and cheap.
- An **agent** is a model that decides the control flow, choosing which tool to call next. It's flexible, and harder to test and bound.

Most "agents" in production are actually workflows with one or two agentic steps. That's not a compromise. It's good engineering. See [[c:workflow-vs-agent]].

## Before choosing an agent, check four things
1. **Complexity.** Is the task multi-step and hard to specify in advance?
2. **Value.** Does the outcome justify higher cost and latency?
3. **Viability.** Can the model actually do this kind of task?
4. **Cost of error.** Can mistakes be caught and undone (tests, review, rollback)?

If any answer is "no", stay on a lower rung.
`,
});

chapter({
  id: "probabilistic-core",
  title: "Probabilistic core, deterministic shell",
  summary: "The model interprets; your code decides, validates and acts. The single most repeated idea in this lab.",
  body: md`
A foundation model is a brilliant, fast, occasionally wrong **interpreter of messy input**. Your code is a boring, reliable **executor of rules**. Good AI systems put each where it's strong.

~~~text
   messy world                 ┌───────────────────────────┐            real world
  (emails, PDFs,   ─────────▶  │  DETERMINISTIC SHELL      │  ───────▶  (DB writes,
   voice, chat)                │  validate · route · act   │            refunds, SMS)
                               │   ┌───────────────────┐   │
                               │   │ PROBABILISTIC CORE│   │
                               │   │  model: interpret │   │
                               │   │  → typed output   │   │
                               │   └───────────────────┘   │
                               └───────────────────────────┘
~~~

## What goes where

| The model does | Your code does |
|---|---|
| Read an email and output ~{"intent": "reschedule", "date": "2026-11-04"}~ | Check the date is in the future, the slot is free, the patient exists |
| Decide a ticket is "billing, urgent" | Route it to the billing queue and page on-call if urgent |
| Draft a reply | Decide whether it's sent automatically or queued for a human |
| Propose a SQL query | Parse it, reject anything that isn't ~SELECT~, add ~LIMIT~, run it read-only |
| Choose to call ~refund_order~ | Check the amount limit, require approval, make it idempotent |

## Three rules that follow
1. **Never let the model's text directly touch the real world.** It goes through a schema ([[p:structured-output]]), then validation ([[p:validate-retry]]), then your code.
2. **Every action has a guard.** Thresholds, allowlists, approvals ([[p:human-in-loop]]).
3. **The model's output is data, never instructions to your system.** This matters even more when inputs come from untrusted users or documents ([[proj:a06]]).

> You'll see this in nearly every project: [[proj:b04]] (SMS to booking), [[proj:i02]] (refund agent), [[proj:i04]] (text-to-SQL), [[proj:a05]] (incident remediation).
`,
});

chapter({
  id: "problem-shapes",
  title: "The seven problem shapes",
  summary: "Almost every business request is one of seven shapes. Name the shape and you already know most of the architecture.",
  body: md`
When a brief arrives, the first question isn't "which model?" It's **"what shape is this?"** Each shape comes with default patterns, default metrics and default failure modes.

| # | Shape | Input → Output | Default patterns | Default metric | Projects |
|---|---|---|---|---|---|
| 1 | **Classify** | text → label from fixed set | [[p:structured-output]] [[p:classify-route]] | accuracy, per-class recall, confusion matrix | [[proj:b01]] [[proj:b09]] [[proj:i06]] |
| 2 | **Extract** | document → typed fields | [[p:structured-output]] [[p:validate-retry]] | field-level exact match | [[proj:b02]] [[proj:b04]] [[proj:i05]] |
| 3 | **Transform / generate** | input + constraints → new text | [[p:prompt-as-code]] [[p:guardrails]] [[p:llm-judge]] | rubric score, constraint pass-rate | [[proj:b07]] [[proj:b08]] |
| 4 | **Summarize / aggregate** | many/long inputs → condensed view | [[p:map-reduce]] [[p:batch-async]] | coverage, faithfulness | [[proj:b03]] [[proj:b06]] |
| 5 | **Retrieve + answer** | question + corpus → grounded answer | [[p:rag]] [[p:grounded-citations]] | retrieval recall@k, faithfulness | [[proj:b05]] [[proj:i01]] [[proj:a01]] |
| 6 | **Decide + act** | goal → actions on systems | [[p:tool-calling]] [[p:agent-loop]] [[p:human-in-loop]] | task success, unsafe action rate | [[proj:i02]] [[proj:i04]] [[proj:a05]] |
| 7 | **Research / explore** | open question → report | [[p:orchestrator-workers]] [[p:map-reduce]] | judge score, citation accuracy | [[proj:a03]] |

## Composite problems are just shapes chained together
A "claims processing AI" ([[proj:a02]]) is: **Classify** (doc type) → **Extract** (fields) → **Retrieve** (policy) → **Decide** (approve / flag) → **Generate** (letter). Break the problem into shapes, solve each with its default pattern, and connect them with a workflow ([[p:workflow-state-machine]]).

> **Exercise:** for each of these briefs, name the shapes. (1) "Turn our 10,000 support calls into a monthly insights report." (2) "Let sales reps ask questions about our product catalog." (3) "Automatically fix failing CI builds." *Answers: (1) Extract → Aggregate; (2) Retrieve+answer; (3) Decide+act (agent) + Evaluate (tests as the judge).*
`,
});

chapter({
  id: "discovery",
  title: "Discovery: analyzing what a business actually needs",
  summary: "The question bank, the numbers to collect, and how to turn pain into a measurable target before you write any code.",
  body: md`
Discovery separates people who "build AI demos" from engineers businesses pay. Thirty minutes of good questions can save you three weeks of building the wrong thing.

## The question bank
**The process today**
- Walk me through what happens today, step by step. Who touches it?
- How many per day/week? (volume → cost and architecture)
- How long does each one take a person? (time → ROI)
- What tools/systems hold the data? Can we get API access? (integration → feasibility)

**What "good" means**
- How would you know in three months that this worked? (→ success metric)
- What does a *mistake* cost? A wrong answer vs. no answer? (→ thresholds, human review)
- Are some cases far more important than others? (→ per-class metrics, not just accuracy)

**Constraints**
- Latency: does someone wait on this in real time, or can it run overnight? (→ sync vs [[p:batch-async]])
- Data: PII, health, financial, legal? Where may it be processed? (→ [[p:guardrails]], region, retention)
- Budget per request / per month?
- Languages, channels, peak load?

**Ground truth**
- Do you have historical examples with the correct answer? (→ instant eval set)
- Who is the expert who can label 100 examples for us?

## Turn the answers into a one-page spec
~~~text
Problem:     Support agents spend 40% of time routing tickets by hand.
Volume:      1,800 tickets/day, peak 300/hour, 4 languages.
Today:       Avg 6 min to first routing; 18% mis-routed.
Target:      Route in < 10 s; mis-route < 8%; urgent recall > 95%.
Cost cap:    < $0.01 per ticket.
Risk:        Mis-routing urgent = SLA breach (high). Others = minor delay (low).
Data:        2 years of tickets with final queue = free labelled data.
Human role:  Low-confidence tickets go to the existing manual queue.
~~~

This spec *is* half your design. The latency target rules out multi-step agents, the cost cap picks the model tier, the risk line sets thresholds, and the labelled history gives you the eval set.

## ROI math you should be able to do on a whiteboard
~~~text
value/month  = volume × minutes_saved × loaded_cost_per_minute × automation_rate
cost/month   = volume × (tokens_in × price_in + tokens_out × price_out) + infra + human_review
payback      = build_cost / (value − cost)
~~~
Example: 1,800 tickets/day × 5 min saved × $0.75/min × 70% automated ≈ $142k/month value vs. ≈ $300/month model cost. *That* is why they hired you. Lead with it.

> See the capstone [[proj:a08]] for a full company analysis: opportunity mapping, prioritization and a roadmap.
`,
});

chapter({
  id: "evaluation-mindset",
  title: "The evaluation mindset",
  summary: "Evals are the unit tests of AI systems. How to build them, what to measure, and when to trust an LLM judge.",
  body: md`
> "If you can't measure it, you can't improve it" is doubly true for LLMs, because they *look* right most of the time.

## The eval-driven loop
1. Collect 50–200 real inputs with expected outputs (the **golden set**). Historical data is the best source.
2. Write the simplest system you can.
3. Run the eval. Read the **failures**, not just the score.
4. Change *one* thing (prompt, model, retrieval, schema).
5. Re-run. Keep the change only if the score improved and nothing important regressed.

## What to measure, by problem shape
| Shape | Metric | How |
|---|---|---|
| Classify | accuracy, per-class precision/recall, confusion matrix | exact match against labels |
| Extract | field-level accuracy, % documents fully correct | compare each field, normalise first |
| Retrieve | recall@k, MRR | did the right chunk appear in the top k? |
| Grounded answer | faithfulness, answer correctness | LLM judge with the sources + rubric |
| Generate | rubric pass-rate, constraint violations | rules where possible, judge for the rest |
| Act / agent | task success rate, steps, cost, unsafe action rate | run in a sandbox and check end state |

## Three tiers of graders (prefer the cheapest that works)
1. **Code graders.** Exact match, regex, JSON schema, "does the SQL run", "is the date in the future". Fast, free and deterministic.
2. **LLM-as-judge.** For open-ended quality. Give it a *rubric* with concrete criteria, ask for reasoning before the score, and **calibrate it against human labels** ([[p:llm-judge]], [[proj:i07]]).
3. **Human review.** Expensive, so use it to build the golden set and to audit the judge.

## Offline vs online
- **Offline evals** run before deploy on the golden set. They gate changes ([[p:prompt-ci]], [[proj:i10]]).
- **Online evals** run on live traffic: sampling, judge scores, user feedback, escalation rate. They catch drift ([[p:feedback-flywheel]], [[proj:a07]]).

## Common mistakes
- Tuning the prompt on the same 10 examples you test on (overfitting).
- Reporting one accuracy number when one class (e.g. "urgent") matters 10× more.
- Using an LLM judge you never compared to a human.
- No eval for *safety* cases: injection attempts, out-of-scope questions, empty inputs.
`,
});

chapter({
  id: "cost-latency",
  title: "Cost and latency math",
  summary: "Tokens, prices, caching, batching and model tiers. The back-of-envelope numbers you're expected to know.",
  body: md`
## Tokens
Roughly **1 token ≈ 0.75 English words ≈ 4 characters**. A page of text is ≈ 500–700 tokens. Always measure with the provider's token-counting endpoint for real numbers.

## Cost per request
~~~text
cost = input_tokens × input_price + output_tokens × output_price
~~~
Output tokens usually cost **about 5×** input tokens, so long outputs are expensive. Ask for exactly what you need: labels, JSON, short answers.

## Prices (Anthropic API, per million tokens, late 2026; always check current pricing)
| Tier | Example model | Input | Output | Use for |
|---|---|---|---|---|
| Fast / cheap | ~claude-haiku-4-5~ | $1 | $5 | classification, routing, high volume |
| Balanced | ~claude-sonnet-5-5~ | $2 | $10 | most production work |
| Flagship | ~claude-opus-5-5~ | $4 | $20 | hard reasoning, agents, coding |

## The five cost levers (in the order you should pull them)
1. **Prompt caching.** A stable prefix (system prompt, documents, tool definitions) is cached and re-read at a fraction of the price. Free win. [[p:caching]]
2. **Trim input.** Retrieve 5 relevant chunks instead of sending 200 pages.
3. **Constrain output.** Schemas, enums, max length.
4. **Batch.** Non-urgent work through the Batches API is **50% cheaper**. [[p:batch-async]]
5. **Model choice / cascade.** Cheap model first, escalate the hard cases. Measure first: a strong model at low effort often beats a cascade. [[p:model-cascade]]

## Latency
- **Time-to-first-token (TTFT)** matters for chat; **stream** the response.
- **Total time** matters for pipelines: parallelise independent calls, and keep sequential chains short.
- Each extra sequential model call adds seconds. That's why real-time systems ([[proj:b04]], [[proj:i09]]) avoid long chains.

## Worked example
~~~text
Ticket triage, 1,800/day: input ≈ 600 tokens (prompt+ticket), output ≈ 60 tokens (JSON)
Haiku:  1,800 × (600×$1 + 60×$5)/1e6  ≈ $1.62/day   ≈ $49/month
Opus:   1,800 × (600×$4 + 60×$20)/1e6 ≈ $6.48/day   ≈ $194/month
With caching of a 500-token system prompt, input cost drops substantially.
~~~
Both are trivially cheap compared to the human time saved, so choose on **quality from the eval**, not price, until volume makes price matter.
`,
});

chapter({
  id: "failure-modes",
  title: "Designing for failure",
  summary: "The ways LLM systems fail in production, and the pattern that defends against each one.",
  body: md`
LLM systems rarely crash. They fail **silently**, returning something plausible but wrong. Design so that failures are caught, contained and visible.

| Failure | What it looks like | Defence |
|---|---|---|
| Malformed output | JSON missing a field, wrong enum | [[p:structured-output]] + [[p:validate-retry]] |
| Hallucination | Confident answer not in the sources | [[p:grounded-citations]], "I don't know" path, faithfulness evals |
| Wrong action | Refunds the wrong order | [[p:human-in-loop]], limits, [[p:idempotency]] |
| Prompt injection | A document says "ignore previous instructions…" | [[p:guardrails]], privilege separation ([[proj:a06]]) |
| Provider outage / 429 | Timeouts, rate limits | retries with backoff, fallbacks in the [[p:llm-gateway]] |
| Cost blow-up | Agent loops 200 times | step and token budgets, [[p:agent-loop]] limits |
| Drift | Quality drops after a model or prompt change | [[p:prompt-ci]], online monitoring ([[p:observability]]) |
| Data leakage | User A sees User B's documents | permission-aware retrieval ([[proj:a01]]) |
| Silent degradation | Inputs change (new product line) and accuracy falls | [[p:feedback-flywheel]] |

## The three questions for every component
1. **How can this fail?**
2. **How will I *know* it failed?** (a log, a metric, an alert, a user complaint?)
3. **What happens next?** (retry, fall back, escalate to a human, refuse?)

> A system with an explicit "I'm not sure, sending to a human" path is far more valuable than one that's right 95% of the time and confidently wrong the other 5%.
`,
});

chapter({
  id: "system-design-interview",
  title: "Answering an AI system design question",
  summary: "A repeatable 45-minute structure for 'Design an AI system that…' interviews, and for client proposals.",
  body: md`
AI engineering interviews increasingly include a design round: *"Design a system that answers customer questions using our help center,"* or *"Design an AI pipeline that processes insurance claims."* Use the same loop as every project here.

## The 45-minute template
| Minutes | Do | Say things like |
|---|---|---|
| 0–7 | **Clarify** (Discover) | "What's the volume? Is it real-time? What does a wrong answer cost? Do we have labelled history?" |
| 7–10 | **Frame** | "This is retrieve-and-answer with a decide-and-act tail. I'll start with a workflow, not an agent." |
| 10–25 | **Design** | Draw: ingestion → index → retrieval → generation → guardrails → output. Mark where the model is and where code is. |
| 25–33 | **Evaluate** | "Golden set of 200 historical questions; recall@5 for retrieval, judge-scored faithfulness for answers, calibrated on 50 human labels." |
| 33–40 | **Operate** | Cost per request, latency budget, caching, monitoring, failure modes, human escalation. |
| 40–45 | **Scale** | "At 100x: batch ingestion, hybrid search, per-tenant indexes, model cascade, online evals." |

## What interviewers listen for
- You **ask before you design**.
- You choose the **simplest** architecture and justify each extra component.
- You separate **retrieval quality** from **generation quality**.
- You have a concrete **evaluation plan** with numbers.
- You know **costs** and **latency** within an order of magnitude.
- You name **failure modes** and defences unprompted.
- You know when a human must stay in the loop.

> Every project page ends with an "interview" section that's exactly this answer, compressed. Practise saying them out loud.
`,
});

chapter({
  id: "reading-a-company",
  title: "Reading a company: from org chart to AI roadmap",
  summary: "How to analyze a business you don't know, find where foundation models create value, and prioritize.",
  body: md`
Sometimes the brief is just *"We want to use AI. Where should we start?"* This is the most senior kind of engagement. The method:

## 1. Map the value chain
List the company's core flows: **acquire customers → sell → deliver → support → bill → comply**. For each, ask where people spend time reading, writing, searching, classifying or deciding with messy information. That's where foundation models help.

## 2. Find candidates with the "four Vs"
- **Volume.** Does it happen thousands of times?
- **Variability.** Is the input messy (language, documents) so rules fail?
- **Value.** Is each instance worth something (time, revenue, risk)?
- **Verifiability.** Can we check whether the output is right? (This is what makes it evaluable and safe.)

## 3. Score and prioritise
~~~text
priority = (value × frequency × verifiability) / (risk × integration_effort)
~~~
| Candidate | Value | Freq | Verifiable | Risk | Effort | Verdict |
|---|---|---|---|---|---|---|
| Ticket routing | M | H | H (history) | L | L | **Quick win** |
| Contract review | H | M | M (lawyer review) | M | M | Phase 2 |
| Autonomous refunds | M | H | H | **H** | M | Only with approval gates |
| "AI strategy chatbot for CEO" | ? | L | L | L | L | Skip |

## 4. Sequence a roadmap
1. **Quick wins** (weeks): classification and extraction with humans reviewing. They build trust and data.
2. **Platform** (months): a shared gateway, eval tooling and a document index, so each next use case is cheaper ([[proj:a04]]).
3. **Bigger bets**: agents and automation with approvals, once evals and monitoring exist.

> The full worked version is the capstone, [[proj:a08]].
`,
});

window.TRACK_INTROS = {
  beginner: md`
> **Assumes:** Python basics (functions, classes, dicts, files). **Teaches:** the core loop of AI engineering on single-call systems. Every project here is small enough to build in an afternoon, but each is a real, hireable scenario.

Do these in order. B01 builds the ~llm.py~ gateway every other project reuses. By B10 you'll have used structured outputs, validation, routing, retrieval, batching, judges and human review: the vocabulary for everything that follows.
`,
  intermediate: md`
> **New here:** systems with several moving parts: real retrieval (embeddings, hybrid search, reranking), tools and agent loops, MCP, text-to-SQL, workflows with state, cascades for cost, calibrated judges, conversational memory and prompt CI.

Each project still follows the same eight stages. Notice how often the *same* beginner patterns (schemas, validation, human review, evals) carry the most weight in these bigger designs.
`,
  advanced: md`
> **New here:** system design at organisational scale: security (permissions, prompt injection), durability (workflows that run for days), multi-agent orchestration, platforms serving many teams, evaluation as a continuous process, and company-wide strategy.

These are study projects. Read the brief, **write your own one-page design first**, then compare. The gap between your design and the one here is the most valuable thing in the lab.
`,
};
