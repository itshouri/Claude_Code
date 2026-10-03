concept({
  id: "api-vs-mcp",
  title: "API vs function calling vs MCP",
  summary: "Three layers people constantly confuse: calling a model, letting a model call your code, and a standard protocol for exposing capabilities to any AI app.",
  body: md`
These are three different things at three different layers. Most confusion in job interviews comes from mixing them up.

~~~text
 ┌────────────────────────────────────────────────────────────────────┐
 │ LAYER 3  MCP (Model Context Protocol)                              │
 │  A standard way to PACKAGE tools/data so ANY AI app can use them   │
 │  "USB-C for AI integrations"                                       │
 ├────────────────────────────────────────────────────────────────────┤
 │ LAYER 2  Function calling / tool use                               │
 │  The model REQUESTS a call to your function; YOUR code runs it     │
 ├────────────────────────────────────────────────────────────────────┤
 │ LAYER 1  The model API                                             │
 │  HTTP request: messages in → text/JSON out                         │
 └────────────────────────────────────────────────────────────────────┘
~~~

## Layer 1: the model API
You send messages and get a response. Stateless: you send the whole conversation each time.
~~~python
client.messages.create(model="claude-opus-5-5", max_tokens=1024,
                       messages=[{"role": "user", "content": "Classify: 'I was double charged'"}])
~~~

## Layer 2: function calling (tool use)
You describe functions (name, description, JSON schema). The model replies with a **request**, something like "call ~get_order(order_id='A123')~". **Your code** executes it and sends back the result. The model never runs anything itself. See [[p:tool-calling]].

## Layer 3: MCP
Function calling has a problem at scale: every app re-implements the same integrations (GitHub, Postgres, Slack, your internal CRM). **MCP is an open protocol** that standardises this. You write an **MCP server** once ("here are my tools, resources and prompts") and any **MCP client** (Claude apps, IDEs, your own agents, other vendors' tools) can connect to it.

| MCP concept | What it is | Example |
|---|---|---|
| **Host** | The AI application the user interacts with | Claude Desktop, an IDE, your agent |
| **Client** | Connector inside the host, one per server | created by the host |
| **Server** | Exposes capabilities over the protocol | ~shipments-mcp~ for a logistics firm |
| **Tools** | Functions the model can call (model-controlled) | ~track_shipment(id)~ |
| **Resources** | Read-only data the app can attach (app-controlled) | ~shipment://A123/history~ |
| **Prompts** | Reusable templates (user-controlled) | "/delay-report" |
| **Transports** | How bytes move | **stdio** (local process), **Streamable HTTP** (remote, with OAuth) |

## When to use which
| Situation | Use |
|---|---|
| Your backend needs a model to classify/extract/generate | **Plain API** call |
| Your own app's model needs to call 3 of your functions | **Function calling** in your code |
| You want your company's systems usable by *many* AI apps and agents, internal or external | **MCP server** |
| You want your agent to use someone else's integration (GitHub, Notion, Postgres…) | **MCP client** connecting to their server |

## The key insight
MCP doesn't replace function calling. **Under the hood, MCP tools become function calls.** The MCP client lists the server's tools, converts them into tool definitions for the model, and routes the model's tool requests to the server. MCP is about *distribution and reuse*. Function calling is the *mechanism*.

> Build both in [[proj:i03]]: the same logistics capabilities as a function-calling integration and as an MCP server, compared side by side.

## Related protocols (2026)
- **A2A (Agent-to-Agent):** a protocol for agents to discover and delegate tasks to *other agents* (agent ↔ agent), whereas MCP is agent ↔ tools/data. They're complementary.
- **OpenAPI:** describes REST APIs for humans and code. You can generate MCP servers or tool schemas from an OpenAPI spec, but a good MCP tool is usually *higher level* than a raw endpoint (see [[proj:i03]]).
`,
});

