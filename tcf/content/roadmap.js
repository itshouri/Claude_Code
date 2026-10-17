// The 9-month roadmap: 6 phases, 39 weeks, 273 days.
// It follows the TCF Canada program structure (intro → A1 → A2 → B1-B2 → Pre-TCF → TCF Camp)
// and turns it into a self-study plan you can follow day by day.

window.PHASES = [
  { id: "images", n: 1, name: "Le français en images", en: "Meet French through pictures", months: "Month 1", weeks: [1, 4], color: "p1",
    simple: "You learn your first 300 words by seeing a picture, hearing the word and saying it. No grammar yet. The goal is to make French feel friendly and to train your ear and mouth from day one.",
    analogy: "Like a baby: babies point at things and hear words long before anyone explains grammar to them.",
    outcomes: ["Introduce yourself simply", "Talk about your job", "Describe your family", "Say what you do every day", "Know food, fruit, vegetables, colours, furniture and numbers"] },
  { id: "a1", n: 2, name: "A1 · Premiers pas", en: "First steps: pronunciation, then grammar", months: "Months 2–3½", weeks: [5, 14], color: "p2",
    simple: "First 4 weeks: pronunciation only (how French letters sound). Then 6 weeks of basic grammar with practice, and a full review week. You only move on when you pass the checkpoint.",
    analogy: "Learning to read music before playing songs: once you can read the notes (sounds), every new song (grammar) is easier.",
    outcomes: ["Read a short French text aloud correctly", "Use être, avoir and -er verbs in the present", "Ask and answer simple questions", "Make negative sentences", "Talk about the near future"] },
  { id: "a2", n: 3, name: "A2 · En marche", en: "Moving forward: tenses & sentences", months: "Months 4–5", weeks: [15, 21], color: "p3",
    simple: "You learn to talk about the past and the future, use pronouns, and build longer sentences. Each rule comes as a short video or lesson (under 10 minutes), a written summary and exercises.",
    analogy: "A1 gave you bricks. A2 gives you cement, so you can build walls (real sentences and stories).",
    outcomes: ["Tell a story in the past (passé composé + imparfait)", "Talk about plans (futur simple)", "Use pronouns to avoid repeating", "Write a short message (TCF writing task 1)", "Handle everyday situations (restaurant, doctor, work)"] },
  { id: "b", n: 4, name: "B1–B2 · Maîtrise", en: "Mastery: 20% grammar, 80% skills", months: "Month 6", weeks: [22, 25], color: "p4",
    simple: "Only 20% of your time is grammar now. The other 80% is reading, listening and speaking practice with real-style texts and audio, so you learn to understand questions and choose the right answer.",
    analogy: "You know how to drive. Now you drive on the highway every day until it feels natural.",
    outcomes: ["Use the subjunctive and if-sentences", "Link ideas with connectors", "Understand news-style audio and articles", "Give and defend an opinion"] },
  { id: "pre", n: 5, name: "Pre-TCF", en: "Know the exam inside out", months: "Month 7", weeks: [26, 29], color: "p5",
    simple: "You learn exactly how each TCF Canada section works, with extra focus on speaking (the skill that most affects the final result). Every week you get a plan based on your weakest skill.",
    analogy: "Walking the route of a race before race day: you know every hill, so nothing surprises you.",
    outcomes: ["Know the timing and format of all 4 sections", "Master speaking tasks 1 and 2", "Use strategies for multiple-choice questions", "Know your weakest skill and work on it"] },
  { id: "camp", n: 6, name: "TCF Camp", en: "60-day exam camp", months: "Months 8–9", weeks: [30, 39], color: "p6",
    simple: "60 days with a clear goal every day: 45 listening + reading tests (then 15 days of review), 40 writing combinations (then 15 days of expected topics), 45 speaking topics (then 15 days of review). Study 2 to 4 hours a day.",
    analogy: "A boxing training camp before a big fight: every day has a plan, nothing is random, and on fight day you know exactly what you did and why.",
    outcomes: ["Complete 45 timed listening + reading tests", "Write 40 full writing combinations", "Speak on 45 task-3 topics", "Reach NCLC 7+ in all four skills"] },
];

