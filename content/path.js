/*
 * The guided learning path: the order a tutor would teach the lab in.
 * Every guide chapter, concept, project and career page appears exactly once,
 * placed "just in time" right before the project that needs it.
 *   kind: page (start/warmup) | f (framework chapter) | c (concept) | proj | check (checkpoint) | s (skills)
 *   why : one plain sentence: why this step comes now.
 * Plain words + analogies (see CLAUDE.md).
 */
window.PATH = [
  {
    id: "orientation", title: "Orientation", goal: "Know how the lab works and learn the first few words.",
    steps: [
      { kind: "page", id: "start", why: "Every course starts with a map. This shows where you're going and how to study.", minutes: 10 },
      { kind: "page", id: "warmup", why: "A handful of words appear everywhere. Learn them once, and everything after reads easily.", minutes: 15 },
    ],
  },
  {
    id: "foundations", title: "Foundations: how AI engineers think", goal: "Get the three ideas every project is built on.",
    steps: [
      { kind: "f", id: "the-loop", why: "Every project follows the same 8 stages. Learn the stages once and every project feels familiar.", minutes: 10 },
      { kind: "f", id: "complexity-ladder", why: "The most common beginner mistake is building something too complicated. This chapter stops that habit early.", minutes: 10 },
      { kind: "f", id: "probabilistic-core", why: "The single most repeated idea in the lab: the AI understands, normal code decides and acts.", minutes: 10 },
      { kind: "c", id: "structured-outputs", why: "Your first project makes the AI fill in a form. This explains how that works.", minutes: 10 },
      { kind: "c", id: "context-engineering", why: "Your first project includes a prompt. This explains what makes a prompt good.", minutes: 10 },
    ],
  },
  {
    id: "first-project", title: "Your first project, step by step", goal: "Build one complete system and see all 8 stages in action.",
    steps: [
      { kind: "proj", id: "b01", why: "The guided first build. It also creates the ~llm.py~ file that every later project reuses. Take your time here.", minutes: 210 },
      { kind: "f", id: "evaluation-mindset", why: "You just built your first test set. Now learn *why* testing is the heart of AI engineering.", minutes: 10 },
    ],
  },
  {
    id: "beginner", title: "Beginner projects: the core patterns", goal: "Practise the patterns that appear in almost every AI system.",
    steps: [
      { kind: "proj", id: "b02", why: "Next skill: checking the AI's answers with simple rules, and asking it to fix its mistakes.", minutes: 210 },
      { kind: "f", id: "problem-shapes", why: "You've now seen two kinds of problem (sorting and pulling out facts). This chapter names all seven kinds.", minutes: 10 },
      { kind: "f", id: "discovery", why: "You've read two client briefs. Now learn how to ask the questions behind them yourself.", minutes: 10 },
      { kind: "c", id: "sync-async-batch", why: "The next project processes thousands of reviews overnight. This explains when to answer now and when to batch.", minutes: 10 },
      { kind: "proj", id: "b03", why: "Batch processing and counting with code instead of asking the AI to count.", minutes: 210 },
      { kind: "f", id: "cost-latency", why: "You just did your first cost estimate. This chapter gives you the full napkin maths.", minutes: 10 },
      { kind: "proj", id: "b04", why: "The cleanest example of 'the AI understands, code acts', plus handling dates and duplicates.", minutes: 210 },
      { kind: "c", id: "rag-vs-context-vs-finetune", why: "The next project answers questions from a handbook. First learn the three ways to give an AI knowledge.", minutes: 10 },
      { kind: "proj", id: "b05", why: "Your first search-then-answer system, and the important question 'do you even need search?'.", minutes: 210 },
      { kind: "proj", id: "b06", why: "Handling inputs too long for one go: split, process each piece, combine.", minutes: 210 },
      { kind: "f", id: "failure-modes", why: "The next projects send text to real customers. Before that, learn how AI systems fail and how to guard against it.", minutes: 10 },
      { kind: "proj", id: "b07", why: "Drafts with a human approving, and checks for forbidden promises.", minutes: 210 },
      { kind: "proj", id: "b08", why: "Write, check, revise: making generated text follow many rules.", minutes: 210 },
      { kind: "proj", id: "b09", why: "Sorting into hundreds of categories, using data files the business owns.", minutes: 210 },
      { kind: "proj", id: "b10", why: "Testing for fairness, and keeping a human as the decision-maker in a high-risk area.", minutes: 240 },
      { kind: "check", id: "beginner", why: "Check you're ready before systems get bigger. Like a driving lesson in a quiet car park before the highway.", minutes: 20 },
    ],
  },
  {
    id: "intermediate", title: "Intermediate: systems with moving parts", goal: "Combine patterns into real systems: search, tools, agents, workflows.",
    steps: [
      { kind: "c", id: "embeddings", why: "The next project searches by meaning. Learn what embeddings are first.", minutes: 15 },
      { kind: "proj", id: "i01", why: "Production-quality search: two search methods combined, and testing the search separately.", minutes: 420 },
      { kind: "c", id: "workflow-vs-agent", why: "Your first agent is next. Learn when the AI should decide the steps, and when your code should.", minutes: 10 },
      { kind: "proj", id: "i02", why: "Your first agent: the loop written by hand, with strict guards on every action.", minutes: 420 },
      { kind: "c", id: "api-vs-mcp", why: "The next project builds an MCP server. This clears up API vs function calling vs MCP.", minutes: 15 },
      { kind: "proj", id: "i03", why: "Package tools once so any AI app can use them.", minutes: 360 },
      { kind: "proj", id: "i04", why: "Letting the AI write database queries safely, with three layers of protection.", minutes: 420 },
      { kind: "proj", id: "i05", why: "Expert work (legal review) split into many small, checkable steps.", minutes: 420 },
      { kind: "c", id: "model-selection", why: "The next project mixes cheap and expensive models. Learn how to choose models first.", minutes: 10 },
      { kind: "proj", id: "i06", why: "Saving money at huge volume: cheap checks first, expensive ones only when needed.", minutes: 420 },
      { kind: "proj", id: "i07", why: "Building an AI grader people can trust, by measuring it against humans.", minutes: 360 },
      { kind: "proj", id: "i08", why: "A regulated process as clear stages, with a doctor's signature built into the code.", minutes: 420 },
      { kind: "proj", id: "i09", why: "Chat that remembers the important facts without re-reading everything.", minutes: 360 },
      { kind: "c", id: "observability", why: "The next project adds monitoring to existing AI features. Learn what to record first.", minutes: 10 },
      { kind: "proj", id: "i10", why: "Automatic tests that block a bad prompt change before customers see it.", minutes: 420 },
      { kind: "check", id: "intermediate", why: "Check you can design multi-part systems before tackling company-scale ones.", minutes: 25 },
    ],
  },
  {
    id: "advanced", title: "Advanced: production systems at company scale", goal: "Think about security, reliability, scale and strategy.",
    steps: [
      { kind: "proj", id: "a01", why: "Company-wide search where nobody may see documents they're not allowed to open.", minutes: 720 },
      { kind: "proj", id: "a02", why: "Processes that run for days and must never lose work or pay twice.", minutes: 720 },
      { kind: "c", id: "agent-stacks", why: "Before multi-agent systems, see the different ways agents are built and run.", minutes: 10 },
      { kind: "proj", id: "a03", why: "Several AIs working together on research, with a spending limit and checked sources.", minutes: 600 },
      { kind: "proj", id: "a04", why: "One safe, shared AI platform for a whole bank.", minutes: 720 },
      { kind: "proj", id: "a05", why: "An investigation agent where mistakes are expensive, so it may only suggest fixes.", minutes: 600 },
      { kind: "proj", id: "a06", why: "Designing an agent so that tricky emails can't take control of it.", minutes: 600 },
      { kind: "proj", id: "a07", why: "Keeping quality high every day, for a product used by 300,000 students.", minutes: 600 },
      { kind: "f", id: "reading-a-company", why: "The capstone asks you to plan AI for a whole company. This chapter is the method.", minutes: 10 },
      { kind: "proj", id: "a08", why: "The capstone: every pattern in the lab, combined into one company's plan.", minutes: 720 },
      { kind: "check", id: "advanced", why: "The final check: can you explain and design systems like a senior engineer?", minutes: 30 },
    ],
  },
  {
    id: "career", title: "Career: getting hired", goal: "Turn what you learned into a portfolio and interview answers.",
    steps: [
      { kind: "s", id: "focus-skills", why: "What employers actually look for, ranked.", minutes: 10 },
      { kind: "s", id: "levels", why: "What separates beginner, solid and senior engineers, so you know what to show.", minutes: 10 },
      { kind: "f", id: "system-design-interview", why: "A step-by-step way to answer 'design an AI system' interview questions.", minutes: 15 },
      { kind: "s", id: "portfolio", why: "How to turn 3 projects from this lab into a portfolio.", minutes: 10 },
      { kind: "s", id: "stack-2026", why: "The tools worth learning, grouped by the job they do.", minutes: 10 },
      { kind: "s", id: "study-plan", why: "A weekly schedule if you want to go through the lab again, faster.", minutes: 5 },
    ],
  },
];