concept({
  id: "workflow-vs-agent",
  title: "Workflow vs agent",
  summary: "Who owns the control flow, your code or the model? The decision with the biggest effect on reliability and cost.",
  body: md`
| | Workflow | Agent |
|---|---|---|
| Control flow | **Your code** (if/else, loops, steps) | **The model** decides the next step |
| Predictability | High | Lower |
| Testability | Unit-test each step | Test end-states and trajectories |
| Cost/latency | Bounded, known | Variable; needs budgets |
| Best for | Known processes: claims, onboarding, triage | Open-ended tasks: debugging, research, exploration |

## Workflow shapes you'll reuse
~~~text
Chain:         A ──▶ B ──▶ C
Router:        A ──▶ {B | C | D}            (classify, then branch)
Parallel:      A ──▶ [B, C, D] ──▶ merge    (map-reduce, voting)
Evaluator:     A ──▶ check ──fail──▶ A'     (generate → critique → revise)
State machine: RECEIVED → EXTRACTED → VERIFIED → APPROVED/REJECTED
~~~

## An agent is just a loop
~~~python
while not done and steps < MAX_STEPS:
    response = model(messages, tools)
    if response.wants_tool:
        result = run_tool(response.tool_call)   # YOUR code, with guards
        messages += [response, result]
    else:
        done = True
~~~
Everything that makes agents production-grade is *around* that loop: step and token budgets, tool guards, approvals, tracing, and evaluation of the final state. See [[p:agent-loop]].

> Rule of thumb: if you can draw the flowchart, build a workflow. Use an agent only for the box in the flowchart that says "figure it out."
`,
});

concept({
  id: "rag-vs-context-vs-finetune",
  title: "RAG vs long context vs fine-tuning",
  summary: "Three ways to give a model knowledge or behaviour it doesn't have, and how to choose between them.",
  body: md`
| Approach | What it changes | Good for | Bad for |
|---|---|---|---|
| **Long context** (stuff it in the prompt) | What the model *sees* this request | Small, stable corpora (< a few hundred pages), with prompt caching | Large or permissioned corpora; cost per request |
| **RAG** (retrieve, then generate) | What the model sees, *selected per question* | Large, changing, permissioned knowledge; citations | Questions that need *all* the data at once (aggregation) |
| **Fine-tuning** | How the model *behaves* (style, format, narrow skill) | Consistent tone/format at high volume, or distilling to a cheaper model | Adding facts (they go stale and get hallucinated) |

## Decision guide
1. Does the knowledge fit in the context window and rarely change? → **Long context + prompt caching.** Simplest. ([[proj:b05]] starts here.)
2. Is it big, changing, or does each user see different documents? → **RAG.** ([[proj:i01]], [[proj:a01]])
3. Is the problem *behaviour* (format, tone, a narrow task at huge volume)? → Try prompting and examples first. Fine-tune only when an eval shows prompting has plateaued.
4. Is the question an *aggregation* ("how many contracts have auto-renewal?")? → Neither. **Extract structured data once into a database, then query it** ([[proj:i05]], [[proj:i04]]).

> 2026 reality: context windows of 1M tokens make "just put it in context" viable far more often than in 2023. RAG is still essential for scale, freshness, permissions and cost.
`,
});

concept({
  id: "embeddings",
  title: "Embeddings, vector search and hybrid retrieval",
  summary: "What an embedding is, why semantic search misses things keyword search finds, and why production systems use both.",
  body: md`
An **embedding** is a list of numbers (a vector) representing the meaning of a text. Similar meanings give nearby vectors. You embed every chunk of your documents once, store the vectors, then embed each question and find the closest chunks.

~~~text
"How do I reset my password?"   → [0.12, -0.80, 0.33, …]  ┐
"Forgot login credentials"      → [0.10, -0.78, 0.35, …]  ┘ close: same meaning
"Quarterly revenue grew 4%"     → [-0.55, 0.21, 0.90, …]    far away
~~~

## Similarity
Cosine similarity: ~dot(a, b) / (|a| × |b|)~, where 1.0 means the same direction. Vector databases (pgvector, Qdrant, Weaviate, Pinecone, LanceDB…) do this fast over millions of vectors with approximate nearest-neighbour indexes (HNSW).

## Why vector search alone isn't enough
Embeddings are great at *meaning* and bad at *exact tokens*: error codes (~E-4021~), SKUs, names, acronyms. Keyword search (BM25) is the opposite.

## Hybrid search + reranking (the 2026 default)
~~~text
question ─┬─▶ BM25 keyword search  ─┐
          └─▶ vector search        ─┴─▶ merge (RRF) ─▶ reranker ─▶ top 5 ─▶ LLM
~~~
- **RRF (reciprocal rank fusion)** merges two ranked lists: ~score = Σ 1/(60 + rank)~.
- A **reranker** (a cross-encoder model) re-scores the top ~50 candidates against the question more accurately than the embedding can.

## Chunking matters more than the vector DB
- Split on structure (headings, sections), not every N characters.
- Keep chunks ≈ 200–800 tokens with a little overlap.
- Store **metadata** (source, section title, date, permissions) with each chunk, and prepend the title to the chunk text.

> Built step by step in [[proj:b05]] (keyword only), [[proj:i01]] (hybrid + rerank + retrieval evals) and [[proj:a01]] (permissions, freshness, multi-tenant).
`,
});

