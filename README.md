# AI Engineer Lab

A study platform for learning to **think like an AI engineer**: system design, evaluation, and building systems on top of foundation models that solve real business problems. It contains 28 realistic client projects across three levels.

Every project follows the same eight stages, so the way of working becomes a habit:

**Brief → Discover → Frame → Design → Build → Evaluate → Operate → Level up**

## How it's organised

Like a driving school: one lesson plan to follow in order, plus reference books to open when you need them.

- **The learning path** (`#/path`) is the main road: 74 steps in 8 phases (Orientation → Python toolkit → Foundations → First project → Beginner → Intermediate → Advanced → Career). Short guide and concept lessons sit right before the project that first needs them, each step explains *why it comes now*, and every level ends with a **checkpoint** (self-check questions with hidden answers and a "you're ready if…" list).
- Every step has a "Step N of 58" banner and a **Mark done & continue** button, and the home page has a **Continue where you left off** button.
- **The Python toolkit** (`#/python`) comes before any project: 15 short lessons (running Python, values, text, lists and dicts, loops, functions, comprehensions, modules, errors and files, classes, Pydantic, decorators, async, pytest, calling AI APIs), each with many real-life examples whose output is shown inside the code, common mistakes, practice questions, and a list of the projects that use it. Every part of a lesson ends with a quick check (multiple choice or "type what it prints") that must be answered to unlock the next part. Python words on project pages link back to their lesson.
- **The library** (guides, concepts, pattern library, pattern matrix, glossary) is for looking things up at any time.

## What's inside

| Section | What it gives you |
|---|---|
| **How AI engineers think** | 10 short chapters: the engineering loop, the complexity ladder (start simple), "model parses, code acts", the 7 problem shapes, discovery, evaluation, cost/latency math, failure modes, system-design interviews, analysing a company |
| **Core concepts** | API vs function calling vs MCP, workflow vs agent, RAG vs long context vs fine-tuning, embeddings and hybrid search, structured outputs, context engineering, agent stacks, sync/async/batch, model selection, observability |
| **Pattern library** | 30 named patterns with minimal code. Each pattern lists every project that uses it, so you can see it repeat |
| **Pattern matrix** | Patterns × projects grid showing how one idea travels from a beginner script to an advanced platform |
| **Beginner (10)** | Ticket triage, invoice extraction, review insights (batch), SMS booking, HR Q&A (long context vs RAG), meeting actions, email drafter, listing writer, catalog normaliser, responsible resume screening |
| **Intermediate (10)** | Production RAG, a tool-using agent, an MCP server, text-to-SQL, contract review, moderation cascade, calibrated judges, prior-auth workflow, conversational memory, prompt CI |
| **Advanced (8)** | Permission-aware enterprise RAG, durable claims workflow, multi-agent research, a company LLM platform, an incident agent, a prompt-injection-hardened agent, an eval flywheel, and a capstone AI strategy for a whole company |
| **Hiring & skills** | The skills worth your time, beginner vs solid vs senior, portfolio advice, the 2026 toolbox, a 12-week plan |

Every project page is **all-in-one**: a "Before you start" section explains every pattern, guide idea, technology, Python feature and technical word the project uses. Technical words in the text are tap-to-explain. Every code step has a plain-words walkthrough plus a list of the Python features it uses, and each project ends with a recap. Beginners never need to leave the page.

Progress tracking and per-project notes are saved in your browser.

## Run it

No build step and no dependencies. Either:

```bash
# open directly
open index.html            # macOS  (or double-click it)

# or serve it locally
python3 -m http.server 8000   # then visit http://localhost:8000
```

Syntax highlighting loads from a CDN when you're online. The platform works without it.

## Project structure

```
index.html              # shell + script includes
assets/app.js           # hash router, markdown renderer, pages, progress tracking
assets/style.css        # minimal ChatGPT-like design, light/dark
content/_helpers.js     # authoring helpers (md``, py`` tags)
content/framework.js    # "How AI engineers think" chapters + intros
content/concepts.js     # core concepts
content/patterns.js     # pattern library
content/skills.js       # hiring & skills pages
content/simple.js       # plain-words explanations + analogies for every page, and the glossary
content/patterns-explained.js  # real-life stories for every pattern + more glossary words
content/tech.js         # technologies and Python features, detected automatically from the code
content/walkthroughs-*.js      # "the code in plain words" for every build step
content/python.js       # Python toolkit: intro, plain-words boxes and glossary words
content/python-lessons-*.js  # the 15 Python lessons (with quick checks), four per file
content/path.js         # the learning path order, Start page, Warm-up words, level checkpoints
content/projects/*.js   # one file per project (b01–b10, i01–i10, a01–a08)
```

## Adding a project

Create `content/projects/xNN-name.js` that calls `project({...})` with the same fields as the existing ones (`brief`, `discovery`, `frame`, `design`, `tree`, `build[]`, `evaluate`, `operate`, `levelUp`, `exercises`, `interview`), add a `<script>` tag for it in `index.html`, and add it as a step in `content/path.js`. Pattern usage counts and the matrix update automatically.

Authoring conventions (see `content/_helpers.js`): prose uses `md```, inline code is written `~like_this~`, fences use `~~~lang`, and cross-links are written `[[p:pattern-id]]`, `[[proj:b01]]`, `[[c:concept-id]]`, `[[f:chapter-id]]`.

## A note on the code

The code samples are real, idiomatic Python using the 2026 Anthropic SDK (`messages.parse` structured outputs, the tool runner, prompt caching, the Batches API, the MCP helpers and connector) along with common production tools (FastAPI, Pydantic, Postgres/pgvector, sqlglot, Temporal, OpenTelemetry). They're written to teach architecture. The surrounding infrastructure (databases, queues, credentials) is assumed, and you should check current model names and prices before running anything.
