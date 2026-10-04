window.PATTERNS_INTRO = md`
> **How to use this page:** pick a pattern, read its real-life story and new words first, then its minimal code, then open two projects from different industries that use it. Notice that the code barely changes between them. Only the schema, the prompt and the guards change. Seeing that is what lets experienced engineers design new systems quickly.
`;

/* ───────────── Foundations ───────────── */

pattern({
  id: "llm-gateway",
  name: "LLM gateway",
  category: "Foundations",
  summary: "One module owns every model call: model choice, retries, timeouts, logging, cost. The rest of the code never imports the SDK directly.",
  problem: md`
Model calls scattered across a codebase mean that changing a model, adding logging or handling rate limits requires editing 40 files. Testing is impossible without hitting the network.`,
  solution: md`
Wrap the provider SDK in one small module with a tiny interface: ~complete()~ for text and ~parse()~ for typed output. Everything goes through it. It grows with you: in [[proj:b01]] it's 40 lines, in [[proj:i06]] it adds routing, in [[proj:i10]] tracing, and in [[proj:a04]] it becomes a company-wide platform service.`,
  code: py`
# llm.py: the only file that imports the provider SDK
import time, logging
import anthropic
from pydantic import BaseModel

log = logging.getLogger("llm")
_client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY / ant auth profile
MODELS = {"smart": "claude-opus-5-5", "fast": "claude-haiku-4-5"}

def parse(system: str, user: str, schema: type[BaseModel], tier: str = "smart",
          max_tokens: int = 2048) -> BaseModel:
    t0 = time.perf_counter()
    resp = _client.messages.parse(
        model=MODELS[tier], max_tokens=max_tokens, system=system,
        messages=[{"role": "user", "content": user}], output_format=schema,
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError("model declined the request")
    log.info("llm.parse model=%s in=%d out=%d ms=%.0f", MODELS[tier],
             resp.usage.input_tokens, resp.usage.output_tokens, (time.perf_counter() - t0) * 1000)
    return resp.parsed_output
`,
  pitfalls: md`
- Don't build a giant abstraction on day one. Start with two functions.
- Keep provider-specific features (caching, tools) reachable. Don't hide them behind a lowest-common-denominator API.
- The SDK already retries 429/5xx (2 retries by default). Configure it rather than wrapping it in your own retry loop.`,
  related: ["fake-model", "observability", "model-cascade"],
});

pattern({
  id: "prompt-as-code",
  name: "Prompts as versioned code",
  category: "Foundations",
  summary: "Prompts live in files with versions, variables and tests, not as strings buried inside functions.",
  problem: md`A prompt edited in place breaks something else silently, and nobody knows which prompt produced last Tuesday's bad output.`,
  solution: md`Store prompts as template files (or constants in a ~prompts/~ module) with a version id. Render them with explicit variables. Log the version with every call. Every change runs the eval ([[p:prompt-ci]]).`,
  code: py`
# prompts/triage_v3.md is a plain file checked into git
from pathlib import Path
from string import Template

PROMPT_DIR = Path(__file__).parent / "prompts"

def load_prompt(name: str, **vars) -> tuple[str, str]:
    """Return (prompt_text, version_id). Fails loudly on missing variables."""
    path = PROMPT_DIR / f"{name}.md"
    text = Template(path.read_text()).substitute(**vars)   # KeyError if a var is missing
    return text, path.stem                                  # e.g. "triage_v3"

system, version = load_prompt("triage_v3", company="Acme Payroll")
`,
  pitfalls: md`- Put volatile values (dates, user names) *after* the stable part, or you break prompt caching.
- Don't over-template. A prompt that's 80% variables is hard to read and review.`,
  related: ["prompt-ci", "caching"],
});

pattern({
  id: "structured-output",
  name: "Structured output (schema-first)",
  category: "Foundations",
  summary: "Define a typed schema; the model must return data that fits it. Turns a chat model into a typed function.",
  problem: md`Free-text answers need fragile parsing, and labels drift ("Billing" vs "billing issue").`,
  solution: md`Define a Pydantic model with ~Literal~ enums, optional fields, and an explicit "unknown" option. Use the API's structured-output mode (~messages.parse(..., output_format=Model)~) so the response is guaranteed to match the schema. See [[c:structured-outputs]].`,
  code: py`
from typing import Literal, Optional
from pydantic import BaseModel, Field

class Extraction(BaseModel):
    evidence: str = Field(description="Quote the text that supports the answer")
    category: Literal["billing", "bug", "account", "other"]
    order_id: Optional[str] = Field(None, description="Only if literally present; never invent")
    confidence: float = Field(ge=0, le=1)

result: Extraction = llm.parse(SYSTEM, ticket_text, Extraction)
`,
  pitfalls: md`- A schema guarantees *shape*, not *truth*. You still validate the values ([[p:validate-retry]]).
- Forcing a choice without "other/unknown" makes the model guess.
- Asking for a confidence number is cheap and handy for routing, but it isn't calibrated. Check it against your eval set before trusting it.`,
  related: ["validate-retry", "classify-route", "parse-then-act"],
});