window.START_PAGE = {
  title: "Welcome: how this lab works",
  summary: "A short tour before your first lesson: what you'll learn, how the lab is organised, and a simple routine for studying each step.",
  body: md`
## What you'll be able to do at the end
- Look at a business problem and explain how AI could help, or say honestly that it shouldn't be used.
- Design an AI system on paper: its parts, how data flows, and where people stay in control.
- Read and write the Python code for it, and **prove it works** with tests.
- Explain your design in a job interview.

You only need basic Python (variables, functions, lists, dictionaries). Every other word, idea and tool is explained inside the lab. You don't need an API key to learn. The code is there to read and understand, and running it is optional.

## How the lab is organised
Think of it like a **driving school**:

| At a driving school | In this lab | Where |
|---|---|---|
| A lesson plan from day one to the test | **The learning path**: one step at a time, in order | [Learning path](#/path) |
| Theory lessons | **Guides and concepts**: short chapters, each placed right before the project that needs it | in the path |
| Driving practice | **28 projects**: real client problems, worked from brief to tested system | in the path |
| Mock tests | **Checkpoints** at the end of each level | in the path |
| The road-sign booklet | **Glossary and pattern library**: look things up any time | [Glossary](#/glossary), [Patterns](#/patterns) |

**Follow the path in order.** The library is there when you want to look something up, so you don't need to read it front to back.

## The routine for every step
1. **Read the "In simple words" box** at the top first. It's the whole idea in two sentences, plus an everyday comparison.
2. **Read the rest.** Tap any underlined word for a quick explanation without leaving the page.
3. **Explain it back** out loud or in your notes, in your own words. If you can't, re-read the simple box.
4. **Press "Mark done & continue"** at the bottom. It takes you to the next step.

For projects, there's one extra habit: **read the client brief, then stop and sketch your own solution for 10 minutes** before reading the answer. The gap between your sketch and the solution is where you learn the most.

## How long it takes
About **12 weeks at 8–10 hours a week**. Beginner projects take an afternoon each, and advanced ones take a day or two. Going slower is fine. Understanding beats speed.

## Your progress
The lab remembers which steps you've finished (in this browser), and the home page always has a **Continue** button that takes you to your next step.
`,
};

