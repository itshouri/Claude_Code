/*
 * Python toolkit: all the Python you need before the projects, in the order a tutor would teach it.
 * The lessons themselves live in content/python-lessons-*.js (loaded right after this file).
 * Each lesson: plain words + analogy (SIMPLE["python:<id>"]), a body with code and what it prints,
 * common mistakes, how it looks in the projects, and practice questions with hidden answers.
 * Every "## " part of a body ends with at least one ~~~quiz block (a "quick check"); the app keeps the
 * next part locked until it is answered. Quiz lines: "? question", "| code", "+ right option",
 * "- wrong option", "= accepted typed answer" (instead of options), "! why".
 * `features` lists PYFEATURES ids (content/tech.js) this lesson teaches; the app uses them to show
 * which projects use the lesson and to link project pages back to the lesson.
 * Examples are real AI-engineering problems from the projects (name the project, e.g. B01), never generic toy scenarios;
 * quick checks test what the projects actually use. Code examples must be valid Python and self-contained. EVERY python block shows what it prints in
 * comments:  print(6 * 7)  # → 42   (one "# →" per printed line, in order; errors as  # ✗ TypeError: ...).
 */
window.PYTHON_INTRO = md`
> **Why this section exists.** This is Python for **AI engineering**, not Python in general. Every project in the lab is written in Python, and these lessons teach exactly the Python those projects use, through the real problems they solve: routing support tickets by confidence, checking that an invoice the AI read actually adds up, keeping a chat's history, running an agent loop with a step budget, retrying when the AI service is busy, tracking token costs, and testing it all without paying for AI calls.

**Every example is a real problem from a project** (the code in brackets, like B01 or I02, tells you where you'll meet it again), and every quick check tests something you will actually write or read in the beginner, intermediate or advanced projects.

**How to use it**
- Do the lessons in order. Each one takes 15–30 minutes.
- Type the examples yourself if you can (see lesson 1 for how to run Python). Typing beats reading, the same way you learn a route faster by driving it than by sitting in the passenger seat.
- Every code example shows **what it prints**, right inside the code, in a green comment like ~# → 42~. Read the code, guess the output, then check the comment.
- Each part of a lesson ends with a **quick check**. Answer it to unlock the next part, the same way a video game opens the next level only when you finish this one.
- Each lesson ends with practice questions. Answer first, then tap to see the answer.
- **Already know Python?** Jump to the [Python checkpoint](#/checkpoint/python). If you can answer those questions, mark the lessons done and move on.
`;

window.PYTHON_LESSONS = [];