pattern({
  id: "fake-model",
  name: "Fake model for tests",
  category: "Foundations",
  summary: "Inject the model as a dependency so business logic can be unit-tested offline, fast and deterministically.",
  problem: md`Tests that call a real model are slow, cost money, are non-deterministic, and fail without network access.`,
  solution: md`Business logic takes an ~llm~ parameter (anything with a ~parse()~ method). Tests pass a fake that returns canned objects. You test *your* code (routing, validation, guards) separately from the *model's* quality (that's the eval's job).`,
  code: py`
class FakeLLM:
    def __init__(self, responses: list):
        self.responses, self.calls = list(responses), []
    def parse(self, system, user, schema, **kw):
        self.calls.append(user)
        return self.responses.pop(0)

def test_urgent_billing_goes_to_oncall():
    fake = FakeLLM([Triage(category="billing", urgency="high", summary="x", confidence=0.9)])
    assert route_ticket("payroll failed!", llm=fake).queue == "billing-oncall"
`,
  pitfalls: md`- Fakes test your plumbing, not the prompt. You need both unit tests *and* evals.`,
  related: ["llm-gateway", "eval-harness"],
});

/* ───────────── Reliability ───────────── */

pattern({
  id: "validate-retry",
  name: "Validate, repair, retry",
  category: "Reliability",
  summary: "Check model output against business rules; on failure, send the specific error back to the model once or twice, then escalate.",
  problem: md`Output can match the schema and still be wrong: totals don't add up, the date is in the past, an ID doesn't exist.`,
  solution: md`After parsing, run **deterministic validators**. If one fails, retry with the error message included ("line items sum to 118.00 but total is 128.00, re-check"). Cap the retries. If it still fails, route to a human. Never loop forever.`,
  code: py`
def extract_with_repair(doc: str, llm, max_attempts: int = 3) -> Invoice | None:
    feedback = ""
    for attempt in range(max_attempts):
        inv = llm.parse(SYSTEM, doc + feedback, Invoice)
        errors = validate_invoice(inv)          # pure Python business rules
        if not errors:
            return inv
        feedback = "\n\n<previous_attempt_errors>\n" + "\n".join(errors) + "\n</previous_attempt_errors>"
    return None                                  # caller sends to human review queue
`,
  pitfalls: md`- Retrying without feedback just re-rolls the dice.
- Track the retry rate. If it rises, your prompt or schema needs fixing.`,
  related: ["structured-output", "human-in-loop"],
});

pattern({
  id: "classify-route",
  name: "Classify and route",
  category: "Reliability",
  summary: "A cheap classification step decides which path, queue, prompt or model handles the input.",
  problem: md`One giant prompt that handles every case is expensive, hard to test, and mediocre at all of them.`,
  solution: md`First classify (intent, category, difficulty, language). Then branch to a specialised handler. The router is usually a small, fast model call or even rules. It's the "if/else" of AI systems.`,
  code: py`
HANDLERS = {
    "reschedule": handle_reschedule,
    "cancel": handle_cancel,
    "question": answer_from_faq,
    "other": send_to_human,
}

def handle(message: str, llm) -> Reply:
    intent = llm.parse(ROUTER_PROMPT, message, Intent, tier="fast")
    handler = HANDLERS.get(intent.label, send_to_human)
    return handler(message, intent, llm)
`,
  pitfalls: md`- Always have a default / human route.
- Evaluate the router separately. A wrong route makes everything downstream wrong.`,
  related: ["structured-output", "model-cascade"],
});

pattern({
  id: "parse-then-act",
  name: "Model parses, code acts",
  category: "Reliability",
  summary: "The model turns messy input into a typed intent; deterministic code checks it and performs the action. See the 'probabilistic core' chapter.",
  problem: md`Letting a model directly book appointments, run SQL or move money means a single hallucination becomes a real-world incident.`,
  solution: md`The model's only job is to produce a structured *proposal*. Plain code validates it against the real system (does the slot exist? is the SQL read-only?), then executes it. See [[f:probabilistic-core]].`,
  code: py`
proposal = llm.parse(SYSTEM, sms_text, BookingIntent)          # probabilistic
if proposal.intent == "book":
    slot = calendar.find_slot(proposal.preferred_date, proposal.time_of_day)   # deterministic
    if slot is None:
        return reply_with_alternatives(calendar.next_free(3))
    calendar.book(patient_id, slot, idempotency_key=msg_id)    # deterministic + safe
`,
  pitfalls: md`- Don't let "code acts" become "code trusts". Validate every field the model produced.`,
  related: ["structured-output", "tool-calling", "idempotency"],
});