window.WARMUP_PAGE = {
  title: "Warm-up: the words you'll need first",
  summary: "Ten minutes now saves hours later. These words appear on almost every page, so learn them once here.",
  intro: md`
## The big picture in one drawing
Almost every system in this lab has the same shape:

~~~text
  messy input           the AI model              your Python code           result
 (an email, a PDF,  ──▶ reads and understands ──▶ checks the answer,   ──▶ (a label, a reply,
  a chat message)       fills in a form           applies rules, acts       a booking, a report)
                                                         │
                                                   unsure or risky?
                                                         ▼
                                                   a person decides
~~~

**Think of it like a restaurant:** the customer's words are messy, the **waiter** (the AI) writes a clean order ticket, the **kitchen** (your code) checks the fridge and cooks, and the **manager** (a person) handles anything unusual.

Keep this picture in mind. Most projects are a variation of it.

## The words
Read each one and its comparison. You don't need to memorise them: every word is also tappable inside the lessons, and they're all in the [Glossary](#/glossary).
`,
  words: ["AI model / LLM", "Prompt", "Token", "API", "JSON", "Schema", "Structured output", "Deterministic", "Probabilistic",
    "Validation", "Side effect", "Human in the loop", "Evaluation (eval)", "Golden set", "Threshold", "Latency"],
  outro: md`
## Quick self-check
Cover the definitions above and try to explain these in one sentence each:
1. What's the difference between the **AI model** and **your code** in the drawing above?
2. Why do we make the AI fill in a **schema** instead of writing free text?
3. What is a **golden set** used for?

Can you answer roughly? Then you're ready. Press **Mark done & continue**.
`,
};

