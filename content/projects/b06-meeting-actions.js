project({
  id: "b06",
  level: "beginner",
  title: "Meeting transcripts → decisions and action items",
  industry: "Consulting",
  client: "Keystone Consulting: 200 consultants, ~1,500 client calls a month",
  time: "3–4 hours",
  summary: "Process 2-hour call transcripts in chunks, merge and validate the action items in code, and push them to the project tool. Includes an eval that matches items by meaning.",
  newConcepts: ["Chunking long inputs with overlap", "Deterministic merge/dedupe", "Validation against known entities", "Precision/recall for lists", "Semantic matching as a grader"],
  patterns: ["map-reduce", "structured-output", "validate-retry", "parse-then-act", "llm-judge", "eval-harness"],
  skills: ["Long-input processing", "Turning lists into measurable outputs", "Using a model as a matching grader"],

  brief: md`
> "Our consultants spend 30 minutes after every client call writing notes and creating tasks in Asana, and half the time they forget something the client asked for. We record every call. Can AI give us the decisions and to-dos automatically?"
> (COO, Keystone Consulting)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Transcript length? | 30 min to 2.5 hours; speaker-labelled (from the meeting platform) | Up to ≈40k tokens. It fits in context, but quality drops on very long inputs, so we chunk |
| What's an action item? | Something someone *committed* to doing, with an owner and ideally a date | A precise definition in the prompt |
| Most costly mistake? | **Missing a client request** (embarrassing) > a duplicate task (annoying) | Optimise **recall**; dedupe in code |
| Where do tasks go? | Asana project linked to the client | API integration (code acts) |
| Who are the people? | Attendee list from the calendar invite | Validate owners against it |
| Confidentiality? | Client calls are confidential | Provider terms, retention, no training on data |

**Success:** recall of human-identified action items ≥ 90%, every task has a valid owner, and consultant edit time < 5 minutes.
`,

  frame: md`
**Shapes:** *Extract* (decisions, action items) over a **long input** + *Summarise*.

**Why chunk if it fits in context?** You *can* send 40k tokens in one call, and for some tasks you should. But extraction of many small items from a long transcript tends to **miss items in the middle** and gets lazier as length grows. Chunking into ≈15-minute windows gives each part full attention. The cost is cross-chunk items, which **overlap** plus a **code-side merge** handles.

**This is a decision you make with the eval:** run one-shot vs chunked on the same 20 transcripts, compare recall, and pick the winner. (Typically chunked wins on recall for long calls, and one-shot is fine for 30-minute calls. You might route by length.)
`,

  design: md`
~~~text
 transcript (speaker turns) ──▶ chunk by turns (≈12k chars, 2-turn overlap)
                                   │
                    ┌──────────────┼──────────────┐         MAP (parallel)
                    ▼              ▼              ▼
             extract(chunk1)  extract(chunk2)  extract(chunk3)   → ChunkItems
                    └──────────────┼──────────────┘
                                   ▼
                     merge + dedupe (code: normalised text similarity)    REDUCE (code)
                                   ▼
                     validate: owner ∈ attendees, dates resolved vs meeting date
                                   ▼
                     summary call: decisions + 5-line recap (model)       REDUCE (model)
                                   ▼
                   consultant reviews in UI (1 click) ──▶ Asana tasks (code acts)
~~~
`,

  tree: txt`
meeting-actions/
├── schema.py      # ChunkItems, ActionItem, Decision, MeetingNotes
├── chunk.py       # speaker-turn chunking with overlap
├── extract.py     # map step
├── merge.py       # dedupe + validation (pure Python)
├── notes.py       # orchestrates map → merge → summary
├── push.py        # create Asana tasks after approval
└── evals/match_eval.py
`,

  build: [
    {
      file: "schema.py",
      patterns: ["structured-output"],
      note: md`Each item carries the **verbatim quote** where it was committed to. That lets humans check it, lets the merge step dedupe, and lets the eval grade it.`,
      code: py`
from typing import Literal, Optional

from pydantic import BaseModel, Field


class ActionItem(BaseModel):
    task: str = Field(description="Imperative, specific: 'Send revised pricing deck to Dana'")
    owner: str = Field(description="Full name of the person who committed, exactly as in the attendee list, or 'UNASSIGNED'")
    due: Optional[str] = Field(None, description="ISO date if a date/deadline was stated, resolved against the meeting date")
    side: Literal["keystone", "client"]
    quote: str = Field(description="Verbatim words where this was committed to (<= 30 words)")


class Decision(BaseModel):
    decision: str
    quote: str


class ChunkItems(BaseModel):
    action_items: list[ActionItem]
    decisions: list[Decision]
    open_questions: list[str]


class MeetingNotes(BaseModel):
    recap: list[str] = Field(description="3-6 bullet recap")
    decisions: list[Decision]
    action_items: list[ActionItem]
    open_questions: list[str]
`,
    },
    {
      file: "chunk.py",
      note: md`Chunk on **speaker turns**, never mid-sentence. A two-turn overlap means a commitment split across a boundary ("Can you send it?" / "Sure, by Friday.") appears whole in at least one chunk.`,
      code: py`
def chunk_turns(turns: list[dict], max_chars: int = 12_000, overlap_turns: int = 2) -> list[str]:
    """turns: [{'speaker': 'Dana Lee (Client)', 'ts': '00:14:03', 'text': '...'}]"""
    chunks, start = [], 0
    while start < len(turns):
        size, end = 0, start
        while end < len(turns) and size + len(turns[end]["text"]) < max_chars:
            size += len(turns[end]["text"]) + 40
            end += 1
        end = max(end, start + 1)                       # always make progress
        chunks.append("\n".join(f"[{t['ts']}] {t['speaker']}: {t['text']}" for t in turns[start:end]))
        if end >= len(turns):
            break
        start = max(end - overlap_turns, start + 1)
    return chunks
`,
    },
    {
      file: "extract.py",
      patterns: ["map-reduce"],
      note: md`The **map** step. It runs in parallel, and every chunk gets the attendee list and meeting date so names and dates can be resolved locally.`,
      code: py`
from concurrent.futures import ThreadPoolExecutor

import llm
from schema import ChunkItems

SYSTEM = """You extract commitments from a portion of a consulting client call.
An action item is something a person explicitly agreed or was asked and accepted to do.
Not action items: ideas, possibilities ("we could..."), past work, general discussion.
Use owners' full names from the attendee list. If nobody took ownership, owner='UNASSIGNED'.
Resolve relative deadlines ("by Friday") against the meeting date.
This is one part of a longer call: extract only what is in this part."""


def extract_all(chunks: list[str], attendees: list[str], meeting_date: str) -> list[ChunkItems]:
    header = f"<meeting_date>{meeting_date}</meeting_date>\n<attendees>{'; '.join(attendees)}</attendees>\n"

    def one(chunk: str) -> ChunkItems:
        return llm.parse(SYSTEM, header + f"<transcript_part>\n{chunk}\n</transcript_part>", ChunkItems)

    with ThreadPoolExecutor(max_workers=6) as pool:
        return list(pool.map(one, chunks))
`,
    },
    {
      file: "merge.py",
      patterns: ["validate-retry", "map-reduce"],
      note: md`The **reduce step in code**: dedupe items that appear in two overlapping chunks, and validate every owner and date. Unknown owners aren't silently dropped. They're flagged for the consultant.`,
      code: py`
import re
from datetime import date
from difflib import SequenceMatcher

from schema import ActionItem, ChunkItems


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", s.lower())


def similar(a: ActionItem, b: ActionItem) -> bool:
    same_owner = a.owner == b.owner
    task_sim = SequenceMatcher(None, _norm(a.task), _norm(b.task)).ratio()
    quote_overlap = _norm(a.quote)[:40] in _norm(b.quote) or _norm(b.quote)[:40] in _norm(a.quote)
    return same_owner and (task_sim > 0.7 or quote_overlap)


def merge(parts: list[ChunkItems], attendees: list[str], meeting_date: str) -> tuple[list[ActionItem], list[str]]:
    items: list[ActionItem] = []
    for p in parts:
        for it in p.action_items:
            if not any(similar(it, existing) for existing in items):
                items.append(it)

    warnings, known = [], {a.lower() for a in attendees}
    md = date.fromisoformat(meeting_date)
    for it in items:
        if it.owner != "UNASSIGNED" and it.owner.lower() not in known:
            warnings.append(f"Owner '{it.owner}' not in attendee list: '{it.task}'")
        if it.due:
            try:
                if date.fromisoformat(it.due) < md:
                    warnings.append(f"Due date before meeting: '{it.task}'")
            except ValueError:
                warnings.append(f"Unparseable due date '{it.due}': '{it.task}'")
                it.due = None
    return items, warnings
`,
    },
    {
      file: "notes.py",
      note: md`The orchestrator, which is plain code. A **workflow**, not an agent: the steps are known in advance ([[c:workflow-vs-agent]]). The final summary call gets the *merged* items so it doesn't re-extract.`,
      code: py`
from pydantic import BaseModel

import llm
from chunk import chunk_turns
from extract import extract_all
from merge import merge
from schema import Decision, MeetingNotes


class Recap(BaseModel):
    recap: list[str]
    decisions: list[Decision]


def meeting_notes(turns, attendees, meeting_date) -> tuple[MeetingNotes, list[str]]:
    chunks = chunk_turns(turns)
    parts = extract_all(chunks, attendees, meeting_date)
    items, warnings = merge(parts, attendees, meeting_date)

    all_decisions = [d for p in parts for d in p.decisions]
    recap = llm.parse(
        "Write a 3-6 bullet recap of a client call and a de-duplicated list of decisions, "
        "using only the extracted decisions and open questions provided.",
        "\n".join(f"- DECISION: {d.decision} (\"{d.quote}\")" for d in all_decisions)
        + "\n" + "\n".join(f"- OPEN: {q}" for p in parts for q in p.open_questions),
        Recap, tier="fast")
    open_qs = list(dict.fromkeys(q for p in parts for q in p.open_questions))
    return MeetingNotes(recap=recap.recap, decisions=recap.decisions,
                        action_items=items, open_questions=open_qs), warnings
`,
    },
    {
      file: "push.py",
      patterns: ["parse-then-act"],
      note: md`**Code acts, after a human click.** The consultant approves or edits the list in a simple UI, then code creates the tasks. The quote goes in the task description so anyone can see where it came from.`,
      code: py`
def push_tasks(items, project_gid: str, people: dict[str, str], asana) -> list[str]:
    created = []
    for it in items:
        if it.side != "keystone":
            continue                                   # client tasks go in the follow-up email instead
        task = asana.tasks.create_task({
            "name": it.task,
            "projects": [project_gid],
            "assignee": people.get(it.owner),          # None → unassigned in Asana
            "due_on": it.due,
            "notes": f'From client call. Quote: "{it.quote}"',
        })
        created.append(task["gid"])
    return created
`,
    },
    {
      file: "evals/match_eval.py",
      patterns: ["llm-judge", "eval-harness"],
      note: md`How do you grade a *list*? Match predicted items to human-written items, then compute **precision** (how many predicted items are real) and **recall** (how many real items we found). Matching by meaning needs a model, but it's a very narrow, checkable judging task: "are these the same commitment?"`,
      code: py`
from pydantic import BaseModel

import llm


class Pair(BaseModel):
    gold: int
    predicted: int


class Match(BaseModel):
    pairs: list[Pair]


JUDGE = """You match action items. Gold items were written by a human; predicted items by a system.
Two items match if they describe the same commitment by the same owner (wording may differ).
Each item can match at most one other. Return index pairs."""


def score(gold: list[dict], pred: list[dict]) -> dict:
    g = "\n".join(f"G{i}: [{x['owner']}] {x['task']}" for i, x in enumerate(gold))
    p = "\n".join(f"P{i}: [{x['owner']}] {x['task']}" for i, x in enumerate(pred))
    m = llm.parse(JUDGE, f"<gold>\n{g}\n</gold>\n<predicted>\n{p}\n</predicted>", Match, tier="smart")
    pairs = {(x.gold, x.predicted) for x in m.pairs if x.gold < len(gold) and x.predicted < len(pred)}
    tp = len(pairs)
    return {"precision": tp / max(len(pred), 1), "recall": tp / max(len(gold), 1),
            "missed": [gold[i]["task"] for i in range(len(gold)) if i not in {a for a, _ in pairs}]}
`,
      after: md`> **Check the checker:** hand-match 10 transcripts yourself and compare with the judge's matches. If they agree > 95%, trust the judge for the rest. This is judge calibration in miniature. The full version is in [[proj:i07]].`,
    },
  ],

  evaluate: md`
## Dataset
25 past calls where a careful consultant wrote the "gold" action items, with a mix of short and long calls.

## Experiment: one-shot vs chunked
| Setup | Recall | Precision | Notes |
|---|---|---|---|
| One call, whole transcript | 0.81 | 0.93 | Misses items in the middle of long calls |
| Chunked + merge | 0.92 | 0.88 | Some duplicates survive the merge; tune the similarity threshold |
| Chunked, calls < 45 min sent whole | 0.92 | 0.91 | Route by length |

**Optimise for recall** (from discovery: missing a client request is worse), then let the human review step absorb the remaining precision errors.
`,

  operate: md`
- **Cost:** a 2-hour call ≈ 30k transcript tokens; chunking with overlap ≈ 36k input total + summaries. Roughly a few tens of cents per call on the flagship tier, and much less on the fast tier if the eval allows. 1,500 calls/month is a modest bill compared with 750 consultant-hours saved.
- **Latency:** nobody waits live. Run it when the transcript is ready (async job) and notify the consultant.
- **Monitoring:** consultant edits per meeting (deleted items = precision, added items = recall). That's your live eval.
- **Privacy:** client confidentiality. Restrict who sees transcripts, set data retention, and use enterprise terms with providers.
`,

  levelUp: md`
- **"Ask anything about past calls with this client"** → retrieval across transcripts: [[proj:i01]].
- **Score calls against a sales methodology** → rubric judges with calibration: [[proj:i07]].
- **Thousands of hours of audio per day** → batch processing and queues: [[proj:b03]], [[proj:a02]].
`,

  exercises: [
    "Run the merge with similarity thresholds 0.5, 0.7 and 0.9. Plot duplicates surviving vs. distinct items wrongly merged.",
    "Add a 'client follow-up email' generator that uses the client-side items. What guardrails does an outbound email need? (Preview of [[proj:b07]].)",
    "Find a transcript where a commitment spans a chunk boundary. Does the overlap catch it? What happens if you set overlap to 0?",
    "Hand-match three transcripts and compute agreement with the LLM matcher.",
  ],

  interview: md`
> "For a consultancy's call notes, I treated it as extraction over long input. I chunked transcripts on speaker turns with overlap, extracted commitments in parallel with a verbatim quote each, then merged and deduped in code and validated owners against the calendar attendees and dates against the meeting date. I evaluated list outputs with precision and recall, using a narrow LLM matcher that I calibrated against my own hand matches. Chunking raised recall from 0.81 to 0.92 on long calls, which mattered most because missing a client request was the costliest error. Consultants approve the list in one click before tasks are created."
`,
});