pattern({
  id: "human-in-loop",
  name: "Human in the loop",
  category: "Reliability",
  summary: "Low confidence, high stakes or failed validation means the case goes to a person. The AI drafts and the human decides.",
  problem: md`Full automation of high-stakes decisions isn't trusted (or legal), but doing everything by hand doesn't scale.`,
  solution: md`Define **thresholds** (confidence, amount, risk category) that route cases to a review queue. Humans see the AI's draft plus evidence and approve, edit or reject. Their decisions become new labelled data ([[p:feedback-flywheel]]).`,
  code: py`
def decide(case, result) -> str:
    if result.risk == "high" or case.amount > 500:
        return "human_review"                    # stakes rule: always
    if result.confidence < 0.75 or result.errors:
        return "human_review"                    # uncertainty rule
    return "auto"

review_queue.put(case.id, draft=result, evidence=result.evidence) if decide(case, result) == "human_review" else apply(result)
`,
  pitfalls: md`- Measure the human override rate. If reviewers rubber-stamp everything, the threshold is too low, or they're fatigued.
- Show evidence, not just the answer, or reviewers can't actually check it.`,
  related: ["validate-retry", "feedback-flywheel", "guardrails"],
});

pattern({
  id: "idempotency",
  name: "Idempotent actions",
  category: "Reliability",
  summary: "Every side effect carries a unique key so retries, duplicate webhooks or a looping agent can't do it twice.",
  problem: md`Networks retry, webhooks duplicate, and agents repeat themselves. Without protection, a customer gets refunded twice.`,
  solution: md`Derive an idempotency key from the business event (message id, claim id + step). Before acting, check whether that key has already been processed. Store the result with the key.`,
  code: py`
def refund_once(order_id: str, amount: float, key: str, db) -> dict:
    prior = db.get("SELECT result FROM actions WHERE key = ?", key)
    if prior:
        return prior                       # already done: return the same result
    result = payments.refund(order_id, amount)
    db.execute("INSERT INTO actions(key, result) VALUES (?, ?)", key, result)
    return result
`,
  pitfalls: md`- The check and the insert should be atomic (unique constraint, transaction).`,
  related: ["parse-then-act", "workflow-state-machine"],
});

/* ───────────── Knowledge & retrieval ───────────── */

pattern({
  id: "rag",
  name: "Retrieval-augmented generation (RAG)",
  category: "Knowledge & retrieval",
  summary: "Fetch the most relevant pieces of your documents for each question, then ask the model to answer using only them.",
  problem: md`The model doesn't know your company's policies, products or documents, and the corpus is too big (or too permissioned) to send in every prompt.`,
  solution: md`**Ingest**: split documents into chunks, embed or index them, store them with metadata. **Query**: retrieve the top-k chunks for the question and put them in the prompt with instructions to answer only from them. Evaluate retrieval and generation *separately*. See [[c:embeddings]].`,
  code: py`
def answer(question: str, index, llm) -> Answer:
    chunks = index.search(question, k=5)                     # retrieval
    context = "\n\n".join(f'<doc id="{c.id}" title="{c.title}">\n{c.text}\n</doc>' for c in chunks)
    return llm.parse(
        system=ANSWER_PROMPT,                                # "answer ONLY from the docs; cite ids"
        user=f"<documents>\n{context}\n</documents>\n\nQuestion: {question}",
        schema=Answer,
    )
`,
  pitfalls: md`- Most RAG failures are retrieval failures. Measure recall@k first.
- Chunking by fixed character count splits tables and sentences. Chunk by structure.
- Without an "I don't know" path, the model will answer from general knowledge.`,
  related: ["grounded-citations", "hybrid-search", "caching"],
});

pattern({
  id: "grounded-citations",
  name: "Grounded answers with citations",
  category: "Knowledge & retrieval",
  summary: "Every claim points to a source id; answers without support become 'I don't know'. Makes hallucinations checkable.",
  problem: md`Users can't tell a correct answer from a confident hallucination.`,
  solution: md`Require the model to return source ids (or quotes) for each claim, then **verify in code** that the cited ids were actually provided and the quotes actually appear. Provide an explicit ~not_found~ outcome.`,
  code: py`
class Answer(BaseModel):
    status: Literal["answered", "not_found"]
    answer: str
    citations: list[str]            # doc ids
    supporting_quotes: list[str]

def verify(ans: Answer, chunks) -> bool:
    by_id = {c.id: c.text for c in chunks}
    return all(cid in by_id for cid in ans.citations) and all(
        any(q in by_id[cid] for cid in ans.citations) for q in ans.supporting_quotes)
`,
  pitfalls: md`- Quote matching must normalise whitespace.
- A citation proves the source exists, not that it supports the claim. Use a faithfulness judge for that.`,
  related: ["rag", "llm-judge"],
});