// Week-by-week content. Lesson, vocab and practice ids point to the content files.
window.WEEKS = [
  // Phase 1: Le français en images
  { w: 1, phase: "images", title: "Hello, numbers & colours", goal: "Say hello, count to 20, name colours, and introduce yourself in 3 sentences.", vocab: ["greet", "num1", "colors"], lessons: ["p1"], listen: ["l2"], speak: ["s1"] },
  { w: 2, phase: "images", title: "Food, fruit & vegetables", goal: "Name 40 foods and say what you like to eat.", vocab: ["food", "fruits", "veg", "num2"], listen: ["l1"], speak: ["s1"] },
  { w: 3, phase: "images", title: "Home & family", goal: "Describe your home and your family.", vocab: ["house", "furniture", "family"], listen: ["l2"], speak: ["s1"] },
  { w: 4, phase: "images", title: "My job & my day", goal: "Talk about your work and your daily routine.", vocab: ["jobs", "days", "routine"], listen: ["l3"], speak: ["s2"], checkpoint: "images" },
  // Phase 2: A1 (first 4 weeks pronunciation only)
  { w: 5, phase: "a1", title: "Sounds 1: accents & vowels", goal: "Hear and say the French vowels, including u vs ou.", lessons: ["p2", "p3"], vocab: ["body", "clothes"], listen: ["l1"], kind: "phon" },
  { w: 6, phase: "a1", title: "Sounds 2: nasals & silent letters", goal: "Say an/on/in correctly and know which letters to skip.", lessons: ["p4", "p5"], vocab: ["city", "weather"], listen: ["l3"], kind: "phon" },
  { w: 7, phase: "a1", title: "Sounds 3: consonants & liaison", goal: "Say the French r, ch, gn and link words together.", lessons: ["p6", "p7"], vocab: ["transport", "feelings"], listen: ["l2"], kind: "phon" },
  { w: 8, phase: "a1", title: "Sounds 4: rhythm & reading aloud", goal: "Read a short paragraph aloud with good rhythm.", lessons: ["p8", "p9", "p10"], vocab: ["shopping"], listen: ["l4"], kind: "phon" },
  { w: 9, phase: "a1", title: "Grammar: être, avoir & articles", goal: "Use the two key verbs and the right article.", lessons: ["a1-etre-avoir", "a1-articles"], vocab: ["restaurant"], read: ["r1"], speak: ["s1"] },
  { w: 10, phase: "a1", title: "Grammar: adjectives & -er verbs", goal: "Describe things and use regular verbs in the present.", lessons: ["a1-adjectives", "a1-present-er"], vocab: ["colors", "routine"], read: ["r2"], speak: ["s2"] },
  { w: 11, phase: "a1", title: "Grammar: negation & questions", goal: "Say no and ask questions three ways.", lessons: ["a1-negation", "a1-questions"], vocab: ["sport"], listen: ["l4"], read: ["r1"], speak: ["s3"] },
  { w: 12, phase: "a1", title: "Grammar: irregular verbs & possessives", goal: "Use aller, faire, venir, prendre and my/your/his.", lessons: ["a1-irregular", "a1-possessives"], vocab: ["family"], listen: ["l5"], read: ["r2"], speak: ["s1"] },
  { w: 13, phase: "a1", title: "Grammar: places & quantities", goal: "Say where things are and talk about food quantities.", lessons: ["a1-prepositions", "a1-partitive"], vocab: ["city", "food"], listen: ["l3"], read: ["r3"], speak: ["s2"] },
  { w: 14, phase: "a1", title: "Near future, time & A1 review", goal: "Talk about plans and times, then pass the A1 checkpoint.", lessons: ["a1-futur-proche", "a1-time"], vocab: ["days"], listen: ["l1", "l2"], read: ["r1", "r2"], write: ["w1"], speak: ["s1"], checkpoint: "a1", review: true },
  // Phase 3: A2
  { w: 15, phase: "a2", title: "The past (1): passé composé", goal: "Say what you did yesterday.", lessons: ["a2-pc-avoir", "a2-pc-etre"], vocab: ["transport"], listen: ["l4"], read: ["r3"], write: ["w1"], speak: ["s2"] },
  { w: 16, phase: "a2", title: "The past (2): imparfait", goal: "Describe how things were and tell a short story.", lessons: ["a2-imparfait", "a2-pc-vs-imp"], vocab: ["weather", "feelings"], listen: ["l5"], read: ["r4"], write: ["w2"], speak: ["s1"] },
  { w: 17, phase: "a2", title: "Daily life: reflexive verbs & time words", goal: "Describe your routine and how long you've done things.", lessons: ["a2-reflexive", "a2-time-expr"], vocab: ["routine", "body"], listen: ["l6"], read: ["r3"], write: ["w3"], speak: ["s3"] },
  { w: 18, phase: "a2", title: "Pronouns: le, lui, y, en", goal: "Stop repeating nouns by using pronouns.", lessons: ["a2-cod-coi", "a2-y-en"], vocab: ["shopping", "restaurant"], listen: ["l4"], read: ["r4"], write: ["w4"], speak: ["s4"] },
  { w: 19, phase: "a2", title: "Comparing & joining sentences", goal: "Compare places and build longer sentences.", lessons: ["a2-comparatives", "a2-relatives"], vocab: ["city", "house"], listen: ["l6"], read: ["r5"], write: ["w1"], speak: ["s5"] },
  { w: 20, phase: "a2", title: "Future, orders & politeness", goal: "Talk about the future, give instructions and ask politely.", lessons: ["a2-futur-simple", "a2-imperative", "a2-conditionnel"], vocab: ["work", "transport"], listen: ["l5"], read: ["r4"], write: ["w2"], speak: ["s6"] },
  { w: 21, phase: "a2", title: "A2 review & checkpoint", goal: "Review all A2 tenses and pass the checkpoint.", lessons: [], vocab: ["work", "sport"], listen: ["l4", "l6"], read: ["r3", "r4"], write: ["w3"], speak: ["s2"], checkpoint: "a2", review: true },
  // Phase 4: B1–B2
  { w: 22, phase: "b", title: "Subjunctive & cause/consequence", goal: "Express necessity and wishes; explain causes.", lessons: ["b-subjonctif", "b-connect-cause"], vocab: ["society"], listen: ["l7", "l8"], read: ["r5"], write: ["w5"], speak: ["s7"] },
  { w: 23, phase: "b", title: "Hypotheses & contrast", goal: "Imagine situations and contrast ideas.", lessons: ["b-si", "b-pqp", "b-connect-opposition"], vocab: ["opinion"], listen: ["l9", "l10"], read: ["r6"], write: ["w6"], speak: ["s8"] },
  { w: 24, phase: "b", title: "Formal French: passive, gérondif, dont", goal: "Understand news-style texts and write more formally.", lessons: ["b-passif", "b-gerondif", "b-dont"], vocab: ["society"], listen: ["l11"], read: ["r7"], write: ["w7"], speak: ["s9"] },
  { w: 25, phase: "b", title: "Reporting & arguing + checkpoint", goal: "Report what people said and build an argument.", lessons: ["b-indirect", "b-opinion"], vocab: ["opinion"], listen: ["l12", "l10"], read: ["r8"], write: ["w8"], speak: ["s10"], checkpoint: "b" },
  // Phase 5: Pre-TCF
  { w: 26, phase: "pre", title: "The exam map + speaking task 1", goal: "Know all 4 sections; master the guided interview.", exam: ["format", "nclc"], listen: ["l7"], read: ["r5"], speak: ["s1", "s2"], write: ["w1"] },
  { w: 27, phase: "pre", title: "Speaking task 2: asking questions", goal: "Ask 10+ varied, polite questions in a role play.", exam: ["eo"], lessons: ["a1-questions", "a2-conditionnel"], listen: ["l9"], read: ["r6"], speak: ["s3", "s4", "s5", "s6"], write: ["w2"] },
  { w: 28, phase: "pre", title: "Listening & reading strategies", goal: "Use a method for every multiple-choice question.", exam: ["co", "ce"], listen: ["l8", "l10", "l11"], read: ["r7", "r8"], write: ["w5"], speak: ["s7"] },
  { w: 29, phase: "pre", title: "Writing tasks & diagnostic", goal: "Know the 3 writing tasks and find your weakest skill.", exam: ["ee"], listen: ["l12"], read: ["r6"], write: ["w8", "w6"], speak: ["s8"], checkpoint: "pre" },
  // Phase 6: TCF Camp (60 days + exam week)
  { w: 30, phase: "camp", title: "Camp week 1: the full exam explained", goal: "Understand the whole exam and do your first timed tests.", exam: ["format", "day"], camp: "overview" },
  { w: 31, phase: "camp", title: "Camp week 2: writing task 3", goal: "Master the two-document argument task.", exam: ["ee"], camp: "write3" },
  { w: 32, phase: "camp", title: "Camp week 3: speaking task 3", goal: "Daily voice notes on opinion topics with common mistakes fixed.", exam: ["eo"], camp: "speak3" },
  { w: 33, phase: "camp", title: "Camp week 4: full writing exam", goal: "Write all three tasks in 60 minutes and correct them.", camp: "fullwrite" },
  { w: 34, phase: "camp", title: "Camp week 5: daily rotation", goal: "One test of each skill every day.", camp: "rotation" },
  { w: 35, phase: "camp", title: "Camp week 6: daily rotation", goal: "Keep the rhythm. Track your scores.", camp: "rotation" },
  { w: 36, phase: "camp", title: "Camp week 7: daily rotation", goal: "Focus extra time on your weakest skill.", camp: "rotation" },
  { w: 37, phase: "camp", title: "Camp week 8: speaking simulation", goal: "Full speaking simulation and tasks 1–3 polish.", camp: "rotation" },
  { w: 38, phase: "camp", title: "Camp week 9: expected topics & review", goal: "Review mistakes and practise likely combinations.", camp: "review" },
  { w: 39, phase: "camp", title: "Exam week", goal: "Light review, full simulation, rest, and pass the TCF.", camp: "exam", checkpoint: "camp" },
];

