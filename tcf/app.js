/* Chemin TCF — a day-by-day French course for the TCF Canada.
   Plain JavaScript, no build step. Content lives in content/*.js. */
(function () {
  "use strict";

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  const addDays = (d, n) => { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (s) => String(s).trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/[.!?]$/, "");
  const plain = (s) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
  const TOTAL_DAYS = 273;

  const LESSONS = window.LESSONS, VOCAB = window.VOCAB, PHASES = window.PHASES, WEEKS = window.WEEKS;
  const L = Object.fromEntries(LESSONS.map((x) => [x.id, x]));
  const V = Object.fromEntries(VOCAB.map((x) => [x.id, x]));
  const LI = Object.fromEntries(window.LISTENING.map((x) => [x.id, x]));
  const RE = Object.fromEntries(window.READING.map((x) => [x.id, x]));
  const WR = Object.fromEntries(window.WRITING.map((x) => [x.id, x]));
  const SP = Object.fromEntries(window.SPEAKING.map((x) => [x.id, x]));
  const SI = Object.fromEntries(window.SITUATIONS.map((x) => [x.id, x]));
  const PH = Object.fromEntries(PHASES.map((x) => [x.id, x]));
  const LEVEL_NAME = { phon: "Pronunciation", A1: "A1 grammar", A2: "A2 grammar", B: "B1–B2 grammar" };

  // ---------- state (saved in this browser, and in your claude.ai account when available) ----------
  const KEY = "chemin-tcf-v1";
  const blank = () => ({ v: 1, updated: 0, name: "", start: "", accent: "fr-FR", done: {}, quiz: {}, hist: [], errors: [], cards: {}, writing: {}, speaking: {}, videos: [], cp: {}, mins: {}, override: {}, learned: {} });
  let S = blank();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* storage blocked: start fresh */ }
  let remote = null, saveTimer = null, syncNote = "Saved in this browser";

  function save() {
    S.updated = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (remote) remote.set({ json: JSON.stringify(S) }).catch(() => {}); }, 1200);
  }

  async function connectAccount() {
    if (!window.claude || !window.claude.use) return;
    try {
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.doc("data/users/" + id + "/state");
      const snap = await ref.get();
      if (snap.exists) {
        const data = JSON.parse(snap.data().json || "{}");
        if ((data.updated || 0) > (S.updated || 0)) { S = Object.assign(blank(), data); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} render(); }
      }
      remote = ref;
      syncNote = "Saved to your account";
      if (!snap.exists && S.updated) save();
      const f = $("#syncnote"); if (f) f.textContent = syncNote;
    } catch (e) { /* stay local */ }
  }

  function log(k, id, s, m) {
    S.hist.push({ t: Date.now(), k, id, s, m });
    if (S.hist.length > 600) S.hist = S.hist.slice(-600);
  }
  function addMinutes(n) { const d = todayStr(); S.mins[d] = (S.mins[d] || 0) + n; }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ---------- speech (your browser's French voice) ----------
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)); } catch (e) { voices = []; } }
  if ("speechSynthesis" in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, rate) {
    if (!("speechSynthesis" in window)) { toast("Your browser has no speech voice. Try Chrome or Safari."); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[—–]/g, ",").replace(/‿/g, ""));
    u.lang = S.accent || "fr-FR";
    const v = voices.find((x) => x.lang.replace("_", "-") === u.lang) || voices[0];
    if (v) u.voice = v;
    u.rate = rate || 0.9;
    speechSynthesis.speak(u);
  }
  const sayBtn = (text, rate) => `<button class="say" data-say="${esc(text)}"${rate ? ` data-rate="${rate}"` : ""} aria-label="Listen" title="Listen">🔊</button>`;

  // ---------- the day plan ----------
  const weekOf = (d) => Math.ceil(d / 7);
  const W = (n) => WEEKS[n - 1];
  const lessonsOfLevels = (levels) => LESSONS.filter((x) => levels.includes(x.level));
  const KIND = {
    lesson: { icon: "📘", min: 30 }, vocab: { icon: "🖼️", min: 20 }, flash: { icon: "🃏", min: 10 }, vquiz: { icon: "🎯", min: 10 },
    listen: { icon: "🎧", min: 15 }, read: { icon: "📖", min: 15 }, write: { icon: "✍️", min: 25 }, speak: { icon: "🗣️", min: 15 },
    video: { icon: "🎬", min: 30 }, mistakes: { icon: "🩹", min: 10 }, checkpoint: { icon: "🏁", min: 40 }, exam: { icon: "🗺️", min: 20 },
    say: { icon: "💬", min: 10 }, homework: { icon: "📝", min: 15 }, review: { icon: "🔁", min: 20 }, plan: { icon: "🧭", min: 10 },
    mock: { icon: "⏱️", min: 60 }, situation: { icon: "🎭", min: 15 }, rest: { icon: "☕", min: 0 }, material: { icon: "📦", min: 60 },
  };

  const TEMPLATES = {
    images: [["vocab", "say", "flash"], ["vocab", "flash", "say"], ["vocab", "listen"], ["lesson?", "video", "vocab?", "flash"], ["vquiz", "speak"], ["flash", "mistakes", "sayweek"], ["rest"]],
    phon: [["lesson", "flash"], ["readaloud", "vocab"], ["lesson", "flash"], ["video", "vocab?", "flash"], ["lesson?", "listen"], ["mistakes", "vquiz", "readaloud"], ["rest"]],
    grammar: [["lesson", "vocab"], ["video", "homework", "flash"], ["lesson", "flash"], ["video", "homework", "vocab?"], ["lesson?", "read", "listen"], ["write?", "speak", "mistakes"], ["rest"]],
    review: [["lesson?", "review"], ["lesson?", "listen", "read"], ["write", "speak"], ["review", "mistakes"], ["listen", "read", "flash"], ["speak", "situation", "flash"], ["checkpoint"]],
    b: [["lesson", "listen"], ["read", "speak", "flash"], ["lesson", "listen"], ["video", "read"], ["lesson?", "listen", "speak"], ["write", "mistakes"], ["rest"]],
    pre: [["exam", "speak"], ["listen", "read"], ["speak", "lesson?"], ["write", "plan"], ["listen", "read", "speak"], ["exam?", "mistakes", "flash"], ["rest"]],
  };
  const SAY_INTRO = ["Bonjour, je m'appelle …", "J'habite à …", "Je suis … (your job)", "J'ai … ans.", "J'aime …"];
  const SAY_WEEK = {
    1: ["Bonjour ! Je m'appelle Sara. J'ai trente ans.", "J'aime le bleu et le rouge."],
    2: ["J'aime le pain, le fromage et les pommes.", "Je n'aime pas les oignons."],
    3: ["J'habite dans un appartement avec ma famille.", "Il y a trois chambres et une grande cuisine."],
    4: ["Je suis ingénieur. Je travaille du lundi au vendredi.", "Je me lève à sept heures et je vais au travail en bus."],
  };

  let PLAN = null;
  function buildPlan() {
    const days = [];
    const counters = { lr: 0, w: 0, s: 0 };
    const writeIds = window.WRITING.map((x) => x.id), t3w = window.WRITING.filter((x) => x.task === 3).map((x) => x.id);
    const t3s = window.SPEAKING.filter((x) => x.task === 3).map((x) => x.id), allS = window.SPEAKING.map((x) => x.id);
    const bListen = window.LISTENING.filter((x) => /B/.test(x.level)).map((x) => x.id), bRead = window.READING.filter((x) => /B/.test(x.level)).map((x) => x.id);
    for (const wk of WEEKS) {
      if (wk.phase === "camp") { days.push(...campWeek(wk, counters, { writeIds, t3w, t3s, allS, bListen, bRead })); continue; }
      const tpl = wk.review ? TEMPLATES.review : wk.phase === "images" ? TEMPLATES.images : wk.phase === "pre" ? TEMPLATES.pre : wk.phase === "b" ? TEMPLATES.b : wk.kind === "phon" ? TEMPLATES.phon : TEMPLATES.grammar;
      const q = { lesson: (wk.lessons || []).slice(), vocab: (wk.vocab || []).slice(), listen: (wk.listen || []).slice(), read: (wk.read || []).slice(), write: (wk.write || []).slice(), speak: (wk.speak || []).slice(), exam: (wk.exam || []).slice() };
      const used = { lesson: [], vocab: [], listen: [], read: [], write: [], speak: [], exam: [] };
      const take = (k, optional) => {
        if (q[k].length) { const x = q[k].shift(); used[k].push(x); return x; }
        if (optional) return null;
        const pool = used[k].length ? used[k] : (wk[k] || []);
        if (!pool.length) return null;
        const x = pool[(used[k].reuse = (used[k].reuse || 0) + 1) % pool.length];
        return x;
      };
      let lastLesson = null;
      tpl.forEach((slots, i) => {
        const d = (wk.w - 1) * 7 + i + 1, tasks = [];
        let s = slots;
        if (i === 6 && wk.checkpoint && !s.includes("checkpoint")) s = ["checkpoint", "flash"];
        for (let slot of s) {
          const opt = slot.endsWith("?"); slot = slot.replace("?", "");
          if (slot === "lesson") { const id = take("lesson", opt); if (id) { lastLesson = id; tasks.push({ k: "lesson", ref: id }); } else if (!opt) tasks.push({ k: "review", ref: wk.phase }); }
          else if (["vocab", "listen", "read", "write", "speak", "exam"].includes(slot)) { const id = take(slot, opt); if (id) tasks.push({ k: slot, ref: id }); else if (!opt && slot !== "exam") tasks.push({ k: "flash" }); }
          else if (slot === "video") tasks.push({ k: "video", ref: lastLesson || (wk.lessons || [])[0] || "", w: wk.w });
          else if (slot === "homework") { const id = lastLesson || (wk.lessons || [])[0]; if (id) tasks.push({ k: "homework", ref: id }); }
          else if (slot === "say") tasks.push({ k: "say", lines: wk.w === 1 ? SAY_INTRO : (SAY_WEEK[wk.w] || SAY_INTRO) });
          else if (slot === "sayweek") tasks.push({ k: "say", lines: ["Talk for 1 minute about this week's topic: " + wk.title.toLowerCase() + "."].concat(SAY_WEEK[wk.w] || []), week: true });
          else if (slot === "readaloud") { const id = lastLesson || (wk.lessons || [])[0]; tasks.push({ k: "say", lines: (L[id] ? L[id].examples.map((e) => e[0]) : []).slice(0, 4), read: true }); }
          else if (slot === "vquiz") tasks.push({ k: "vquiz", ref: String(wk.w) });
          else if (slot === "review") tasks.push({ k: "review", ref: wk.phase });
          else if (slot === "situation") tasks.push({ k: "situation", ref: window.SITUATIONS[wk.w % window.SITUATIONS.length].id });
          else if (slot === "checkpoint") tasks.push({ k: "checkpoint", ref: wk.checkpoint });
          else tasks.push({ k: slot });
        }
        days.push({ d, w: wk.w, phase: wk.phase, tasks });
      });
    }
    return days;
  }

  function campWeek(wk, c, P) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = (wk.w - 1) * 7 + i + 1, t = [];
      const lr = () => { c.lr++; t.push(c.lr <= 45 ? { k: "mock", ref: c.lr, label: `Listening + reading test #${c.lr} of 45 (timed)` } : { k: "mock", ref: c.lr, label: `Review test (day ${c.lr - 45} of 15): redo your weakest test` }); };
      const wr = (pool) => { c.w++; const id = pool[(c.w - 1) % pool.length]; t.push({ k: "write", ref: id, label: c.w <= 40 ? `Writing combination #${c.w} of 40` : `Expected combination review (${c.w - 40} of 15)` }); };
      const sp = (pool) => { c.s++; const id = pool[(c.s - 1) % pool.length]; t.push({ k: "speak", ref: id, label: c.s <= 45 ? `Speaking topic #${c.s} of 45 + voice note` : `Speaking review (${c.s - 45} of 15) + voice note` }); };
      if (i === 6 && wk.camp !== "exam") { t.push({ k: "mistakes" }, { k: "flash" }, { k: "rest" }); out.push({ d, w: wk.w, phase: "camp", tasks: t }); continue; }
      switch (wk.camp) {
        case "overview": if (i === 0) t.push({ k: "exam", ref: "format" }); lr(); if (i % 2) wr(P.writeIds); else sp(P.allS); break;
        case "write3": if (i === 0) t.push({ k: "exam", ref: "ee" }); lr(); wr(P.t3w); sp(P.t3s); break;
        case "speak3": if (i === 0) t.push({ k: "exam", ref: "eo" }); lr(); wr(P.writeIds); sp(P.t3s); break;
        case "fullwrite": lr(); t.push({ k: "write", ref: P.writeIds[i % 4], label: "Full writing exam: tasks 1 + 2 + 3 in 60 minutes" }); c.w++; sp(P.t3s); break;
        case "rotation": lr(); wr(P.writeIds); sp(i % 3 === 0 ? P.allS : P.t3s); if (i === 5) t.push({ k: "plan" }); break;
        case "review": lr(); wr(P.t3w); sp(P.t3s); t.push({ k: "mistakes" }); break;
        case "exam":
          if (i < 3) { t.push({ k: "mistakes" }, { k: "flash" }); sp(P.t3s); }
          else if (i === 3) t.push({ k: "mock", ref: 0, label: "Full exam simulation: all 4 sections, timed" });
          else if (i === 4) t.push({ k: "exam", ref: "day" }, { k: "rest" });
          else if (i === 5) t.push({ k: "exam", ref: "day", label: "Exam day (or your last practice day). Bonne chance !" });
          else t.push({ k: "checkpoint", ref: "camp" });
          break;
      }
      if (i < 6 && wk.camp !== "exam") t.push({ k: "material", label: "Your own camp material: today's video or test from your teacher/book" });
      out.push({ d, w: wk.w, phase: "camp", tasks: t });
    }
    return out;
  }

  function taskInfo(t) {
    const k = KIND[t.k] || { icon: "•", min: 10 };
    let label = t.label, href = "", sub = "";
    switch (t.k) {
      case "lesson": label = label || `Study + quiz: ${L[t.ref].title}`; href = "#lesson-" + t.ref; sub = LEVEL_NAME[L[t.ref].level]; break;
      case "vocab": label = label || `New words: ${V[t.ref].title}`; href = "#words-" + t.ref; sub = `${V[t.ref].words.length} words with pictures. Listen, repeat, add to flashcards.`; break;
      case "flash": label = "Flashcards: review the words that are due"; href = "#flash"; break;
      case "vquiz": label = "Picture quiz: this week's words"; href = "#vquiz-" + t.ref; break;
      case "listen": label = label || `Listening: ${LI[t.ref].title}`; href = "#listen-" + t.ref; sub = LI[t.ref].level; break;
      case "read": label = label || `Reading: ${RE[t.ref].title}`; href = "#read-" + t.ref; sub = RE[t.ref].level; break;
      case "write": label = label || `Writing task ${WR[t.ref].task}`; href = "#write-" + t.ref; sub = WR[t.ref].en; break;
      case "speak": label = label || `Speaking task ${SP[t.ref].task}`; href = "#speak-" + t.ref; sub = SP[t.ref].en; break;
      case "video": label = "Video lesson, using the video method"; href = "#videos-" + t.w; sub = t.ref && L[t.ref] ? `Topic: ${L[t.ref].title}. Watch, write your questions, do the exercises.` : "Watch your video for this week, then do the exercises."; break;
      case "homework": label = `Daily homework: write 5 sentences using "${L[t.ref].fr}"`; href = "#lesson-" + t.ref; sub = "Write them in your notebook, then read them aloud."; break;
      case "mistakes": label = "Mistakes notebook: redo what you got wrong"; href = "#mistakes"; break;
      case "checkpoint": label = window.CHECKPOINTS[t.ref].title; href = "#cp-" + t.ref; sub = "You move on when you score 70% or more and tick every can-do statement."; break;
      case "exam": label = label || `Exam guide: ${window.EXAM[t.ref].title}`; href = "#exam-" + t.ref; break;
      case "say": label = t.read ? "Read aloud: listen, repeat, record yourself" : t.week ? "Speak: 1 minute about this week" : "Say it out loud (listen, then repeat 3 times)"; break;
      case "review": label = `Review quiz: mixed questions from ${PH[t.ref].name}`; href = "#review-" + t.ref; break;
      case "plan": label = "Your personal plan: check your weakest skill"; href = "#progress-plan"; break;
      case "mock": label = label || "Timed test"; href = "#mock-" + t.ref; sub = "Platform practice set. If you have official-style tests, use test #" + t.ref + " from your material instead."; break;
      case "situation": label = `Real-life situation: ${SI[t.ref].title}`; href = "#sit-" + t.ref; break;
      case "rest": label = label || "Rest day. A 5-minute flashcard review keeps your streak."; break;
      case "material": break;
    }
    return { icon: k.icon, min: t.k === "write" && /Full/.test(label) ? 60 : k.min, label, href, sub };
  }

  const tkey = (d, i) => d + "." + i;
  const dayDone = (day) => day.tasks.filter((t, i) => S.done[tkey(day.d, i)]).length;
  const dayState = (day) => { const n = dayDone(day); return n === 0 ? "" : n >= day.tasks.length ? "full" : "half"; };
  const nextDay = () => { for (const day of PLAN) if (dayDone(day) < day.tasks.length) return day.d; return TOTAL_DAYS; };
  const calendarDay = () => (S.start ? Math.min(TOTAL_DAYS, Math.max(1, daysBetween(S.start, todayStr()) + 1)) : null);

  function setDone(d, i, val) {
    const k = tkey(d, i), was = !!S.done[k];
    if (val === was) return;
    if (val) { S.done[k] = todayStr(); addMinutes(taskInfo(PLAN[d - 1].tasks[i]).min); } else delete S.done[k];
    save();
  }
  // When you open an activity from a task, finishing the activity ticks the task.
  let ctx = null;
  function finished(k, ref) {
    if (ctx && ctx.k === k && (ref === undefined || String(ctx.ref) === String(ref))) { setDone(ctx.d, ctx.i, true); toast("Task done ✓"); ctx = null; }
  }

  function streak() {
    const dates = new Set(Object.values(S.done));
    let n = 0, d = todayStr();
    if (!dates.has(d)) d = addDays(d, -1);
    while (dates.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---------- flashcards (Leitner boxes: 1, 2, 4, 7, 15, 30 days) ----------
  const INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  function addTheme(id) { V[id].words.forEach((w, i) => { const k = id + ":" + i; if (!S.cards[k]) S.cards[k] = { b: 0, due: todayStr() }; }); S.learned[id] = todayStr(); save(); }
  const dueCards = () => Object.keys(S.cards).filter((k) => S.cards[k].due <= todayStr());
  const wordOf = (k) => { const [t, i] = k.split(":"); return V[t] && V[t].words[+i]; };

  // ---------- quiz engine ----------
  function quizHTML(qs, id) {
    return `<div class="quiz" data-quiz="${esc(id)}">${qs.map((q, n) => `
      <div class="q" data-n="${n}">
        <div><span class="num muted">${n + 1}.</span> ${md(q.q)}</div>
        ${q.t === "fill" ? `<input type="text" id="qf-${esc(id)}-${n}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer">`
          : `<div class="opts">${q.o.map((o, j) => `<button class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div>`}
        <div class="fb" hidden></div>
      </div>`).join("")}
      <div class="row"><button class="btn primary" data-check>Check my answers</button><span class="result"></span></div>
    </div>`;
  }
  function wireQuiz(root, qs, id, onDone) {
    const box = $(`[data-quiz="${CSS.escape(id)}"]`, root);
    if (!box) return;
    box.addEventListener("click", (e) => {
      const o = e.target.closest(".opt");
      if (o && !box.dataset.checked) { $$(".opt", o.parentElement).forEach((x) => x.classList.remove("sel")); o.classList.add("sel"); }
    });
    $("[data-check]", box).addEventListener("click", () => {
      if (box.dataset.checked) { // retry
        delete box.dataset.checked; $$(".opt", box).forEach((x) => x.classList.remove("sel", "right", "wrong")); $$("input", box).forEach((x) => (x.value = "")); $$(".fb", box).forEach((x) => (x.hidden = true));
        $("[data-check]", box).textContent = "Check my answers"; $(".result", box).textContent = ""; return;
      }
      let score = 0;
      qs.forEach((q, n) => {
        const qel = $(`.q[data-n="${n}"]`, box), fb = $(".fb", qel);
        let ok = false, your = "", right = "", accentNote = false;
        if (q.t === "fill") {
          your = $("input", qel).value; right = q.a[0];
          ok = q.a.some((a) => norm(a) === norm(your));
          if (!ok && q.a.some((a) => plain(a) === plain(your)) && your.trim()) { ok = true; accentNote = true; }
        } else {
          const sel = $(".opt.sel", qel); const j = sel ? +sel.dataset.j : -1;
          your = j >= 0 ? q.o[j] : "(no answer)"; right = q.o[q.a]; ok = j === q.a;
          $$(".opt", qel).forEach((x) => { if (+x.dataset.j === q.a) x.classList.add("right"); else if (x === sel) x.classList.add("wrong"); });
        }
        if (ok) score++;
        else if (id !== "retry") S.errors.unshift({ t: Date.now(), src: id, q: q.q, your, right, why: q.why || "", qq: { t: q.t || "mcq", q: q.q, o: q.o, a: q.a, why: q.why } });
        fb.hidden = false; fb.className = "fb why " + (ok ? "ok" : "no");
        fb.innerHTML = (ok ? (accentNote ? "✓ Correct, but check the accents: <b>" + esc(right) + "</b>. " : "✓ Correct. ") : "✗ Answer: <b>" + esc(right) + "</b>. ") + esc(q.why || "");
      });
      if (S.errors.length > 300) S.errors = S.errors.slice(0, 300);
      box.dataset.checked = "1";
      $("[data-check]", box).textContent = "Try again";
      $(".result", box).innerHTML = `<span class="score">${score}/${qs.length}</span> <span class="muted">${score / qs.length >= 0.8 ? "Très bien !" : score / qs.length >= 0.6 ? "Not bad. Review the red ones." : "Read the lesson again, then retry."}</span>`;
      onDone && onDone(score, qs.length);
      save();
    });
  }
  function recordQuiz(id, s, m, kind) {
    const r = S.quiz[id] || { best: 0, tries: 0 };
    r.tries++; r.last = Math.round((s / m) * 100); r.best = Math.max(r.best, r.last); S.quiz[id] = r;
    log(kind, id, s, m);
  }

  // ---------- pages ----------
  const NAV = [
    ["today", "☀️", "Today"], ["roadmap", "🗺️", "Roadmap"], ["lessons", "📘", "Lessons"], ["words", "🖼️", "Words"], ["flash", "🃏", "Flashcards"],
    ["practice", "🎧", "Practice"], ["videos", "🎬", "Videos"], ["exam", "🎯", "TCF guide"], ["mistakes", "🩹", "Mistakes"], ["progress", "📈", "Progress"],
  ];
  const TABS = [["today", "●", "Today"], ["roadmap", "◫", "Roadmap"], ["lessons", "▤", "Learn"], ["practice", "◎", "Practice"], ["more", "☰", "More"]];
  const section = (r) => { const base = r.split("-")[0]; return { week: "roadmap", day: "roadmap", lesson: "lessons", cp: "roadmap", review: "lessons", vquiz: "words", listen: "practice", read: "practice", write: "practice", speak: "practice", sit: "practice", mock: "practice", "progress": "progress" }[base] || base; };

  function shell() {
    let app = document.getElementById("app");
    if (!app) { app = document.createElement("div"); app.id = "app"; document.body.appendChild(app); }
    app.innerHTML = `
      <div class="shell">
        <nav class="rail" aria-label="Main">
          <a class="brand" href="#today"><span class="flag"><i></i><i></i><i></i></span>Chemin TCF</a>
          ${NAV.map(([r, i, n]) => `<a class="nav" data-r="${r}" href="#${r}">${n}</a>`).join("")}
          <div class="sep"></div>
          <a class="nav" data-r="method" href="#method">How to use this</a>
          <div class="foot"><span id="syncnote">${syncNote}</span></div>
        </nav>
        <main class="main" id="main"></main>
        <nav class="tabbar" aria-label="Main">${TABS.map(([r, i, n]) => `<a data-r="${r}" href="#${r}"><span>${i}</span><span>${n}</span></a>`).join("")}</nav>
      </div>`;
  }

  function render() {
    const r = (location.hash || "#today").slice(1) || "today";
    const [base, ...rest] = r.split("-"); const arg = rest.join("-");
    const sec = section(r);
    $$("[data-r]").forEach((a) => a.classList.toggle("on", a.dataset.r === sec || (a.dataset.r === "more" && !TABS.some((t) => t[0] === sec))));
    if (!["listen", "read", "write", "speak", "lesson", "vquiz", "flash", "cp", "review", "mock", "words", "sit", "videos", "mistakes", "exam", "progress"].includes(base)) ctx = null;
    const main = $("#main");
    const pages = { today: pageToday, roadmap: pageRoadmap, week: () => pageWeek(+arg), day: () => pageDay(+arg), lessons: pageLessons, lesson: () => pageLesson(arg),
      words: () => (arg ? pageTheme(arg) : pageWords()), flash: pageFlash, vquiz: () => pageVQuiz(arg), practice: pagePractice, listen: () => pageListen(arg), read: () => pageRead(arg),
      write: () => pageWrite(arg), speak: () => pageSpeak(arg), sit: () => pageSituation(arg), mock: () => pageMock(+arg), videos: () => pageVideos(arg), exam: () => pageExam(arg),
      mistakes: pageMistakes, progress: () => pageProgress(arg), cp: () => pageCheckpoint(arg), review: () => pageReview(arg), method: pageMethod, more: pageMore };
    main.innerHTML = `<div class="page">${(pages[base] || pageToday)()}</div>`;
    window.scrollTo(0, 0);
    if (arg && (base === "exam" || base === "progress")) { const el = document.getElementById("sec-" + arg); if (el) el.scrollIntoView(); }
    after.forEach((f) => f(main)); after = [];
  }
  let after = [];
  const later = (f) => after.push(f);

  // Today
  function pageToday() {
    const nd = nextDay(), day = PLAN[nd - 1], wk = W(day.w), ph = PH[wk.phase];
    const cal = calendarDay(), done = PLAN.filter((x) => dayState(x) === "full").length;
    const diff = cal ? nd - cal : 0;
    const gate = gateWarning(wk);
    const dueN = dueCards().length;
    const setup = !S.start ? `
      <div class="card">
        <h2>Welcome. Let's set up your 9 months.</h2>
        <p class="muted">This is your personal French course for the TCF Canada: 39 weeks, one plan for every day, from your first word to the exam. Choose a start date so the app can tell you if you're on track.</p>
        <div class="grid">
          <div class="field"><label for="su-name">Your first name (optional)</label><input type="text" id="su-name" value="${esc(S.name)}"></div>
          <div class="field"><label for="su-start">Start date</label><input type="date" id="su-start" value="${todayStr()}"></div>
          <div class="field"><label for="su-acc">French voice accent</label><select id="su-acc"><option value="fr-FR">France (fr-FR)</option><option value="fr-CA">Québec (fr-CA)</option></select></div>
        </div>
        <div class="row"><button class="btn primary" id="su-go">Start my plan</button><a class="btn ghost" href="#method">How does it work?</a></div>
      </div>` : "";
    later(() => {
      const go = $("#su-go"); if (go) go.onclick = () => { S.name = $("#su-name").value.trim(); S.start = $("#su-start").value || todayStr(); S.accent = $("#su-acc").value; save(); render(); };
    });
    return `
      <section class="hero">
        <div class="stack">
          <span class="label">Day ${nd} of ${TOTAL_DAYS} · Week ${day.w} of 39 · ${esc(ph.months)}</span>
          <h1>Bonjour${S.name ? " " + esc(S.name) : ""} ! <em>${esc(wk.title)}</em></h1>
          <div class="row"><span class="chip pc ${ph.color}">Phase ${ph.n}: ${esc(ph.name)}</span>
            ${cal ? `<span class="chip ${diff >= 0 ? "good" : "warn"}">${diff === 0 ? "Right on schedule" : diff > 0 ? diff + " day" + (diff > 1 ? "s" : "") + " ahead" : -diff + " day" + (diff < -1 ? "s" : "") + " behind: no stress, just continue"}</span>` : ""}
          </div>
        </div>
        ${ring(pct(done, TOTAL_DAYS), "of plan")}
      </section>
      ${setup}
      ${gate}
      <div class="card">
        <div class="spread"><h2>Today's plan</h2><a class="small" href="#day-${nd}">Open day ${nd}</a></div>
        <p class="muted small">Goal this week: ${esc(wk.goal)}</p>
        ${taskList(day)}
      </div>
      <div class="stats">
        <div class="stat"><div class="label">Streak</div><div class="v">${streak()}</div></div>
        <div class="stat"><div class="label">Cards due</div><div class="v">${dueN}</div></div>
        <div class="stat"><div class="label">Mistakes to fix</div><div class="v">${S.errors.length}</div></div>
        <div class="stat"><div class="label">Study time</div><div class="v">${Math.round(Object.values(S.mins).reduce((a, b) => a + b, 0) / 60)} h</div></div>
      </div>
      <div class="card">
        <div class="spread"><h3>Why this phase? ${esc(ph.en)}</h3><span class="chip">${esc(ph.months)}</span></div>
        <p>${md(ph.simple)}</p>
        <div class="note analogy"><b>Think of it like this</b>${md(ph.analogy)}</div>
      </div>
      <div class="card"><div class="spread"><h3>Your 273-day board</h3><a class="small" href="#roadmap">See the roadmap</a></div>${board(nd)}</div>`;
  }

  function gateWarning(wk) {
    const idx = PHASES.findIndex((p) => p.id === wk.phase);
    if (idx <= 0) return "";
    const prev = PHASES[idx - 1].id;
    if (!window.CHECKPOINTS[prev] || (S.cp[prev] && S.cp[prev].passed) || S.override[prev]) return "";
    later((m) => { const b = $("#ov", m); if (b) b.onclick = () => { S.override[prev] = true; save(); render(); }; });
    return `<div class="note alert"><b>Checkpoint first</b>The program's rule: you only move to the next level when you are fully ready. You haven't passed <a href="#cp-${prev}">${esc(window.CHECKPOINTS[prev].title)}</a> yet.
      <div class="row" style="margin-top:8px"><a class="btn small red" href="#cp-${prev}">Take the checkpoint</a><button class="btn small ghost" id="ov">Continue anyway</button></div></div>`;
  }

  function ring(p, sub) {
    const c = 2 * Math.PI * 40, off = c * (1 - p / 100);
    return `<svg class="ring" viewBox="0 0 100 100" role="img" aria-label="${p}% ${sub}"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" cx="50" cy="50" r="40" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 50 50)"/><text x="50" y="52" text-anchor="middle">${p}%</text><text class="sub" x="50" y="66" text-anchor="middle">${sub}</text></svg>`;
  }

  function board(now) {
    // 39 columns (weeks) × 7 rows (days): fill column by column.
    let cells = "";
    for (let r = 0; r < 7; r++) for (let c = 0; c < 39; c++) { const d = c * 7 + r + 1, day = PLAN[d - 1]; cells += `<a href="#day-${d}" class="${dayState(day)}${d === now ? " now" : ""}" title="Day ${d} · Week ${c + 1}" aria-label="Day ${d}"></a>`; }
    return `<div class="board-wrap"><div class="board">${cells}</div><div class="board-legend"><span>Each column is a week, each square a day</span><span><i></i>not started</span><span><i class="half"></i>started</span><span><i class="full"></i>done</span></div></div>`;
  }

  function taskList(day) {
    later((m) => {
      $$(`.task[data-d="${day.d}"]`, m).forEach((el) => {
        const i = +el.dataset.i;
        $(".check", el).onclick = () => { setDone(day.d, i, !S.done[tkey(day.d, i)]); render(); };
        const go = $("a.btn", el); if (go) go.onclick = () => { const t = day.tasks[i]; ctx = { d: day.d, i, k: t.k, ref: t.ref }; };
      });
    });
    return `<div class="tasks">${day.tasks.map((t, i) => {
      const info = taskInfo(t), isDone = !!S.done[tkey(day.d, i)];
      const lines = t.lines && t.lines.length ? `<div class="inline-say">${t.lines.map((x) => /^Talk for/.test(x) ? `<div class="muted small">${esc(x)}</div>` : `<div>${sayBtn(x.replace(/…|\(.*?\)/g, ""))}<span>${esc(x)}</span></div>`).join("")}</div>` : "";
      return `<div class="task${isDone ? " done" : ""}" data-d="${day.d}" data-i="${i}">
        <button class="check" aria-label="Mark done">${isDone ? "✓" : ""}</button>
        <div class="lbl"><span>${esc(info.label)}</span>${info.sub ? `<small>${esc(info.sub)}</small>` : ""}${lines}</div>
        <div class="go">${info.min ? `<span class="chip num">${info.min}′</span>` : ""}${info.href ? `<a class="btn small" href="${info.href}">Start</a>` : ""}</div>
      </div>`;
    }).join("")}</div>`;
  }

  // Roadmap
  function pageRoadmap() {
    const nd = nextDay(), cw = weekOf(nd);
    return `
      <div class="stack"><span class="label">9 months · 39 weeks · 273 days</span><h1>Your roadmap to NCLC 7+</h1>
      <p class="muted">The plan follows the TCF Canada program: pictures first, then pronunciation, grammar, skills, the exam format, and a 60-day camp. Each phase ends with a checkpoint. Tap a week to see its days.</p></div>
      <div class="card">${board(nd)}</div>
      ${PHASES.map((p) => {
        const wks = WEEKS.filter((w) => w.phase === p.id);
        const cp = window.CHECKPOINTS[p.id], cps = S.cp[p.id];
        return `<section class="card phase ${p.color}">
          <div class="spread"><div class="stack" style="gap:4px"><span class="label">Phase ${p.n} · ${esc(p.months)} · weeks ${p.weeks[0]}–${p.weeks[1]}</span><h2>${esc(p.name)}</h2><span class="muted">${esc(p.en)}</span></div>
          ${cp ? `<a class="chip ${cps && cps.passed ? "good" : ""}" href="#cp-${p.id}">${cps && cps.passed ? "Passed " + cps.score + "%" : "Checkpoint"}</a>` : ""}</div>
          <p>${md(p.simple)}</p>
          <div class="note analogy"><b>Think of it like this</b>${md(p.analogy)}</div>
          <div><span class="label">By the end you can</span><ul class="points">${p.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>
          <div class="weeks">${wks.map((w) => weekTile(w, cw)).join("")}</div>
        </section>`;
      }).join("")}`;
  }
  function weekTile(w, cw) {
    const ds = PLAN.slice((w.w - 1) * 7, w.w * 7);
    return `<a class="wk${w.w === cw ? " current" : ""}" href="#week-${w.w}"><span class="label">Week ${w.w}${w.w === cw ? " · now" : ""}</span><b>${esc(w.title)}</b><div class="days7">${ds.map((d) => `<i class="${dayState(d)}"></i>`).join("")}</div></a>`;
  }

  function pageWeek(n) {
    if (!(n >= 1 && n <= 39)) n = weekOf(nextDay());
    const w = W(n), p = PH[w.phase], ds = PLAN.slice((n - 1) * 7, n * 7);
    const names = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
    return `
      <div class="crumbs"><a href="#roadmap">Roadmap</a> › <span>${esc(p.name)}</span></div>
      <div class="stack"><span class="label">Week ${n} of 39 · ${esc(p.months)}</span><h1>${esc(w.title)}</h1><p class="muted">Goal: ${esc(w.goal)}</p></div>
      ${w.lessons && w.lessons.length ? `<div class="card"><h3>This week's lessons</h3><div class="row">${w.lessons.map((id) => `<a class="btn small" href="#lesson-${id}">${esc(L[id].title)}</a>`).join("")}</div></div>` : ""}
      <div class="daylist">${ds.map((d, i) => `<div class="card"><div class="spread"><h3><a href="#day-${d.d}">${names[i]} · day ${d.d}</a></h3><span class="chip ${dayState(d) === "full" ? "good" : ""}">${dayDone(d)}/${d.tasks.length} done</span></div>${taskList(d)}</div>`).join("")}</div>
      <div class="row">${n > 1 ? `<a class="btn" href="#week-${n - 1}">← Week ${n - 1}</a>` : ""}${n < 39 ? `<a class="btn" href="#week-${n + 1}">Week ${n + 1} →</a>` : ""}</div>`;
  }
  function pageDay(d) {
    if (!(d >= 1 && d <= TOTAL_DAYS)) d = nextDay();
    const day = PLAN[d - 1], w = W(day.w), p = PH[w.phase];
    const total = day.tasks.reduce((a, t) => a + taskInfo(t).min, 0);
    return `
      <div class="crumbs"><a href="#roadmap">Roadmap</a> › <a href="#week-${day.w}">Week ${day.w}</a> › <span>Day ${d}</span></div>
      <div class="stack"><span class="label">Day ${d} of ${TOTAL_DAYS} · about ${total} minutes</span><h1>${esc(w.title)}</h1><span class="chip pc ${p.color}" style="align-self:flex-start">${esc(p.name)}</span></div>
      ${gateWarning(w)}
      <div class="card">${taskList(day)}</div>
      <div class="row">${d > 1 ? `<a class="btn" href="#day-${d - 1}">← Day ${d - 1}</a>` : ""}${d < TOTAL_DAYS ? `<a class="btn" href="#day-${d + 1}">Day ${d + 1} →</a>` : ""}</div>`;
  }

  // Lessons
  function pageLessons() {
    const groups = ["phon", "A1", "A2", "B"];
    return `<div class="stack"><span class="label">${LESSONS.length} lessons</span><h1>Lessons</h1><p class="muted">Every lesson: the rule in plain English, an everyday comparison, examples you can listen to, common mistakes and a quiz. Your best score shows on each card.</p></div>
      ${groups.map((g) => `<section class="card"><h2>${LEVEL_NAME[g]}</h2><div class="grid">${LESSONS.filter((x) => x.level === g).map((x) => {
        const q = S.quiz[x.id];
        return `<a class="wk" href="#lesson-${x.id}"><b>${esc(x.title)}</b><span class="muted small">${esc(x.fr)}</span><span>${q ? `<span class="chip ${q.best >= 80 ? "good" : q.best >= 60 ? "warn" : "red"}">Best ${q.best}%</span>` : `<span class="chip">Not started</span>`}</span></a>`;
      }).join("")}</div></section>`).join("")}`;
  }
  function pageLesson(id) {
    const x = L[id]; if (!x) return `<p>Lesson not found. <a href="#lessons">All lessons</a></p>`;
    const vids = S.videos.filter((v) => v.lesson === id);
    later((m) => wireQuiz(m, x.quiz, id, (s, n) => { recordQuiz(id, s, n, "lesson"); finished("lesson", id); }));
    return `
      <div class="crumbs"><a href="#lessons">Lessons</a> › <span>${LEVEL_NAME[x.level]}</span></div>
      <div class="stack"><span class="label">${LEVEL_NAME[x.level]}</span><h1>${esc(x.title)}</h1><div class="row">${sayBtn(x.fr)}<span class="muted">${esc(x.fr)}</span></div></div>
      <div class="card">
        <div class="note"><b>In plain words</b>${md(x.simple)}</div>
        <div class="note analogy"><b>Think of it like this</b>${md(x.analogy)}</div>
        <h3>The rule, step by step</h3><ul class="points">${x.points.map((p) => `<li>${md(p)}</li>`).join("")}</ul>
      </div>
      <div class="card"><div class="spread"><h3>Examples</h3><button class="btn small" data-sayall="${esc(x.examples.map((e) => e[0]).join(". "))}">🔊 Play all slowly</button></div>
        <div class="examples">${x.examples.map((e) => `<div class="ex">${sayBtn(e[0])}<div><div class="fr">${esc(e[0])}</div><div class="en">${esc(e[1])}</div></div></div>`).join("")}</div>
        <p class="small muted">Listen, pause, repeat out loud 3 times. Copy the examples into your notebook.</p>
      </div>
      <div class="card"><h3>Common mistakes</h3><ul class="points">${x.mistakes.map((p) => `<li>${md(p)}</li>`).join("")}</ul></div>
      <div class="card"><div class="spread"><h3>Your videos for this lesson</h3><a class="btn small" href="#videos-${weekOfLesson(id)}">+ Add a video</a></div>
        ${vids.length ? `<ul class="clean">${vids.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title || v.url)}</a> ${v.questions ? `<div class="small muted">My questions: ${esc(v.questions)}</div>` : ""}</li>`).join("")}</ul>` : `<p class="muted small">No video yet. When you get the video for this rule, add it here and follow the video method.</p>`}
      </div>
      <div class="card"><h2>Quiz</h2><p class="muted small">Wrong answers go to your Mistakes notebook so you can redo them later.</p>${quizHTML(x.quiz, id)}</div>`;
  }
  function weekOfLesson(id) { const w = WEEKS.find((w) => (w.lessons || []).includes(id)); return w ? w.w : weekOf(nextDay()); }

  function pageReview(phase) {
    const levels = { images: [], a1: ["phon", "A1"], a2: ["A2"], b: ["B"], pre: ["A2", "B"], camp: ["A1", "A2", "B"] }[phase] || ["A1"];
    const qs = shuffle(lessonsOfLevels(levels).flatMap((l) => l.quiz.map((q) => Object.assign({}, q, { src: l.id })))).slice(0, 15);
    const id = "review-" + phase;
    if (!qs.length) return pageVQuiz(String(PH[phase] ? PH[phase].weeks[1] : 1));
    later((m) => wireQuiz(m, qs, id, (s, n) => { log("lesson", id, s, n); finished("review", phase); }));
    return `<div class="stack"><span class="label">Mixed review</span><h1>Review: ${esc(PH[phase] ? PH[phase].name : phase)}</h1><p class="muted">15 random questions from this phase's lessons. Reload the page for a new set.</p></div><div class="card">${quizHTML(qs, id)}</div>`;
  }

  // Words
  function pageWords() {
    return `<div class="stack"><span class="label">${VOCAB.reduce((a, t) => a + t.words.length, 0)} words · ${VOCAB.length} themes</span><h1>Words with pictures</h1>
      <p class="muted">The "Le français en images" method: see the picture, hear the word, say it. Then add the theme to your flashcards so you review it at the right moment.</p></div>
      <div class="grid tight">${VOCAB.map((t) => `<a class="wcard theme" href="#words-${t.id}"><span class="pic">${t.icon}</span><b>${esc(t.title)}</b><span class="small muted">${t.words.length} words</span>${S.learned[t.id] ? `<span class="chip good">In flashcards</span>` : ""}</a>`).join("")}</div>`;
  }
  function pageTheme(id) {
    const t = V[id]; if (!t) return pageWords();
    later((m) => { $("#addtheme", m).onclick = () => { addTheme(id); finished("vocab", id); toast("Added to your flashcards"); render(); }; });
    return `<div class="crumbs"><a href="#words">Words</a> › <span>${esc(t.title)}</span></div>
      <div class="spread"><h1>${t.icon} ${esc(t.title)}</h1><div class="row"><button class="btn" data-sayall="${esc(t.words.map((w) => w[0]).join(". "))}">🔊 Play all</button><button class="btn primary" id="addtheme">${S.learned[id] ? "✓ In flashcards (add again)" : "I've learned these: add to flashcards"}</button></div></div>
      ${t.note ? `<div class="note"><b>Tip</b>${esc(t.note)}</div>` : ""}
      <p class="muted small">Step 1: look at the picture and say what you think it is. Step 2: press 🔊 and repeat 3 times. Step 3: cover the French and test yourself.</p>
      <div class="grid tight">${t.words.map((w) => `<div class="wcard"><span class="pic">${w[2]}</span><div class="row" style="gap:6px;flex-wrap:nowrap">${sayBtn(w[0], 0.8)}<span class="fr">${esc(w[0])}</span></div><span class="muted small">${esc(w[1])}</span>${w[3] ? `<span class="small">💡 ${esc(w[3])}</span>` : ""}</div>`).join("")}</div>`;
  }
  function pageVQuiz(arg) {
    const wk = W(+arg) || W(weekOf(nextDay()));
    let themes = (wk.vocab || []).filter((x) => V[x]);
    if (!themes.length) themes = Object.keys(S.learned).length ? Object.keys(S.learned) : ["greet", "food"];
    const pool = themes.flatMap((t) => V[t].words);
    const qs = shuffle(pool).slice(0, 10).map((w) => {
      const others = shuffle(pool.filter((x) => x !== w)).slice(0, 3).map((x) => x[0]);
      const o = shuffle([w[0], ...others]);
      return { t: "mcq", q: `${w[2]}  "${w[1]}" in French is…`, o, a: o.indexOf(w[0]), why: `${w[0]} = ${w[1]}` };
    });
    const id = "vquiz-" + wk.w;
    later((m) => wireQuiz(m, qs, id, (s, n) => { recordQuiz(id, s, n, "vocab"); finished("vquiz", String(wk.w)); }));
    return `<div class="stack"><span class="label">Week ${wk.w}</span><h1>Picture quiz</h1><p class="muted">Words from: ${themes.map((t) => esc(V[t].title)).join(", ")}. Reload for new questions.</p></div><div class="card">${quizHTML(qs, id)}</div>`;
  }

  function pageFlash() {
    const due = shuffle(dueCards()).slice(0, 20);
    const total = Object.keys(S.cards).length;
    if (!total) return `<h1>Flashcards</h1><div class="card"><p>You have no cards yet. Open a theme in <a href="#words">Words</a> and press "add to flashcards".</p><div class="note analogy"><b>How it works</b>Cards you know move to a box you see less often (after 1, 2, 4, 7, 15, then 30 days). Cards you miss come back tomorrow. Like watering plants: the thirsty ones get water first.</div></div>`;
    if (!due.length) { later(() => finished("flash", undefined)); return `<h1>Flashcards</h1><div class="card"><h2>All done for today ✓</h2><p class="muted">${total} cards in your deck. Come back tomorrow.</p>${boxes()}</div>`; }
    let i = 0, known = 0, mode = "pic";
    later((m) => {
      const card = $("#fc", m);
      const show = (reveal) => {
        if (i >= due.length) {
          log("vocab", "flash", known, due.length); save(); finished("flash", undefined);
          card.innerHTML = `<h2>Session done</h2><p class="score">${known}/${due.length}</p><p class="muted">Cards you missed come back tomorrow.</p><a class="btn" href="#today">Back to today</a>`; return;
        }
        const k = due[i], w = wordOf(k);
        if (!w) { i++; return show(false); }
        card.innerHTML = `<span class="label">Card ${i + 1} of ${due.length} · box ${S.cards[k].b}</span>
          ${mode === "pic" ? `<div class="pic">${w[2]}</div><div class="muted">${esc(w[1])}</div>` : `<div class="big">${esc(w[0])}</div>`}
          ${reveal ? `<div class="row" style="justify-content:center">${sayBtn(w[0], 0.8)}<span class="big">${esc(mode === "pic" ? w[0] : w[1])}</span></div>
            <div class="row" style="justify-content:center"><button class="btn red" data-a="0">Not yet</button><button class="btn primary" data-a="1">I knew it</button></div>`
          : `<button class="btn primary" data-reveal>Show answer</button>`}`;
        if (mode === "fr" && !reveal) speak(w[0], 0.85);
        const rv = $("[data-reveal]", card); if (rv) rv.onclick = () => { show(true); if (mode === "pic") speak(w[0], 0.85); };
        $$("[data-a]", card).forEach((b) => (b.onclick = () => {
          const c = S.cards[k];
          if (b.dataset.a === "1") { known++; c.b = Math.min(6, c.b + 1); } else c.b = 1;
          c.due = addDays(todayStr(), INTERVALS[c.b]); save(); i++; show(false);
        }));
      };
      $$("[data-mode]", m).forEach((b) => (b.onclick = () => { mode = b.dataset.mode; $$("[data-mode]", m).forEach((x) => x.classList.toggle("primary", x === b)); show(false); }));
      show(false);
    });
    return `<div class="spread"><h1>Flashcards</h1><div class="row"><button class="btn small primary" data-mode="pic">Picture → French</button><button class="btn small" data-mode="fr">French → English</button></div></div>
      <div class="card flash" id="fc"></div>${`<div class="card"><h3>Your deck</h3>${boxes()}</div>`}`;
  }
  function boxes() {
    const c = [0, 0, 0, 0, 0, 0, 0]; Object.values(S.cards).forEach((x) => c[x.b]++);
    return `<div class="stack">${c.map((n, b) => `<div class="skill"><span class="small">${b === 0 ? "New" : b === 6 ? "Mastered (30 d)" : "Box " + b + " (" + INTERVALS[b] + " d)"}</span><div class="bar good"><i style="width:${pct(n, Object.keys(S.cards).length)}%"></i></div><span class="num small">${n}</span></div>`).join("")}</div>`;
  }

  // Practice
  function pagePractice() {
    const sc = (id) => { const q = S.quiz[id]; return q ? `<span class="chip ${q.best >= 80 ? "good" : q.best >= 60 ? "warn" : "red"}">${q.best}%</span>` : ""; };
    const done = (o) => (o ? `<span class="chip good">${o.score != null ? o.score + "/20" : "saved"}</span>` : "");
    const item = (href, title, level, extra) => `<a class="wk" href="${href}"><span class="row" style="gap:6px"><span class="chip blue">${level}</span>${extra || ""}</span><b>${esc(title)}</b></a>`;
    return `<div class="stack"><span class="label">The four TCF skills</span><h1>Practice</h1><p class="muted">Listening is read aloud by your device's French voice, so you hear it before you see the text. Writing and speaking come with timers, checklists, model answers and a self-score out of 20.</p></div>
      <section class="card"><h2>Listening (compréhension orale)</h2><div class="weeks">${window.LISTENING.map((x) => item("#listen-" + x.id, x.title, x.level, sc(x.id))).join("")}</div></section>
      <section class="card"><h2>Reading (compréhension écrite)</h2><div class="weeks">${window.READING.map((x) => item("#read-" + x.id, x.title, x.level, sc(x.id))).join("")}</div></section>
      <section class="card"><h2>Writing (expression écrite)</h2><div class="weeks">${window.WRITING.map((x) => item("#write-" + x.id, x.en, "Task " + x.task, done(S.writing[x.id]))).join("")}</div></section>
      <section class="card"><h2>Speaking (expression orale)</h2><div class="weeks">${window.SPEAKING.map((x) => item("#speak-" + x.id, x.en, "Task " + x.task, done(S.speaking[x.id]))).join("")}</div></section>
      <section class="card"><h2>Real-life situations</h2><div class="grid tight">${window.SITUATIONS.map((x) => `<a class="wcard theme" href="#sit-${x.id}"><span class="pic">${x.icon}</span><b>${esc(x.title)}</b></a>`).join("")}</div></section>
      <section class="card"><h2>Timed mini-tests</h2><p class="muted small">A listening set + a reading set at B1–B2 level, timed. Used every day in the TCF Camp.</p><a class="btn" href="#mock-1">Start a mini-test</a></section>`;
  }

  function mcqBlock(set, kind) {
    const id = set.id;
    later((m) => wireQuiz(m, set.qs.map((q) => Object.assign({ t: "mcq" }, q)), id, (s, n) => {
      recordQuiz(id, s, n, kind); finished(kind, id);
      const tr = $("#transcript", m); if (tr) tr.hidden = false;
    }));
    return quizHTML(set.qs.map((q) => Object.assign({ t: "mcq" }, q)), id);
  }
  function pageListen(id) {
    const x = LI[id]; if (!x) return pagePractice();
    return `<div class="crumbs"><a href="#practice">Practice</a> › <span>Listening</span></div>
      <div class="stack"><span class="label">Listening · ${x.level}</span><h1>${esc(x.title)}</h1></div>
      <div class="card"><div class="note"><b>Method</b>1. Read the questions first. 2. Play once at normal speed (like the real exam). 3. Answer. 4. Only then play slowly or read the text.</div>
        <div class="row"><button class="btn primary" data-say="${esc(x.script)}" data-rate="0.95">▶ Play (exam speed)</button><button class="btn" data-say="${esc(x.script)}" data-rate="0.7">🐢 Play slowly</button></div>
        <div id="transcript" hidden><span class="label">Transcript</span><div class="script">${esc(x.script)}</div></div>
      </div>
      <div class="card"><h3>Questions</h3>${mcqBlock(x, "listen")}</div>`;
  }
  function pageRead(id) {
    const x = RE[id]; if (!x) return pagePractice();
    return `<div class="crumbs"><a href="#practice">Practice</a> › <span>Reading</span></div>
      <div class="stack"><span class="label">Reading · ${x.level}</span><h1>${esc(x.title)}</h1></div>
      <div class="card"><div class="note"><b>Method</b>Read the questions first, then find the answers in the text. Underline the words that prove your answer.</div><div class="script">${esc(x.text)}</div><div class="row">${sayBtn(x.text, 0.85)}<span class="small muted">Listen to the text too: it trains your ear.</span></div></div>
      <div class="card"><h3>Questions</h3>${mcqBlock(x, "read")}</div>`;
  }

  const RUBRIC_W = ["I did exactly what the task asked (all points covered)", "My text is organised, with connectors", "My vocabulary is varied and precise", "My grammar is correct (agreements, verb endings)", "Spelling and accents are correct, word count is right"];
  const RUBRIC_S = ["I answered the task fully", "I spoke without long silences", "My pronunciation was clear", "I used varied vocabulary and structures", "I made few grammar mistakes"];
  function rubricHTML(items, idp) {
    return `<div class="rubric">${items.map((r, i) => `<label for="${idp}-${i}">${esc(r)}</label><select id="${idp}-${i}"><option value="0">0 · not yet</option><option value="1">1</option><option value="2" selected>2 · OK</option><option value="3">3</option><option value="4">4 · excellent</option></select>`).join("")}</div>`;
  }
  const rubricScore = (m, idp, n) => Array.from({ length: n }, (_, i) => +$("#" + idp + "-" + i, m).value).reduce((a, b) => a + b, 0);

  function pageWrite(id) {
    const x = WR[id]; if (!x) return pagePractice();
    const saved = S.writing[id] || {};
    const mins = x.task === 1 ? 10 : x.task === 2 ? 20 : 30;
    const checklist = {
      1: ["Greeting adapted to the person (Salut / Bonjour Madame)", "Why I'm writing, in the first sentence", "All the details asked (date, time, place…)", "A closing formula and my name", "tu or vous, used consistently"],
      2: ["A title", "An introduction that sets the scene", "Past tenses: passé composé for events, imparfait for descriptions", "My feelings or opinion", "A conclusion or advice"],
      3: ["Part 1: both opinions summarised in MY words, no personal opinion", "Part 2: my opinion stated clearly", "Two arguments, each with an example", "A counter-argument (Certes… mais…)", "A conclusion"],
    }[x.task];
    later((m) => {
      const ta = $("#wtext", m), wc = $("#wc", m);
      const count = () => { const n = (ta.value.match(/[\p{L}\p{N}'’-]+/gu) || []).length; wc.textContent = `${n} words (target ${x.min}–${x.max})`; wc.className = "wc chip " + (n < x.min ? "warn" : n > x.max ? "red" : "good"); };
      ta.oninput = () => { count(); S.writing[id] = Object.assign(S.writing[id] || {}, { text: ta.value, t: Date.now() }); clearTimeout(ta._t); ta._t = setTimeout(save, 800); };
      count();
      timerWidget(m, "#wtimer", mins * 60);
      const mb = $("#showmodel", m); if (mb) mb.onclick = () => { $("#model", m).hidden = !$("#model", m).hidden; };
      $("#wscore", m).onclick = () => {
        const s = rubricScore(m, "wr", 5);
        S.writing[id] = Object.assign(S.writing[id] || {}, { text: ta.value, score: s, t: Date.now() });
        log("write", id, s, 20); save(); finished("write", id); toast(`Saved: ${s}/20`); render();
      };
    });
    return `<div class="crumbs"><a href="#practice">Practice</a> › <span>Writing task ${x.task}</span></div>
      <div class="stack"><span class="label">Writing task ${x.task} · ${x.min}–${x.max} words · about ${mins} minutes</span><h1>${esc(x.en)}</h1></div>
      <div class="card"><div class="script">${esc(x.prompt)}</div>${sayBtn(x.prompt, 0.85)}</div>
      <div class="card"><div class="spread"><span id="wc" class="wc chip"></span><div class="row"><span class="timer" id="wtimer"></span><button class="btn small" data-t="start">Start timer</button></div></div>
        <textarea id="wtext" lang="fr" spellcheck="false" placeholder="Écrivez ici…">${esc(saved.text || "")}</textarea>
        <p class="small muted">Your text is saved as you type. Spell-check is off, like in the exam.</p></div>
      <div class="card"><h3>Before you finish, check</h3><ul class="points">${checklist.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
      ${x.model ? `<div class="card"><button class="btn" id="showmodel">Show a model answer</button><div id="model" hidden><div class="script">${esc(x.model)}</div>${sayBtn(x.model, 0.9)}</div></div>` : ""}
      <div class="card"><h3>Score yourself (out of 20)</h3><p class="small muted">Be honest: compare with the model answer and the checklist. TCF graders use similar criteria.</p>${rubricHTML(RUBRIC_W, "wr")}<div class="row"><button class="btn primary" id="wscore">Save my score</button>${saved.score != null ? `<span class="chip good">Last score ${saved.score}/20</span>` : ""}</div></div>`;
  }

  function timerWidget(m, sel, secs) {
    const el = $(sel, m); let left = secs, iv = null;
    const fmt = () => (el.textContent = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`);
    fmt();
    const btn = el.parentElement.querySelector("[data-t]");
    if (btn) btn.onclick = () => {
      if (iv) { clearInterval(iv); iv = null; btn.textContent = "Resume"; return; }
      btn.textContent = "Pause";
      iv = setInterval(() => { left--; fmt(); if (left <= 0) { clearInterval(iv); iv = null; btn.textContent = "Time's up"; el.style.color = "var(--red)"; } }, 1000);
      window.addEventListener("hashchange", () => clearInterval(iv), { once: true });
    };
  }

  function recorderHTML() {
    return `<div class="stack"><div class="row"><button class="btn" id="rec">🎙️ Record myself</button><span class="small muted" id="recmsg"></span></div><audio id="recplay" controls hidden></audio>
      <div class="field"><label for="voicefile">Or attach a voice note from your phone's recorder</label><input type="file" id="voicefile" accept="audio/*" capture></div></div>`;
  }
  function wireRecorder(m) {
    const btn = $("#rec", m), msg = $("#recmsg", m), audio = $("#recplay", m);
    let mr = null, chunks = [];
    btn.onclick = async () => {
      if (mr && mr.state === "recording") { mr.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mr = new MediaRecorder(stream); chunks = [];
        mr.ondataavailable = (e) => chunks.push(e.data);
        mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); audio.src = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })); audio.hidden = false; btn.textContent = "🎙️ Record again"; msg.textContent = "Listen back. What would you improve?"; };
        mr.start(); btn.textContent = "⏹ Stop"; msg.textContent = "Recording…";
      } catch (e) { msg.textContent = "Recording isn't allowed here. Use your phone's voice recorder and attach the file below."; btn.disabled = true; }
    };
    $("#voicefile", m).onchange = (e) => { const f = e.target.files[0]; if (f) { audio.src = URL.createObjectURL(f); audio.hidden = false; } };
  }

  function pageSpeak(id) {
    const x = SP[id]; if (!x) return pagePractice();
    const saved = S.speaking[id] || {};
    const tips = {
      1: ["Speak for the full 2 minutes", "Cover: name, age, country, family, job, hobbies, why Canada", "Use connectors: d'abord, ensuite, aussi, parce que"],
      2: ["Use your 2 minutes of preparation to write 10–12 question words", "Vary the forms: est-ce que, inversion, question words", "Be polite: Pourriez-vous… ? J'aimerais savoir…", "React to answers: Ah bon ? D'accord, et…"],
      3: ["Give your opinion in the first sentence", "Two arguments, each with a personal example", "Add a counter-argument: Certes… mais…", "Finish with a clear conclusion"],
    }[x.task];
    later((m) => {
      timerWidget(m, "#stimer", x.time);
      if (x.prep) timerWidget(m, "#ptimer", x.prep);
      wireRecorder(m);
      const mb = $("#showmodel", m); if (mb) mb.onclick = () => { $("#model", m).hidden = !$("#model", m).hidden; };
      $("#sscore", m).onclick = () => { const s = rubricScore(m, "sr", 5); S.speaking[id] = { score: s, t: Date.now() }; log("speak", id, s, 20); save(); finished("speak", id); toast(`Saved: ${s}/20`); render(); };
    });
    return `<div class="crumbs"><a href="#practice">Practice</a> › <span>Speaking task ${x.task}</span></div>
      <div class="stack"><span class="label">Speaking task ${x.task} · ${x.prep ? "2 min preparation · " : "no preparation · "}${Math.floor(x.time / 60)} min ${x.time % 60 ? x.time % 60 + " s" : ""}</span><h1>${esc(x.en)}</h1></div>
      <div class="card"><div class="row">${sayBtn(x.prompt, 0.9)}<div class="script" style="flex:1;min-width:0">${esc(x.prompt)}</div></div></div>
      <div class="card"><div class="grid">${x.prep ? `<div class="stack"><span class="label">Preparation</span><div class="row"><span class="timer" id="ptimer"></span><button class="btn small" data-t>Start</button></div></div>` : ""}
        <div class="stack"><span class="label">Speaking time</span><div class="row"><span class="timer" id="stimer"></span><button class="btn small" data-t>Start</button></div></div></div>
        ${recorderHTML()}</div>
      <div class="card"><h3>Tips for task ${x.task}</h3><ul class="points">${tips.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>
      ${x.model ? `<div class="card"><button class="btn" id="showmodel">Show a model answer</button><div id="model" hidden><div class="script">${esc(x.model)}</div>${sayBtn(x.model, 0.9)}</div></div>` : ""}
      <div class="card"><h3>Score yourself (out of 20)</h3>${rubricHTML(RUBRIC_S, "sr")}<div class="row"><button class="btn primary" id="sscore">Save my score</button>${saved.score != null ? `<span class="chip good">Last score ${saved.score}/20</span>` : ""}</div></div>`;
  }

  function pageSituation(id) {
    const x = SI[id]; if (!x) return pagePractice();
    later(() => finished("situation", id));
    return `<div class="crumbs"><a href="#practice">Practice</a> › <span>Situations</span></div><h1>${x.icon} ${esc(x.title)}</h1>
      <div class="card"><p class="muted">Practical conversation: listen to each sentence, repeat it, then invent your own answer as if someone replied. These are the phrases from the program's "Practical" conversation level.</p>
      <div class="examples">${x.lines.map((l) => `<div class="ex">${sayBtn(l)}<div class="fr">${esc(l)}</div></div>`).join("")}</div></div>`;
  }

  function pageMock(n) {
    const bL = window.LISTENING.filter((x) => /B/.test(x.level)), bR = window.READING.filter((x) => /B/.test(x.level));
    const k = Math.max(0, (n || 1) - 1);
    const ls = [bL[k % bL.length], bL[(k + 1) % bL.length]], rs = [bR[k % bR.length], bR[(k + 2) % bR.length]];
    const qs = [...ls, ...rs].flatMap((s) => s.qs.map((q) => Object.assign({ t: "mcq" }, q, { q: `[${s.title}] ${q.q}` })));
    const id = "mock-" + (n || 1);
    later((m) => {
      timerWidget(m, "#mtimer", 25 * 60);
      wireQuiz(m, qs, id, (s, c) => { recordQuiz(id, s, c, "mock"); finished("mock", n); });
    });
    return `<div class="crumbs"><a href="#practice">Practice</a> › <span>Timed test</span></div>
      <div class="stack"><span class="label">${n ? "Test #" + n : "Full simulation"} · 25 minutes</span><h1>Timed mini-test</h1><p class="muted">Two recordings (play each only once!) and two texts. Start the timer, then work without pausing.</p></div>
      <div class="card"><div class="row"><span class="timer" id="mtimer"></span><button class="btn small" data-t>Start timer</button></div></div>
      ${ls.map((x, i) => `<div class="card"><h3>Recording ${i + 1}: ${esc(x.title)}</h3><button class="btn primary" data-say="${esc(x.script)}" data-rate="0.95" data-once>▶ Play once</button></div>`).join("")}
      ${rs.map((x) => `<div class="card"><h3>Text: ${esc(x.title)}</h3><div class="script">${esc(x.text)}</div></div>`).join("")}
      <div class="card"><h3>All questions</h3>${quizHTML(qs, id)}</div>
      ${n === 0 ? `<div class="card"><h3>Then do the writing and speaking parts</h3><div class="row"><a class="btn" href="#write-w8">Writing task 3</a><a class="btn" href="#speak-s1">Speaking task 1</a><a class="btn" href="#speak-s3">Speaking task 2</a><a class="btn" href="#speak-s7">Speaking task 3</a></div></div>` : ""}`;
  }

  // Videos
  function pageVideos(arg) {
    const wn = Math.min(39, Math.max(1, +arg || weekOf(nextDay())));
    const list = arg ? S.videos.filter((v) => v.w === wn) : S.videos;
    const wk = W(wn);
    const m = window.VIDEO_METHOD;
    later((root) => {
      const f = $("#vform", root);
      f.onsubmit = (e) => {
        e.preventDefault();
        const url = $("#v-url", root).value.trim(), title = $("#v-title", root).value.trim();
        if (!url && !title) { $("#v-err", root).textContent = "Add a link or a title so you can find the video again."; return; }
        S.videos.push({ id: Date.now(), url, title, w: +$("#v-week", root).value || wn, lesson: $("#v-lesson", root).value, notes: $("#v-notes", root).value, questions: $("#v-q", root).value, steps: {} });
        save(); finished("video", undefined); toast("Video added"); render();
      };
      $$("[data-vstep]", root).forEach((c) => (c.onchange = () => { const v = S.videos.find((x) => x.id === +c.dataset.v); v.steps[c.dataset.vstep] = c.checked; save(); }));
      $$("[data-vdel]", root).forEach((b) => (b.onclick = () => { if (b.dataset.sure) { S.videos = S.videos.filter((x) => x.id !== +b.dataset.vdel); save(); render(); } else { b.dataset.sure = 1; b.textContent = "Tap again to delete"; } }));
    });
    return `<div class="stack"><span class="label">${arg ? "Week " + wn + ": " + esc(wk.title) : "All weeks"}</span><h1>Videos</h1><p class="muted">Add the lesson videos you receive (YouTube, Drive, any link). Each one is linked to a week and a lesson, and comes with the same study method.</p></div>
      <div class="card"><h2>${esc(m.title)}</h2><p>${md(m.simple)}</p><div class="note analogy"><b>Think of it like this</b>${md(m.analogy)}</div>
        <ul class="clean">${m.steps.map((s) => `<li class="row" style="align-items:flex-start;flex-wrap:nowrap"><span class="ico">${s.icon}</span><span><b>${esc(s.name)}.</b> ${esc(s.text)}</span></li>`).join("")}</ul></div>
      <form class="card" id="vform"><h3>Add a video</h3>
        <div class="grid"><div class="field"><label for="v-title">Title</label><input type="text" id="v-title" placeholder="e.g. Passé composé avec être"></div>
        <div class="field"><label for="v-url">Link</label><input type="url" id="v-url" placeholder="https://…"></div>
        <div class="field"><label for="v-week">Week</label><input type="number" id="v-week" min="1" max="39" value="${wn}"></div>
        <div class="field"><label for="v-lesson">Lesson (optional)</label><select id="v-lesson"><option value="">None</option>${LESSONS.map((l) => `<option value="${l.id}"${(wk.lessons || [])[0] === l.id ? " selected" : ""}>${esc(l.title)}</option>`).join("")}</select></div></div>
        <div class="field"><label for="v-notes">My notes (the rule in my words)</label><textarea id="v-notes"></textarea></div>
        <div class="field"><label for="v-q">My questions (what I didn't understand)</label><textarea id="v-q" style="min-height:70px"></textarea></div>
        <div class="row"><button class="btn primary" type="submit">Save video</button><span class="small" id="v-err" style="color:var(--red)"></span></div></form>
      <div class="card"><div class="spread"><h3>${arg ? "Videos for week " + wn : "All my videos"} (${list.length})</h3>${arg ? `<a class="small" href="#videos">Show all weeks</a>` : ""}</div>
        ${list.length ? `<ul class="clean">${list.slice().reverse().map((v) => `<li class="card" style="padding:12px">
          <div class="spread"><b>${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title || v.url)}</a>` : esc(v.title)}</b><span class="chip">Week ${v.w}${v.lesson && L[v.lesson] ? " · " + esc(L[v.lesson].title) : ""}</span></div>
          ${v.notes ? `<div class="small"><b>Notes:</b> ${esc(v.notes)}</div>` : ""}${v.questions ? `<div class="small"><b>Questions:</b> ${esc(v.questions)}</div>` : ""}
          <div class="row small">${["watched", "questions", "exercises", "teach"].map((s, i) => `<label><input type="checkbox" data-v="${v.id}" data-vstep="${s}"${v.steps[s] ? " checked" : ""}> ${["Watched with focus", "Questions written", "Exercises done", "Taught it back"][i]}</label>`).join("")}</div>
          <div class="row">${v.lesson ? `<a class="btn small" href="#lesson-${v.lesson}">Do the lesson quiz</a>` : ""}<button class="btn small ghost" type="button" data-vdel="${v.id}">Delete</button></div></li>`).join("")}</ul>` : `<p class="muted">No videos yet for this week.</p>`}</div>`;
  }

  // Exam guide
  function pageExam() {
    const E = window.EXAM;
    later((m) => {
      const go = () => {
        const v = (id) => +$("#" + id, m).value;
        const band = (s, rows) => { for (let i = rows.length - 1; i >= 0; i--) if (s >= rows[i][0]) return rows[i][1]; return "below 4"; };
        const CO = [[331, "4"], [369, "5"], [398, "6"], [458, "7"], [503, "8"], [523, "9"], [549, "10+"]];
        const CE = [[342, "4"], [375, "5"], [406, "6"], [453, "7"], [499, "8"], [524, "9"], [549, "10+"]];
        const EX = [[4, "4"], [6, "5"], [7, "6"], [10, "7"], [12, "8"], [14, "9"], [16, "10+"]];
        $("#conv", m).innerHTML = `Listening: NCLC <b>${band(v("c-co"), CO)}</b> · Reading: NCLC <b>${band(v("c-ce"), CE)}</b> · Writing: NCLC <b>${band(v("c-ee"), EX)}</b> · Speaking: NCLC <b>${band(v("c-eo"), EX)}</b>`;
      };
      $$("#calc input", m).forEach((i) => (i.oninput = go)); go();
      finished("exam", (location.hash.split("-")[1] || ""));
    });
    return `<div class="stack"><span class="label">TCF Canada</span><h1>The exam, explained</h1><p class="muted">Everything about the test format, scores and strategies, in plain English.</p></div>
      ${Object.entries(E).map(([k, s]) => `<section class="card" id="sec-${k}"><h2>${esc(s.title)}</h2><ul class="points">${s.body.map((b) => `<li>${md(b)}</li>`).join("")}</ul>
        ${s.table ? `<div class="table-wrap"><table><thead><tr>${s.table[0].map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${s.table.slice(1).map((r) => `<tr>${r.map((c, i) => `<td class="${i ? "num" : ""}">${i ? c : "<b>" + c + "</b>"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        <div id="calc" class="stack"><span class="label">Score converter</span><div class="grid tight">
          <div class="field"><label for="c-co">Listening /699</label><input type="number" id="c-co" value="458" min="0" max="699"></div>
          <div class="field"><label for="c-ce">Reading /699</label><input type="number" id="c-ce" value="453" min="0" max="699"></div>
          <div class="field"><label for="c-ee">Writing /20</label><input type="number" id="c-ee" value="10" min="0" max="20"></div>
          <div class="field"><label for="c-eo">Speaking /20</label><input type="number" id="c-eo" value="10" min="0" max="20"></div></div>
          <div class="note ok" id="conv"></div></div>` : ""}</section>`).join("")}`;
  }

  // Mistakes
  function pageMistakes() {
    const errs = S.errors.slice(0, 40);
    later((m) => {
      $$("[data-fix]", m).forEach((b) => (b.onclick = () => { S.errors.splice(+b.dataset.fix, 1); save(); render(); }));
      const r = $("#retry", m); if (r) r.onclick = () => {
        const qs = shuffle(S.errors).slice(0, 10).map((e) => e.qq || { t: "fill", q: e.q + "  (type the answer)", a: [e.right], why: e.why });
        $("#retrybox", m).innerHTML = quizHTML(qs, "retry");
        wireQuiz(m, qs, "retry", (s, n) => { log("lesson", "mistakes", s, n); finished("mistakes", undefined); });
      };
      if (!S.errors.length) finished("mistakes", undefined);
    });
    return `<div class="stack"><span class="label">${S.errors.length} to review</span><h1>Mistakes notebook</h1><p class="muted">Every wrong quiz answer lands here. Read why, redo it, and remove it when you've got it. Mistakes are the most useful part of learning: each one shows you exactly what to fix.</p></div>
      ${S.errors.length ? `<div class="card"><button class="btn primary" id="retry">Redo 10 mistakes as a quiz</button><div id="retrybox"></div></div>` : `<div class="card"><p>Nothing to fix right now. Bravo !</p></div>`}
      ${errs.map((e, i) => `<div class="card"><div class="spread"><span class="chip">${esc(e.src)}</span><button class="btn small" data-fix="${i}">✓ Got it, remove</button></div>
        <div>${md(e.q)}</div><div class="small">You answered: <span style="color:var(--red)">${esc(e.your || "(blank)")}</span> · Correct: <b style="color:var(--good)">${esc(e.right)}</b></div>${e.why ? `<div class="why">${esc(e.why)}</div>` : ""}</div>`).join("")}`;
  }

  // Checkpoints
  function pageCheckpoint(id) {
    const cp = window.CHECKPOINTS[id]; if (!cp) return pageRoadmap();
    let qs = [];
    if (cp.vocabQuiz) { const pool = ["greet", "num1", "colors", "food", "fruits", "veg", "house", "furniture", "family", "jobs", "days", "routine"].flatMap((t) => V[t].words); qs = shuffle(pool).slice(0, 15).map((w) => { const o = shuffle([w[0], ...shuffle(pool.filter((x) => x !== w)).slice(0, 3).map((x) => x[0])]); return { t: "mcq", q: `${w[2]} "${w[1]}"`, o, a: o.indexOf(w[0]), why: w[0] }; }); }
    let sets = [];
    if (!cp.vocabQuiz) {
      qs = shuffle(lessonsOfLevels(cp.level).flatMap((l) => l.quiz)).slice(0, cp.practice ? 12 : 16);
      if (cp.practice) {
        sets = [shuffle(window.LISTENING.filter((x) => /B/.test(x.level)))[0], shuffle(window.READING.filter((x) => /B/.test(x.level)))[0]];
        qs = qs.concat(sets.flatMap((s) => s.qs.map((q) => Object.assign({ t: "mcq" }, q, { q: `[${s.title}] ${q.q}` }))));
      }
    }
    const res = S.cp[id];
    later((m) => {
      wireQuiz(m, qs, "cp-" + id, (s, n) => {
        const p = Math.round((s / n) * 100), cando = $$("[data-cando]", m).every((c) => c.checked);
        S.cp[id] = { score: p, passed: p >= 70 && cando, t: Date.now() }; log("checkpoint", id, s, n); save();
        if (S.cp[id].passed) finished("checkpoint", id);
        $("#cpres", m).innerHTML = S.cp[id].passed ? `<div class="note ok"><b>Passed</b>${p}%. You're ready for the next level. Félicitations !</div>` : `<div class="note alert"><b>Not yet</b>${p}%${cando ? "" : " and some can-do statements aren't ticked"}. You need 70% and every box ticked. Review your Mistakes notebook, then try again. No rush: being fully ready is what makes the next level easy.</div>`;
      });
    });
    return `<div class="crumbs"><a href="#roadmap">Roadmap</a> › <span>Checkpoint</span></div>
      <div class="stack"><span class="label">Pass mark 70% + every can-do ticked</span><h1>${esc(cp.title)}</h1>${res ? `<span class="chip ${res.passed ? "good" : "warn"}" style="align-self:flex-start">Last try: ${res.score}% ${res.passed ? "· passed" : ""}</span>` : ""}</div>
      <div class="card"><h3>Can you honestly say…</h3><ul class="clean">${cp.cando.map((c, i) => `<li><label><input type="checkbox" data-cando id="cd-${i}"> ${esc(c)}</label></li>`).join("")}</ul></div>
      ${sets.map((x) => x.script ? `<div class="card"><h3>Recording: ${esc(x.title)}</h3><button class="btn primary" data-say="${esc(x.script)}" data-rate="0.95" data-once>▶ Play once</button></div>` : `<div class="card"><h3>Text: ${esc(x.title)}</h3><div class="script">${esc(x.text)}</div></div>`).join("")}
      ${cp.practice ? `<p class="small muted">This checkpoint also expects one writing and one speaking task scored this week in Practice.</p>` : ""}
      <div class="card">${quizHTML(qs, "cp-" + id)}<div id="cpres"></div></div>`;
  }

  // Progress
  function skillAvg(kinds) {
    const h = S.hist.filter((x) => kinds.includes(x.k)).slice(-6);
    if (!h.length) return null;
    return Math.round((h.reduce((a, x) => a + x.s / x.m, 0) / h.length) * 100);
  }
  function pageProgress() {
    const skills = [["Listening", ["listen", "mock"]], ["Reading", ["read"]], ["Writing", ["write"]], ["Speaking", ["speak"]], ["Grammar", ["lesson"]], ["Vocabulary", ["vocab"]]];
    const vals = skills.map(([n, k]) => [n, skillAvg(k), k]);
    const known = vals.filter((v) => v[1] != null && v[0] !== "Grammar" && v[0] !== "Vocabulary");
    const weakest = known.sort((a, b) => a[1] - b[1])[0];
    const daysDone = PLAN.filter((x) => dayState(x) === "full").length;
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(todayStr(), i - 13));
    const maxM = Math.max(30, ...last14.map((d) => S.mins[d] || 0));
    const tips = {
      "Listening": ["Do one extra listening set every day this week", "Replay each recording slowly after answering and read the transcript", "Listen to 15 minutes of Radio-Canada or a French podcast daily"],
      "Reading": ["Do one extra reading text a day", "Time yourself: 1 minute per short question", "Read one short news article in French each day"],
      "Writing": ["Write one task-1 message and one task-3 text this week", "Compare with the model answers and fix 3 mistakes each time", "Learn 5 new connectors"],
      "Speaking": ["Record one task-3 voice note every day", "Repeat your task-1 introduction until it lasts 2 minutes", "Do 2 real-life situations a week"],
    };
    later((m) => {
      $("#exp", m).onclick = async () => { const txt = JSON.stringify(S); $("#bk", m).value = txt; try { await navigator.clipboard.writeText(txt); toast("Copied. Paste it somewhere safe."); } catch (e) { $("#bk", m).select(); toast("Select all and copy the text"); } };
      $("#imp", m).onclick = () => { try { const d = JSON.parse($("#bk", m).value); if (!d || !d.done) throw 0; S = Object.assign(blank(), d); save(); toast("Progress restored"); render(); } catch (e) { toast("That text isn't a valid backup"); } };
      $("#rst", m).onclick = (e) => { const b = e.target; if (b.dataset.sure) { S = blank(); save(); render(); } else { b.dataset.sure = 1; b.textContent = "Tap again to erase everything"; } };
      $("#acc", m).onchange = (e) => { S.accent = e.target.value; save(); toast("Voice: " + S.accent); };
      $("#nm", m).onchange = (e) => { S.name = e.target.value.trim(); save(); };
      $("#sd", m).onchange = (e) => { S.start = e.target.value; save(); };
      finished("plan", undefined);
    });
    return `<div class="stack"><span class="label">Your progress</span><h1>How you're doing</h1></div>
      <div class="stats"><div class="stat"><div class="label">Days done</div><div class="v">${daysDone}/${TOTAL_DAYS}</div></div><div class="stat"><div class="label">Streak</div><div class="v">${streak()}</div></div>
        <div class="stat"><div class="label">Words in deck</div><div class="v">${Object.keys(S.cards).length}</div></div><div class="stat"><div class="label">Quizzes taken</div><div class="v">${S.hist.length}</div></div></div>
      <div class="card"><h3>273-day board</h3>${board(nextDay())}</div>
      <div class="card"><h3>Phases</h3><div class="stack">${PHASES.map((p) => { const ds = PLAN.filter((d) => d.phase === p.id); const n = ds.filter((d) => dayState(d) === "full").length; return `<div class="skill"><span class="small">${p.n}. ${esc(p.name)}</span><div class="bar"><i style="width:${pct(n, ds.length)}%"></i></div><span class="num small">${pct(n, ds.length)}%</span></div>`; }).join("")}</div></div>
      <div class="card"><h3>Skills (average of your last 6 scores)</h3><div class="stack">${vals.map(([n, v]) => `<div class="skill"><span class="small">${n}</span><div class="bar ${v >= 70 ? "good" : ""}"><i style="width:${v || 0}%"></i></div><span class="num small">${v == null ? "–" : v + "%"}</span></div>`).join("")}</div>
        <p class="small muted">70% on these practice sets is a good sign you're near NCLC 7 for that skill. They are not official TCF scores.</p></div>
      <div class="card" id="sec-plan"><h3>Your focus this week</h3>${weakest ? `<p>Your weakest skill right now is <b>${weakest[0]}</b> (${weakest[1]}%). Add this to your week:</p><ul class="points">${tips[weakest[0]].map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="muted">Do at least one listening, reading, writing and speaking exercise, and this card will tell you which skill needs the most work.</p>`}</div>
      <div class="card"><h3>Study minutes, last 14 days</h3><div class="minibars">${last14.map((d) => `<div style="height:${pct(S.mins[d] || 0, maxM)}%" title="${d}: ${S.mins[d] || 0} min"></div>`).join("")}</div><div class="minibars-labels">${last14.map((d) => `<span>${d.slice(8)}</span>`).join("")}</div></div>
      <div class="card"><h3>Checkpoints</h3><ul class="clean">${Object.entries(window.CHECKPOINTS).map(([k, c]) => `<li class="spread"><a href="#cp-${k}">${esc(c.title)}</a>${S.cp[k] ? `<span class="chip ${S.cp[k].passed ? "good" : "warn"}">${S.cp[k].score}%${S.cp[k].passed ? " ✓" : ""}</span>` : `<span class="chip">not taken</span>`}</li>`).join("")}</ul></div>
      <div class="card"><h3>Recent activity</h3>${S.hist.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Activity</th><th>Score</th></tr></thead><tbody>${S.hist.slice(-12).reverse().map((h) => `<tr><td class="num">${new Date(h.t).toISOString().slice(0, 10)}</td><td>${esc(h.k)} · ${esc(h.id)}</td><td class="num">${h.s}/${h.m}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Nothing yet.</p>`}</div>
      <div class="card"><h3>Settings</h3><div class="grid"><div class="field"><label for="nm">Name</label><input type="text" id="nm" value="${esc(S.name)}"></div><div class="field"><label for="sd">Start date</label><input type="date" id="sd" value="${esc(S.start)}"></div>
        <div class="field"><label for="acc">Voice accent</label><select id="acc"><option value="fr-FR"${S.accent === "fr-FR" ? " selected" : ""}>France</option><option value="fr-CA"${S.accent === "fr-CA" ? " selected" : ""}>Québec</option></select></div></div>
        <p class="small muted">${esc(syncNote)}. To move your progress to another browser, copy the backup text and paste it there.</p>
        <textarea id="bk" style="min-height:70px" placeholder="Backup text appears here. Paste a backup here to restore it."></textarea>
        <div class="row"><button class="btn" id="exp">Copy backup</button><button class="btn" id="imp">Restore from text</button><button class="btn ghost" id="rst">Reset all progress</button></div></div>`;
  }

  function pageMethod() {
    return `<div class="stack"><span class="label">How to use this</span><h1>Your platform in 2 minutes</h1></div>
      <div class="card"><div class="note analogy"><b>Think of it like this</b>This app is a personal trainer with a calendar. Each morning it tells you exactly what to do today, checks your work, and keeps a record so you can see your progress.</div>
      <ul class="points">
        <li><b>Today</b> shows your next unfinished day (about 45–90 minutes in the first months, 2–4 hours during the camp). Tap <b>Start</b> on a task; finishing the activity ticks it. You can also tick tasks by hand.</li>
        <li><b>Roadmap</b>: 6 phases, 39 weeks. Each phase explains what you learn and why it comes now. You can look ahead at any time.</li>
        <li><b>Checkpoints</b>: at the end of each phase. The program's rule is that you move on only when you are fully ready (70% + all can-do statements).</li>
        <li><b>Lessons</b>: every rule in plain English, with an everyday comparison, examples you can listen to, mistakes to avoid and a quiz.</li>
        <li><b>Words + Flashcards</b>: pictures first, then spaced review so words stick for months.</li>
        <li><b>Practice</b>: TCF-style listening, reading, writing and speaking with timers, model answers and self-scores.</li>
        <li><b>Videos</b>: add the videos you receive to the right week, with the video method.</li>
        <li><b>Mistakes</b>: every wrong answer, ready to redo.</li>
        <li><b>Progress</b>: your 273-day board, skill bars, and your focus for the week.</li>
      </ul>
      <p class="small muted">The 🔊 buttons use your device's French voice. On a phone or computer without a French voice, install one in your system's language settings.</p></div>`;
  }
  function pageMore() {
    return `<h1>More</h1><div class="grid tight">${NAV.concat([["method", "💡", "How to use this"]]).map(([r, i, n]) => `<a class="wk" href="#${r}"><b>${n}</b></a>`).join("")}</div>`;
  }

  // ---------- global events ----------
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]");
    if (s) { speak(s.dataset.say, +s.dataset.rate || undefined); if (s.hasAttribute("data-once")) { s.disabled = true; s.textContent = "Played"; } return; }
    const a = e.target.closest("[data-sayall]");
    if (a) speak(a.dataset.sayall, 0.75);
  });
  window.addEventListener("hashchange", render);

  PLAN = buildPlan();
  shell();
  render();
  connectAccount();
})();