pattern({
  id: "hybrid-search",
  name: "Hybrid search + rerank",
  category: "Knowledge & retrieval",
  summary: "Combine keyword (BM25) and vector search, fuse the rankings, then rerank the top candidates. The production retrieval default.",
  problem: md`Vector search misses exact terms (error codes, SKUs, names). Keyword search misses paraphrases.`,
  solution: md`Run both, merge with reciprocal rank fusion, rerank the top ≈30–50 with a cross-encoder or an LLM, and keep the top 5.`,
  code: py`
def rrf(*rankings: list[str], k: int = 60) -> list[str]:
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)

candidates = rrf(bm25.search(q, 50), vectors.search(q, 50))[:40]
top5 = reranker.rerank(q, candidates)[:5]
`,
  pitfalls: md`- Rerankers add latency, so measure whether they help on your eval.`,
  related: ["rag"],
});

pattern({
  id: "map-reduce",
  name: "Map-reduce over documents",
  category: "Knowledge & retrieval",
  summary: "Process chunks or items independently (map), then combine the partial results (reduce). Handles inputs too long or too many for one call.",
  problem: md`A 3-hour transcript or 5,000 reviews won't fit in one prompt, or will give shallow results if crammed in.`,
  solution: md`**Map**: run the same extraction on each chunk in parallel and return structured partial results. **Reduce**: merge in code where possible (counts, dedupe), and use one more model call only for the synthesis that needs language.`,
  code: py`
from concurrent.futures import ThreadPoolExecutor

def map_reduce(chunks: list[str], llm) -> Report:
    with ThreadPoolExecutor(max_workers=8) as pool:
        partials = list(pool.map(lambda c: llm.parse(MAP_PROMPT, c, ChunkFindings), chunks))
    merged = merge_findings(partials)                 # deterministic: dedupe, count, sort
    return llm.parse(REDUCE_PROMPT, merged.model_dump_json(), Report)
`,
  pitfalls: md`- Things that span chunk boundaries get lost. Use overlap, or a second pass.
- Reduce in code whenever you can. It's cheaper and exact.`,
  related: ["batch-async", "structured-output"],
});

/* ───────────── Actions & agents ───────────── */

pattern({
  id: "tool-calling",
  name: "Tool calling (function calling)",
  category: "Actions & agents",
  summary: "Describe functions with schemas; the model requests calls; your code executes them with guards and returns results.",
  problem: md`The model needs live data (order status, inventory) or needs to *do* things, and it can't reach your systems.`,
  solution: md`Define tools with clear names, descriptions and strict input schemas. The model returns ~tool_use~ blocks. You execute them (with validation and permission checks) and send back ~tool_result~ blocks. See [[c:api-vs-mcp]].`,
  code: py`
from anthropic import beta_tool

@beta_tool
def get_order(order_id: str) -> str:
    """Look up an order's status, items and delivery date.

    Args:
        order_id: The order id, like 'A-10293'.
    """
    order = orders_db.get(order_id)
    return order.model_dump_json() if order else '{"error": "order not found"}'

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5", max_tokens=4096, tools=[get_order],
    messages=[{"role": "user", "content": "Where is my order A-10293?"}])
final = runner.until_done()
`,
  pitfalls: md`- Tool descriptions are prompts. Write them carefully and include when *not* to use the tool.
- Return errors as data (~{"error": ...}~) so the model can recover.
- Read-only tools are low risk. Write tools need [[p:human-in-loop]] and [[p:idempotency]].`,
  related: ["agent-loop", "mcp-server", "parse-then-act"],
});

pattern({
  id: "agent-loop",
  name: "Bounded agent loop",
  category: "Actions & agents",
  summary: "Model → tool → result → model, repeated until done. Production agents add step, token, time and cost budgets plus guards on every tool.",
  problem: md`Some tasks can't be scripted in advance. The path depends on what you discover along the way, as in debugging or investigation.`,
  solution: md`Run the tool-calling loop, but **bound it**: max steps, max tokens/cost, wall-clock timeout, and a list of allowed tools per task. Log every step. Evaluate on final outcomes in a sandbox. See [[c:workflow-vs-agent]].`,
  code: py`
def run_agent(goal: str, tools: dict, max_steps: int = 12) -> str:
    messages = [{"role": "user", "content": goal}]
    for step in range(max_steps):
        resp = client.messages.create(model=MODEL, max_tokens=4096, system=SYSTEM,
                                      tools=[t.schema for t in tools.values()], messages=messages)
        messages.append({"role": "assistant", "content": resp.content})
        calls = [b for b in resp.content if b.type == "tool_use"]
        if resp.stop_reason != "tool_use" or not calls:
            return "".join(b.text for b in resp.content if b.type == "text")
        results = []
        for call in calls:                                    # all results in ONE user message
            tool = tools.get(call.name)
            out = tool.run(**call.input) if tool else {"error": "unknown tool"}
            results.append({"type": "tool_result", "tool_use_id": call.id, "content": json.dumps(out)})
        messages.append({"role": "user", "content": results})
    return "Stopped: step budget exhausted. Escalating to a human."
`,
  pitfalls: md`- No budget = runaway cost. No tracing = impossible debugging.
- Agents need *more* evaluation than workflows, not less.`,
  related: ["tool-calling", "orchestrator-workers", "observability"],
});