// What you must be able to do before moving on (the program's rule:
// "you only move to the next level when you are fully ready").
window.CHECKPOINTS = {
  images: { title: "Checkpoint 1: Le français en images", lessons: [], vocabQuiz: true, cando: ["I can say hello and goodbye politely", "I can count to 100", "I can introduce myself in 4–5 sentences", "I can name 10 foods and 5 family members", "I can say 3 things I do every day"] },
  a1: { title: "Checkpoint 2: A1", level: ["phon", "A1"], cando: ["I can read a short text aloud with correct sounds", "I can use être, avoir and -er verbs", "I can ask questions with est-ce que", "I can make negative sentences", "I can talk about my plans with aller + verb"] },
  a2: { title: "Checkpoint 3: A2", level: ["A2"], cando: ["I can tell a story in the past", "I can choose passé composé or imparfait", "I can use le/la/lui/leur/y/en", "I can write a 100-word message", "I can ask politely with the conditional"] },
  b: { title: "Checkpoint 4: B1–B2", level: ["B"], cando: ["I can use the subjunctive after il faut que", "I can make if-sentences", "I can link ideas with 5+ connectors", "I can give an opinion with 2 arguments and examples"] },
  pre: { title: "Checkpoint 5: Pre-TCF diagnostic", level: ["A2", "B"], practice: true, cando: ["I know the timing of each section", "I can do speaking task 1 for 2 minutes", "I can ask 10 questions in task 2", "I know my weakest skill"] },
  camp: { title: "Final check: exam ready", level: ["A1", "A2", "B"], practice: true, cando: ["I finished my daily camp tests", "I can write task 3 in 30 minutes", "I can speak 4 minutes on any opinion topic", "I know what to do on exam day"] },
};

