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
 * Code examples must be valid Python and self-contained. EVERY python block shows what it prints in
 * comments:  print(6 * 7)  # → 42   (one "# →" per printed line, in order; errors as  # ✗ TypeError: ...).
 */
window.PYTHON_INTRO = md`
> **Why this section exists.** Every project in the lab is written in Python. You don't need to be an expert, but you do need to *read* code comfortably. These lessons teach exactly the Python the projects use: nothing more, nothing less.

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
  "page:python": { simple: "All the Python you need before the projects, in 15 short lessons. Every example shows what it prints, and each part ends with a quick check you answer to unlock the next part.", analogy: "Learning the controls of the car (pedals, mirrors, indicators) before your first real drive." },
  "python:setup": { simple: "A Python program is a text file. You run it from the terminal, install extra tools with pip into a private box per project, and keep secret keys out of your code.", analogy: "A recipe (the file), a cook (Python), a separate toolbox per job (virtual environment), and your house key in your pocket, not taped to the door (environment variables)." },
  "python:values": { simple: "Variables are names for values. Every value has a type: whole number, decimal, text, true/false, or nothing (None).", analogy: "Labelled jars in a kitchen: the label is the name, the contents are the value, and the type is what kind of food is inside." },
  "python:strings": { simple: "Text is most of what AI systems handle. f-strings fill blanks in text, methods clean it, slicing cuts pieces out.", analogy: "A form letter with blanks to fill in, plus scissors and a cloth to tidy the paper." },
  "python:collections": { simple: "Lists hold items in order. Dictionaries hold labelled values and look exactly like JSON. Tuples are fixed groups, sets hold unique items.", analogy: "A numbered shopping list, a form with labelled boxes, a sealed envelope, and a bag of unique stickers." },
  "python:control-flow": { simple: "if/elif/else makes the program choose; for and while make it repeat. Indentation shows what belongs inside.", analogy: "A to-do list with sub-points: 'If it rains: take an umbrella'. Everything indented only happens under that condition." },
  "python:functions": { simple: "A function is a named, reusable block of steps with inputs and an output. Type hints label what goes in and out.", analogy: "A recipe card: write it once, cook it whenever you like with different ingredients." },
  "python:comprehensions": { simple: "One-line ways to build a new list or dict from an old one: filter and transform in a single sentence. yield hands out items one at a time.", analogy: "A sieve and a juicer in one: pour the list in, keep what passes, change each piece on the way out." },
  "python:modules": { simple: "Projects are split into files (modules) that import each other, plus built-in tools like json, Counter and re.", analogy: "Departments in a company: each has one job and asks the others when it needs something." },
  "python:errors-files": { simple: "When something goes wrong Python raises an exception; try/except handles it calmly. with-blocks open files and always close them.", analogy: "A fire alarm with a trained fire warden, and a library that takes the book back automatically when you leave." },
  "python:classes": { simple: "A class is a blueprint for objects that bundle data with the functions that use it. Dataclasses and enums are shortcuts for common cases.", analogy: "A cookie cutter (the class) and the cookies (objects): one shape, many cookies, each decorated differently." },
  "python:pydantic": { simple: "Pydantic models describe exactly what data must look like and check it. They're the forms the AI fills in.", analogy: "A paper form with strict boxes, and a clerk who rejects it when a box is filled in wrong." },
  "python:decorators": { simple: "An @line above a function wraps it with an extra ability without changing its body.", analogy: "Putting a phone in a waterproof case: the phone works the same, but now it can do more." },
  "python:async": { simple: "async/await lets a program run many slow waits (like AI calls) at the same time, with a cap so you don't overload the service.", analogy: "A chef with several pots on the stove, instead of staring at one pot until it boils." },
  "python:testing": { simple: "Tests are small programs that check your code automatically. Fakes stand in for the AI so tests are fast, free and repeatable.", analogy: "A smoke alarm that warns you the moment something burns, and a flight simulator for practising safely." },
  "python:apis": { simple: "An API call sends a request and gets back a response. The Anthropic SDK does the web part: you pass a model, a limit, instructions and messages, and read the answer and the token count.", analogy: "Ordering at a restaurant counter: a standard order slip in, a tray with food and a receipt back." },
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
);
