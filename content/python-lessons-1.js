/*
 * Python toolkit lessons 1–4. See the header of content/python.js for the authoring rules
 * (every code block shows its output in "# →" comments; every "## " part ends with a ~~~quiz).
 */
window.PYTHON_LESSONS.push(
  {
    id: "setup",
    title: "1. Running Python: files, the terminal and packages",
    summary: "Where Python code lives, how to run it, how to read what it prints (and its error messages), how to install libraries, and where secret keys go.",
    features: [],
    body: md`
## The idea
A Python program is just a **text file ending in ~.py~**. You give it to the Python program (the *interpreter*), and it reads your file top to bottom and does what each line says.

Think of it like a **recipe and a cook**: the ~.py~ file is the recipe, Python is the cook who follows it line by line, from the first line to the last, never skipping ahead.

**Scenario.** You write three lines in a file. Python does line 1, then line 2, then line 3, in that order:

~~~python
print("Step 1: boil water")
print("Step 2: add pasta")
print("Step 3: wait 10 minutes")
# → Step 1: boil water
# → Step 2: add pasta
# → Step 3: wait 10 minutes
~~~

> **How to read the examples in these lessons.** A green comment starting with ~# →~ shows exactly what the line prints when you run it. When several lines print, you see one ~# →~ line per printed line, in order. Lines starting with ~#~ are comments: notes for humans that Python ignores.

~~~quiz
? A file has these lines. What is the **second** line Python prints?
| print("Good morning")
| print("Coffee is ready")
| print("Have a nice day")
- Good morning
+ Coffee is ready
- Have a nice day
- Nothing: Python only prints the last line
! Python runs a file from top to bottom, one line at a time, so the second print() runs second.
~~~

## Running code
You run files from the **terminal** (a window where you type commands instead of clicking). Each command below is followed by what the terminal shows back:

~~~bash
python3 --version          # check Python is installed (3.11 or newer is ideal)
# → Python 3.12.4

python3 hello.py           # run the file hello.py
# → Hello, AI engineer!

python3                    # open "interactive" mode: type a line, see the result at once
# → Python 3.12.4 (main, Jun  6 2024, 18:26:44)
# → >>>
~~~

The ~>>>~ is Python waiting for you to type. In interactive mode you don't even need ~print~: type a sum and press Enter, and Python shows the answer straight away, like a calculator.

~~~bash
>>> 2 + 3
# → 5
>>> "AI" * 3
# → 'AIAIAI'
>>> exit()                 # leave interactive mode and go back to the normal terminal
~~~

**Scenario.** You make a file called ~hello.py~ with one line in it, save it, and type ~python3 hello.py~ in the terminal:

~~~python
print("Hello, AI engineer!")
# → Hello, AI engineer!
~~~

~~~quiz
? You type ~python3 --version~ in the terminal. What are you asking the computer?
- To run a file called version
+ Which version of Python is installed
- To install the newest Python
- To open Python's settings
! ~--version~ asks a program to say which version it is, e.g. "Python 3.12.4". It's the first thing to try on a new computer.
~~~

## print(): seeing what your program does
~print()~ shows things on the screen. It's how you see what's going on inside your program, like a cook tasting the sauce while cooking.

~~~python
print("Order received")              # text goes in quotes
print(42)                            # numbers don't need quotes
print(2 + 3)                         # Python works out the sum first, then prints it
print("Total:", 19.99)               # several things, separated by commas: printed with a space between
print("A", "B", "C", sep="-")        # sep= changes what goes between them
print()                              # an empty print prints an empty line
print("Done!")
# → Order received
# → 42
# → 5
# → Total: 19.99
# → A-B-C
# →
# → Done!
~~~

**Scenario: a coffee shop receipt.** Each ~print~ is one line of the receipt:

~~~python
print("=== Bean There Café ===")
print("Latte", 3.50)
print("Croissant", 2.25)
print("Total", 3.50 + 2.25)
# → === Bean There Café ===
# → Latte 3.5
# → Croissant 2.25
# → Total 5.75
~~~

Notice that ~3.50~ printed as ~3.5~: Python drops zeros at the end of a decimal number. (Lesson 3 shows how to always print two decimals, like a real receipt.)

**Quotes matter.** With quotes, Python prints the text exactly. Without quotes, Python *calculates* first:

~~~python
print("2 + 3")      # in quotes: it's just text
print(2 + 3)        # no quotes: it's a sum
# → 2 + 3
# → 5
~~~

~~~quiz
? What does this print?
| print("10 * 2")
+ ~10 * 2~
- ~20~
- ~"10 * 2"~
- An error
! The quotes make it text, so Python prints the characters exactly as written and does no maths. The quotes themselves are not printed.
~~~

~~~quiz
? Type exactly what this line prints:
| print("Price:", 4 + 1)
= Price: 5
! Python works out ~4 + 1~ first (5). The comma means "print a space, then the next thing".
~~~

## Reading error messages (don't panic!)
When Python can't do a line, it stops and prints an **error message** (also called a *traceback*). Beginners often panic at the red text, but it's actually Python being helpful: it tells you **where** (the line number) and **what** went wrong (the last line).

**Scenario.** You forget the closing quote:

~~~python
# print("Hello)
# If you run that line, Python prints:
# ✗   File "hello.py", line 1
# ✗     print("Hello)
# ✗           ^
# ✗ SyntaxError: unterminated string literal (detected at line 1)
~~~

**Scenario.** You use a name you never created:

~~~python
# print(totl)        (a typo: you meant "total")
# If you run that line, Python prints:
# ✗ Traceback (most recent call last):
# ✗   File "shop.py", line 1, in <module>
# ✗ NameError: name 'totl' is not defined
~~~

How to read it, like a doctor's note:
1. **Read the last line first.** It names the problem: ~SyntaxError~ (you wrote something Python can't understand, like a missing quote or bracket), ~NameError~ (a name Python doesn't know, usually a typo).
2. **Then find the line number** (~line 1~) and look there, and one line above.
3. Fix, save, run again.

~~~quiz
? You see ~NameError: name 'pirce' is not defined~. What is the most likely problem?
- Python is broken and needs reinstalling
+ A typo: you wrote pirce but meant price
- You forgot to install a package
- The file is too long
! NameError means "I don't know that name". Most of the time it's a spelling mistake, or using a name before you created it.
~~~

## Packages: borrowing other people's code
Python comes with a big **standard library** (built-in tools). Extra tools are **packages** you install with ~pip~. The projects use packages like ~anthropic~ (to talk to Claude), ~pydantic~ (to describe data) and ~pytest~ (to test).

To keep each project's packages separate, you make a **virtual environment**: a private box of packages for one project.

~~~bash
python3 -m venv .venv            # create the box (once per project); prints nothing when it works
source .venv/bin/activate        # step into it  (Windows: .venv\Scripts\activate)
# → (.venv) you@laptop:~/project$        ← the (.venv) at the start shows you're inside the box

pip install anthropic pydantic pytest   # install packages into the box
# → Collecting anthropic ...
# → Successfully installed anthropic-... pydantic-... pytest-...   (your version numbers will differ)

pip freeze > requirements.txt    # write down what you installed, so others can repeat it
pip install -r requirements.txt  # (on another computer) install exactly the same list
~~~

Think of a virtual environment like **a separate toolbox for each job**: the plumbing tools don't get mixed up with the painting tools. And ~requirements.txt~ is the **shopping list** so a friend can buy exactly the same tools.

**Scenario: the classic error.** You forgot to activate the box, so Python can't find the package you installed inside it:

~~~python
import pydantic
# If pydantic isn't installed (or the box isn't active), Python prints:
# ✗ ModuleNotFoundError: No module named 'pydantic'
~~~

The fix: run ~source .venv/bin/activate~, then try again (and ~pip install pydantic~ if it really isn't installed).

~~~quiz
? You see ~ModuleNotFoundError: No module named 'anthropic'~. What should you check first?
+ That your virtual environment is activated and the package is installed in it
- That your internet connection is fast enough
- That your file is called anthropic.py
- That you have an API key
! "No module named X" means Python can't find package X. Usually the box (virtual environment) isn't active, or you never ran ~pip install X~ inside it.
~~~

## Secret keys go in environment variables
To call an AI model you need an **API key** (a password for the service). Never write it in your code. Put it in an **environment variable**, a named value your computer keeps outside the code:

~~~bash
export ANTHROPIC_API_KEY="sk-ant-..."     # Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-..."
echo $ANTHROPIC_API_KEY                   # show it, to check it's set
# → sk-ant-...
~~~

~~~python
import os
key = os.environ.get("ANTHROPIC_API_KEY")   # read it inside Python (None if it isn't set)
print("key found" if key else "no key set")
# → no key set        ← before you set it; after the export above it prints: key found
~~~

**Scenario: reading any setting.** The same tool reads any environment variable, with a fallback if it's missing:

~~~python
import os
mode = os.environ.get("APP_MODE", "development")   # use "development" if APP_MODE isn't set
print("Running in", mode, "mode")
# → Running in development mode
~~~

Like keeping your house key in your pocket rather than taped to the front door. The Anthropic library even reads ~ANTHROPIC_API_KEY~ by itself, so most project code never mentions the key at all.

~~~quiz
? Why do projects read the API key with ~os.environ.get(...)~ instead of writing ~key = "sk-ant-123..."~ in the code?
- Because it makes the code run faster
+ Because code gets shared and uploaded, and a key written in it can leak
- Because Python can't store long text
- Because the key changes every minute
! Code ends up on GitHub, in emails and in screenshots. A key in an environment variable stays on your computer, like a house key in your pocket.
~~~

## Common mistakes
- Running ~python~ when only ~python3~ exists (or the other way round). Try both.
- Forgetting to activate the virtual environment, then getting ~ModuleNotFoundError~ ("I can't find that package").
- Pasting an API key into code and uploading it to GitHub. Treat keys like passwords.
- Forgetting to **save** the file before running it, so Python runs the old version. If the output didn't change, check you saved.
- Typing Python code into the normal terminal (not the ~>>>~ prompt). The terminal answers ~command not found~ because it isn't Python.

~~~bash
print("hi")          # typed into the normal terminal, not into Python
# ✗ bash: syntax error near unexpected token '"hi"'
~~~

~~~quiz
? You change ~print("Hi")~ to ~print("Hello")~, run the file, and it still prints ~Hi~. What is the most likely reason?
- Python remembers old outputs
+ You didn't save the file before running it
- print() can only print short words
- You need to reinstall Python
! Python reads the file as it is saved on disk. Unsaved changes in your editor don't exist yet as far as Python is concerned.
~~~

## How it looks in the projects
Every project shows a **project layout** (a folder tree) in its Build stage, and a list of packages. B01 starts with ~pip install anthropic pydantic pytest~. You **don't need an API key to learn**: reading and understanding the code is the goal, and running it is optional.

A typical first run of a project's script looks like this:

~~~bash
python3 triage.py
# → Ticket 1: billing (confidence 0.94) → finance-team
# → Ticket 2: bug (confidence 0.88) → engineering
~~~

~~~quiz
? Do you need an API key to learn from the projects in this lab?
- Yes, nothing works without it
+ No: reading and understanding the code is the goal; running it is optional
- Only for the beginner projects
- Yes, and you must write it inside the code
! The lessons and projects are designed so you can learn by reading. A key is only needed if you want to actually call the AI.
~~~

## Try it in your head
Read each one, imagine the output, then answer. These mix everything from this lesson.

~~~quiz
? **Scenario: a delivery app.** What does the third line print?
| print("Order #12")
| print("Status:", "on the way")
| print("Minutes left:", 20 - 5)
= Minutes left: 15
! Python works out ~20 - 5~ = 15 first, then prints the text, a space, and 15.
~~~

~~~quiz
? **Scenario: a shop sign.** What does this print?
| print("Open", "Mon", "Fri", sep=" - ")
+ ~Open - Mon - Fri~
- ~Open Mon Fri~
- ~Open, Mon, Fri~
- ~OpenMonFri~
! ~sep=" - "~ replaces the normal single space between the items with " - ".
~~~

~~~quiz
? **Scenario: a typo.** A file has ~print(mesage)~ but you created ~message~ above it. Which error appears?
- SyntaxError
+ NameError
- ModuleNotFoundError
- No error: Python guesses what you meant
! Python never guesses. ~mesage~ is a different (unknown) name, so it's a NameError.
~~~
`,
    practice: [
      { q: "What is a virtual environment, in one sentence?", a: "A private folder of installed packages for one project, so different projects don't interfere with each other." },
      { q: "Where should your API key live: in the code, or in an environment variable? Why?", a: "In an environment variable. Code gets shared and uploaded; a key in the code can leak and someone else can spend your money." },
      { q: "What does a line starting with # do?", a: "Nothing for Python: it's a comment, a note for people reading the code." },
      { q: "Scenario: print(\"Score\", 7 + 3, \"points\"). What appears on screen?", a: "Score 10 points — Python adds 7 + 3 first, and the commas put single spaces between the three parts." },
      { q: "An error message ends with SyntaxError. Where do you look and what kind of mistake is it?", a: "At the line number in the message (and the line above it). It's a writing mistake Python can't understand, like a missing quote, bracket or colon." },
      { q: "A friend clones your project. How do they install the same packages you used?", a: "Activate their own virtual environment, then run pip install -r requirements.txt (the list you made with pip freeze)." },
    ],
  },

  {
    id: "values",
    title: "2. Values, variables and types",
    summary: "Numbers, text, true/false and 'nothing', how to give them names, and how to do maths and comparisons with them.",
    features: ["constants", "isinstance"],
    body: md`
## The idea
A **variable** is a name for a value. A **type** says what kind of value it is.

Think of variables like **labelled jars in a kitchen**: the label is the name, the contents are the value, and the type is what's inside (sugar, rice, flour). You can empty a jar and refill it later.

~~~python
coffee_price = 3.5          # make a jar labelled coffee_price and put 3.5 in it
print(coffee_price)         # look inside the jar
coffee_price = 3.8          # prices went up: empty the jar and refill it
print(coffee_price)
# → 3.5
# → 3.8
~~~

The ~=~ sign means **"store the value on the right in the name on the left"**. It does *not* mean "equals" like in maths.

**Names you can and can't use:**

~~~python
customer_name = "Dana"      # fine: letters, numbers and underscores
order2 = 15                 # fine: a number, but not at the start
_hidden = True              # fine
# 2order = 15               ✗ SyntaxError: a name can't start with a number
# order total = 15          ✗ SyntaxError: no spaces in names (use order_total)
print(customer_name, order2, _hidden)
# → Dana 15 True
~~~

~~~quiz
? What does this print?
| score = 10
| score = 25
| print(score)
- ~10~
+ ~25~
- ~10 25~
- ~35~
! A variable holds one value at a time. The second line replaces 10 with 25, like refilling a jar.
~~~

## The basic types

~~~python
count = 3                 # int: a whole number
price = 19.99             # float: a number with a decimal point
name = "Acme Corp"        # str: text (a "string" of characters), in quotes
is_urgent = True          # bool: True or False (capital letters!)
manager = None            # None: "no value yet / nothing here"

print(type(count))
print(type(price))
print(type(name))
print(type(is_urgent))
print(type(manager))
# → <class 'int'>
# → <class 'float'>
# → <class 'str'>
# → <class 'bool'>
# → <class 'NoneType'>
~~~

~type(x)~ tells you what kind of value ~x~ holds. Like reading the label on the side of a tin.

**Scenario: one customer record**, with every type in it:

~~~python
customer = "Ravi Patel"       # str
age = 34                      # int
balance = 120.75              # float
is_vip = False                # bool
referred_by = None            # None: nobody referred him
print(customer, age, balance, is_vip, referred_by)
# → Ravi Patel 34 120.75 False None
~~~

**Watch out: quotes change the type.** ~"5"~ is text that happens to look like a number; ~5~ is a real number.

~~~python
print(type(5))
print(type("5"))
print(type(5.0))
print(type("True"))
# → <class 'int'>
# → <class 'str'>
# → <class 'float'>
# → <class 'str'>
~~~

~~~quiz
? What type is ~"42"~ (with the quotes)?
- int
- float
+ str
- bool
! Anything inside quotes is text (str), even if it looks like a number.
~~~

~~~quiz
? Type exactly what this prints:
| has_paid = False
| print(type(has_paid))
= <class 'bool'>
! True and False are booleans (bool): the type for yes/no answers.
~~~

## Maths with numbers

~~~python
print(7 + 2)       # add
print(7 - 2)       # subtract
print(7 * 2)       # multiply
print(7 / 2)       # divide: always gives a float
print(7 // 2)      # whole-number divide: how many whole times 2 fits into 7
print(7 % 2)       # remainder: what's left over
print(7 ** 2)      # power: 7 × 7
# → 9
# → 5
# → 14
# → 3.5
# → 3
# → 1
# → 49
~~~

**Scenario: sharing pizza.** 10 slices between 3 friends:

~~~python
slices = 10
friends = 3
print("Each gets", slices // friends, "slices")
print("Left over:", slices % friends)
print("Exact share:", slices / friends)
# → Each gets 3 slices
# → Left over: 1
# → Exact share: 3.3333333333333335
~~~

**Updating a variable using its old value.** Read the right side first, then store the result in the name on the left:

~~~python
total = 10
total = total + 5         # right side: 10 + 5 = 15, then store 15 in total
print(total)
total += 5                # the same thing, shorter: "add 5 to total"
print(total)
total -= 3                # "take 3 away"
print(total)
total *= 2                # "double it"
print(total)
# → 15
# → 20
# → 17
# → 34
~~~

**Scenario: a shopping basket.** Each item adds to the running total:

~~~python
basket = 0
basket += 2.5     # bread
basket += 4.0     # cheese
basket += 1.25    # milk
print("Basket total:", basket)
# → Basket total: 7.75
~~~

**Order of operations** works like school maths: ~*~ and ~/~ before ~+~ and ~-~, and brackets first.

~~~python
print(2 + 3 * 4)        # 3 * 4 first = 12, then + 2
print((2 + 3) * 4)      # brackets first = 5, then * 4
# → 14
# → 20
~~~

~~~quiz
? Type exactly what this prints:
| print(17 % 5)
= 2
! ~%~ gives the remainder: 5 fits into 17 three times (15), leaving 2.
~~~

~~~quiz
? What does this print?
| stock = 20
| stock -= 4
| stock += 10
| print(stock)
- ~20~
- ~16~
+ ~26~
- ~34~
! Start at 20, take away 4 (16), then add 10 (26).
~~~

~~~quiz
? What does ~print(10 / 2)~ show?
- ~5~
+ ~5.0~
- ~5.00~
- ~2~
! A single ~/~ always gives a float (a decimal number), even when the answer is whole. Use ~//~ to get ~5~.
~~~

## Converting between types
You can turn one type into another with ~int()~, ~float()~, ~str()~ and ~bool()~. This matters because text and numbers don't mix:

~~~python
print(int("5") + 5)        # text "5" → number 5, then add
print(str(5) + "5")        # number 5 → text "5", then join the texts
print(float("19.99"))      # text → decimal number
print(int(9.99))           # decimal → whole number: it chops off the decimals (no rounding!)
print(round(9.99))         # round() rounds to the nearest whole number
print(round(3.14159, 2))   # round to 2 decimal places
# → 10
# → 55
# → 19.99
# → 9
# → 10
# → 3.14
~~~

**Scenario: a form gives you text.** Everything typed into a web form or read from a file arrives as text. You must convert it before doing maths:

~~~python
quantity_from_form = "3"            # text, even though it looks like a number
unit_price = 4.5
# print(quantity_from_form * unit_price)
# ✗ TypeError: can't multiply sequence by non-int of type 'float'
total = int(quantity_from_form) * unit_price
print("Total:", total)
# → Total: 13.5
~~~

~~~python
age = 30
# print("Age: " + age)
# ✗ TypeError: can only concatenate str (not "int") to str
print("Age: " + str(age))      # convert the number to text first
print("Age:", age)             # or let print() handle it with a comma
# → Age: 30
# → Age: 30
~~~

~~~quiz
? What does this print?
| print(str(3) + str(4))
- ~7~
+ ~34~
- ~3 4~
- An error
! ~str()~ turns each number into text, and ~+~ on texts glues them together: "3" + "4" = "34".
~~~

~~~quiz
? Type exactly what this prints:
| print(int(7.8))
= 7
! ~int()~ chops off everything after the decimal point. It does NOT round. Use ~round(7.8)~ to get 8.
~~~

## Comparing values
Comparisons ask a yes/no question and give back ~True~ or ~False~:

~~~python
print(5 > 3)          # greater than
print(5 < 3)          # less than
print(5 >= 5)         # greater than or equal
print(5 == 5)         # equal (two = signs!)
print(5 != 3)         # not equal
print("cat" == "Cat") # text comparisons care about capital letters
# → True
# → False
# → True
# → True
# → True
# → False
~~~

Combine questions with ~and~, ~or~, ~not~:

~~~python
score = 0.82
is_urgent = True
manager = None
print(score >= 0.8 and is_urgent)    # both must be true
print(score > 0.9 or is_urgent)      # at least one must be true
print(not is_urgent)                 # flips True ↔ False
print(manager is None)               # use "is None" to check for "nothing"
# → True
# → True
# → False
# → True
~~~

**Scenario: can this customer get free delivery?** Free if the order is £50 or more, *or* they're a member:

~~~python
order_total = 35
is_member = True
free_delivery = order_total >= 50 or is_member
print("Free delivery:", free_delivery)
# → Free delivery: True
~~~

**Scenario: a cinema checks two things.** You need a ticket **and** to be 15 or older:

~~~python
has_ticket = True
age = 13
print("Let in:", has_ticket and age >= 15)
# → Let in: False
~~~

~~~quiz
? What does this print?
| temperature = 28
| print(temperature > 25 and temperature < 30)
+ ~True~
- ~False~
- ~28~
- An error
! 28 is greater than 25 (True) and less than 30 (True). ~and~ needs both to be True, so the answer is True.
~~~

~~~quiz
? Type exactly what this prints:
| print(10 != 10)
= False
! ~!=~ asks "are these different?". 10 and 10 are the same, so the answer is False.
~~~

## Constants: values that never change
By habit, names written in ~UPPER_CASE~ are **constants**: settings at the top of a file that the code reads but never changes.

~~~python
MODEL = "claude-haiku-4-5"
MAX_RETRIES = 2
CONFIDENCE_THRESHOLD = 0.8

confidence = 0.91
print("Using", MODEL)
print("Trusted?", confidence >= CONFIDENCE_THRESHOLD)
print("Will try up to", MAX_RETRIES + 1, "times")
# → Using claude-haiku-4-5
# → Trusted? True
# → Will try up to 3 times
~~~

Like the settings written on a sticky note on the fridge: everyone reads them, nobody scribbles over them during cooking. If the boss says "use a stricter threshold", you change **one** line at the top instead of hunting through the whole file.

~~~quiz
? Why is ~VAT_RATE = 0.2~ written in capital letters?
- Python requires capital letters for numbers
+ It's a habit that says "this is a setting; don't change it while the program runs"
- Capital letters make the code run faster
- So the value can't be printed
! Python itself doesn't stop you changing it. UPPER_CASE is a convention: a signal to other people that this is a fixed setting.
~~~

## Checking a type: isinstance
~isinstance(value, type)~ asks "is this value of this type?" and gives ~True~ or ~False~. Projects use it to check data before trusting it.

~~~python
value = 42
print(isinstance(value, int))           # is it a whole number?
print(isinstance(value, str))           # is it text?
print(isinstance(value, (int, float)))  # is it an int OR a float?
print(isinstance("42", int))            # text that looks like a number is still text
# → True
# → False
# → True
# → False
~~~

**Scenario: the AI returned a confidence score.** Before using it, check it's really a number:

~~~python
confidence = "high"     # the AI wrote a word instead of a number!
if isinstance(confidence, (int, float)):
    print("OK, using", confidence)
else:
    print("Not a number, sending to a human")
# → Not a number, sending to a human
~~~

~~~quiz
? What does ~isinstance(3.0, int)~ return?
- True
+ False
! ~3.0~ has a decimal point, so it's a float, not an int. ~isinstance(3.0, (int, float))~ would be True.
~~~

## Common mistakes
- ~"5" + 5~ fails: text and numbers don't mix. Convert first: ~int("5") + 5~ gives 10, ~str(5) + "5"~ gives "55".
- Writing ~true~ instead of ~True~. Python cares about capital letters.
- Using ~=~ (store) when you meant ~==~ (compare).
- Floats are approximate: ~0.1 + 0.2~ isn't exactly 0.3. For money, the projects round or use whole cents.

~~~python
print(0.1 + 0.2)
print(round(0.1 + 0.2, 2))
print(10 + 20)              # cents as whole numbers: always exact
# → 0.30000000000000004
# → 0.3
# → 30
~~~

~~~python
is_ready = True
# is_ready = true
# ✗ NameError: name 'true' is not defined     ← Python only knows True (capital T)
print(is_ready)
# → True
~~~

~~~quiz
? You write ~if total = 100:~ and get a SyntaxError. What should it be?
+ ~if total == 100:~
- ~if total := 100~
- ~if total equals 100:~
- ~if (total = 100):~
! A single ~=~ stores a value. To *ask* whether two things are equal, use ~==~.
~~~

## How it looks in the projects
Almost every project file starts with a few constants, like ~MODEL = "claude-haiku-4-5"~ or ~AUTO_APPLY_THRESHOLD = 0.85~, so the important settings are in one easy-to-find place.

~~~python
AUTO_APPLY_THRESHOLD = 0.85
MAX_REFUND = 200.0

confidence = 0.9
refund_amount = 150.0
safe_to_auto_apply = confidence >= AUTO_APPLY_THRESHOLD and refund_amount <= MAX_REFUND
print("Auto-apply refund:", safe_to_auto_apply)
# → Auto-apply refund: True
~~~

~~~quiz
? In the code above, what would print if ~refund_amount~ were ~350.0~?
- ~Auto-apply refund: True~
+ ~Auto-apply refund: False~
- An error
! 350.0 <= 200.0 is False, and ~and~ needs both checks to be True, so the result is False: a human checks big refunds.
~~~

## Try it in your head

~~~quiz
? **Scenario: a parking meter.** You park for 130 minutes. Type exactly what this prints:
| minutes = 130
| print(minutes // 60, "hours and", minutes % 60, "minutes")
= 2 hours and 10 minutes
! ~130 // 60~ = 2 whole hours; ~130 % 60~ = 10 minutes left over.
~~~

~~~quiz
? **Scenario: a gym's entry rule.** What does this print?
| age = 17
| has_parent = True
| print(age >= 18 or has_parent)
+ ~True~
- ~False~
- ~17~
! With ~or~, only one side needs to be True. ~age >= 18~ is False, but ~has_parent~ is True.
~~~

~~~quiz
? **Scenario: a form field.** What does this print?
| guests = "4"
| print(guests * 2)
- ~8~
+ ~44~
- An error
- ~"4" * 2~
! ~guests~ is text. Multiplying text by 2 repeats it: "4" twice is "44". To get 8, write ~int(guests) * 2~.
~~~
`,
    practice: [
      { q: "What's the difference between = and ==?", a: "= stores a value in a name (total = 5). == asks a question: are these equal? It gives True or False." },
      { q: "What type is each value: 3, 3.0, \"3\", True, None?", a: "int, float, str, bool, NoneType (the 'nothing' value)." },
      { q: "Why do projects put things like MODEL and THRESHOLD in UPPER_CASE at the top of the file?", a: "They're constants: settings that don't change while the program runs. Putting them at the top makes them easy to find and change in one place." },
      { q: "Scenario: 25 people need to travel in cars of 4 seats. How do you work out the number of full cars and the people left over?", a: "25 // 4 = 6 full cars, and 25 % 4 = 1 person left over (so you need 7 cars)." },
      { q: "Scenario: price = \"12\" comes from a web form. Why does price * 2 give \"1212\", and how do you fix it?", a: "price is text, and text * 2 repeats it. Convert first: int(price) * 2 gives 24." },
      { q: "What does print(round(2.675, 1), int(2.9), 9 // 2) show?", a: "2.7 2 4 — round to one decimal, chop the decimals off 2.9, and whole-number divide 9 by 2." },
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

Think of a string like a **row of letter beads on a thread**: each bead is one character (a letter, a digit, a space or a symbol), and the beads stay in order.

~~~python
word = "Hello"
print(word)
print(len(word))          # len() counts the beads (characters)
print(len("Hi there"))    # spaces count too
print(len(""))            # an empty string has 0 characters
# → Hello
# → 5
# → 8
# → 0
~~~

~~~quiz
? Type exactly what this prints:
| print(len("AI lab"))
= 6
! A, I, space, l, a, b: six characters. The space counts.
~~~

## Writing strings
~~~python
a = "double quotes"
b = 'single quotes work too'
c = "It's easy"                 # use double quotes when the text has an apostrophe
d = 'She said "hi"'             # or single quotes when the text has double quotes
prompt = """Triple quotes let text
span several lines. Prompts are often written like this."""
print(a)
print(b)
print(c)
print(d)
print(prompt)
# → double quotes
# → single quotes work too
# → It's easy
# → She said "hi"
# → Triple quotes let text
# → span several lines. Prompts are often written like this.
~~~

**Special characters** start with a backslash: ~\n~ is "new line" and ~\t~ is "tab".

~~~python
print("Line one\nLine two")
print("Name:\tDana")
# → Line one
# → Line two
# → Name:	Dana
~~~

**Joining and repeating** with ~+~ and ~*~:

~~~python
first = "Ada"
last = "Lovelace"
print(first + " " + last)        # + glues texts together (add the space yourself!)
print(first + last)              # no space added automatically
print("-" * 20)                  # * repeats: handy for divider lines
print("ha" * 3)
# → Ada Lovelace
# → AdaLovelace
# → --------------------
# → hahaha
~~~

~~~quiz
? What does this print?
| print("Good" + "morning")
- ~Good morning~
+ ~Goodmorning~
- ~Good + morning~
- An error
! ~+~ glues the texts exactly as they are. It never adds a space for you.
~~~

## f-strings: filling in the blanks
Put an ~f~ before the quotes and write names inside ~{curly braces}~. Python swaps each one for its value.

~~~python
customer = "Dana"
items = 3
message = f"Hi {customer}, your {items} items have shipped."
print(message)
print(f"{customer} ordered {items * 2} items last month")   # you can do maths inside the braces
print(f"Shout it: {customer.upper()}")                      # or call a method
# → Hi Dana, your 3 items have shipped.
# → Dana ordered 6 items last month
# → Shout it: DANA
~~~

Like a **form letter** with blanks: "Dear ___, your order of ___ items…". The f-string fills the blanks for you.

**Formatting numbers.** After a colon inside the braces, you say *how* to show the value:

~~~python
price = 7.5
print(f"Price: {price:.2f}")          # .2f = exactly 2 decimal places
print(f"Score: {0.8765:.2f}")         # rounds to 2 places
print(f"Rate: {0.873:.0%}")           # .0% = as a percentage with 0 decimals
print(f"Big: {1234567:,}")            # , = thousands separators
print(f"[{'left':<8}]")               # <8 = pad to 8 characters, text on the left
print(f"[{'right':>8}]")              # >8 = pad to 8 characters, text on the right
# → Price: 7.50
# → Score: 0.88
# → Rate: 87%
# → Big: 1,234,567
# → [left    ]
# → [   right]
~~~

**Scenario: a proper receipt.** Remember the café receipt from lesson 1 that printed ~3.5~? Now it prints like a real till:

~~~python
latte = 3.50
croissant = 2.25
total = latte + croissant
print(f"Latte      £{latte:.2f}")
print(f"Croissant  £{croissant:.2f}")
print(f"TOTAL      £{total:.2f}")
# → Latte      £3.50
# → Croissant  £2.25
# → TOTAL      £5.75
~~~

**Scenario: a debugging trick.** Put ~=~ after a name and the f-string prints both the name and its value:

~~~python
confidence = 0.42
label = "billing"
print(f"{label=} {confidence=}")
# → label='billing' confidence=0.42
~~~

~~~quiz
? Type exactly what this prints:
| total = 12
| print(f"You owe {total * 2} pounds")
= You owe 24 pounds
! Python works out ~total * 2~ inside the braces (24) and puts it into the text.
~~~

~~~quiz
? What does this print?
| price = 4
| print(f"Cost: {price:.2f}")
- ~Cost: 4~
+ ~Cost: 4.00~
- ~Cost: {price:.2f}~
- ~Cost: 4.2~
! ~:.2f~ means "show exactly two decimal places", so 4 becomes 4.00.
~~~

~~~quiz
? You wrote ~print("Hi {name}")~ and it printed ~Hi {name}~. What's missing?
+ The ~f~ before the opening quote
- Square brackets instead of curly braces
- A plus sign
- Nothing: that's the correct output
! Without the ~f~, Python treats the braces as normal characters. Write ~f"Hi {name}"~.
~~~

## Text methods: small tools attached to every string
A **method** is a tool you call with a dot after the value: ~text.lower()~.

~~~python
raw = "   Refund REQUEST: order #123   "
print(raw.strip())                 # remove spaces from both ends
print(raw.strip().lower())         # you can chain tools: strip, then lowercase
print(raw.strip().upper())         # all capitals
print("refund" in raw.lower())     # is this text inside that text?
print("hello world".title())       # Capital Letter On Each Word
# → Refund REQUEST: order #123
# → refund request: order #123
# → REFUND REQUEST: ORDER #123
# → True
# → Hello World
~~~

~~~python
print("a,b,c".split(","))             # cut into a list at every comma
print("one two  three".split())       # with no argument: cut at any spaces
print(" | ".join(["x", "y", "z"]))    # glue a list into one string
print("hello".replace("l", "L"))      # swap every "l" for "L"
print("report.pdf".endswith(".pdf"))  # does it end with this?
print("INV-2026".startswith("INV"))   # does it start with this?
print("banana".count("a"))            # how many times does "a" appear?
print("banana".find("n"))             # position of the first "n" (positions start at 0)
# → ['a', 'b', 'c']
# → ['one', 'two', 'three']
# → x | y | z
# → heLLo
# → True
# → True
# → 3
# → 2
~~~

**Scenario: cleaning up a messy email address** someone typed into a sign-up form:

~~~python
typed = "  Dana.Smith@Example.COM "
clean = typed.strip().lower()
print(clean)
print("Valid looking?", "@" in clean and clean.endswith(".com"))
# → dana.smith@example.com
# → Valid looking? True
~~~

**Scenario: reading a line from a spreadsheet file (CSV).** Each line is text with commas between the values:

~~~python
line = "1042,Dana Smith,59.90,paid"
parts = line.split(",")
print(parts)
print("Customer:", parts[1])
print("Amount:", float(parts[2]) * 2)
# → ['1042', 'Dana Smith', '59.90', 'paid']
# → Customer: Dana Smith
# → Amount: 119.8
~~~

**Scenario: spotting angry customers** with a simple keyword check:

~~~python
ticket = "This is the THIRD time my order is late. Unacceptable!"
words_to_watch = ["unacceptable", "refund", "lawyer"]
lowered = ticket.lower()
print("angry?", "unacceptable" in lowered)
print("mentions refund?", "refund" in lowered)
# → angry? True
# → mentions refund? False
~~~

~~~quiz
? Type exactly what this prints:
| print("  Hello  ".strip().upper())
= HELLO
! First ~strip()~ removes the spaces at both ends ("Hello"), then ~upper()~ makes it all capitals.
~~~

~~~quiz
? What does this print?
| print("red-green-blue".split("-"))
+ ~['red', 'green', 'blue']~
- ~red green blue~
- ~['red-green-blue']~
- ~3~
! ~split("-")~ cuts the text at every "-" and gives back a list of the pieces.
~~~

~~~quiz
? Type exactly what this prints:
| print("-".join(["2026", "10", "04"]))
= 2026-10-04
! ~join~ is the opposite of ~split~: it glues the list's items together with "-" between them.
~~~

## Slicing: taking a piece
Each character has a position number, starting at **0**. Negative numbers count from the end.

~~~text
 text =   H   e   l   l   o   ,       w   o   r   l   d
 position 0   1   2   3   4   5   6   7   8   9  10  11
 from end -12                                       -2  -1
~~~

~text[start:end]~ takes from ~start~ up to (**not including**) ~end~. Leave a side empty to mean "from the beginning" or "to the end".

~~~python
text = "Hello, world"
print(text[0])      # first character
print(text[4])      # fifth character (position 4)
print(text[-1])     # last character
print(text[:5])     # from the start up to position 5 (not including 5)
print(text[7:])     # from position 7 to the end
print(text[7:9])    # positions 7 and 8
print(text[::-1])   # step backwards: the whole text reversed
# → H
# → o
# → d
# → Hello
# → world
# → wo
# → dlrow ,olleH
~~~

**Scenario: reading parts of a code.** Invoice numbers look like ~INV-2026-0042~:

~~~python
invoice_id = "INV-2026-0042"
print(invoice_id[:3])       # the prefix
print(invoice_id[4:8])      # the year
print(invoice_id[-4:])      # the last four characters
# → INV
# → 2026
# → 0042
~~~

**Scenario: a preview of a long message**, like the first line of an email in your inbox:

~~~python
email = "Hi team, the quarterly numbers are in and they look much better than expected."
preview = email[:30] + "..."
print(preview)
# → Hi team, the quarterly numbers...
~~~

In the projects you'll often see ~document[:8000]~: "only the first 8,000 characters", so a huge input doesn't blow the budget. Like reading only the first pages of a long report when you just need the summary.

~~~python
# position 10 doesn't exist in "Hi":
# print("Hi"[10])
# ✗ IndexError: string index out of range
print("Hi"[:10])     # but slices never crash: they just give you what exists
# → Hi
~~~

~~~quiz
? Type exactly what this prints:
| code = "PY-1234"
| print(code[3:])
= 1234
! Positions: P=0, Y=1, -=2, 1=3. ~[3:]~ takes from position 3 to the end.
~~~

~~~quiz
? What does ~"Python"[-2:]~ give?
- ~Py~
+ ~on~
- ~n~
- ~ho~
! ~-2~ is the second-to-last character ("o"), and leaving the end empty means "to the end", so "on".
~~~

## Strings never change
A string can't be edited in place. Methods give you back a **new** string, and the old one stays the same. If you want to keep the result, store it.

~~~python
name = "  dana  "
name.strip()            # makes a cleaned copy... and throws it away
print(f"[{name}]")      # unchanged!
name = name.strip()     # store the cleaned copy back in the same name
print(f"[{name}]")
# → [  dana  ]
# → [dana]
~~~

Like photocopying a page and writing on the copy: the original page stays clean unless you replace it with the copy.

~~~quiz
? What does this print?
| city = "paris"
| city.upper()
| print(city)
+ ~paris~
- ~PARIS~
- ~Paris~
- An error
! ~city.upper()~ made a new string "PARIS" but nobody stored it. ~city~ still holds "paris". To change it: ~city = city.upper()~.
~~~

## Common mistakes
- Forgetting the ~f~: ~"Hi {name}"~ prints the braces literally.
- Expecting ~.lower()~ to change the original. Strings never change; store the result: ~text = text.lower()~.
- Counting from 1. Python counts positions from 0.
- Comparing text without matching the case: ~"Yes" == "yes"~ is ~False~. Lowercase both sides first.

~~~python
answer = "Yes"
print(answer == "yes")
print(answer.lower() == "yes")
# → False
# → True
~~~

~~~quiz
? A user types ~"YES"~. Which check correctly treats "yes", "Yes" and "YES" the same?
- ~answer == "yes"~
+ ~answer.lower() == "yes"~
- ~answer == "YES" or "yes"~
- ~answer.upper() == "yes"~
! Lowercasing the answer first turns all three spellings into "yes". (~.upper()~ would give "YES", which never equals "yes".)
~~~

## How it looks in the projects
~~~python
ticket_text = "  My card was charged twice!!  "
clean = ticket_text.strip()[:4000]
user_message = f"Classify this support ticket:\n\n<ticket>\n{clean}\n</ticket>"
print(user_message)
# → Classify this support ticket:
# →
# → <ticket>
# → My card was charged twice!!
# → </ticket>
~~~
This "clean it, cut it, wrap it in a prompt" move appears in almost every project. The ~<ticket>~ tags show the AI clearly where the customer's words start and stop.

~~~quiz
? In the project code above, what does ~[:4000]~ do?
- Removes the first 4000 characters
+ Keeps at most the first 4000 characters, so a huge ticket can't blow the budget
- Repeats the text 4000 times
- Checks that the text is exactly 4000 characters
! A slice ~[:4000]~ keeps from the start up to position 4000. Shorter texts are kept whole.
~~~

## Try it in your head

~~~quiz
? **Scenario: a name badge.** Type exactly what this prints:
| first = "maria"
| last = "garcia"
| print(f"{first.title()} {last.upper()}")
= Maria GARCIA
! ~title()~ capitalises the first letter; ~upper()~ makes every letter a capital.
~~~

~~~quiz
? **Scenario: a hidden card number.** What does this print?
| card = "4929123456781234"
| print("**** " + card[-4:])
+ ~**** 1234~
- ~**** 4929~
- ~**** 4~
- ~4929123456781234~
! ~card[-4:]~ takes the last four characters. Websites show cards like this so nobody sees the full number.
~~~

~~~quiz
? **Scenario: counting words in a review.** Type exactly what this prints:
| review = "great food but slow service"
| print(len(review.split()))
= 5
! ~split()~ cuts at spaces into 5 words, and ~len~ counts the items in that list.
~~~
`,
    practice: [
      { q: "What does f\"Total: {price:.2f}\" print when price = 7.5?", a: "Total: 7.50 — the :.2f part shows exactly two decimal places." },
      { q: "What is \"Invoice-2026\"[:7]?", a: "\"Invoice\" — the first 7 characters (positions 0 to 6)." },
      { q: "You call name.strip() but name still has spaces. Why?", a: "Strings can't change. strip() returns a new, cleaned string; you must store it: name = name.strip()." },
      { q: "Scenario: a postcode comes in as \" sw1a 1aa \". Write one line that makes it \"SW1A 1AA\".", a: "postcode = postcode.strip().upper()" },
      { q: "Scenario: a log line is \"2026-10-04 ERROR disk full\". How do you get just the word ERROR?", a: "line.split()[1] — split at spaces gives ['2026-10-04', 'ERROR', 'disk', 'full'], and position 1 is 'ERROR'." },
      { q: "What do these print: \"abc\" * 2, \"abc\"[::-1], \"a-b\".replace(\"-\", \"\")?", a: "abcabc, cba, ab." },
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

~~~python
print(type(["a", "b"]))
print(type({"name": "Dana"}))
print(type((52.1, 4.3)))
print(type({"billing", "bug"}))
# → <class 'list'>
# → <class 'dict'>
# → <class 'tuple'>
# → <class 'set'>
~~~

The brackets tell them apart: **square** ~[ ]~ for lists, **curly with labels** ~{key: value}~ for dicts, **round** ~( )~ for tuples, **curly without labels** ~{a, b}~ for sets.

~~~quiz
? Which container would you use to store one customer's name, email and phone, looked up by label?
- list
+ dict
- tuple
- set
! A dict lets you look things up by a label: ~customer["email"]~. That's exactly a form with labelled boxes.
~~~

## Lists
~~~python
queues = ["billing", "tech", "sales"]
print(queues[0])          # positions start at 0
print(queues[-1])         # the last item
print(len(queues))        # how many items
print("tech" in queues)   # is it in the list?
# → billing
# → sales
# → 3
# → True
~~~

**Changing a list.** Unlike strings, lists *can* be changed in place:

~~~python
queues = ["billing", "tech", "sales"]
queues.append("legal")          # add to the end
print(queues)
queues.insert(0, "urgent")      # add at a position
print(queues)
queues.remove("tech")           # remove by value
print(queues)
last = queues.pop()             # remove and give back the last item
print(last, queues)
queues[0] = "VIP"               # replace the item at position 0
print(queues)
# → ['billing', 'tech', 'sales', 'legal']
# → ['urgent', 'billing', 'tech', 'sales', 'legal']
# → ['urgent', 'billing', 'sales', 'legal']
# → legal ['urgent', 'billing', 'sales']
# → ['VIP', 'billing', 'sales']
~~~

**Scenario: a to-do list for the day.**

~~~python
todo = ["email client", "fix bug", "lunch"]
todo.append("write report")
todo.remove("lunch")                 # skipped lunch today...
print("Tasks left:", len(todo))
print("First up:", todo[0])
print("Everything:", todo)
# → Tasks left: 3
# → First up: email client
# → Everything: ['email client', 'fix bug', 'write report']
~~~

**Useful tools for lists of numbers:**

~~~python
prices = [4.5, 12.0, 3.25, 8.0]
print(sum(prices))           # add them all up
print(min(prices))           # smallest
print(max(prices))           # biggest
print(sorted(prices))        # a new list, smallest first
print(sorted(prices, reverse=True))  # biggest first
print(prices[1:3])           # slicing works on lists too
# → 27.75
# → 3.25
# → 12.0
# → [3.25, 4.5, 8.0, 12.0]
# → [12.0, 8.0, 4.5, 3.25]
# → [12.0, 3.25]
~~~

**Scenario: a teacher's marks.**

~~~python
marks = [72, 85, 90, 64, 78]
average = sum(marks) / len(marks)
print("Highest:", max(marks))
print("Lowest:", min(marks))
print(f"Average: {average:.1f}")
# → Highest: 90
# → Lowest: 64
# → Average: 77.8
~~~

~~~quiz
? Type exactly what this prints:
| colors = ["red", "green", "blue"]
| colors.append("yellow")
| print(len(colors))
= 4
! The list started with 3 items, and ~append~ added one more.
~~~

~~~quiz
? What does this print?
| nums = [5, 1, 9]
| print(nums[1])
- ~5~
+ ~1~
- ~9~
- ~[5, 1]~
! Positions start at 0: nums[0] is 5, nums[1] is 1.
~~~

~~~quiz
? Type exactly what this prints:
| print(sum([10, 20, 30]) / 3)
= 20.0
! ~sum~ gives 60, and ~/ 3~ gives 20.0 (single ~/~ always gives a decimal number).
~~~

## Dictionaries: the most important container in this lab
A dict maps **keys** (labels) to **values**. JSON, the format AI models and web services use to send data, looks exactly like Python dicts and lists.

~~~python
ticket = {"id": 101, "subject": "Charged twice", "priority": "high"}
print(ticket["subject"])          # read a box by its label
ticket["queue"] = "billing"       # add a new box
ticket["priority"] = "urgent"     # change an existing box
print(ticket)
print(len(ticket))                # how many boxes
print("queue" in ticket)          # is there a box with this label?
del ticket["queue"]               # remove a box
print(list(ticket.keys()))        # all the labels
print(list(ticket.values()))      # all the contents
# → Charged twice
# → {'id': 101, 'subject': 'Charged twice', 'priority': 'urgent', 'queue': 'billing'}
# → 4
# → True
# → ['id', 'subject', 'priority']
# → [101, 'Charged twice', 'urgent']
~~~

**Walking through a dict** with ~.items()~ gives you each label and its value:

~~~python
ticket = {"id": 101, "subject": "Charged twice", "priority": "high"}
for key, value in ticket.items():
    print(key, "=", value)
# → id = 101
# → subject = Charged twice
# → priority = high
~~~

**Scenario: a price list in a shop.** The item name is the label, the price is the value:

~~~python
menu = {"latte": 3.5, "tea": 2.0, "muffin": 2.75}
print("A latte costs", menu["latte"])
order = ["latte", "muffin", "muffin"]
total = menu[order[0]] + menu[order[1]] + menu[order[2]]
print("Order total:", total)
menu["tea"] = 2.2                      # price change
print(menu)
# → A latte costs 3.5
# → Order total: 9.0
# → {'latte': 3.5, 'tea': 2.2, 'muffin': 2.75}
~~~

**Scenario: counting votes.** A dict is perfect for "how many of each":

~~~python
votes = {"pizza": 0, "sushi": 0}
votes["pizza"] += 1
votes["sushi"] += 1
votes["pizza"] += 1
print(votes)
# → {'pizza': 2, 'sushi': 1}
~~~

Dicts often hold other dicts and lists, like a form with a table inside. Read the path **step by step, left to right**:

~~~python
invoice = {
    "vendor": "Acme",
    "lines": [
        {"item": "Paper", "amount": 20.0},
        {"item": "Ink", "amount": 35.5},
    ],
}
print(invoice["vendor"])               # the vendor box
print(invoice["lines"][0])             # lines → first line
print(invoice["lines"][1]["item"])     # lines → second line → item
print(len(invoice["lines"]))           # how many lines
# → Acme
# → {'item': 'Paper', 'amount': 20.0}
# → Ink
# → 2
~~~

~~~quiz
? Type exactly what this prints:
| user = {"name": "Leo", "age": 29}
| print(user["age"] + 1)
= 30
! ~user["age"]~ opens the "age" box (29), then we add 1.
~~~

~~~quiz
? What does this print?
| stock = {"apples": 5, "pears": 2}
| stock["pears"] = 10
| print(stock)
+ ~{'apples': 5, 'pears': 10}~
- ~{'apples': 5, 'pears': 2, 'pears': 10}~
- ~{'apples': 5, 'pears': 12}~
- An error
! Assigning to an existing key replaces its value. A dict never has the same key twice.
~~~

~~~quiz
? Given ~order = {"items": [{"name": "Pen", "qty": 3}, {"name": "Pad", "qty": 1}]}~, which expression gives ~1~?
- ~order["qty"][1]~
- ~order["items"]["qty"]~
+ ~order["items"][1]["qty"]~
- ~order[1]["qty"]~
! Step by step: the "items" box (a list) → position 1 (the second item, the Pad) → its "qty" box.
~~~

## Safe lookups: .get() and next()
~ticket["owner"]~ **crashes** if there's no ~"owner"~ box. ~.get()~ returns a fallback instead:

~~~python
ticket = {"id": 101}
# print(ticket["owner"])
# ✗ KeyError: 'owner'
print(ticket.get("owner"))               # no box: gives None
print(ticket.get("owner", "unassigned")) # no box: gives your fallback
print(ticket.get("id", 0))               # the box exists: gives its real value
# → None
# → unassigned
# → 101
~~~

**Scenario: a settings file that might leave things out.**

~~~python
settings = {"theme": "dark"}
theme = settings.get("theme", "light")
font_size = settings.get("font_size", 14)
print(theme, font_size)
# → dark 14
~~~

~next()~ means "give me the **first** item that matches, or this fallback":

~~~python
users = [{"name": "Ana", "role": "admin"}, {"name": "Bo", "role": "viewer"}]
admin = next((u for u in users if u["role"] == "admin"), None)
print(admin)
owner = next((u for u in users if u["role"] == "owner"), None)
print(owner)
# → {'name': 'Ana', 'role': 'admin'}
# → None
~~~

Like asking a receptionist "is there a parcel for me? if not, just say no" instead of searching the shelves until you trip over.

~~~quiz
? Type exactly what this prints:
| prices = {"tea": 2}
| print(prices.get("coffee", 3))
= 3
! There's no "coffee" box, so ~.get~ returns the fallback, 3.
~~~

~~~quiz
? What happens with ~prices["coffee"]~ when there's no "coffee" key?
- It returns None
- It returns 0
+ The program crashes with a KeyError
- It creates the key
! Square brackets demand the key exists. Use ~.get()~ when a key might be missing.
~~~

## Tuples and unpacking: opening the envelope
A **tuple** is like a list that can never change, written with round brackets. Use it for small fixed groups, like a map position.

~~~python
point = (52.1, 4.3)
print(point[0])
# point[0] = 50.0
# ✗ TypeError: 'tuple' object does not support item assignment
lat, lon = point                  # unpacking: take the tuple apart into two names
print(lat, lon)
# → 52.1
# → 52.1 4.3
~~~

**Unpacking works on lists too,** and ~*~ collects "everything else":

~~~python
first, *rest = ["a", "b", "c"]
print(first)
print(rest)
name, age, city = ["Dana", 31, "Leeds"]
print(f"{name} ({age}) lives in {city}")
a, b = 1, 2
a, b = b, a                       # swap two values in one line
print(a, b)
# → a
# → ['b', 'c']
# → Dana (31) lives in Leeds
# → 2 1
~~~

**Spreading a dict** with ~**~ copies all its boxes into a new dict. Later boxes win:

~~~python
defaults = {"model": "claude-haiku-4-5", "max_tokens": 500}
settings = {**defaults, "max_tokens": 1000}   # copy defaults, then override max_tokens
print(settings)
print(defaults)                               # the original is unchanged
# → {'model': 'claude-haiku-4-5', 'max_tokens': 1000}
# → {'model': 'claude-haiku-4-5', 'max_tokens': 500}
~~~

~~~quiz
? Type exactly what this prints:
| x, y, z = [10, 20, 30]
| print(y)
= 20
! Unpacking gives each name one item, in order: x=10, y=20, z=30.
~~~

~~~quiz
? What does this print?
| base = {"size": "M", "color": "blue"}
| mine = {**base, "color": "red"}
| print(mine["color"], base["color"])
+ ~red blue~
- ~blue blue~
- ~red red~
- ~blue red~
! ~mine~ is a new dict that copies base and then overrides color with red. ~base~ itself is untouched.
~~~

## Sets: quick "is it in there?" checks and no duplicates
~~~python
allowed = {"billing", "tech", "sales"}
print("legal" in allowed)
print("tech" in allowed)
print(len({"a", "b", "a", "a"}))          # duplicates are dropped
print(sorted(set(["bug", "billing", "bug"])))   # turn a list into a set to remove repeats
# → False
# → True
# → 2
# → ['billing', 'bug']
~~~

**Scenario: which customers bought from both shops?** Sets can find what's shared (~&~) or everything together (~|~):

~~~python
shop_a = {"Ana", "Bo", "Cy"}
shop_b = {"Bo", "Cy", "Dee"}
print(sorted(shop_a & shop_b))     # in both
print(sorted(shop_a | shop_b))     # in either
print(sorted(shop_a - shop_b))     # in A but not B
# → ['Bo', 'Cy']
# → ['Ana', 'Bo', 'Cy', 'Dee']
# → ['Ana']
~~~

(Sets have no fixed order, so the examples use ~sorted()~ to print them in a predictable order.)

~~~quiz
? Type exactly what this prints:
| tags = ["urgent", "bug", "urgent", "bug", "ui"]
| print(len(set(tags)))
= 3
! A set keeps only unique items: urgent, bug, ui. That's 3.
~~~

## Common mistakes
- ~KeyError~: reading a dict key that doesn't exist. Use ~.get()~ when a key might be missing.
- ~IndexError~: asking for position 5 in a list of 3.
- Changing a list while looping over it. Build a new list instead (lesson 7 shows how).
- Forgetting that ~sorted(x)~ gives a *new* list while ~x.sort()~ changes ~x~ itself (and gives back ~None~).

~~~python
names = ["Cy", "Ana", "Bo"]
print(sorted(names))     # a new sorted list
print(names)             # unchanged
result = names.sort()    # sorts names itself...
print(result)            # ...and gives back nothing
print(names)
# → ['Ana', 'Bo', 'Cy']
# → ['Cy', 'Ana', 'Bo']
# → None
# → ['Ana', 'Bo', 'Cy']
~~~

~~~python
items = ["a", "b", "c"]
# print(items[3])
# ✗ IndexError: list index out of range     ← 3 items means positions 0, 1, 2 only
print(items[len(items) - 1])
# → c
~~~

~~~quiz
? A list has 4 items. What is the position of the last one?
- 4
+ 3
- -4
- 0
! Positions start at 0, so 4 items have positions 0, 1, 2, 3. (You can also use -1 for "the last one".)
~~~

## How it looks in the projects
~~~python
QUEUE_FOR = {"billing": "finance-team", "bug": "engineering", "other": "general"}   # a lookup table
for category in ["bug", "billing", "spaceships"]:
    print(category, "→", QUEUE_FOR.get(category, "general"))
# → bug → engineering
# → billing → finance-team
# → spaceships → general
~~~
This tiny "lookup table" is the **deterministic** half of B01: the AI picks a label, a plain dict decides where it goes. Even if the AI invents a strange label like "spaceships", ~.get()~ safely sends it to "general".

~~~quiz
? In the code above, why use ~QUEUE_FOR.get(category, "general")~ instead of ~QUEUE_FOR[category]~?
+ So an unexpected label goes to "general" instead of crashing the program
- Because .get() is faster
- Because square brackets don't work on dicts
- So the label is changed to lowercase
! The AI might return a label that isn't in the table. ~.get~ with a fallback keeps the system running safely.
~~~

## Try it in your head

~~~quiz
? **Scenario: a playlist.** Type exactly what this prints:
| songs = ["Intro", "Hello", "Outro"]
| songs.insert(1, "Bonus")
| print(songs[2])
= Hello
! After inserting "Bonus" at position 1, the list is Intro, Bonus, Hello, Outro. Position 2 is Hello.
~~~

~~~quiz
? **Scenario: a hotel room.** What does this print?
| room = {"number": 214, "guests": ["Ana", "Bo"], "paid": True}
| print(room["guests"][-1], room["paid"])
+ ~Bo True~
- ~Ana True~
- ~['Ana', 'Bo'] True~
- An error
! ~room["guests"]~ is a list; ~[-1]~ is its last item, Bo. ~room["paid"]~ is True.
~~~

~~~quiz
? **Scenario: stock levels.** Type exactly what this prints:
| stock = {"pens": 12, "pads": 0}
| print(stock.get("pads", 99), stock.get("ink", 99))
= 0 99
! "pads" exists (its value is 0, so .get gives 0). "ink" doesn't exist, so .get gives the fallback 99.
~~~
`,
    practice: [
      { q: "When would you choose a dict over a list?", a: "When you want to look things up by a label (\"email\", \"total\") instead of by position. A list is for an ordered sequence of similar items." },
      { q: "What does d.get(\"x\", 0) return when d has no \"x\" key?", a: "0, the fallback. d[\"x\"] would crash with a KeyError instead." },
      { q: "data = {\"lines\": [{\"amt\": 5}, {\"amt\": 7}]}. How do you read the 7?", a: "data[\"lines\"][1][\"amt\"] — the lines list, the second item (position 1), then its \"amt\" box." },
      { q: "Scenario: you have a list of 1,000 email addresses with repeats. How do you count how many different people there are?", a: "len(set(emails)) — a set drops the repeats, then len counts what's left." },
      { q: "Scenario: a dict scores = {\"Ana\": 7, \"Bo\": 9}. Bo scores 2 more points. Write the line.", a: "scores[\"Bo\"] += 2 (now {\"Ana\": 7, \"Bo\": 11})." },
      { q: "What do these print: [1, 2, 3][-1], (4, 5)[0], len({\"a\": 1, \"b\": 2})?", a: "3, 4, 2." },
    ],
  },
);