/* Plain-words boxes for each lesson (see CLAUDE.md) */
window.SIMPLE = window.SIMPLE || {};
Object.assign(window.SIMPLE, {
  "page:python": { simple: "All the Python you need for AI engineering, in 15 lessons. Every example is a real problem from the projects (routing tickets, checking invoices, running agents, tracking costs), every example shows what it prints, and each part ends with a quick check you answer to unlock the next part.", analogy: "Learning to drive in the city you'll actually work in, on the roads you'll actually use, not on an empty test track." },
  "python:setup": { simple: "An AI project is a folder of Python files, prompts and evals. You run scripts and evals from the terminal, install packages into a private box per project, keep the API key in an environment variable, and log every AI call.", analogy: "A recipe (the file), a cook (Python), a separate toolbox per job (virtual environment), your house key in your pocket (environment variables) and a ship's logbook (logging)." },
  "python:values": { simple: "Values in AI code are labels, confidence scores, token counts, costs and 'not found' (None). You compare them against thresholds, compute costs from tokens, and use Decimal for money that must add up.", analogy: "Labelled jars in a kitchen: the label is the name, the contents are the value, and you check the jar's contents before cooking with them." },
  "python:strings": { simple: "Prompts are strings. f-strings and templates fill data into prompts, tags mark customer text as data, slicing caps input size, and simple text checks catch quotes the AI made up.", analogy: "A form letter with blanks to fill in, a pair of scissors to trim what's too long, and a highlighter to check each quote against the original page." },
  "python:collections": { simple: "Lists and dicts are the shape of every AI request and response: the conversation, tool definitions, lookup tables and JSON. Sets enforce permissions and allowed values.", analogy: "A numbered list of messages, a form with labelled boxes, a sealed envelope, and a guest list at the door." },
  "python:control-flow": { simple: "The AI proposes, plain code decides: if/elif chains route by confidence and safety rules; loops process batches, retry with a limit, and run the agent loop with a step budget.", analogy: "A bouncer with an ordered rule list, and a delivery driver who tries each address a fixed number of times before calling the office." },
  "python:functions": { simple: "Projects are built from small functions: one gateway that calls the AI, small rule functions that check and decide, and inputs that let tests swap the real model for a fake.", analogy: "Recipe cards: one for 'ask the expert', several for 'check the result', and you can practise with a pretend expert before the real one." },
  "python:comprehensions": { simple: "One-line ways to pick tool calls out of a response, keep only permitted citations, build prompt blocks and compute eval scores. Generators hand out document chunks one at a time.", analogy: "A sieve and a juicer in one: pour the list in, keep what passes, change each piece on the way out." },
  "python:modules": { simple: "Projects are split into files that import each other, plus built-in tools: json for tool results, re for patterns and personal data, datetime to give and check dates, hashlib for caching, pathlib for prompt files.", analogy: "Departments in a company plus a well-stocked supply cupboard: each department has one job, and everyone borrows the same standard tools." },
  "python:errors-files": { simple: "AI calls fail often. Catch the right errors, retry temporary ones with backoff, fall back to a human, fail closed on security, use idempotency keys so retries never act twice, and keep golden sets in JSONL files.", analogy: "A fire drill everyone has practised, plus a receipt number on every payment so a repeated request is recognised and not paid twice." },
  "python:classes": { simple: "Classes hold results with named fields, keep changing state like budgets and agent contexts, define contracts every connector must follow, and make fakes that stand in for the AI in tests.", analogy: "A cookie cutter and its cookies; a job description that every new hire must fit; and a flight simulator that looks exactly like the real cockpit." },
  "python:pydantic": { simple: "Pydantic models are the forms the AI fills in: fixed choices, number limits, honest 'not found' fields and descriptions that act as instructions. After the shape is checked, code checks the meaning.", analogy: "A paper form with strict boxes and a clerk who rejects it when a box is filled wrong, followed by an accountant who checks the numbers add up." },
  "python:decorators": { simple: "An @line wraps a function with an extra ability. In AI projects that's turning functions into tools the AI can call (name, type hints and docstring become the tool description), web endpoints, cached lookups and timed calls.", analogy: "Putting a phone in a waterproof case: the phone works the same, but now it can do more." },
  "python:async": { simple: "AI calls are mostly waiting. Thread pools and async run many at once, semaphores respect rate limits, return_exceptions keeps partial results, locks protect shared totals, and streaming shows answers as they're written.", analogy: "A chef with several pots on the stove, a doorman who lets in a few customers at a time, and a single pen on a shared expense sheet." },
  "python:testing": { simple: "Tests check the plain code around the AI with fake models, prove guardrails hold against tricks, freeze time for date logic, and an eval gate blocks prompt changes that make the AI worse.", analogy: "A smoke alarm for your code and a school report for the AI, plus a bouncer who checks the alarm still works every day." },
  "python:apis": { simple: "A Claude call sends a model, a length cap, instructions and the conversation, and returns content blocks, a stop reason and token usage. Tool use is a loop of requests and results; structured outputs return checked objects; caching cuts repeat costs; one gateway file handles it all.", analogy: "Ordering at a restaurant counter: a standard order slip in, a tray with food and a receipt back, and one front desk for every order." },
  "check:python": { simple: "Read real project-style code and explain it. If you can, you're ready for the projects.", analogy: "A short test drive around the block before the real lessons on the main road." },
});

