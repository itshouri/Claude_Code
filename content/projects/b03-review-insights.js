project({
  id: "b03",
  level: "beginner",
  title: "Customer review insights at scale",
  industry: "Hospitality",
  client: "Harbor & Vine: a group of 38 restaurants",
  time: "3–4 hours",
  summary: "Tag 60,000 reviews a year by aspect and sentiment with the Batches API, aggregate in code, and write a monthly report per location.",
  newConcepts: ["Batches API (50% cheaper)", "Aspect-based sentiment", "Aggregate in code, narrate with the model", "Inter-annotator agreement"],
  patterns: ["structured-output", "batch-async", "map-reduce", "caching", "eval-harness"],
  skills: ["Async/batch architecture", "Cost estimation at volume", "Keeping numbers out of the model's hands", "Measuring agreement for subjective labels"],

  brief: md`
> "We have reviews on Google, Yelp, OpenTable and our own surveys, about 5,000 a month. Managers never read them. I want each general manager to get a one-page monthly summary: what guests love, what they complain about, and anything urgent."
> (COO, Harbor & Vine)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Who reads the output? | 38 general managers + the COO | Per-location reports + one roll-up |
| How fresh must it be? | Monthly report; **food safety issues within 24 h** | Two paths: batch for tagging, a fast alert for urgent issues |
| What do you want to track? | Food quality, service, wait time, price/value, ambience, cleanliness, specific dishes, staff mentions | Fixed aspect list = enum |
| What counts as urgent? | Food poisoning, allergens, foreign objects, discrimination, injury | Alert category |
| Do numbers matter? | "We want to see trends: is service getting better at Location 12?" | Counts must be **exact**, so aggregation happens in code |

**Key realisation:** the request sounds like "summarise reviews" (one shape) but is really **Extract per review** (map) → **Aggregate** in code (reduce) → **Narrate** (one small generation per location).
`,

  frame: md`
**Why not just paste 400 reviews into one prompt per location and ask for a summary?**
1. The model would *estimate* counts. Ask it "how many mentioned slow service?" and you'll get a plausible, non-exact number. Managers will compare months, so numbers must be exact.
2. No trend data: you can't compare month to month or slice by dish.
3. Long-input summaries skew toward whatever is vivid, not what is frequent.

**Instead:** tag each review once with a small schema (map), store the tags, then count with plain code. The model only writes the narrative, *given exact numbers and selected quotes*.

**Who is waiting?** Nobody, for the monthly path, so use the **Batches API** at ≈50% of the price. The urgent path needs a near-real-time check, using the same schema called synchronously by the fast tier as reviews arrive.
`,

  design: md`
~~~text
 Review sources ──▶ ingest (dedupe by source+id) ──▶ reviews table
                                                        │
               ┌────────── nightly ─────────────────────┤──── on arrival ───────────┐
               ▼                                        │                           ▼
   Batches API: tag every new review (map)              │          fast tier: urgent check only
               │  results keyed by custom_id            │                           │
               ▼                                        │                           ▼
          tags table  ──monthly──▶ aggregate.py (exact counts, trends, quotes)   alert GM + COO
                                         │
                                         ▼
                         report.py: 1 model call per location (narrate)
                                         │
                                         ▼
                                  email/PDF to GMs
~~~
`,

  tree: txt`
review-insights/
├── schema.py          # ReviewTags
├── batch_submit.py    # nightly: submit untagged reviews
├── batch_collect.py   # poll + store results by custom_id
├── urgent.py          # real-time safety check
├── aggregate.py       # exact counts, month-over-month deltas, quote selection
├── report.py          # narrative per location
└── evals/agreement.py # model vs. human vs. human
`,

  build: [
    {
      file: "schema.py",
      patterns: ["structured-output"],
      note: md`**Aspect-based** sentiment: one review can praise the food and complain about the wait. A single overall sentiment would hide that.`,
      code: py`
from typing import Literal, Optional

from pydantic import BaseModel, Field

Aspect = Literal["food_quality", "service", "wait_time", "price_value", "ambience",
                 "cleanliness", "drinks", "reservation", "other"]
Polarity = Literal["positive", "negative", "mixed"]


class AspectMention(BaseModel):
    aspect: Aspect
    polarity: Polarity
    quote: str = Field(description="Short exact quote from the review (<= 15 words)")
    dish: Optional[str] = Field(None, description="Dish or drink name if mentioned")


class ReviewTags(BaseModel):
    overall: Literal["positive", "neutral", "negative"]
    mentions: list[AspectMention]
    urgent: Optional[Literal["food_safety", "allergen", "foreign_object", "injury",
                             "discrimination"]] = Field(None, description="Only for clear, serious reports")
    staff_named: list[str] = Field(default_factory=list, description="First names of staff mentioned")
`,
    },
    {
      file: "batch_submit.py",
      patterns: ["batch-async", "caching"],
      note: md`One request per review, each with a ~custom_id~ (the review id) so results can be joined back. The system prompt is identical across requests and marked for **prompt caching**. Structured output uses the raw JSON-schema form, generated from the Pydantic model.`,
      code: py`
import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

from schema import ReviewTags

client = anthropic.Anthropic()
MODEL = "claude-haiku-4-5"            # high volume, simple task; confirm on the eval
SYSTEM = [{
    "type": "text",
    "text": open("prompts/tag_review_v2.md").read(),       # aspect definitions + 6 examples
    "cache_control": {"type": "ephemeral"},
}]
SCHEMA = {"type": "json_schema", "schema": ReviewTags.model_json_schema()}


def submit(untagged: list[dict]) -> str:
    """untagged: [{'id': 'g-88213', 'text': '...', 'rating': 2}], up to 100k per batch"""
    batch = client.messages.batches.create(requests=[
        Request(
            custom_id=r["id"],
            params=MessageCreateParamsNonStreaming(
                model=MODEL, max_tokens=800, system=SYSTEM,
                output_config={"format": SCHEMA},
                messages=[{"role": "user",
                           "content": f"<review rating='{r['rating']}/5'>\n{r['text'][:4000]}\n</review>"}],
            ),
        )
        for r in untagged
    ])
    return batch.id          # store it; collection runs later
`,
      after: md`> Pydantic's generated schema may need small adjustments for the API's structured-output rules (e.g. ~additionalProperties: false~ on objects). Test with one request before submitting 5,000.`,
    },
    {
      file: "batch_collect.py",
      patterns: ["batch-async"],
      note: md`Results arrive **in any order**, so always join on ~custom_id~. Errored and expired requests are collected for resubmission. Nothing is silently dropped.`,
      code: py`
import json

import anthropic
from pydantic import ValidationError

from schema import ReviewTags

client = anthropic.Anthropic()


def collect(batch_id: str, db) -> dict:
    batch = client.messages.batches.retrieve(batch_id)
    if batch.processing_status != "ended":
        return {"status": batch.processing_status}

    ok, retry = 0, []
    for res in client.messages.batches.results(batch_id):
        if res.result.type != "succeeded":
            retry.append(res.custom_id)                 # errored / expired / canceled
            continue
        text = next(b.text for b in res.result.message.content if b.type == "text")
        try:
            tags = ReviewTags.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValidationError):
            retry.append(res.custom_id)
            continue
        db.upsert_tags(review_id=res.custom_id, tags=tags.model_dump())   # idempotent upsert
        ok += 1
    return {"status": "ended", "stored": ok, "to_retry": retry}
`,
    },
    {
      file: "aggregate.py",
      patterns: ["map-reduce"],
      note: md`**The reduce step is plain Python.** Counts, percentages and month-over-month deltas are exact. Quote selection is deterministic too: the most recent quotes for the top negative aspects.`,
      code: py`
from collections import Counter, defaultdict


def aggregate(tags_this_month: list[dict], tags_last_month: list[dict]) -> dict:
    def counts(rows):
        c = Counter()
        for t in rows:
            for m in t["mentions"]:
                c[(m["aspect"], m["polarity"])] += 1
        return c

    now, prev = counts(tags_this_month), counts(tags_last_month)
    aspects = sorted({a for a, _ in now} | {a for a, _ in prev})
    table = []
    for a in aspects:
        neg, pos = now[(a, "negative")], now[(a, "positive")]
        neg_prev = prev[(a, "negative")]
        table.append({"aspect": a, "positive": pos, "negative": neg,
                      "negative_change": neg - neg_prev})

    quotes = defaultdict(list)
    dishes = Counter()
    for t in tags_this_month:
        for m in t["mentions"]:
            if len(quotes[(m["aspect"], m["polarity"])]) < 4:
                quotes[(m["aspect"], m["polarity"])].append(m["quote"])
            if m.get("dish"):
                dishes[(m["dish"].lower(), m["polarity"])] += 1

    return {
        "n_reviews": len(tags_this_month),
        "overall": Counter(t["overall"] for t in tags_this_month),
        "aspects": table,
        "top_complaints": sorted(table, key=lambda r: r["negative"], reverse=True)[:3],
        "quotes": {f"{a}/{p}": q for (a, p), q in quotes.items()},
        "dishes": dishes.most_common(10),
        "urgent": [t for t in tags_this_month if t.get("urgent")],
    }
`,
    },
    {
      file: "report.py",
      note: md`The **only** generative step. The model receives exact numbers and real quotes, and is told not to compute or invent numbers. This is "aggregate in code, narrate with the model."`,
      code: py`
import json

import llm

REPORT_SYSTEM = """You write a one-page monthly guest-feedback brief for a restaurant general manager.
Use ONLY the numbers and quotes provided. Do not calculate new numbers or invent quotes.
Structure: 1) Headline (one sentence) 2) What guests loved 3) Top 3 issues with the numbers
and one quote each 4) Changes vs last month 5) Suggested focus for next month (2 bullets).
Plain, direct language. Under 350 words."""


def write_report(location: str, month: str, agg: dict) -> str:
    payload = json.dumps(agg, default=str, indent=1)
    return llm.complete(REPORT_SYSTEM, f"<location>{location}</location><month>{month}</month>\n<data>\n{payload}\n</data>")
`,
    },
    {
      file: "urgent.py",
      note: md`The **real-time path** reuses the same schema with the fast tier as each review arrives. It's a small, cheap call that only matters when ~urgent~ is set.`,
      code: py`
import llm
from schema import ReviewTags

SYSTEM = open("prompts/tag_review_v2.md").read()


def check_on_arrival(review: dict, notify) -> None:
    tags = llm.parse(SYSTEM, f"<review>{review['text'][:4000]}</review>", ReviewTags, tier="fast")
    if tags.urgent:
        notify(location=review["location"], kind=tags.urgent, text=review["text"], url=review["url"])
`,
    },
    {
      file: "evals/agreement.py",
      patterns: ["eval-harness"],
      note: md`Sentiment is **subjective**, so "accuracy" against a single human is misleading. Two staff label the same 150 reviews. We compare model–human agreement with **human–human** agreement: if the model agrees with humans about as often as humans agree with each other, it's at human level.`,
      code: py`
def aspect_set(tags: dict) -> set[tuple[str, str]]:
    return {(m["aspect"], m["polarity"]) for m in tags["mentions"]}


def f1(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    p = len(a & b) / len(a) if a else 0
    r = len(a & b) / len(b) if b else 0
    return 2 * p * r / (p + r) if p + r else 0.0


def agreement(model_tags: dict, human1: dict, human2: dict) -> dict:
    ids = model_tags.keys() & human1.keys() & human2.keys()
    mean = lambda xs: round(sum(xs) / len(xs), 3)
    return {
        "human_vs_human": mean([f1(aspect_set(human1[i]), aspect_set(human2[i])) for i in ids]),
        "model_vs_human1": mean([f1(aspect_set(model_tags[i]), aspect_set(human1[i])) for i in ids]),
        "model_vs_human2": mean([f1(aspect_set(model_tags[i]), aspect_set(human2[i])) for i in ids]),
        "urgent_recall": mean([bool(model_tags[i].get("urgent")) for i in ids if human1[i].get("urgent")] or [1.0]),
    }
`,
    },
  ],

  evaluate: md`
| Metric | Typical result | Reading it |
|---|---|---|
| Human vs human aspect F1 | 0.78 | The ceiling: humans disagree too |
| Model vs human aspect F1 | 0.75–0.80 | At human level → ship |
| Urgent recall | must be ≈1.0 on the 20 seeded urgent reviews | Seed real past incidents into the eval |
| Report faithfulness | spot-check: every number in a report appears in ~agg~ | Write a small checker that extracts numbers from the report and looks them up |

> **The lesson:** for subjective labels, measure against human agreement, not "the truth." It's the same in [[proj:i07]] and [[proj:b10]].
`,

  operate: md`
## Cost
~~~text
5,000 reviews/month × (≈900 input tokens incl. prompt + ≈150 output)
Fast tier, standard:   5,000 × (900×$1 + 150×$5)/1e6  ≈ $8.25/month
Batches API (−50%):                                   ≈ $4.10/month
+ prompt caching on the shared system prompt          → lower still
Reports: 39 calls/month                               ≈ cents
~~~
Cost is negligible, so the design is driven by **exactness and trends**, not price. That's common at small scale, and it changes at [[proj:i06]] scale (400k items/day).

## Operations
- Batch jobs can take up to 24 h, which is fine for monthly reports. That's why urgent detection is a separate path.
- Re-tagging: version your prompt. When it changes, re-tag only last month for comparison, and keep old tags tagged with their version.
`,

  levelUp: md`
- **"Ask questions about all our reviews"** ("what do people say about the brunch menu in Boston?") → store tags + embeddings, then retrieval: [[proj:i01]].
- **Millions of items/day with policies** → cascades and cost engineering: [[proj:i06]].
- **Automated replies to reviews** → generation with brand rules and approval: [[proj:b07]] and [[proj:b08]].
`,

  exercises: [
    "Add a ~dish~ trend: which dishes gained the most negative mentions month over month? Do it in code only.",
    "Write a checker that extracts every number from the generated report and verifies it exists in the aggregate data.",
    "Run the same 150 reviews through the fast and flagship tiers. Is the agreement difference worth the cost difference at this volume? At 100x volume?",
    "Design the schema change needed to track *staff* compliments per employee. What privacy concerns does that raise?",
  ],

  interview: md`
> "The ask sounded like summarisation, but managers wanted trends they could compare month to month, which means exact counts. So I split it: a batch job tags each review with aspect-level sentiment into a schema (Batches API, half price, prompt-cached system prompt), aggregation is plain Python, and the model only narrates from exact numbers and real quotes. Urgent safety issues go through a separate real-time path. Because sentiment is subjective, I evaluated model–human agreement against human–human agreement on 150 double-labelled reviews: the model was at human level, with 100% recall on seeded food-safety incidents."
`,
});