pattern({
  id: "mcp-server",
  name: "Capabilities as an MCP server",
  category: "Actions & agents",
  summary: "Expose a system's tools, resources and prompts once via the Model Context Protocol so any MCP-capable AI app or agent can use them.",
  problem: md`Every team and every AI app re-implements the same integration with your CRM or warehouse system, each slightly differently.`,
  solution: md`Write an MCP server with **task-level** tools (not one tool per REST endpoint), typed inputs and clear descriptions. Run it locally over stdio or remotely over Streamable HTTP with auth. Clients discover its tools at runtime. See [[c:api-vs-mcp]].`,
  code: py`
# pip install "mcp[cli]"
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("shipments")

@mcp.tool()
def track_shipment(tracking_id: str) -> dict:
    """Current status, location and ETA for a shipment."""
    return shipments.status(tracking_id)

@mcp.resource("shipment://{tracking_id}/history")
def history(tracking_id: str) -> str:
    """Full scan history (read-only context)."""
    return shipments.history_text(tracking_id)

if __name__ == "__main__":
    mcp.run()          # stdio by default; mcp.run(transport="streamable-http") for remote
`,
  pitfalls: md`- Too many fine-grained tools confuse models. Design tools around user tasks.
- An MCP server is an API surface, so authentication, authorisation, rate limits and audit logs still apply.
- Tool descriptions and outputs from third-party servers are untrusted input ([[proj:a06]]).`,
  related: ["tool-calling", "guardrails"],
});

pattern({
  id: "workflow-state-machine",
  name: "Workflow as a state machine",
  category: "Actions & agents",
  summary: "Model the business process as explicit states and transitions; each step may call a model, but code owns the flow.",
  problem: md`Multi-step processes (claims, onboarding, prior authorisation) need auditability, resumability and predictable behaviour. An agent can't promise any of those.`,
  solution: md`Define states (~RECEIVED → CLASSIFIED → EXTRACTED → CHECKED → DECIDED~), persist the state and the outputs of each step, and make transitions explicit. Steps are idempotent so they can be retried. For long-running processes, use a durable engine (Temporal, Step Functions…).`,
  code: py`
from enum import Enum

class S(str, Enum):
    RECEIVED = "received"; EXTRACTED = "extracted"; CHECKED = "checked"
    NEEDS_REVIEW = "needs_review"; SUBMITTED = "submitted"

STEPS = {S.RECEIVED: extract_step, S.EXTRACTED: check_step, S.CHECKED: submit_step}

def advance(case_id: str, db) -> S:
    case = db.load(case_id)
    while case.state in STEPS:
        new_state, output = STEPS[case.state](case)     # each step: idempotent
        db.save_transition(case_id, case.state, new_state, output)   # audit log
        case = db.load(case_id)
    return case.state
`,
  pitfalls: md`- Keep model calls *inside* steps. Never let a model choose the next state freely.`,
  related: ["idempotency", "human-in-loop", "observability"],
});

pattern({
  id: "orchestrator-workers",
  name: "Orchestrator and workers",
  category: "Actions & agents",
  summary: "A lead model plans and splits the task; parallel workers (often cheaper models) do sub-tasks in their own context; the lead synthesises.",
  problem: md`Big open-ended tasks (research, large codebase changes) overflow a single context window and take too long sequentially.`,
  solution: md`The orchestrator produces a plan of independent sub-tasks as structured output. Workers run in parallel with focused instructions and return condensed findings. The orchestrator synthesises and may run a second round to fill gaps.`,
  code: py`
plan = llm.parse(PLANNER, question, ResearchPlan)                     # 3–6 sub-questions
with ThreadPoolExecutor(max_workers=6) as pool:
    findings = list(pool.map(lambda sq: research_worker(sq, tier="fast"), plan.subquestions))
report = llm.parse(SYNTHESIZER, render(question, findings), Report)  # cites worker sources
`,
  pitfalls: md`- Multi-agent systems use many times more tokens. Use them only when parallelism or context isolation is worth it.
- Workers must return *condensed* results, or the orchestrator's context fills up.`,
  related: ["agent-loop", "map-reduce", "evaluator-optimizer"],
});

/* ───────────── Quality & operations ───────────── */

pattern({
  id: "eval-harness",
  name: "Eval harness (golden set)",
  category: "Quality & operations",
  summary: "A labelled set of real inputs plus a script that scores the system. The unit tests of AI engineering; run it on every change.",
  problem: md`Without measurement, every prompt change is a guess, and regressions ship silently.`,
  solution: md`Keep ~evals/golden.jsonl~ (input + expected). The script runs the system and computes metrics *per class* and overall, prints the failures, and saves results with the prompt/model version. See [[f:evaluation-mindset]].`,
  code: py`
import json
from collections import Counter

def run_eval(path: str, system_fn) -> dict:
    rows = [json.loads(l) for l in open(path)]
    hits, per_class, failures = 0, Counter(), []
    for r in rows:
        pred = system_fn(r["input"])
        ok = pred == r["expected"]
        hits += ok
        per_class[(r["expected"], ok)] += 1
        if not ok:
            failures.append({"input": r["input"][:80], "expected": r["expected"], "got": pred})
    recall = {c: per_class[(c, True)] / (per_class[(c, True)] + per_class[(c, False)])
              for c in {e for e, _ in per_class}}
    return {"accuracy": hits / len(rows), "recall_per_class": recall, "failures": failures}
`,
  pitfalls: md`- Don't tune on your test set. Keep a held-out split.
- 30 examples is a start, 200+ gives you confidence. Weight the important classes.`,
  related: ["llm-judge", "prompt-ci", "fake-model"],
});