concept({
  id: "structured-outputs",
  title: "Structured outputs and schemas",
  summary: "Why every production LLM call returns typed data, and how schemas turn a chat model into a reliable function.",
  body: md`
A chat model returns text. A *system* needs data: a label, a date, a list of line items. **Structured outputs** constrain the model to a JSON schema, so you get a validated object instead of prose you have to parse.

~~~python
from pydantic import BaseModel
from typing import Literal

class Triage(BaseModel):
    category: Literal["billing", "bug", "account", "other"]
    urgency: Literal["low", "normal", "high"]
    summary: str

resp = client.messages.parse(model="claude-opus-5-5", max_tokens=1024,
                             messages=[{"role": "user", "content": ticket}],
                             output_format=Triage)
triage: Triage = resp.parsed_output   # a real, validated Python object
~~~

## Why it matters
- **Enums (~Literal~) stop label drift.** Without them you get "Billing", "billing issue" and "payments".
- **Types are documentation.** The schema *is* the contract between the model and your code.
- **Validation is free.** Pydantic rejects wrong types, and you add business rules on top ([[p:validate-retry]]).

## Schema design tips
- Add an explicit **"unknown" / "other"** option. Otherwise the model is forced to guess.
- Put a ~reasoning~ or ~evidence~ field *before* the decision field when the decision is hard (the model "thinks" in order).
- Use ~Optional~ for fields that may genuinely be missing, and tell the model to leave them null rather than invent values.
- Keep schemas flat and small. Split very large extractions into several calls.

> This is the most-used pattern in the lab: [[p:structured-output]].
`,
});

concept({
  id: "context-engineering",
  title: "Prompting in 2026: context engineering",
  summary: "Modern models need less prompt trickery and more good context: clear task, relevant data, examples, constraints and output format.",
  body: md`
"Prompt engineering" in 2023 meant magic phrases. In 2026 it's mostly **context engineering**: deciding *what information the model sees, in what order, and in what format*.

## Anatomy of a production prompt
~~~text
SYSTEM (stable, cached)
  1. Role & goal            "You triage support tickets for Acme, a payroll SaaS."
  2. Definitions            what each category means, with edge cases
  3. Rules & constraints    "If unsure, choose 'other'. Never invent order IDs."
  4. Examples               3–5 short input → output pairs, including a tricky one
USER (per request, volatile)
  5. The input              wrapped in tags: <ticket>…</ticket>
  6. Retrieved context      <documents>…</documents> (RAG)
OUTPUT
  7. Format                 enforced by a schema, not by begging
~~~

## Principles
- **Explain why, not just what.** "Urgent means payroll will fail to run today, because missing payroll is a legal issue for customers" beats "URGENT = IMPORTANT!!!"
- **Stable first, volatile last.** This maximises prompt caching ([[p:caching]]).
- **Delimit untrusted input** with tags and tell the model it's data, not instructions ([[p:guardrails]]).
- **Examples beat adjectives.** One worked edge case is worth a paragraph of rules.
- **Version prompts like code** and test every change against the eval set ([[p:prompt-as-code]], [[p:prompt-ci]]).
- **Don't over-prescribe** with very capable models. Give the goal and constraints and let the model reason (2026 models also have adjustable thinking effort).
`,
});

