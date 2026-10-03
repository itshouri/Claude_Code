skillPage({
  id: "focus-skills",
  title: "The skills worth the most time",
  summary: "Ranked by how often they decide hiring and how much they compound. Spend your hours here, not on more syntax.",
  body: md`
You already know Python basics. From here, more Python syntax gives you little. These skills give you a lot, ranked by impact:

| # | Skill | Why it matters | Where you practise it |
|---|---|---|---|
| 1 | **Evaluation** (golden sets, metrics, judges) | The #1 thing that separates engineers from demo-builders. Every serious team asks "how did you measure it?" | Every project; deep in [[proj:b10]] [[proj:i07]] [[proj:i10]] [[proj:a07]] |
| 2 | **Problem framing and discovery** | Choosing the *right* problem and the simplest solution is worth more than any clever prompt | Stage 2–3 of every project; [[proj:a08]] |
| 3 | **Structured outputs + validation** | Makes LLMs usable inside software | [[proj:b01]] [[proj:b02]] [[proj:b04]] |
| 4 | **Retrieval (RAG) done properly** | The most common enterprise use case; most RAG in the wild is bad | [[proj:b05]] [[proj:i01]] [[proj:a01]] |
| 5 | **Tool use, agents and their limits** | Knowing when *not* to build an agent is a senior signal | [[proj:i02]] [[proj:a05]] [[proj:a03]] |
| 6 | **Software engineering fundamentals** | APIs (FastAPI), typing (Pydantic), testing, git, SQL, Docker, queues | Build sections throughout |
| 7 | **Cost and latency reasoning** | Engineers who can put a dollar figure on a design get trusted with budgets | Operate sections; [[proj:i06]] [[proj:a04]] |
| 8 | **Security and safety** | Prompt injection, PII, permissions. Increasingly a hiring filter | [[proj:a06]] [[proj:a01]] [[proj:i08]] |
| 9 | **Observability and production ops** | Tracing, monitoring, prompt CI | [[proj:i10]] [[proj:a07]] |
| 10 | **Communication** | Explaining trade-offs to non-engineers, writing a one-page design doc | Interview sections; [[proj:a08]] |

## Less valuable than people think (for applied AI engineering roles)
- Training models from scratch or deep ML math. Valuable for research roles, rarely the bottleneck when building on foundation models.
- Memorising framework APIs. They change every quarter, and the patterns don't.
- Prompt "tricks". Modern models need clear context, not magic words.
`,
});

skillPage({
  id: "levels",
  title: "Beginner vs solid vs senior AI engineer",
  summary: "What each level actually does differently, so you know what to demonstrate and what to grow into.",
  body: md`
| Situation | Beginner | Solid AI engineer | Senior / staff |
|---|---|---|---|
| Gets a brief | Starts coding a chatbot | Asks about volume, cost of errors, existing data | Questions whether AI is the right tool; reframes the problem around the business metric |
| Picks architecture | Agent with 10 tools | Simplest workflow that could work | Simplest thing, *plus* a path to scale and a platform for the next 5 use cases |
| Prompting | Long prompt, lots of CAPS | Clear context, examples, schema | Prompts versioned, tested and owned like code |
| Output handling | Parses text with regex | Structured outputs + validation | Validation, repair, human escalation, audit trail |
| Evaluation | "I tried it, it works" | Golden set + metrics per class | Offline + online evals, calibrated judges, CI gates, flywheel |
| RAG | Embeds everything, top-3 | Chunking by structure, hybrid search, recall@k | Permissions, freshness, multi-tenant, retrieval and generation evaluated separately |
| Agents | Unbounded loops | Bounded loops, tool guards | Knows when not to use one; sandboxing, approvals, blast-radius design |
| Cost | Doesn't know | Estimates per request | Owns unit economics; caching, batching, cascades, budgets |
| Failure | Surprised by it | Handles errors and retries | Designs for silent failure, monitors drift, has runbooks |
| Communication | Shows a demo | Writes a design doc | Aligns stakeholders, writes the ROI case, mentors |

## Signals that get a beginner hired
1. **Two or three finished, *evaluated* projects** beat ten demos. Show the eval table.
2. A README that starts with the **business problem and the result** ("cut routing time from 6 min to 8 s at $0.002/ticket; 94% accuracy on 300 labelled tickets").
3. Evidence you handle failure: validation, fallbacks, a human path.
4. Clean engineering: typed code, tests with a fake model, a FastAPI endpoint, a Dockerfile.
5. You can explain trade-offs out loud (practise the interview sections).

## Signals that separate solid from average
- Picking boring, reliable designs and justifying them with numbers.
- Treating evals as a product: versioned datasets, regression gates.
- Understanding retrieval deeply (most production failures are retrieval failures).
- Being able to say "we shouldn't automate this part, and here's why."
`,
});

