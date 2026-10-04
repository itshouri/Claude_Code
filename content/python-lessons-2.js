/*
 * Python toolkit lessons 5–8. See the header of content/python.js for the authoring rules
 * (every code block shows its output in "# →" comments; every "## " part ends with a ~~~quiz).
 * Every example is a real AI-engineering problem taken from the projects (B01–A08), solved with Python.
 */
window.PYTHON_LESSONS.push(
  {
    id: "control-flow",
    title: "5. Decisions and loops: routing, retries and the agent loop",
    summary: "if/else is how plain code makes the final call on what the AI said; loops process batches, retry failures, and run the agent loop with a step budget.",
    features: ["if", "ternary", "for", "while", "range", "enumerate-zip", "walrus"],
    body: md`
## The idea
A rule that runs through the whole lab: **the AI proposes, plain code decides.** The model reads the messy text and suggests a label or an action; ~if~ statements decide what actually happens. Loops do the repetitive parts: every ticket in a batch, every retry, every step of an agent.

Python uses **indentation** (4 spaces) to show which lines belong inside a decision or loop. Think of it like **sub-points in a to-do list**: everything indented under "If the AI is unsure:" only happens when it's unsure.

~~~python
confidence = 0.42
if confidence < 0.6:
    print("unsure: send to the human queue")   # indented: only when unsure
    print("log it for the weekly review")      # indented: only when unsure
print("ticket handled")                        # not indented: always
# → unsure: send to the human queue
# → log it for the weekly review
# → ticket handled
~~~

~~~quiz
? What does this print?
| confidence = 0.93
| if confidence < 0.6:
|     print("human queue")
| print("ticket handled")
- ~human queue~ then ~ticket handled~
+ ~ticket handled~ only
- ~human queue~ only
- Nothing
! 0.93 is not below 0.6, so the indented line is skipped. The last line isn't indented, so it always runs.
~~~

## if / elif / else: confidence bands and safety rules
Python checks the tests **top to bottom** and runs only the **first** one that's true.

**Real problem (I06, marketplace moderation):** a cheap model scores how likely a listing breaks the rules. Clearly fine → publish. Clearly bad → block. In between → ask a stronger model:

~~~python
CLEAR, BLOCK = 0.08, 0.93
for score in [0.02, 0.97, 0.40]:
    if score < CLEAR:
        action = "publish"
    elif score >= BLOCK:
        action = "block"
    else:
        action = "escalate to the stronger model"
    print(score, "→", action)
# → 0.02 → publish
# → 0.97 → block
# → 0.4 → escalate to the stronger model
~~~

This is a **cascade**: cheap and fast for the easy cases, expensive and careful only where needed.

**Real problem (B04, dental SMS): order matters.** An emergency must win over everything else, so it's checked **first**:

~~~python
def reply(emergency: bool, intent: str) -> str:
    if emergency:
        return "A team member will call you within 15 minutes."
    elif intent in ("reschedule", "cancel", "confirm"):
        return "Let me find your appointment."
    elif intent == "question":
        return "Here's our answer."
    else:
        return "A team member will text you back shortly."

print(reply(True, "reschedule"))     # emergency wins, even though they asked to reschedule
print(reply(False, "cancel"))
print(reply(False, "chit-chat"))
# → A team member will call you within 15 minutes.
# → Let me find your appointment.
# → A team member will text you back shortly.
~~~

(~def~ makes a function, lesson 6. Here, focus on the ~if~ chain.)

**Real problem (B01 gateway): why did the AI stop?** Every response has a ~stop_reason~. Code must handle each one:

~~~python
for stop_reason in ["end_turn", "max_tokens", "refusal", "tool_use"]:
    if stop_reason == "end_turn":
        result = "finished normally: use the answer"
    elif stop_reason == "max_tokens":
        result = "answer was cut off: raise max_tokens or shorten the schema"
    elif stop_reason == "refusal":
        result = "model declined: send to a human"
    else:
        result = "model wants to use a tool: run it and continue"
    print(f"{stop_reason:10} {result}")
# → end_turn   finished normally: use the answer
# → max_tokens answer was cut off: raise max_tokens or shorten the schema
# → refusal    model declined: send to a human
# → tool_use   model wants to use a tool: run it and continue
~~~

**One-line version** for simple choices: ~A if test else B~. B01's routing in one line:

~~~python
QUEUES = {"billing": "billing", "payroll_run": "payroll-runs"}
category, confidence, CONFIDENCE_FLOOR = "payroll_run", 0.41, 0.6
queue = "general" if confidence < CONFIDENCE_FLOOR else QUEUES[category]
print(queue)
# → general
~~~

~~~quiz
? Type exactly what this prints:
| score = 0.93
| if score < 0.08:
|     print("publish")
| elif score >= 0.93:
|     print("block")
| else:
|     print("escalate")
= block
! 0.93 is not below 0.08; the elif test 0.93 >= 0.93 is True, so it blocks and skips the else.
~~~

~~~quiz
? In B04, why is ~if emergency:~ the **first** test?
+ Python runs only the first true test, so an emergency must be checked before anything else can match
- Because Python requires booleans first
- Because emergencies are rare
- It doesn't matter where it goes
! If "reschedule" were checked first, a patient who wrote "I'm in agony, can I come earlier?" would get a calendar reply instead of a phone call.
~~~

~~~quiz
? Type exactly what this prints:
| stop_reason = "max_tokens"
| print("truncated" if stop_reason == "max_tokens" else "ok")
= truncated
! The answer was cut off by the length limit. B01's gateway raises an error in this case instead of using a half-finished answer.
~~~

## for loops: batches, totals and eval counts
~for x in items:~ means "**take each item in turn, call it x, and run the indented lines**".

**Real problem: process a batch and add up the cost.**

~~~python
calls = [{"ticket": "T-1", "cost": 0.0041}, {"ticket": "T-2", "cost": 0.0038}, {"ticket": "T-3", "cost": 0.0052}]
total = 0
for c in calls:
    total += c["cost"]
    print(c["ticket"], "running total", round(total, 4))
print("batch cost:", round(total, 4))
# → T-1 running total 0.0041
# → T-2 running total 0.0079
# → T-3 running total 0.0131
# → batch cost: 0.0131
~~~

**Real problem (B01 eval): urgent recall.** Of the tickets that really were urgent, how many did the AI flag as urgent? Count with a loop:

~~~python
golden = ["urgent", "normal", "urgent", "urgent", "low"]     # the right answers
predicted = ["urgent", "normal", "normal", "urgent", "low"]  # what the AI said
urgent_total = urgent_hit = 0
for want, got in zip(golden, predicted):                     # zip walks both lists together
    if want == "urgent":
        urgent_total += 1
        if got == "urgent":
            urgent_hit += 1
print(f"urgent recall {urgent_hit}/{urgent_total} = {urgent_hit / urgent_total:.0%}")
# → urgent recall 2/3 = 67%
~~~

For B01, that **one** missed urgent ticket matters more than overall accuracy: missed payroll means people don't get paid.

**Real problem (B03): count mentions inside each review** with a loop inside a loop. The inner loop runs fully for **each** review:

~~~python
reviews = [
    {"mentions": [{"aspect": "service", "polarity": "negative"}, {"aspect": "food_quality", "polarity": "positive"}]},
    {"mentions": [{"aspect": "service", "polarity": "negative"}]},
]
negative_service = 0
for r in reviews:
    for m in r["mentions"]:
        if m["aspect"] == "service" and m["polarity"] == "negative":
            negative_service += 1
print("negative service mentions:", negative_service)
# → negative service mentions: 2
~~~

~~~quiz
? Type exactly what this prints:
| golden = ["billing", "technical", "billing"]
| predicted = ["billing", "billing", "billing"]
| correct = 0
| for want, got in zip(golden, predicted):
|     if want == got:
|         correct += 1
| print(correct)
= 2
! zip pairs them: (billing, billing) ✓, (technical, billing) ✗, (billing, billing) ✓.
~~~

~~~quiz
? Of 40 truly urgent tickets, the AI flagged 38 as urgent. What is urgent recall?
- 38%
+ 95%
- 40%
- 2%
! Recall = found / should have found = 38 / 40 = 0.95. B01's target is at least 95%.
~~~

## range and enumerate: retries and numbered options
~range(n)~ gives 0 to n-1. ~range(1, 4)~ gives 1, 2, 3. **Real problem (B02): the repair loop.** Ask the AI, check the result in code, and if it fails, try again with the problems listed, at most 3 times:

~~~python
attempt_results = [["total doesn't add up"], ["total doesn't add up"], []]   # pretend: errors found on each try
max_attempts = 3
for attempt in range(1, max_attempts + 1):
    errors = attempt_results[attempt - 1]
    print(f"attempt {attempt}: {len(errors)} error(s)")
    if not errors:
        print("valid: create the draft")
        break
# → attempt 1: 1 error(s)
# → attempt 2: 1 error(s)
# → attempt 3: 0 error(s)
# → valid: create the draft
~~~

**enumerate** gives each item a number. **Real problem (B04): offer numbered time slots by SMS** so the patient can reply "2":

~~~python
slots = ["Tue Oct 13 09:00AM", "Wed Oct 14 02:30PM", "Fri Oct 16 11:00AM"]
lines = [f"{i}) {s}" for i, s in enumerate(slots, start=1)]
print("I can move it to:\n" + "\n".join(lines) + "\nReply with the number.")
choice = 2
print("booked:", slots[choice - 1])          # the patient's "2" is position 1
# → I can move it to:
# → 1) Tue Oct 13 09:00AM
# → 2) Wed Oct 14 02:30PM
# → 3) Fri Oct 16 11:00AM
# → Reply with the number.
# → booked: Wed Oct 14 02:30PM
~~~

~~~quiz
? Type exactly what this prints:
| options = ["slot-A", "slot-B", "slot-C"]
| reply = 3
| print(options[reply - 1])
= slot-C
! People count from 1, Python from 0. Option "3" is position 2.
~~~

~~~quiz
? How many times can B02's repair loop call the AI with ~for attempt in range(1, max_attempts + 1)~ and ~max_attempts = 3~?
- 2
+ 3
- 4
- Until it succeeds, however long that takes
! range(1, 4) gives 1, 2, 3: at most three attempts, then the invoice goes to a human with its errors.
~~~

## break, continue and for...else
~continue~ skips the rest of this round. ~break~ leaves the loop. **Real problem (B03): collecting batch results.** Some results failed: skip them (and remember to retry them), keep going with the rest:

~~~python
results = [{"id": "r1", "status": "succeeded"}, {"id": "r2", "status": "errored"},
           {"id": "r3", "status": "succeeded"}, {"id": "r4", "status": "expired"}]
stored, retry = 0, []
for r in results:
    if r["status"] != "succeeded":
        retry.append(r["id"])
        continue                 # don't try to store a failed result
    stored += 1
print("stored:", stored, "| to retry:", retry)
# → stored: 2 | to retry: ['r2', 'r4']
~~~

**Real problem (A03): stop when the budget runs out.**

~~~python
spent, max_usd = 0.0, 1.0
for step, cost in enumerate([0.30, 0.45, 0.40, 0.20], start=1):
    if spent >= max_usd:
        print("budget exhausted before step", step)
        break
    spent += cost
    print(f"step {step}: spent \${spent:.2f}")
# → step 1: spent $0.30
# → step 2: spent $0.75
# → step 3: spent $1.15
# → budget exhausted before step 4
~~~

**for...else**: the ~else~ of a loop runs only if the loop finished **without** ~break~. **Real problem (I02): the agent's step budget.** If the agent never finished within 8 steps, hand over to a human:

~~~python
MAX_STEPS = 3
finished_at = None                       # pretend the agent never finishes
for step in range(MAX_STEPS):
    print("agent step", step + 1)
    if step == finished_at:
        print("done")
        break
else:
    print("step budget exhausted: hand over to a human")
# → agent step 1
# → agent step 2
# → agent step 3
# → step budget exhausted: hand over to a human
~~~

~~~quiz
? What does this print?
| for status in ["succeeded", "errored", "succeeded"]:
|     if status == "errored":
|         continue
|     print("store")
+ ~store~ twice
- ~store~ three times
- ~store~ once
- Nothing
! continue skips the errored result only; the other two are stored.
~~~

~~~quiz
? In a ~for ... else~ agent loop, when does the ~else~ (hand over to a human) run?
+ Only when all steps were used without the agent finishing (no break)
- After every step
- Only when the first step fails
- Never
! break means "finished". If the loop runs out of steps instead, the else is the safety net.
~~~

## The agent loop
An **agent** is an AI that can use tools in a loop: it asks for a tool, your code runs it, the result goes back, and it decides what to do next, until it gives a final answer. It's the loop at the heart of I02, I03, A03, A05 and A06.

Here is the real shape of I02's loop, with a **pretend model** (a list of pre-written replies) so you can run it without an API key:

~~~python
fake_replies = [
    {"stop_reason": "tool_use", "tool": "get_order", "input": {"order_id": "BB-10293"}},
    {"stop_reason": "tool_use", "tool": "delivery_slots", "input": {"order_id": "BB-10293"}},
    {"stop_reason": "end_turn", "text": "Your sofa can come Tuesday 9am or Wednesday 2pm."},
]

def run_tool(name: str, args: dict) -> str:
    return f"(result of {name} for {args['order_id']})"

MAX_STEPS = 8
messages = [{"role": "user", "content": "Can my sofa come next week instead?"}]
for step in range(MAX_STEPS):
    resp = fake_replies[step]                       # real code: client.messages.create(...)
    if resp["stop_reason"] != "tool_use":           # no tool wanted: this is the final answer
        print("FINAL:", resp["text"])
        break
    result = run_tool(resp["tool"], resp["input"])  # plain code runs the tool, with its own checks
    print(f"step {step + 1}: {resp['tool']} → {result}")
    messages.append({"role": "user", "content": result})   # the result goes back to the model
else:
    print("step budget exhausted: hand over to a human")
print(len(messages), "messages in the conversation")
# → step 1: get_order → (result of get_order for BB-10293)
# → step 2: delivery_slots → (result of delivery_slots for BB-10293)
# → FINAL: Your sofa can come Tuesday 9am or Wednesday 2pm.
# → 3 messages in the conversation
~~~

Every agent in the lab has these parts: a **step budget** (~range(MAX_STEPS)~), a **stop test** (~stop_reason~), **plain code that runs the tools** (where permissions and policies are checked), and a **fallback** (~else~: hand over to a human). Lesson 15 shows the real API version.

~~~quiz
? In the agent loop, how does the code know the model has finished?
+ The stop_reason is not "tool_use", so there's no tool to run: it's the final answer
- The loop reaches MAX_STEPS
- The tool returns an empty string
- The user types "done"
! While the model keeps asking for tools, the loop runs them. A reply without a tool request is the answer. Running out of steps is the failure path.
~~~

## while loops and the walrus :=
A ~while~ loop repeats **as long as** its test is true. **Real problem (A01): wait until something happens, but not forever.** The freshness test waits for a permission change to show up, with a time limit:

~~~python
checks_until_visible = 3          # pretend: the change becomes visible on the 3rd check
checks, max_checks = 0, 10
visible = False
while not visible and checks < max_checks:
    checks += 1
    visible = checks >= checks_until_visible
    print("check", checks, "visible:", visible)
print("gave up" if not visible else f"visible after {checks} checks")
# → check 1 visible: False
# → check 2 visible: False
# → check 3 visible: True
# → visible after 3 checks
~~~

Notice the **two** conditions: the thing we're waiting for, **and** a limit. A ~while~ without a limit can run (and spend money) forever.

The **walrus** ~:=~ stores a value and tests it in one go. **Real problem (A02): reuse a saved result instead of paying for the AI call again.**

~~~python
results = {"claim-7:doc-2:extract:v3": {"doc_type": "police_report"}}   # results saved earlier
for key in ["claim-7:doc-2:extract:v3", "claim-7:doc-5:extract:v3"]:
    if (cached := results.get(key)) is not None:
        print(key, "→ reuse", cached["doc_type"])
    else:
        print(key, "→ call the AI")
# → claim-7:doc-2:extract:v3 → reuse police_report
# → claim-7:doc-5:extract:v3 → call the AI
~~~

Read ~(cached := results.get(key))~ as "look it up, store it in ~cached~, then check it". This makes a retried step safe and free: it's part of **idempotency** (doing it twice has the same effect as once).

~~~quiz
? Why does A01's waiting loop have ~and checks < max_checks~ as well as the real condition?
+ So it can't loop (and keep calling the system) forever if the condition never becomes true
- Because while loops need two conditions
- To make it faster
- To count the checks for a report
! A limit on every loop is a rule in the lab: agents have step budgets, retries have maximum attempts, waits have timeouts.
~~~

## Common mistakes
- ~while True:~ with no limit in an agent or retry loop. Always set a budget.
- Putting the general rule before the specific one in an ~elif~ chain, so the specific case never runs.
- Indentation mistakes that put a ~print~ or ~return~ inside the loop when you meant after it.

~~~python
scores = [0.9, 0.4, 0.7]
passed = 0
for s in scores:
    if s >= 0.6:
        passed += 1
    print("inside the loop:", passed)     # indented: prints every round
print("after the loop:", passed)          # prints once
# → inside the loop: 1
# → inside the loop: 1
# → inside the loop: 2
# → after the loop: 2
~~~

~~~quiz
? A moderation rule says ~if score > 0.5: "review"~ ~elif score > 0.95: "block"~. What happens to a listing scoring 0.99?
+ It's only sent to review: the first true test wins, so "block" never runs
- It's blocked
- Both happen
- Neither happens
! Put the stricter test first: ~if score > 0.95: block~ ~elif score > 0.5: review~.
~~~

## Real project problems

~~~quiz
? **I02 policy.** Type exactly what this prints:
| days_since_delivery, value = 40, 300.0
| if days_since_delivery > 30:
|     print("refuse: outside the return window")
| elif value > 1000:
|     print("needs approval")
| else:
|     print("start the return")
= refuse: outside the return window
! The first rule (the 30-day window) fails, so the return is refused before the money check.
~~~

~~~quiz
? **A03 citations.** What is the last line printed?
| claims = ["Revenue grew 12%", "Market is $4bn"]
| for i, c in enumerate(claims):
|     print(f"[{i + 1}] {c}")
+ ~[2] Market is $4bn~
- ~[1] Market is $4bn~
- ~[2] Revenue grew 12%~
- ~[3] Market is $4bn~
! enumerate starts at 0, so i + 1 numbers the claims 1 and 2. The memo then cites them as [1], [2].
~~~

~~~quiz
? **B03 batches.** Type exactly what this prints:
| statuses = ["succeeded", "expired", "succeeded", "succeeded"]
| retry = 0
| for s in statuses:
|     if s != "succeeded":
|         retry += 1
| print(retry)
= 1
! Only one result expired; it's resubmitted in the next batch.
~~~
`,
    practice: [
      { q: "What does 'the AI proposes, plain code decides' mean in practice?", a: "The model returns a label, score or suggested action; if/else rules in your code decide what actually happens (which queue, block or publish, ask a human)." },
      { q: "Why do agent loops use for step in range(MAX_STEPS) with an else branch?", a: "The budget guarantees the loop stops; the else runs only if the agent never finished, so the code can hand over to a human." },
      { q: "Write the one-line routing rule: 'general' if confidence is below FLOOR, otherwise QUEUES[category].", a: "queue = \"general\" if confidence < FLOOR else QUEUES[category]" },
      { q: "How do you compute urgent recall from two lists, golden and predicted?", a: "Loop over zip(golden, predicted); count how many golden 'urgent' items there are, and how many of those were predicted 'urgent'; divide hits by total." },
      { q: "In B03's result collection, why use continue for failed results instead of break?", a: "continue skips just that result and keeps processing the rest; break would stop collecting everything after the first failure." },
      { q: "Name the four parts every agent loop in the lab has.", a: "A step budget, a stop test (stop_reason), plain code that runs tools with its own checks, and a fallback when the budget runs out." },
    ],
  },

  {
    id: "functions",
    title: "6. Functions: the gateway, the rules and swappable models",
    summary: "Small named functions with inputs and outputs are how every project is organised: one gateway function for AI calls, small rule functions around it, and a model you can swap for a fake in tests.",
    features: ["def", "return", "defaults", "type-hints", "docstring", "lambda", "sorted-key", "global-state"],
    body: md`
## The idea
A **function** is a named block of steps. You give it **inputs** (*parameters*), it does its job, and it **returns** an output.

Think of a function like a **recipe card**: write it once, then cook it whenever you want with different ingredients.

Every project has the same kinds of functions: one that **calls the AI** (the gateway), small ones that **check and decide** (validation and routing rules), and one that **measures** (the eval). Here's B01's routing rule as a function:

~~~python
def route(category: str, confidence: float) -> str:
    """Pick the queue for a triaged ticket. Plain code: no AI here."""
    if confidence < 0.6:
        return "general"
    return {"billing": "billing", "payroll_run": "payroll-runs"}.get(category, "general")

print(route("payroll_run", 0.91))
print(route("payroll_run", 0.40))
print(route("refunds", 0.95))
# → payroll-runs
# → general
# → general
~~~

~~~quiz
? Type exactly what ~route("billing", 0.75)~ returns, using the function above.
| def route(category, confidence):
|     if confidence < 0.6:
|         return "general"
|     return {"billing": "billing", "payroll_run": "payroll-runs"}.get(category, "general")
| print(route("billing", 0.75))
= billing
! 0.75 is not below 0.6, so the lookup table decides: "billing".
~~~

## def and return
- ~def~ starts the definition; the indented lines are the body.
- ~return~ hands a result back **and ends the function**.
- Defining a function does nothing until you **call** it with brackets.

**Real problem (A04): cost of one call.** A function so every part of the platform computes cost the same way:

~~~python
PRICE = {"claude-opus-5-5": (4.0, 20.0), "claude-haiku-4-5": (1.0, 5.0)}   # $ per million tokens

def cost_of(model: str, input_tokens: int, output_tokens: int) -> float:
    p_in, p_out = PRICE[model]
    return (input_tokens * p_in + output_tokens * p_out) / 1_000_000

print(cost_of("claude-haiku-4-5", 2_000, 300))
print(cost_of("claude-opus-5-5", 2_000, 300))
print(round(cost_of("claude-opus-5-5", 2_000, 300) / cost_of("claude-haiku-4-5", 2_000, 300), 1), "× more")
# → 0.0035
# → 0.014
# → 4.0 × more
~~~

**return vs print.** ~print~ only shows a value; ~return~ hands it back so code can use it. A function without ~return~ gives back ~None~:

~~~python
def cost_printed(tokens):
    print(tokens * 1.0 / 1_000_000)        # shows it, hands back nothing

def cost_returned(tokens):
    return tokens * 1.0 / 1_000_000        # hands it back

a = cost_printed(500_000)
b = cost_returned(500_000)
print("a:", a, "| b:", b)
print("a month of that:", b * 30)
# → 0.5
# → a: None | b: 0.5
# → a month of that: 15.0
~~~

~~~quiz
? What does this print?
| def confidence_ok(c):
|     c >= 0.6
| print(confidence_ok(0.9))
- ~True~
+ ~None~
- ~0.9~
- An error
! The comparison is worked out but never returned, so the function gives back None. It should be ~return c >= 0.6~.
~~~

## Default and keyword-only arguments: the gateway's signature
**Default values** let callers leave an input out. **Real problem (B01): one ~parse~ function for every AI call**, with a sensible default model tier and token limit:

~~~python
MODELS = {"smart": "claude-opus-5-5", "fast": "claude-haiku-4-5"}

def parse(system: str, user: str, schema: str, *, tier: str = "smart", max_tokens: int = 2048) -> str:
    """Pretend gateway: shows which model and limit a call would use."""
    return f"{schema} via {MODELS[tier]} (max {max_tokens} tokens)"

print(parse("Triage tickets.", "<ticket>...</ticket>", "Triage"))
print(parse("Parse SMS.", "<sms>...</sms>", "ParsedMessage", tier="fast", max_tokens=500))
# parse("Parse SMS.", "<sms>...</sms>", "ParsedMessage", "fast")
# ✗ TypeError: parse() takes 3 positional arguments but 4 were given
# → Triage via claude-opus-5-5 (max 2048 tokens)
# → ParsedMessage via claude-haiku-4-5 (max 500 tokens)
~~~

The lone ~*~ in the definition means: **everything after it must be given by name**. So callers must write ~tier="fast"~, never just ~"fast"~. In a function called from 50 places, that stops silent mix-ups (was ~500~ the max tokens or something else?). The projects' gateway uses exactly this signature.

~~~quiz
? Which call works with ~def parse(system, user, schema, *, tier="smart", max_tokens=2048)~?
+ ~parse(SYSTEM, user, Triage, tier="fast")~
- ~parse(SYSTEM, user, Triage, "fast")~
- ~parse(tier="fast")~
- ~parse(SYSTEM, user, Triage, 500)~
! Inputs after the * must be named. The first three are required and can be given by position.
~~~

~~~quiz
? Type exactly what this prints:
| def call(prompt, *, tier="smart"):
|     return tier
| print(call("hi"), call("hi", tier="fast"))
= smart fast
! The first call uses the default tier; the second names it explicitly.
~~~

## Type hints and docstrings
~category: str~ means "this should be text"; ~-> float~ means "this returns a decimal number"; ~str | None~ means "text or nothing". Python doesn't enforce them, but they tell readers and editors what goes in and out, and **some libraries read them**: lesson 12 shows how the AI's tool descriptions are built from a function's type hints and docstring.

**Real problem (B02): turn an amount as printed on an invoice into an exact number.** Invoices from different countries write ~1,234.50~ or ~1.234,50~:

~~~python
from decimal import Decimal

def money(s: str) -> Decimal:
    """'1.234,50' or '1,234.50' or '1234,50' → Decimal('1234.50')."""
    s = s.strip().replace(" ", "")
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):          # the comma comes last: it's the decimal mark
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    return Decimal(s)

for printed in ["1,234.50", "1.234,50", "1234,50", " 99.9 "]:
    print(f"{printed!r:12} → {money(printed)}")
# → '1,234.50'   → 1234.50
# → '1.234,50'   → 1234.50
# → '1234,50'    → 1234.50
# → ' 99.9 '     → 99.9
~~~

This is a perfect job for **plain code**: exact, testable, free. The AI copies the amount "as printed"; the function does the maths.

~~~quiz
? Using ~money()~ above, what does ~money("2.500,00")~ return?
| from decimal import Decimal
| def money(s):
|     s = s.strip().replace(" ", "")
|     if "," in s and "." in s:
|         s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
|     elif "," in s:
|         s = s.replace(",", ".")
|     return Decimal(s)
| print(money("2.500,00"))
= 2500.00
! The comma comes after the dot, so the comma is the decimal mark: remove the dot, turn the comma into a dot.
~~~

## Returning several values
**Real problem (A02): fast-track a claim only if no rule fails, and say why not.** Return two things as a tuple:

~~~python
MAX_STP_AMOUNT = 6000.00

def stp_decision(injury: bool, estimate_total: float, fraud_indicators: list[str]) -> tuple[bool, list[str]]:
    reasons = []
    if injury:
        reasons.append("Injury reported: always adjuster-handled")
    if estimate_total > MAX_STP_AMOUNT:
        reasons.append(f"Estimate {estimate_total:.2f} above STP limit")
    if fraud_indicators:
        reasons.append("Fraud indicators present: SIU review")
    return (not reasons), reasons          # eligible only if NO rule failed

eligible, reasons = stp_decision(False, 2840.0, [])
print(eligible, reasons)
eligible, reasons = stp_decision(False, 7200.0, ["loss within 14 days of policy start"])
print(eligible)
for r in reasons:
    print("-", r)
# → True []
# → False
# → - Estimate 7200.00 above STP limit
# → - Fraud indicators present: SIU review
~~~

Notice the design: the function can only say "fast-track" or "a person decides". It never says "deny". Keeping risky outcomes with humans is a decision you'll make in every project.

~~~quiz
? Type exactly what this prints:
| def check(total):
|     reasons = []
|     if total > 6000:
|         reasons.append("too big")
|     return (not reasons), reasons
| ok, why = check(500)
| print(ok, len(why))
= True 0
! No rule failed, so reasons is empty, ~not reasons~ is True, and the list has 0 items.
~~~

## Functions as inputs: swap the real AI for a fake
A function (or any object) can be passed **into** another function. This is how the projects test AI code without calling the AI. **Real problem (B01):** ~triage_ticket~ takes the model as an input, with the real gateway as the default:

~~~python
def real_llm(prompt: str) -> str:
    raise RuntimeError("would call the paid API")      # stands in for the real gateway

def triage_ticket(body: str, llm=real_llm) -> str:
    prompt = f"<ticket>{body[:8000]}</ticket>"
    return llm(prompt)

def fake_llm(prompt: str) -> str:                       # a test double: fixed answer, no network
    return "payroll_run" if "paid" in prompt else "other"

print(triage_ticket("Staff weren't paid today", llm=fake_llm))
print(triage_ticket("How do I export a report?", llm=fake_llm))
# → payroll_run
# → other
~~~

In production the default (the real gateway) is used; in tests you pass a fake. Like a **flight simulator** plugged into the same cockpit: the pilot's controls don't change, only what's behind them. This is called **dependency injection**, and lesson 14 builds on it.

~~~quiz
? Why does B01 write ~def triage_ticket(subject, body, llm=default_llm)~ instead of calling the real gateway directly inside?
+ So tests can pass a fake model: fast, free and the same answer every time
- Because Python requires models to be inputs
- To make the real AI faster
- To hide the API key
! The default keeps production code simple; the input lets tests swap in a fake.
~~~

## Tiny functions: lambda and sorting with key=
A ~lambda~ is a one-line function with no name, mostly used to tell ~sorted~, ~min~ and ~max~ **what to compare**.

**Real problem (B03): the top 3 complaints** for the monthly report:

~~~python
table = [{"aspect": "service", "negative": 14}, {"aspect": "wait_time", "negative": 22},
         {"aspect": "price_value", "negative": 5}, {"aspect": "cleanliness", "negative": 9}]
top = sorted(table, key=lambda r: r["negative"], reverse=True)[:3]
print([r["aspect"] for r in top])
# → ['wait_time', 'service', 'cleanliness']
~~~

**Real problem (I01): combining two search rankings** (reciprocal rank fusion). Each document gets points for ranking high in either list; then sort by points:

~~~python
keyword_hits = ["kb-12", "kb-40", "kb-7"]
vector_hits = ["kb-40", "kb-3", "kb-12"]
scores = {}
for hits in (keyword_hits, vector_hits):
    for rank, doc_id in enumerate(hits):
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (60 + rank + 1)
ranked = sorted(scores, key=scores.get, reverse=True)
print(ranked)
# → ['kb-40', 'kb-12', 'kb-3', 'kb-7']
~~~

~key=scores.get~ means "sort the ids by their score". kb-40 wins: it ranked high in **both** lists.

**Real problem (A01): handle permission removals before additions** (shrink access first). Sort by how many people are allowed:

~~~python
changes = [("doc-1", ["anna", "ben", "cy"]), ("doc-2", []), ("doc-3", ["anna"])]
changes.sort(key=lambda c: len(c[1]))
print([doc for doc, allowed in changes])
# → ['doc-2', 'doc-3', 'doc-1']
~~~

~~~quiz
? What does this print?
| models = [("claude-opus-5-5", 20.0), ("claude-haiku-4-5", 5.0), ("claude-sonnet-5-5", 10.0)]
| print(min(models, key=lambda m: m[1])[0])
+ ~claude-haiku-4-5~
- ~claude-opus-5-5~
- ~5.0~
- ~claude-sonnet-5-5~
! key=lambda m: m[1] compares the output prices. The cheapest is Haiku at 5.0; [0] gives its name.
~~~

## Shared things at the top of a file
Objects created once at the top of a file are shared by every function in it. The projects do this for the AI client (expensive to create) and for running statistics:

~~~python
STATS = {"calls": 0, "tokens": 0}          # shared by the whole file (I06 uses a Counter like this)

def record(tokens: int) -> None:
    STATS["calls"] += 1
    STATS["tokens"] += tokens

record(412)
record(388)
print(STATS)
# → {'calls': 2, 'tokens': 800}
~~~

Names created **inside** a function exist only while it runs:

~~~python
def compute():
    cost = 0.004            # local: disappears when the function ends
    return cost

print(compute())
# print(cost)
# ✗ NameError: name 'cost' is not defined
# → 0.004
~~~

~~~quiz
? Why do the projects create the AI client once at the top of ~llm.py~ instead of inside each function?
+ It's set up once and shared by every call, instead of rebuilding it every time
- Because functions can't create objects
- To make the API key visible
- Because Python only allows one client per computer
! Like the office coffee machine: bought once, used by everyone.
~~~

## Common mistakes
- Forgetting ~return~, so the function gives back ~None~.
- Calling without brackets: ~route~ is the recipe card; ~route(t)~ cooks.
- Hard-wiring the real AI inside a function, so it can't be tested without paying.
- Functions that do too much. The projects keep "call the AI", "check", and "decide" in separate small functions.

~~~python
def route(c):
    return "general" if c < 0.6 else "billing"

print(route)            # the function itself
print(route(0.9))       # its result
# → <function route at 0x7f...>   (the number varies)
# → billing
~~~

~~~quiz
? Your log shows ~<function triage_ticket at 0x10a...>~ where you expected a label. What went wrong?
+ The code printed the function itself instead of calling it with brackets and inputs
- The AI returned a function
- The API key is wrong
- The schema is wrong
! Without brackets you get the recipe card, not the dish.
~~~

## Real project problems

~~~quiz
? **A03 budget share.** Type exactly what this prints:
| def remaining_share(max_usd, spent, workers_left):
|     return max(0.0, (max_usd - spent) / max(workers_left, 1))
| print(remaining_share(6.0, 4.5, 3))
= 0.5
! $1.50 left divided between 3 workers: $0.50 each. max(..., 1) avoids dividing by zero; max(0.0, ...) avoids negative budgets.
~~~

~~~quiz
? **B01 tests.** What does this print?
| def triage(body, llm):
|     return llm(f"<ticket>{body}</ticket>")
| seen = []
| def fake(prompt):
|     seen.append(prompt)
|     return "other"
| triage("ignore your rules", fake)
| print("<ticket>" in seen[0])
+ ~True~
- ~False~
- ~other~
- An error
! The fake records the prompt it received. B01's test checks that customer text is wrapped in tags (as data), even when it says "ignore your rules".
~~~

~~~quiz
? **I01 fusion.** Type exactly what this prints:
| scores = {"kb-1": 0.016, "kb-2": 0.032, "kb-3": 0.020}
| print(sorted(scores, key=scores.get, reverse=True)[0])
= kb-2
! Sorting ids by their score, highest first: kb-2 (0.032) is on top.
~~~
`,
    practice: [
      { q: "What does the lone * mean in def parse(system, user, schema, *, tier=\"smart\")?", a: "Everything after it must be passed by name (tier=\"fast\"), which prevents silent mix-ups in a function called from many places." },
      { q: "What does a function return if it has no return line?", a: "None." },
      { q: "Why does triage_ticket take llm=default_llm as an input?", a: "Dependency injection: production uses the real gateway by default, tests pass a fake model that's fast, free and predictable." },
      { q: "Write a function that returns (eligible, reasons) where eligible is True only if reasons is empty.", a: "Collect failing rules in a list called reasons, then return (not reasons), reasons." },
      { q: "How do you get the 3 aspects with the most negative mentions from a list of dicts?", a: "sorted(table, key=lambda r: r[\"negative\"], reverse=True)[:3]" },
      { q: "Why is money parsing (\"1.234,50\" → 1234.50) done in plain code rather than asking the AI?", a: "It's exact and rule-based: plain code is free, fast, testable and never hallucinates. The AI only copies the amount as printed." },
    ],
  },

  {
    id: "comprehensions",
    title: "7. Comprehensions and generators: filtering AI output in one line",
    summary: "The one-line way to pick tool calls out of a response, keep only permitted citations, build prompt blocks, and compute eval scores. Generators stream documents chunk by chunk.",
    features: ["list-comp", "dict-comp", "generator", "yield"],
    body: md`
## The idea
Very often you want "a new list made from an old list": only the tool calls from a response, only the citations the user may see, only the failed eval cases. A **comprehension** says that in one line.

Think of it like a **sieve and a juicer in one**: pour the list in, keep only what passes the test, transform each piece on the way out.

~~~python
citations = ["doc-40", "doc-99", "doc-12"]
permitted = {"doc-12", "doc-40"}
safe = [c for c in citations if c in permitted]
print(safe)
# → ['doc-40', 'doc-12']
~~~

Read it from the middle: "**for each** c **in** citations, **if** c is permitted, **keep** c." That's A01's real rule: never show a source the user isn't allowed to see.

~~~quiz
? Type exactly what this prints:
| labels = ["billing", "other", "technical", "other"]
| print([l for l in labels if l != "other"])
= ['billing', 'technical']
! Keep each label that isn't "other".
~~~

## Picking blocks out of an AI response
A Claude response's ~content~ is a **list of blocks**: some are text, some are tool requests. You'll write these two lines in every agent:

~~~python
content = [
    {"type": "text", "text": "Let me look that up. "},
    {"type": "tool_use", "id": "tu_1", "name": "get_order", "input": {"order_id": "BB-10293"}},
    {"type": "tool_use", "id": "tu_2", "name": "search_policy", "input": {"query": "late delivery"}},
]
calls = [b for b in content if b["type"] == "tool_use"]            # every tool request
text = "".join(b["text"] for b in content if b["type"] == "text")  # all the text, glued together
print([c["name"] for c in calls])
print(repr(text))
# → ['get_order', 'search_policy']
# → 'Let me look that up. '
~~~

Then you run each tool and build **one result per call**, matched by id, with another comprehension:

~~~python
calls = [{"id": "tu_1", "name": "get_order"}, {"id": "tu_2", "name": "search_policy"}]
results = [{"type": "tool_result", "tool_use_id": c["id"], "content": f"(output of {c['name']})"} for c in calls]
for r in results:
    print(r["tool_use_id"], r["content"])
# → tu_1 (output of get_order)
# → tu_2 (output of search_policy)
~~~

I02 sends **all** these results back in **one** message: the model asked for two tools at once, so it gets both answers at once.

~~~quiz
? Type exactly what this prints:
| content = [{"type": "text", "text": "Hi"}, {"type": "tool_use", "name": "get_orders"}]
| print(len([b for b in content if b["type"] == "tool_use"]))
= 1
! One block is text, one is a tool request.
~~~

~~~quiz
? Why does the code use ~"".join(b["text"] for b in content if b["type"] == "text")~ instead of ~content[0]["text"]~?
+ The answer may have several text blocks (or a tool block first), so this collects all the text safely
- Because content[0] is always empty
- join is required by the API
- To make the answer shorter
! content is a list of mixed blocks. Filtering by type and joining is robust to any order or number of blocks.
~~~

## Building prompts from lists
**Real problem (I01, RAG): put the retrieved documents into the prompt**, each in its own tag with its id, so the AI can cite them:

~~~python
hits = [{"id": "kb-12#0", "title": "ACH returns", "text": "Returns post within 2 business days."},
        {"id": "kb-40#1", "title": "Wire limits", "text": "Daily wire limit is $25,000."}]
docs = "\n".join(f'<doc id="{h["id"]}" title="{h["title"]}">{h["text"]}</doc>' for h in hits)
print(docs)
# → <doc id="kb-12#0" title="ACH returns">Returns post within 2 business days.</doc>
# → <doc id="kb-40#1" title="Wire limits">Daily wire limit is $25,000.</doc>
~~~

**Real problem (A01): only the last 6 turns, each cut to 400 characters**, as one block of text for the query rewriter:

~~~python
history = [{"role": "user", "content": "Where's the torque spec for part X-200?"},
           {"role": "assistant", "content": "It's 45 Nm, per the 2025 manual."},
           {"role": "user", "content": "And for the newer one?"}]
h = "\n".join(f"{t['role']}: {t['content'][:400]}" for t in history[-6:])
print(h)
# → user: Where's the torque spec for part X-200?
# → assistant: It's 45 Nm, per the 2025 manual.
# → user: And for the newer one?
~~~

~~~quiz
? Type exactly what this prints:
| ids = ["kb-1", "kb-2"]
| print(", ".join(f"[{i}]" for i in ids))
= [kb-1], [kb-2]
! Each id is wrapped in brackets, then the pieces are joined with ", ".
~~~

## Dict and set comprehensions
Curly brackets with ~key: value~ build a dict. **Real problem (I01): look up retrieved documents by id** to check the AI's citations:

~~~python
hits = [{"id": "kb-12", "text": "ACH returns post in 2 days."}, {"id": "kb-40", "text": "Wire limit $25k."}]
by_id = {h["id"]: h["text"] for h in hits}
ai_citations = ["kb-40", "kb-77"]
problems = [f"bad citation {c}" for c in ai_citations if c not in by_id]
print(by_id["kb-40"])
print(problems)
# → Wire limit $25k.
# → ['bad citation kb-77']
~~~

**Real problem (A04): forward only allowed settings** from a team's request to the AI provider:

~~~python
PASS_THROUGH = {"system", "messages", "max_tokens"}
request = {"system": "Summarise.", "messages": [], "max_tokens": 800, "admin_override": True}
body = {k: v for k, v in request.items() if k in PASS_THROUGH}
print(body)
# → {'system': 'Summarise.', 'messages': [], 'max_tokens': 800}
~~~

The sneaky ~admin_override~ never reaches the provider. An **allowlist** (only listed things pass) is safer than trying to block bad things one by one.

**Real problem (B01 eval): recall per category**, one dict entry per class:

~~~python
hits = {"billing": 45, "payroll_run": 58, "technical": 30}
totals = {"billing": 50, "payroll_run": 60, "technical": 40}
per_class_recall = {c: round(hits[c] / totals[c], 2) for c in totals}
print(per_class_recall)
# → {'billing': 0.9, 'payroll_run': 0.97, 'technical': 0.75}
~~~

"technical" is the weak spot: that's where the next prompt fix should go.

A set comprehension ~{...}~ (no colon) collects unique items, like B03's (aspect, polarity) pairs:

~~~python
mentions = [{"aspect": "service", "polarity": "negative"}, {"aspect": "service", "polarity": "negative"},
            {"aspect": "food_quality", "polarity": "positive"}]
print(sorted({(m["aspect"], m["polarity"]) for m in mentions}))
# → [('food_quality', 'positive'), ('service', 'negative')]
~~~

~~~quiz
? Type exactly what this prints:
| ALLOWED = {"model", "max_tokens"}
| req = {"model": "claude-haiku-4-5", "max_tokens": 300, "debug": True}
| print(sorted({k: v for k, v in req.items() if k in ALLOWED}))
= ['max_tokens', 'model']
! Only allowlisted keys are kept; sorted() on a dict lists its keys in order.
~~~

## sum, any, all: scores and checks in one line
Inside ~sum~, ~any~, ~all~, ~max~ or ~next~, round brackets aren't needed and no list is built:

~~~python
cases = [{"want": "billing", "got": "billing"}, {"want": "technical", "got": "billing"},
         {"want": "other", "got": "other"}, {"want": "billing", "got": "billing"}]
correct = sum(c["want"] == c["got"] for c in cases)     # True counts as 1
print(correct, f"{correct / len(cases):.0%}")
print(all(c["want"] == c["got"] for c in cases))        # did every case pass?
print(any(c["got"] == "technical" for c in cases))      # did the AI ever say "technical"?
# → 3 75%
# → False
# → False
~~~

**Real problem (I01/I10): faithfulness score** = the share of the answer's claims that the documents support:

~~~python
judged = ["yes", "yes", "partially", "yes", "no"]
print(sum(v == "yes" for v in judged) / len(judged))
# → 0.6
~~~

**Real problem (I06): block if any image matches a known prohibited image:**

~~~python
bad_hashes = {"a1f3", "9c0d"}
listing_images = ["77be", "9c0d", "12aa"]
print(any(h in bad_hashes for h in listing_images))
# → True
~~~

**Real problem (B02): a "perfect" invoice** = every field matched:

~~~python
field_ok = {"supplier_name": True, "invoice_number": True, "total": True, "due_date": False}
print(all(field_ok.values()))
print([f for f, ok in field_ok.items() if not ok])
# → False
# → ['due_date']
~~~

~~~quiz
? Type exactly what this prints:
| verdicts = ["supports", "supports", "does_not_support"]
| print(sum(v == "supports" for v in verdicts))
= 2
! Each comparison gives True (1) or False (0); sum counts the Trues.
~~~

~~~quiz
? What does this print?
| quotes_found = [True, True, False]
| print(all(quotes_found), any(quotes_found))
+ ~False True~
- ~True True~
- ~False False~
- ~True False~
! Not every quote was found (all → False), but at least one was (any → True). I10 requires all quotes verified.
~~~

## Generators and yield: one piece at a time
A function with ~yield~ hands out items **one at a time**, pausing in between. Like a **ticket dispenser**: each pull gives the next ticket.

**Real problem (I01/B06): split a long document into chunks** without building every chunk up front:

~~~python
def chunks(text: str, size: int):
    for start in range(0, len(text), size):
        yield text[start:start + size]        # hand out one piece, then pause here

transcript = "We agreed to ship v2 in May. Dana owns the pricing page. Bo will email legal."
for n, piece in enumerate(chunks(transcript, 30), start=1):
    print(n, repr(piece))
# → 1 'We agreed to ship v2 in May. D'
# → 2 'ana owns the pricing page. Bo '
# → 3 'will email legal.'
~~~

Notice chunk 1 cuts "Dana" in half! Real chunkers split on headings, paragraphs or sentences, and B06 lets chunks **overlap** so nothing said at a boundary is lost:

~~~python
def chunks_with_overlap(text: str, size: int, overlap: int):
    step = size - overlap
    for start in range(0, len(text), step):
        yield text[start:start + size]
        if start + size >= len(text):
            break

for piece in chunks_with_overlap("ABCDEFGHIJKL", 6, 2):
    print(piece)
# → ABCDEF
# → EFGHIJ
# → IJKL
~~~

**Real problem (A01): connectors yield changes since the last sync.** A generator lets the indexer process each changed document as it arrives, even if there are millions:

~~~python
def content_changes(cursor: int):
    for doc_id, version in [("doc-1", 5), ("doc-2", 7), ("doc-3", 9)]:
        if version > cursor:
            yield doc_id, version             # (doc, new cursor)

for doc_id, new_cursor in content_changes(cursor=6):
    print("re-index", doc_id, "→ cursor", new_cursor)
# → re-index doc-2 → cursor 7
# → re-index doc-3 → cursor 9
~~~

~~~quiz
? Type exactly what this prints:
| def batches(items, size):
|     for i in range(0, len(items), size):
|         yield items[i:i + size]
| print(list(batches(["a", "b", "c", "d", "e"], 2)))
= [['a', 'b'], ['c', 'd'], ['e']]
! Each yield hands out a slice of 2; the last batch has whatever is left.
~~~

## Common mistakes
- Cramming too much into one comprehension. If it needs two ~if~s and a nested loop, use a normal ~for~ loop.
- Expecting a generator to work twice: once used up, it's empty.
- Forgetting that ~content[0]~ might not be the text block. Filter by ~type~.

~~~python
gen = (c for c in ["kb-1", "kb-2"])
print(list(gen))
print(list(gen))          # already used up
# → ['kb-1', 'kb-2']
# → []
~~~

~~~quiz
? A response's content is ~[tool_use block, text block]~. What goes wrong with ~resp.content[0].text~?
+ The first block is a tool request, which has no text, so the code crashes or reads the wrong thing
- Nothing, it always works
- It returns the tool name
- It returns all text joined
! Always filter blocks by type: [b for b in content if b.type == "text"].
~~~

## Real project problems

~~~quiz
? **B01 failures.** Type exactly what this prints:
| rows = [{"want": "billing", "got": "billing"}, {"want": "technical", "got": "other"}]
| print([r["want"] for r in rows if r["want"] != r["got"]])
= ['technical']
! Only the second case is wrong. B01 prints this failure list because reading failures tells you what to fix.
~~~

~~~quiz
? **A03 verified claims.** What does this print?
| checks = [{"claim": "A", "status": "supports"}, {"claim": "B", "status": "quote_not_found"},
|           {"claim": "C", "status": "supports"}]
| print(len([c for c in checks if c["status"] == "supports"]), len(checks))
+ ~2 3~
- ~3 3~
- ~1 3~
- ~2 2~
! Two of three claims are verified. Only those go into the memo; the third is listed as unverified.
~~~

~~~quiz
? **I01 fusion input.** Type exactly what this prints:
| ranked = ["kb-3#0", "kb-3#1", "kb-8#0"]
| print(list(dict.fromkeys(c.split("#")[0] for c in ranked)))
= ['kb-3', 'kb-8']
! Chunk ids become document ids, and dict.fromkeys removes the repeat while keeping the order.
~~~
`,
    practice: [
      { q: "How do you pick every tool request out of a response's content list?", a: "calls = [b for b in content if b.type == \"tool_use\"] (or b[\"type\"] for dicts)." },
      { q: "How do you keep only allowlisted keys from a request dict?", a: "{k: v for k, v in request.items() if k in ALLOWED}" },
      { q: "Compute accuracy in one line from a list of cases with want and got.", a: "sum(c[\"want\"] == c[\"got\"] for c in cases) / len(cases)" },
      { q: "What's the difference between any(...) and all(...) when checking verified quotes?", a: "any is True if at least one quote is verified; all is True only if every quote is. Citation checks use all." },
      { q: "Why might a document chunker use yield instead of returning a list?", a: "It hands out one chunk at a time, so huge documents (or millions of changed files) don't need to be held in memory at once." },
      { q: "Why do chunkers often overlap chunks?", a: "So a sentence or fact that falls on a chunk boundary appears whole in at least one chunk." },
    ],
  },

  {
    id: "modules",
    title: "8. Modules and the standard library: json, re, dates, hashing, files",
    summary: "How a project is split into files, plus the built-in tools every AI project borrows: JSON for tool results, regex for patterns and personal data, dates for validating the AI, hashes for caching, and paths for prompt files.",
    features: ["import", "main-guard", "json-calls", "counter", "regex", "misc-stdlib"],
    body: md`
## The idea
Real projects are split into files, each with one job (~llm.py~, ~schema.py~, ~triage.py~, ~evals/run_eval.py~). Each file is a **module**. ~import~ lets one file use another's code. Python also ships a big **standard library** of ready-made modules.

Think of it like **departments in a company**: accounting doesn't do marketing's job, it just asks marketing when it needs something.

~~~python
# (example: how B01's files use each other)
# --- triage.py ---
# import llm as default_llm          # my own llm.py, nicknamed default_llm
# from schema import Triage          # one class from my own schema.py
# from pathlib import Path           # a standard-library tool
# from string import Template        # another standard-library tool
#
# --- evals/run_eval.py ---
# from triage import PROMPT_VERSION, route, triage_ticket
# → (nothing printed: imports just make names available)
~~~

| You write | Then you use it as |
|---|---|
| ~import json~ | ~json.loads(text)~ |
| ~from collections import Counter~ | ~Counter(labels)~ |
| ~import llm as default_llm~ | ~default_llm.parse(...)~ |

~~~quiz
? In ~from triage import route, triage_ticket~, what is ~triage~?
+ The project's own file triage.py
- A package from the internet
- A function
- A folder of prompts
! "from X import Y" borrows Y from the module X: your own X.py file or an installed package.
~~~

## The main guard: scripts that can also be imported
~~~python
def evaluate(path: str) -> dict:
    return {"path": path, "category_accuracy": 0.927}

if __name__ == "__main__":
    print(evaluate("evals/golden.jsonl"))
# → {'path': 'evals/golden.jsonl', 'category_accuracy': 0.927}
~~~

"Run this only when the file is started directly (~python3 run_eval.py~), not when another file imports it." I10's CI gate imports the eval functions without running them. Like a **demo button** on an appliance: it runs in the shop, not every time the appliance is installed in a bigger kitchen.

~~~quiz
? I10's CI gate does ~import evals.suites.summaries~. Does the code under that file's ~if __name__ == "__main__":~ run?
- Yes
+ No: it only runs when that file is started directly
! When imported, __name__ is the module's name, not "__main__", so the guarded block is skipped.
~~~

## json: tool results, AI answers and reports
JSON is text that looks like Python dicts and lists. It's how data travels between your code, AI models and other services.

**Real problem (I02): a tool's result must be sent back to the model as text.** ~json.dumps~ turns a dict into JSON text:

~~~python
import json
order = {"id": "BB-10293", "status": "in_transit", "delivered": False, "eta": None}
tool_result = json.dumps(order)
print(tool_result)
print(type(tool_result).__name__)
print(json.dumps({"error": "No order with that id on this account."}))
# → {"id": "BB-10293", "status": "in_transit", "delivered": false, "eta": null}
# → str
# → {"error": "No order with that id on this account."}
~~~

Notice: ~false~, ~null~, double quotes. That's JSON spelling. Errors are returned as JSON too: the model reads them and explains them to the customer.

**Real problem (B03): read the AI's JSON answer, and handle broken JSON.**

~~~python
import json
for text in ['{"overall": "negative", "mentions": []}', 'Sure! {"overall": "negative"}']:
    try:
        data = json.loads(text)
        print("parsed:", data["overall"])
    except json.JSONDecodeError:
        print("not valid JSON: retry this review")
# → parsed: negative
# → not valid JSON: retry this review
~~~

**Real problem (B03): hand the AI a table of numbers to write about**, readable with ~indent~:

~~~python
import json
agg = {"n_reviews": 412, "top_complaints": [{"aspect": "wait_time", "negative": 22}]}
print(json.dumps(agg, indent=1))
# → {
# →  "n_reviews": 412,
# →  "top_complaints": [
# →   {
# →    "aspect": "wait_time",
# →    "negative": 22
# →   }
# →  ]
# → }
~~~

B03's rule: the AI **writes the words, code computes the numbers**. The model gets the finished numbers as JSON and is told not to calculate new ones.

~~~quiz
? Type exactly what this prints:
| import json
| print(json.dumps({"ok": True, "label_url": None}))
= {"ok": true, "label_url": null}
! JSON writes True as true and None as null.
~~~

~~~quiz
? Why do I02's tools return ~json.dumps({"error": "..."})~ instead of raising an exception when an order isn't found?
+ The model receives the error as a tool result and can explain it or offer options, so the chat continues
- Because json.dumps is faster than raise
- Because the AI can't read text
- To hide the error from logs
! A tool failing shouldn't crash the conversation. The error becomes information the model can act on.
~~~

## Counter and defaultdict: counting labels and building confusion matrices
~~~python
from collections import Counter
predicted = ["billing", "technical", "billing", "other", "billing"]
counts = Counter(predicted)
print(counts)
print(counts["billing"], counts["account_access"])     # missing labels count as 0
print(counts.most_common(1))
# → Counter({'billing': 3, 'technical': 1, 'other': 1})
# → 3 0
# → [('billing', 3)]
~~~

**Real problem (B01 eval): the confusion matrix** shows *which* categories get mixed up: ~confusion[expected][predicted]~. A ~defaultdict(Counter)~ creates an empty counter for every new expected label:

~~~python
from collections import Counter, defaultdict
pairs = [("payroll_run", "payroll_run"), ("payroll_run", "billing"), ("billing", "billing"),
         ("payroll_run", "payroll_run"), ("technical", "technical")]
confusion = defaultdict(Counter)
for want, got in pairs:
    confusion[want][got] += 1
print(dict(confusion["payroll_run"]))
recall = {c: confusion[c][c] / sum(confusion[c].values()) for c in confusion}
print({c: round(r, 2) for c, r in recall.items()})
# → {'payroll_run': 2, 'billing': 1}
# → {'payroll_run': 0.67, 'billing': 1.0, 'technical': 1.0}
~~~

One payroll ticket went to billing. That's exactly the confusion B01's prompt warns about ("if employees were paid wrong, it's payroll_run even if they say 'charge'").

~~~quiz
? Type exactly what this prints:
| from collections import Counter
| print(Counter(["urgent", "normal", "urgent"])["urgent"])
= 2
! Counter counts each label; "urgent" appears twice.
~~~

## re: patterns, links and personal data
**re** (regular expressions) finds patterns in text. ~\d~ means "a digit", ~+~ "one or more", ~{3}~ "exactly 3", ~\b~ "a word boundary", and brackets ~( )~ mark the part you want back.

**Real problem (I01): build an eval set from past tickets** by finding which help article each agent linked:

~~~python
import re
agent_reply = "See help.ledgerly.example/articles/4412 and help.ledgerly.example/articles/980 for details."
print(re.findall(r"help\.ledgerly\.example/articles/(\d+)", agent_reply))
# → ['4412', '980']
~~~

**Real problem (A04): block card numbers and mask account numbers** before text reaches the AI:

~~~python
import re
CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
ACCOUNT = re.compile(r"\b\d{10,12}\b")
msg = "Please move funds from account 004512345678 to my card 4111 1111 1111 1111."
print(bool(CARD.search(msg)))                         # is there a card number?
print(ACCOUNT.sub("<ACCOUNT>", "Balance for 004512345678 please"))
# → True
# → Balance for <ACCOUNT> please
~~~

**Real problem (I06): flag banned phrases, ignoring capital letters** (~re.I~):

~~~python
import re
BANNED = re.compile(r"\b(ghost gun|xanax bars)\b", re.I)
for title in ["Vintage lamp", "XANAX BARS cheap"]:
    m = BANNED.search(title)
    print(title, "→", m.group(1).lower() if m else "ok")
# → Vintage lamp → ok
# → XANAX BARS cheap → xanax bars
~~~

**Real problem (B05): turn a heading into a section id** the AI can cite:

~~~python
import re
title = "4.2 Parental Leave & Pay!"
print(re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-"))
# → 4-2-parental-leave-pay
~~~

~[^a-z0-9]+~ means "one or more characters that are NOT a letter or digit": each run becomes a single dash.

~~~quiz
? Type exactly what this prints:
| import re
| print(re.findall(r"BB-\d+", "Orders BB-10293 and BB-88 arrived"))
= ['BB-10293', 'BB-88']
! BB- followed by one or more digits, every time it appears.
~~~

~~~quiz
? Why does A04 detect card numbers with a regex **before** sending text to the AI?
+ So sensitive data is blocked or masked in code, before it ever leaves the company
- Because the AI can't read numbers
- To make the prompt shorter
- Because regex is more accurate than any AI
! Some data must never reach the model at all. Plain-code filters run first and can't be talked out of it.
~~~

## datetime: giving the AI today's date, and checking its dates
Models don't know today's date. **Real problem (B04): "next Thursday" only makes sense if the prompt says what today is.**

~~~python
from datetime import date, timedelta
today = date(2026, 10, 4)
print(f"<today>{today.isoformat()} ({today.strftime('%A')})</today>")
print(today + timedelta(days=4))          # "Thursday" from a Sunday
# → <today>2026-10-04 (Sunday)</today>
# → 2026-10-08
~~~

**Real problem (B04): never trust a date the AI produced.** Drop anything unreadable, in the past, or absurdly far away:

~~~python
from datetime import date, timedelta
today = date(2026, 10, 4)

def ok(d: str | None) -> str | None:
    if d is None:
        return None
    try:
        v = date.fromisoformat(d)
    except ValueError:
        return None                       # not a real ISO date
    if v < today or v > today + timedelta(days=180):
        return None                       # in the past, or more than 6 months away
    return d

for d in ["2026-10-08", "2025-10-08", "2026-02-30", "next week", None]:
    print(repr(d), "→", ok(d))
# → '2026-10-08' → 2026-10-08
# → '2025-10-08' → None
# → '2026-02-30' → None
# → 'next week' → None
# → None → None
~~~

**Real problem (I02): is the return inside the 30-day window?** Subtracting dates gives a gap in days:

~~~python
from datetime import date
delivered, today = date(2026, 9, 1), date(2026, 10, 4)
print((today - delivered).days, "days since delivery")
print("in window:", (today - delivered).days <= 30)
# → 33 days since delivery
# → in window: False
~~~

~~~quiz
? Type exactly what this prints:
| from datetime import date
| print(date.fromisoformat("2026-10-04").strftime("%A"))
= Sunday
! %A is the weekday name. B04 puts it in the prompt so "next Thursday" resolves correctly.
~~~

## hashlib: fingerprints for caching and change detection
A **hash** is a short fingerprint of some text: the same text always gives the same hash; any change gives a different one.

**Real problem (I01): only re-embed chunks that changed.** Embedding costs money; most of 1,400 articles don't change each night:

~~~python
import hashlib
def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:12]

stored = {"kb-12#0": content_hash("ACH returns post within 2 business days.")}
new_chunks = {"kb-12#0": "ACH returns post within 2 business days.",
              "kb-40#0": "Daily wire limit is $25,000."}
todo = [cid for cid, text in new_chunks.items() if stored.get(cid) != content_hash(text)]
print(todo)
print(content_hash("hello"), content_hash("hello"), content_hash("hello!"))
# → ['kb-40#0']
# → 2cf24dba5fb0 2cf24dba5fb0 ce06092fb948
~~~

Only the new chunk is embedded; the unchanged one is skipped. The same trick builds **cache keys** for AI answers: same prompt + same model = same key = reuse the saved answer.

~~~quiz
? Why does I01 store a hash of each chunk's text?
+ To skip re-embedding chunks whose text hasn't changed, saving time and money
- To encrypt the help articles
- To make search faster for users
- Because the database requires it
! Same text → same hash. If the stored hash matches, nothing changed.
~~~

## pathlib, base64 and time: prompt files, PDFs and latency
**Real problem (B01): load the prompt file that matches the version constant.** ~Path~ joins folder names with ~/~:

~~~python
from pathlib import Path
Path("prompts").mkdir(exist_ok=True)
Path("prompts/triage_v1.md").write_text("You triage support tickets for $company.")
PROMPT_VERSION = "triage_v1"
path = Path("prompts") / f"{PROMPT_VERSION}.md"
print(path)
print(path.read_text())
print([p.name for p in Path("prompts").glob("*.md")])
# → prompts/triage_v1.md
# → You triage support tickets for $company.
# → ['triage_v1.md']
~~~

**Real problem (B02): send a PDF to Claude.** Files travel inside JSON as **base64** (binary data written as plain letters):

~~~python
import base64
pdf_bytes = b"%PDF-1.7 tiny example"
block = {"type": "document",
         "source": {"type": "base64", "media_type": "application/pdf",
                    "data": base64.standard_b64encode(pdf_bytes).decode()}}
print(block["source"]["data"])
print(base64.standard_b64decode(block["source"]["data"]))
# → JVBERi0xLjcgdGlueSBleGFtcGxl
# → b'%PDF-1.7 tiny example'
~~~

**Real problem (every gateway): measure latency** with a stopwatch:

~~~python
import time
t0 = time.perf_counter()
time.sleep(0.25)                                   # stands in for an AI call
ms = (time.perf_counter() - t0) * 1000
print(f"took about {round(ms, -2):.0f} ms")
# → took about 300 ms   (varies a little)
~~~

~~~quiz
? In B01, what file does ~Path("prompts") / f"{PROMPT_VERSION}.md"~ point to when ~PROMPT_VERSION = "triage_v2"~?
| from pathlib import Path
| PROMPT_VERSION = "triage_v2"
| print(Path("prompts") / f"{PROMPT_VERSION}.md")
= prompts/triage_v2.md
! Changing one constant switches the prompt file. The version is also logged with every result, so evals can compare v1 and v2.
~~~

## Common mistakes
- Naming your own file ~json.py~ or ~anthropic.py~: Python imports yours instead of the real one.
- Trusting dates, numbers or JSON from the AI without checking them in code.
- Sending a Python dict as a tool result instead of JSON text (~json.dumps~ it).

~~~python
import json
result = {"ok": True}
print(str(result))          # Python's spelling: not valid JSON
print(json.dumps(result))   # JSON spelling
# → {'ok': True}
# → {"ok": true}
~~~

~~~quiz
? Why is ~str(result)~ the wrong way to turn a tool result into text?
+ It produces Python's spelling (single quotes, True), not valid JSON
- It's slower
- It removes the values
- It encrypts the data
! Use json.dumps so the text is real JSON that any system (and the model) reads reliably.
~~~

## Real project problems

~~~quiz
? **B04 date check.** Type exactly what this prints:
| from datetime import date
| try:
|     date.fromisoformat("2026-13-01")
|     print("ok")
| except ValueError:
|     print("dropped")
= dropped
! There's no month 13, so the AI's date is dropped instead of trusted.
~~~

~~~quiz
? **A01 canary test.** What does this print?
| import secrets
| phrase = f"ZEPHYR-{secrets.token_hex(4).upper()}"
| print(phrase.startswith("ZEPHYR-"), len(phrase))
+ ~True 15~
- ~True 11~
- ~False 15~
- A different answer every time
! token_hex(4) gives 8 random hex characters; "ZEPHYR-" is 7. The phrase is random, but its shape isn't. A01 hides these secret phrases in restricted documents to detect leaks.
~~~

~~~quiz
? **B01 report.** Type exactly what this prints:
| from collections import Counter
| c = Counter(["general", "billing", "general", "general"])
| print(round(c["general"] / sum(c.values()), 2))
= 0.75
! 3 of 4 tickets fell back to the human "general" queue: a fallback rate of 0.75, which would be far too high.
~~~
`,
    practice: [
      { q: "Why must tool results be passed through json.dumps?", a: "The model receives tool results as text; json.dumps turns dicts into real JSON (double quotes, true/false/null) that it reads reliably." },
      { q: "How do you handle an AI answer that isn't valid JSON?", a: "Wrap json.loads in try/except json.JSONDecodeError and retry, or (better) use structured outputs so the answer is always valid." },
      { q: "What does confusion[\"payroll_run\"][\"billing\"] = 3 mean in B01's eval?", a: "Three tickets that were really payroll_run were labelled billing by the AI." },
      { q: "Why does B04 put today's date and weekday into the prompt?", a: "Models don't know today's date, so relative dates like 'next Thursday' can only be resolved if the prompt states it." },
      { q: "How does I01 avoid re-embedding unchanged chunks every night?", a: "It stores a sha256 hash of each chunk's text and only embeds chunks whose new hash differs from the stored one." },
      { q: "Write a regex that finds order ids like BB-10293.", a: "re.findall(r\"BB-\\d+\", text)" },
    ],
  },
);