window.CHECKPOINTS = {
  beginner: {
    title: "Checkpoint: Beginner level",
    summary: "Ten questions to check you've got the core patterns before systems get bigger. Answer in your head or on paper, then open the answer.",
    analogy: "Like a mock driving test in a quiet car park: if you can do these calmly, you're ready for real roads.",
    questions: [
      { q: "In B01, why does plain code (not the AI) decide which queue a ticket goes to?", a: "Because queue rules change and must be predictable. The AI only labels the ticket (probabilistic part), and a simple lookup table routes it (deterministic part). Changing a queue then needs no prompt change. This is 'the AI understands, code acts'." },
      { q: "What's the difference between a schema guaranteeing the *shape* of an answer and the answer being *true*?", a: "The schema guarantees the right boxes are filled with the right types (e.g. a number in 'total'). It can't guarantee the number is correct. That's why B02 adds validation rules (do the lines add up?)." },
      { q: "What should happen when validation fails twice in a row?", a: "Stop retrying and send the case to a human with the errors attached. Retrying forever wastes money and hides problems." },
      { q: "Why did B03 count reviews with Python instead of asking the AI 'how many mentioned slow service?'", a: "AI counts are estimates and can't be compared month to month. Code counts are exact. The AI tags each review (map), code counts (reduce), and the AI only writes the narrative from exact numbers." },
      { q: "In B04, why is the SMS webhook 'idempotent', and what does that mean?", a: "SMS providers sometimes send the same message twice. Idempotent means handling it twice has the same effect as once. The message id is checked so a duplicate can't book two appointments." },
      { q: "B05 asked: do you even need search (RAG)? When is the answer 'no'?", a: "When all the knowledge fits in the AI's context window and rarely changes, like a 45-page handbook. Then send it all, with prompt caching. You need search when the documents are huge, change often, or have different permissions per person." },
      { q: "What is a golden set, and why must you keep some of it hidden while improving prompts?", a: "Real examples with the correct answers, used to score the system. If you tune the prompt on the same examples you test on, you 'learn the exam' and the score lies. Keep a held-out part for the final score." },
      { q: "Why do B07 and B10 keep a human as the final decision-maker?", a: "The stakes are high (legal promises, people's jobs), and regulations often require it. The AI saves time by drafting, and the human stays responsible. Human edits also become new test data." },
      { q: "Name two ways the AI's self-reported confidence can be misleading, and what to use instead when possible.", a: "It's not calibrated (0.9 doesn't mean right 90% of the time), and it can be confidently wrong. Prefer checkable signals: validation rules, quote checks, and thresholds tuned on your eval data." },
      { q: "Pick any beginner project and describe its 8 stages in one sentence each.", a: "There's no single answer. If you can do it from memory (brief, discover, frame, design, build, evaluate, operate, level up), the loop has become a habit." },
    ],
    ready: [
      "I can explain 'the AI understands, code acts' with an example.",
      "I can write a Pydantic schema with a ~Literal~ field and explain why.",
      "I can explain what an eval set is and how to read its failures.",
      "I know when to send something to a human instead of the AI deciding.",
      "I can read a beginner project's code and say what each file does.",
    ],
    review: ["b01", "b02", "b04", "b05"],
  },
  intermediate: {
    title: "Checkpoint: Intermediate level",
    summary: "Ten questions about systems with several moving parts. Answer first, then open each answer.",
    analogy: "Like a pilot's check-ride before flying bigger planes: same skills, more systems to keep an eye on.",
    questions: [
      { q: "Why does I01 combine keyword search with meaning (vector) search?", a: "Keyword search finds exact codes and names. Meaning search finds paraphrases ('forgot password' vs 'can't log in'). Each fixes the other's blind spot, and RRF merges the two lists." },
      { q: "When an answer from a search-based system is wrong, what do you check first, and why?", a: "Whether the right document was retrieved at all (recall@k). Most failures are search failures, and the best writer can't answer from the wrong pages." },
      { q: "In I02, why does no tool accept a customer id as input?", a: "So the AI can't even ask for another customer's data. Identity comes from the login session and is injected by code: a guard built into the design, not just a prompt rule." },
      { q: "What's the difference between a workflow and an agent? Give one example of each from the lab.", a: "In a workflow, your code decides the steps (I08 prior-auth stages). In an agent, the AI decides the next step (I02 order agent). Use the train (workflow) when you know the route." },
      { q: "What problem does MCP solve that plain function calling doesn't?", a: "Reuse and distribution. Write a tool server once and any MCP-capable AI app can discover and use it, instead of every app building its own integration." },
      { q: "In I04, name the three layers that stop AI-written SQL from causing harm.", a: "1) Parsing and validating the SQL (single SELECT, allowed tables, no dangerous functions, a row limit). 2) A read-only database account with a time limit. 3) Row-level security so each manager only sees their region." },
      { q: "How were the cascade thresholds in I06 chosen?", a: "Not by guessing. Both AI tiers scored a labelled sample once, then a script tried many threshold combinations and showed cost, recall, wrong removals and human workload for each. The business picked a row from the table." },
      { q: "What is Cohen's kappa, and why compare the AI judge with *manager–manager* agreement?", a: "Agreement between two graders after removing lucky agreement. Humans disagree too, so the realistic goal is for the AI to agree with managers as often as managers agree with each other." },
      { q: "In I09, why is the trip state stored separately from the chat transcript?", a: "Chats contain changes of mind and get long and expensive. A tidy, current state is the single source of truth for search and hand-off, and the transcript is only context." },
      { q: "What does a CI eval gate do, and why does it need a tolerance?", a: "It runs the tests automatically on every change and blocks merges that make key scores worse. AI answers vary a little run to run, so a small tolerance prevents false alarms." },
    ],
    ready: [
      "I can sketch a search-based (RAG) system with ingestion and query pipelines.",
      "I can write an agent loop with a step budget, and explain where the guards live.",
      "I can explain API vs function calling vs MCP to a friend.",
      "I can choose thresholds from data instead of guessing.",
      "I can describe how I'd know if a prompt change made things worse.",
    ],
    review: ["i01", "i02", "i03", "i06"],
  },
  advanced: {
    title: "Checkpoint: Advanced level",
    summary: "Eight design questions like the ones asked in senior interviews. Think them through properly before opening the answers.",
    analogy: "Like an architect's final review: you're not tested on bricks any more, but on whether the building stands up, stays safe, and serves the people inside.",
    questions: [
      { q: "In company-wide search (A01), why must permission filtering happen *inside* the search, not after the answer is written?", a: "If the AI ever sees a restricted document, it can leak it in the answer. Filtering inside the search means it never sees it. Unknown permissions fail closed, and a live re-check catches stale permissions." },
      { q: "Why use a durable workflow engine for insurance claims (A02) instead of a simple script?", a: "Claims last days, involve people, and must survive crashes without losing work or paying twice. The engine saves each step's result, retries failures and waits for human signals. Idempotent activities prevent double payments." },
      { q: "When is a multi-agent design worth its extra cost (A03)?", a: "When the task splits into independent parts that can run in parallel, and each part needs lots of reading that would overflow one context. For small tasks, one call or one agent is cheaper and simpler." },
      { q: "Name four things a company LLM platform (A04) handles so individual teams don't have to.", a: "Any four of: authentication, per-use-case policy, private-data redaction, model routing and fallbacks, budgets and cost tracking, audit logs, and required evals before launch." },
      { q: "Why does the incident agent (A05) have no tools that change anything?", a: "Wrong actions on live systems are expensive. The agent only proposes, and a separate service with allowlists, blast-radius limits, cooldowns and approvals executes. Even a fooled agent can't cause damage." },
      { q: "Explain the 'lethal trifecta' and how A06 breaks it.", a: "Private data + untrusted input + a way to send data out, all in one AI context. A06 separates them: a reader with no tools reads emails into a strict form, and a planner with tools never sees the raw email. Tools are also narrowly limited." },
      { q: "Why does A07 grade a *random* sample and not only thumbs-down feedback?", a: "Feedback is biased (unhappy users click more), so it's great for finding failures but bad for measuring true rates. A random sample gives honest numbers." },
      { q: "In the capstone (A08), why does the roadmap start with quick wins that build platform pieces?", a: "Early value builds trust, and the reusable pieces (gateway, eval tooling, document index) make every later project cheaper and safer. Riskier customer-facing automation comes once there's data and monitoring." },
    ],
    ready: [
      "I can design a system on paper and explain its security boundaries.",
      "I can explain how a design behaves when parts fail.",
      "I can put a cost and a risk level on a proposal.",
      "I can describe how quality is kept high after launch.",
      "I can answer a 45-minute system design interview using the 8 stages.",
    ],
    review: ["a01", "a04", "a06", "a08"],
  },
};

window.SIMPLE = window.SIMPLE || {};
Object.assign(window.SIMPLE, {
  "page:start": { simple: "A quick tour: what the lab teaches, how it's organised, and a 4-step routine for studying each lesson.", analogy: "The first day at driving school: they show you the lesson plan before you touch the car." },
  "page:warmup": { simple: "The handful of words that appear on almost every page, plus one drawing that shows the shape of most AI systems.", analogy: "Learning the road signs before your first drive." },
  "check:beginner": { simple: "Self-check questions about the beginner patterns. Answer first, then reveal.", analogy: "A mock test in a quiet car park." },
  "check:intermediate": { simple: "Self-check questions about systems with several parts: search, agents, MCP, workflows.", analogy: "A pilot's check-ride before flying bigger planes." },
  "check:advanced": { simple: "Senior-level design questions about security, reliability, scale and strategy.", analogy: "An architect's final review of a whole building." },
  "page:path": { simple: "Every step of the lab in order: lessons, projects and checkpoints, with why each one comes when it does.", analogy: "A school timetable for the whole course." },
});
