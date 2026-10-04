/*
 * Python toolkit lessons 5–8. See the header of content/python.js for the authoring rules
 * (every code block shows its output in "# →" comments; every "## " part ends with a ~~~quiz).
 */
window.PYTHON_LESSONS.push(
  {
    id: "control-flow",
    title: "5. Decisions and loops",
    summary: "Making the program choose (if/else) and repeat (for/while), which is the backbone of every rule and every agent loop.",
    features: ["if", "ternary", "for", "while", "range", "enumerate-zip", "walrus"],
    body: md`
## The idea
Programs need to **decide** ("if the score is low, send to a human") and **repeat** ("for every ticket, classify it"). Python uses **indentation** (4 spaces at the start of a line) to show which lines belong inside a decision or loop.

Think of indentation like **sub-points in a to-do list**: everything indented under "If it rains:" only happens when it rains.

~~~python
raining = True
if raining:
    print("Take an umbrella")      # indented: only happens if raining
    print("Wear boots")            # indented: only happens if raining
print("Leave the house")           # not indented: always happens
# → Take an umbrella
# → Wear boots
# → Leave the house
~~~

~~~python
raining = False
if raining:
    print("Take an umbrella")
    print("Wear boots")
print("Leave the house")
# → Leave the house
~~~

Same code, different value, different output. That's the whole point of a decision.

~~~quiz
? What does this print?
| hungry = False
| if hungry:
|     print("Eat lunch")
| print("Back to work")
- ~Eat lunch~ then ~Back to work~
+ ~Back to work~ only
- ~Eat lunch~ only
- Nothing
! ~hungry~ is False, so the indented line is skipped. The last line isn't indented, so it always runs.
~~~

## Decisions: if / elif / else
~~~python
confidence = 0.65
if confidence >= 0.85:
    action = "auto-apply"
elif confidence >= 0.6:          # "else if": checked only when the first test failed
    action = "suggest to a human"
else:                            # when none of the tests above passed
    action = "send to a human"
print(action)
# → suggest to a human
~~~

Python checks the tests **from top to bottom** and runs only the **first** one that's true, then skips the rest. Like a bouncer with a list of rules: the first rule that applies decides.

**Scenario: exam grades.** Run the same rules on three different scores:

~~~python
for score in [92, 74, 41]:
    if score >= 90:
        grade = "A"
    elif score >= 70:
        grade = "B"
    elif score >= 50:
        grade = "C"
    else:
        grade = "Fail"
    print(score, "→", grade)
# → 92 → A
# → 74 → B
# → 41 → Fail
~~~

Notice 92 is also ≥ 70 and ≥ 50, but it gets "A" because that test comes first and Python stops there.

**Scenario: a delivery fee.**

~~~python
order_total = 32.0
if order_total >= 50:
    fee = 0
elif order_total >= 20:
    fee = 2.5
else:
    fee = 5
print(f"Order £{order_total:.2f}, delivery £{fee:.2f}, pay £{order_total + fee:.2f}")
# → Order £32.00, delivery £2.50, pay £34.50
~~~

**Scenario: checking several things at once** with ~and~ / ~or~:

~~~python
amount = 1200
customer_years = 3
if amount > 1000 and customer_years < 1:
    print("Block: big payment from a new customer")
elif amount > 1000:
    print("Allow, but log it")
else:
    print("Allow")
# → Allow, but log it
~~~

**One-line version** for simple choices (a *conditional expression*): ~A if test else B~.

~~~python
confidence = 0.4
label = "urgent" if confidence < 0.5 else "normal"
print(label)
items = 1
print(f"{items} item" + ("s" if items != 1 else ""))
items = 3
print(f"{items} item" + ("s" if items != 1 else ""))
# → urgent
# → 1 item
# → 3 items
~~~

**Empty things count as False.** An empty string ~""~, empty list ~[]~, ~0~ and ~None~ all behave like ~False~ in an ~if~. Anything else behaves like ~True~.

~~~python
name = ""
if name:
    print("Hello", name)
else:
    print("No name given")
cart = ["apple"]
if cart:
    print("Cart has", len(cart), "item(s)")
# → No name given
# → Cart has 1 item(s)
~~~

~~~quiz
? Type exactly what this prints:
| temp = 18
| if temp > 25:
|     print("hot")
| elif temp > 15:
|     print("mild")
| else:
|     print("cold")
= mild
! 18 is not > 25, so Python moves to the elif: 18 > 15 is True, so it prints "mild" and skips the else.
~~~

~~~quiz
? What does this print?
| points = 95
| if points > 50:
|     print("silver")
| elif points > 90:
|     print("gold")
+ ~silver~
- ~gold~
- ~silver~ then ~gold~
- Nothing
! Python runs only the FIRST test that's true. 95 > 50 is true, so it prints "silver" and never checks the elif. (To fix it, put the bigger test first.)
~~~

~~~quiz
? Type exactly what this prints:
| stock = 0
| print("in stock" if stock > 0 else "sold out")
= sold out
! ~A if test else B~: the test ~stock > 0~ is False, so you get B, "sold out".
~~~

## for loops: do something for each item
~~~python
tickets = ["refund please", "app crashes", "love it"]
for t in tickets:
    print("handling:", t)
print("all done")
# → handling: refund please
# → handling: app crashes
# → handling: love it
# → all done
~~~

Read ~for t in tickets:~ as "**take each item in turn, call it t, and run the indented lines**". The name ~t~ is your choice.

**Loops over text** go letter by letter:

~~~python
for letter in "abc":
    print(letter.upper())
# → A
# → B
# → C
~~~

**range()** gives you a run of numbers. It **stops before** the end number:

~~~python
for i in range(3):               # 0, 1, 2
    print("attempt", i + 1)
print(list(range(5)))            # 0 up to (not including) 5
print(list(range(2, 6)))         # start at 2, stop before 6
print(list(range(0, 10, 3)))     # start 0, stop before 10, step 3
print(list(range(5, 0, -1)))     # count down
# → attempt 1
# → attempt 2
# → attempt 3
# → [0, 1, 2, 3, 4]
# → [2, 3, 4, 5]
# → [0, 3, 6, 9]
# → [5, 4, 3, 2, 1]
~~~

**Scenario: a running total.** The classic loop pattern: start at zero, add as you go.

~~~python
expenses = [12.5, 40.0, 7.25, 3.0]
total = 0
for e in expenses:
    total += e
    print(f"added {e}, running total {total}")
print("Final:", total)
# → added 12.5, running total 12.5
# → added 40.0, running total 52.5
# → added 7.25, running total 59.75
# → added 3.0, running total 62.75
# → Final: 62.75
~~~

**Scenario: counting matches.** Start a counter at zero and add 1 when something matches:

~~~python
reviews = ["great", "awful", "great", "ok", "great"]
great = 0
for r in reviews:
    if r == "great":
        great += 1
print(great, "of", len(reviews), "reviews were great")
# → 3 of 5 reviews were great
~~~

**Scenario: finding the biggest by hand** (what ~max()~ does inside):

~~~python
sales = {"Mon": 120, "Tue": 340, "Wed": 90}
best_day, best = None, 0
for day, amount in sales.items():
    if amount > best:
        best_day, best = day, amount
print("Best day:", best_day, best)
# → Best day: Tue 340
~~~

**A times table**: a loop inside a loop. The inner loop runs completely for **each** round of the outer loop:

~~~python
for row in range(1, 4):
    line = ""
    for col in range(1, 4):
        line += f"{row * col:3}"
    print(line)
# →   1  2  3
# →   2  4  6
# →   3  6  9
~~~

~~~quiz
? Type exactly what this prints:
| print(list(range(1, 4)))
= [1, 2, 3]
! ~range(1, 4)~ starts at 1 and stops BEFORE 4.
~~~

~~~quiz
? What does this print?
| total = 0
| for n in [2, 4, 6]:
|     total += n
| print(total)
- ~6~
+ ~12~
- ~2 4 6~
- ~0~
! Each round adds the next number: 0+2=2, 2+4=6, 6+6=12. The print is not indented, so it runs once, after the loop.
~~~

~~~quiz
? How many lines does this print?
| for i in range(4):
|     print("hi")
- 3
+ 4
- 5
- 1
! ~range(4)~ is 0, 1, 2, 3: four rounds, one "hi" each.
~~~

## enumerate and zip
**enumerate** gives you the position too. **zip** walks two lists side by side, like two people reading two lists aloud together.

~~~python
tickets = ["refund please", "app crashes", "love it"]
for n, t in enumerate(tickets, start=1):
    print(n, t)
# → 1 refund please
# → 2 app crashes
# → 3 love it
~~~

~~~python
names = ["Ana", "Bo", "Cy"]
scores = [88, 92, 75]
for name, score in zip(names, scores):
    print(f"{name}: {score}")
# → Ana: 88
# → Bo: 92
# → Cy: 75
~~~

**Scenario: checking the AI's homework.** Compare the AI's answers with the right answers:

~~~python
predicted = ["billing", "bug", "praise"]
expected = ["billing", "bug", "other"]
correct = 0
for p, e in zip(predicted, expected):
    mark = "✓" if p == e else "✗"
    print(f"{mark} predicted {p}, expected {e}")
    if p == e:
        correct += 1
print(f"accuracy = {correct / len(expected):.2f}")
# → ✓ predicted billing, expected billing
# → ✓ predicted bug, expected bug
# → ✗ predicted praise, expected other
# → accuracy = 0.67
~~~

That last example is a tiny **evaluation**: comparing the AI's answers with the right answers. You'll write this loop in every project.

~~~quiz
? Type exactly what the **last** line prints:
| for i, fruit in enumerate(["apple", "kiwi"]):
|     print(i, fruit)
= 1 kiwi
! Without ~start=1~, enumerate counts from 0: "0 apple", then "1 kiwi".
~~~

~~~quiz
? What does this print?
| a = [1, 2, 3]
| b = [10, 20, 30]
| for x, y in zip(a, b):
|     print(x + y)
+ ~11~, ~22~, ~33~ on three lines
- ~66~
- ~[1, 2, 3, 10, 20, 30]~
- ~11 22 33~ on one line
! zip pairs them up: (1, 10), (2, 20), (3, 30). Each pair is added and printed on its own line.
~~~

## while loops: repeat until something changes
A ~while~ loop keeps going **as long as** its test is true. Use it when you don't know in advance how many rounds you'll need.

~~~python
attempts = 0
while attempts < 3:
    attempts += 1
    print("try", attempts)
print("stopped after", attempts)
# → try 1
# → try 2
# → try 3
# → stopped after 3
~~~

**Scenario: saving up.** How many weeks of saving £35 until you can buy a £200 bike?

~~~python
saved = 0
weeks = 0
while saved < 200:
    saved += 35
    weeks += 1
print(f"{weeks} weeks, saved £{saved}")
# → 6 weeks, saved £210
~~~

**Scenario: a countdown.**

~~~python
n = 3
while n > 0:
    print(n)
    n -= 1
print("Lift off!")
# → 3
# → 2
# → 1
# → Lift off!
~~~

~~~quiz
? Type exactly what the last line prints:
| balance = 100
| years = 0
| while balance < 130:
|     balance += 10
|     years += 1
| print(years)
= 3
! 100 → 110 (1 year) → 120 (2) → 130 (3). Now 130 < 130 is False, so the loop stops: 3 years.
~~~

## break and continue
~break~ leaves a loop early. ~continue~ skips the rest of this round and moves to the next one.

~~~python
tickets = ["refund", "", "bug", "STOP", "praise"]
for t in tickets:
    if not t:
        print("(skipping empty ticket)")
        continue                 # jump straight to the next ticket
    if t == "STOP":
        print("stop signal: leaving the loop")
        break                    # stop the whole loop
    print("handling", t)
# → handling refund
# → (skipping empty ticket)
# → handling bug
# → stop signal: leaving the loop
~~~

"praise" is never handled, because ~break~ ended the loop.

**Scenario: searching a list** and stopping as soon as you find what you want:

~~~python
orders = [{"id": 1, "status": "ok"}, {"id": 2, "status": "lost"}, {"id": 3, "status": "lost"}]
for o in orders:
    if o["status"] == "lost":
        print("First lost order:", o["id"])
        break
# → First lost order: 2
~~~

~~~quiz
? What does this print?
| for n in [1, 2, 3, 4]:
|     if n == 3:
|         break
|     print(n)
+ ~1~ and ~2~
- ~1~, ~2~ and ~3~
- ~1~, ~2~ and ~4~
- ~3~
! When n is 3, ~break~ ends the loop before printing. So only 1 and 2 are printed.
~~~

~~~quiz
? What does this print?
| for n in [1, 2, 3, 4]:
|     if n == 3:
|         continue
|     print(n)
- ~1~ and ~2~
+ ~1~, ~2~ and ~4~
- ~3~
- ~1~, ~2~, ~3~ and ~4~
! ~continue~ skips only the round where n is 3. The loop carries on with 4.
~~~

## The walrus := (store and test in one go)
~~~python
import re
text = "Order #4471 is late"
if (m := re.search(r"#(\d+)", text)):
    print("order id:", m.group(1))
else:
    print("no order number found")
# → order id: 4471
~~~
You'll see it sometimes. Read ~(m := ...)~ as "store the result in m, then check it isn't empty". Here's the same thing without the walrus:

~~~python
import re
text = "Hello, nothing to see"
m = re.search(r"#(\d+)", text)
if m:
    print("order id:", m.group(1))
else:
    print("no order number found")
# → no order number found
~~~

~~~quiz
? What does ~if (n := len(items)) > 3:~ do?
+ Stores the length of items in n, then checks whether it's bigger than 3
- Checks whether n equals the length of items
- Creates a list called n
- It's a syntax error
! ~:=~ stores a value and gives it back in the same step, so you can store and test at once.
~~~

## Common mistakes
- Wrong indentation. Python treats it as meaning, not decoration. Use 4 spaces consistently.
- Forgetting the colon ~:~ at the end of ~if~, ~for~ and ~while~ lines.
- A ~while~ loop that never ends because nothing changes inside it. This is why agents always have a **step budget** (a maximum number of rounds).
- Putting a ~print~ inside the loop when you meant after it (or the other way round). Indentation decides.

~~~python
total = 0
for n in [1, 2, 3]:
    total += n
    print("inside:", total)      # indented: prints every round
print("after:", total)           # not indented: prints once
# → inside: 1
# → inside: 3
# → inside: 6
# → after: 6
~~~

~~~python
# if True
#     print("hi")
# ✗ SyntaxError: expected ':'
if True:
    print("hi")
# → hi
~~~

~~~quiz
? This loop never stops. Why?
| count = 0
| while count < 5:
|     print("working")
| # (skip: this would run forever)
+ Nothing inside the loop changes count, so count < 5 stays True forever
- The colon is missing
- print() can't be used in a loop
- 5 is too big a number
! A while loop needs something inside it that eventually makes the test False, like ~count += 1~.
~~~

## How it looks in the projects
~~~python
MAX_STEPS = 8
for step in range(MAX_STEPS):          # an agent loop with a budget
    print("step", step + 1)
    done = step == 2                   # (pretend the work finishes at step 3)
    if done:
        print("finished after", step + 1, "steps")
        break
else:
    print("budget used up: hand over to a human")   # runs only if the loop never hit break
# → step 1
# → step 2
# → step 3
# → finished after 3 steps
~~~
The ~for ... else~ shape above is exactly how the agents in I02 and A05 stop safely. The ~else~ belongs to the ~for~ and runs only when the loop finished **without** a ~break~: the budget ran out.

~~~python
MAX_STEPS = 3
for step in range(MAX_STEPS):
    print("step", step + 1, "- still not done")
else:
    print("budget used up: hand over to a human")
# → step 1 - still not done
# → step 2 - still not done
# → step 3 - still not done
# → budget used up: hand over to a human
~~~

~~~quiz
? When does the ~else~ of a ~for ... else~ run?
- Every time the loop runs
- Only when the list is empty
+ Only when the loop finishes without hitting break
- Only when there's an error
! It's the "we never found it / never finished" branch: if break happens, else is skipped.
~~~

## Try it in your head

~~~quiz
? **Scenario: a lift (elevator) display.** Type exactly what the last line prints:
| floor = 0
| for button in ["up", "up", "down", "up"]:
|     floor += 1 if button == "up" else -1
| print("Floor", floor)
= Floor 2
! up, up, down, up: +1 +1 -1 +1 = 2.
~~~

~~~quiz
? **Scenario: a password checker.** What does this print?
| password = "abc"
| if len(password) < 8:
|     print("too short")
| elif password.isdigit():
|     print("numbers only")
| else:
|     print("ok")
+ ~too short~
- ~numbers only~
- ~ok~
- ~too short~ and ~ok~
! The first test (length under 8) is True, so Python prints "too short" and skips the rest.
~~~

~~~quiz
? **Scenario: counting long words.** Type exactly what this prints:
| count = 0
| for w in ["hi", "hello", "hey", "greetings"]:
|     if len(w) > 3:
|         count += 1
| print(count)
= 2
! Only "hello" (5) and "greetings" (9) are longer than 3 letters.
~~~
`,
    practice: [
      { q: "What does range(2, 5) give you?", a: "2, 3, 4 — it stops before the end number." },
      { q: "Why do agent loops use for step in range(MAX_STEPS) instead of while True?", a: "So the loop can never run forever. The budget guarantees it stops, and the code can hand over to a human when it runs out." },
      { q: "How would you loop over two lists, predictions and answers, at the same time?", a: "for p, a in zip(predictions, answers): ..." },
      { q: "Scenario: a shop gives 10% off orders over £100 and 20% off orders over £500. In what order should the if/elif tests go, and why?", a: "Test > 500 first, then > 100. Python stops at the first true test, so if > 100 came first, a £600 order would only get 10%." },
      { q: "Scenario: you loop over 1,000 emails looking for the first one from the boss. Which keyword stops the loop as soon as you find it?", a: "break." },
      { q: "What does this print? for i in range(3): print(i * i)", a: "0, 1 and 4, each on its own line." },
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

You've already used lots of functions that Python gives you:

~~~python
print(len("hello"))          # len is a function: input "hello", output 5
print(max(3, 9, 4))          # max: inputs 3, 9, 4, output 9
print(round(2.567, 1))       # round: inputs 2.567 and 1, output 2.6
print(abs(-7))               # abs: distance from zero
# → 5
# → 9
# → 2.6
# → 7
~~~

Now you'll write your own.

~~~quiz
? In ~len("pizza")~, what is the input and what is the output?
+ Input "pizza", output 5
- Input 5, output "pizza"
- Input len, output pizza
- There is no output
! The value in brackets is the input. len hands back the number of characters: 5.
~~~

## Writing and calling a function
~~~python
def greet(name):
    return f"Hello, {name}!"

print(greet("Dana"))
print(greet("Sam"))
message = greet("Lee")       # store the result to use later
print(message.upper())
# → Hello, Dana!
# → Hello, Sam!
# → HELLO, LEE!
~~~

- ~def~ starts the definition. The indented lines are the body.
- ~name~ is the **parameter**: a blank to be filled in. ~"Dana"~ is the **argument**: what you fill it with.
- ~return~ hands a result back to whoever called the function and **ends** the function.
- Defining a function does nothing on its own. It's only a recipe card until you **call** it with brackets.

**Default values** let you leave an input out:

~~~python
def add_tax(price, rate=0.2):
    """Return the price including tax."""     # a docstring: a short note describing the function
    return price * (1 + rate)

print(add_tax(100))              # rate uses its default, 0.2
print(add_tax(100, 0.05))        # rate given by position
print(add_tax(100, rate=0.5))    # rate given by name: clearer
print(add_tax(rate=0.1, price=50))   # named inputs can go in any order
# → 120.0
# → 105.0
# → 150.0
# → 55.00000000000001
~~~

(That last odd ~55.00000000000001~ is the float rounding from lesson 2. Real code rounds money with ~round(x, 2)~.)

**Scenario: a tip calculator** used for three different bills:

~~~python
def tip(bill, percent=15):
    return round(bill * percent / 100, 2)

print(tip(40))
print(tip(40, 20))
print(tip(18.50, percent=10))
# → 6.0
# → 8.0
# → 1.85
~~~

**Scenario: a function with a decision inside.**

~~~python
def shipping_cost(weight_kg):
    if weight_kg <= 1:
        return 3.0
    elif weight_kg <= 5:
        return 6.5
    return 12.0                  # reached only if both tests above failed

for w in [0.5, 3, 20]:
    print(w, "kg →", shipping_cost(w))
# → 0.5 kg → 3.0
# → 3 kg → 6.5
# → 20 kg → 12.0
~~~

~~~quiz
? Type exactly what this prints:
| def double(x):
|     return x * 2
| print(double(7) + 1)
= 15
! ~double(7)~ gives back 14, then ~+ 1~ makes 15.
~~~

~~~quiz
? What does this print?
| def welcome(name, place="the lab"):
|     return f"Welcome to {place}, {name}"
| print(welcome("Ana"))
+ ~Welcome to the lab, Ana~
- ~Welcome to Ana, the lab~
- ~Welcome to place, name~
- An error: place is missing
! ~place~ wasn't given, so it uses its default "the lab".
~~~

## return vs print
This confuses almost every beginner. ~print~ **shows** a value on the screen. ~return~ **hands** the value back so the code can keep using it. A function with no ~return~ gives back ~None~.

~~~python
def area_print(w, h):
    print(w * h)                 # shows it, but hands back nothing

def area_return(w, h):
    return w * h                 # hands it back

a = area_print(3, 4)             # prints 12 while running...
b = area_return(3, 4)            # prints nothing
print("a is", a)                 # ...but a got nothing back
print("b is", b)
print("double b:", b * 2)        # b can be used in more maths
# → 12
# → a is None
# → b is 12
# → double b: 24
~~~

Like a calculator: ~print~ is the display, ~return~ is the "memory" button. You can only do more maths with what's in memory.

~return~ also **ends** the function at once. Anything after it is skipped:

~~~python
def check_age(age):
    if age < 18:
        return "too young"
    return "welcome"
    print("this line never runs")

print(check_age(15))
print(check_age(30))
# → too young
# → welcome
~~~

~~~quiz
? What does this print?
| def add(a, b):
|     a + b
| print(add(2, 3))
- ~5~
+ ~None~
- ~a + b~
- An error
! The function works out a + b but never returns it, so it gives back None. It should be ~return a + b~.
~~~

~~~quiz
? Type exactly what this prints:
| def first_letter(word):
|     return word[0]
|     return word[-1]
| print(first_letter("cat"))
= c
! The first ~return~ ends the function immediately, so the second one never runs.
~~~

## Type hints: labels on the inputs and outputs
~~~python
def route_ticket(category: str, confidence: float) -> str:
    if confidence < 0.6:
        return "human-review"
    return f"queue-{category}"

print(route_ticket("billing", 0.9))
print(route_ticket("billing", 0.3))
# → queue-billing
# → human-review
~~~

~category: str~ means "this should be text", and ~-> str~ means "this returns text". Python doesn't enforce them, but they tell readers (and your editor) what goes in and out. Like the labels on a **plug socket** showing which plug fits. The projects use them everywhere.

~~~python
def is_big_order(total: float, limit: float = 500.0) -> bool:
    return total > limit

def tags_for(text: str) -> list[str]:
    return [w for w in ["refund", "late", "broken"] if w in text]

print(is_big_order(720.0))
print(tags_for("my parcel is late and broken"))
# → True
# → ['late', 'broken']
~~~

~~~quiz
? What does ~def total(prices: list[float]) -> float:~ tell you?
+ It takes a list of decimal numbers and gives back one decimal number
- It takes one decimal number and gives back a list
- It only works with exactly two prices
- It prints the total
! ~prices: list[float]~ labels the input; ~-> float~ labels what comes back.
~~~

## Returning several values
~~~python
def min_max(numbers: list[float]) -> tuple[float, float]:
    return min(numbers), max(numbers)

low, high = min_max([3.0, 9.5, 1.2])   # unpack the two results
print(low, high)
print(min_max([7, 2]))                 # without unpacking you see the tuple
# → 1.2 9.5
# → (2, 7)
~~~

**Scenario: splitting a bill** gives back two answers at once:

~~~python
def split_bill(total: float, people: int) -> tuple[float, float]:
    each = round(total / people, 2)
    leftover = round(total - each * people, 2)
    return each, leftover

each, leftover = split_bill(100, 3)
print(f"Each pays £{each}, leftover £{leftover}")
# → Each pays £33.33, leftover £0.01
~~~

~~~quiz
? Type exactly what this prints:
| def stats(nums):
|     return sum(nums), len(nums)
| s, n = stats([4, 6, 8])
| print(s / n)
= 6.0
! The function returns 18 and 3. ~18 / 3~ is 6.0.
~~~

## Tiny functions: lambda, and sorting with key=
A ~lambda~ is a one-line function with no name, mostly used to tell ~sorted~ **what to sort by**:

~~~python
docs = [{"title": "A", "score": 0.4}, {"title": "B", "score": 0.9}, {"title": "C", "score": 0.7}]
best_first = sorted(docs, key=lambda d: d["score"], reverse=True)
print([d["title"] for d in best_first])
print(best_first[0]["title"])
# → ['B', 'C', 'A']
# → B
~~~

Read ~key=lambda d: d["score"]~ as "sort the documents by their score". Like telling someone sorting post "order these by postcode, not by name".

~~~python
words = ["banana", "fig", "apple"]
print(sorted(words))                     # alphabetical
print(sorted(words, key=len))            # by length (len is already a function)
print(max(words, key=len))               # the longest
square = lambda n: n * n                 # a lambda stored in a name (rare, but legal)
print(square(6))
# → ['apple', 'banana', 'fig']
# → ['fig', 'apple', 'banana']
# → banana
# → 36
~~~

**Scenario: the cheapest flight.**

~~~python
flights = [("Lisbon", 89), ("Rome", 54), ("Oslo", 120)]
cheapest = min(flights, key=lambda f: f[1])
print("Cheapest:", cheapest[0], cheapest[1])
# → Cheapest: Rome 54
~~~

~~~quiz
? What does this print?
| people = [("Ana", 31), ("Bo", 25), ("Cy", 40)]
| youngest = min(people, key=lambda p: p[1])
| print(youngest[0])
+ ~Bo~
- ~Ana~
- ~25~
- ~Cy~
! ~key=lambda p: p[1]~ compares people by their age (position 1). The smallest age is Bo's, 25.
~~~

## Things defined at the top of a file
Objects created once at the top of a file (not inside a function) are shared by every function in it. The projects do this for expensive things like the AI client, or for a shared cache:

~~~python
CACHE: dict[str, str] = {}             # one shared dictionary for the whole file

def remember(key: str, value: str) -> None:
    CACHE[key] = value

def recall(key: str) -> str:
    return CACHE.get(key, "(not found)")

remember("capital_fr", "Paris")
print(recall("capital_fr"))
print(recall("capital_de"))
print(CACHE)
# → Paris
# → (not found)
# → {'capital_fr': 'Paris'}
~~~

Like the office coffee machine: bought once, used by everyone, instead of buying a new one per cup.

**But names created inside a function stay inside it:**

~~~python
def make_total():
    total = 99          # a "local" name: it only exists while the function runs
    return total

result = make_total()
print(result)
# print(total)
# ✗ NameError: name 'total' is not defined
# → 99
~~~

~~~quiz
? A variable is created inside a function. Can code outside the function use it by name?
- Yes, always
+ No: it only exists inside the function. Return it if the outside needs it.
- Only if it's a number
- Only after the function is called twice
! Names inside a function are local, like notes on a whiteboard in a meeting room that get wiped when the meeting ends. Use return to take the result out.
~~~

## Common mistakes
- Forgetting ~return~, so the function gives back ~None~.
- Calling a function without brackets: ~add_tax~ is the recipe card itself; ~add_tax(100)~ actually cooks.
- Giving the wrong number of inputs.
- Functions that do too much. Good project code has many small functions, each with one job.

~~~python
def add_tax(price, rate=0.2):
    return price * (1 + rate)

print(add_tax)                 # the card itself, not a result
print(add_tax(10))             # cooking with the card
# add_tax()
# ✗ TypeError: add_tax() missing 1 required positional argument: 'price'
# → <function add_tax at 0x7f...>   (the number varies)
# → 12.0
~~~

~~~quiz
? You see ~<function total at 0x10a2b3c40>~ printed instead of a number. What did you forget?
+ The brackets: you wrote print(total) instead of print(total(...))
- The return line
- To import the function
- A type hint
! Without brackets you're printing the recipe card itself. Brackets mean "run it now".
~~~

## How it looks in the projects
~~~python
def needs_human(confidence: float, amount: float, threshold: float = 0.8) -> bool:
    """Plain code decides: low confidence or big money goes to a person."""
    return confidence < threshold or amount > 10_000

print(needs_human(0.95, 500))
print(needs_human(0.95, 25_000))
print(needs_human(0.5, 500))
# → False
# → True
# → True
~~~
Small, typed, documented functions like this are the **deterministic shell** around the AI in every project. (~10_000~ is just 10000 written with a separator for readability.)

~~~quiz
? Type exactly what ~needs_human(0.9, 500, threshold=0.95)~ returns, using the function above.
| def needs_human(confidence, amount, threshold=0.8):
|     return confidence < threshold or amount > 10_000
| print(needs_human(0.9, 500, threshold=0.95))
= True
! With a stricter threshold of 0.95, a confidence of 0.9 is too low, so a human checks it.
~~~

## Try it in your head

~~~quiz
? **Scenario: a temperature converter.** Type exactly what this prints:
| def to_fahrenheit(c):
|     return c * 9 / 5 + 32
| print(to_fahrenheit(100))
= 212.0
! 100 × 9 = 900, ÷ 5 = 180.0, + 32 = 212.0.
~~~

~~~quiz
? **Scenario: a discount function.** What does this print?
| def final_price(price, member=False):
|     if member:
|         return price * 0.9
|     return price
| print(final_price(50), final_price(50, member=True))
+ ~50 45.0~
- ~45.0 50~
- ~50 50~
- ~45.0 45.0~
! The first call isn't a member, so it returns 50. The second gets 10% off: 45.0.
~~~

~~~quiz
? **Scenario: a leaderboard.** Type exactly what this prints:
| scores = {"Ana": 40, "Bo": 75, "Cy": 60}
| print(max(scores, key=lambda name: scores[name]))
= Bo
! Looping over a dict gives its keys (names). ~key=~ compares them by their score, and Bo's 75 is the biggest.
~~~
`,
    practice: [
      { q: "What does a function return if it has no return line?", a: "None." },
      { q: "In def classify(text: str) -> Label:, what do ': str' and '-> Label' mean?", a: "Type hints: the input text should be a string, and the function returns a Label. They document the function; Python doesn't enforce them." },
      { q: "How would you sort a list of tickets by their 'created' field, newest first?", a: "sorted(tickets, key=lambda t: t[\"created\"], reverse=True)" },
      { q: "Scenario: write a function is_weekend(day: str) -> bool that returns True for \"Sat\" and \"Sun\".", a: "def is_weekend(day: str) -> bool:\n    return day in (\"Sat\", \"Sun\")" },
      { q: "What's the difference between print(x) and return x inside a function?", a: "print shows x on the screen but hands nothing back (the call gives None). return hands x back to the caller so the code can keep using it, and ends the function." },
      { q: "Scenario: def area(w, h=1): return w * h. What do area(5), area(5, 2) and area(h=3, w=2) give?", a: "5, 10 and 6." },
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

~~~python
prices = [10, 25, 40]
with_tax = [p * 1.2 for p in prices]      # transform every item
print(with_tax)
# → [12.0, 30.0, 48.0]
~~~

~~~quiz
? Type exactly what this prints:
| print([n * 10 for n in [1, 2, 3]])
= [10, 20, 30]
! "For each n in the list, keep n * 10."
~~~

## List comprehensions
~~~python
scores = [0.9, 0.4, 0.75, 0.2]

# the long way
passed = []
for s in scores:
    if s >= 0.5:
        passed.append(s)
print(passed)

# the comprehension: [what to keep  for each item  if a test]
passed = [s for s in scores if s >= 0.5]
print(passed)
# → [0.9, 0.75]
# → [0.9, 0.75]
~~~

Read it out loud from the middle: "**for each** s **in** scores, **if** s ≥ 0.5, **keep** s."

There are three shapes. Filter only, transform only, or both:

~~~python
nums = [1, 2, 3, 4, 5, 6]
print([n for n in nums if n % 2 == 0])        # filter: only even numbers
print([n * n for n in nums])                  # transform: square every number
print([n * n for n in nums if n % 2 == 0])    # both: square only the even ones
# → [2, 4, 6]
# → [1, 4, 9, 16, 25, 36]
# → [4, 16, 36]
~~~

**Scenario: cleaning messy input** from a form:

~~~python
texts = ["  Hi ", "REFUND ", " bug", "   "]
cleaned = [t.strip().lower() for t in texts]
print(cleaned)
non_empty = [t.strip().lower() for t in texts if t.strip()]
print(non_empty)
# → ['hi', 'refund', 'bug', '']
# → ['hi', 'refund', 'bug']
~~~

**Scenario: pulling one field out of a list of records.**

~~~python
orders = [
    {"id": 1, "total": 25.0, "paid": True},
    {"id": 2, "total": 80.0, "paid": False},
    {"id": 3, "total": 12.5, "paid": True},
]
print([o["id"] for o in orders])                       # just the ids
print([o["id"] for o in orders if not o["paid"]])      # ids of unpaid orders
print(sum(o["total"] for o in orders if o["paid"]))    # money already received
# → [1, 2, 3]
# → [2]
# → 37.5
~~~

**Choosing between two values** for each item uses the one-line ~if/else~ from lesson 5, placed at the **front**:

~~~python
scores = [0.9, 0.4, 0.75]
print(["pass" if s >= 0.5 else "fail" for s in scores])
# → ['pass', 'fail', 'pass']
~~~

~~~quiz
? Type exactly what this prints:
| words = ["sun", "moon", "star"]
| print([w.upper() for w in words if len(w) == 4])
= ['MOON', 'STAR']
! Keep only 4-letter words (moon, star), and make each one uppercase.
~~~

~~~quiz
? Which comprehension gives the names of people older than 30?
| people = [{"name": "Ana", "age": 31}, {"name": "Bo", "age": 25}]
| # (skip)
+ ~[p["name"] for p in people if p["age"] > 30]~
- ~[p["age"] > 30 for p in people]~
- ~[p for p["name"] in people if age > 30]~
- ~[people["name"] if people["age"] > 30]~
! What to keep (the name) for each person (p in people), if a test (their age over 30).
~~~

~~~quiz
? What does this print?
| print(["even" if n % 2 == 0 else "odd" for n in [3, 4]])
+ ~['odd', 'even']~
- ~['even', 'odd']~
- ~[False, True]~
- ~['odd']~
! 3 is odd, 4 is even. The if/else at the front picks a word for every item; nothing is filtered out.
~~~

## Dict and set comprehensions
Curly brackets with ~key: value~ build a dict; curly brackets with just a value build a set.

~~~python
names = ["billing", "bug"]
lengths = {n: len(n) for n in names}       # a dict: name → its length
print(lengths)
unique_words = {w.lower() for w in ["A", "a", "B"]}   # a set
print(sorted(unique_words))
# → {'billing': 7, 'bug': 3}
# → ['a', 'b']
~~~

**Scenario: a price list with a sale.** Make a new dict with every price 20% off:

~~~python
prices = {"shirt": 20.0, "hat": 15.0, "socks": 5.0}
sale = {item: round(p * 0.8, 2) for item, p in prices.items()}
print(sale)
cheap = {item: p for item, p in prices.items() if p < 16}
print(cheap)
# → {'shirt': 16.0, 'hat': 12.0, 'socks': 4.0}
# → {'hat': 15.0, 'socks': 5.0}
~~~

**Scenario: looking things up by id.** Turn a list of records into a dict so you can find any one instantly:

~~~python
users = [{"id": "u1", "name": "Ana"}, {"id": "u2", "name": "Bo"}]
by_id = {u["id"]: u for u in users}
print(by_id["u2"]["name"])
# → Bo
~~~

~~~quiz
? Type exactly what this prints:
| print({n: n * n for n in [2, 3]})
= {2: 4, 3: 9}
! Each number becomes a key, and its square becomes the value.
~~~

## Generator expressions: compute as you go
Write it with round brackets inside ~sum~, ~any~, ~all~, ~max~ or ~next~, and Python doesn't build the whole list first:

~~~python
results = [{"ok": True}, {"ok": False}, {"ok": True}]
print(sum(1 for r in results if r["ok"]))   # count the passes
print(all(r["ok"] for r in results))        # did everything pass?
print(any(not r["ok"] for r in results))    # did anything fail?
# → 2
# → False
# → True
~~~

- ~any(...)~: "is **at least one** True?" Like asking a room "has anyone got a pen?"
- ~all(...)~: "is **every** one True?" Like a pilot's checklist: one unticked box and you don't take off.

**Scenario: checking a form before saving it.**

~~~python
form = {"name": "Dana", "email": "dana@example.com", "phone": ""}
print("all filled?", all(v for v in form.values()))
print("anything filled?", any(v for v in form.values()))
print("empty fields:", [k for k, v in form.items() if not v])
# → all filled? False
# → anything filled? True
# → empty fields: ['phone']
~~~

**Scenario: true counts as 1.** Adding up ~True~/~False~ values counts the ~True~ ones:

~~~python
answers = ["yes", "no", "yes", "yes"]
print(sum(a == "yes" for a in answers))
print(True + True + False)
# → 3
# → 2
~~~

~~~quiz
? Type exactly what this prints:
| print(any(x > 10 for x in [3, 12, 5]))
= True
! At least one number (12) is bigger than 10.
~~~

~~~quiz
? What does this print?
| temps = [18, 21, 25]
| print(all(t > 20 for t in temps))
- ~True~
+ ~False~
- ~[False, True, True]~
- ~2~
! ~all~ needs every one to pass, and 18 is not above 20.
~~~

## yield: functions that hand out items one at a time
~~~python
def chunks(text: str, size: int):
    for start in range(0, len(text), size):
        yield text[start:start + size]      # hand out one piece, then pause here

for piece in chunks("abcdefgh", 3):
    print(piece)
print(list(chunks("hello world", 5)))       # list() collects every piece at once
# → abc
# → def
# → gh
# → ['hello', ' worl', 'd']
~~~

A function with ~yield~ is like a **ticket dispenser**: each pull gives you the next ticket, and it doesn't print all of them at once. The projects use this to split long documents into pieces (**chunking**) without loading everything into memory.

**Scenario: watching it pause.** Each ~next()~ runs the function only until the next ~yield~:

~~~python
def countdown():
    print("(starting)")
    yield 3
    yield 2
    yield 1

gen = countdown()
print("made the generator, nothing ran yet")
print(next(gen))
print(next(gen))
print(next(gen))
# → made the generator, nothing ran yet
# → (starting)
# → 3
# → 2
# → 1
~~~

~~~quiz
? Type exactly what this prints:
| def evens(limit):
|     for n in range(0, limit, 2):
|         yield n
| print(list(evens(7)))
= [0, 2, 4, 6]
! ~range(0, 7, 2)~ gives 0, 2, 4, 6, and each one is yielded. ~list()~ collects them all.
~~~

## Common mistakes
- Cramming too much into one comprehension. If it needs two ~if~s and a nested loop, a normal ~for~ loop is clearer.
- Expecting a generator to work twice. Once it has handed out every item, it's empty.
- Using square brackets when you only need a count or a yes/no: ~sum(1 for ...)~ doesn't need a list.

~~~python
gen = (n * 2 for n in [1, 2, 3])
print(list(gen))
print(list(gen))          # already used up: empty the second time
# → [2, 4, 6]
# → []
~~~

~~~quiz
? A generator gave you all its items once. What happens if you loop over it again?
- It starts again from the beginning
+ You get nothing: it's used up
- It crashes with an error
- It gives the items in reverse
! Like a ticket dispenser that has run out. Make a new generator (or use a list) if you need the items twice.
~~~

## How it looks in the projects
~~~python
cases = [{"expected": "billing", "got": "billing"}, {"expected": "bug", "got": "other"}]
failures = [c for c in cases if c["got"] != c["expected"]]
accuracy = sum(c["got"] == c["expected"] for c in cases) / len(cases)
print(len(failures), f"{accuracy:.0%}")
print(failures)
# → 1 50%
# → [{'expected': 'bug', 'got': 'other'}]
~~~
These two lines (find the failures, compute the score) appear in nearly every **eval** in the lab. (~True~ counts as 1 when you add it up, which is why the ~sum~ works.)

~~~quiz
? In the code above, what would ~accuracy~ be if both cases were correct?
- 0.5
+ 1.0 (shown as 100%)
- 2
- 0
! Two correct out of two: 2 / 2 = 1.0, which ~:.0%~ shows as 100%.
~~~

## Try it in your head

~~~quiz
? **Scenario: a guest list.** Type exactly what this prints:
| rsvps = {"Ana": "yes", "Bo": "no", "Cy": "yes"}
| print([name for name, r in rsvps.items() if r == "yes"])
= ['Ana', 'Cy']
! Keep each name whose answer is "yes".
~~~

~~~quiz
? **Scenario: a shopping basket.** What does this print?
| basket = [("apple", 0.5, 4), ("bread", 1.2, 1)]
| print(sum(price * qty for name, price, qty in basket))
+ ~3.2~
- ~1.7~
- ~5~
- ~[2.0, 1.2]~
! Each line is unpacked into name, price, qty. 0.5×4 = 2.0 and 1.2×1 = 1.2. Total 3.2.
~~~

~~~quiz
? **Scenario: spotting problems.** Type exactly what this prints:
| statuses = ["ok", "ok", "error", "ok"]
| print(statuses.count("ok"), any(s == "error" for s in statuses))
= 3 True
! Three "ok"s, and at least one "error".
~~~
`,
    practice: [
      { q: "Rewrite as a comprehension: out = [] / for t in tickets: if t[\"priority\"] == \"high\": out.append(t[\"id\"])", a: "out = [t[\"id\"] for t in tickets if t[\"priority\"] == \"high\"]" },
      { q: "What does any(x > 10 for x in [3, 12, 5]) return?", a: "True — at least one number is bigger than 10." },
      { q: "Why might a document-splitting function use yield instead of returning a list?", a: "It hands out one chunk at a time, so a huge document doesn't need all its chunks in memory at once." },
      { q: "Scenario: emails = [\"A@x.com\", \"b@Y.com\"]. Write a comprehension that lowercases them all.", a: "[e.lower() for e in emails] gives ['a@x.com', 'b@y.com']." },
      { q: "Scenario: you have prices = {\"tea\": 2, \"cake\": 4}. Build a dict with every price doubled.", a: "{k: v * 2 for k, v in prices.items()} gives {'tea': 4, 'cake': 8}." },
      { q: "What do these print: [c for c in \"hey\"], sum(n for n in range(4)), all([])?", a: "['h', 'e', 'y'], 6 (0+1+2+3), and True (nothing failed in an empty list)." },
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

**Scenario: two files in one folder.**

~~~python
# (example: two separate files)
# --- file: pricing.py ---
# def with_vat(price):
#     return round(price * 1.2, 2)

# --- file: shop.py ---
# from pricing import with_vat
# print(with_vat(10))
# → 12.0                ← what you see when you run: python3 shop.py
~~~

~~~quiz
? In ~from pricing import with_vat~, what is ~pricing~?
+ A file called pricing.py in the same project
- A built-in Python command
- A variable
- A website
! ~from X import Y~ means "from the module X (the file X.py, or an installed package), borrow Y".
~~~

## Importing
~~~python
import math                          # bring in a whole module; use it as math.something
from datetime import date, timedelta # bring in specific names
import statistics as stats           # give it a shorter nickname

print(math.sqrt(16))
print(math.pi)
print(date(2026, 10, 4) + timedelta(days=7))   # a week after 4 Oct 2026
print(stats.mean([2, 4, 9]))
# → 4.0
# → 3.141592653589793
# → 2026-10-11
# → 5
~~~

Three ways to import, and how you then use the tool:

| You write | Then you use it as |
|---|---|
| ~import json~ | ~json.loads(text)~ |
| ~from json import loads~ | ~loads(text)~ |
| ~import statistics as stats~ | ~stats.mean(nums)~ |

In the projects, ~from llm import call_model~ means "from my own file ~llm.py~, borrow the function ~call_model~".

~~~quiz
? Type exactly what this prints:
| import math
| print(math.floor(7.9))
= 7
! ~math.floor~ rounds down to the whole number below.
~~~

~~~quiz
? After ~from random import choice~, how do you call it?
- ~random.choice(items)~
+ ~choice(items)~
- ~random(choice, items)~
- ~import.choice(items)~
! ~from ... import choice~ brings the name ~choice~ itself in, so you use it directly. ~random.choice~ is the spelling after ~import random~.
~~~

## The "main guard"
~~~python
def main():
    print("running the script")

if __name__ == "__main__":
    main()
# → running the script
~~~
This means: "run ~main()~ only when this file is started directly (~python3 eval.py~), not when another file imports it". Like a **demo button** on a kitchen appliance: it runs when you press it in the shop, not every time the appliance is plugged into a bigger kitchen.

~__name__~ is a hidden variable Python fills in for every file:

~~~python
print(__name__)
# → __main__        ← when you run this file directly; if another file imports it, it's the file's name instead
~~~

~~~quiz
? Another file does ~import eval~. Does the code inside ~if __name__ == "__main__":~ in eval.py run?
- Yes, always
+ No: it only runs when eval.py is started directly
- Only if there's an error
- Only on Windows
! When imported, ~__name__~ is "eval", not "__main__", so the guarded code is skipped.
~~~

## json: how data travels
JSON is text that looks like Python dicts and lists. It's how data travels between programs and AI models.

~~~python
import json
data = {"label": "billing", "confidence": 0.92, "urgent": False, "tags": ["refund"]}
text = json.dumps(data)                 # dict → JSON text
print(text)
print(type(text))
back = json.loads(text)                 # JSON text → dict
print(back["label"], back["tags"][0])
# → {"label": "billing", "confidence": 0.92, "urgent": false, "tags": ["refund"]}
# → <class 'str'>
# → billing refund
~~~

Notice the small differences in JSON text: ~false~ (not ~False~), double quotes only, ~null~ for ~None~.

~~~python
import json
print(json.dumps({"a": None, "b": True}))
print(json.dumps({"name": "Dana", "age": 31}, indent=2))    # indent= makes it readable
# → {"a": null, "b": true}
# → {
# →   "name": "Dana",
# →   "age": 31
# → }
~~~

**Scenario: the AI answered with JSON text.** Turn it into a dict and use it:

~~~python
import json
ai_reply = '{"sentiment": "negative", "score": 0.12}'
result = json.loads(ai_reply)
if result["score"] < 0.3:
    print("Unhappy customer:", result["sentiment"])
# → Unhappy customer: negative
~~~

~~~quiz
? Type exactly what this prints:
| import json
| print(json.dumps({"ok": True}))
= {"ok": true}
! In JSON, True is written in lowercase: true.
~~~

~~~quiz
? What does ~json.loads('{"n": 5}')["n"] + 1~ give?
+ ~6~
- ~"51"~
- An error
- ~{"n": 6}~
! ~json.loads~ turns the text into a dict with a real number 5 inside, so ~+ 1~ gives 6.
~~~

## Counter and defaultdict: counting and grouping
~~~python
from collections import Counter, defaultdict
labels = ["bug", "billing", "bug", "praise", "bug"]
counts = Counter(labels)
print(counts)
print(counts["bug"])
print(counts["refund"])                 # missing labels count as 0 (no crash)
print(counts.most_common(2))            # the top 2
# → Counter({'bug': 3, 'billing': 1, 'praise': 1})
# → 3
# → 0
# → [('bug', 3), ('billing', 1)]
~~~

**Scenario: the most common words in reviews.**

~~~python
from collections import Counter
reviews = "great food great staff slow service great view"
print(Counter(reviews.split()).most_common(1))
# → [('great', 3)]
~~~

**defaultdict** is a dict that creates an empty starting value for any new key, so grouping takes one line:

~~~python
from collections import defaultdict
groups = defaultdict(list)              # new keys start as an empty list
for name, team in [("Ana", "ops"), ("Bo", "ops"), ("Cy", "dev")]:
    groups[team].append(name)
print(dict(groups))
# → {'ops': ['Ana', 'Bo'], 'dev': ['Cy']}
~~~

~~~quiz
? Type exactly what this prints:
| from collections import Counter
| print(Counter("banana")["a"])
= 3
! Counter on a string counts each letter: b once, a three times, n twice.
~~~

## re: finding patterns in text
**re** (regular expressions) finds patterns in text, like order numbers or emails.

~~~python
import re
text = "Call 555-0142 about order #A-7781 or #B-1200"
print(re.findall(r"#([A-Z]-\d+)", text))      # every match: the part in brackets
print(bool(re.search(r"\d{3}-\d{4}", text)))  # is there something like a phone number?
print(re.sub(r"\d", "*", "PIN 4821"))          # replace every digit with *
# → ['A-7781', 'B-1200']
# → True
# → PIN ****
~~~
A regex is a **search pattern**: ~\d~ means "a digit", ~+~ means "one or more", ~{3}~ means "exactly 3", and the brackets mark the part you want back. You only need to *read* simple ones, and each project explains its patterns.

| Piece | Means | Matches |
|---|---|---|
| ~\d~ | one digit | 7 |
| ~\d+~ | one or more digits | 7781 |
| ~\d{4}~ | exactly four digits | 2026 |
| ~[A-Z]~ | one capital letter | B |
| ~\w+~ | a word (letters, digits, _) | order |
| ~( )~ | "give me this part back" | |

**Scenario: pulling all prices out of an email.**

~~~python
import re
email = "The hotel was £120 per night, plus £15 breakfast and £8 parking."
amounts = [int(a) for a in re.findall(r"£(\d+)", email)]
print(amounts, "total", sum(amounts))
# → [120, 15, 8] total 143
~~~

~~~quiz
? Type exactly what this prints:
| import re
| print(re.findall(r"\d+", "3 cats and 12 dogs"))
= ['3', '12']
! ~\d+~ finds each run of digits. The results are text, so they're in quotes.
~~~

## Other standard tools you'll meet
~~~python
from datetime import date, datetime
from pathlib import Path
import hashlib, uuid, time

d = date(2026, 10, 4)
print(d.strftime("%d %b %Y"))                     # format a date
print((date(2026, 12, 25) - d).days, "days to go") # subtract dates
print(datetime(2026, 10, 4, 9, 30).isoformat())   # standard date-time text
print(Path("reports/2026/q3.pdf").suffix)         # a file's extension
print(Path("reports/2026/q3.pdf").name)           # its name
print(hashlib.sha256(b"hello").hexdigest()[:12])  # a fingerprint of some text: always the same for the same text
print(len(str(uuid.uuid4())))                     # a random unique id is 36 characters long
start = time.perf_counter()                        # a stopwatch
print("timing works:", time.perf_counter() >= start)
# → 04 Oct 2026
# → 82 days to go
# → 2026-10-04T09:30:00
# → .pdf
# → q3.pdf
# → 2cf24dba5fb0
# → 36
# → timing works: True
~~~

Also: ~random~ (random choices), ~logging~ (writing a diary of what the program did), ~os~ (environment variables, lesson 1).

~~~quiz
? Type exactly what this prints:
| from pathlib import Path
| print(Path("data/golden.jsonl").suffix)
= .jsonl
! ~.suffix~ gives the file extension, including the dot.
~~~

## Common mistakes
- Naming your own file ~json.py~ or ~anthropic.py~. Python then imports *your* file instead of the real library.
- Circular imports: two files importing each other. Keep a clear "who uses whom" direction.
- Using a name without importing it first.

~~~python
# print(math.sqrt(9))          (forgot "import math")
# ✗ NameError: name 'math' is not defined
import math
print(math.sqrt(9))
# → 3.0
~~~

~~~quiz
? You named your file ~json.py~ and now ~json.dumps~ fails with ~AttributeError: module 'json' has no attribute 'dumps'~. Why?
+ Python imported your own json.py instead of the real json module
- json is broken
- dumps was removed from Python
- You need to pip install json
! Python looks in your folder first. Rename your file (e.g. to ~my_json_tools.py~).
~~~

## How it looks in the projects
~~~python
import hashlib, json
def cache_key(prompt: str, model: str) -> str:
    raw = json.dumps({"p": prompt, "m": model}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]

print(cache_key("hello", "claude-haiku-4-5"))
print(cache_key("hello", "claude-haiku-4-5"))   # the same inputs always give the same key
print(cache_key("hello!", "claude-haiku-4-5"))  # a tiny change gives a totally different key
# → 6b55500d913dbbe9
# → 6b55500d913dbbe9
# → 6b75d793e058e6ec
~~~
The projects use this to **cache** AI answers: if the exact same question comes again, reuse the saved answer instead of paying for a new call.

~~~quiz
? Why does the same prompt always give the same cache key?
+ A hash (fingerprint) of the same text is always the same
- Python remembers the last key
- The key is random but lucky
- Because of sort_keys only
! A hash is like a fingerprint: same text in, same fingerprint out. Any change, even one character, gives a different one.
~~~

## Try it in your head

~~~quiz
? **Scenario: counting colours.** Type exactly what this prints:
| from collections import Counter
| print(Counter(["red", "blue", "red"]).most_common(1)[0][0])
= red
! most_common(1) gives [('red', 2)]. [0] is the pair ('red', 2), and [0] again is 'red'.
~~~

~~~quiz
? **Scenario: a holiday countdown.** Type exactly what this prints:
| from datetime import date
| print((date(2026, 8, 1) - date(2026, 7, 25)).days)
= 7
! Subtracting two dates gives the gap; ~.days~ is the number of days in it.
~~~

~~~quiz
? **Scenario: reading the AI's answer.** What does this print?
| import json
| reply = json.loads('{"items": ["tea", "milk"], "total": 3.5}')
| print(len(reply["items"]), reply["total"] * 2)
+ ~2 7.0~
- ~2 3.53.5~
- ~1 7.0~
- An error
! The items list has 2 entries, and total is a real number, so doubling gives 7.0.
~~~
`,
    practice: [
      { q: "What's the difference between import json and from json import loads?", a: "The first brings in the module and you write json.loads(...). The second brings in just that function and you write loads(...)." },
      { q: "What does if __name__ == \"__main__\": protect against?", a: "Running the script's main code when another file merely imports it. The code inside runs only when you start that file directly." },
      { q: "Count how often each label appears in a list called labels.", a: "from collections import Counter; Counter(labels)" },
      { q: "Scenario: an API sends you the text '{\"status\": \"shipped\"}'. How do you get the word shipped?", a: "json.loads(text)[\"status\"]" },
      { q: "Scenario: you want every 5-digit number in a document. Which regex?", a: "re.findall(r\"\\d{5}\", document)" },
      { q: "What does Counter([\"a\", \"b\", \"a\"])[\"z\"] return?", a: "0 — a Counter answers 0 for things it never saw, instead of crashing." },
    ],
  },
);