concept({
  id: "agent-stacks",
  title: "Agent stacks: SDKs, frameworks and managed agents",
  summary: "Build the loop yourself, use an SDK tool runner, use a framework, or use a hosted agent platform. What each gives you.",
  body: md`
| Option | You write | You get | Choose when |
|---|---|---|---|
| **Manual loop** on the model API | The ~while~ loop, tool dispatch | Total control, no dependencies | Learning; unusual control flow |
| **SDK tool runner** (e.g. Anthropic ~tool_runner~ + ~@beta_tool~) | Just the tool functions | Loop, schema generation, hooks | Most custom-tool agents |
| **Graph/workflow frameworks** (LangGraph, etc.) | Nodes + edges | State, checkpoints, branching | Complex workflows with agentic nodes |
| **Agent SDKs with built-in tools** (e.g. Claude Agent SDK) | A prompt + options | File/bash/search tools, sub-agents, permissions | Coding/filesystem agents on your infra |
| **Managed agents** (hosted loop + sandbox) | Agent config + your tools | Hosted loop, sandbox, sessions, schedules | Long-running or scheduled agents without running infra |
| **Durable workflow engines** (Temporal, etc.) | Workflows + activities | Retries, timers, resumability, audit | Business processes that run for hours or days ([[proj:a02]]) |

## Advice
- **Learn the manual loop first** (this lab does, in [[proj:i02]]). Every framework is that loop plus conveniences, and when something breaks you'll need to know what's inside.
- Frameworks change every few months, while the patterns (tools, guards, budgets, state, evals) don't. Interviewers care about the patterns.
- Keep business logic in plain Python functions that *any* framework can call. Then switching frameworks costs a day, not a quarter.
`,
});

concept({
  id: "sync-async-batch",
  title: "Sync, streaming, async queues and batch",
  summary: "Four execution modes. Picking the right one follows from one discovery question: who is waiting?",
  body: md`
| Mode | Who waits | Example | Notes |
|---|---|---|---|
| **Sync request/response** | A system, a few seconds | Classify a ticket on creation | Simple; set timeouts; retry |
| **Streaming** | A human, watching | Chat assistant | Stream tokens to cut perceived latency; TTFT matters |
| **Async queue + workers** | Nobody immediately; minutes | Process an uploaded contract | Durable jobs, retries, status polling/webhooks |
| **Batch API** | Nobody; hours OK | Summarise 50k reviews overnight | ≈50% cheaper; results arrive in any order: key by ID |

~~~text
API ──▶ enqueue(job) ──▶ [queue] ──▶ worker ──▶ model ──▶ DB ──▶ webhook/notify
          returns job_id immediately       (retries, idempotent)
~~~

> Ask "who is waiting, and for how long?" in discovery. The answer picks the mode, and the mode shapes the whole architecture. See [[p:batch-async]], [[proj:b03]], [[proj:a02]].
`,
});

concept({
  id: "model-selection",
  title: "Choosing a model",
  summary: "Capability, cost, latency, context, data residency. Pick by eval, keep it swappable behind a gateway.",
  body: md`
## Choose by eval, not by vibes
Run the same golden set through 2–3 candidate models and compare quality, cost per completed task, and p95 latency. Then choose.

## Factors
- **Capability.** Hard reasoning, coding and agents get the most capable tier. Classification and extraction often do fine on a fast tier.
- **Effort / thinking controls.** 2026 models let you dial reasoning effort. A capable model at *low* effort is often better and simpler than a cascade of models.
- **Cost.** Per *completed task*, not per request. A cheap model that needs three retries isn't cheap.
- **Latency.** TTFT and total time against your budget.
- **Context window.** How much you can send. Long context plus caching may beat RAG for small corpora.
- **Platform and compliance.** Region, data retention, cloud marketplace (Bedrock, Vertex, Foundry), enterprise agreements.

## Always behind a gateway
Never scatter model IDs across your codebase. One module ([[p:llm-gateway]]) holds model choice, retries, logging and fallbacks. Changing models then means one line and one eval run.
`,
});

concept({
  id: "observability",
  title: "Observability for LLM systems",
  summary: "Traces, spans, token accounting and quality signals: how you see what an AI system is actually doing.",
  body: md`
Traditional monitoring tells you a request succeeded. LLM observability tells you **what the model saw, what it said, what it cost, and whether it was any good.**

## What to record for every model call
| Field | Why |
|---|---|
| trace_id, span name, parent span | Reconstruct multi-step workflows and agent runs |
| prompt version / template id | Know which prompt produced which output |
| model, effort, params | Reproduce and compare |
| input/output tokens, cache read tokens | Cost attribution; check caching works |
| latency (TTFT and total) | SLOs |
| stop reason | Detect truncation (~max_tokens~), refusals, tool use |
| validation result, retries | Reliability |
| user feedback / judge score (async) | Quality over time |

## Standards and tools (2026)
- **OpenTelemetry** with the GenAI semantic conventions is the vendor-neutral way to emit traces.
- LLM-specific platforms (Langfuse, Braintrust, Arize/Phoenix, LangSmith and others) add prompt management, eval runs and dashboards on top.

> Built in [[proj:i10]] (tracing + prompt CI) and used everywhere afterwards. Pattern: [[p:observability]].
`,
});
