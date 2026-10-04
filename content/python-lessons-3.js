/*
 * Python toolkit lessons 9–12. See the header of content/python.js for the authoring rules
 * (every code block shows its output in "# →" comments; every "## " part ends with a ~~~quiz).
 */
window.PYTHON_LESSONS.push(
  {
    id: "errors-files",
    title: "9. Errors, files and with-blocks",
    summary: "What happens when things go wrong and how to handle it calmly, plus reading and writing files safely.",
    features: ["exceptions", "with"],
    body: md`
## The idea
Things go wrong all the time: the network drops, the AI returns something odd, a file is missing. When that happens Python **raises an exception**, an error message that stops the program unless you **catch** it.

Think of exceptions like a **fire alarm**: it goes off, and either someone trained handles it (~except~) or everyone leaves the building (the program crashes).

**Scenario: the same mistake, unhandled and handled.**

~~~python
# Unhandled: the program stops at the bad line
# print(10 / 0)
# print("this never runs")
# ✗ ZeroDivisionError: division by zero

# Handled: the program notices, explains, and carries on
try:
    print(10 / 0)
except ZeroDivisionError:
    print("Can't divide by zero, using 0 instead")
print("program keeps going")
# → Can't divide by zero, using 0 instead
# → program keeps going
~~~

The errors you'll meet most:

| Error | What it means | Everyday example |
|---|---|---|
| ~ValueError~ | right type, wrong value | ~int("twelve")~ |
| ~TypeError~ | wrong type for this job | ~"5" + 5~ |
| ~KeyError~ | dict label doesn't exist | ~{}["name"]~ |
| ~IndexError~ | list position doesn't exist | ~[1, 2][5]~ |
| ~ZeroDivisionError~ | dividing by zero | ~1 / 0~ |
| ~FileNotFoundError~ | the file isn't there | ~open("nope.txt")~ |

~~~quiz
? Which error does ~int("abc")~ raise?
+ ValueError
- TypeError
- KeyError
- NameError
! ~int()~ accepts text, but "abc" isn't a number it can read: the type is fine, the value is wrong.
~~~

## try / except
~~~python
def to_number(text: str) -> float | None:
    try:
        return float(text)
    except ValueError:            # only catch the error you expect
        return None

print(to_number("12.5"))
print(to_number("twelve"))
print(to_number("  7 "))          # float() ignores spaces at the ends
# → 12.5
# → None
# → 7.0
~~~

The full shape, with every part:

~~~python
try:
    result = 10 / 0
except ZeroDivisionError as e:    # "as e" keeps the error so you can log it
    print("problem:", e)
else:
    print("runs only if nothing went wrong")
finally:
    print("always runs, error or not: good for clean-up")
# → problem: division by zero
# → always runs, error or not: good for clean-up
~~~

~~~python
try:
    result = 10 / 2
except ZeroDivisionError as e:
    print("problem:", e)
else:
    print("result is", result)
finally:
    print("always runs, error or not: good for clean-up")
# → result is 5.0
# → always runs, error or not: good for clean-up
~~~

**Scenario: a pile of messy prices** from a spreadsheet. Skip the bad ones instead of crashing on the first:

~~~python
raw_prices = ["4.99", "free", "12", "", "3.50"]
good = []
for p in raw_prices:
    try:
        good.append(float(p))
    except ValueError:
        print(f"skipping bad price: {p!r}")
print(good, "total", round(sum(good), 2))   # round: floats are approximate (lesson 2)
# → skipping bad price: 'free'
# → skipping bad price: ''
# → [4.99, 12.0, 3.5] total 20.49
~~~

(~{p!r}~ in an f-string shows the value *with* quotes, so you can see empty text clearly.)

**Scenario: catching different errors differently.**

~~~python
def safe_lookup(data, key):
    try:
        return 100 / data[key]
    except KeyError:
        return "no such key"
    except ZeroDivisionError:
        return "value was zero"

print(safe_lookup({"a": 4}, "a"))
print(safe_lookup({"a": 4}, "b"))
print(safe_lookup({"a": 0}, "a"))
# → 25.0
# → no such key
# → value was zero
~~~

~~~quiz
? Type exactly what this prints:
| try:
|     n = int("42")
| except ValueError:
|     n = -1
| print(n)
= 42
! "42" converts fine, so the except part never runs.
~~~

~~~quiz
? What does this print?
| try:
|     x = [1, 2, 3][10]
| except IndexError:
|     print("missing")
| finally:
|     print("done")
+ ~missing~ then ~done~
- ~done~ only
- ~missing~ only
- An IndexError crash
! Position 10 doesn't exist, so except prints "missing". finally ALWAYS runs, so "done" comes next.
~~~

~~~quiz
? Type exactly what this prints:
| def safe_div(a, b):
|     try:
|         return a / b
|     except ZeroDivisionError:
|         return 0
| print(safe_div(9, 3) + safe_div(1, 0))
= 3.0
! 9 / 3 = 3.0, and 1 / 0 is caught and returns 0. 3.0 + 0 = 3.0.
~~~

## Raising your own errors
You can sound the alarm yourself with ~raise~ when something is wrong that Python wouldn't notice on its own:

~~~python
def set_age(age: int) -> int:
    if age < 0:
        raise ValueError(f"age can't be negative, got {age}")
    return age

print(set_age(30))
try:
    set_age(-5)
except ValueError as e:
    print("rejected:", e)
# → 30
# → rejected: age can't be negative, got -5
~~~

**Your own error type** lets callers catch exactly your problem:

~~~python
class ValidationFailed(Exception):
    """Our own error type, so callers can catch exactly this."""

def check_total(lines: list[float], total: float) -> None:
    if abs(sum(lines) - total) > 0.01:
        raise ValidationFailed(f"lines add up to {sum(lines)}, not {total}")

try:
    check_total([10.0, 5.0], 15.0)
    print("invoice A ok")
    check_total([10.0, 5.0], 20.0)
    print("invoice B ok")
except ValidationFailed as e:
    print("send to a human:", e)
# → invoice A ok
# → send to a human: lines add up to 15.0, not 20.0
~~~

"invoice B ok" never prints: once the error is raised, Python jumps straight to ~except~.

~~~quiz
? What does this print?
| def withdraw(balance, amount):
|     if amount > balance:
|         raise ValueError("not enough money")
|     return balance - amount
| try:
|     print(withdraw(50, 80))
| except ValueError as e:
|     print("Error:", e)
- ~-30~
+ ~Error: not enough money~
- ~50~
- The program crashes
! 80 > 50, so ~raise~ sounds the alarm. The except catches it and prints the message.
~~~

## Files, and "with" blocks
~with~ opens something and **guarantees it gets closed**, even if an error happens inside. Like a library that automatically takes the book back when you leave, even if you leave in a hurry.

~~~python
with open("notes.txt", "w") as f:          # "w" = write (creates or replaces the file)
    f.write("first line\n")
    f.write("second line\n")

with open("notes.txt") as f:               # default is "r" = read
    for line in f:
        print(line.strip())                # strip() removes the newline at the end
# → first line
# → second line
~~~

The three modes you need: ~"r"~ read, ~"w"~ write (**wipes** the file first), ~"a"~ append (adds to the end).

**Scenario: a daily log** that grows each time you add to it:

~~~python
with open("log.txt", "w") as f:
    f.write("09:00 started\n")
with open("log.txt", "a") as f:            # append: keep what's there
    f.write("09:05 processed 12 tickets\n")
with open("log.txt", "a") as f:
    f.write("09:10 finished\n")
with open("log.txt") as f:
    print(f.read())
# → 09:00 started
# → 09:05 processed 12 tickets
# → 09:10 finished
~~~

**Scenario: opening a file that isn't there.**

~~~python
try:
    with open("missing.txt") as f:
        print(f.read())
except FileNotFoundError:
    print("No file yet: starting fresh")
# → No file yet: starting fresh
~~~

The projects often use ~pathlib~, which is shorter:

~~~python
from pathlib import Path
import json
Path("result.json").write_text(json.dumps({"ok": True, "count": 3}))
data = json.loads(Path("result.json").read_text())
print(data)
print(Path("result.json").exists(), Path("nope.json").exists())
# → {'ok': True, 'count': 3}
# → True False
~~~

~~~quiz
? A file holds 100 lines. You run ~open("data.txt", "w")~ and write one line. How many lines does it have now?
- 101
+ 1
- 100
- 0
! "w" wipes the file before writing. To add to the end, use "a" (append).
~~~

~~~quiz
? Type exactly what the **last** line prints:
| with open("shop.txt", "w") as f:
|     f.write("apples\n")
| with open("shop.txt", "a") as f:
|     f.write("pears\n")
| with open("shop.txt") as f:
|     lines = f.read().splitlines()
| print(len(lines), lines[-1])
= 2 pears
! "w" writes apples, "a" adds pears after it. Two lines; the last is pears.
~~~

## JSONL: one record per line
Golden test sets are often stored as **JSONL**: one JSON object per line. Like a stack of index cards, one card per test case.

~~~python
import json
from pathlib import Path
Path("golden.jsonl").write_text('{"text": "refund", "label": "billing"}\n{"text": "crash", "label": "bug"}\n')
cases = [json.loads(line) for line in Path("golden.jsonl").read_text().splitlines() if line.strip()]
print(len(cases))
print(cases[1]["label"])
for c in cases:
    print(f"{c['text']!r} should be {c['label']}")
# → 2
# → bug
# → 'refund' should be billing
# → 'crash' should be bug
~~~

**Writing** JSONL: one ~json.dumps~ per line.

~~~python
import json
results = [{"id": 1, "passed": True}, {"id": 2, "passed": False}]
with open("results.jsonl", "w") as f:
    for r in results:
        f.write(json.dumps(r) + "\n")
with open("results.jsonl") as f:
    print(f.read().strip())
# → {"id": 1, "passed": true}
# → {"id": 2, "passed": false}
~~~

~~~quiz
? Why is JSONL handy for test cases?
+ Each line is one complete record, so you can read, add or count cases line by line
- It's smaller than any other format
- Python can only read JSONL
- It hides the data from people
! One case per line means appending a new case is just adding a line, and a broken line doesn't spoil the others.
~~~

## Common mistakes
- ~except:~ or ~except Exception:~ that silently swallows everything. You hide real bugs. Catch the specific error, or at least log it.
- Opening a file with ~"w"~ when you meant to add to it. ~"w"~ wipes it; ~"a"~ appends.
- Retrying forever. The projects retry a fixed number of times, then hand over to a person.

~~~python
def bad_average(nums):
    try:
        return sum(nums) / len(nums)
    except:                      # catches EVERYTHING, even typos
        return 0

print(bad_average([2, 4]))
print(bad_average([]))           # fine: empty list → 0
print(bad_average("oops"))       # a real bug, silently hidden as 0!
# → 3.0
# → 0
# → 0
~~~

~~~quiz
? In the code above, why is ~except:~ (with no error name) a bad idea?
- It makes the code slower
+ It hides real bugs: passing text by mistake returns 0 instead of telling you
- It only catches one kind of error
- It's a syntax error
! Catch only the error you expect (here ~ZeroDivisionError~). Unexpected errors should be loud so you can fix them.
~~~

## How it looks in the projects
~~~python
import time

calls = {"n": 0}
def flaky_service():
    calls["n"] += 1
    if calls["n"] < 3:                       # fails twice, then works
        raise TimeoutError("no answer")
    return "ok"

def call_with_retry(fn, attempts: int = 3):
    for n in range(attempts):
        try:
            return fn()
        except TimeoutError:
            wait = 0.01 * 2 ** n             # real code waits 1s, 2s, 4s: "exponential backoff"
            print(f"attempt {n + 1} failed, waiting {wait:.2f}s")
            time.sleep(wait)
    raise RuntimeError("gave up after retries")

print(call_with_retry(flaky_service))
# → attempt 1 failed, waiting 0.01s
# → attempt 2 failed, waiting 0.02s
# → ok
~~~
Each failure waits twice as long as the last one, so a busy service gets breathing room. After the last attempt the code gives up loudly instead of trying forever.

~~~quiz
? With ~attempts=3~, what happens if the service fails all three times?
- It keeps trying forever
- It returns None quietly
+ It raises RuntimeError("gave up after retries")
- It returns "ok" anyway
! The loop ends after 3 tries without returning, so the line after the loop raises an error a person can see.
~~~

## Try it in your head

~~~quiz
? **Scenario: reading ages from a form.** Type exactly what this prints:
| ages = ["31", "abc", "45"]
| total = 0
| for a in ages:
|     try:
|         total += int(a)
|     except ValueError:
|         pass
| print(total)
= 76
! "abc" fails and is skipped (~pass~ means "do nothing"). 31 + 45 = 76.
~~~

~~~quiz
? **Scenario: a missing settings key.** What does this print?
| settings = {"theme": "dark"}
| try:
|     size = settings["font_size"]
| except KeyError:
|     size = 12
| print(size)
+ ~12~
- ~dark~
- ~None~
- A KeyError crash
! "font_size" isn't there, so the except gives the fallback 12. (~settings.get("font_size", 12)~ does the same in one line.)
~~~

~~~quiz
? **Scenario: else and finally.** Type exactly what the last line prints:
| try:
|     v = int("8")
| except ValueError:
|     print("bad")
| else:
|     print("good", v)
| finally:
|     print("checked")
= checked
! "8" is fine, so else prints "good 8", and finally always prints "checked" last.
~~~
`,
    practice: [
      { q: "Why catch a specific error (except ValueError) instead of every error (except:)?", a: "Catching everything hides real bugs you didn't expect. Catch the error you know how to handle, and let surprises be loud." },
      { q: "What does a with block guarantee?", a: "That the thing it opened (a file, a connection) is closed afterwards, even if an error happens inside the block." },
      { q: "What's in a .jsonl file?", a: "One JSON object per line, like one test case per line. Read it line by line with json.loads." },
      { q: "Scenario: a function reads a config file that may not exist yet. Which error do you catch, and what's a sensible fallback?", a: "FileNotFoundError, then use default settings (and maybe create the file)." },
      { q: "In try/except/else/finally, which parts run when NO error happens?", a: "try, then else, then finally. (except is skipped.)" },
      { q: "Scenario: an invoice's lines don't add up to its total. Should your code fix the total quietly or raise an error? Why?", a: "Raise an error (like ValidationFailed) so a person checks it. Quietly 'fixing' money hides real problems." },
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

You've been using objects all along. Every string is an object of the class ~str~, with methods attached:

~~~python
name = "dana"
print(type(name))           # name is an object made from the str blueprint
print(name.upper())         # upper is a method of the str class
print(isinstance(name, str))
# → <class 'str'>
# → DANA
# → True
~~~

~~~quiz
? In the cookie analogy, what is the class?
+ The cookie cutter (the shape every cookie shares)
- One particular cookie
- The oven
- The decorations
! The class is the shape/blueprint. Each object (cookie) is made from it and can have its own decorations (data).
~~~

## A simple class
~~~python
class Ticket:
    def __init__(self, subject: str, priority: str = "normal"):
        self.subject = subject          # data stored on this particular ticket
        self.priority = priority

    def escalate(self) -> None:         # a method: a function that belongs to the class
        self.priority = "high"

    def describe(self) -> str:
        return f"[{self.priority}] {self.subject}"

t1 = Ticket("Charged twice")
t2 = Ticket("App crashes", priority="high")
print(t1.describe())
print(t2.describe())
t1.escalate()                           # only t1 changes
print(t1.describe())
print(t2.subject)
# → [normal] Charged twice
# → [high] App crashes
# → [high] Charged twice
# → App crashes
~~~

- ~__init__~ runs when you create an object. It sets up the object's data.
- ~self~ means "this particular object". ~self.priority~ is *this* ticket's priority. Like writing "my" on a form: each person's "my name" is different.

**Scenario: a bank account** that remembers its balance:

~~~python
class Account:
    def __init__(self, owner: str, balance: float = 0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount: float) -> None:
        self.balance += amount

    def withdraw(self, amount: float) -> bool:
        if amount > self.balance:
            return False              # refuse: not enough money
        self.balance -= amount
        return True

acc = Account("Ana", 100)
acc.deposit(50)
print(acc.balance)
print(acc.withdraw(500))
print(acc.withdraw(30))
print(acc.owner, acc.balance)
# → 150
# → False
# → True
# → Ana 120
~~~

~~~quiz
? Type exactly what this prints:
| class Counter:
|     def __init__(self):
|         self.count = 0
|     def click(self):
|         self.count += 1
| c = Counter()
| c.click()
| c.click()
| print(c.count)
= 2
! Each ~click()~ adds 1 to this counter's own count: 0 → 1 → 2.
~~~

~~~quiz
? What does this print?
| class Dog:
|     def __init__(self, name):
|         self.name = name
| a = Dog("Rex")
| b = Dog("Bella")
| print(a.name, b.name)
+ ~Rex Bella~
- ~Bella Bella~
- ~Rex Rex~
- ~name name~
! Each object keeps its own data. ~self.name~ for a is "Rex"; for b it's "Bella".
~~~

## @dataclass: classes for holding data, without the typing
Most classes in the projects mainly **hold data**. ~@dataclass~ writes the ~__init__~ for you, plus a readable print-out and an ~==~ comparison:

~~~python
from dataclasses import dataclass, field

@dataclass
class EvalResult:
    case_id: str
    passed: bool
    notes: list[str] = field(default_factory=list)   # a fresh empty list for each result

r = EvalResult("case-1", passed=False)
r.notes.append("wrong label")
print(r)
print(r.passed)
print(EvalResult("x", True) == EvalResult("x", True))   # same data → equal
# → EvalResult(case_id='case-1', passed=False, notes=['wrong label'])
# → False
# → True
~~~

**Scenario: a product in a shop.**

~~~python
from dataclasses import dataclass

@dataclass
class Product:
    name: str
    price: float
    in_stock: bool = True

items = [Product("Mug", 8.5), Product("Lamp", 25.0, in_stock=False), Product("Pen", 1.2)]
available = [p.name for p in items if p.in_stock]
print(available)
print(f"Cheapest: {min(items, key=lambda p: p.price).name}")
# → ['Mug', 'Pen']
# → Cheapest: Pen
~~~

~~~quiz
? Type exactly what this prints:
| from dataclasses import dataclass
| @dataclass
| class Point:
|     x: int
|     y: int
| print(Point(2, 5))
= Point(x=2, y=5)
! @dataclass writes a readable print-out showing every field and its value.
~~~

## Enum: a fixed menu of choices
~~~python
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    HIGH = "high"

print(Priority.HIGH.value)
print(Priority("low"))
print(Priority.HIGH == "high")    # (str, Enum) members compare equal to their text
try:
    Priority("medium")
except ValueError as e:
    print("rejected:", e)
# → high
# → Priority.LOW
# → True
# → rejected: 'medium' is not a valid Priority
~~~
Like a **drop-down menu** on a form: you can only pick what's listed.

**Scenario: traffic lights** only have three states:

~~~python
from enum import Enum

class Light(Enum):
    RED = "stop"
    AMBER = "get ready"
    GREEN = "go"

for light in Light:
    print(light.name, "means", light.value)
# → RED means stop
# → AMBER means get ready
# → GREEN means go
~~~

~~~quiz
? What happens with ~Priority("urgent")~ if the enum only lists LOW and HIGH?
- It returns None
- It adds URGENT to the menu
+ It raises a ValueError
- It returns Priority.HIGH
! An enum is a fixed menu. Anything not on it is rejected, which is exactly what you want for AI output.
~~~

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
print(inv.total)                       # no brackets needed
inv.lines.append(7.5)
print(inv.total)                       # always up to date
print(Invoice.empty().total)
# → 12.5
# → 20.0
# → 0
~~~

A ~@property~ is like the **total line on a calculator receipt**: you don't store it separately, it's worked out from the lines every time you look.

~~~quiz
? Type exactly what this prints:
| class Rect:
|     def __init__(self, w, h):
|         self.w, self.h = w, h
|     @property
|     def area(self):
|         return self.w * self.h
| r = Rect(3, 4)
| r.w = 5
| print(r.area)
= 20
! area is computed when you read it, using the current w (5) and h (4).
~~~

## Inheritance and abstract base classes
A class can **inherit** from another: it gets everything the parent has and can add or change things.

~~~python
class Notifier:
    def send(self, msg: str) -> str:
        return f"[generic] {msg}"

class EmailNotifier(Notifier):          # inherits from Notifier
    def send(self, msg: str) -> str:    # replaces the parent's version
        return f"[email] {msg}"

class SmsNotifier(Notifier):
    pass                                # adds nothing: uses the parent's send

for n in [EmailNotifier(), SmsNotifier()]:
    print(n.send("Your order shipped"))
# → [email] Your order shipped
# → [generic] Your order shipped
~~~

An **abstract base class** is a "contract": a list of methods every child **must** provide.

~~~python
from abc import ABC, abstractmethod

class Model(ABC):
    @abstractmethod
    def complete(self, prompt: str) -> str: ...

class FakeModel(Model):                # a stand-in used in tests: no internet, no cost
    def complete(self, prompt: str) -> str:
        return "billing"

print(FakeModel().complete("refund please"))
try:
    Model()                            # the contract itself can't be used directly
except TypeError as e:
    print("can't create:", type(e).__name__)
# → billing
# → can't create: TypeError
~~~

Like a **job description**: "whoever takes this role must be able to answer the phone". The real model and the fake model both fit the role, so the rest of the code doesn't care which one it gets. This is how the projects test without paying for AI calls.

~~~quiz
? What does this print?
| class Animal:
|     def speak(self):
|         return "..."
| class Cat(Animal):
|     def speak(self):
|         return "meow"
| class Fish(Animal):
|     pass
| print(Cat().speak(), Fish().speak())
+ ~meow ...~
- ~meow meow~
- ~... ...~
- An error: Fish has no speak
! Cat replaces speak with its own version. Fish adds nothing, so it uses Animal's "...".
~~~

## Common mistakes
- Forgetting ~self~ as the first input of a method.
- Using a shared list as a default (~notes: list = []~ in a dataclass). Use ~field(default_factory=list)~.
- Forgetting the brackets when creating an object: ~Ticket~ is the cutter, ~Ticket("hi")~ is a cookie.
- Building deep family trees of classes. The projects keep classes small and flat.

~~~python
class Greeter:
    def hello(self):                   # self is required, even if unused
        return "hi"

print(Greeter().hello())
# class Broken:
#     def hello():                     # forgot self
#         return "hi"
# Broken().hello()
# ✗ TypeError: Broken.hello() takes 0 positional arguments but 1 was given
# → hi
~~~

~~~quiz
? You see ~TypeError: hello() takes 0 positional arguments but 1 was given~ when calling ~obj.hello()~. What's wrong?
+ The method is missing self as its first parameter
- You passed too many arguments in your call
- The class has no __init__
- hello is a reserved word
! Python passes the object itself as the first input automatically. The method needs ~self~ to receive it.
~~~

## How it looks in the projects
Data shapes (tickets, invoices, results) are classes, mostly ~@dataclass~ or Pydantic models (next lesson). The AI client is wrapped in a small class or module so it can be swapped for a **fake** in tests.

~~~python
from dataclasses import dataclass

@dataclass
class Triage:
    label: str
    confidence: float

    @property
    def needs_human(self) -> bool:
        return self.confidence < 0.8

for t in [Triage("billing", 0.95), Triage("bug", 0.55)]:
    print(t.label, "→", "human" if t.needs_human else "auto")
# → billing → auto
# → bug → human
~~~

~~~quiz
? In the code above, what would ~Triage("other", 0.8).needs_human~ be?
- True
+ False
! 0.8 < 0.8 is False (they're equal, not smaller), so it doesn't need a human.
~~~

## Try it in your head

~~~quiz
? **Scenario: a shopping cart object.** Type exactly what this prints:
| class Cart:
|     def __init__(self):
|         self.items = []
|     def add(self, item, price):
|         self.items.append(price)
|     def total(self):
|         return sum(self.items)
| c = Cart()
| c.add("tea", 2)
| c.add("cake", 3.5)
| print(c.total())
= 5.5
! Each add stores a price in this cart's list: 2 + 3.5 = 5.5.
~~~

~~~quiz
? **Scenario: two separate carts.** What does this print?
| class Cart:
|     def __init__(self):
|         self.items = []
| a = Cart()
| b = Cart()
| a.items.append("milk")
| print(len(a.items), len(b.items))
+ ~1 0~
- ~1 1~
- ~0 0~
- ~2 0~
! Each object gets its own fresh list in __init__, so adding to a doesn't touch b.
~~~

~~~quiz
? **Scenario: an order status menu.** Type exactly what this prints:
| from enum import Enum
| class Status(Enum):
|     NEW = 1
|     SHIPPED = 2
| print(Status(2).name)
= SHIPPED
! ~Status(2)~ finds the member whose value is 2, and ~.name~ is its label.
~~~
`,
    practice: [
      { q: "What does self mean inside a method?", a: "The particular object the method was called on. In t.escalate(), self is t." },
      { q: "What does @dataclass save you from writing?", a: "The __init__ method (and a readable print-out and == comparison), for classes that mainly hold data." },
      { q: "Why do the projects define a FakeModel with the same methods as the real one?", a: "So tests can run without internet or cost. Because both follow the same contract, the rest of the code works with either." },
      { q: "Scenario: design a dataclass for a library book with a title, an author and whether it's on loan (default False).", a: "@dataclass\nclass Book:\n    title: str\n    author: str\n    on_loan: bool = False" },
      { q: "When would you use @property instead of storing a value?", a: "When the value can be worked out from other data (like a total from lines), so it's always up to date and never out of sync." },
      { q: "Scenario: a support system only allows the statuses open, pending and closed. Which tool stops anyone using 'done' by mistake?", a: "An Enum (or a Literal type in Pydantic): a fixed menu that rejects anything not listed." },
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

**Scenario: without and with a check.** The AI says the confidence is "very high" (a word, not a number):

~~~python
from pydantic import BaseModel, ValidationError

ai_answer = {"label": "billing", "confidence": "very high"}

# Without a check, the bad value slips through and breaks later:
# print(ai_answer["confidence"] > 0.8)
# ✗ TypeError: '>' not supported between instances of 'str' and 'float'

class Answer(BaseModel):
    label: str
    confidence: float

try:
    Answer(**ai_answer)
except ValidationError:
    print("Rejected at the door: confidence must be a number")
# → Rejected at the door: confidence must be a number
~~~

Catching bad data **at the door** is much better than having it crash something deep inside your program later.

~~~quiz
? What is Pydantic's job, in the form analogy?
+ The clerk who checks every box is filled in correctly and rejects the form if not
- The person who fills in the form
- The filing cabinet
- The pen
! The AI fills in the form; Pydantic checks it against the rules you wrote.
~~~

## Type hints for containers and choices
~~~python
from typing import Literal, Optional

tags: list[str] = ["urgent", "billing"]          # a list of strings
counts: dict[str, int] = {"bug": 3}              # text keys, number values
manager: Optional[str] = None                    # a string OR None
manager2: str | None = None                      # the same thing, newer spelling
Category = Literal["billing", "bug", "praise", "other"]   # only these exact values
print(tags, counts, manager, manager2)
# → ['urgent', 'billing'] {'bug': 3} None None
~~~

| Hint | Means | Example value |
|---|---|---|
| ~list[str]~ | a list of texts | ~["a", "b"]~ |
| ~dict[str, float]~ | text labels → decimal numbers | ~{"tax": 0.2}~ |
| ~Optional[str]~ (newer spelling: str, a bar, None) | text, or nothing | ~None~ |
| ~Literal["yes", "no"]~ | exactly one of these | ~"yes"~ |

~Literal~ is the important one: it turns "any text" into "one of these choices". Like a **multiple-choice question** instead of an open question.

~~~quiz
? Which hint says "either a whole number or nothing"?
- ~list[int]~
+ ~int | None~
- ~Literal[int]~
- ~dict[int, None]~
! ~int | None~ (also written ~Optional[int]~) allows a whole number, or None.
~~~

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
print(ok.category, ok.confidence)
print(ok.summary)
print(ok.model_dump())

try:
    TicketLabel(category="refunds", urgent=True, confidence=1.7)
except ValidationError as e:
    print(len(e.errors()), "problems")
    for err in e.errors():
        print("-", err["loc"][0], ":", err["msg"])
# → bug 0.9
# → None
# → {'category': 'bug', 'urgent': True, 'confidence': 0.9, 'summary': None}
# → 2 problems
# → - category : Input should be 'billing', 'bug', 'praise' or 'other'
# → - confidence : Input should be less than or equal to 1
~~~

~Field(ge=0, le=1)~ adds limits: **g**reater than or **e**qual to 0, **l**ess than or **e**qual to 1.

**Pydantic also tidies values when it safely can** ("coercion"): the text ~"0.75"~ becomes the number 0.75, and ~"yes"~ becomes ~True~.

~~~python
from pydantic import BaseModel

class Reading(BaseModel):
    value: float
    ok: bool

r = Reading(value="0.75", ok="yes")
print(r.value, type(r.value).__name__)
print(r.ok)
# → 0.75 float
# → True
~~~

**Scenario: a missing required box.**

~~~python
from pydantic import BaseModel, ValidationError

class Booking(BaseModel):
    name: str
    guests: int
    notes: str = ""          # has a default, so it's optional

print(Booking(name="Dana", guests=2))
try:
    Booking(name="Sam")
except ValidationError as e:
    print(e.errors()[0]["loc"][0], "->", e.errors()[0]["msg"])
# → name='Dana' guests=2 notes=''
# → guests -> Field required
~~~

~~~quiz
? Using the TicketLabel model above, what happens with ~TicketLabel(category="bug", urgent=False, confidence=-0.2)~?
- It's accepted
- confidence is set to 0
+ A ValidationError: confidence must be at least 0
- category is changed to "other"
! ~Field(ge=0)~ means the value must be greater than or equal to 0. Pydantic rejects it instead of quietly fixing it.
~~~

~~~quiz
? Type exactly what this prints:
| from pydantic import BaseModel
| class Item(BaseModel):
|     qty: int
| print(Item(qty="3").qty * 2)
= 6
! Pydantic safely turns the text "3" into the number 3, so ~* 2~ gives 6 (not "33").
~~~

## Turning JSON into a checked object, and back
~~~python
from typing import Literal
from pydantic import BaseModel

class TicketLabel(BaseModel):
    category: Literal["billing", "bug", "praise", "other"]
    urgent: bool
    confidence: float

raw = '{"category": "billing", "urgent": false, "confidence": 0.8}'
label = TicketLabel.model_validate_json(raw)   # JSON text → checked object (or a ValidationError)
print(label.urgent)
print(label.model_dump_json())                 # object → JSON text
print(TicketLabel.model_validate({"category": "bug", "urgent": True, "confidence": 1}))   # from a dict
# → False
# → {"category":"billing","urgent":false,"confidence":0.8}
# → category='bug' urgent=True confidence=1.0
~~~

**Scenario: the AI wraps its JSON in chatter.** Bad JSON is rejected too:

~~~python
from pydantic import BaseModel, ValidationError

class Mood(BaseModel):
    mood: str

try:
    Mood.model_validate_json('Sure! Here is the JSON: {"mood": "happy"}')
except ValidationError:
    print("not valid JSON: ask the AI again, or use structured outputs")
# → not valid JSON: ask the AI again, or use structured outputs
~~~

~~~quiz
? Which method turns JSON **text** into a checked model object?
+ ~Model.model_validate_json(text)~
- ~Model.model_dump(text)~
- ~json.dumps(text)~
- ~Model(text)~
! ~model_validate_json~ reads JSON text and checks it. ~model_dump~ goes the other way (object → dict).
~~~

## Models inside models
~~~python
from pydantic import BaseModel

class LineItem(BaseModel):
    description: str
    amount: float

class Invoice(BaseModel):
    vendor: str
    lines: list[LineItem]
    total: float

inv = Invoice(vendor="Acme", lines=[{"description": "Paper", "amount": 20}, {"description": "Ink", "amount": 35.5}], total=55.5)
print(inv.lines[0].amount)                     # Pydantic turned 20 into 20.0
print(inv.lines[1].description)
print(sum(l.amount for l in inv.lines) == inv.total)
# → 20.0
# → Ink
# → True
~~~

Notice that the lines were given as plain dicts, and Pydantic turned each into a checked ~LineItem~. You read nested models with dots: ~inv.lines[1].description~.

~~~quiz
? Using the Invoice model above, how do you read the vendor of ~inv~?
+ ~inv.vendor~
- ~inv["vendor"]~
- ~inv.lines.vendor~
- ~Invoice.vendor~
! Pydantic objects use dots for their fields. (~inv.model_dump()["vendor"]~ would also work, but dots are normal.)
~~~

## Why this matters so much
In the projects you hand the model class straight to the AI library. The library asks the AI to fill in exactly that form and gives you back a checked object:

~~~python
# (needs an API key to run; shape from the projects)
# response = client.messages.parse(model=MODEL, max_tokens=500, messages=[...], output_format=TicketLabel)
# label = response.parsed_output          # a TicketLabel, already checked
# print(label)
# → category='billing' urgent=True confidence=0.93 summary=None   (example output)
~~~

The schema guarantees the **shape** of the answer, not that it's **true**. That's why projects add their own checks afterwards (does the invoice add up?).

~~~python
from pydantic import BaseModel

class Invoice(BaseModel):
    lines: list[float]
    total: float

inv = Invoice(lines=[10, 5], total=99)        # the shape is fine...
print("shape ok:", isinstance(inv, Invoice))
print("adds up:", abs(sum(inv.lines) - inv.total) < 0.01)   # ...but the meaning is wrong
# → shape ok: True
# → adds up: False
~~~

~~~quiz
? The AI returns a perfectly valid ~Invoice~ object. Does that mean the numbers are right?
- Yes, Pydantic checked them
+ No: it only means every box has the right type and limits; you still check the meaning (like the total adding up)
- Only if confidence is above 0.8
! Shape and truth are different. A form can be filled in neatly and still contain wrong numbers.
~~~

## Common mistakes
- Using ~str~ when you mean a fixed choice. Use ~Literal[...]~, so the AI can't invent new categories.
- Forgetting that ~Optional~ fields still need a default (~= None~) if they may be left out.
- Treating a valid schema as a correct answer. Validate the meaning too.

~~~python
from pydantic import BaseModel, ValidationError

class A(BaseModel):
    note: str | None              # may be None... but must still be given!

try:
    A()
except ValidationError as e:
    print(e.errors()[0]["msg"])
print(A(note=None))

class B(BaseModel):
    note: str | None = None       # may be left out entirely
print(B())
# → Field required
# → note=None
# → note=None
~~~

~~~quiz
? You want a field that the AI may leave out completely. Which line is right?
- ~summary: str | None~
+ ~summary: str | None = None~
- ~summary: Optional~
- ~summary = None: str~
! Without the ~= None~ default, the field is still required (it just may be None). The default makes it truly optional.
~~~

## How it looks in the projects
Nearly every project has a ~schemas.py~ full of these models. They're the contract between the **probabilistic** AI and your **deterministic** code.

~~~python
from typing import Literal
from pydantic import BaseModel, Field

class ReviewInsight(BaseModel):
    sentiment: Literal["positive", "neutral", "negative"]
    topics: list[str] = Field(default_factory=list, max_length=3)
    stars: int = Field(ge=1, le=5)

r = ReviewInsight.model_validate_json('{"sentiment": "negative", "topics": ["delivery"], "stars": 2}')
print(r.sentiment, r.topics, r.stars)
print("alert the team" if r.sentiment == "negative" and r.stars <= 2 else "fine")
# → negative ['delivery'] 2
# → alert the team
~~~

~~~quiz
? In ~ReviewInsight~ above, what happens if the AI returns ~"stars": 7~?
- It's rounded to 5
+ A ValidationError: stars must be at most 5
- It's accepted
- stars becomes None
! ~Field(ge=1, le=5)~ limits stars to 1–5. Anything outside is rejected.
~~~

## Try it in your head

~~~quiz
? **Scenario: a sign-up form.** Type exactly what this prints:
| from pydantic import BaseModel
| class User(BaseModel):
|     name: str
|     age: int
|     newsletter: bool = False
| u = User(name="Leo", age="40")
| print(u.age + 1, u.newsletter)
= 41 False
! "40" is safely turned into 40, so +1 gives 41. newsletter wasn't given, so it uses its default False.
~~~

~~~quiz
? **Scenario: a mood tracker.** What happens here?
| from typing import Literal
| from pydantic import BaseModel
| class Day(BaseModel):
|     mood: Literal["good", "ok", "bad"]
| Day(mood="great")
| # (skip: raises an error)
+ A ValidationError, because "great" isn't one of the allowed choices
- mood is set to "good"
- It's accepted
- mood becomes None
! Literal only allows the listed words. "great" isn't on the list.
~~~

~~~quiz
? **Scenario: reading nested data.** Type exactly what this prints:
| from pydantic import BaseModel
| class Stop(BaseModel):
|     city: str
| class Trip(BaseModel):
|     stops: list[Stop]
| t = Trip(stops=[{"city": "Paris"}, {"city": "Rome"}])
| print(t.stops[-1].city)
= Rome
! stops is a list of Stop objects; [-1] is the last one, and .city reads its city.
~~~
`,
    practice: [
      { q: "Why use Literal[\"billing\", \"bug\", \"other\"] instead of str for a category?", a: "So only those exact values are allowed. The AI can't invent a new category, and your routing code can rely on the list." },
      { q: "What happens if you create a Pydantic model with a value that breaks the rules?", a: "It raises a ValidationError listing every problem, instead of quietly accepting bad data." },
      { q: "The AI returns a valid TicketLabel. Does that mean the label is correct?", a: "No. It means the answer has the right shape. Whether it's right is checked by evaluation and extra validation rules." },
      { q: "Scenario: design a model for a restaurant booking: a name, a number of guests between 1 and 12, and an optional note.", a: "class Booking(BaseModel):\n    name: str\n    guests: int = Field(ge=1, le=12)\n    note: str | None = None" },
      { q: "What do model_dump() and model_validate_json() do?", a: "model_dump() turns a model object into a plain dict. model_validate_json() reads JSON text and turns it into a checked model object." },
      { q: "Scenario: Pydantic receives guests=\"4\" for an int field. What happens, and why is that useful?", a: "It safely converts \"4\" to the number 4. Data from forms and AI often arrives as text, so this saves you converting by hand." },
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

**First, a key fact: functions can be passed around like any other value.**

~~~python
def shout(text):
    return text.upper() + "!"

def apply_twice(fn, value):        # fn is a function given as an input
    return fn(fn(value))

loud = shout                       # no brackets: we're passing the function itself
print(loud("hi"))
print(apply_twice(shout, "hey"))
# → HI!
# → HEY!!
~~~

That's all a decorator is: a function that **takes a function and gives back a new, improved function**.

~~~quiz
? What's the difference between ~shout~ and ~shout("hi")~?
+ ~shout~ is the function itself; ~shout("hi")~ runs it and gives the result
- They are the same
- ~shout~ runs it twice
- ~shout("hi")~ creates a new function
! Without brackets you're holding the recipe card; with brackets you're cooking.
~~~

## A home-made decorator
~~~python
from functools import wraps

def announce(fn):
    @wraps(fn)                         # keeps the original function's name and docstring
    def wrapper(*args, **kwargs):      # accept any inputs and pass them through
        print(f"→ calling {fn.__name__}{args}")
        result = fn(*args, **kwargs)
        print(f"← {fn.__name__} returned {result}")
        return result
    return wrapper

@announce
def add(a, b):
    return a + b

total = add(2, 3)
print("total is", total)
# → → calling add(2, 3)
# → ← add returned 5
# → total is 5
~~~

~@announce~ above ~add~ is just short for ~add = announce(add)~. ~*args~ means "any number of plain inputs" and ~**kwargs~ means "any number of named inputs".

**Scenario: a stopwatch decorator** that times any function:

~~~python
import time
from functools import wraps

def timed(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = fn(*args, **kwargs)
        print(f"{fn.__name__} took {time.perf_counter() - start:.1f}s")
        return result
    return wrapper

@timed
def slow_add(a, b):
    time.sleep(0.1)
    return a + b

print(slow_add(2, 3))
# → slow_add took 0.1s
# → 5
~~~

**Scenario: a bouncer decorator** that refuses bad inputs before the function even runs:

~~~python
from functools import wraps

def positive_only(fn):
    @wraps(fn)
    def wrapper(amount):
        if amount <= 0:
            return "refused: amount must be positive"
        return fn(amount)
    return wrapper

@positive_only
def refund(amount):
    return f"refunded £{amount}"

print(refund(20))
print(refund(-5))
# → refunded £20
# → refused: amount must be positive
~~~

You will rarely *write* decorators. You need to **recognise** them.

**What *args and **kwargs collect:**

~~~python
def show(*args, **kwargs):
    print("args:", args)
    print("kwargs:", kwargs)

show(1, 2, color="red", size="M")
# → args: (1, 2)
# → kwargs: {'color': 'red', 'size': 'M'}
~~~

~~~quiz
? ~@logged~ written above ~def pay(): ...~ is short for which line?
+ ~pay = logged(pay)~
- ~logged = pay(logged)~
- ~pay = logged()~
- ~pay(logged)~
! The decorator receives the function and its result replaces the original name.
~~~

~~~quiz
? What is the **first** line this prints?
| def loud(fn):
|     def wrapper():
|         print("before")
|         fn()
|         print("after")
|     return wrapper
| @loud
| def hello():
|     print("hello")
| hello()
+ ~before~
- ~hello~
- ~after~
- Nothing
! The wrapper runs: it prints "before", then calls the real hello ("hello"), then prints "after".
~~~

~~~quiz
? Type exactly what the second line prints:
| def show(*args, **kwargs):
|     print(len(args))
|     print(sorted(kwargs))
| show(1, 2, 3, a=1, b=2)
= ['a', 'b']
! args collects the three plain inputs (len 3). kwargs is a dict of named inputs; sorted() lists its keys.
~~~

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
# (shape only, from the projects; needs the anthropic package)
# @beta_tool
# def get_order_status(order_id: str) -> str:
#     """Look up the shipping status of one order."""
#     return lookup(order_id)
#
# The AI sees a tool called "get_order_status" described as
# "Look up the shipping status of one order." and can ask to call it:
# → get_order_status(order_id="A-7781") returned "shipped"   (example)
~~~

**A home-made version of the same idea**: a decorator that collects functions into a "tool box" by name, which is roughly what tool decorators do:

~~~python
TOOLS = {}

def tool(fn):
    TOOLS[fn.__name__] = fn            # register it, then give it back unchanged
    return fn

@tool
def get_weather(city: str) -> str:
    """Today's weather in a city."""
    return f"Sunny in {city}"

@tool
def get_time(city: str) -> str:
    """The local time in a city."""
    return f"09:00 in {city}"

print(list(TOOLS))
print(TOOLS["get_weather"].__doc__)
print(TOOLS["get_time"]("Oslo"))
# → ['get_weather', 'get_time']
# → Today's weather in a city.
# → 09:00 in Oslo
~~~

~~~quiz
? In the tool-box example, what does the ~@tool~ decorator do to each function?
+ Records it in the TOOLS dict by name, and leaves the function itself unchanged
- Runs the function immediately
- Deletes the docstring
- Makes the function return None
! It registers the function and hands it straight back, like signing someone into a visitors' book.
~~~

## Common mistakes
- Thinking the decorator changes what the function *does*. It adds something around it; the body still runs the same.
- Forgetting the brackets on decorators that need them: ~@mcp.tool()~ vs ~@dataclass~. Copy the project's spelling exactly.
- Writing a wrapper that forgets to ~return~ the result, so the decorated function suddenly returns ~None~.

~~~python
def broken(fn):
    def wrapper(*args):
        fn(*args)                      # forgot "return"!
    return wrapper

@broken
def double(x):
    return x * 2

print(double(4))
# → None
~~~

~~~quiz
? In the broken example, why does ~double(4)~ give None?
+ The wrapper calls the function but never returns its result
- double has no return
- Decorators always return None
- 4 is not allowed
! The wrapper must ~return fn(*args)~, otherwise the result is thrown away.
~~~

## How it looks in the projects
Every time you see ~@something~, ask: "what extra ability does this give the function below?" The project's "Python used here" notes always tell you.

~~~python
from functools import wraps

def retry(times: int):                 # a decorator that takes a setting: note the extra layer
    def decorate(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except ConnectionError:
                    print(f"attempt {attempt} failed")
            return "gave up"
        return wrapper
    return decorate

calls = []
@retry(times=3)
def fetch():
    calls.append(1)
    if len(calls) < 2:
        raise ConnectionError
    return "data"

print(fetch())
# → attempt 1 failed
# → data
~~~

That's why some decorators have brackets: ~@retry(times=3)~ first *makes* a decorator with your setting, then applies it.

~~~quiz
? Why does ~@retry(times=3)~ have brackets but ~@dataclass~ doesn't?
+ retry takes a setting, so retry(times=3) first builds the decorator, which is then applied
- Brackets are optional on every decorator
- dataclass is broken
- Brackets make it run three times
! Decorators with settings are "decorator factories": calling them with the setting gives back the actual decorator.
~~~

## Try it in your head

~~~quiz
? **Scenario: a polite decorator.** Type exactly what this prints:
| def polite(fn):
|     def wrapper(name):
|         return "Please, " + fn(name)
|     return wrapper
| @polite
| def order(name):
|     return f"{name}, take a seat"
| print(order("Sam"))
= Please, Sam, take a seat
! The wrapper calls the real order ("Sam, take a seat") and adds "Please, " in front.
~~~

~~~quiz
? **Scenario: a call counter.** What does this print?
| count = {"n": 0}
| def counted(fn):
|     def wrapper():
|         count["n"] += 1
|         return fn()
|     return wrapper
| @counted
| def ping():
|     return "pong"
| ping(); ping(); ping()
| print(count["n"])
+ ~3~
- ~1~
- ~0~
- ~pong~
! Every call goes through the wrapper, which adds 1 each time.
~~~

~~~quiz
? **Scenario: a gatekeeper.** Type exactly what this prints:
| def admins_only(fn):
|     def wrapper(user):
|         if user != "admin":
|             return "access denied"
|         return fn(user)
|     return wrapper
| @admins_only
| def delete_all(user):
|     return "deleted"
| print(delete_all("guest"))
= access denied
! The wrapper checks the user first. "guest" isn't "admin", so the real function never runs.
~~~
`,
    practice: [
      { q: "What is @timed above def f(): ... short for?", a: "f = timed(f) — the function is passed to the decorator, and the wrapped version replaces it." },
      { q: "In the projects, what does @beta_tool do to a function?", a: "It turns it into a tool the AI model can ask to call. The function's name, type hints and docstring describe the tool to the AI." },
      { q: "What do *args and **kwargs mean in a function definition?", a: "Accept any number of plain inputs (*args, a tuple) and any number of named inputs (**kwargs, a dict)." },
      { q: "Scenario: you want every AI call logged with how long it took, without editing each function. What would you use?", a: "A decorator (like @timed) placed above each function: it wraps the function with timing and logging, leaving the body unchanged." },
      { q: "Why do decorators use @wraps(fn)?", a: "So the wrapped function keeps its original name and docstring. That matters for tools, where the AI reads the name and docstring." },
      { q: "Scenario: a decorated function suddenly returns None. What's the first thing to check in the decorator?", a: "That the wrapper returns the result: return fn(*args, **kwargs)." },
    ],
  },
);
