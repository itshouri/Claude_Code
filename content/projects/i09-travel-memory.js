project({
  id: "i09",
  level: "intermediate",
  title: "Conversational trip planner with state and memory",
  industry: "Travel",
  client: "Wanderly: a boutique travel agency selling curated packages, 20 travel advisors",
  time: "5–7 hours",
  summary: "A streaming chat assistant that keeps a typed trip-state object, searches inventory once enough is known, summarises long chats, and hands a clean brief to a human advisor.",
  newConcepts: ["Typed conversation state vs transcript", "Per-turn state extraction", "Streaming responses (SSE)", "Context trimming + running summary", "Simulated-user conversation evals"],
  patterns: ["memory", "structured-output", "tool-calling", "caching", "human-in-loop", "eval-harness"],
  skills: ["Multi-turn system design", "Latency UX with streaming", "Evaluating conversations, not single replies"],

  brief: md`
> "People come to our site, chat for a bit, then leave. Our advisors want leads that already include destination, dates, budget, travellers and preferences. Can an assistant have that conversation, suggest a few of our packages, and pass a proper brief to an advisor?"
> (Founder, Wanderly)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| What makes a good lead? | Destination (or region), dates or month, nights, travellers (adults/kids), budget per person, interests, must-avoids | The **state schema** |
| Inventory? | 600 packages in a database with filters (region, month, price, tags) | A search tool. The model never invents packages |
| Conversation length? | 5–40 turns, and people come back days later | Memory across sessions; summarise long histories |
| Tone? | Warm, curious, concise; never pushy; never quote prices not from inventory | System prompt + guardrails |
| Handoff? | When the user wants to book, asks for a person, or the state is complete and they like an option | Advisor brief generated from the **state**, not the transcript |
| Latency? | Chat on a website, where people leave if nothing appears in ≈2 s | **Stream** tokens |

**Success:** brief completeness ≥ 90% of required fields on handed-off leads; advisors rate briefs "ready to call" ≥ 80%; the lead conversion rate rises vs the web form.
`,

  frame: md`
**The key idea: the transcript is not the memory.** A 40-turn chat is noisy: people change their minds ("actually make it Portugal, not Spain"). If business logic reads the raw transcript, it reads contradictions. Instead:

1. Every turn, a **cheap extraction call** updates a typed ~TripState~ (destination, dates, budget, …) with only what changed.
2. The **assistant reply** is generated from: the system prompt + the current state + a running summary + the last few turns.
3. **Search, handoff and the advisor brief all read the state**, which is exact and current.

That's [[p:memory]]. Combined with **streaming** for perceived latency and a **tool** for inventory search, it's a typical production chat architecture.
`,

  design: md`
~~~text
 user message ──▶ POST /chat (SSE stream)
                    │
                    ├─(1) extract_updates(state, last 2 turns, message)   fast tier, structured
                    │        → state = merge(state, updates)              code
                    │
                    ├─(2) if state.ready_for_search and changed: search_packages(state)   code (DB)
                    │
                    ├─(3) reply = stream(system[cached], state, summary, last 6 turns, results?)
                    │        tokens ──▶ browser as they arrive
                    │
                    ├─(4) persist: messages, state (versioned), summary
                    │
                    └─(5) every 12 turns: summarise older turns (fast tier) → running summary

 handoff (user asks, or chooses a package) ──▶ advisor brief from STATE + chosen package ──▶ CRM
~~~
`,

  tree: txt`
trip-planner/
├── state.py        # TripState + merge rules
├── extract.py      # per-turn state updates
├── inventory.py    # package search (SQL)
├── reply.py        # context assembly + streaming
├── summarise.py    # running summary
├── api.py          # FastAPI SSE endpoint
├── handoff.py      # advisor brief + CRM
└── evals/
    ├── personas.yaml
    └── conversation_eval.py
`,

  build: [
    {
      file: "state.py",
      patterns: ["memory", "structured-output"],
      note: md`The state is **typed and explicit**. ~TripUpdate~ has every field optional: the extractor returns *only what changed this turn*, and ~merge~ applies it in code. List fields support add *and* remove, because users take things back.`,
      code: py`
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


class TripState(BaseModel):
    destination: Optional[str] = None
    region: Optional[str] = None
    month: Optional[str] = None                   # "2027-03"
    start_date: Optional[date] = None
    nights: Optional[int] = None
    adults: Optional[int] = None
    children_ages: list[int] = []
    budget_per_person_usd: Optional[int] = None
    interests: list[str] = []
    avoid: list[str] = []
    chosen_package_id: Optional[str] = None
    wants_human: bool = False

    @property
    def ready_for_search(self) -> bool:
        return bool((self.destination or self.region) and (self.month or self.start_date) and self.adults)

    def missing_for_handoff(self) -> list[str]:
        need = {"destination/region": self.destination or self.region, "timing": self.month or self.start_date,
                "nights": self.nights, "travellers": self.adults, "budget": self.budget_per_person_usd}
        return [k for k, v in need.items() if not v]


class TripUpdate(BaseModel):
    """Only fields the user changed or newly stated in this turn."""
    destination: Optional[str] = None
    region: Optional[str] = None
    month: Optional[str] = None
    start_date: Optional[date] = None
    nights: Optional[int] = None
    adults: Optional[int] = None
    children_ages: Optional[list[int]] = None
    budget_per_person_usd: Optional[int] = None
    add_interests: list[str] = []
    remove_interests: list[str] = []
    add_avoid: list[str] = []
    chosen_package_id: Optional[str] = None
    wants_human: Optional[bool] = None
    clear_fields: list[Literal["destination", "region", "month", "start_date", "nights", "budget_per_person_usd"]] = \
        Field(default_factory=list, description="Fields the user explicitly un-set, e.g. 'forget the dates'")


def merge(s: TripState, u: TripUpdate) -> TripState:
    data = s.model_dump()
    for k, v in u.model_dump(exclude={"add_interests", "remove_interests", "add_avoid", "clear_fields"}).items():
        if v is not None:
            data[k] = v
    for k in u.clear_fields:
        data[k] = None
    data["interests"] = [i for i in dict.fromkeys(s.interests + u.add_interests) if i not in u.remove_interests]
    data["avoid"] = list(dict.fromkeys(s.avoid + u.add_avoid))
    if u.destination and u.destination != s.destination:
        data["chosen_package_id"] = None                  # changed destination invalidates the choice
    return TripState(**data)
`,
    },
    {
      file: "extract.py",
      note: md`A **fast, structured** call per turn. It sees the current state and the latest exchange, not the whole history, so it stays cheap and focused on *changes*.`,
      code: py`
from datetime import date

import llm
from state import TripState, TripUpdate

SYSTEM = """You update a travel-planning state from the latest user message.
Return ONLY what the user stated or changed in this message. Resolve relative dates using today.
If the user corrects something ('actually 2 adults, not 3'), return the corrected value.
If they say they're flexible about something, use clear_fields. Never infer budget from tone."""


def extract_updates(state: TripState, last_assistant: str, user_msg: str) -> TripUpdate:
    user = (f"<today>{date.today().isoformat()}</today>\n<current_state>{state.model_dump_json()}</current_state>\n"
            f"<assistant_said>{last_assistant[-1500:]}</assistant_said>\n<user_message>{user_msg}</user_message>")
    return llm.parse(SYSTEM, user, TripUpdate, tier="fast", max_tokens=400)
`,
    },
    {
      file: "inventory.py",
      patterns: ["tool-calling"],
      note: md`**Search is code, driven by state.** We call it deterministically when the state becomes searchable or changes, rather than hoping the model decides to call a tool. (Letting the model call ~search_packages~ as a tool also works. Here, deterministic is simpler and more reliable.)`,
      code: py`
def search_packages(conn, s) -> list[dict]:
    q = ["SELECT id, name, region, country, nights, price_from_usd, tags, highlights FROM packages WHERE active"]
    p = []
    if s.destination:
        q.append("AND (country ILIKE %s OR name ILIKE %s)"); p += [f"%{s.destination}%"] * 2
    elif s.region:
        q.append("AND region = %s"); p.append(s.region)
    if s.month:
        q.append("AND %s = ANY(available_months)"); p.append(s.month[-2:])
    if s.budget_per_person_usd:
        q.append("AND price_from_usd <= %s"); p.append(int(s.budget_per_person_usd * 1.1))
    if s.children_ages:
        q.append("AND family_friendly")
    q.append("ORDER BY (tags && %s::text[]) DESC, price_from_usd LIMIT 4"); p.append(s.interests or ["_"])
    rows = conn.execute(" ".join(q), p).fetchall()
    return [dict(zip(["id", "name", "region", "country", "nights", "price_from_usd", "tags", "highlights"], r)) for r in rows]
`,
    },
    {
      file: "reply.py",
      patterns: ["caching", "memory"],
      note: md`**Context assembly** is where memory becomes real: cached system prompt → state → running summary → the last 6 turns → search results (if any). The reply **streams**. ~messages.stream(...)~ yields text as it's generated.`,
      code: py`
import json

import anthropic

client = anthropic.Anthropic()
SYSTEM = [{"type": "text", "cache_control": {"type": "ephemeral"}, "text": """
You are Wanderly's trip-planning assistant. Warm, curious, concise (2-4 sentences + at most one question).
Ask for missing essentials one at a time: destination/region, timing, nights, travellers, budget.
Only mention packages from <search_results>, with their real names and 'from' prices. Never invent packages or prices.
If the user wants to book or talk to a person, say an advisor will contact them and summarise what you know."""}]


def build_messages(state, summary: str, turns: list[dict], user_msg: str, results: list | None) -> list[dict]:
    context = f"<trip_state>{state.model_dump_json()}</trip_state>\n<missing>{state.missing_for_handoff()}</missing>"
    if summary:
        context += f"\n<earlier_conversation_summary>{summary}</earlier_conversation_summary>"
    if results is not None:
        context += f"\n<search_results>{json.dumps(results)}</search_results>"
    recent = turns[-6:]
    return recent + [{"role": "user", "content": f"{context}\n\n<user_message>{user_msg}</user_message>"}]


def stream_reply(messages: list[dict]):
    with client.messages.stream(model="claude-opus-5-5", max_tokens=1024, system=SYSTEM,
                                messages=messages) as stream:
        for text in stream.text_stream:
            yield text
`,
    },
    {
      file: "api.py",
      note: md`A **Server-Sent Events** endpoint: extraction and search run first (≈0.5–1 s), then tokens stream to the browser. The state and the turn are persisted *after* the stream completes.`,
      code: py`
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from extract import extract_updates
from inventory import search_packages
from reply import build_messages, stream_reply
from state import merge
from summarise import maybe_summarise

app = FastAPI()


class ChatIn(BaseModel):
    session_id: str
    message: str


@app.post("/chat")
def chat(inp: ChatIn):
    sess = sessions.load(inp.session_id)                 # state, summary, turns
    last_assistant = next((t["content"] for t in reversed(sess.turns) if t["role"] == "assistant"), "")
    new_state = merge(sess.state, extract_updates(sess.state, last_assistant, inp.message))
    results = None
    if new_state.ready_for_search and new_state != sess.state:
        results = search_packages(db, new_state)
    msgs = build_messages(new_state, sess.summary, sess.turns, inp.message, results)

    def events():
        full = []
        for chunk in stream_reply(msgs):
            full.append(chunk)
            yield f"data: {chunk}\n\n"
        reply = "".join(full)
        sess.turns += [{"role": "user", "content": inp.message}, {"role": "assistant", "content": reply}]
        sess.state = new_state
        sess.summary, sess.turns = maybe_summarise(sess.summary, sess.turns)
        sessions.save(sess)
        if new_state.wants_human or new_state.chosen_package_id:
            handoff_queue.put(inp.session_id)
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")
`,
    },
    {
      file: "summarise.py",
      note: md`When history gets long, fold old turns into a **running summary** and keep only recent turns verbatim. The state already holds the facts, so the summary only needs the *texture*: what they liked, what they rejected and why.`,
      code: py`
import llm

KEEP = 8


def maybe_summarise(summary: str, turns: list[dict]) -> tuple[str, list[dict]]:
    if len(turns) <= KEEP + 8:
        return summary, turns
    old, recent = turns[:-KEEP], turns[-KEEP:]
    text = "\n".join(f"{t['role']}: {t['content']}" for t in old)
    new_summary = llm.complete(
        "Update the running summary of a travel-planning chat. Keep preferences, likes/dislikes with reasons, "
        "rejected options and open questions. Facts like dates and budget are stored elsewhere; skip them. <= 120 words.",
        f"<previous_summary>{summary}</previous_summary>\n<new_turns>\n{text}\n</new_turns>", tier="fast", max_tokens=300)
    return new_summary, recent
`,
    },
    {
      file: "evals/conversation_eval.py",
      patterns: ["eval-harness"],
      note: md`**Evaluate conversations, not single replies.** Simulated travellers (personas with hidden ground-truth trip details, including mind changes) chat with the assistant. We then compare the **final state** to the persona's truth, and check guardrails (no invented packages) across the whole transcript.`,
      code: py`
import yaml

from state import TripState

# personas.yaml
# - id: indecisive-couple
#   truth: {destination: Portugal, month: "2027-05", nights: 7, adults: 2, budget_per_person_usd: 2500,
#           interests: [food, wine], avoid: [long drives]}
#   script_hint: "Start by asking about Spain, switch to Portugal on turn 3, mention budget only if asked."


def field_accuracy(final: TripState, truth: dict) -> dict:
    out = {}
    for k, v in truth.items():
        got = getattr(final, k)
        out[k] = (set(map(str.lower, got)) >= set(map(str.lower, v))) if isinstance(v, list) else (str(got).lower() == str(v).lower())
    return out


def run(simulate_conversation, inventory_ids: set[str]):
    personas = yaml.safe_load(open("evals/personas.yaml"))
    for p in personas:
        final_state, transcript = simulate_conversation(p, max_turns=14)
        acc = field_accuracy(final_state, p["truth"])
        mentioned = {pid for pid in inventory_ids if pid in " ".join(t["content"] for t in transcript)}
        invented = [t for t in transcript if t["role"] == "assistant" and "PKG-" in t["content"]
                    and not any(pid in t["content"] for pid in inventory_ids)]
        print(p["id"], f"state acc {sum(acc.values())}/{len(acc)}", "invented-packages:", len(invented),
              "turns:", len(transcript) // 2, "packages shown:", len(mentioned))
`,
    },
  ],

  evaluate: md`
| Metric | How | Target |
|---|---|---|
| State extraction accuracy | 25 personas × 3 runs, final state vs truth | ≥ 95% of fields |
| Correction handling | Personas that change destination, travellers or dates | 100% final state reflects the latest value |
| Turns to complete brief | Median over personas | ≤ 8 |
| Invented packages or prices | Scan all assistant turns against inventory | **0** |
| Advisor rating | Advisors rate 50 real briefs | ≥ 80% "ready to call" |
| TTFT (time to first token) | p95 from logs | < 2 s |
`,

  operate: md`
- **Cost per conversation:** ≈10–20 turns × (fast extraction + flagship reply with a cached system prompt). Typically cents per conversation, compared with the value of one qualified lead.
- **Latency:** the extraction call adds ≈0.5 s before streaming starts. Run it in parallel with a "typing" indicator, or overlap extraction with the reply for long messages.
- **Privacy:** state contains personal travel plans and children's ages. Set retention limits, offer "forget me", and don't use chats for anything else without consent.
- **Monitoring:** abandonment by turn number, briefs completed, advisor feedback, and the rate of "I don't have that package" corrections.
`,

  levelUp: md`
- **The assistant books, holds and pays?** Write tools with confirmations, idempotency and policy: [[proj:i02]].
- **Memory across many products and channels for millions of users?** A profile store with consent management, retrieval over past interactions, and strict access control.
- **Measuring quality continuously in production?** [[proj:a07]].
`,

  exercises: [
    "Remove the state and send the whole transcript to the assistant. Run the 'indecisive couple' persona: what goes wrong?",
    "Add ~flexibility~ fields (±3 days, any month in spring) and make ~search_packages~ use them.",
    "Measure TTFT with and without the extraction call. Can you run extraction in parallel safely?",
    "Write the advisor brief generator from ~TripState~ + summary + chosen package, and have it rated by a judge with a 4-criterion rubric.",
  ],

  interview: md`
> "For a travel agency's chat assistant, I separated the memory from the transcript. Each turn, a fast structured call extracts only what changed into a typed trip state with explicit merge rules for corrections and removals. Package search is deterministic code triggered by state changes, and the reply streams over SSE from a context of cached system prompt, current state, a running summary and the last six turns. Advisor briefs come from the state, not the chat log. I evaluated with simulated traveller personas, including ones who change their minds, comparing final state to hidden truth, and checking every assistant turn for invented packages, which had to be zero."
`,
});
