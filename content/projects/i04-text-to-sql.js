project({
  id: "i04",
  level: "intermediate",
  title: "Natural-language analytics (text-to-SQL) with guardrails",
  industry: "Retail (grocery)",
  client: "FreshCart: a 140-store grocery chain with a Postgres data warehouse",
  time: "6–8 hours",
  summary: "Store managers ask questions in plain English. The system retrieves the relevant tables, generates SQL, validates it with a parser, runs it read-only, repairs errors, and explains the result.",
  newConcepts: ["Schema retrieval", "SQL validation with a parser", "Execution-feedback repair", "Execution accuracy evals", "Semantic layer / metric definitions"],
  patterns: ["rag", "parse-then-act", "validate-retry", "guardrails", "caching", "eval-harness"],
  skills: ["Letting models touch databases safely", "Grounding in business definitions", "Evaluating by results, not strings"],

  brief: md`
> "Our analysts get 200 questions a week from store and category managers. Things like 'what were dairy sales in the Northeast last month vs last year?' Half are simple. Can managers just ask the data warehouse directly?"
> (Director of Analytics, FreshCart)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Warehouse? | Postgres, ≈220 tables, ≈40 that matter for common questions | Can't put all the DDL in every prompt → **retrieve relevant tables** |
| Definitions? | "Sales" = net sales after returns and discounts, excluding tax. "Comparable store" = open > 13 months | Metric definitions must be **explicit context**, or the model will use gross sales |
| Who asks? | 140 store managers, 30 category managers | Row-level security: store managers see their region only |
| Risks? | Expensive queries hurting the warehouse; wrong numbers presented confidently; data exposure across regions | Read-only role, timeouts, row limits, RLS, show the SQL, flag assumptions |
| Ground truth? | Analysts have a library of ≈300 past questions with their SQL | **Eval set with gold SQL** |

**Success:** ≥ 85% execution accuracy on the 300-question set; 0 queries that write or exceed limits; every answer shows the SQL and the assumptions used.
`,

  frame: md`
**Shape:** *Decide + act*, where the action is "run a query". This is [[f:probabilistic-core]] in its purest form:
- **The model** translates the question into SQL (a structured proposal).
- **Code** parses the SQL, rejects anything that isn't a single ~SELECT~ on allowlisted tables, injects a ~LIMIT~, and runs it under a **read-only role** with a **statement timeout** and **row-level security**.

**Why retrieval?** 220 tables of DDL is ≈60k tokens of mostly irrelevant schema. We index a **table catalogue** (table descriptions, column descriptions, sample values, join keys) and retrieve the top ≈6 tables per question. That's RAG over *metadata*, not documents.

**The semantic layer:** business definitions ("net sales", "comparable store") are written once as documented SQL snippets and always included. Most wrong answers in text-to-SQL come from **definitions**, not syntax.

**A workflow, not an agent:** retrieve → generate → validate → execute → (repair once on error) → explain. The steps are fixed.
`,

  design: md`
~~~text
 question ──▶ retrieve tables (catalog index: BM25 + embeddings over table/column docs)
                 │ top 6 tables + always-included metric definitions (cached)
                 ▼
            generate SQL  ──▶ SqlProposal{sql, tables, assumptions}
                 │
                 ▼
            validate (sqlglot): single SELECT? allowlisted tables? no functions on denylist?
                 │  inject LIMIT 1000, qualify schemas
                 ▼
            execute: role=analytics_ro, statement_timeout=15s, RLS by user's region
                 │ error? ─────▶ repair once with the DB error message ──▶ validate again
                 ▼
            explain: short answer + table preview + SQL + assumptions
~~~
`,

  tree: txt`
nl-analytics/
├── catalog/
│   ├── tables.yaml         # curated descriptions: what analysts know
│   └── metrics.sql.md      # semantic layer: definitions as SQL snippets
├── schema_index.py         # retrieve relevant tables
├── generate.py             # question → SqlProposal
├── validate.py             # sqlglot-based guard
├── execute.py              # read-only execution with limits
├── pipeline.py             # the workflow with one repair round
└── evals/exec_accuracy.py  # compare result sets with gold SQL
`,

  build: [
    {
      file: "catalog/tables.yaml (excerpt)",
      lang: "yaml",
      note: md`The catalogue is **curated knowledge**, the thing that separates a demo from a working system. Raw DDL column names (~amt_n~, ~flg_cmp~) mean nothing to a model *or* a human.`,
      code: txt`
sales_daily:
  description: One row per store, product and day. Net of returns. Source of truth for sales questions.
  grain: store_id, product_id, sale_date
  columns:
    sale_date: Calendar date (store local time).
    store_id: FK → stores.store_id
    product_id: FK → products.product_id
    net_sales_amt: Net sales in USD after discounts and returns, excluding tax. USE THIS for "sales".
    gross_sales_amt: Before discounts/returns. Only if the user explicitly asks for gross.
    units: Units sold net of returns.
  joins: [stores.store_id, products.product_id]
stores:
  description: Store master data.
  columns:
    region: One of Northeast, Southeast, Midwest, West.
    open_date: Store opening date. Used for comparable-store logic.
products:
  description: Product hierarchy. Department > category > subcategory.
  columns:
    department: e.g. Dairy, Produce, Bakery, Frozen.
`,
    },
    {
      file: "schema_index.py",
      patterns: ["rag"],
      note: md`Each table becomes one "document" (description + columns + joins). Retrieval returns the **top tables**, and we also add tables they join to, so the model can write correct joins.`,
      code: py`
import yaml

from bm25 import BM25        # the tiny retriever from B05; swap for hybrid search at scale

CATALOG = yaml.safe_load(open("catalog/tables.yaml"))
NAMES = list(CATALOG)


def table_doc(name: str) -> str:
    t = CATALOG[name]
    cols = "\n".join(f"  - {c}: {d}" for c, d in t.get("columns", {}).items())
    return f"TABLE {name}: {t['description']}\nGrain: {t.get('grain', '-')}\nColumns:\n{cols}\nJoins: {t.get('joins', [])}"


INDEX = BM25([table_doc(n) for n in NAMES])


def relevant_tables(question: str, k: int = 6) -> list[str]:
    hits = [NAMES[i] for i in INDEX.search(question, k)]
    for h in list(hits):                                # pull in join partners
        for j in CATALOG[h].get("joins", []):
            t = j.split(".")[0]
            if t not in hits:
                hits.append(t)
    return hits[: k + 3]
`,
    },
    {
      file: "generate.py",
      patterns: ["structured-output", "caching"],
      note: md`The metric definitions are **stable**, so they go in the cached system prompt. The retrieved tables and the question are volatile and go last. ~assumptions~ forces the model to surface interpretation choices ("last month = September 2026") for the user to see.`,
      code: py`
from datetime import date

from pydantic import BaseModel, Field

import llm
from schema_index import relevant_tables, table_doc

METRICS = open("catalog/metrics.sql.md").read()
SYSTEM = f"""You write PostgreSQL for FreshCart's analytics warehouse.
Rules:
- One SELECT statement. No DDL/DML. Use only the tables provided.
- Use the metric definitions below exactly; e.g. 'sales' means net_sales_amt.
- Prefer explicit JOINs with the documented keys. Aggregate at the grain the question asks.
- If the question is ambiguous, choose the most common business interpretation and state it in assumptions.
- If it cannot be answered with these tables, set sql to an empty string and explain in assumptions.

<metric_definitions>
{METRICS}
</metric_definitions>"""


class SqlProposal(BaseModel):
    reasoning: str = Field(description="Brief plan: tables, joins, filters, grouping")
    sql: str
    assumptions: list[str]


def propose(question: str, feedback: str = "") -> tuple[SqlProposal, list[str]]:
    tables = relevant_tables(question)
    schema = "\n\n".join(table_doc(t) for t in tables)
    user = (f"<today>{date.today().isoformat()}</today>\n<schema>\n{schema}\n</schema>\n"
            f"<question>{question}</question>{feedback}")
    return llm.parse(SYSTEM, user, SqlProposal, max_tokens=3000), tables
`,
    },
    {
      file: "validate.py",
      patterns: ["guardrails", "parse-then-act"],
      note: md`**Never run model SQL as a string.** Parse it into a syntax tree, then check the *structure*: exactly one statement, a ~SELECT~, only allowlisted tables, no dangerous functions. Finally re-generate the SQL *from the tree* with a ~LIMIT~. The database role is the second wall, and RLS is the third.`,
      code: py`
import sqlglot
from sqlglot import exp

ALLOWED_TABLES = {"sales_daily", "stores", "products", "promotions", "calendar", "inventory_daily"}
DENY_FUNCS = {"pg_sleep", "pg_read_file", "dblink", "lo_import", "set_config"}
MAX_ROWS = 1000


class Rejected(Exception):
    pass


def validate(sql: str) -> str:
    try:
        statements = sqlglot.parse(sql, dialect="postgres")
    except sqlglot.errors.ParseError as e:
        raise Rejected(f"SQL does not parse: {e}")
    if len(statements) != 1 or statements[0] is None:
        raise Rejected("Exactly one statement is allowed.")
    tree = statements[0]
    if not isinstance(tree, (exp.Select, exp.Union, exp.With)) or tree.find(exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Create):
        raise Rejected("Only read-only SELECT queries are allowed.")

    cte_names = {c.alias_or_name for c in tree.find_all(exp.CTE)}
    tables = {t.name for t in tree.find_all(exp.Table)} - cte_names
    bad = tables - ALLOWED_TABLES
    if bad:
        raise Rejected(f"Tables not allowed: {sorted(bad)}")
    funcs = {f.sql_name().lower() for f in tree.find_all(exp.Func)} | \
            {a.name.lower() for a in tree.find_all(exp.Anonymous)}
    if funcs & DENY_FUNCS:
        raise Rejected(f"Functions not allowed: {sorted(funcs & DENY_FUNCS)}")

    if isinstance(tree, exp.Select) and not tree.args.get("limit"):
        tree = tree.limit(MAX_ROWS)
    return tree.sql(dialect="postgres")
`,
    },
    {
      file: "execute.py",
      note: md`Defence in depth at the database: a **read-only role**, a **statement timeout**, and **row-level security** keyed on the user's region. Even a query that slipped past validation can't write, can't run forever, and can't see other regions.`,
      code: py`
import psycopg


def run_query(sql: str, user) -> tuple[list[str], list[tuple]]:
    with psycopg.connect(dsn=RO_DSN) as conn:                # role analytics_ro: SELECT only
        conn.execute("SET statement_timeout = '15s'")
        conn.execute("SELECT set_config('app.user_region', %s, true)", (user.region or "ALL",))  # RLS policy reads this
        cur = conn.execute(sql)
        cols = [d.name for d in cur.description]
        return cols, cur.fetchmany(1000)
`,
    },
    {
      file: "pipeline.py",
      patterns: ["validate-retry"],
      note: md`**One repair round** using the *actual* error: a parser rejection or a database error ("column store_region does not exist"). Execution feedback is the most informative signal you can give a model writing code.`,
      code: py`
import llm
from execute import run_query
from generate import propose
from validate import Rejected, validate


def ask(question: str, user) -> dict:
    feedback = ""
    for attempt in range(2):
        proposal, tables = propose(question, feedback)
        if not proposal.sql.strip():
            return {"status": "cannot_answer", "why": proposal.assumptions}
        try:
            safe_sql = validate(proposal.sql)
            cols, rows = run_query(safe_sql, user)
            break
        except (Rejected, Exception) as e:
            feedback = f"\n<previous_attempt>\n{proposal.sql}\n</previous_attempt>\n<error>{e}</error>\nFix the query."
    else:
        return {"status": "failed", "sql": proposal.sql, "error": feedback}

    preview = "\n".join([", ".join(cols)] + [", ".join(map(str, r)) for r in rows[:30]])
    summary = llm.complete(
        "Answer the manager's question in 1-3 sentences from the query result. Use exact numbers "
        "from the result; do not compute new ones. Mention the time period.",
        f"<question>{question}</question>\n<result rows='{len(rows)}'>\n{preview}\n</result>",
        tier="fast", max_tokens=300)
    return {"status": "ok", "answer": summary, "sql": safe_sql, "assumptions": proposal.assumptions,
            "columns": cols, "rows": rows[:200], "tables": tables}
`,
    },
    {
      file: "evals/exec_accuracy.py",
      patterns: ["eval-harness"],
      note: md`**Execution accuracy:** run the gold SQL and the generated SQL on the same test database and compare the **result sets**, not the SQL strings. Two very different queries can be equally correct. Normalise: ignore column order and names, round floats, and sort rows unless the question asks for an order.`,
      code: py`
import json

from execute import run_query
from pipeline import ask


def normalise(cols, rows, ordered: bool):
    out = [tuple(round(v, 2) if isinstance(v, float) else v for v in r) for r in rows]
    out = [tuple(sorted(r, key=str)) for r in out]           # ignore column order
    return out if ordered else sorted(out, key=str)


def run(path="evals/questions.jsonl", user=None):
    rows = [json.loads(l) for l in open(path)]
    hits, fails = 0, []
    for r in rows:
        gold_cols, gold_rows = run_query(r["gold_sql"], user)
        got = ask(r["question"], user)
        ok = got["status"] == "ok" and normalise(got["columns"], got["rows"], r.get("ordered", False)) == \
             normalise(gold_cols, gold_rows, r.get("ordered", False))
        hits += ok
        if not ok:
            fails.append({"q": r["question"], "status": got["status"], "sql": got.get("sql"),
                          "assumptions": got.get("assumptions")})
    print(f"execution accuracy: {hits/len(rows):.1%}")
    for f in fails[:20]:
        print("-", f["q"], "|", f["status"], "|", f.get("assumptions"))
`,
    },
  ],

  evaluate: md`
## Data
300 historical questions with analysts' gold SQL, split by difficulty: single table, joins, time comparisons (YoY, MoM), comparable-store logic.

## Typical failure analysis
| Failure type | Share of errors | Fix |
|---|---|---|
| Wrong metric (gross vs net, units vs sales) | 35% | Strengthen metric definitions, and add "USE THIS" notes in the catalogue |
| Wrong time window ("last month", fiscal vs calendar) | 25% | Add a ~calendar~ table with fiscal periods + a definition snippet |
| Missing table (retrieval miss) | 15% | Improve table descriptions; raise k |
| Join errors / grain | 15% | Document grain per table; examples of correct joins |
| Ambiguous question (gold is one interpretation) | 10% | Not a model error: surface assumptions, and maybe ask a clarifying question |

> Notice most fixes are to the **catalogue and definitions**, which is data work, not prompt hacking. That's the senior insight for text-to-SQL.

## Safety eval
50 adversarial questions ("delete last year's data", "show me all regions" from a Northeast manager, "pg_sleep for a minute"). **Zero** may execute anything harmful or out of scope.
`,

  operate: md`
- **Cost:** ≈3–6k input tokens (cached metric definitions + 6 tables) + ≈500 output per question. Cents per question.
- **Latency:** generation 2–5 s + query time. Show the SQL as soon as it's validated, then the results.
- **Trust UX:** always show the SQL, the assumptions and the period. Add an "ask an analyst to verify" button, and log those as hard eval cases.
- **Caching:** an app-level cache of (normalised question, user region, data date) → result for popular questions.
- **Governance:** the catalogue is owned by analytics, reviewed like code, and every change re-runs the eval.
`,

  levelUp: md`
- **Charts and multi-step analysis** ("why did dairy drop?") → an agent that runs several queries and explains: [[proj:a05]]-style investigation loops.
- **Thousands of tables across many databases** → a proper semantic layer (metrics store) and hybrid retrieval: [[proj:i01]].
- **Company-wide data access policy for many AI apps** → [[proj:a04]].
`,

  exercises: [
    "Add 10 questions involving 'comparable stores'. Write the definition snippet, then measure accuracy before and after.",
    "Try to bypass ~validate()~: CTEs that hide a table name, comments, case tricks, ~UNION~ with a forbidden table. Fix every bypass you find.",
    "Implement a clarifying-question path: when the model lists two or more plausible interpretations, ask the user to choose.",
    "Compare retrieval k=3, 6 and 10 tables. Plot execution accuracy vs prompt tokens.",
  ],

  interview: md`
> "For a grocery chain's text-to-SQL, the model only proposes SQL. Code parses it with sqlglot, allows a single SELECT on allowlisted tables, blocks dangerous functions, and regenerates it with a LIMIT. It runs under a read-only role with a statement timeout and row-level security by the manager's region. Schema context comes from a curated catalogue retrieved per question, plus always-included metric definitions in a cached prompt, because most errors are semantic ('sales' means net sales) rather than syntactic. On 300 historical questions I measured execution accuracy by comparing normalised result sets with analysts' gold SQL. Most improvements came from fixing the catalogue and definitions, and the adversarial set had zero harmful executions."
`,
});
