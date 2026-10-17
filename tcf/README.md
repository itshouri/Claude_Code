# Chemin TCF

A personal, day-by-day French course for the **TCF Canada**, from your very first word to **NCLC 7+** in 9 months.

It follows the structure of Sara Toumi's TCF Canada program (intro course → A1 → A2 → B1–B2 → Pre-TCF → TCF Camp) and turns it into a self-study plan for one learner. Every page explains things in plain English with an everyday comparison.

## The plan

| Phase | When | What you do |
|---|---|---|
| 1. Le français en images | Month 1 (weeks 1–4) | Your first ~300 words through pictures and sound. No grammar. |
| 2. A1 · Premiers pas | Months 2–3½ (weeks 5–14) | 4 weeks of pronunciation only, then 6 weeks of basic grammar with practice, then review. |
| 3. A2 · En marche | Months 4–5 (weeks 15–21) | Past and future tenses, pronouns, longer sentences, short messages. |
| 4. B1–B2 · Maîtrise | Month 6 (weeks 22–25) | 20% grammar, 80% reading, listening and speaking. |
| 5. Pre-TCF | Month 7 (weeks 26–29) | The exam format, speaking tasks 1 and 2, strategies, your weakest skill. |
| 6. TCF Camp | Months 8–9 (weeks 30–39) | 60 days: daily timed tests, writing combinations, speaking topics with voice notes, then exam week. |

Each phase ends with a **checkpoint** (70% + every can-do statement ticked), because the program's rule is that you move on only when you are fully ready.

## What's inside

- **Today**: your next study day as a checklist. Tap *Start* on a task; finishing the activity ticks it.
- **Roadmap**: 6 phases, 39 weeks, 273 days, plus the 273-day board.
- **Lessons**: 45 lessons (10 pronunciation, 12 A1, 13 A2, 10 B1–B2): rule, analogy, examples with audio, mistakes, quiz.
- **Words + Flashcards**: 27 picture themes and spaced-repetition review (1, 2, 4, 7, 15, 30 days).
- **Practice**: TCF-style listening (read aloud by your device's French voice), reading, writing (timer, word count, model answers, self-score) and speaking (timers, recorder or voice-note upload, model answers).
- **Videos**: add the lesson videos you receive to the right week and lesson, with the video study method.
- **TCF guide**: format, NCLC score table and converter, strategies, exam-day checklist.
- **Mistakes**: every wrong answer, ready to redo.
- **Progress**: skill bars, study minutes, checkpoints, your focus for the week, backup and restore.

## Run it

No build step. Open `tcf/index.html` in a browser, or serve the folder:

```bash
cd tcf && python3 -m http.server 8000   # then visit http://localhost:8000
```

Progress is saved in your browser. Use *Progress → Copy backup* to move it to another device.

## Files

```
tcf/index.html            page shell
tcf/style.css             design
tcf/app.js                router, day planner, quizzes, flashcards, timers, progress
tcf/content/roadmap.js    phases, 39 weeks, checkpoints, TCF guide, video method
tcf/content/vocab.js      picture vocabulary
tcf/content/phonetics.js  pronunciation lessons
tcf/content/grammar-*.js  A1, A2 and B1–B2 lessons
tcf/content/practice.js   listening, reading, writing, speaking, situations
```

To add a lesson, push an object into `window.LESSONS` (same shape as the others) and add its id to a week in `WEEKS` in `content/roadmap.js`.