// TCF Canada guide. NCLC = Niveaux de compétence linguistique canadiens
// (Canadian Language Benchmarks for French), used by immigration (IRCC).
window.EXAM = {
  format: { title: "The 4 sections of TCF Canada", icon: "🗺️", body: [
    "**Compréhension orale** (listening): 39 multiple-choice questions, 35 minutes. You hear each recording once. Questions go from easy (A1) to hard (C2).",
    "**Compréhension écrite** (reading): 39 multiple-choice questions, 60 minutes. Short notices first, long articles at the end.",
    "**Expression écrite** (writing): 3 tasks in 60 minutes. Task 1: a message (60–120 words). Task 2: an article, blog or story (120–150 words). Task 3: compare two short documents and give your opinion (120–180 words).",
    "**Expression orale** (speaking): about 12 minutes with an examiner. Task 1: guided interview about you (2 min, no preparation). Task 2: role play where YOU ask the questions (5 min 30, with 2 min preparation). Task 3: give and defend your opinion (4 min 30, no preparation).",
    "Listening and reading are scored out of **699**. Writing and speaking are scored out of **20**.",
  ]},
  nclc: { title: "Scores and NCLC levels", icon: "🎯", body: [
    "Immigration (Express Entry) converts your TCF scores to **NCLC** levels. NCLC 7 in all four skills is the usual target for strong points.",
    "The table below shows the conversion published by IRCC. Always check the official IRCC page before your exam, because tables can be updated.",
  ], table: [
    ["NCLC", "Listening /699", "Reading /699", "Writing /20", "Speaking /20"],
    ["4", "331–368", "342–374", "4–5", "4–5"],
    ["5", "369–397", "375–405", "6", "6"],
    ["6", "398–457", "406–452", "7–9", "7–9"],
    ["7", "458–502", "453–498", "10–11", "10–11"],
    ["8", "503–522", "499–523", "12–13", "12–13"],
    ["9", "523–548", "524–548", "14–15", "14–15"],
    ["10+", "549–699", "549–699", "16–20", "16–20"],
  ]},
  co: { title: "Listening strategies", icon: "🎧", body: [
    "**Read the question and options before the audio starts.** Underline the key word (who? where? why? how much?).",
    "**Predict**: from the options, guess what kind of information you need (a number, a place, a feeling).",
    "**Listen for synonyms**, not the same words. The audio says 'je suis crevé', the answer says 'fatigué'.",
    "**Watch out for traps**: the first thing mentioned is often corrected later ('Rendez-vous à 15 h… non, plutôt 16 h').",
    "**Never leave a blank.** There is no penalty for a wrong answer, so always choose something.",
    "**Don't get stuck.** If you missed it, choose your best guess and focus on the next question.",
  ]},
  ce: { title: "Reading strategies", icon: "📖", body: [
    "**Read the question first**, then look for the answer in the text (scanning).",
    "**Time budget**: the first 15 questions are short; go fast (about 1 minute each) to save time for the long texts at the end (2–3 minutes each).",
    "**Eliminate** options that are too extreme ('toujours', 'jamais', 'tous') or not mentioned at all.",
    "**Find the author's intention**: inform, convince, criticise, warn? Connectors (cependant, donc, certes) show the logic.",
    "**The conditional = caution**: 'serait', 'aurait' means the information is reported, not confirmed.",
  ]},
  ee: { title: "Writing: the 3 tasks", icon: "✍️", body: [
    "**Task 1 (60–120 words)**: a message to a friend, colleague or service. Greeting → reason for writing → details (when, where, what) → request/closing → signature. Match tu/vous to the person.",
    "**Task 2 (120–150 words)**: an article, blog post or story. Title → introduction → what happened (passé composé + imparfait) → feelings/opinion → conclusion or advice.",
    "**Task 3 (120–180 words)**: two documents with opposite views. Part 1: summarise both views neutrally in your own words (40–60 words). Part 2: your opinion with 2 arguments, examples and a conclusion (80–120 words).",
    "**Counting words matters**: too short loses points, too long wastes time. Stay inside the range.",
    "**Keep 5 minutes to proofread**: accents, agreements (e/s), verb endings, and the tu/vous choice.",
    "**Examiners reward**: answering the task, logical organisation with connectors, varied vocabulary, and correct grammar.",
  ]},
  eo: { title: "Speaking: the 3 tasks", icon: "🗣️", body: [
    "**Task 1, guided interview (2 min)**: talk about yourself, your family, work, hobbies, plans. Prepare a 2-minute self-introduction now and polish it every week.",
    "**Task 2, interaction (5 min 30, 2 min prep)**: you ask the examiner questions to get information. Use varied question forms (est-ce que, inversion, question words) and polite forms (Pourriez-vous…, J'aimerais savoir…). Aim for 10–15 questions and react to the answers ('Ah d'accord, et…').",
    "**Task 3, opinion (4 min 30)**: give your opinion on a statement. Use the structure: opinion → argument 1 + example → argument 2 + example → counter-argument (certes… mais) → conclusion.",
    "**Fill silence with French**: 'C'est une bonne question…', 'Laissez-moi réfléchir…', 'Comment dire…'.",
    "**Daily voice note**: record yourself on one task-3 topic every day during the camp and listen back. This is how the camp trains speaking.",
  ]},
  day: { title: "Exam day checklist", icon: "✅", body: [
    "The day before: light review only, prepare your ID and convocation, sleep early.",
    "Eat breakfast and arrive 30 minutes early.",
    "Listening: read ahead, never leave a blank.",
    "Reading: watch the clock, don't spend 5 minutes on one question.",
    "Writing: plan 2 minutes per task, count words, proofread.",
    "Speaking: smile, greet the examiner, speak the whole time, ask them to repeat if needed ('Pourriez-vous répéter, s'il vous plaît ?').",
  ]},
};

// How to study with the videos you add (the program's video method).
window.VIDEO_METHOD = {
  title: "The video method",
  simple: "Each grammar or skill video should be short (under 10 minutes). The video is only the first step: the learning happens in what you do before and after it.",
  analogy: "A video is like watching a cooking show. You only learn to cook when you go to the kitchen and make the dish yourself.",
  steps: [
    { icon: "🎯", name: "Before (2 min)", text: "Read the lesson title and write one sentence: 'After this video I want to be able to…'" },
    { icon: "👀", name: "Watch with focus (10 min)", text: "No phone, no other tabs. Pause when a new rule appears and copy the example into your notebook." },
    { icon: "❓", name: "Extract your questions (5 min)", text: "Write down everything you didn't understand. These go in the video log and in your next review." },
    { icon: "✏️", name: "Do the exercises (15 min)", text: "Do the quiz for that lesson in the app, plus any PDF exercises that came with the video." },
    { icon: "🗣️", name: "Teach it back (3 min)", text: "Explain the rule out loud in English, as if to a friend, then give 3 French examples of your own." },
    { icon: "🔁", name: "Review later", text: "Your wrong answers go to the Mistakes notebook automatically. Review them at the end of the week." },
  ],
};
