/*
 * Python toolkit lessons 13–15. See the header of content/python.js for the authoring rules
 * (every code block shows its output in "# →" comments; every "## " part ends with a ~~~quiz).
 */
window.PYTHON_LESSONS.push(
  {
    id: "async",
    title: "13. Async and parallel work: doing many waits at once",
    summary: "async/await and thread pools: how projects make hundreds of slow AI calls without waiting for each one in turn.",
    features: ["async", "threads"],
    body: md`
## The idea
An AI call takes a second or more, and most of that time your program is just **waiting** for the answer. If you have 500 reviews to classify, waiting for each one in turn takes ages.

**Async** lets one program start many waits at once. Think of a **chef with several pots**: put pasta on, and while it boils, chop vegetables, then stir the sauce. They don't stand staring at one pot.

**Scenario: three 1-second jobs, one after another.** This is the slow way:

~~~python
import time

def classify(text: str) -> str:
    time.sleep(1)                          # pretend this is a 1-second AI call
    return "bug" if "crash" in text else "other"

start = time.perf_counter()
results = [classify(t) for t in ["app crash", "hello", "crash on login"]]
print(results)
print(f"took {time.perf_counter() - start:.0f}s")
# → ['bug', 'other', 'bug']
# → took 3s
~~~

Three jobs × 1 second = 3 seconds. With 500 jobs it would be over 8 minutes. The next part shows how to do it in about 1 second.

~~~quiz
? 60 AI calls take 2 seconds each and run one after another. Roughly how long does the whole job take?
- 2 seconds
- 60 seconds
+ 120 seconds (2 minutes)
- 30 seconds
! One after another means the waits add up: 60 × 2 = 120 seconds. Running them at the same time could bring that close to 2 seconds.
~~~

## async and await
~~~python
import asyncio, time

async def classify(text: str) -> str:     # "async def" = this function may wait
    await asyncio.sleep(1)                 # "await" = wait here, and let other work run meanwhile
    return "bug" if "crash" in text else "other"

async def main():
    texts = ["app crash", "hello", "crash on login"]
    start = time.perf_counter()
    results = await asyncio.gather(*(classify(t) for t in texts))   # run all at once
    print(results)
    print(f"took {time.perf_counter() - start:.0f}s")

asyncio.run(main())                        # start the async world from normal code
# → ['bug', 'other', 'bug']
# → took 1s
~~~

Same answers, a third of the time. ~asyncio.gather~ starts every job, waits for them all, and gives back the results **in the same order** you asked.

Three rules cover almost everything:
1. ~async def~ makes a function that can wait.
2. Inside it, put ~await~ in front of anything slow.
3. ~asyncio.run(main())~ starts it all from ordinary code.

**Scenario: watching the order things happen.** Jobs start together and finish when their own wait is over:

~~~python
import asyncio

async def cook(dish: str, minutes: float) -> str:
    print(f"start {dish}")
    await asyncio.sleep(minutes / 10)      # (shortened: a tenth of a second per "minute")
    print(f"done {dish}")
    return dish

async def main():
    served = await asyncio.gather(cook("pasta", 3), cook("salad", 1), cook("sauce", 2))
    print("served in order:", served)

asyncio.run(main())
# → start pasta
# → start salad
# → start sauce
# → done salad
# → done sauce
# → done pasta
# → served in order: ['pasta', 'salad', 'sauce']
~~~

The salad finishes first because it's quickest, but ~gather~ still hands back the results in the order you listed them.

~~~quiz
? Type exactly what this prints:
| import asyncio
| async def double(n):
|     await asyncio.sleep(0.1)
|     return n * 2
| async def main():
|     print(await asyncio.gather(double(1), double(5)))
| asyncio.run(main())
= [2, 10]
! Both run at the same time; gather returns their results in the order they were listed.
~~~

~~~quiz
? Five async jobs take 1, 2, 3, 4 and 5 seconds and run together with ~gather~. Roughly how long until all are done?
- 15 seconds
+ 5 seconds
- 1 second
- 3 seconds
! Running together, you wait for the slowest one: about 5 seconds (not 1+2+3+4+5 = 15).
~~~

## Not too many at once: a semaphore
AI services have **rate limits** (a maximum number of requests per minute). A **semaphore** caps how many calls run at the same time:

~~~python
import asyncio

limit = asyncio.Semaphore(2)               # at most 2 at a time
running = 0

async def polite_classify(n: int) -> int:
    global running
    async with limit:                      # wait for a free slot
        running += 1
        print(f"job {n} started ({running} running)")
        await asyncio.sleep(0.1)
        running -= 1
        return n

async def main():
    await asyncio.gather(*(polite_classify(n) for n in range(1, 5)))
    print("all done")

asyncio.run(main())
# → job 1 started (1 running)
# → job 2 started (2 running)
# → job 3 started (1 running)
# → job 4 started (2 running)
# → all done
~~~

Never more than 2 running. Like a **shop that lets in 2 customers at a time**: everyone gets served, the shop never overflows.

~~~quiz
? With ~Semaphore(5)~ around each call, and 100 calls started with gather, what's the most that run at the same moment?
- 100
+ 5
- 1
- 20
! The semaphore is a fixed number of "slots". The other 95 wait their turn.
~~~

## Threads: the non-async way
Some code isn't async (lots of libraries are ordinary functions). A **thread pool** runs ordinary functions side by side, like hiring a few helpers:

~~~python
import time
from concurrent.futures import ThreadPoolExecutor

def slow_square(n: int) -> int:
    time.sleep(0.5)                        # pretend it's a slow call
    return n * n

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=4) as pool:
    print(list(pool.map(slow_square, [1, 2, 3, 4])))
print(f"took about {time.perf_counter() - start:.1f}s")
# → [1, 4, 9, 16]
# → took about 0.5s
~~~

Four helpers, four jobs of half a second each: all done in about half a second instead of two. ~max_workers~ is the cap, the same job a semaphore does for async code.

~~~quiz
? Type exactly what this prints:
| from concurrent.futures import ThreadPoolExecutor
| with ThreadPoolExecutor(max_workers=2) as pool:
|     print(list(pool.map(len, ["a", "abc", "ab"])))
= [1, 3, 2]
! pool.map runs len on each item (in parallel) and gives back the results in the original order.
~~~

## Common mistakes
- Calling an async function without ~await~. You get a "coroutine" object (a promise of work) instead of the result.
- Using ~time.sleep~ inside async code. It freezes everything; use ~await asyncio.sleep~.
- Launching thousands of calls at once and hitting rate limits. Always cap with a semaphore or ~max_workers~.

~~~python
import asyncio

async def get_answer() -> str:
    return "42"

async def main():
    wrong = get_answer()                   # forgot await
    print(type(wrong).__name__)
    right = await wrong                    # awaiting it gives the real answer
    print(right)

asyncio.run(main())
# → coroutine
# → 42
~~~

~~~quiz
? Inside async code you see ~<coroutine object fetch at 0x...>~ printed instead of data. What's missing?
+ ~await~ before the call
- ~async~ before print
- A semaphore
- ~asyncio.run~ around print
! Calling an async function only creates the "promise of work". ~await~ actually runs it and gives you the result.
~~~

## How it looks in the projects
Batch jobs and evals run many AI calls in parallel with a cap. For really big overnight jobs, B03 uses the **Batches API** instead: you upload all the requests at once and collect the answers later, at half the price.

~~~python
import asyncio

limit = asyncio.Semaphore(10)

async def fake_ai_label(review: str) -> str:   # stands in for a real AI call
    async with limit:
        await asyncio.sleep(0.05)
        return "negative" if "bad" in review else "positive"

async def label_all(reviews: list[str]) -> list[str]:
    return await asyncio.gather(*(fake_ai_label(r) for r in reviews))

reviews = ["bad service", "lovely", "bad food", "great"]
labels = asyncio.run(label_all(reviews))
for r, l in zip(reviews, labels):
    print(f"{l:<8} {r}")
# → negative bad service
# → positive lovely
# → negative bad food
# → positive great
~~~

~~~quiz
? Why does the project code wrap each call in ~async with limit:~?
+ To stay under the AI service's rate limit by capping how many calls run at once
- To make each call return faster
- To sort the results
- Because async code requires it
! Without the cap, hundreds of calls would fire at once and the service would answer "429: too many requests".
~~~

## Try it in your head

~~~quiz
? **Scenario: downloading 10 files.** Each takes 3 seconds. With a thread pool of ~max_workers=5~, roughly how long does it take?
- 3 seconds
+ 6 seconds
- 30 seconds
- 15 seconds
! 5 run at once (3s), then the next 5 (another 3s): about 6 seconds.
~~~

~~~quiz
? **Scenario: gather order.** Type exactly what this prints:
| import asyncio
| async def job(name, delay):
|     await asyncio.sleep(delay)
|     return name
| async def main():
|     print(await asyncio.gather(job("slow", 0.2), job("fast", 0.1)))
| asyncio.run(main())
= ['slow', 'fast']
! "fast" finishes first, but gather always returns results in the order you listed the jobs.
~~~

~~~quiz
? **Scenario: the frozen kitchen.** Why is ~time.sleep(5)~ inside an ~async def~ a problem?
+ It blocks everything: no other job can run during those 5 seconds
- It sleeps for 5 minutes instead
- It raises an error immediately
- It's fine, it works the same as asyncio.sleep
! time.sleep freezes the whole program. ~await asyncio.sleep(5)~ waits politely and lets other jobs run.
~~~
`,
    practice: [
      { q: "What does await mean, in plain words?", a: "Wait here for this slow thing, and let other work run in the meantime." },
      { q: "Why add a Semaphore(5) around AI calls?", a: "To limit how many run at the same time, so you stay under the service's rate limit." },
      { q: "You call result = classify(\"hi\") on an async function and get a strange object. What's missing?", a: "await — inside async code it should be result = await classify(\"hi\")." },
      { q: "Scenario: you must classify 1,000 reviews. Each AI call takes 2 seconds, and the service allows 20 at a time. Roughly how long with a Semaphore(20)?", a: "1,000 ÷ 20 = 50 rounds × 2 seconds = about 100 seconds, instead of 2,000 seconds one by one." },
      { q: "Does asyncio.gather return results in the order they finish, or the order you listed them?", a: "The order you listed them, whatever order they finish in." },
      { q: "When would you use a ThreadPoolExecutor instead of async?", a: "When the slow functions are ordinary (not async), for example a library without async support." },
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

The heart of every test is ~assert~: "this must be true". If it is, nothing happens. If it isn't, Python raises an ~AssertionError~.

~~~python
total = 2 + 2
assert total == 4                     # true: nothing happens, the program carries on
print("first check passed")
try:
    assert total == 5, "maths is broken"   # false: raises an error with your message
except AssertionError as e:
    print("check failed:", e)
# → first check passed
# → check failed: maths is broken
~~~

~~~quiz
? What happens when ~assert price > 0~ runs and price is 10?
+ Nothing: the check passes and the program carries on
- It prints True
- It raises an AssertionError
- It sets price to 0
! assert stays silent when the statement is true. It only complains when it's false.
~~~

## Your first test
Put tests in files named ~test_*.py~, in functions named ~test_*~. Inside, ~assert~ states what must be true. Then run ~pytest~, which finds and runs them all.

~~~python
# (pytest)  test_routing.py
def route(category: str) -> str:
    return {"billing": "finance", "bug": "engineering"}.get(category, "general")

def test_billing_goes_to_finance():
    assert route("billing") == "finance"

def test_unknown_goes_to_general():
    assert route("spaceships") == "general"

# Running "pytest -q" prints a dot per passing test, then a summary:
# → ..  [100%]
# → 2 passed in 0.01s
~~~

**Scenario: a test fails.** Someone changes the routing table by mistake, and pytest shows exactly what's wrong:

~~~bash
pytest -q
# → .F                                                          [ 50%]
# → ================================ FAILURES ================================
# → ______________________ test_billing_goes_to_finance ______________________
# →     def test_billing_goes_to_finance():
# → >       assert route("billing") == "finance"
# → E       AssertionError: assert 'accounts' == 'finance'
# → 1 failed, 1 passed in 0.03s
~~~

Read it from the bottom: **1 failed**. The ~E~ line says what happened: the function returned ~'accounts'~ but the test expected ~'finance'~. An ~F~ in the dots line marks the failure, a ~.~ marks a pass.

~~~quiz
? pytest prints ~..F.~ at the top. What does it mean?
+ 4 tests ran: the third failed, the others passed
- 3 tests passed and 1 was skipped
- The tests haven't run yet
- 4 tests failed
! Each dot is a pass, each F is a failure, in the order the tests ran.
~~~

~~~quiz
? Which function will pytest **not** run as a test?
- ~def test_total():~
- ~def test_empty_cart():~
+ ~def check_total():~
- ~def test_refund_limit():~
! pytest only collects functions whose names start with ~test~ (in files named ~test_*.py~).
~~~

## Checking that errors happen
Sometimes the *right* behaviour is an error. ~pytest.raises~ checks that it happens:

~~~python
# (pytest)
import pytest

def parse_amount(text: str) -> float:
    return float(text.replace("$", ""))

def test_good_amount():
    assert parse_amount("$10") == 10.0

def test_bad_amount_raises():
    with pytest.raises(ValueError):    # passes only if a ValueError happens inside
        parse_amount("lots")

# → ..  [100%]
# → 2 passed in 0.01s
~~~

Like a fire drill: you *want* the alarm to go off, and the test fails if it doesn't.

~~~quiz
? A test uses ~with pytest.raises(ValueError): int("12")~. Does it pass?
- Yes
+ No: int("12") works fine, so no ValueError happens and the test fails
! pytest.raises passes only when the error actually happens inside the block.
~~~

## Many cases, one test: parametrize
~~~python
# (pytest)
import pytest

def parse_amount(text: str) -> float:
    return float(text.replace("$", "").replace(",", ""))

@pytest.mark.parametrize("text,expected", [
    ("$10", 10.0),
    ("3.5", 3.5),
    ("$0", 0.0),
    ("$1,200", 1200.0),
])
def test_parse_amount(text, expected):
    assert parse_amount(text) == expected

# One test function, four cases: four dots.
# → ....  [100%]
# → 4 passed in 0.01s
~~~

Like a teacher marking a whole column of sums with one answer sheet: the same check, run on every row.

~~~quiz
? A parametrize list has 6 rows. How many test results does pytest report for that function?
- 1
+ 6
- 2
- 12
! Each row runs the test once, so 6 results (6 dots if all pass).
~~~

## Testing AI code without calling the AI: fakes
Real AI calls cost money, need the internet, and give slightly different answers each time. So **unit tests** swap in a **fake** model that returns fixed answers (remember ~FakeModel~ from lesson 10):

~~~python
# (pytest)
class FakeModel:
    def __init__(self, answer: str):
        self.answer = answer
    def complete(self, prompt: str) -> str:
        return self.answer

def triage(text: str, model) -> str:
    label = model.complete(text)
    return "human" if label not in {"billing", "bug"} else label

def test_known_label_is_used():
    assert triage("refund please", FakeModel("billing")) == "billing"

def test_unexpected_label_goes_to_human():
    assert triage("???", FakeModel("aliens")) == "human"

# → ..  [100%]
# → 2 passed in 0.01s
~~~

Like a **flight simulator**: pilots practise emergencies without risking a real plane. Here we can "make" the AI say something silly ("aliens") on purpose and check our code handles it.

~~~quiz
? Why does the test above use ~FakeModel("aliens")~?
+ To check that an unexpected AI answer is safely sent to a human
- Because the real AI only answers "aliens"
- To make the test slower
- Because fakes are more accurate than real models
! A fake lets you create the exact awkward situation you want to test, for free, every time.
~~~

## Tests vs evals
- **Tests** check your plain code: exact, fast, pass or fail.
- **Evals** check the AI's quality on many real examples: a score, like "92% correct".

~~~python
# A tiny eval: a score, not pass/fail (a fake stands in for the AI here)
golden = [("refund please", "billing"), ("app crashed", "bug"), ("love it", "praise"), ("charged twice", "billing")]

def fake_ai(text: str) -> str:
    return "billing" if "refund" in text or "charged" in text else "bug"

correct = sum(fake_ai(text) == label for text, label in golden)
print(f"{correct}/{len(golden)} correct = {correct / len(golden):.0%}")
# → 3/4 correct = 75%
~~~

The projects use both: tests with fakes for the code around the AI, evals with real calls for the AI itself.

~~~quiz
? "Our classifier got 412 of 450 examples right." Is that a test or an eval?
- A test
+ An eval
! It's a quality score over many examples. A test would be a simple pass/fail check of exact code behaviour.
~~~

## Common mistakes
- Only testing the happy path. Test the weird inputs too: empty text, huge text, wrong types.
- Tests that call the real AI. They become slow, costly and flaky. Use fakes in tests, and real calls in evals.
- Naming the file ~routing_test.py~ or the function ~check_x~: pytest won't find them.

~~~python
# (pytest)
def word_count(text: str) -> int:
    return len(text.split())

def test_normal():
    assert word_count("hello big world") == 3

def test_empty():                       # the weird inputs
    assert word_count("") == 0

def test_extra_spaces():
    assert word_count("  hello   world  ") == 2

# → ...  [100%]
# → 3 passed in 0.01s
~~~

~~~quiz
? You wrote tests but ~pytest~ says ~no tests ran~. What is the most likely reason?
+ The file or functions aren't named test_*
- pytest is broken
- Your tests are all correct
- You need an API key
! pytest only looks in files named ~test_*.py~ and runs functions named ~test_*~.
~~~

## How it looks in the projects
Every project has a ~tests/~ folder and an ~eval.py~. Lessons 1–14 are all you need to read both.

~~~bash
pytest -q tests/
# → ........                                                      [100%]
# → 8 passed in 0.12s

python3 eval.py
# → accuracy 0.93 on 60 golden cases (target 0.90): PASS
~~~

~~~quiz
? A project's tests all pass, but ~eval.py~ says accuracy dropped from 0.93 to 0.71. What does that tell you?
+ The plain code works, but the AI's answers got worse (maybe a prompt or model change)
- The tests are broken
- Nothing: only tests matter
- The eval must be wrong because the tests pass
! Tests and evals check different things. Passing tests mean the code around the AI is fine; the eval says the AI's quality dropped.
~~~

## Try it in your head

~~~quiz
? **Scenario: a discount function.** This test file runs with pytest. How many tests pass?
| def discount(total):
|     return total * 0.9 if total >= 100 else total
| def test_big():
|     assert discount(200) == 180
| def test_small():
|     assert discount(50) == 50
| def test_edge():
|     assert discount(100) == 100
| # (skip: run with pytest)
- 3
+ 2
- 1
- 0
! discount(100) gives 90.0 (100 qualifies for the discount), so test_edge fails. The other two pass.
~~~

~~~quiz
? **Scenario: assert messages.** Type exactly what this prints:
| try:
|     assert len("hi") == 3, "expected 3 letters"
| except AssertionError as e:
|     print(e)
= expected 3 letters
! "hi" has 2 letters, so the assert fails and its message is printed.
~~~

~~~quiz
? **Scenario: a fake weather service.** Type exactly what this prints:
| class FakeWeather:
|     def today(self):
|         return "rain"
| def advice(service):
|     return "umbrella" if service.today() == "rain" else "sunglasses"
| print(advice(FakeWeather()))
= umbrella
! The fake always says "rain", so the advice is "umbrella". That's how you test advice() without a real weather service.
~~~
`,
    practice: [
      { q: "What must test files and test functions be named for pytest to find them?", a: "Files test_*.py and functions test_*." },
      { q: "Why use a fake model in unit tests?", a: "Tests become fast, free, work offline and give the same answer every time, so they test your code rather than the AI's mood." },
      { q: "What's the difference between a test and an eval?", a: "A test checks code exactly (pass/fail). An eval measures the AI's quality on many examples and gives a score." },
      { q: "Scenario: write a test that checks add(2, 3) returns 5.", a: "def test_add():\n    assert add(2, 3) == 5" },
      { q: "Scenario: parse_date(\"not a date\") should raise ValueError. How do you test that?", a: "with pytest.raises(ValueError):\n    parse_date(\"not a date\")" },
      { q: "pytest prints .F.. and '1 failed, 3 passed'. Where do you look to understand the failure?", a: "The FAILURES section: the line starting with E shows what was expected and what actually came back, and the > line shows which assert failed." },
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

**Scenario: what actually travels.** The request and the response are both just JSON text:

~~~python
import json

request = {"model": "claude-haiku-4-5", "max_tokens": 50,
           "messages": [{"role": "user", "content": "Say hi in French"}]}
print(json.dumps(request))

response_text = '{"content": [{"type": "text", "text": "Bonjour !"}], "usage": {"input_tokens": 12, "output_tokens": 5}}'
response = json.loads(response_text)
print(response["content"][0]["text"])
print(response["usage"]["output_tokens"], "tokens written")
# → {"model": "claude-haiku-4-5", "max_tokens": 50, "messages": [{"role": "user", "content": "Say hi in French"}]}
# → Bonjour !
# → 5 tokens written
~~~

Everything from lessons 4 (dicts and lists) and 8 (json) comes together here.

~~~quiz
? In the restaurant analogy, what is the API **response**?
- The order slip you hand over
+ The tray with your food and the receipt that comes back
- The kitchen
- The menu
! The request is your order slip; the response is what comes back (the answer, plus a "receipt" of tokens used).
~~~

## A raw HTTP request (so you know what's underneath)
~~~python
# (needs the httpx package and a real service; shape only)
# import httpx
# r = httpx.get("https://api.example.com/orders/123", headers={"Authorization": "Bearer KEY"}, timeout=10)
# print(r.status_code)
# print(r.json())
# → 200
# → {'id': '123', 'status': 'shipped'}   (example output)
~~~

**Status codes** are like delivery notes: 200 "delivered", 404 "address not found", 429 "too many orders, slow down" (a **rate limit**), 500 "the kitchen had a problem".

~~~python
def what_to_do(status: int) -> str:
    if 200 <= status < 300:
        return "success: read the answer"
    if status == 429:
        return "rate limited: wait, then retry"
    if 400 <= status < 500:
        return "our mistake: fix the request, don't retry"
    return "their problem: retry a few times"

for code in [200, 404, 429, 503]:
    print(code, "→", what_to_do(code))
# → 200 → success: read the answer
# → 404 → our mistake: fix the request, don't retry
# → 429 → rate limited: wait, then retry
# → 503 → their problem: retry a few times
~~~

~~~quiz
? Your code gets status 429 from an AI service. What should it do?
+ Wait a bit, then retry (and send fewer requests at once)
- Give up immediately
- Retry instantly, as fast as possible
- Change the API key
! 429 means "too many requests". Retrying instantly makes it worse; wait with growing pauses (exponential backoff, lesson 9).
~~~

~~~quiz
? Type exactly what this prints, using the function above:
| def what_to_do(status):
|     if 200 <= status < 300:
|         return "success"
|     if status == 429:
|         return "wait"
|     if 400 <= status < 500:
|         return "fix request"
|     return "retry"
| print(what_to_do(500))
= retry
! 500 isn't 2xx, isn't 429, and isn't 4xx, so it falls through to the last line: a server-side problem worth retrying.
~~~

## The Anthropic SDK: a friendly wrapper
An **SDK** is a library that does the HTTP part for you. Here is a complete AI call:

~~~python
# (needs: pip install anthropic, and an API key)
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

print(response.content[0].text)           # the answer text
print(response.usage.input_tokens, response.usage.output_tokens)   # what you'll pay for
print(response.stop_reason)               # why it stopped
# → billing                    (example output: the exact wording can vary)
# → 31 3                       (example token counts)
# → end_turn
~~~

Read the request as a **form**: *which model*, *how long at most*, *standing instructions* (system), *the conversation* (messages: a list of dicts, each with a role and content). The response is an **object**: the answer is in ~content~ (a list of blocks, because answers can contain text and tool requests), plus **usage** (tokens, which is how you're billed).

**Practise reading a response without an API key.** This builds a pretend response with the same shape, so you can see exactly what each line gives back:

~~~python
from types import SimpleNamespace as Obj    # a quick way to make an object with dot-access

response = Obj(
    content=[Obj(type="text", text="billing")],
    usage=Obj(input_tokens=31, output_tokens=3),
    stop_reason="end_turn",
)
print(response.content[0].text)
print(response.content[0].type)
print(response.usage.input_tokens + response.usage.output_tokens, "tokens in total")
print(response.stop_reason == "max_tokens")   # was the answer cut off?
# → billing
# → text
# → 34 tokens in total
# → False
~~~

**Scenario: a conversation with memory.** The AI has no memory between calls, so you send the whole conversation each time:

~~~python
messages = [
    {"role": "user", "content": "My name is Dana."},
    {"role": "assistant", "content": "Nice to meet you, Dana!"},
    {"role": "user", "content": "What's my name?"},
]
for m in messages:
    print(f"{m['role']:>9}: {m['content']}")
print("turns sent:", len(messages))
# →      user: My name is Dana.
# → assistant: Nice to meet you, Dana!
# →      user: What's my name?
# → turns sent: 3
~~~

Like a new waiter at every visit: they only know what's written on your order slip, so you write down the whole story each time.

~~~quiz
? Where is the answer text in an Anthropic response?
+ ~response.content[0].text~
- ~response.text~
- ~response["answer"]~
- ~response.messages[0]~
! content is a list of blocks; the first block holds the text.
~~~

~~~quiz
? Type exactly what this prints:
| from types import SimpleNamespace as Obj
| r = Obj(usage=Obj(input_tokens=100, output_tokens=20))
| print(r.usage.input_tokens + r.usage.output_tokens)
= 120
! You pay for both the tokens you send (100) and the tokens the AI writes (20).
~~~

~~~quiz
? Why does the code send the earlier messages again in every request?
+ The AI doesn't remember previous calls, so the conversation so far must be included each time
- To make the request bigger
- Because the API requires exactly three messages
- To change the model
! Each call is independent. The messages list is the AI's only memory of the conversation.
~~~

## Getting structured data back
Lesson 11's Pydantic models plug straight in:

~~~python
# (needs: pip install anthropic, and an API key)
from typing import Literal
from pydantic import BaseModel
import anthropic

client = anthropic.Anthropic()

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
# → billing 0.95               (example output)
~~~

**What you do next is plain Python** from the earlier lessons. You can practise that part right now:

~~~python
from typing import Literal
from pydantic import BaseModel

class TicketLabel(BaseModel):
    category: Literal["billing", "bug", "other"]
    confidence: float

QUEUE_FOR = {"billing": "finance-team", "bug": "engineering", "other": "general"}

label = TicketLabel(category="billing", confidence=0.95)   # pretend this came back from the AI
queue = QUEUE_FOR[label.category] if label.confidence >= 0.8 else "human-review"
print(f"Send to {queue}")
# → Send to finance-team
~~~

~~~quiz
? What does ~output_format=TicketLabel~ make the SDK do?
+ Ask the AI to fill in exactly the TicketLabel form and give back a checked object
- Translate the answer into another language
- Format the answer in bold
- Save the answer to a file
! You hand the Pydantic model to the SDK; it returns ~response.parsed_output~, already checked against your form.
~~~

## The gateway habit
The projects never scatter ~client.messages...~ calls everywhere. B01 builds one small file, ~llm.py~, with one function that every other file uses. It's where retries, logging, cost tracking and model choice live. Like having **one front desk** for all deliveries instead of every employee answering the door.

~~~python
# llm.py — a tiny gateway (with a fake client so you can run it)
CALL_LOG = []

def fake_client(prompt: str) -> str:
    return "billing" if "charged" in prompt else "other"

def call_model(prompt: str, model: str = "claude-haiku-4-5") -> str:
    answer = fake_client(prompt)                 # the one place the AI is called
    CALL_LOG.append({"model": model, "chars": len(prompt)})
    return answer

print(call_model("I was charged twice"))
print(call_model("Hello"))
print(len(CALL_LOG), "calls logged")
# → billing
# → other
# → 2 calls logged
~~~

Swapping the fake for the real SDK changes **one** function; the rest of the project doesn't notice.

~~~quiz
? Why put every AI call behind one ~call_model()~ function?
+ So retries, logging, costs and model choice live in one place and are easy to change
- Because Python only allows one AI call per file
- To make the AI smarter
- So the API key is printed
! One front desk: change it once and every part of the project benefits.
~~~

## Common mistakes
- Forgetting ~max_tokens~ (it's required) or setting it too low, so answers get cut off (~stop_reason == "max_tokens"~).
- Reading ~response.content~ as if it were text. It's a list of blocks; the text is in ~response.content[0].text~.
- Not handling 429 and 5xx errors. The SDK retries a few times by itself; the projects add their own limits on top.

~~~python
from types import SimpleNamespace as Obj

response = Obj(content=[Obj(type="text", text="The three main reasons are: first, the")], stop_reason="max_tokens")
if response.stop_reason == "max_tokens":
    print("Answer was cut off: raise max_tokens or ask for a shorter answer")
print(type(response.content).__name__, "of", len(response.content), "block(s)")
# → Answer was cut off: raise max_tokens or ask for a shorter answer
# → list of 1 block(s)
~~~

~~~quiz
? A response has ~stop_reason == "max_tokens"~. What happened?
+ The answer hit your length limit and was cut off
- The model finished normally
- The model wants to use a tool
- The API key is wrong
! "end_turn" means it finished; "max_tokens" means your cap stopped it mid-answer.
~~~

## You're ready
If you can read this lesson's code and say what each line does, you can read the projects. Take the [Python checkpoint](#/checkpoint/python) to be sure, then on to the Foundations.

~~~python
# Everything together: lessons 2–15 in eight lines
tickets = ["Charged twice!", "  App crashes on login ", "love the new design"]
QUEUE_FOR = {"billing": "finance-team", "bug": "engineering"}

def fake_label(text: str) -> str:
    t = text.lower()
    return "billing" if "charged" in t else "bug" if "crash" in t else "other"

for n, t in enumerate(tickets, start=1):
    label = fake_label(t.strip())
    print(f"#{n} {label:<8} → {QUEUE_FOR.get(label, 'general')}")
# → #1 billing  → finance-team
# → #2 bug      → engineering
# → #3 other    → general
~~~

~~~quiz
? In the final example, why does ticket #3 go to "general"?
+ Its label is "other", which isn't in QUEUE_FOR, so .get() uses the fallback "general"
- Because it's the last ticket
- Because it contains the word "design"
- Because of an error
! ~QUEUE_FOR.get(label, 'general')~ returns the fallback for any label not in the table.
~~~

## Try it in your head

~~~quiz
? **Scenario: reading a JSON reply.** Type exactly what this prints:
| import json
| reply = json.loads('{"content": [{"text": "Yes"}, {"text": "No"}]}')
| print(reply["content"][1]["text"])
= No
! content is a list; [1] is the second block, and its "text" is "No".
~~~

~~~quiz
? **Scenario: counting cost.** Input tokens cost 1 unit and output tokens 5 units. Type exactly what this prints:
| usage = {"input_tokens": 200, "output_tokens": 40}
| print(usage["input_tokens"] * 1 + usage["output_tokens"] * 5)
= 400
! 200 × 1 = 200, plus 40 × 5 = 200: 400 units. Output tokens usually cost more, so short answers save money.
~~~

~~~quiz
? **Scenario: a status code.** Your request returns 404. What does that usually mean?
- The service is overloaded
+ The address (or thing you asked for) wasn't found: a mistake in the request
- Success
- You're sending too many requests
! 4xx codes mean the request has a problem. 404 is "not found", like a parcel sent to the wrong address.
~~~
`,
    practice: [
      { q: "In client.messages.create(...), what goes in system and what goes in messages?", a: "system holds the standing instructions (the AI's job description). messages holds the conversation: a list of {role, content} dicts." },
      { q: "Where is the answer text in the response?", a: "response.content[0].text — content is a list of blocks, and the first block holds the text." },
      { q: "What does status code 429 mean, and what should code do about it?", a: "Too many requests (a rate limit). Wait and retry with growing pauses (exponential backoff), and cap how many calls run at once." },
      { q: "Scenario: a chatbot forgets the user's name between messages. What did the code probably forget to do?", a: "Send the earlier messages again. The AI has no memory between calls; the messages list is its memory." },
      { q: "Why is max_tokens called a cost cap?", a: "You pay for output tokens, and max_tokens is the most the AI may write, so it limits the cost (and length) of each answer." },
      { q: "Scenario: your team calls the AI from 12 different files. Why might a senior engineer suggest one llm.py gateway?", a: "So retries, logging, cost tracking and model choice are handled in one place. Changing the model or adding a retry is then a one-line change, not twelve." },
    ],
  },
);
