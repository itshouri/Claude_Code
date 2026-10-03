project({
  id: "a03",
  level: "advanced",
  title: "Multi-agent research briefings with verified citations",
  industry: "Investment management",
  client: "Granite Peak Capital: a 40-person investment firm whose analysts write market and company briefings",
  time: "2 days of study",
  summary: "A lead agent plans research, parallel workers search the web and internal notes, and the lead synthesises a cited memo. Includes token and cost budgets, citation verification and a rubric judge.",
  newConcepts: ["Orchestrator–worker multi-agent design", "Context isolation for sub-agents", "Server-side web search tool", "Budgeting tokens/cost across agents", "Citation verification against fetched sources"],
  patterns: ["orchestrator-workers", "agent-loop", "grounded-citations", "evaluator-optimizer", "llm-judge", "observability", "map-reduce"],
  skills: ["Knowing when multi-agent is worth its cost", "Designing agent hand-offs", "Evaluating open-ended research"],

  brief: md`
> "Before every investment committee, an analyst spends a day or two building a briefing: market size, competitors, recent news, regulatory issues, plus what our own past notes say. We want a first draft in 30 minutes that's actually cited, so analysts can verify instead of search."
> (Head of Research, Granite Peak Capital)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Output? | A 2–4 page memo: thesis, market, competitors, risks, recent developments, open questions, with sources | Report schema + citations |
| Sources? | Public web (news, filings, company sites), internal research notes (≈8,000 docs), a paid data API | Web search tool + internal retrieval tool + data tool |
| What's unacceptable? | Uncited claims, made-up numbers, stale info presented as current, sending confidential info to the web | Citation verification; dates on every source; no internal content in web queries |
| Time budget? | 30 minutes is fine; it's async | Breadth over latency: parallel workers |
| Cost tolerance? | "A few dollars per memo is nothing compared with analyst time, but don't let it run away" | Hard budgets per run |
| Evaluation? | Senior analysts can grade memos against a rubric | Rubric judge + human calibration |

**Success:** analysts rate drafts "useful starting point" ≥ 80%; ≥ 98% of citations verifiably support their claims; median cost per memo within budget; drafting time from 1–2 days to < 2 hours including verification.
`,

  frame: md`
**Shape:** *Research / explore*, rung 7 on the [[f:complexity-ladder]]. Before building multi-agent, apply the four agent checks: the task is complex and open-ended (✓), valuable (✓), viable for frontier models (✓), and errors are recoverable because analysts verify (✓).

**Why multiple agents here, not one long loop?**
- **Breadth:** a briefing covers 5–8 independent sub-questions (market, each competitor, regulation, news). They can run **in parallel**.
- **Context isolation:** each worker reads dozens of pages. If one agent did it all, its context would fill with raw search results and quality would degrade. Workers return **condensed findings with sources**, so the lead's context stays clean.
- **Cost trade-off:** multi-agent runs use many times more tokens than a single call. Worth it for a high-value memo, and not for a quick question. *That* is the senior judgement to state out loud.

**Roles:**
1. **Planner (lead):** turns the brief into sub-questions with search guidance.
2. **Workers (parallel):** each runs a bounded agent loop with web search + internal search tools, and returns findings with citations.
3. **Synthesiser (lead):** writes the memo from findings only, then a **verifier** checks citations and a **critic** checks the rubric, followed by one revision round.
`,

  design: md`
~~~text
 analyst request ──▶ PLANNER ──▶ ResearchPlan{subquestions[5-8], each: goal, tools, must-cover}
                                        │
                ┌───────────┬───────────┼────────────┬─────────────┐       parallel, isolated contexts
                ▼           ▼           ▼            ▼             ▼
             worker 1    worker 2    worker 3     worker 4      worker 5     (bounded loops:
             web_search  internal    web_search   data_api      web_search    ≤ 8 searches, ≤ 60k tokens)
                │           │           │            │             │
                └─── Findings{claims[], each: text, source_id, quote, date} ───┘
                                        │
                              SOURCE REGISTRY (url/doc id → fetched text, date)
                                        │
                                  SYNTHESISER ──▶ memo draft (claims cite source ids)
                                        │
                     VERIFIER (code + model): every cited quote in the registry? claim supported?
                     CRITIC (rubric): coverage, balance, recency, open questions
                                        │ issues → one revision
                                        ▼
                                memo + source list + "unverified" flags ──▶ analyst
 Budget guard across all agents: tokens, searches, wall-clock, dollars. Stops gracefully.
~~~
`,

  tree: txt`
research/
├── budget.py        # shared, thread-safe budget across agents
├── sources.py       # source registry: every fetched page/doc, with dates
├── planner.py
├── worker.py        # bounded loop with server-side web search + internal tools
├── synthesise.py
├── verify.py        # citation checks
├── critic.py        # rubric judge + revision
├── run.py           # orchestration
└── evals/
    ├── rubric.yaml
    └── memo_eval.py
`,

  build: [
    {
      file: "budget.py",
      patterns: ["agent-loop"],
      note: md`**One budget for the whole run**, shared by every agent. Each model call reports its usage, and when the budget is exhausted, workers stop *gracefully* and return what they have. Budgets are the difference between a research system and a runaway bill.`,
      code: py`
import threading
from dataclasses import dataclass, field

PRICES = {"claude-opus-5-5": (4.0, 20.0), "claude-sonnet-5-5": (2.0, 10.0), "claude-haiku-4-5": (1.0, 5.0)}  # $/MTok
SEARCH_PRICE = 0.01                                                          # per web search (check current pricing)


@dataclass
class Budget:
    max_usd: float = 6.0
    max_searches: int = 60
    spent_usd: float = 0.0
    searches: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def charge(self, model: str, usage) -> None:
        pin, pout = PRICES[model]
        cost = (usage.input_tokens * pin + usage.output_tokens * pout) / 1e6
        st = getattr(usage, "server_tool_use", None)
        n_search = getattr(st, "web_search_requests", 0) if st else 0
        with self._lock:
            self.spent_usd += cost + n_search * SEARCH_PRICE
            self.searches += n_search

    @property
    def exhausted(self) -> bool:
        return self.spent_usd >= self.max_usd or self.searches >= self.max_searches

    def remaining_share(self, workers_left: int) -> float:
        return max(0.0, (self.max_usd - self.spent_usd) / max(workers_left, 1))
`,
    },
    {
      file: "planner.py",
      patterns: ["orchestrator-workers", "structured-output"],
      code: py`
from typing import Literal

from pydantic import BaseModel, Field

import llm


class SubQuestion(BaseModel):
    id: str
    question: str
    why_it_matters: str
    tools: list[Literal["web", "internal", "market_data"]]
    must_cover: list[str] = Field(description="Specific facts the worker must try to find")
    recency: Literal["last_30_days", "last_year", "any"]


class ResearchPlan(BaseModel):
    thesis_to_test: str
    subquestions: list[SubQuestion] = Field(min_length=3, max_length=8)


PLANNER = """You plan research for an investment committee briefing. Break the request into 3-8
independent sub-questions that together cover: market and growth, competitors, the company's position,
regulation/legal, recent developments, and key risks. Avoid overlap; each must be answerable separately.
Internal notes may contain confidential information: never put internal details in web queries."""


def plan(request: str) -> ResearchPlan:
    return llm.parse(PLANNER, f"<request>{request}</request>", ResearchPlan)
`,
    },
    {
      file: "worker.py",
      patterns: ["agent-loop", "grounded-citations"],
      note: md`A worker is a **bounded agent loop** with a *server-side* web search tool (the provider runs the searches and returns results with URLs) plus a client-side internal search tool. Note the ~pause_turn~ handling for long server-tool turns, the per-worker step and budget limits, and the **source registry**: every result the worker saw is stored, so citations can be verified later.`,
      code: py`
import json

import anthropic
from pydantic import BaseModel, Field

client = anthropic.Anthropic()
WORKER_MODEL = "claude-sonnet-5-5"            # capable and cheaper for reading-heavy work; choose by eval
MAX_STEPS = 10

WEB_SEARCH = {"type": "web_search_20260209", "name": "web_search", "max_uses": 8}
INTERNAL = {"name": "search_internal_notes",
            "description": "Search Granite Peak's internal research notes. Returns doc ids, titles, dates, excerpts.",
            "input_schema": {"type": "object", "properties": {"query": {"type": "string"}},
                             "required": ["query"], "additionalProperties": False}}


class Claim(BaseModel):
    text: str
    source_id: str = Field(description="URL or internal doc id")
    quote: str = Field(description="Verbatim supporting text from the source")
    source_date: str | None


class Findings(BaseModel):
    subquestion_id: str
    summary: str
    claims: list[Claim]
    gaps: list[str]


def research(sq, budget, registry, internal_index) -> Findings:
    tools = ([WEB_SEARCH] if "web" in sq.tools else []) + ([INTERNAL] if "internal" in sq.tools else [])
    system = (f"You research ONE sub-question for an investment memo. Recency requirement: {sq.recency}. "
              "Search, read, and record concrete facts with sources. Prefer primary sources (filings, official sites). "
              "Never include internal note content in web searches. Stop when must-cover items are found or "
              "clearly unavailable. Finish with a short plain-text note of what you found.")
    messages = [{"role": "user", "content": f"<subquestion>{sq.model_dump_json()}</subquestion>"}]
    for step in range(MAX_STEPS):
        if budget.exhausted:
            break
        resp = client.messages.create(model=WORKER_MODEL, max_tokens=8000, system=system, tools=tools, messages=messages)
        budget.charge(WORKER_MODEL, resp.usage)
        messages.append({"role": "assistant", "content": resp.content})
        registry.capture(resp.content)                       # store every web result (url, title, text, date)
        if resp.stop_reason == "pause_turn":                 # long server-tool turn: continue it
            continue
        calls = [b for b in resp.content if b.type == "tool_use"]
        if resp.stop_reason != "tool_use" or not calls:
            break
        results = []
        for c in calls:
            hits = internal_index.search(c.input["query"], k=5)
            registry.capture_internal(hits)
            results.append({"type": "tool_result", "tool_use_id": c.id,
                            "content": json.dumps([{"id": h.id, "title": h.title, "date": h.date, "excerpt": h.text[:1500]} for h in hits])})
        messages.append({"role": "user", "content": results})

    # condense: the lead never sees raw pages, only structured findings
    transcript_notes = "".join(b.text for m in messages if m["role"] == "assistant"
                               for b in m["content"] if getattr(b, "type", "") == "text")
    fin = client.messages.parse(
        model=WORKER_MODEL, max_tokens=4000, output_format=Findings,
        system="Turn research notes into structured findings. Use ONLY sources present in the registry excerpt.",
        messages=[{"role": "user", "content": f"<subquestion id='{sq.id}'>{sq.question}</subquestion>\n"
                                              f"<notes>{transcript_notes}</notes>\n<sources>{registry.excerpt_for_condensing()}</sources>"}])
    budget.charge(WORKER_MODEL, fin.usage)
    return fin.parsed_output
`,
    },
    {
      file: "verify.py",
      patterns: ["grounded-citations"],
      note: md`**Verification is code first.** Every claim's quote must appear in the registry text for its source. Then a cheap model check asks whether the quote actually supports the claim. Unverifiable claims aren't deleted silently: they're **marked** in the memo so the analyst sees them.`,
      code: py`
import re
from typing import Literal

from pydantic import BaseModel

import llm

norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()


class Support(BaseModel):
    verdict: Literal["supports", "partially", "does_not_support"]


def verify_claims(findings, registry) -> list[dict]:
    out = []
    for f in findings:
        for c in f.claims:
            src = registry.text(c.source_id)
            status = "source_missing"
            if src:
                if norm(c.quote) in norm(src):
                    v = llm.parse("Does the quote support the claim? Be strict about numbers and dates.",
                                  f"<claim>{c.text}</claim>\n<quote>{c.quote}</quote>", Support, tier="fast")
                    status = v.verdict
                else:
                    status = "quote_not_found"
            out.append({"subq": f.subquestion_id, "claim": c.text, "source": c.source_id,
                        "date": c.source_date, "status": status})
    return out
`,
    },
    {
      file: "run.py",
      patterns: ["orchestrator-workers", "evaluator-optimizer", "observability"],
      note: md`**Orchestration** in plain code: plan → parallel workers → verify → synthesise only from verified claims → critique → one revision. Every stage records cost, so you can show the analyst exactly what the memo cost.`,
      code: py`
from concurrent.futures import ThreadPoolExecutor

import llm
from budget import Budget
from critic import critique
from planner import plan
from sources import Registry
from verify import verify_claims
from worker import research

SYNTH = """Write an investment committee briefing memo from the VERIFIED claims only.
Sections: Summary (5 bullets), Market, Competitors, Company position, Regulation, Recent developments,
Risks, Open questions. Cite every factual sentence as [n] using the claim numbers given.
Flag where sources are older than 12 months. Do not add facts that aren't in the claims."""


def briefing(request: str, internal_index) -> dict:
    budget, registry = Budget(max_usd=6.0), Registry()
    p = plan(request)
    with ThreadPoolExecutor(max_workers=6) as pool:
        findings = list(pool.map(lambda sq: research(sq, budget, registry, internal_index), p.subquestions))
    checks = verify_claims(findings, registry)
    verified = [c for c in checks if c["status"] == "supports"]
    numbered = "\n".join(f"[{i+1}] {c['claim']} (source: {c['source']}, {c['date'] or 'undated'})" for i, c in enumerate(verified))
    memo = llm.complete(SYNTH, f"<request>{request}</request>\n<thesis>{p.thesis_to_test}</thesis>\n<claims>\n{numbered}\n</claims>",
                        max_tokens=6000)
    issues = critique(memo, p)
    if issues:
        memo = llm.complete(SYNTH + "\nRevise the memo to address the reviewer issues, still using only the claims.",
                            f"<claims>\n{numbered}\n</claims>\n<memo>{memo}</memo>\n<issues>{issues}</issues>", max_tokens=6000)
    return {"memo": memo, "sources": [c["source"] for c in verified],
            "unverified": [c for c in checks if c["status"] != "supports"],
            "gaps": [g for f in findings for g in f.gaps], "cost_usd": round(budget.spent_usd, 2),
            "searches": budget.searches}
`,
    },
    {
      file: "evals/memo_eval.py",
      patterns: ["llm-judge", "eval-harness"],
      note: md`Open-ended research has no single right answer, so evaluate with a **rubric** (coverage of must-cover items, citation accuracy, balance, recency, actionability) graded by a judge **calibrated** against senior analysts on 20 memos. Track **cost per memo** next to quality. A 5% quality gain that doubles cost is a business decision, not an automatic win.`,
      code: py`
from typing import Literal

import yaml
from pydantic import BaseModel

import llm

RUBRIC = yaml.safe_load(open("evals/rubric.yaml"))
# - id: coverage      text: "Covers every must-cover item for the request (listed below) or states it's unavailable"
# - id: citations     text: "Every factual sentence has a citation; no citation is to an irrelevant source"
# - id: balance       text: "Presents material risks and counter-evidence, not only the bull case"
# - id: recency       text: "Recent developments are from the last 90 days and dated"
# - id: actionable    text: "Open questions are specific enough for an analyst to pursue"


class Grade(BaseModel):
    criterion: str
    evidence: str
    passed: bool


class MemoGrade(BaseModel):
    grades: list[Grade]


def grade(memo: str, must_cover: list[str]) -> dict:
    crit = "\n".join(f"- {c['id']}: {c['text']}" for c in RUBRIC)
    g = llm.parse("Grade an investment research memo against each criterion. Quote evidence, then pass/fail.",
                  f"<criteria>{crit}</criteria>\n<must_cover>{must_cover}</must_cover>\n<memo>{memo}</memo>", MemoGrade)
    return {x.criterion: x.passed for x in g.grades}


def run(cases, briefing_fn):
    rows = []
    for case in cases:                              # 25 historical requests with analyst-written must-cover lists
        out = briefing_fn(case["request"])
        rows.append({**grade(out["memo"], case["must_cover"]), "cost": out["cost_usd"],
                     "unverified_share": len(out["unverified"]) / max(len(out["sources"]) + len(out["unverified"]), 1)})
    keys = [c["id"] for c in RUBRIC]
    print({k: sum(r[k] for r in rows) / len(rows) for k in keys})
    print("median cost $", sorted(r["cost"] for r in rows)[len(rows) // 2])
`,
    },
  ],

  evaluate: md`
## Compare architectures, not just prompts
| Architecture | Rubric pass (avg) | Citation support | Median cost | Median time |
|---|---|---|---|---|
| Single call with web search | 0.58 | 0.90 | $0.40 | 2 min |
| Single agent loop (one context) | 0.71 | 0.93 | $2.10 | 12 min |
| **Orchestrator + 6 workers + verify** | **0.84** | **0.99** | $4.30 | 9 min |

*Illustrative.* The multi-agent version wins on coverage, because parallel workers each go deep. Verification is what drives citation support up, not the multi-agent design itself. Separating these effects is exactly what an ablation table is for.

## Human calibration
Two senior analysts grade 20 memos on the same rubric. Compare judge vs analyst agreement per criterion (as in [[proj:i07]]) before using the judge for regression testing.
`,

  operate: md`
- **Budgets:** per-run dollar cap, per-worker step cap, global search cap. Log budget exhaustion events, because frequent exhaustion means the planner is producing too many or too broad sub-questions.
- **Confidentiality:** internal-note content never goes into web queries. Enforce it with a check on outbound search queries (does the query contain internal doc phrases or codenames?), not just with a prompt.
- **Caching:** the same company researched twice in a week? Cache worker findings by (sub-question hash, recency window).
- **Tracing:** one trace per memo; spans per agent and tool call; cost per span. This is how you debug "why did worker 3 spend $2?"
- **UX:** show progress (plan → workers → verification), and present unverified claims separately.
`,

  levelUp: md`
- **Running nightly on a watchlist of 200 companies?** Scheduled agents, change detection ("what's new since last memo?") and batch economics.
- **Agents reading untrusted web content that then take actions?** Prompt-injection defences: [[proj:a06]].
- **Organisation-wide quality tracking of research outputs?** [[proj:a07]].
`,

  exercises: [
    "Run the ablation: remove the verifier, then remove parallel workers. Which change hurts which rubric criterion?",
    "Implement the outbound-query confidentiality check and test it with 10 internal codenames.",
    "Make the planner adaptive: after workers return, let the lead launch a second round for gaps (max 2 workers). Measure the coverage gain vs cost.",
    "Switch the worker model to a cheaper tier, or a stronger one at low effort. Re-run the eval and write a one-paragraph recommendation.",
  ],

  interview: md`
> "For an investment firm's briefings, I justified multi-agent explicitly: the work splits into independent sub-questions, and isolating each worker's context kept the lead's context clean, at several times the token cost of a single call, which the memo's value warrants. A planner produces typed sub-questions, parallel workers run bounded loops with server-side web search and an internal-notes tool, and every source they see goes into a registry. Workers return condensed claims with verbatim quotes, which are verified against the registry in code and then for support by a cheap model check. The memo is synthesised only from verified claims, with one critique round against a rubric. A shared budget caps dollars and searches across all agents. Ablations showed the verifier drives citation accuracy, while parallel workers drive coverage."
`,
});
