/*
 * Python toolkit: all the Python you need before the projects, in the order a tutor would teach it.
 * Each lesson: plain words + analogy (SIMPLE["python:<id>"]), a body with code and what it prints,
 * common mistakes, how it looks in the projects, and practice questions with hidden answers.
 * `features` lists PYFEATURES ids (content/tech.js) this lesson teaches; the app uses them to show
 * which projects use the lesson and to link project pages back to the lesson.
 * Code examples must be valid Python. What a line prints is shown in a comment:  # → 42
 */
window.PYTHON_INTRO = md`
> **Why this section exists.** Every project in the lab is written in Python. You don't need to be an expert, but you do need to *read* code comfortably. These lessons teach exactly the Python the projects use: nothing more, nothing less.

**How to use it**
- Do the lessons in order. Each one takes 15–30 minutes.
- Type the examples yourself if you can (see lesson 1 for how to run Python). Typing beats reading, the same way you learn a route faster by driving it than by sitting in the passenger seat.
- Each lesson ends with practice questions. Answer first, then tap to see the answer.
- **Already know Python?** Jump to the [Python checkpoint](#/checkpoint/python). If you can answer those questions, mark the lessons done and move on.
`;

window.PYTHON_LESSONS = [
  {
    id: "setup",
    title: "1. Running Python: files, the terminal and packages",
    summary: "Where Python code lives, how to run it, how to install libraries, and where secret keys go.",
    features: [],
    body: md`
## The idea
A Python program is just a **text file ending in ~.py~**. You give it to the Python program (the *interpreter*), and it reads your file top to bottom and does what each line says.

Think of it like a **recipe and a cook**: the ~.py~ file is the recipe, Python is the cook who follows it line by line.

## Running code
You run files from the **terminal** (a window where you type commands instead of clicking):

~~~bash
python3 --version          # check Python is installed (3.11 or newer is ideal)
python3 hello.py           # run the file hello.py
python3                    # open the "interactive" mode: type a line, see the result at once
~~~

A first file, ~hello.py~:

~~~python
print("Hello, AI engineer!")   # → Hello, AI engineer!
# Lines starting with # are comments: notes for humans. Python ignores them.
~~~

## Packages: borrowing other people's code
Python comes with a big **standard library** (built-in tools). Extra tools are **packages** you install with ~pip~. The projects use packages like ~anthropic~ (to talk to Claude), ~pydantic~ (to describe data) and ~pytest~ (to test).

To keep each project's packages separate, you make a **virtual environment**: a private box of packages for one project.

~~~bash
python3 -m venv .venv            # create the box (once per project)
source .venv/bin/activate        # step into it  (Windows: .venv\Scripts\activate)
pip install anthropic pydantic pytest   # install packages into the box
pip freeze > requirements.txt    # write down what you installed, so others can repeat it
~~~

Think of a virtual environment like **a separate toolbox for each job**: the plumbing tools don't get mixed up with the painting tools.

## Secret keys go in environment variables
To call an AI model you need an **API key** (a password for the service). Never write it in your code. Put it in an **environment variable**, a named value your computer keeps outside the code:

~~~bash
export ANTHROPIC_API_KEY="sk-ant-..."     # Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."
~~~

~~~python
import os
key = os.environ.get("ANTHROPIC_API_KEY")   # read it inside Python
print("key found" if key else "no key set")
~~~

Like keeping your house key in your pocket rather than taped to the front door. The Anthropic library even reads this variable by itself, so most project code never mentions the key at all.

## Common mistakes
- Running ~python~ when only ~python3~ exists (or the other way round). Try both.
- Forgetting to activate the virtual environment, then getting ~ModuleNotFoundError~ ("I can't find that package").
- Pasting an API key into code and uploading it to GitHub. Treat keys like passwords.

## How it looks in the projects
Every project shows a **project layout** (a folder tree) in its Build stage, and a list of packages. B01 starts with ~pip install anthropic pydantic pytest~. You **don't need an API key to learn**: reading and understanding the code is the goal, and running it is optional.
`,
    practice: [
      { q: "What is a virtual environment, in one sentence?", a: "A private folder of installed packages for one project, so different projects don't interfere with each other." },
      { q: "Where should your API key live: in the code, or in an environment variable? Why?", a: "In an environment variable. Code gets shared and uploaded; a key in the code can leak and someone else can spend your money." },
      { q: "What does a line starting with # do?", a: "Nothing for Python: it's a comment, a note for people reading the code." },
    ],
  },

  {
    id: "values",
    title: "2. Values, variables and types",
    summary: "Numbers, text, true/false and 'nothing', and how to give them names.",
    features: ["constants", "isinstance"],
    body: md`
## The idea
A **variable** is a name for a value. A **type** says what kind of value it is.

Think of variables like **labelled jars in a kitchen**: the label is the name, the contents are the value, and the type is what's inside (sugar, rice, flour). You can empty a jar and refill it later.

## The basic types

~~~python
count = 3                 # int: a whole number
price = 19.99             # float: a number with a decimal point
name = "Acme Corp"        # str: text (a "string" of characters), in quotes
is_urgent = True          # bool: True or False (capital letters!)
manager = None            # None: "no value yet / nothing here"

print(type(price))        # → <class 'float'>
print(count * 2)          # → 6
print(count + price)      # → 22.99
~~~

~~~python
total = 10
total = total + 5         # read the right side first, then store the result in the left name
total += 5                # the same thing, shorter
print(total)              # → 20
print(7 / 2, 7 // 2, 7 % 2)   # → 3.5 3 1   (divide, whole-number divide, remainder)
~~~

## Comparing values
Comparisons give back ~True~ or ~False~:

~~~python
score = 0.82
print(score >= 0.8)               # → True
print(name == "Acme Corp")        # → True   (== compares; a single = stores)
print(manager is None)            # → True   (use "is None" to check for nothing)
print(score > 0.5 and is_urgent)  # → True   (and, or, not combine conditions)
~~~

## Constants: values that never change
By habit, names written in ~UPPER_CASE~ are **constants**: settings at the top of a file that the code reads but never changes.

~~~python
MODEL = "claude-haiku-4-5"
MAX_RETRIES = 2
CONFIDENCE_THRESHOLD = 0.8
~~~

Like the settings written on a sticky note on the fridge: everyone reads them, nobody scribbles over them during cooking.

## Checking a type: isinstance
~~~python
value = 42
print(isinstance(value, int))          # → True
print(isinstance(value, (int, float))) # → True  ("is it an int OR a float?")
~~~

## Common mistakes
- ~"5" + 5~ fails: text and numbers don't mix. Convert first: ~int("5") + 5~ gives 10, ~str(5) + "5"~ gives "55".
- Writing ~true~ instead of ~True~. Python cares about capital letters.
- Using ~=~ (store) when you meant ~==~ (compare).
- Floats are approximate: ~0.1 + 0.2~ prints ~0.30000000000000004~. For money, the projects round or use whole cents.

## How it looks in the projects
Almost every project file starts with a few constants, like ~MODEL = "claude-haiku-4-5"~ or ~AUTO_APPLY_THRESHOLD = 0.85~, so the important settings are in one easy-to-find place.
`,
    practice: [
      { q: "What's the difference between = and ==?", a: "= stores a value in a name (total = 5). == asks a question: are these equal? It gives True or False." },
      { q: "What type is each value: 3, 3.0, \"3\", True, None?", a: "int, float, str, bool, NoneType (the 'nothing' value)." },
      { q: "Why do projects put things like MODEL and THRESHOLD in UPPER_CASE at the top of the file?", a: "They're constants: settings that don't change while the program runs. Putting them at the top makes them easy to find and change in one place." },
    ],
  },

  {
    id: "strings",
    title: "3. Text: strings, f-strings and text methods",
    summary: "Working with text, which is most of what AI systems handle: building prompts, cleaning input, cutting long text.",
    features: ["fstring", "string-methods", "slicing"],
    body: md`
## The idea
AI engineering is mostly **moving text around**: emails in, prompts out, answers back. A **string** (~str~) is a piece of text. Python gives you many small tools to clean, cut, join and fill in text.

## Writing strings
~~~python
a = "double quotes"
b = 'single quotes work too'
prompt = """Triple quotes let text
span several lines. Prompts are often written like this."""
~~~

## f-strings: filling in the blanks
Put an ~f~ before the quotes and write names inside ~{curly braces}~. Python swaps each one for its value.

~~~python
customer = "Dana"
items = 3
message = f"Hi {customer}, your {items} items have shipped."
print(message)                 # → Hi Dana, your 3 items have shipped.
print(f"Score: {0.8765:.2f}")  # → Score: 0.88   (:.2f means "2 decimal places")
~~~

Like a **form letter** with blanks: "Dear ___, your order of ___ items…". The f-string fills the blanks for you.

## Text methods: small tools attached to every string
~~~python
raw = "   Refund REQUEST: order #123   "
print(raw.strip())                 # → Refund REQUEST: order #123   (spaces removed from both ends)
print(raw.strip().lower())         # → refund request: order #123   (you can chain tools)
print("refund" in raw.lower())     # → True   (is this text inside that text?)
print("a,b,c".split(","))          # → ['a', 'b', 'c']   (cut into a list)
print(" | ".join(["x", "y"]))      # → x | y   (glue a list into one string)
print("hello".replace("l", "L"))   # → heLLo
print("report.pdf".endswith(".pdf"))  # → True
~~~

## Slicing: taking a piece
Positions start at **0**. ~text[start:end]~ takes from ~start~ up to (not including) ~end~.

~~~python
text = "Hello, world"
print(text[0])      # → H        (first character)
print(text[-1])     # → d        (negative counts from the end)
print(text[:5])     # → Hello    (from the start to position 5)
print(text[7:])     # → world    (from position 7 to the end)
print(len(text))    # → 12       (length)
~~~

In the projects you'll often see ~document[:8000]~: "only the first 8,000 characters", so a huge input doesn't blow the budget. Like reading only the first pages of a long report when you just need the summary.

## Common mistakes
- Forgetting the ~f~: ~"Hi {name}"~ prints the braces literally.
- Expecting ~.lower()~ to change the original. Strings never change; methods give back a *new* string, so store it: ~text = text.lower()~.
- Counting from 1. Python counts positions from 0.

## How it looks in the projects
~~~python
ticket_text = "  My card was charged twice!!  "
clean = ticket_text.strip()[:4000]
user_message = f"Classify this support ticket:\n\n<ticket>\n{clean}\n</ticket>"
print(user_message)
~~~
This "clean it, cut it, wrap it in a prompt" move appears in almost every project.
`,
    practice: [
      { q: "What does f\"Total: {price:.2f}\" print when price = 7.5?", a: "Total: 7.50 — the :.2f part shows exactly two decimal places." },
      { q: "What is \"Invoice-2026\"[:7]?", a: "\"Invoice\" — the first 7 characters (positions 0 to 6)." },
      { q: "You call name.strip() but name still has spaces. Why?", a: "Strings can't change. strip() returns a new, cleaned string; you must store it: name = name.strip()." },
    ],
  },

  {
    id: "collections",
    title: "4. Collections: lists, dictionaries, tuples and sets",
    summary: "Holding many values at once: ordered lists and labelled dictionaries, which is also the shape of JSON.",
    features: ["dict", "unpacking", "get-next"],
    body: md`
## The idea
Real data comes in groups: many tickets, many fields on one invoice. Python has four containers:

| Container | Looks like | Think of it like |
|---|---|---|
| **list** | ~["a", "b", "c"]~ | A numbered shopping list: ordered, you can add and remove items |
| **dict** (dictionary) | ~{"name": "Dana", "age": 31}~ | A form with labelled boxes: look things up by label, not by position |
| **tuple** | ~(52.1, 4.3)~ | A sealed envelope: a fixed group that never changes |
| **set** | ~{"billing", "bug"}~ | A bag of unique stickers: no duplicates, order doesn't matter |

## Lists
~~~python
queues = ["billing", "tech", "sales"]
print(queues[0])          # → billing   (positions start at 0)
queues.append("legal")    # add to the end
print(len(queues))        # → 4
print("tech" in queues)   # → True
print(queues[-2:])        # → ['sales', 'legal']   (slicing works on lists too)
~~~

## Dictionaries: the most important container in this lab
A dict maps **keys** (labels) to **values**. JSON, the format AI models and web services use to send data, looks exactly like Python dicts and lists.

~~~python
ticket = {"id": 101, "subject": "Charged twice", "priority": "high"}
print(ticket["subject"])          # → Charged twice
ticket["queue"] = "billing"       # add or change a box
print(ticket.keys())              # → dict_keys(['id', 'subject', 'priority', 'queue'])

for key, value in ticket.items(): # walk through every label and its value
    print(key, "=", value)
~~~

Dicts often hold other dicts and lists, like a form with a table inside:

~~~python
invoice = {"vendor": "Acme", "lines": [{"item": "Paper", "amount": 20.0}, {"item": "Ink", "amount": 35.5}]}
print(invoice["lines"][1]["item"])   # → Ink   (read it step by step: lines → second line → item)
~~~

## Safe lookups: .get() and next()
~ticket["owner"]~ **crashes** if there's no ~"owner"~ box. ~.get()~ returns a fallback instead:

~~~python
ticket = {"id": 101}
print(ticket.get("owner"))               # → None
print(ticket.get("owner", "unassigned")) # → unassigned

# next(): "give me the first item that matches, or this fallback"
users = [{"name": "Ana", "role": "admin"}, {"name": "Bo", "role": "viewer"}]
admin = next((u for u in users if u["role"] == "admin"), None)
print(admin)                             # → {'name': 'Ana', 'role': 'admin'}
~~~

Like asking a receptionist "is there a parcel for me? if not, just say no" instead of searching the shelves until you trip over.

## Unpacking: opening the envelope
~~~python
point = (52.1, 4.3)
lat, lon = point                  # take a tuple apart into two names
print(lat)                        # → 52.1

first, *rest = ["a", "b", "c"]    # * collects "everything else"
print(rest)                       # → ['b', 'c']

defaults = {"model": "claude-haiku-4-5", "max_tokens": 500}
settings = {**defaults, "max_tokens": 1000}   # ** spreads a dict into a new one
print(settings)                   # → {'model': 'claude-haiku-4-5', 'max_tokens': 1000}
~~~

## Sets: quick "is it in there?" checks and no duplicates
~~~python
allowed = {"billing", "tech", "sales"}
print("legal" in allowed)          # → False
print(set(["a", "b", "a"]))        # → {'a', 'b'}   (order may differ)
~~~

## Common mistakes
- ~KeyError~: reading a dict key that doesn't exist. Use ~.get()~ when a key might be missing.
- ~IndexError~: asking for position 5 in a list of 3.
- Changing a list while looping over it. Build a new list instead (next lessons).

## How it looks in the projects
~~~python
QUEUE_FOR = {"billing": "finance-team", "bug": "engineering", "other": "general"}   # a lookup table
category = "bug"
print(QUEUE_FOR.get(category, "general"))   # → engineering
~~~
This tiny "lookup table" is the **deterministic** half of B01: the AI picks a label, a plain dict decides where it goes.
`,
    practice: [
      { q: "When would you choose a dict over a list?", a: "When you want to look things up by a label (\"email\", \"total\") instead of by position. A list is for an ordered sequence of similar items." },
      { q: "What does d.get(\"x\", 0) return when d has no \"x\" key?", a: "0, the fallback. d[\"x\"] would crash with a KeyError instead." },
      { q: "data = {\"lines\": [{\"amt\": 5}, {\"amt\": 7}]}. How do you read the 7?", a: "data[\"lines\"][1][\"amt\"] — the lines list, the second item (position 1), then its \"amt\" box." },
    ],
  },

  {
    id: "control-flow",
    title: "5. Decisions and loops",
    summary: "Making the program choose (if/else) and repeat (for/while), which is the backbone of every rule and every agent loop.",
    features: ["if", "ternary", "for", "while", "range", "enumerate-zip", "walrus"],
    body: md`
## The idea
Programs need to **decide** ("if the score is low, send to a human") and **repeat** ("for every ticket, classify it"). Python uses **indentation** (4 spaces at the start of a line) to show which lines belong inside a decision or loop.

Think of indentation like **sub-points in a to-do list**: everything indented under "If it rains:" only happens when it rains.

## Decisions: if / elif / else
~~~python
confidence = 0.65
if confidence >= 0.85:
    action = "auto-apply"
elif confidence >= 0.6:          # "else if": checked only when the first test failed
    action = "suggest to a human"
else:
    action = "send to a human"
print(action)                    # → suggest to a human
~~~

One-line version for simple choices:

~~~python
label = "urgent" if confidence < 0.5 else "normal"
~~~

## for loops: do something for each item
~~~python
tickets = ["refund please", "app crashes", "love it"]
for t in tickets:
    print("handling:", t)

for i in range(3):               # range(3) gives 0, 1, 2
    print("attempt", i + 1)
~~~

**enumerate** gives you the position too, and **zip** walks two lists side by side:

~~~python
for n, t in enumerate(tickets, start=1):
    print(n, t)                  # → 1 refund please  (and so on)

predicted = ["billing", "bug", "praise"]
expected = ["billing", "bug", "other"]
correct = 0
for p, e in zip(predicted, expected):
    if p == e:
        correct += 1
print(f"accuracy = {correct / len(expected):.2f}")   # → accuracy = 0.67
~~~

That last example is a tiny **evaluation**: comparing the AI's answers with the right answers. You'll write this loop in every project.

## while loops: repeat until something changes
~~~python
attempts = 0
while attempts < 3:
    attempts += 1
    print("try", attempts)
~~~

~break~ leaves a loop early, ~continue~ skips to the next round:

~~~python
for t in tickets:
    if not t.strip():
        continue                 # skip empty tickets
    if t == "STOP":
        break                    # stop the whole loop
~~~

## The walrus := (store and test in one go)
~~~python
import re
text = "Order #4471 is late"
if (m := re.search(r"#(\d+)", text)):
    print("order id:", m.group(1))   # → order id: 4471
~~~
You'll see it sometimes. Read ~(m := ...)~ as "store the result in m, then check it isn't empty".

## Common mistakes
- Wrong indentation. Python treats it as meaning, not decoration. Use 4 spaces consistently.
- Forgetting the colon ~:~ at the end of ~if~, ~for~ and ~while~ lines.
- A ~while~ loop that never ends because nothing changes inside it. This is why agents always have a **step budget** (a maximum number of rounds).

## How it looks in the projects
~~~python
MAX_STEPS = 8
for step in range(MAX_STEPS):          # an agent loop with a budget
    done = step == 2                   # (pretend the work finishes at step 2)
    if done:
        print("finished after", step + 1, "steps")
        break
else:
    print("budget used up: hand over to a human")   # runs only if the loop never hit break
~~~
The ~for ... else~ shape above is exactly how the agents in I02 and A05 stop safely.
`,
    practice: [
      { q: "What does range(2, 5) give you?", a: "2, 3, 4 — it stops before the end number." },
      { q: "Why do agent loops use for step in range(MAX_STEPS) instead of while True?", a: "So the loop can never run forever. The budget guarantees it stops, and the code can hand over to a human when it runs out." },
      { q: "How would you loop over two lists, predictions and answers, at the same time?", a: "for p, a in zip(predictions, answers): ..." },
    ],
  },

  {
    id: "functions",
    title: "6. Functions",
    summary: "Packaging steps into named, reusable blocks with inputs and outputs: how every project file is organised.",
    features: ["def", "return", "defaults", "type-hints", "docstring", "lambda", "sorted-key", "global-state"],
    body: md`
## The idea
A **function** is a named block of steps. You give it **inputs** (called *parameters* or *arguments*), it does its job, and it **returns** an output.

Think of a function like a **recipe card**: write it once, then cook it whenever you want with different ingredients. "Make pancakes for 4" and "make pancakes for 2" use the same card.

## Writing and calling a function
~~~python
def add_tax(price, rate=0.2):
    """Return the price including tax."""     # a docstring: a short note describing the function
    return price * (1 + rate)

print(add_tax(100))            # → 120.0   (rate uses its default, 0.2)
print(add_tax(100, 0.1))       # → 110.00000000000001
print(add_tax(100, rate=0.1))  # same, but naming the input makes it clearer
~~~

- ~def~ starts the definition. The indented lines are the body.
- ~return~ hands a result back to whoever called the function and **ends** the function.
- A function with no ~return~ gives back ~None~.

## Type hints: labels on the inputs and outputs
~~~python
def route_ticket(category: str, confidence: float) -> str:
    if confidence < 0.6:
        return "human-review"
    return f"queue-{category}"

print(route_ticket("billing", 0.9))   # → queue-billing
~~~

~category: str~ means "this should be text", and ~-> str~ means "this returns text". Python doesn't enforce them, but they tell readers (and your editor) what goes in and out. Like the labels on a **plug socket** showing which plug fits. The projects use them everywhere.

## Returning several values
~~~python
def min_max(numbers: list[float]) -> tuple[float, float]:
    return min(numbers), max(numbers)

low, high = min_max([3.0, 9.5, 1.2])   # unpack the two results
print(low, high)                       # → 1.2 9.5
~~~

## Tiny functions: lambda, and sorting with key=
A ~lambda~ is a one-line function with no name, mostly used to tell ~sorted~ **what to sort by**:

~~~python
docs = [{"title": "A", "score": 0.4}, {"title": "B", "score": 0.9}]
best_first = sorted(docs, key=lambda d: d["score"], reverse=True)
print(best_first[0]["title"])          # → B
~~~

Read ~key=lambda d: d["score"]~ as "sort the documents by their score". Like telling someone sorting post "order these by postcode, not by name".

## Things defined at the top of a file
Objects created once at the top of a file (not inside a function) are shared by every function in it. The projects do this for expensive things like the AI client:

~~~python
CACHE: dict[str, str] = {}             # one shared dictionary for the whole file

def remember(key: str, value: str) -> None:
    CACHE[key] = value
~~~

Like the office coffee machine: bought once, used by everyone, instead of buying a new one per cup.

## Common mistakes
- Forgetting ~return~, so the function gives back ~None~.
- Calling a function without brackets: ~add_tax~ is the recipe card itself; ~add_tax(100)~ actually cooks.
- Functions that do too much. Good project code has many small functions, each with one job.

## How it looks in the projects
~~~python
def needs_human(confidence: float, amount: float, threshold: float = 0.8) -> bool:
    """Plain code decides: low confidence or big money goes to a person."""
    return confidence < threshold or amount > 10_000

print(needs_human(0.95, 500))      # → False
print(needs_human(0.95, 25_000))   # → True
~~~
Small, typed, documented functions like this are the **deterministic shell** around the AI in every project. (~10_000~ is just 10000 written with a separator for readability.)
`,
    practice: [
      { q: "What does a function return if it has no return line?", a: "None." },
      { q: "In def classify(text: str) -> Label:, what do ': str' and '-> Label' mean?", a: "Type hints: the input text should be a string, and the function returns a Label. They document the function; Python doesn't enforce them." },
      { q: "How would you sort a list of tickets by their 'created' field, newest first?", a: "sorted(tickets, key=lambda t: t[\"created\"], reverse=True)" },
    ],
  },

  {
    id: "comprehensions",
    title: "7. Comprehensions and generators: transforming lists in one line",
    summary: "The short way to build a new list or dict from an old one, which projects use constantly to filter and reshape data.",
    features: ["list-comp", "dict-comp", "generator", "yield"],
    body: md`
## The idea
Very often you want "a new list made from an old list": the cleaned texts, only the failed cases, the scores. A **comprehension** says that in one line.

Think of it like a **sieve and a juicer in one**: pour the list in, keep only what passes the test, transform each piece on the way out.

## List comprehensions
~~~python
scores = [0.9, 0.4, 0.75, 0.2]

# the long way
passed = []
for s in scores:
    if s >= 0.5:
        passed.append(s)

# the comprehension: [what to keep  for each item  if a test]
passed = [s for s in scores if s >= 0.5]
print(passed)                              # → [0.9, 0.75]

texts = ["  Hi ", "REFUND ", " bug"]
print([t.strip().lower() for t in texts])  # → ['hi', 'refund', 'bug']
~~~

Read it out loud from the middle: "**for each** s **in** scores, **if** s ≥ 0.5, **keep** s."

## Dict and set comprehensions
~~~python
names = ["billing", "bug"]
lengths = {n: len(n) for n in names}       # a dict
print(lengths)                             # → {'billing': 7, 'bug': 3}
unique_words = {w.lower() for w in ["A", "a", "B"]}   # a set
print(sorted(unique_words))                # → ['a', 'b']
~~~

## Generator expressions: compute as you go
Write it with round brackets inside ~sum~, ~any~, ~all~, ~max~ or ~next~, and Python doesn't build the whole list first:

~~~python
results = [{"ok": True}, {"ok": False}, {"ok": True}]
print(sum(1 for r in results if r["ok"]))   # → 2      (count the passes)
print(all(r["ok"] for r in results))        # → False  (did everything pass?)
print(any(not r["ok"] for r in results))    # → True   (did anything fail?)
~~~

## yield: functions that hand out items one at a time
~~~python
def chunks(text: str, size: int):
    for start in range(0, len(text), size):
        yield text[start:start + size]      # hand out one piece, then pause here

for piece in chunks("abcdefgh", 3):
    print(piece)                            # → abc, then def, then gh
~~~

A function with ~yield~ is like a **ticket dispenser**: each pull gives you the next ticket, and it doesn't print all of them at once. The projects use this to split long documents into pieces (**chunking**) without loading everything into memory.

## Common mistakes
- Cramming too much into one comprehension. If it needs two ~if~s and a nested loop, a normal ~for~ loop is clearer.
- Expecting a generator to work twice. Once it has handed out every item, it's empty.

## How it looks in the projects
~~~python
cases = [{"expected": "billing", "got": "billing"}, {"expected": "bug", "got": "other"}]
failures = [c for c in cases if c["got"] != c["expected"]]
accuracy = sum(c["got"] == c["expected"] for c in cases) / len(cases)
print(len(failures), f"{accuracy:.0%}")    # → 1 50%
~~~
These two lines (find the failures, compute the score) appear in nearly every **eval** in the lab. (~True~ counts as 1 when you add it up, which is why the ~sum~ works.)
`,
    practice: [
      { q: "Rewrite as a comprehension: out = [] / for t in tickets: if t[\"priority\"] == \"high\": out.append(t[\"id\"])", a: "out = [t[\"id\"] for t in tickets if t[\"priority\"] == \"high\"]" },
      { q: "What does any(x > 10 for x in [3, 12, 5]) return?", a: "True — at least one number is bigger than 10." },
      { q: "Why might a document-splitting function use yield instead of returning a list?", a: "It hands out one chunk at a time, so a huge document doesn't need all its chunks in memory at once." },
    ],
  },

  {
    id: "modules",
    title: "8. Modules, imports and the standard library",
    summary: "How a project is split into files, how files use each other, and the built-in tools the projects borrow.",
    features: ["import", "main-guard", "json-calls", "counter", "regex", "misc-stdlib"],
    body: md`
## The idea
Real projects are split into several files, each with one job: ~llm.py~ talks to the AI, ~schemas.py~ describes the data, ~eval.py~ tests it. Each file is a **module**. ~import~ lets one file use another's code.

Think of it like **departments in a company**: accounting doesn't do marketing's job, it just asks marketing when it needs something.

## Importing
~~~python
import json                          # bring in a whole module; use it as json.something
from datetime import date, timedelta # bring in specific names
from pathlib import Path
import statistics as stats           # give it a shorter nickname

print(date.today() + timedelta(days=7))      # a week from today
print(stats.mean([2, 4, 9]))                 # → 5
~~~

In the projects, ~from llm import call_model~ means "from my own file ~llm.py~, borrow the function ~call_model~".

## The "main guard"
~~~python
def main():
    print("running the script")

if __name__ == "__main__":
    main()
~~~
This means: "run ~main()~ only when this file is started directly (~python3 eval.py~), not when another file imports it". Like a **demo button** on a kitchen appliance: it runs when you press it in the shop, not every time the appliance is plugged into a bigger kitchen.

## The standard-library tools you'll meet
**json**: turn Python dicts into JSON text and back. JSON is how data travels between programs and AI models.

~~~python
import json
data = {"label": "billing", "confidence": 0.92}
text = json.dumps(data)                 # dict → JSON text
print(text)                             # → {"label": "billing", "confidence": 0.92}
back = json.loads(text)                 # JSON text → dict
print(back["label"])                    # → billing
~~~

**collections.Counter**: count things in one line.

~~~python
from collections import Counter, defaultdict
labels = ["bug", "billing", "bug", "praise", "bug"]
print(Counter(labels).most_common(2))   # → [('bug', 3), ('billing', 1)]

groups = defaultdict(list)              # a dict that creates an empty list for new keys
for name, team in [("Ana", "ops"), ("Bo", "ops"), ("Cy", "dev")]:
    groups[team].append(name)
print(dict(groups))                     # → {'ops': ['Ana', 'Bo'], 'dev': ['Cy']}
~~~

**re** (regular expressions): find patterns in text, like order numbers or emails.

~~~python
import re
text = "Call 555-0142 about order #A-7781"
print(re.findall(r"#([A-Z]-\d+)", text))   # → ['A-7781']
print(bool(re.search(r"\d{3}-\d{4}", text)))  # → True  (looks like a phone number)
~~~
A regex is a **search pattern**: ~\d~ means "a digit", ~+~ means "one or more", and the brackets mark the part you want back. You only need to *read* simple ones, and each project explains its patterns.

**Others you'll see**: ~datetime~ (dates and times), ~pathlib.Path~ (files and folders), ~hashlib~ (making a fingerprint of text, used for caching), ~uuid~ (unique ids), ~time~ (timing and waiting), ~random~, ~logging~ (writing a diary of what the program did), ~os~ (environment variables).

## Common mistakes
- Naming your own file ~json.py~ or ~anthropic.py~. Python then imports *your* file instead of the real library.
- Circular imports: two files importing each other. Keep a clear "who uses whom" direction.

## How it looks in the projects
~~~python
import hashlib, json
def cache_key(prompt: str, model: str) -> str:
    raw = json.dumps({"p": prompt, "m": model}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

print(cache_key("hello", "claude-haiku-4-5"))   # the same inputs always give the same key
~~~
`,
    practice: [
      { q: "What's the difference between import json and from json import loads?", a: "The first brings in the module and you write json.loads(...). The second brings in just that function and you write loads(...)." },
      { q: "What does if __name__ == \"__main__\": protect against?", a: "Running the script's main code when another file merely imports it. The code inside runs only when you start that file directly." },
      { q: "Count how often each label appears in a list called labels.", a: "from collections import Counter; Counter(labels)" },
    ],
  },

  {
    id: "errors-files",
    title: "9. Errors, files and with-blocks",
    summary: "What happens when things go wrong and how to handle it calmly, plus reading and writing files safely.",
    features: ["exceptions", "with"],
    body: md`
## The idea
Things go wrong all the time: the network drops, the AI returns something odd, a file is missing. When that happens Python **raises an exception**, an error message that stops the program unless you **catch** it.

Think of exceptions like a **fire alarm**: it goes off, and either someone trained handles it (~except~) or everyone leaves the building (the program crashes).

## try / except
~~~python
def to_number(text: str) -> float | None:
    try:
        return float(text)
    except ValueError:            # only catch the error you expect
        return None

print(to_number("12.5"))          # → 12.5
print(to_number("twelve"))        # → None
~~~

The full shape:

~~~python
try:
    result = 10 / 0
except ZeroDivisionError as e:    # "as e" keeps the error so you can log it
    print("problem:", e)          # → problem: division by zero
else:
    print("runs only if nothing went wrong")
finally:
    print("always runs, error or not: good for clean-up")
~~~

## Raising your own errors
~~~python
class ValidationFailed(Exception):
    """Our own error type, so callers can catch exactly this."""

def check_total(lines: list[float], total: float) -> None:
    if abs(sum(lines) - total) > 0.01:
        raise ValidationFailed(f"lines add up to {sum(lines)}, not {total}")

try:
    check_total([10.0, 5.0], 20.0)
except ValidationFailed as e:
    print("send to a human:", e)  # → send to a human: lines add up to 15.0, not 20.0
~~~

## Files, and "with" blocks
~with~ opens something and **guarantees it gets closed**, even if an error happens inside. Like a library that automatically takes the book back when you leave, even if you leave in a hurry.

~~~python
with open("notes.txt", "w") as f:          # "w" = write (creates or replaces the file)
    f.write("first line\n")

with open("notes.txt") as f:               # default is "r" = read
    for line in f:
        print(line.strip())                # → first line
~~~

The projects often use ~pathlib~, which is shorter:

~~~python
from pathlib import Path
import json
Path("result.json").write_text(json.dumps({"ok": True}))
data = json.loads(Path("result.json").read_text())
print(data)                                # → {'ok': True}
~~~

Golden test sets are often stored as **JSONL**: one JSON object per line.

~~~python
import json
from pathlib import Path
Path("golden.jsonl").write_text('{"text": "refund", "label": "billing"}\n{"text": "crash", "label": "bug"}\n')
cases = [json.loads(line) for line in Path("golden.jsonl").read_text().splitlines() if line.strip()]
print(len(cases), cases[1]["label"])       # → 2 bug
~~~

## Common mistakes
- ~except:~ or ~except Exception:~ that silently swallows everything. You hide real bugs. Catch the specific error, or at least log it.
- Opening a file with ~"w"~ when you meant to add to it. ~"w"~ wipes it; ~"a"~ appends.
- Retrying forever. The projects retry a fixed number of times, then hand over to a person.

## How it looks in the projects
~~~python
import time
def call_with_retry(fn, attempts: int = 3):
    for n in range(attempts):
        try:
            return fn()
        except TimeoutError:
            time.sleep(2 ** n)        # wait 1s, 2s, 4s: "exponential backoff"
    raise RuntimeError("gave up after retries")
~~~
`,
    practice: [
      { q: "Why catch a specific error (except ValueError) instead of every error (except:)?", a: "Catching everything hides real bugs you didn't expect. Catch the error you know how to handle, and let surprises be loud." },
      { q: "What does a with block guarantee?", a: "That the thing it opened (a file, a connection) is closed afterwards, even if an error happens inside the block." },
      { q: "What's in a .jsonl file?", a: "One JSON object per line, like one test case per line. Read it line by line with json.loads." },
    ],
  },

  {
    id: "classes",
    title: "10. Classes and objects",
    summary: "Bundling data and the functions that work on it into one thing: how the projects model tickets, clients and tools.",
    features: ["class", "init-self", "property", "classmethod", "dataclass", "enum", "abc"],
    body: md`
## The idea
A **class** is a blueprint. An **object** is one thing built from it. The class says "every ticket has a subject and a priority, and can be escalated"; each actual ticket is an object.

Think of a class like a **cookie cutter** and objects like the **cookies**: one shape, many cookies, each with its own decoration.

## A simple class
~~~python
class Ticket:
    def __init__(self, subject: str, priority: str = "normal"):
        self.subject = subject          # data stored on this particular ticket
        self.priority = priority

    def escalate(self) -> None:         # a method: a function that belongs to the class
        self.priority = "high"

t = Ticket("Charged twice")
t.escalate()
print(t.subject, t.priority)            # → Charged twice high
~~~

- ~__init__~ runs when you create an object. It sets up the object's data.
- ~self~ means "this particular object". ~self.priority~ is *this* ticket's priority. Like writing "my" on a form: each person's "my name" is different.

## @dataclass: classes for holding data, without the typing
Most classes in the projects mainly **hold data**. ~@dataclass~ writes the ~__init__~ for you:

~~~python
from dataclasses import dataclass, field

@dataclass
class EvalResult:
    case_id: str
    passed: bool
    notes: list[str] = field(default_factory=list)   # a fresh empty list for each result

r = EvalResult("case-1", passed=False)
r.notes.append("wrong label")
print(r)          # → EvalResult(case_id='case-1', passed=False, notes=['wrong label'])
~~~

## Enum: a fixed menu of choices
~~~python
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    HIGH = "high"

print(Priority.HIGH.value)       # → high
print(Priority("low"))           # → Priority.LOW   (anything not on the menu raises an error)
~~~
Like a **drop-down menu** on a form: you can only pick what's listed.

## @property and @classmethod
~~~python
class Invoice:
    def __init__(self, lines: list[float]):
        self.lines = lines

    @property
    def total(self) -> float:          # used like data (inv.total), computed on the fly
        return sum(self.lines)

    @classmethod
    def empty(cls) -> "Invoice":       # another way to create an Invoice
        return cls([])

inv = Invoice([10.0, 2.5])
print(inv.total)                       # → 12.5   (no brackets needed)
print(Invoice.empty().total)           # → 0
~~~

## Inheritance and abstract base classes
A class can **inherit** from another: it gets everything the parent has and can add or change things. An **abstract base class** is a "contract": a list of methods every child **must** provide.

~~~python
from abc import ABC, abstractmethod

class Model(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str: ...

class FakeModel(Model):                # a stand-in used in tests: no internet, no cost
    def complete(self, prompt: str) -> str:
        return "billing"

print(FakeModel().complete("refund please"))   # → billing
~~~

Like a **job description**: "whoever takes this role must be able to answer the phone". The real model and the fake model both fit the role, so the rest of the code doesn't care which one it gets. This is how the projects test without paying for AI calls.

## Common mistakes
- Forgetting ~self~ as the first input of a method.
- Using a shared list as a default (~notes: list = []~ in a dataclass). Use ~field(default_factory=list)~.
- Building deep family trees of classes. The projects keep classes small and flat.

## How it looks in the projects
Data shapes (tickets, invoices, results) are classes, mostly ~@dataclass~ or Pydantic models (next lesson). The AI client is wrapped in a small class or module so it can be swapped for a **fake** in tests.
`,
    practice: [
      { q: "What does self mean inside a method?", a: "The particular object the method was called on. In t.escalate(), self is t." },
      { q: "What does @dataclass save you from writing?", a: "The __init__ method (and a readable print-out), for classes that mainly hold data." },
      { q: "Why do the projects define a FakeModel with the same methods as the real one?", a: "So tests can run without internet or cost. Because both follow the same contract, the rest of the code works with either." },
    ],
  },

  {
    id: "pydantic",
    title: "11. Type hints and Pydantic: describing data the AI must return",
    summary: "Optional, Literal, list[str] and Pydantic models: the 'forms' the AI fills in. This is the single most used tool in the lab.",
    features: ["literal-optional", "generics", "pydantic-model"],
    body: md`
## The idea
AI models write text. Your code needs **data** it can trust: a label from a fixed list, a number, a date. A **Pydantic model** is a class that describes exactly what that data must look like, and **checks** it.

Think of a Pydantic model like a **paper form with strict boxes**: "Category: tick one of these 4 boxes", "Amount: numbers only". The AI fills in the form; Pydantic is the clerk who rejects it if a box is filled wrong.

## Type hints for containers and choices
~~~python
from typing import Literal, Optional

tags: list[str] = ["urgent", "billing"]          # a list of strings
counts: dict[str, int] = {"bug": 3}              # text keys, number values
manager: Optional[str] = None                    # a string OR None
manager2: str | None = None                      # the same thing, newer spelling
Category = Literal["billing", "bug", "praise", "other"]   # only these exact values
~~~

~Literal~ is the important one: it turns "any text" into "one of these choices". Like a **multiple-choice question** instead of an open question.

## A Pydantic model
~~~python
from typing import Literal
from pydantic import BaseModel, Field, ValidationError

class TicketLabel(BaseModel):
    category: Literal["billing", "bug", "praise", "other"]
    urgent: bool
    confidence: float = Field(ge=0, le=1, description="0 = guessing, 1 = certain")
    summary: str | None = None

ok = TicketLabel(category="bug", urgent=True, confidence=0.9)
print(ok.category, ok.confidence)        # → bug 0.9
print(ok.model_dump())                   # → {'category': 'bug', 'urgent': True, 'confidence': 0.9, 'summary': None}

try:
    TicketLabel(category="refunds", urgent=True, confidence=1.7)
except ValidationError as e:
    print(len(e.errors()), "problems")  # → 2 problems  (not a listed category; confidence above 1)
~~~

## Turning JSON into a checked object, and back
~~~python
raw = '{"category": "billing", "urgent": false, "confidence": 0.8}'
label = TicketLabel.model_validate_json(raw)   # JSON text → checked object (or a ValidationError)
print(label.urgent)                            # → False
print(label.model_dump_json())                 # object → JSON text
~~~

## Models inside models
~~~python
class LineItem(BaseModel):
    description: str
    amount: float

class Invoice(BaseModel):
    vendor: str
    lines: list[LineItem]
    total: float

inv = Invoice(vendor="Acme", lines=[LineItem(description="Paper", amount=20)], total=20)
print(inv.lines[0].amount)                     # → 20.0   (Pydantic turned 20 into 20.0)
~~~

## Why this matters so much
In the projects you hand the model class straight to the AI library. The library asks the AI to fill in exactly that form and gives you back a checked object:

~~~python
# (from the projects; needs an API key to run)
# response = client.messages.parse(model=MODEL, max_tokens=500, messages=[...], output_format=TicketLabel)
# label = response.parsed_output          # a TicketLabel, already checked
~~~

The schema guarantees the **shape** of the answer, not that it's **true**. That's why projects add their own checks afterwards (does the invoice add up?).

## Common mistakes
- Using ~str~ when you mean a fixed choice. Use ~Literal[...]~, so the AI can't invent new categories.
- Forgetting that ~Optional~ fields still need a default (~= None~) if they may be left out.
- Treating a valid schema as a correct answer. Validate the meaning too.

## How it looks in the projects
Nearly every project has a ~schemas.py~ full of these models. They're the contract between the **probabilistic** AI and your **deterministic** code.
`,
    practice: [
      { q: "Why use Literal[\"billing\", \"bug\", \"other\"] instead of str for a category?", a: "So only those exact values are allowed. The AI can't invent a new category, and your routing code can rely on the list." },
      { q: "What happens if you create a Pydantic model with a value that breaks the rules?", a: "It raises a ValidationError listing every problem, instead of quietly accepting bad data." },
      { q: "The AI returns a valid TicketLabel. Does that mean the label is correct?", a: "No. It means the answer has the right shape. Whether it's right is checked by evaluation and extra validation rules." },
    ],
  },

  {
    id: "decorators",
    title: "12. Decorators: the @ lines above functions",
    summary: "What @something above a function means, because the projects use them for tools, web routes and tests.",
    features: ["decorator"],
    body: md`
## The idea
A **decorator** is a line starting with ~@~ just above a function. It **wraps** the function to give it an extra ability, without changing the function's own code.

Think of it like **putting a phone in a case**: the phone works exactly the same, but now it's also waterproof. Or like a stamp on a letter that says "send by express".

## A home-made decorator
~~~python
import time
from functools import wraps

def timed(fn):
    @wraps(fn)                         # keeps the original function's name and docstring
    def wrapper(*args, **kwargs):      # accept any inputs and pass them through
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
        return result
    return wrapper

@timed
def slow_add(a, b):
    time.sleep(0.1)
    return a + b

print(slow_add(2, 3))     # → slow_add took 0.100s, then 5
~~~

~@timed~ above ~slow_add~ is just short for ~slow_add = timed(slow_add)~. ~*args~ means "any number of plain inputs" and ~**kwargs~ means "any number of named inputs".

You will rarely *write* decorators. You need to **recognise** them.

## The decorators you'll meet in the projects
| You'll see | What it adds | Lesson / project |
|---|---|---|
| ~@dataclass~ | writes ~__init__~ for a data class | lesson 10 |
| ~@property~, ~@classmethod~ | computed values, extra constructors | lesson 10 |
| ~@beta_tool~ | turns a function into a **tool** the AI can ask to use (its docstring becomes the tool description) | I02 and later |
| ~@mcp.tool()~ | publishes a function on an **MCP server** | I03 |
| ~@app.post("/webhook")~ | makes a function answer web requests (FastAPI) | B04 and later |
| ~@pytest.fixture~, ~@pytest.mark.parametrize~ | test helpers | lesson 14 |
| ~@workflow.defn~, ~@activity.defn~ | durable workflow steps (Temporal) | A02 |

~~~python
# (shape only, from the projects)
# @beta_tool
# def get_order_status(order_id: str) -> str:
#     """Look up the shipping status of one order."""
#     return lookup(order_id)
~~~

## Common mistakes
- Thinking the decorator changes what the function *does*. It adds something around it; the body still runs the same.
- Forgetting the brackets on decorators that need them: ~@mcp.tool()~ vs ~@dataclass~. Copy the project's spelling exactly.

## How it looks in the projects
Every time you see ~@something~, ask: "what extra ability does this give the function below?" The project's "Python used here" notes always tell you.
`,
    practice: [
      { q: "What is @timed above def f(): ... short for?", a: "f = timed(f) — the function is passed to the decorator, and the wrapped version replaces it." },
      { q: "In the projects, what does @beta_tool do to a function?", a: "It turns it into a tool the AI model can ask to call. The function's name, type hints and docstring describe the tool to the AI." },
      { q: "What do *args and **kwargs mean in a function definition?", a: "Accept any number of plain inputs (*args, a tuple) and any number of named inputs (**kwargs, a dict)." },
    ],
  },

  {
    id: "async",
    title: "13. Async and parallel work: doing many waits at once",
    summary: "async/await and thread pools: how projects make hundreds of slow AI calls without waiting for each one in turn.",
    features: ["async", "threads"],
    body: md`
## The idea
An AI call takes a second or more, and most of that time your program is just **waiting** for the answer. If you have 500 reviews to classify, waiting for each one in turn takes ages.

**Async** lets one program start many waits at once. Think of a **chef with several pots**: put pasta on, and while it boils, chop vegetables, then stir the sauce. They don't stand staring at one pot.

## async and await
~~~python
import asyncio

async def classify(text: str) -> str:     # "async def" = this function may wait
    await asyncio.sleep(1)                 # "await" = wait here, and let other work run meanwhile
    return "bug" if "crash" in text else "other"

async def main():
    texts = ["app crash", "hello", "crash on login"]
    results = await asyncio.gather(*(classify(t) for t in texts))   # run all at once
    print(results)                         # → ['bug', 'other', 'bug']  (in about 1s, not 3s)

asyncio.run(main())                        # start the async world from normal code
~~~

Three rules cover almost everything:
1. ~async def~ makes a function that can wait.
2. Inside it, put ~await~ in front of anything slow.
3. ~asyncio.run(main())~ starts it all from ordinary code.

## Not too many at once: a semaphore
AI services have **rate limits** (a maximum number of requests per minute). A **semaphore** caps how many calls run at the same time:

~~~python
import asyncio
limit = asyncio.Semaphore(5)               # at most 5 at a time

async def polite_classify(text: str) -> str:
    async with limit:                      # wait for a free slot
        return await classify(text)
~~~

Like a **shop that lets in 5 customers at a time**: everyone gets served, the shop never overflows.

## Threads: the non-async way
Some code isn't async. A **thread pool** runs ordinary functions side by side:

~~~python
from concurrent.futures import ThreadPoolExecutor

def slow_square(n: int) -> int:
    return n * n

with ThreadPoolExecutor(max_workers=4) as pool:
    print(list(pool.map(slow_square, [1, 2, 3])))   # → [1, 4, 9]
~~~

## Common mistakes
- Calling an async function without ~await~. You get a "coroutine" object (a promise of work) instead of the result.
- Using ~time.sleep~ inside async code. It freezes everything; use ~await asyncio.sleep~.
- Launching thousands of calls at once and hitting rate limits. Always cap with a semaphore or ~max_workers~.

## How it looks in the projects
Batch jobs and evals run many AI calls in parallel with a cap. For really big overnight jobs, B03 uses the **Batches API** instead: you upload all the requests at once and collect the answers later, at half the price.
`,
    practice: [
      { q: "What does await mean, in plain words?", a: "Wait here for this slow thing, and let other work run in the meantime." },
      { q: "Why add a Semaphore(5) around AI calls?", a: "To limit how many run at the same time, so you stay under the service's rate limit." },
      { q: "You call result = classify(\"hi\") on an async function and get a strange object. What's missing?", a: "await — inside async code it should be result = await classify(\"hi\")." },
    ],
  },

  {
    id: "testing",
    title: "14. Testing with pytest",
    summary: "Small automatic checks that prove code works and keeps working, the habit that separates engineers from tinkerers.",
    features: ["tests"],
    body: md`
## The idea
A **test** is a small piece of code that runs your code and checks the result. Run all tests after every change, and you know at once if you broke something.

Think of tests like a **smoke alarm**: you don't notice it most days, but the moment something burns, it tells you, before the whole house is on fire.

## Your first test
Put tests in files named ~test_*.py~, in functions named ~test_*~. Inside, ~assert~ states what must be true.

~~~python
# test_routing.py
def route(category: str) -> str:
    return {"billing": "finance", "bug": "engineering"}.get(category, "general")

def test_billing_goes_to_finance():
    assert route("billing") == "finance"

def test_unknown_goes_to_general():
    assert route("spaceships") == "general"
~~~

~~~bash
pytest -q          # finds and runs every test; prints a dot per pass and details for failures
~~~

## Checking that errors happen
~~~python
import pytest

def parse_amount(text: str) -> float:
    return float(text.replace("$", ""))

def test_bad_amount_raises():
    with pytest.raises(ValueError):
        parse_amount("lots")
~~~

## Many cases, one test: parametrize
~~~python
import pytest

@pytest.mark.parametrize("text,expected", [
    ("$10", 10.0),
    ("3.5", 3.5),
    ("$0", 0.0),
])
def test_parse_amount(text, expected):
    assert parse_amount(text) == expected
~~~

## Testing AI code without calling the AI: fakes
Real AI calls cost money, need the internet, and give slightly different answers each time. So **unit tests** swap in a **fake** model that returns fixed answers (remember ~FakeModel~ from lesson 10):

~~~python
class FakeModel:
    def __init__(self, answer: str):
        self.answer = answer
    def complete(self, prompt: str) -> str:
        return self.answer

def triage(text: str, model) -> str:
    label = model.complete(text)
    return "human" if label not in {"billing", "bug"} else label

def test_unexpected_label_goes_to_human():
    assert triage("???", FakeModel("aliens")) == "human"
~~~

Like a **flight simulator**: pilots practise emergencies without risking a real plane.

## Tests vs evals
- **Tests** check your plain code: exact, fast, pass or fail.
- **Evals** check the AI's quality on many real examples: a score, like "92% correct".

The projects use both: tests with fakes for the code around the AI, evals with real calls for the AI itself.

## Common mistakes
- Only testing the happy path. Test the weird inputs too: empty text, huge text, wrong types.
- Tests that call the real AI. They become slow, costly and flaky. Use fakes in tests, and real calls in evals.

## How it looks in the projects
Every project has a ~tests/~ folder and an ~eval.py~. Lessons 1–14 are all you need to read both.
`,
    practice: [
      { q: "What must test files and test functions be named for pytest to find them?", a: "Files test_*.py and functions test_*." },
      { q: "Why use a fake model in unit tests?", a: "Tests become fast, free, work offline and give the same answer every time, so they test your code rather than the AI's mood." },
      { q: "What's the difference between a test and an eval?", a: "A test checks code exactly (pass/fail). An eval measures the AI's quality on many examples and gives a score." },
    ],
  },

  {
    id: "apis",
    title: "15. Talking to AI models: HTTP, JSON and the Anthropic SDK",
    summary: "The bridge to the projects: what an API call is, what goes in, what comes back, and how to read it in Python.",
    features: [],
    body: md`
## The idea
An **API** is a way for programs to ask another program for something over the internet. You send a **request** (a message with your question), and you get back a **response** (usually JSON).

Think of it like **ordering at a restaurant counter**: you hand over an order slip in a set format, the kitchen (the AI service) prepares it, and you get back a tray with your food and a receipt.

## A raw HTTP request (so you know what's underneath)
~~~python
import httpx    # a popular library for web requests (pip install httpx)

# r = httpx.get("https://api.example.com/orders/123", headers={"Authorization": "Bearer KEY"}, timeout=10)
# r.status_code   → 200 means OK; 4xx means you sent something wrong; 5xx means their side failed
# r.json()        → the response body as a Python dict
~~~

**Status codes** are like delivery notes: 200 "delivered", 404 "address not found", 429 "too many orders, slow down" (a **rate limit**), 500 "the kitchen had a problem".

## The Anthropic SDK: a friendly wrapper
An **SDK** is a library that does the HTTP part for you. Here is a complete AI call:

~~~python
import anthropic

client = anthropic.Anthropic()            # reads ANTHROPIC_API_KEY from the environment

response = client.messages.create(
    model="claude-haiku-4-5",             # which model
    max_tokens=300,                       # the longest answer you'll accept (a cost cap)
    system="You classify support tickets. Answer with one word.",   # standing instructions
    messages=[                            # the conversation so far
        {"role": "user", "content": "My card was charged twice."},
    ],
)

print(response.content[0].text)           # the answer text, e.g. "billing"
print(response.usage.input_tokens, response.usage.output_tokens)   # what you'll pay for
print(response.stop_reason)               # why it stopped: "end_turn", "max_tokens", "tool_use"…
~~~

Read the request as a **form**: *which model*, *how long at most*, *standing instructions* (system), *the conversation* (messages: a list of dicts, each with a role and content). The response is an **object**: the answer is in ~content~ (a list of blocks, because answers can contain text and tool requests), plus **usage** (tokens, which is how you're billed).

## Getting structured data back
Lesson 11's Pydantic models plug straight in:

~~~python
from typing import Literal
from pydantic import BaseModel

class TicketLabel(BaseModel):
    category: Literal["billing", "bug", "other"]
    confidence: float

response = client.messages.parse(
    model="claude-haiku-4-5",
    max_tokens=300,
    messages=[{"role": "user", "content": "Classify: my card was charged twice."}],
    output_format=TicketLabel,
)
label = response.parsed_output            # a checked TicketLabel object
print(label.category, label.confidence)
~~~

## The gateway habit
The projects never scatter ~client.messages...~ calls everywhere. B01 builds one small file, ~llm.py~, with one function that every other file uses. It's where retries, logging, cost tracking and model choice live. Like having **one front desk** for all deliveries instead of every employee answering the door.

## Common mistakes
- Forgetting ~max_tokens~ (it's required) or setting it too low, so answers get cut off (~stop_reason == "max_tokens"~).
- Reading ~response.content~ as if it were text. It's a list of blocks; the text is in ~response.content[0].text~.
- Not handling 429 and 5xx errors. The SDK retries a few times by itself; the projects add their own limits on top.

## You're ready
If you can read this lesson's code and say what each line does, you can read the projects. Take the [Python checkpoint](#/checkpoint/python) to be sure, then on to the Foundations.
`,
    practice: [
      { q: "In client.messages.create(...), what goes in system and what goes in messages?", a: "system holds the standing instructions (the AI's job description). messages holds the conversation: a list of {role, content} dicts." },
      { q: "Where is the answer text in the response?", a: "response.content[0].text — content is a list of blocks, and the first block holds the text." },
      { q: "What does status code 429 mean, and what should code do about it?", a: "Too many requests (a rate limit). Wait and retry with growing pauses (exponential backoff), and cap how many calls run at once." },
    ],
  },
];

/* Plain-words boxes for each lesson (see CLAUDE.md) */
window.SIMPLE = window.SIMPLE || {};
Object.assign(window.SIMPLE, {
  "page:python": { simple: "All the Python you need before the projects, in 15 short lessons, each with examples, common mistakes and practice questions.", analogy: "Learning the controls of the car (pedals, mirrors, indicators) before your first real drive." },
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
);