skillPage({
  id: "portfolio",
  title: "Turning these projects into a portfolio",
  summary: "How to pick, extend and present 3 projects so that a hiring manager understands your value in 60 seconds.",
  body: md`
## Pick three that show range
- One **extraction/classification** system with a strong eval (e.g. [[proj:b02]] or [[proj:b10]]).
- One **retrieval** system with retrieval metrics (e.g. [[proj:i01]] or [[proj:i05]]).
- One **action/agent or workflow** system with guards (e.g. [[proj:i02]], [[proj:i08]] or [[proj:a05]]).

Choose industries you want to work in. Domain knowledge is a real advantage.

## Make each one yours
- Change the dataset (use public data from your target industry).
- Add one thing the lab doesn't do (a UI, a new eval, a cost dashboard).
- Write down what failed and how you fixed it. That's the most interesting part to interviewers.

## The README template
~~~text
# <Problem in business words>
Result: <metric before → after>, <cost per item>, <latency>

## The problem      (2–3 sentences, who has it and what it costs)
## Approach         (diagram + why this design, what you rejected)
## Evaluation       (dataset, metrics table, failure analysis)
## Running it       (3 commands)
## What I'd do next (the "level up" section)
~~~
`,
});

skillPage({
  id: "stack-2026",
  title: "The 2026 toolbox",
  summary: "The tools and technologies worth knowing, grouped by layer. Learn the layer's job first, then one tool per layer.",
  body: md`
| Layer | Job | Worth knowing |
|---|---|---|
| Models & APIs | Generate, reason, call tools | Anthropic API (Claude Opus / Sonnet / Haiku), at least one other provider; cloud marketplaces (Bedrock, Vertex, Foundry) |
| Model features | Make calls reliable/cheap | Structured outputs, tool use, prompt caching, batch API, streaming, effort/thinking controls, citations, Files API |
| Integration protocols | Connect models to systems | **MCP** (servers, clients, stdio and Streamable HTTP, OAuth), A2A for agent-to-agent, OpenAPI |
| Agent tooling | Run loops | SDK tool runners, Claude Agent SDK, managed agents, LangGraph-style graphs |
| Python core | Build services | Pydantic v2, FastAPI, asyncio, httpx, pytest, **uv** for env/packaging |
| Data & retrieval | Store and find knowledge | Postgres + **pgvector**, a dedicated vector DB (Qdrant, etc.), BM25 (e.g. Tantivy/OpenSearch), rerankers, embedding models |
| Workflow & queues | Run reliably | Celery/RQ/Arq, **Temporal** or cloud step functions, Redis |
| Evals | Measure quality | Your own harness first; then promptfoo, Inspect, Braintrust, Langfuse or similar |
| Observability | See what happened | **OpenTelemetry** GenAI conventions, Langfuse/Phoenix/LangSmith-style tracing |
| Security | Stay safe | PII redaction (e.g. Presidio), secrets management, permission models, injection testing |
| Deployment | Ship | Docker, a cloud (one is enough), CI (GitHub Actions) |

> Learn the **job** of each layer first. Tools get replaced, jobs don't.
`,
});

skillPage({
  id: "study-plan",
  title: "A 12-week study plan",
  summary: "Roughly 8–10 hours a week: which projects, in what order, and what to produce at the end of each phase.",
  body: md`
| Weeks | Do | Produce |
|---|---|---|
| 1 | Framework chapters + [[proj:b01]] | Your own ~llm.py~ gateway + first eval script |
| 2 | [[proj:b02]] [[proj:b04]] | Validation/repair loop; "model parses, code acts" in your own words |
| 3 | [[proj:b03]] [[proj:b05]] [[proj:b06]] | Batch job + map-reduce; tiny RAG with citations |
| 4 | [[proj:b07]] [[proj:b08]] [[proj:b09]] [[proj:b10]] | Generator with critique loop; a rubric-scored eval |
| 5 | [[proj:i01]] | Hybrid RAG with recall@k measured |
| 6 | [[proj:i02]] [[proj:i03]] | Hand-written agent loop; your first MCP server |
| 7 | [[proj:i04]] [[proj:i05]] | Text-to-SQL with guards; extraction into a DB |
| 8 | [[proj:i06]] [[proj:i07]] | Cascade with cost table; a calibrated judge |
| 9 | [[proj:i08]] [[proj:i09]] [[proj:i10]] | State-machine workflow; memory; prompt CI in GitHub Actions |
| 10 | [[proj:a01]] [[proj:a02]] | Design docs for both (write them *before* reading the solutions) |
| 11 | [[proj:a03]] [[proj:a04]] [[proj:a05]] [[proj:a06]] | One advanced project built end to end |
| 12 | [[proj:a07]] [[proj:a08]] | Portfolio polish; practise five system-design answers out loud |

> Re-read [[f:the-loop]] at the start of each phase. You'll understand it differently every time.
`,
});