/* New words from these lessons */
window.GLOSSARY.push(
  { term: "Terminal", simple: "A window where you type commands to the computer instead of clicking, e.g. ~python3 app.py~.", analogy: "Talking to the computer by text message instead of pointing at things." },
  { term: "Interpreter", simple: "The Python program that reads your ~.py~ file and carries out each line.", analogy: "A cook following a recipe line by line." },
  { term: "Package / pip", simple: "A package is a ready-made bundle of code someone else wrote. ~pip~ is the tool that installs packages.", analogy: "An app store for code: pip downloads the app, the package is the app." },
  { term: "Virtual environment", simple: "A private folder of installed packages for one project, so projects don't interfere with each other.", analogy: "A separate toolbox for each job." },
  { term: "Environment variable", simple: "A named setting stored by your computer outside the code, often used for secret keys.", analogy: "Keeping your house key in your pocket instead of taped to the front door." },
  { term: "Variable", simple: "A name that points to a value, like ~total = 42~.", analogy: "A labelled jar: the label is the name, the contents are the value." },
  { term: "Data type", simple: "The kind of a value: whole number (~int~), decimal (~float~), text (~str~), true/false (~bool~), list, dict, and so on.", analogy: "What kind of food is in the jar: rice, sugar or flour." },
  { term: "String", simple: "A piece of text in Python, written in quotes.", analogy: "A string of letter beads." },
  { term: "List", simple: "An ordered collection of items, written ~[a, b, c]~.", analogy: "A numbered shopping list." },
  { term: "Dictionary", simple: "A collection of labelled values, written ~{\"name\": \"Dana\"}~. It looks exactly like JSON.", analogy: "A form with labelled boxes." },
  { term: "Function", simple: "A named, reusable block of steps with inputs and an output, made with ~def~.", analogy: "A recipe card you can cook again and again." },
  { term: "Argument / parameter", simple: "The inputs to a function. Parameters are the names in the definition; arguments are the actual values you pass.", analogy: "The blanks on a recipe ('2 eggs') and the actual eggs you use." },
  { term: "Return value", simple: "What a function hands back when it finishes.", analogy: "The dish that comes out of the kitchen." },
  { term: "Class / object", simple: "A class is a blueprint; an object is one thing made from it, with its own data.", analogy: "A cookie cutter and the cookies." },
  { term: "Method", simple: "A function that belongs to an object, called with a dot: ~text.lower()~.", analogy: "A button on a specific machine." },
  { term: "Type hint", simple: "A label in code saying what type a value should be, like ~name: str~ or ~-> bool~.", analogy: "The shape label on a plug socket." },
  { term: "Exception", simple: "An error Python raises when something goes wrong. Unless caught with ~try~/~except~, it stops the program.", analogy: "A fire alarm going off." },
  { term: "Comprehension", simple: "A one-line way to build a list or dict from another, like ~[x for x in xs if x > 0]~.", analogy: "A sieve and a juicer in one." },
  { term: "Generator", simple: "Something that hands out items one at a time instead of building a whole list, often made with ~yield~.", analogy: "A ticket dispenser: one ticket per pull." },
  { term: "Context manager", simple: "Something used with a ~with~ block that sets up and always cleans up, like opening and closing a file.", analogy: "A library that takes the book back automatically when you leave." },
  { term: "Decorator", simple: "An ~@name~ line above a function that wraps it with an extra ability.", analogy: "A waterproof case on a phone." },
  { term: "Await", simple: "In async code, ~await~ means 'wait for this slow thing, and let other work run meanwhile'.", analogy: "Putting the pasta on to boil and chopping vegetables while you wait." },
  { term: "HTTP request", simple: "A message one program sends another over the web, asking for something. The reply is the response.", analogy: "Handing an order slip over a counter and getting a tray back." },
  { term: "Status code", simple: "A number in every web response saying how it went: 200 OK, 404 not found, 429 too many requests, 500 server error.", analogy: "The note on a delivery: delivered, wrong address, try later, or warehouse problem." },
  { term: "Assert", simple: "A line in a test that says what must be true, like ~assert total == 10~. If it's false, the test fails.", analogy: "A checklist item an inspector ticks or flags." },
  { term: "Traceback", simple: "The error report Python prints when a line fails: where it happened (file and line number) and, on the last line, what went wrong.", analogy: "A doctor's note: read the diagnosis at the bottom first, then look at where it hurts." },
  { term: "Hash", simple: "A short fingerprint made from some text. The same text always gives the same hash; any change gives a completely different one. Used for caching.", analogy: "A fingerprint: you can recognise the person again, but you can't rebuild them from it." },
  { term: "Coroutine", simple: "What you get when you call an ~async def~ function without ~await~: a promise of work that hasn't run yet. ~await~ runs it.", analogy: "An order ticket that the kitchen hasn't started cooking." },
  { term: "Semaphore", simple: "A counter that limits how many jobs can run at the same time, e.g. ~asyncio.Semaphore(5)~ lets in five at once.", analogy: "A shop doorman who lets in five customers at a time." },
  { term: "Coercion", simple: "Turning a value into the right type when it's safe, like Pydantic turning the text ~\"3\"~ into the number 3.", analogy: "A clerk who neatly rewrites a form's \"three\" as 3 before filing it." },
  { term: "Graceful degradation", simple: "When the smart part of a system fails, it falls back to a simpler, safe path instead of breaking, e.g. sending a ticket to the human queue when the AI is down.", analogy: "When the lift breaks, the stairs still get you to your floor." },
  { term: "Fail closed", simple: "When a security check can't be completed, choose the safe outcome (deny or lock) rather than the open one.", analogy: "A door that locks itself when the power fails, instead of swinging open." },
  { term: "Race condition", simple: "A bug where two parts of a program change the same value at the same moment and one change is lost. A lock lets only one change happen at a time.", analogy: "Two people writing on the same line of an expense sheet at once; a single shared pen fixes it." },
  { term: "Stop reason", simple: "The field in every Claude response that says why it stopped: end_turn (finished), max_tokens (cut off), tool_use (wants a tool), refusal (declined).", analogy: "The note a courier leaves: delivered, ran out of time, needs a signature, or refused." },
  { term: "Content block", simple: "One piece of a message's content: text, a tool request (tool_use), a tool result, an image or a document. Responses are lists of blocks.", analogy: "The separate items on a tray: a drink, a plate, a receipt." },
  { term: "Tool result", simple: "The message your code sends back after running a tool the model asked for, matched to the request by its tool_use_id.", analogy: "The reply slip stapled to the original request so nobody mixes them up." },
  { term: "Confusion matrix", simple: "A table counting, for each right answer, which answer the AI gave. It shows exactly which categories get mixed up.", analogy: "A teacher's tally of which wrong answer each student picked, not just how many were wrong." },
  { term: "Truthy / falsy", simple: "In an if, empty things (\"\", [], {}, 0, None) count as False and everything else as True.", analogy: "An empty box counts as 'nothing delivered', whatever its label says." },
  { term: "Keyword-only argument", simple: "A function input that must be given by name, like tier=\"fast\". In a definition, everything after a lone * is keyword-only.", analogy: "A form box that must be labelled when you fill it in, so nobody puts the date in the price box." },
  { term: "Decimal", simple: "Python's exact decimal number type (from the decimal module), used for money so totals add up to the cent.", analogy: "Counting coins one by one instead of estimating the weight of the jar." },
  { term: "Base64", simple: "A way of writing any file (like a PDF or image) as plain letters and digits so it can travel inside JSON.", analogy: "Spelling out a photo as a long code you can read over the phone." },
  { term: "Eval gate", simple: "A step in CI that runs the evals on a changed prompt or model and blocks the change if a critical score drops by more than a small tolerance.", analogy: "A quality inspector at the factory door: nothing ships if it's worse than last batch." },
  { term: "Test fixture", simple: "A piece of setup a test needs (sample data, a fake model, a sandbox), prepared once by @pytest.fixture and handed to every test that asks for it.", analogy: "The props a stage crew sets out before each scene." },
  { term: "Slug", simple: "A short, lowercase, dash-separated id made from a title, like 4-2-parental-leave, safe to use in links and citations.", analogy: "A label maker's version of a book title for the shelf." },
  { term: "Reciprocal rank fusion (RRF)", simple: "A simple way to combine several search rankings: each document gets points for ranking high in any list (1 / (60 + rank)), then documents are sorted by total points.", analogy: "Combining two judges' rankings by giving points for each placing and adding them up." },
);