pattern({
  id: "llm-judge",
  name: "LLM-as-judge (calibrated)",
  category: "Quality & operations",
  summary: "A model grades outputs against an explicit rubric, with reasoning before the score, and the judge itself is checked against human labels.",
  problem: md`Open-ended outputs (answers, drafts, coaching notes) can't be graded by exact match, and humans can't grade thousands.`,
  solution: md`Write a rubric of concrete, independently checkable criteria. Ask the judge for evidence and reasoning *then* a pass/fail per criterion. Prefer binary criteria over 1–10 scales. **Calibrate**: have humans grade 50–100 items and measure agreement before trusting the judge.`,
  code: py`
class CriterionResult(BaseModel):
    criterion: str
    evidence: str
    passed: bool

class Verdict(BaseModel):
    results: list[CriterionResult]

RUBRIC = ["States the refund amount correctly", "Cites the policy section",
          "Does not promise anything the policy doesn't allow", "Under 120 words"]

def judge(output: str, context: str) -> Verdict:
    return llm.parse(JUDGE_PROMPT.format(rubric="\n".join(RUBRIC)),
                     f"<context>{context}</context>\n<output>{output}</output>", Verdict)
`,
  pitfalls: md`- Judges favour longer answers and their own style. Control for both.
- Use a different (or stronger) model as the judge when you can.
- Report judge–human agreement (e.g. Cohen's kappa) alongside judge scores.`,
  related: ["eval-harness", "evaluator-optimizer"],
});

pattern({
  id: "evaluator-optimizer",
  name: "Generate, critique, revise",
  category: "Quality & operations",
  summary: "One call drafts, a checker (code or model) critiques against rules, and the draft is revised. Bounded to a couple of rounds.",
  problem: md`Generated text must satisfy many constraints (compliance, length, tone, facts), and one pass misses some.`,
  solution: md`Draft → check (deterministic rules first, then a rubric judge) → if any violations, revise with the specific violations → re-check. Stop after N rounds and send to a human if it still fails.`,
  code: py`
def write_compliant(facts: Listing, llm, rounds: int = 2) -> str:
    draft = llm.complete(WRITER, facts.model_dump_json())
    for _ in range(rounds):
        issues = rule_checks(draft) + llm.parse(CRITIC, draft, Critique).violations
        if not issues:
            return draft
        draft = llm.complete(REVISER, f"<draft>{draft}</draft>\n<fix>{issues}</fix>")
    raise NeedsHumanReview(draft, issues)
`,
  pitfalls: md`- Each round costs a full call. Measure whether round 2 actually helps.`,
  related: ["llm-judge", "guardrails"],
});

pattern({
  id: "caching",
  name: "Caching (prompt + response)",
  category: "Scale & cost",
  summary: "Cache the stable prompt prefix at the provider (big discount on repeated input) and cache whole responses for repeated inputs in your app.",
  problem: md`The same long system prompt, documents or tool definitions are re-sent and re-billed on every call, and identical questions are answered again.`,
  solution: md`**Prompt caching**: put stable content first, mark it with ~cache_control~, and keep it byte-identical. Verify with ~usage.cache_read_input_tokens~. **Response caching**: key on a hash of (prompt version, model, normalised input), and only for deterministic tasks.`,
  code: py`
# Provider prompt caching: stable prefix first
resp = client.messages.create(
    model="claude-opus-5-5", max_tokens=1024,
    system=[{"type": "text", "text": BIG_STABLE_POLICY_TEXT,
             "cache_control": {"type": "ephemeral"}}],
    messages=[{"role": "user", "content": question}])     # volatile part last
print(resp.usage.cache_read_input_tokens)                 # > 0 on cache hits

# App-level response cache for deterministic tasks
import hashlib, json
def cache_key(version: str, model: str, text: str) -> str:
    return hashlib.sha256(json.dumps([version, model, text.strip().lower()]).encode()).hexdigest()
`,
  pitfalls: md`- A timestamp or per-user id in the system prompt silently disables prompt caching.
- Don't cache personalised or time-sensitive answers by input text alone.`,
  related: ["prompt-as-code", "llm-gateway"],
});

