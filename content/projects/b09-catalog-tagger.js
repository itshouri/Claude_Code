project({
  id: "b09",
  level: "beginner",
  title: "Product catalog normaliser",
  industry: "E-commerce / retail",
  client: "Trailhead Outfitters: an outdoor-gear store with 12,000 SKUs from 80 suppliers",
  time: "3–4 hours",
  summary: "Map messy supplier product data onto a 180-category taxonomy with clean attributes, using hierarchical classification, dynamic schemas and a cached taxonomy prompt.",
  newConcepts: ["Large label sets", "Hierarchical (two-stage) classification", "Schemas generated at runtime", "Attribute normalisation to allowed values"],
  patterns: ["structured-output", "classify-route", "caching", "batch-async", "human-in-loop", "eval-harness"],
  skills: ["Taxonomy problems", "Scaling classification to hundreds of labels", "Data quality engineering"],

  brief: md`
> "Every supplier sends product data differently. 'MENS HYDRO JKT BLK XL' from one, 'Hydro Shell Jacket – Men's – Black' from another. Our site search and filters are a mess because nothing is categorised consistently. We add about 1,500 new SKUs every season."
> (E-commerce Director, Trailhead Outfitters)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Target structure? | 180 leaf categories in a 3-level tree (Apparel > Jackets > Rain Jackets), plus attributes: gender, color family, material, waterproof rating, size system | Taxonomy is *data*, loaded at runtime |
| Why does it matter? | Filters drive 40% of revenue; mis-categorised products are invisible | Business metric: findability |
| Inputs? | Supplier title, description, supplier category, sometimes specs | Messy, multi-format |
| How often does the taxonomy change? | A few categories added per season | Must not require code changes |
| Who fixes errors? | Two merchandisers | Review queue for low confidence |
| Existing labels? | 9,000 SKUs already categorised by hand (mostly correctly) | Eval set + few-shot examples |

**Success:** leaf-category accuracy ≥ 92%, attribute accuracy ≥ 95% on color/gender, with merchandisers reviewing ≤ 15% of new SKUs.
`,

  frame: md`
**Shape:** *Classify* (into a big label set) + *Extract* (attributes).

**The new problem: 180 labels.** Putting 180 options in one enum works, but accuracy drops on look-alike leaves ("Rain Jackets" vs "Insulated Jackets" vs "Softshell Jackets"), and the prompt gets long. Two standard fixes:

1. **Hierarchical classification:** first pick the top level (12 options), then pick a leaf from *only that branch* (≈15 options). Each decision is easier, and the second prompt includes detailed definitions for just that branch.
2. **Dynamic schemas:** generate the ~Literal~ enum from the taxonomy file at runtime, so adding a category is a data change, not a code change.

**Attributes** are normalised to **allowed values** ("Blk", "Jet black", "Noir" → ~black~). The color family is a closed set, with the original supplier color kept as a free-text field.
`,

  design: md`
~~~text
 supplier row ──▶ stage 1: top-level (12 options)   ──▶ "apparel"
                       │  [taxonomy overview: cached prompt]
                       ▼
                 stage 2: leaf within branch (dynamic enum, branch definitions + examples)
                       │  [branch prompt: cached per branch]
                       ▼
                 attributes (allowed values per leaf, also from taxonomy file)
                       │
                       ▼
                 validate (leaf exists, attrs allowed) ──▶ confidence < τ or "unsure" ──▶ merchandiser queue
                       │
                       ▼
                 product DB ──▶ search index & filters

 Seasonal bulk import (1,500 SKUs): same pipeline through the Batches API overnight.
~~~
`,

  tree: txt`
catalog-normaliser/
├── taxonomy.yaml        # tree + definitions + allowed attribute values (owned by merchandising)
├── taxonomy.py          # load tree, build dynamic schemas
├── classify.py          # two-stage classification + attributes
├── examples.py          # pick few-shot examples from already-labelled SKUs
└── evals/eval.py        # top-level, leaf, and attribute accuracy
`,

  build: [
    {
      file: "taxonomy.yaml (excerpt)",
      lang: "yaml",
      note: md`The taxonomy is **owned by the business** and lives in a data file. Definitions and "not this" notes do the heavy lifting for look-alike categories.`,
      code: txt`
apparel:
  description: Clothing worn on the body.
  children:
    rain_jackets:
      path: Apparel > Jackets > Rain Jackets
      definition: Waterproof shell jackets, no insulation. Look for waterproof membranes (e.g. 2.5L, 3L), taped seams.
      not: Insulated or down jackets (→ insulated_jackets); water-resistant softshells (→ softshell_jackets).
      attributes: [gender, color_family, waterproof_rating_mm]
    insulated_jackets:
      path: Apparel > Jackets > Insulated Jackets
      definition: Jackets whose main purpose is warmth (down, synthetic fill), may be water-resistant.
      attributes: [gender, color_family, fill_type]
footwear:
  description: Shoes, boots, sandals.
  children: { }
attribute_values:
  gender: [mens, womens, unisex, kids]
  color_family: [black, white, grey, blue, green, red, orange, yellow, purple, pink, brown, beige, multi]
  fill_type: [down, synthetic, none]
`,
    },
    {
      file: "taxonomy.py",
      patterns: ["structured-output"],
      note: md`**Dynamic schemas.** Pydantic's ~create_model~ builds a model whose ~leaf~ field is a ~Literal~ of exactly that branch's leaves. The API's structured output then guarantees a valid leaf, with no fuzzy string matching afterwards.`,
      code: py`
from typing import Literal, Optional

import yaml
from pydantic import BaseModel, Field, create_model

TAX = yaml.safe_load(open("taxonomy.yaml"))
VALUES = TAX.pop("attribute_values")
TOP_LEVELS = list(TAX.keys())


class TopLevel(BaseModel):
    top: Literal[tuple(TOP_LEVELS)]           # e.g. Literal["apparel", "footwear", ...]
    confidence: float = Field(ge=0, le=1)


def leaf_schema(top: str) -> type[BaseModel]:
    leaves = tuple(TAX[top]["children"].keys()) + ("unsure",)
    return create_model(
        f"Leaf_{top}",
        reasoning=(str, Field(description="Which signals in the product data decide the category")),
        leaf=(Literal[leaves], ...),
        confidence=(float, Field(ge=0, le=1)),
    )


def attribute_schema(top: str, leaf: str) -> type[BaseModel]:
    fields = {}
    for attr in TAX[top]["children"][leaf].get("attributes", []):
        if attr in VALUES:
            fields[attr] = (Optional[Literal[tuple(VALUES[attr])]], None)
        else:                                   # numeric/free attributes
            fields[attr] = (Optional[str], None)
    fields["supplier_color_name"] = (Optional[str], None)
    return create_model(f"Attrs_{leaf}", **fields)


def branch_prompt(top: str) -> str:
    lines = [f"Category branch: {top}: {TAX[top]['description']}", "Leaves:"]
    for key, c in TAX[top]["children"].items():
        lines.append(f"- {key} ({c['path']}): {c['definition']} NOT: {c.get('not', '-')}")
    lines.append("- unsure: the data does not allow a confident choice")
    return "\n".join(lines)
`,
    },
    {
      file: "classify.py",
      patterns: ["classify-route", "caching", "human-in-loop"],
      note: md`Stage 1 routes, stage 2 decides within a branch, stage 3 extracts attributes. The overview and branch prompts are **stable per branch**, so they're cacheable. The product row is the only volatile part.`,
      code: py`
from dataclasses import dataclass

import llm
from examples import examples_for
from taxonomy import TAX, TOP_LEVELS, TopLevel, attribute_schema, branch_prompt, leaf_schema

OVERVIEW = "Choose the top-level category for an outdoor retailer product.\n" + "\n".join(
    f"- {k}: {v['description']}" for k, v in TAX.items())
REVIEW_BELOW = 0.7


@dataclass
class Normalised:
    top: str
    leaf: str
    attributes: dict
    needs_review: bool
    reasons: list[str]


def render(row: dict) -> str:
    return (f"<product>\n<supplier>{row['supplier']}</supplier>\n<title>{row['title']}</title>\n"
            f"<supplier_category>{row.get('supplier_category', '')}</supplier_category>\n"
            f"<description>{row.get('description', '')[:2000]}</description>\n</product>")


def normalise(row: dict) -> Normalised:
    product = render(row)
    t = llm.parse(OVERVIEW, product, TopLevel, tier="fast", max_tokens=100)

    system = branch_prompt(t.top) + "\n\nExamples of correctly categorised products:\n" + examples_for(t.top)
    leaf = llm.parse(system, product, leaf_schema(t.top), max_tokens=400)

    reasons = []
    if leaf.leaf == "unsure":
        return Normalised(t.top, "unsure", {}, True, ["model unsure: " + leaf.reasoning])
    attrs = llm.parse("Extract product attributes. Use only allowed values; null if not stated.",
                      product, attribute_schema(t.top, leaf.leaf), tier="fast", max_tokens=300)

    if min(t.confidence, leaf.confidence) < REVIEW_BELOW:
        reasons.append(f"low confidence ({t.confidence:.2f}/{leaf.confidence:.2f})")
    if row["supplier"] not in KNOWN_SUPPLIERS:
        reasons.append("new supplier: first 20 SKUs reviewed")
    return Normalised(t.top, leaf.leaf, attrs.model_dump(exclude_none=True), bool(reasons), reasons)
`,
    },
    {
      file: "examples.py",
      note: md`**Few-shot examples from your own data.** The 9,000 hand-labelled SKUs are a gold mine. Pick 1–2 per leaf, preferring the "confusable" pairs. Keep the selection **deterministic** (sorted, fixed) so the prompt stays byte-identical and cacheable.`,
      code: py`
import json

LABELLED = [json.loads(l) for l in open("data/labelled_skus.jsonl")]


def examples_for(top: str, per_leaf: int = 2) -> str:
    rows = sorted((r for r in LABELLED if r["top"] == top and r.get("is_exemplar")),
                  key=lambda r: (r["leaf"], r["sku"]))
    seen: dict[str, int] = {}
    out = []
    for r in rows:
        if seen.get(r["leaf"], 0) < per_leaf:
            seen[r["leaf"]] = seen.get(r["leaf"], 0) + 1
            out.append(f"- '{r['title']}' (supplier: {r['supplier']}) → {r['leaf']}")
    return "\n".join(out)
`,
    },
    {
      file: "evals/eval.py",
      patterns: ["eval-harness"],
      note: md`Hold out SKUs that are **not** used as few-shot examples, or you'll be grading the model on answers you showed it. Report the top-level and leaf accuracy separately so you know which stage to fix.`,
      code: py`
import json
from collections import Counter

from classify import normalise


def run(path="data/holdout.jsonl"):
    rows = [json.loads(l) for l in open(path)]
    top_ok = leaf_ok = 0
    attr_ok, attr_n = Counter(), Counter()
    confusions = Counter()
    review = 0
    for r in rows:
        out = normalise(r)
        top_ok += out.top == r["top"]
        leaf_ok += out.leaf == r["leaf"]
        review += out.needs_review
        if out.leaf != r["leaf"]:
            confusions[(r["leaf"], out.leaf)] += 1
        for a, v in r.get("attributes", {}).items():
            attr_n[a] += 1
            attr_ok[a] += out.attributes.get(a) == v
    n = len(rows)
    print(f"top-level {top_ok/n:.1%}  leaf {leaf_ok/n:.1%}  review-rate {review/n:.1%}")
    print("attributes:", {a: f"{attr_ok[a]/attr_n[a]:.1%}" for a in attr_n})
    print("top confusions:", confusions.most_common(8))
`,
    },
  ],

  evaluate: md`
## Data
1,000 held-out SKUs from the 9,000 hand-labelled ones, stratified by top level, **not** marked as exemplars.

## Experiment: flat vs hierarchical
| Approach | Leaf accuracy | Tokens per SKU | Notes |
|---|---|---|---|
| Flat: one call, 180-way enum | 86% | ≈4.5k | Confuses sibling leaves across branches |
| Hierarchical, no examples | 90% | ≈1.5k (3 calls) | Better definitions per branch |
| Hierarchical + exemplars | **93%** | ≈2k | Examples fix supplier-specific jargon |

The **confusion list** is the to-do list: if "softshell ↔ rain jacket" dominates, improve those two definitions or add a contrasting example. Also check the gold labels. About a third of "errors" in old hand-labelled data turn out to be *label* mistakes. Fix the gold set too.
`,

  operate: md`
- **Seasonal bulk:** 1,500 SKUs × 3 calls through the Batches API overnight. Stages depend on each other, so run three batch passes (top → leaf → attributes) or do stage 1 synchronously with the fast tier.
- **Caching:** branch prompts with exemplars are long and identical per branch. Process SKUs grouped by branch to maximise cache hits.
- **Taxonomy changes:** adding a leaf = edit the YAML, add 2 exemplars, and re-run the eval for that branch only.
- **Monitoring:** merchandiser override rate per leaf, and search "zero results" queries (a findability signal).
`,

  levelUp: md`
- **400k items a day (a marketplace)?** Cost matters now: rules first, cheap tier, escalate. See [[proj:i06]].
- **"Find similar products" or semantic search on the catalog?** Embeddings: [[proj:i01]].
- **Images as the main signal?** Vision input and image-based attribute extraction (color from photos), with careful evals because colors in photos lie.
`,

  exercises: [
    "Implement the flat 180-way version and reproduce the comparison table on your own data.",
    "Add a size-system attribute (US/EU/UK) and a normaliser function in code that converts sizes after extraction.",
    "Group SKUs by branch and measure the cache hit rate vs random order.",
    "Find 20 eval 'errors' and classify them as model errors vs gold-label errors. What does that do to your reported accuracy?",
  ],

  interview: md`
> "An outdoor retailer had 12,000 SKUs from 80 suppliers mapped inconsistently to 180 categories. Instead of one 180-way classification, I did it hierarchically: a fast top-level call, then a leaf choice within the branch using a schema generated at runtime from the merchandising team's taxonomy file, with branch-specific definitions, 'not this' notes and exemplars from their existing labels. Attributes are normalised to allowed values. On 1,000 held-out SKUs, hierarchical with exemplars reached 93% leaf accuracy against 86% flat, using fewer tokens. The confusion list drove definition fixes and revealed gold-label errors. Low-confidence and new-supplier SKUs go to merchandisers, and bulk seasonal imports run overnight through the Batches API."
`,
});
