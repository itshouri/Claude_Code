project({
  id: "i01",
  level: "intermediate",
  title: "Production RAG copilot for support agents",
  industry: "Fintech",
  client: "Ledgerly: business banking for 90,000 small companies; 120 support agents",
  time: "6–8 hours",
  summary: "Hybrid search (Postgres full-text + pgvector) with reranking over 1,400 help articles and internal runbooks, with retrieval evaluated separately from generation.",
  newConcepts: ["Embeddings + vector index", "Hybrid search with RRF", "Reranking", "Ingestion pipeline", "recall@k / MRR", "Faithfulness judging"],
  patterns: ["rag", "hybrid-search", "grounded-citations", "caching", "eval-harness", "llm-judge", "llm-gateway"],
  skills: ["Designing ingestion and chunking", "Evaluating retrieval on its own", "Diagnosing RAG failures", "Postgres as an AI database"],

  brief: md`
> "Our agents have 1,400 help-center articles and 300 internal runbooks to search, and they still ask each other on Slack. We want an assistant in the support console that suggests an answer with sources while the agent is reading the ticket."
> (VP Customer Operations, Ledgerly)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Corpus? | 1,400 public articles + 300 internal runbooks (Confluence); ≈1.2M tokens; ≈40 edits/week | Too big to always send whole; changes weekly → **incremental ingestion** |
| Who sees what? | Agents see everything; customers will later see public articles only | A ~visibility~ field on every chunk now saves a rewrite later |
| Query style? | Agents paste the customer's message: long, messy, with error codes like ~ACH-R03~ and product names | Exact tokens matter → **hybrid search** |
| Latency? | Suggestion should appear within ≈5 s of opening a ticket | Retrieval < 500 ms; stream the answer |
| Ground truth? | 18 months of tickets where agents linked an article in their reply | **Free retrieval labels** |
| Risk? | Wrong info about money movement or fees causes real losses and complaints | Grounding, citations, "not found", and agent review (it's a copilot) |

**Success:** retrieval recall@5 ≥ 90% on linked-article tickets; faithfulness ≥ 95%; agents accept or lightly edit ≥ 50% of suggestions.
`,

  frame: md`
**Shape:** *Retrieve + answer*, now at a scale where [[proj:b05]]'s choices break:
- 1.2M tokens won't fit in every request at acceptable cost and latency, so **select** context (RAG).
- Agents paste paraphrased customer language **and** exact codes, so keyword-only or vector-only search each fail on some queries. Use **hybrid**.
- With 1,700 documents, the top-50 candidates contain the answer more often than the top-5 do, so add a **reranker** to put the right ones on top.

**The architecture splits into two pipelines**, a classic RAG system design:
1. **Ingestion (offline, incremental):** fetch → clean → chunk → embed → upsert.
2. **Query (online):** rewrite → hybrid retrieve → rerank → generate with citations → verify.

**The rule of RAG debugging:** when an answer is wrong, first check *whether the right chunk was retrieved*. Most failures are retrieval failures. That's why we evaluate retrieval separately.
`,

  design: md`
~~~text
 INGESTION (every 15 min)                                QUERY (per ticket)
 ────────────────────────                                ─────────────────
 Help center API ─┐                                      ticket text
 Confluence API ──┼─▶ changed docs since last sync         │
                  │        │                               ▼
                  │        ▼                          query rewrite (fast tier):
                  │   clean HTML → markdown           "what is the customer asking?" + keywords
                  │        │                               │
                  │        ▼                     ┌─────────┴──────────┐
                  │   chunk by headings          ▼                    ▼
                  │   (title + breadcrumb        Postgres FTS        pgvector
                  │    prepended to chunk)       (top 40)            (top 40)
                  │        │                     └─────────┬──────────┘
                  │        ▼                               ▼
                  │   embed (batch) ──▶ Postgres:      RRF merge → top 30
                  │   content hash: skip unchanged       │
                  │                  chunks(id, doc_id,   ▼
                  │                  text, tsv, vector,  reranker → top 6
                  │                  visibility, url)     │
                  └── deleted docs → delete chunks        ▼
                                                     answer (flagship, streamed) + citations
                                                          │
                                                     verify citations → console sidebar
~~~

| Decision | Choice | Why |
|---|---|---|
| Vector DB | **Postgres + pgvector** | They already run Postgres; one database for text, vectors, metadata and permissions. A dedicated vector DB is worth it at 100M+ vectors or very high QPS |
| Keyword search | Postgres full-text (~tsvector~) | Good enough, same database. Use OpenSearch or Tantivy if you need advanced BM25 tuning |
| Chunking | By heading, ≈300–800 tokens, title + breadcrumb prepended | Self-contained chunks retrieve and read better |
| Embeddings | A hosted embedding model (e.g. Voyage) with ~input_type~ query/document | Asymmetric embeddings improve retrieval |
| Reranker | Hosted cross-encoder reranker | Typically the largest single quality jump after hybrid |
`,

  tree: txt`
support-copilot/
├── db/schema.sql
├── ingest/
│   ├── sources.py      # help center + Confluence fetchers (changed since cursor)
│   ├── chunker.py
│   └── pipeline.py     # hash → embed → upsert → delete
├── retrieve.py         # rewrite → hybrid → RRF → rerank
├── answer.py           # grounded answer + verification
├── api.py              # FastAPI + streaming endpoint for the console
└── evals/
    ├── build_retrieval_set.py   # from tickets with linked articles
    ├── retrieval_eval.py        # recall@k, MRR
    └── faithfulness_eval.py     # LLM judge, calibrated
`,

  build: [
    {
      file: "db/schema.sql",
      lang: "sql",
      note: md`One table holds everything a retrieval system needs: text, a full-text index, a vector index, **metadata for filtering** (visibility, product), and a **content hash** for incremental updates.`,
      code: txt`
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id           TEXT PRIMARY KEY,             -- doc_id + '#' + section slug
  doc_id       TEXT NOT NULL,
  source       TEXT NOT NULL,                -- 'helpcenter' | 'confluence'
  title        TEXT NOT NULL,
  breadcrumb   TEXT NOT NULL,                -- "Payments > ACH > Returns"
  url          TEXT NOT NULL,
  visibility   TEXT NOT NULL,                -- 'public' | 'internal'
  text         TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL,
  tsv          TSVECTOR GENERATED ALWAYS AS
               (setweight(to_tsvector('english', title), 'A') || to_tsvector('english', text)) STORED,
  embedding    VECTOR(1024)
);
CREATE INDEX chunks_tsv ON chunks USING GIN (tsv);
CREATE INDEX chunks_vec ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_doc ON chunks (doc_id);
`,
    },
    {
      file: "ingest/chunker.py",
      patterns: ["rag"],
      note: md`Chunk **by structure**. Each chunk gets its title and breadcrumb prepended, because a chunk that starts "Returns are processed within 2 days" means nothing without "ACH > Returns" above it.`,
      code: py`
import hashlib
import re
from dataclasses import dataclass


@dataclass
class Chunk:
    id: str
    doc_id: str
    title: str
    breadcrumb: str
    text: str
    content_hash: str


def chunk_markdown(doc_id: str, title: str, breadcrumb: str, md: str,
                   max_chars: int = 3000, min_chars: int = 300) -> list[Chunk]:
    parts = re.split(r"\n(?=#{2,3} )", md)            # split before H2/H3
    merged, buf = [], ""
    for p in parts:                                    # merge tiny sections with the next one
        buf = f"{buf}\n{p}".strip() if buf else p
        if len(buf) >= min_chars:
            merged.append(buf)
            buf = ""
    if buf:
        merged.append(buf)

    chunks = []
    for i, section in enumerate(merged):
        for j in range(0, len(section), max_chars):    # hard split only for very long sections
            body = section[j:j + max_chars]
            heading = re.match(r"#{2,3} (.+)", body)
            sub = heading.group(1) if heading else ""
            text = f"{title}\n{breadcrumb}{' > ' + sub if sub else ''}\n\n{body}"
            chunks.append(Chunk(f"{doc_id}#{i}.{j // max_chars}", doc_id, title, breadcrumb, text,
                                hashlib.sha256(text.encode()).hexdigest()))
    return chunks
`,
    },
    {
      file: "ingest/pipeline.py",
      patterns: ["batch-async"],
      note: md`**Incremental ingestion.** Only re-embed chunks whose hash changed, and delete chunks of removed or shortened documents. Without this you re-embed everything every night, which is slow and expensive, and stale chunks linger forever.`,
      code: py`
import voyageai

from ingest.chunker import chunk_markdown
from ingest.sources import changed_docs, deleted_doc_ids

vo = voyageai.Client()          # VOYAGE_API_KEY
EMBED_MODEL = "voyage-3.5"


def sync(conn, cursor: str) -> str:
    new_cursor = cursor
    for doc in changed_docs(since=cursor):
        chunks = chunk_markdown(doc.id, doc.title, doc.breadcrumb, doc.markdown)
        existing = dict(conn.execute("SELECT id, content_hash FROM chunks WHERE doc_id = %s", (doc.id,)).fetchall())
        todo = [c for c in chunks if existing.get(c.id) != c.content_hash]
        if todo:
            vecs = vo.embed([c.text for c in todo], model=EMBED_MODEL, input_type="document").embeddings
            for c, v in zip(todo, vecs):
                conn.execute("""
                    INSERT INTO chunks (id, doc_id, source, title, breadcrumb, url, visibility, text,
                                        content_hash, updated_at, embedding)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s, now(), %s)
                    ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, content_hash = EXCLUDED.content_hash,
                        embedding = EXCLUDED.embedding, updated_at = now(), title = EXCLUDED.title,
                        breadcrumb = EXCLUDED.breadcrumb, visibility = EXCLUDED.visibility""",
                    (c.id, doc.id, doc.source, c.title, c.breadcrumb, doc.url, doc.visibility, c.text,
                     c.content_hash, v))
        keep = [c.id for c in chunks]                   # remove chunks that no longer exist
        conn.execute("DELETE FROM chunks WHERE doc_id = %s AND NOT (id = ANY(%s))", (doc.id, keep))
        new_cursor = max(new_cursor, doc.updated_at)
    for doc_id in deleted_doc_ids(since=cursor):
        conn.execute("DELETE FROM chunks WHERE doc_id = %s", (doc_id,))
    conn.commit()
    return new_cursor
`,
    },
    {
      file: "retrieve.py",
      patterns: ["hybrid-search", "rag"],
      note: md`The query pipeline. **Query rewriting** turns a rambling customer message into a focused search query while keeping exact codes. Then two retrievers, RRF fusion and a reranker. Each stage is a function you can evaluate on its own.`,
      code: py`
from dataclasses import dataclass

import voyageai
from pydantic import BaseModel, Field

import llm

vo = voyageai.Client()


class SearchQuery(BaseModel):
    question: str = Field(description="The customer's actual question, one sentence")
    keywords: list[str] = Field(description="Exact identifiers: error codes, product names, field names")


@dataclass
class Hit:
    id: str
    title: str
    url: str
    text: str
    score: float = 0.0


def rewrite(ticket: str) -> SearchQuery:
    return llm.parse("Turn a support ticket into a search query for a help-center search engine. "
                     "Keep exact codes and product names verbatim.",
                     f"<ticket>{ticket[:6000]}</ticket>", SearchQuery, tier="fast", max_tokens=200)


def keyword_search(conn, q: str, k: int, visibility: list[str]) -> list[str]:
    rows = conn.execute("""SELECT id FROM chunks
        WHERE tsv @@ websearch_to_tsquery('english', %s) AND visibility = ANY(%s)
        ORDER BY ts_rank_cd(tsv, websearch_to_tsquery('english', %s)) DESC LIMIT %s""",
        (q, visibility, q, k)).fetchall()
    return [r[0] for r in rows]


def vector_search(conn, q: str, k: int, visibility: list[str]) -> list[str]:
    qv = vo.embed([q], model="voyage-3.5", input_type="query").embeddings[0]
    rows = conn.execute("""SELECT id FROM chunks WHERE visibility = ANY(%s)
        ORDER BY embedding <=> %s::vector LIMIT %s""", (visibility, qv, k)).fetchall()
    return [r[0] for r in rows]


def rrf(*lists: list[str], k: int = 60) -> list[str]:
    s: dict[str, float] = {}
    for lst in lists:
        for rank, cid in enumerate(lst):
            s[cid] = s.get(cid, 0.0) + 1.0 / (k + rank + 1)
    return sorted(s, key=s.get, reverse=True)


def retrieve(conn, ticket: str, visibility=("public", "internal"), final_k: int = 6) -> tuple[SearchQuery, list[Hit]]:
    sq = rewrite(ticket)
    text_q = sq.question + " " + " ".join(sq.keywords)
    ids = rrf(keyword_search(conn, " ".join(sq.keywords) or sq.question, 40, list(visibility)),
              vector_search(conn, sq.question, 40, list(visibility)))[:30]
    if not ids:
        return sq, []
    rows = {r[0]: Hit(*r) for r in conn.execute(
        "SELECT id, title, url, text FROM chunks WHERE id = ANY(%s)", (ids,)).fetchall()}
    cands = [rows[i] for i in ids if i in rows]
    rr = vo.rerank(text_q, [c.text for c in cands], model="rerank-2.5", top_k=final_k)
    return sq, [Hit(cands[r.index].id, cands[r.index].title, cands[r.index].url,
                    cands[r.index].text, r.relevance_score) for r in rr.results]
`,
    },
    {
      file: "answer.py",
      patterns: ["grounded-citations", "caching"],
      note: md`Generation with the same grounding contract as [[proj:b05]]: status, citations, quotes, verified in code. The stable instructions are cached, and the volatile retrieved chunks and ticket come last.`,
      code: py`
import re
from typing import Literal

from pydantic import BaseModel, Field

import llm

SYSTEM = """You are a copilot for Ledgerly support agents. Draft a reply the agent can send.
Use ONLY the provided documents. Cite chunk ids for each fact. Copy key sentences verbatim into quotes.
If the documents do not contain the answer, status=not_found and say what information is missing.
Fees, limits, timelines and regulatory statements must be quoted, never paraphrased from memory.
Internal runbook steps are for the agent: label them 'Internal:' and never put them in the customer reply."""


class Suggestion(BaseModel):
    status: Literal["answered", "partial", "not_found"]
    customer_reply: str
    internal_notes: str
    citations: list[str]
    quotes: list[str] = Field(description="Verbatim supporting sentences")


def suggest(ticket: str, hits) -> tuple[Suggestion, list[str]]:
    docs = "\n\n".join(f'<doc id="{h.id}" title="{h.title}" url="{h.url}">\n{h.text}\n</doc>' for h in hits)
    s = llm.parse(SYSTEM, f"<documents>\n{docs}\n</documents>\n<ticket>\n{ticket[:6000]}\n</ticket>", Suggestion)
    by_id = {h.id: re.sub(r"\s+", " ", h.text) for h in hits}
    problems = [f"bad citation {c}" for c in s.citations if c not in by_id]
    cited = " ".join(by_id.get(c, "") for c in s.citations)
    problems += [f"unverified quote: {q[:50]}" for q in s.quotes if re.sub(r"\s+", " ", q) not in cited]
    return s, problems
`,
    },
    {
      file: "evals/build_retrieval_set.py",
      patterns: ["eval-harness"],
      note: md`**Mine your history for labels.** Tickets where an agent linked an article are (query, relevant doc) pairs for free. Filter to tickets where the customer later marked the issue as solved, to reduce noise.`,
      code: py`
import json
import re


def build(tickets, out="evals/retrieval.jsonl", n=300):
    rows = []
    for t in tickets:
        links = re.findall(r"help\.ledgerly\.example/articles/(\d+)", t.agent_reply)
        if links and t.solved and len(t.customer_message) > 40:
            rows.append({"query": t.customer_message, "relevant_doc_ids": sorted(set(links)),
                         "ticket_id": t.id})
    rows = rows[:n]
    with open(out, "w") as f:
        f.writelines(json.dumps(r) + "\n" for r in rows)
    return len(rows)
`,
    },
    {
      file: "evals/retrieval_eval.py",
      patterns: ["eval-harness"],
      note: md`**recall@k:** did any relevant doc appear in the top k? **MRR:** how high was the first relevant one? Run it for each retriever *and* each combination. That's how you justify the hybrid design with numbers.`,
      code: py`
import json

from retrieve import keyword_search, rewrite, rrf, vector_search, vo


def doc_of(chunk_id: str) -> str:
    return chunk_id.split("#")[0]


def metrics(ranked_chunk_ids: list[str], relevant_docs: set[str], k: int) -> tuple[float, float]:
    docs = []
    for cid in ranked_chunk_ids:                     # dedupe to doc level, keep order
        d = doc_of(cid)
        if d not in docs:
            docs.append(d)
    hit = any(d in relevant_docs for d in docs[:k])
    rr = next((1 / (i + 1) for i, d in enumerate(docs) if d in relevant_docs), 0.0)
    return float(hit), rr


def run(conn, path="evals/retrieval.jsonl", k=5):
    rows = [json.loads(l) for l in open(path)]
    systems = {"keyword": [], "vector": [], "hybrid": [], "hybrid+rerank": []}
    for r in rows:
        sq = rewrite(r["query"])
        kw = keyword_search(conn, " ".join(sq.keywords) or sq.question, 40, ["public", "internal"])
        vec = vector_search(conn, sq.question, 40, ["public", "internal"])
        hyb = rrf(kw, vec)[:30]
        texts = dict(conn.execute("SELECT id, text FROM chunks WHERE id = ANY(%s)", (hyb,)).fetchall())
        cands = [c for c in hyb if c in texts]
        rr = vo.rerank(sq.question, [texts[c] for c in cands], model="rerank-2.5", top_k=10)
        reranked = [cands[x.index] for x in rr.results]
        rel = set(r["relevant_doc_ids"])
        for name, ranked in [("keyword", kw), ("vector", vec), ("hybrid", hyb), ("hybrid+rerank", reranked)]:
            systems[name].append(metrics(ranked, rel, k))
    for name, ms in systems.items():
        print(f"{name:15s} recall@{k}={sum(m[0] for m in ms)/len(ms):.3f}  MRR={sum(m[1] for m in ms)/len(ms):.3f}")
`,
    },
    {
      file: "evals/faithfulness_eval.py",
      patterns: ["llm-judge"],
      note: md`**Generation quality**, measured *given* the retrieved chunks: is every claim in the reply supported by them? Calibrate this judge on 50 human-labelled suggestions before trusting it. The method is in [[proj:i07]].`,
      code: py`
from typing import Literal

from pydantic import BaseModel

import llm


class Claim(BaseModel):
    claim: str
    supported: Literal["yes", "no", "partially"]
    source_id: str | None


class Faithfulness(BaseModel):
    claims: list[Claim]


JUDGE = """List every factual claim in the reply. For each, decide whether the documents support it.
'yes' only if a document states it; 'partially' if it overstates; 'no' if unsupported."""


def faithfulness(reply: str, docs: str) -> float:
    v = llm.parse(JUDGE, f"<documents>{docs}</documents>\n<reply>{reply}</reply>", Faithfulness)
    if not v.claims:
        return 1.0
    return sum(c.supported == "yes" for c in v.claims) / len(v.claims)
`,
    },
  ],

  evaluate: md`
## Retrieval first (300 queries mined from tickets)
| Retriever | recall@5 | MRR |
|---|---|---|
| Keyword (FTS) | 0.71 | 0.52 |
| Vector | 0.78 | 0.58 |
| Hybrid (RRF) | 0.86 | 0.64 |
| Hybrid + rerank | **0.92** | **0.79** |

*Typical shape of results; your numbers will differ.* Keyword search wins on error-code queries, vector search wins on paraphrases, and fusion gets most of both. Look at the **failures by category**: if most misses are queries about a product launched last month, it's a *content* gap, not a retrieval problem. Tell the docs team.

## Then generation (150 tickets, top-6 chunks)
- Faithfulness (calibrated judge): ≥ 95% of claims supported.
- ~not_found~ correctness: on 30 tickets with no answer in the docs, the copilot must say so.
- Agent acceptance (online): sent unchanged or lightly edited.
`,

  operate: md`
| Concern | Plan |
|---|---|
| Latency | Rewrite ≈0.5 s (fast tier) + retrieval ≈100–200 ms + rerank ≈200 ms + streamed answer (first tokens < 2 s). Precompute suggestions when the ticket arrives, before the agent opens it. |
| Cost | Embeddings: one-time ≈1.2M tokens plus small incremental updates. Per ticket: rewrite + rerank + one flagship answer ≈ 8–10k input tokens. A few cents per ticket. |
| Freshness | 15-minute incremental sync; alert if the sync lags > 1 h. Show ~updated_at~ on citations. |
| Monitoring | Per suggestion: retrieved ids, rerank scores, status, verification problems, agent action (accepted/edited/dismissed). A low top rerank score predicts a bad answer, so show "low confidence" in the UI. |
| Content gaps | Weekly report of ~not_found~ tickets clustered by topic, sent to the docs team. |
`,

  levelUp: md`
- **Customers self-serve with the same system?** Filter ~visibility='public'~, and add stricter guardrails and an escalation path.
- **12,000 employees, many sources, per-user permissions?** [[proj:a01]].
- **The copilot should *do* things (reverse a fee, check a transfer)?** Tools and an agent: [[proj:i02]].
- **Measuring and improving quality continuously?** [[proj:a07]].
`,

  exercises: [
    "Reproduce the retriever comparison on your own corpus (any docs site works). Which queries does keyword search win on?",
    "Try chunk sizes of 300, 800 and 2,000 tokens. How do recall@5 and answer faithfulness change?",
    "Remove query rewriting and measure the effect. When does rewriting hurt?",
    "Add a metadata filter (product area) predicted from the ticket. Does pre-filtering beat pure ranking?",
  ],

  interview: md`
> "For a fintech's agent copilot over 1,700 docs, I built two pipelines: incremental ingestion (structure-aware chunks with title and breadcrumb prepended, content-hash diffing, deletes) into Postgres with full-text and pgvector indexes, and a query path with fast-tier query rewriting, hybrid retrieval fused with RRF, and a reranker. I evaluated retrieval separately using 300 queries mined from tickets where agents linked articles: hybrid plus rerank took recall@5 from 0.71 (keyword) and 0.78 (vector) to 0.92. Generation returns cited, quote-verified suggestions with a calibrated faithfulness judge, and agent acceptance is the online metric. I chose Postgres over a dedicated vector DB because at this scale one database for text, vectors and metadata is simpler to run."
`,
});