pattern({
  id: "batch-async",
  name: "Batch and async processing",
  category: "Scale & cost",
  summary: "Work nobody is waiting for goes through a queue or the Batches API: cheaper, rate-limit friendly, resumable.",
  problem: md`Processing 50,000 items synchronously hits rate limits, costs full price, and dies halfway with no way to resume.`,
  solution: md`Submit requests with a ~custom_id~ each to the Batches API (≈50% cheaper), poll until done, and join results by id. For near-real-time work, use a job queue with workers and idempotent jobs. See [[c:sync-async-batch]].`,
  code: py`
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

batch = client.messages.batches.create(requests=[
    Request(custom_id=r.id, params=MessageCreateParamsNonStreaming(
        model="claude-haiku-4-5", max_tokens=300, system=SYSTEM,
        messages=[{"role": "user", "content": r.text}]))
    for r in reviews])
# later…
if client.messages.batches.retrieve(batch.id).processing_status == "ended":
    for res in client.messages.batches.results(batch.id):        # any order: key by id
        if res.result.type == "succeeded":
            save(res.custom_id, res.result.message.content[0].text)
`,
  pitfalls: md`- Results come back in **any order**, so always join by ~custom_id~.
- Handle ~errored~ and ~expired~ results by resubmitting.`,
  related: ["map-reduce", "idempotency"],
});

pattern({
  id: "model-cascade",
  name: "Model cascade / router",
  category: "Scale & cost",
  summary: "Send easy cases to a fast, cheap model and escalate uncertain or hard ones to a stronger model (or a human).",
  problem: md`At millions of requests, the strongest model on everything is expensive. A cheap model on everything is wrong too often on the hard cases.`,
  solution: md`Tier 1: rules or a cheap model with a confidence signal. Escalate when confidence is low, the category is high-risk, or validation fails. Measure the cost and quality of the whole cascade, not each tier alone. Also compare against "strong model at low effort", which is often simpler.`,
  code: py`
def moderate(item: str) -> Decision:
    if (d := rules.check(item)) is not None:        # tier 0: free, exact
        return d
    d = llm.parse(MOD_PROMPT, item, Decision, tier="fast")
    if d.confidence >= 0.9 and d.label != "borderline":
        return d                                    # tier 1: most traffic stops here
    return llm.parse(MOD_PROMPT_DETAILED, item, Decision, tier="smart")   # tier 2
`,
  pitfalls: md`- Self-reported confidence is weakly calibrated, so set thresholds from eval data.
- Different models mean separate prompt caches, which loses some caching benefit.`,
  related: ["classify-route", "llm-gateway"],
});

pattern({
  id: "memory",
  name: "Conversation memory and state",
  category: "Scale & cost",
  summary: "Keep structured state (slots, facts, decisions) separately from the raw transcript; summarise or trim old turns.",
  problem: md`Long conversations grow costly and the model loses track of what was decided. Raw transcripts are a poor source of truth.`,
  solution: md`Maintain a typed **state object** (e.g. destination, dates, budget) updated by extraction each turn. Send the model the state + the last few turns + a running summary. The state, not the chat log, drives business logic.`,
  code: py`
class TripState(BaseModel):
    destination: str | None = None
    depart: date | None = None
    nights: int | None = None
    budget_usd: int | None = None

def turn(state: TripState, history: list, user_msg: str, llm):
    update = llm.parse(EXTRACT_UPDATES, f"<state>{state.model_dump_json()}</state>\n{user_msg}", TripState)
    state = state.model_copy(update=update.model_dump(exclude_none=True))
    reply = llm.complete(ASSISTANT, render(state, history[-6:], user_msg))
    return state, reply
`,
  pitfalls: md`- Don't store everything forever. Define what to remember and get consent for personal data.`,
  related: ["structured-output", "caching"],
});

pattern({
  id: "observability",
  name: "Tracing and LLM observability",
  category: "Quality & operations",
  summary: "Every model call and tool call is a span with prompt version, tokens, cost, latency and outcome, linked into one trace per request.",
  problem: md`When a user reports a bad answer, you can't tell which prompt, model, retrieved documents or tool results produced it.`,
  solution: md`Emit a trace per request and a span per step (retrieve, model call, tool call, validation), with structured attributes. Use OpenTelemetry so any backend works. See [[c:observability]].`,
  code: py`
from opentelemetry import trace
tracer = trace.get_tracer("support-bot")

def traced_parse(name, system, user, schema, version, tier="smart"):
    with tracer.start_as_current_span(f"llm.{name}") as span:
        span.set_attribute("gen_ai.request.model", MODELS[tier])
        span.set_attribute("prompt.version", version)
        resp = _client.messages.parse(model=MODELS[tier], max_tokens=2048, system=system,
                                      messages=[{"role": "user", "content": user}], output_format=schema)
        span.set_attribute("gen_ai.usage.input_tokens", resp.usage.input_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", resp.usage.output_tokens)
        span.set_attribute("gen_ai.response.finish_reasons", [resp.stop_reason])
        return resp.parsed_output
`,
  pitfalls: md`- Logging full prompts can leak PII. Redact, or store them in an access-controlled place with retention limits.`,
  related: ["llm-gateway", "prompt-ci", "feedback-flywheel"],
});

pattern({
  id: "prompt-ci",
  name: "Prompt/eval CI gate",
  category: "Quality & operations",
  summary: "Changes to prompts, models or retrieval run the eval suite in CI; the merge is blocked if key metrics regress.",
  problem: md`Someone 'improves' a prompt for one case and silently breaks five others.`,
  solution: md`Store baseline metrics. CI runs the eval on every PR touching ~prompts/~, ~llm.py~ or retrieval config, compares against the baseline with tolerances, and fails on regression of any critical metric.`,
  code: py`
# evals/gate.py, run in CI
import json, sys
baseline = json.load(open("evals/baseline.json"))
current = run_all_evals()
failed = [m for m, floor in baseline["floors"].items() if current[m] < floor - baseline["tolerance"]]
print(json.dumps(current, indent=2))
sys.exit(1 if failed else 0)
`,
  pitfalls: md`- LLM outputs are noisy. Use tolerances, larger eval sets, or repeated runs for small sets.`,
  related: ["eval-harness", "prompt-as-code", "observability"],
});

pattern({
  id: "feedback-flywheel",
  name: "Feedback flywheel",
  category: "Quality & operations",
  summary: "Production signals (user ratings, human edits, escalations, judge scores) are mined for failures that become new eval cases and fixes.",
  problem: md`The eval set is frozen at launch, while the real world (new products, new user behaviour) keeps changing.`,
  solution: md`Log outcomes. Sample and judge live traffic. Cluster failures. Add representative failures to the golden set. Fix. Re-run evals. Repeat weekly. Human corrections from [[p:human-in-loop]] are the highest-quality labels you'll ever get.`,
  code: py`
def weekly_flywheel(db, llm):
    sample = db.sample_interactions(days=7, n=500)
    scored = [(x, judge(x.output, x.context)) for x in sample]
    failures = [x for x, v in scored if not all(r.passed for r in v.results)]
    failures += db.interactions_with(feedback="thumbs_down", days=7)
    clusters = cluster_by_embedding(failures)           # group similar failures
    for c in clusters.top(5):
        db.add_to_golden_set(c.representatives, needs_label=True)
    return clusters.summary()
`,
  pitfalls: md`- Feedback is biased (unhappy users click more). Combine it with random sampling.`,
  related: ["human-in-loop", "llm-judge", "observability"],
});

/* ───────────── Security ───────────── */

pattern({
  id: "guardrails",
  name: "Input/output guardrails",
  category: "Security",
  summary: "Checks before and after the model: PII redaction, scope checks, injection screening, policy and compliance filters on outputs.",
  problem: md`Users send personal data, try to jailbreak, ask out-of-scope questions, and the model sometimes produces non-compliant text.`,
  solution: md`**Input**: redact PII, check scope, wrap untrusted text in tags and tell the model it's data. **Output**: deterministic checks (banned phrases, required disclaimers, no leaked secrets) plus a policy classifier for fuzzy cases. Fail closed for high-risk domains.`,
  code: py`
import re
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

def redact(text: str) -> str:
    return SSN.sub("[SSN]", EMAIL.sub("[EMAIL]", text))

def output_ok(text: str) -> list[str]:
    issues = []
    if re.search(r"\b(guarantee|risk-free)\b", text, re.I):
        issues.append("forbidden financial promise")
    return issues
`,
  pitfalls: md`- Regex catches the obvious cases only. Layer it with model-based classifiers for fuzzy policy.
- Guardrails reduce risk but don't make prompt injection impossible. Design privileges so that a fooled model can't do much harm ([[p:privilege-separation]]).`,
  related: ["privilege-separation", "human-in-loop"],
});

pattern({
  id: "privilege-separation",
  name: "Privilege separation for untrusted input",
  category: "Security",
  summary: "The component that reads untrusted content can't take dangerous actions; the component that can act never sees raw untrusted content.",
  problem: md`An agent that reads emails/web pages *and* can send emails or access private data can be hijacked by instructions hidden in that content (prompt injection).`,
  solution: md`Avoid the "lethal trifecta" (private data + untrusted content + an exfiltration channel) in one context. A **quarantined** model extracts typed fields from untrusted content, with no tools. A **privileged** planner sees only those typed fields and acts through allowlisted tools with approvals.`,
  code: py`
# Quarantined: reads attacker-controlled text, has NO tools, returns typed data only
summary = llm.parse(EXTRACT_ONLY, f"<untrusted_email>{email.body}</untrusted_email>", EmailFacts)

# Privileged: never sees the raw email body, only validated, typed fields
plan = planner.decide(EmailFactsView.from_validated(summary))      # enums, ids, short strings
for action in plan.actions:
    enforce_policy(action)          # allowlisted recipients, no external links, approval for sends
`,
  pitfalls: md`- Free-text fields passed from quarantine to the privileged side can still carry injections. Prefer enums, ids and length limits.`,
  related: ["guardrails", "human-in-loop", "tool-calling"],
});
