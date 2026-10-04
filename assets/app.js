/* AI Engineer Lab — tiny hash-router app. No build step, no framework. */
(function () {
  "use strict";

  const LEVELS = [
    { id: "beginner", name: "Beginner", blurb: "One model call, done properly. Structured outputs, validation, routing, simple retrieval, evaluation from day one." },
    { id: "intermediate", name: "Intermediate", blurb: "Real retrieval, tools, MCP, workflows, cascades, memory, LLM judges and prompt CI. Systems with several moving parts." },
    { id: "advanced", name: "Advanced", blurb: "Platforms and production systems: multi-tenant RAG, durable workflows, multi-agent research, gateways, security, eval flywheels, strategy." },
  ];

  const STAGES = [
    ["start", "0 · Before you start", "Before you start: everything this project uses"],
    ["brief", "1 · Brief", "The client brief"],
    ["discovery", "2 · Discover", "Discovery: what you ask before you build"],
    ["frame", "3 · Frame", "Frame the problem"],
    ["design", "4 · Design", "System design"],
    ["build", "5 · Build", "Build it"],
    ["evaluate", "6 · Evaluate", "Evaluate it"],
    ["operate", "7 · Operate", "Ship and operate"],
    ["levelUp", "8 · Level up", "What changes at 10x"],
    ["recap", "Recap", "What you just learned"],
    ["practice", "Practice", "Practice and interview prep"],
  ];

  const $ = (sel, el = document) => el.querySelector(sel);
  const main = $("#main");

  /* ---------- storage (per-viewer convenience only) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ael:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ael:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const isDone = (id) => !!store.get("done", {})[id];
  function toggleDone(id) {
    const d = store.get("done", {});
    if (d[id]) delete d[id]; else d[id] = Date.now();
    store.set("done", d);
  }

  /* ---------- lookups ---------- */
  const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  const P = byId(window.PROJECTS);
  const PAT = byId(window.PATTERNS);
  const CON = byId(window.CONCEPTS);
  const FW = byId(window.FRAMEWORK);
  const SK = byId(window.SKILLS);
  const projectsOf = (lvl) => window.PROJECTS.filter((p) => p.level === lvl);
  const ordered = LEVELS.flatMap((l) => projectsOf(l.id));
  const usage = {};
  window.PATTERNS.forEach((pt) => (usage[pt.id] = []));
  ordered.forEach((p) => (p.patterns || []).forEach((id) => {
    if (!usage[id]) { console.warn("Unknown pattern", id, "in", p.id); usage[id] = []; }
    usage[id].push(p.id);
  }));

  /* ---------- the guided learning path (content/path.js) ---------- */
  // One ordered list of steps, like a lesson plan. Everything else is the reference library.
  const STEPS = [];
  (window.PATH || []).forEach((ph, pi) => ph.steps.forEach((s) => STEPS.push(Object.assign({}, s, { key: s.kind + ":" + s.id, phase: ph, phaseNo: pi + 1, n: STEPS.length }))));
  const STEP = Object.fromEntries(STEPS.map((s) => [s.key, s]));
  const KIND_LABEL = { page: "Start", f: "Guide", c: "Concept", proj: "Project", check: "Checkpoint", s: "Career" };
  const stepHref = (s) => ({ page: "#/" + s.id, f: "#/framework/" + s.id, c: "#/concept/" + s.id, proj: "#/project/" + s.id, s: "#/skills/" + s.id, check: "#/checkpoint/" + s.id })[s.kind];
  const stepDoneId = (s) => (s.kind === "proj" ? s.id : "step:" + s.key);
  const stepDone = (s) => isDone(stepDoneId(s));
  function setStepDone(s, v) { if (stepDone(s) !== v) toggleDone(stepDoneId(s)); }
  function stepTitle(s) {
    if (s.kind === "page") return ({ start: window.START_PAGE, warmup: window.WARMUP_PAGE }[s.id] || {}).title || s.id;
    if (s.kind === "proj") return P[s.id] ? P[s.id].code + " · " + P[s.id].title : s.id;
    if (s.kind === "check") return ((window.CHECKPOINTS || {})[s.id] || {}).title || s.id;
    const src = { f: FW, c: CON, s: SK }[s.kind];
    return src && src[s.id] ? src[s.id].title : s.id;
  }
  const nextStep = () => STEPS.find((s) => !stepDone(s));
  const stepsDone = () => STEPS.filter(stepDone).length;
  const fmtMin = (m) => (m < 60 ? m + " min" : (Math.round(m / 30) / 2) + " h");
  function stepKeyFor(parts) {
    const k = { start: "page:start", warmup: "page:warmup" }[parts[0]];
    if (k) return k;
    const pre = { framework: "f:", concept: "c:", project: "proj:", skills: "s:", checkpoint: "check:" }[parts[0]];
    return pre && parts[1] ? pre + parts[1] : null;
  }

  /* ---------- markdown-lite ---------- */
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function inline(raw) {
    const codes = [];
    let s = raw.replace(/~([^~\n]+)~/g, (_, c) => { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = esc(s);
    s = s.replace(/\[\[(p|proj|c|f|s):([a-z0-9-]+)\]\]/g, (_, kind, id) => ref(kind, id));
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => {
      const ext = /^https?:/.test(href);
      return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>";
    });
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => "<code>" + esc(codes[+i]) + "</code>");
    return s;
  }

  function ref(kind, id) {
    if (kind === "p") {
      const pt = PAT[id];
      if (!pt) return "<code>" + esc(id) + "</code>";
      return '<a class="chip" data-x="p:' + id + '" href="#/pattern/' + id + '">' + esc(pt.name) + '<span class="count">×' + usage[id].length + "</span></a>";
    }
    if (kind === "proj") { const p = P[id]; return p ? '<a href="#/project/' + id + '">' + esc(p.code + " " + p.title) + "</a>" : esc(id); }
    if (kind === "c") { const c = CON[id]; return c ? '<a data-x="c:' + id + '" href="#/concept/' + id + '">' + esc(c.title) + "</a>" : esc(id); }
    if (kind === "f") { const c = FW[id]; return c ? '<a data-x="f:' + id + '" href="#/framework/' + id + '">' + esc(c.title) + "</a>" : esc(id); }
    if (kind === "s") { const c = SK[id]; return c ? '<a href="#/skills/' + id + '">' + esc(c.title) + "</a>" : esc(id); }
    return esc(id);
  }

  function md(src) {
    if (!src) return "";
    const lines = String(src).replace(/\r/g, "").split("\n");
    // strip common indentation
    const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
    const L = lines.map((l) => l.slice(isFinite(ind) ? ind : 0));
    let out = "", i = 0;
    const isTableSep = (l) => /^\s*\|?\s*:?-{2,}/.test(l);
    while (i < L.length) {
      const line = L[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = line.match(/^~~~\s*([\w+-]*)\s*$/))) {
        const lang = m[1] || "text"; const buf = []; i++;
        while (i < L.length && !/^~~~\s*$/.test(L[i])) buf.push(L[i++]);
        i++;
        out += codeBlock(buf.join("\n"), lang);
        continue;
      }
      if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
        const lv = m[1].length; out += "<h" + lv + ">" + inline(m[2]) + "</h" + lv + ">"; i++; continue;
      }
      if (/^---\s*$/.test(line)) { out += "<hr>"; i++; continue; }
      if (/^\|/.test(line) && i + 1 < L.length && isTableSep(L[i + 1])) {
        const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        const head = cells(line); i += 2;
        let t = "<table><thead><tr>" + head.map((h) => "<th>" + inline(h) + "</th>").join("") + "</tr></thead><tbody>";
        while (i < L.length && /^\|/.test(L[i])) { t += "<tr>" + cells(L[i]).map((c) => "<td>" + inline(c) + "</td>").join("") + "</tr>"; i++; }
        out += t + "</tbody></table>"; continue;
      }
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < L.length && /^>\s?/.test(L[i])) buf.push(L[i++].replace(/^>\s?/, ""));
        let cls = "";
        if (/^!\s/.test(buf[0])) { cls = ' class="warn"'; buf[0] = buf[0].slice(2); }
        out += "<blockquote" + cls + ">" + md(buf.join("\n")) + "</blockquote>"; continue;
      }
      if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const items = [];
        while (i < L.length && (/^\s*([-*]|\d+\.)\s+/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && items.length))) {
          if (/^\s*([-*]|\d+\.)\s+/.test(L[i]) && !/^\s{2,}([-*]|\d+\.)\s+/.test(L[i])) items.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
          else items[items.length - 1] += "\n" + L[i].replace(/^\s{2}/, "");
          i++;
        }
        const tag = ordered ? "ol" : "ul";
        out += "<" + tag + ">" + items.map((it) => {
          const [first, ...rest] = it.split("\n");
          return "<li>" + inline(first) + (rest.length ? md(rest.join("\n")) : "") + "</li>";
        }).join("") + "</" + tag + ">";
        continue;
      }
      const buf = [];
      while (i < L.length && L[i].trim() && !/^(~~~|#{2,4}\s|>|\||---\s*$)/.test(L[i]) && !/^\s*([-*]|\d+\.)\s+/.test(L[i])) buf.push(L[i++]);
      out += "<p>" + inline(buf.join(" ")) + "</p>";
    }
    return out;
  }

  function codeBlock(code, lang) {
    const c = String(code).replace(/^\n+/, "").replace(/\s+$/, "");
    return '<pre><button class="copy-btn" type="button">Copy</button><code class="language-' + esc(lang) + '">' + esc(c) + "</code></pre>";
  }

  /* ---------- sidebar ---------- */
  function renderNav(filter) {
    const q = (filter || "").trim().toLowerCase();
    const route = location.hash || "#/";
    const link = (href, label, extra = "") =>
      '<a class="nav-link' + (route === href ? " active" : "") + '" href="' + href + '">' + label + extra + "</a>";
    let h = "";
    if (!q) {
      h += link("#/", "Home");
      h += link("#/start", "▶ Start here", isDone("step:page:start") ? '<span class="done">✓</span>' : "");
      h += link("#/path", "Learning path", '<span class="num-r">' + stepsDone() + "/" + STEPS.length + "</span>");
    }
    LEVELS.forEach((lvl) => {
      const items = projectsOf(lvl.id).filter((p) => !q || searchText(p).includes(q));
      if (!items.length) return;
      h += '<div class="nav-section"><a href="#/track/' + lvl.id + '" style="color:inherit">' + lvl.name + " projects</a></div>";
      items.forEach((p) => {
        h += link("#/project/" + p.id, '<span class="num">' + p.code + "</span>" + esc(p.title), isDone(p.id) ? '<span class="done">✓</span>' : "");
      });
    });
    if (!q) {
      h += '<div class="nav-section">Library · look things up</div>';
      h += link("#/framework", "Guides: how AI engineers think");
      h += link("#/concepts", "Core concepts (API, MCP, RAG…)");
      h += link("#/patterns", "Pattern library");
      h += link("#/matrix", "Pattern matrix");
      h += link("#/glossary", "Glossary (simple words)");
      h += '<div class="nav-section">Career</div>';
      h += link("#/skills", "Hiring & skills");
    }
    if (q) {
      const pats = window.PATTERNS.filter((pt) => (pt.name + " " + pt.summary).toLowerCase().includes(q));
      if (pats.length) {
        h += '<div class="nav-section">Patterns</div>';
        pats.forEach((pt) => (h += link("#/pattern/" + pt.id, esc(pt.name))));
      }
      const gl = (window.GLOSSARY || []).filter((g) => (g.term + " " + g.simple).toLowerCase().includes(q));
      if (gl.length) {
        h += '<div class="nav-section">Glossary</div>';
        gl.slice(0, 8).forEach((g) => (h += link("#/glossary/" + slug(g.term), esc(g.term))));
      }
      if (h === "") h = '<p class="muted small" style="padding:0 8px">No matches.</p>';
    }
    $("#nav").innerHTML = h;
    const done = stepsDone(), tot = STEPS.length;
    const pdone = window.PROJECTS.filter((p) => isDone(p.id)).length;
    $("#progress-summary").innerHTML = "Learning path: " + done + " of " + tot + " steps" +
      '<div class="bar"><span style="width:' + (tot ? (100 * done) / tot : 0) + '%"></span></div>' +
      '<div style="margin-top:6px">' + pdone + " of " + window.PROJECTS.length + " projects completed</div>";
  }
  const searchText = (p) => [p.title, p.industry, p.client, p.summary, ...(p.patterns || []).map((id) => (PAT[id] || {}).name || id), ...(p.newConcepts || [])].join(" ").toLowerCase();

  /* ---------- pages ---------- */
  const lvlPill = (lvl) => '<span class="pill lvl-' + lvl + '">' + lvl[0].toUpperCase() + lvl.slice(1) + "</span>";
  const projCard = (p) =>
    '<a class="card' + (isDone(p.id) ? " done" : "") + '" href="#/project/' + p.id + '"><div class="k">' + p.code + " · " + esc(p.industry) + (isDone(p.id) ? " · ✓" : "") +
    '</div><div class="t">' + esc(p.title) + '</div><div class="s">' + esc(p.summary) + "</div></a>";

  function pageHome() {
    const nx = nextStep(), done = stepsDone(), tot = STEPS.length;
    let h = "<h1>Learn to think like an AI engineer</h1>";
    h += '<p class="lead">A step-by-step course that takes you from "what is an AI model?" to designing AI systems for whole companies, through 28 realistic client projects. Everything you need is explained inside the lab.</p>';
    h += '<div class="start-card">';
    if (!done) {
      h += '<div class="k">New here? Start with step 1</div><div class="t">' + esc(stepTitle(STEPS[0])) + "</div>" +
        '<p class="muted">A 10-minute tour: what you\'ll learn, how the lab is organised, and how to study each step.</p>' +
        '<a class="btn primary" href="' + stepHref(STEPS[0]) + '">▶ Start here</a> <a class="btn" href="#/path">See the whole path</a>';
    } else if (nx) {
      h += '<div class="k">Continue where you left off · Step ' + (nx.n + 1) + " of " + tot + " · " + esc(nx.phase.title) + '</div><div class="t">' + esc(stepTitle(nx)) + "</div>" +
        '<p class="muted">' + inline(nx.why) + "</p>" +
        '<div class="bar" style="margin:10px 0 14px"><span style="width:' + (100 * done) / tot + '%"></span></div>' +
        '<a class="btn primary" href="' + stepHref(nx) + '">Continue →</a> <a class="btn" href="#/path">See the whole path</a>';
    } else {
      h += '<div class="k">All ' + tot + ' steps done</div><div class="t">You finished the learning path. Well done!</div><p class="muted">Use the library to revise, or redo a project with your own twist.</p><a class="btn" href="#/path">See the whole path</a>';
    }
    h += "</div>";
    h += md(window.HOME_INTRO || "");
    h += "<h2>The path, phase by phase</h2><p class='muted'>Like the chapters of a textbook: each phase builds on the one before. Tap one to see its steps.</p><div class='cards'>";
    (window.PATH || []).forEach((ph, i) => {
      const st = STEPS.filter((s) => s.phase === ph);
      const d = st.filter(stepDone).length;
      h += '<a class="card' + (d === st.length ? " done" : "") + '" href="#/path?s=' + ph.id + '"><div class="k">Phase ' + (i + 1) + " · " + d + "/" + st.length + " done</div><div class='t'>" + esc(ph.title) + "</div><div class='s'>" + esc(ph.goal) + "</div></a>";
    });
    h += "</div>";
    return h;
  }

  function stepBanner(s) {
    return '<div class="path-banner"><a href="#/path?s=' + s.phase.id + '">Learning path</a> · Phase ' + s.phaseNo + ": " + esc(s.phase.title) +
      " · <strong>Step " + (s.n + 1) + " of " + STEPS.length + "</strong>" + (stepDone(s) ? ' <span class="done">✓ done</span>' : "") +
      '<div class="why"><span class="simple-tag">Why this comes now</span> ' + inline(s.why) + "</div></div>";
  }

  function pathPager(key) {
    const s = STEP[key];
    if (!s) return "";
    const prev = STEPS[s.n - 1], next = STEPS[s.n + 1], done = stepDone(s);
    let h = '<div class="path-pager"><div class="row">';
    h += prev ? '<a class="btn" href="' + stepHref(prev) + '">← Previous step</a>' : "<span></span>";
    h += '<button class="btn primary" type="button" data-step-next="' + key + '">' + (done ? "Continue →" : "Mark done & continue →") + "</button></div>";
    h += '<p class="muted small">' + (next ? "Next: <strong>" + esc(stepTitle(next)) + "</strong>. " + inline(next.why) : "This is the last step of the path. Congratulations!");
    if (done) h += ' <button class="linklike" type="button" data-step-undo="' + key + '">Mark this step as not done</button>';
    return h + "</p></div>";
  }

  function pagePath() {
    const done = stepsDone(), tot = STEPS.length, nx = nextStep();
    let h = "<h1>Learning path</h1><p class='lead'>Every step of the lab in the order a tutor would teach it. Short lessons come right before the project that needs them, and a checkpoint ends each level.</p>" + simpleBox("page:path");
    h += '<p><strong>' + done + " of " + tot + " steps done</strong></p><div class='bar' style='margin-bottom:14px'><span style='width:" + (100 * done) / tot + "%'></span></div>";
    if (nx) h += '<p><a class="btn primary" href="' + stepHref(nx) + '">' + (done ? "Continue: " : "Start: ") + esc(stepTitle(nx)) + " →</a></p>";
    h += "<p class='muted small'>Kinds of step: <strong>Guide</strong> and <strong>Concept</strong> = a short reading lesson (10–15 min). <strong>Project</strong> = a full client project (an afternoon to two days). <strong>Checkpoint</strong> = self-check questions.</p>";
    (window.PATH || []).forEach((ph, i) => {
      const st = STEPS.filter((s) => s.phase === ph);
      const total = st.reduce((a, s) => a + (s.minutes || 0), 0);
      h += '<section class="phase" id="stage-' + ph.id + '"><h2>Phase ' + (i + 1) + " · " + esc(ph.title) + ' <span class="muted small">' + st.filter(stepDone).length + "/" + st.length + " · about " + fmtMin(total) + "</span></h2>";
      h += "<p class='muted'><strong>Goal:</strong> " + esc(ph.goal) + "</p><ol class='path-list'>";
      st.forEach((s) => {
        const d = stepDone(s), cur = nx === s;
        h += '<li class="' + (d ? "done" : "") + (cur ? " current" : "") + '"><a href="' + stepHref(s) + '"><span class="tick">' + (d ? "✓" : s.n + 1) + '</span><span class="body"><span class="kind kind-' + s.kind + '">' + KIND_LABEL[s.kind] + "</span> <strong>" + esc(stepTitle(s)) + "</strong>" +
          (cur ? ' <span class="you">← you are here</span>' : "") + ' <span class="muted small">· ' + fmtMin(s.minutes || 0) + '</span><span class="why">' + inline(s.why) + "</span></span></a></li>";
      });
      h += "</ol></section>";
    });
    return h;
  }

  function pageStart() {
    const x = window.START_PAGE;
    if (!x) return notFound();
    return "<h1>" + esc(x.title) + "</h1><p class='lead'>" + esc(x.summary) + "</p>" + simpleBox("page:start") + md(x.body) + pathPager("page:start");
  }

  function pageWarmup() {
    const x = window.WARMUP_PAGE;
    if (!x) return notFound();
    return "<h1>" + esc(x.title) + "</h1><p class='lead'>" + esc(x.summary) + "</p>" + simpleBox("page:warmup") + md(x.intro) + wordList(x.words || []) + md(x.outro) + pathPager("page:warmup");
  }

  function pageCheckpoint(id) {
    const x = (window.CHECKPOINTS || {})[id];
    if (!x) return notFound();
    let h = lvlPill(id) + "<h1 style='margin-top:10px'>" + esc(x.title) + "</h1><p class='lead'>" + esc(x.summary) + "</p>" + simpleBox("check:" + id);
    h += "<h2>Questions</h2><p class='muted'>Say your answer out loud or write it down <em>first</em>, then tap the question to compare. Being roughly right is enough.</p>";
    h += x.questions.map((qa, i) => '<details class="xd qa"><summary><strong>Q' + (i + 1) + ".</strong> <span>" + inline(qa.q) + '</span></summary><div class="xd-body"><span class="simple-tag">A good answer</span><p>' + inline(qa.a) + "</p></div></details>").join("");
    const ticks = store.get("ready:" + id, {});
    h += "<h2>You're ready to move on if…</h2><p class='muted'>Tick each one you can honestly say yes to (saved in this browser).</p><ul class='ready'>" +
      x.ready.map((r, i) => '<li><label><input type="checkbox" data-ready="' + id + ":" + i + '"' + (ticks[i] ? " checked" : "") + "> <span>" + inline(r) + "</span></label></li>").join("") + "</ul>";
    h += "<h2>Not sure yet? Re-read these first</h2><p class='muted'>These projects hold the main ideas of this level. Skim their <strong>Recap</strong> sections.</p><div class='cards'>" +
      x.review.map((pid) => P[pid]).filter(Boolean).map(projCard).join("") + "</div>";
    return h + pathPager("check:" + id);
  }

  function pageTrack(id) {
    const l = LEVELS.find((x) => x.id === id);
    if (!l) return notFound();
    const ps = projectsOf(id);
    let h = lvlPill(id) + "<h1 style='margin-top:10px'>" + l.name + " projects</h1><p class='lead'>" + esc(l.blurb) + "</p>";
    h += "<p class='muted'>Following the learning path? It places short lessons between these projects, in the right order. <a href='#/path?s=" + id + "'>See this level in the path →</a></p>";
    h += md(window.TRACK_INTROS && window.TRACK_INTROS[id]);
    h += '<div class="cards">' + ps.map(projCard).join("") + "</div>";
    const introduced = {};
    ps.forEach((p) => (p.patterns || []).forEach((pt) => { if (usage[pt] && usage[pt][0] === p.id) introduced[pt] = p; }));
    const keys = Object.keys(introduced);
    if (keys.length) {
      h += "<h2>Patterns introduced at this level</h2><p class='muted'>Where each pattern first shows up. After that you'll keep seeing it again.</p><p>";
      h += keys.map((k) => ref("p", k)).join(" ") + "</p>";
    }
    return h;
  }

  /* ================= All-in-one project view ================= */

  // --- detection helpers -------------------------------------------------
  const stripComments = (code) => code.split("\n").map((l) => l.replace(/(^|\s)#(?!!).*$/, "")).join("\n");
  const isPy = (step) => (step.lang || "python") === "python";
  const techOf = (step) => (window.TECH || []).filter((t) => t.detect.test(step.code || "") || (t.langs || []).includes(step.lang));
  const pyOf = (step) => (isPy(step) ? (window.PYFEATURES || []).filter((f) => f.detect.test(stripComments(step.code || ""))) : []);
  const TECH_BY = () => Object.fromEntries((window.TECH || []).map((t) => [t.id, t]));
  const PY_BY = () => Object.fromEntries((window.PYFEATURES || []).map((f) => [f.id, f]));

  function projectText(p) {
    const parts = ["brief", "discovery", "frame", "design", "evaluate", "operate", "levelUp", "interview", "buildIntro"].map((k) => p[k] || "");
    (p.build || []).forEach((s) => parts.push(s.note || "", s.after || ""));
    (p.exercises || []).forEach((e) => parts.push(e));
    return parts.join("\n");
  }
  function refsIn(text, kind) {
    const out = [];
    text.replace(new RegExp("\\[\\[" + kind + ":([a-z0-9-]+)\\]\\]", "g"), (_, id) => { if (!out.includes(id)) out.push(id); });
    return out;
  }

  // --- glossary term matching (for tap-to-explain words) ------------------
  const TERM_EXCLUDE = new Set(["State", "Client", "Index", "Budget (steps, tokens, money)", "Draft", "Feedback",
    "Effort / thinking", "Agent", "Worker", "Critic", "Throughput", "Router", "Handler", "Ranking", "Module"]);
  const TERM_ALIASES = {
    "Tool / function calling": ["tool calling", "function calling", "tool use"],
    "Human in the loop": ["human in the loop", "human-in-the-loop", "human review"],
    "Unique key / ID": ["unique key", "unique ID"],
    "Loop / iteration": ["iteration"],
    "Evaluation (eval)": ["evaluation", "eval", "evals"],
    "Logging": ["logging", "logs"],
    "Confidence score": ["confidence score", "confidence"],
    "Parallel processing": ["parallel"],
    "Batch processing": ["batch processing", "Batches API", "batch"],
    "Untrusted input": ["untrusted"],
    "Exponential backoff": ["backoff"],
    "Accuracy / precision / recall": ["accuracy", "precision", "recall"],
    "Citation / grounding": ["citation", "citations", "grounded", "grounding"],
    "Observability / tracing": ["observability", "tracing"],
  };
  let TERM_INDEX = null;
  function termIndex() {
    if (TERM_INDEX) return TERM_INDEX;
    const rows = [];
    (window.GLOSSARY || []).forEach((g) => {
      if (TERM_EXCLUDE.has(g.term)) return;
      const aliases = TERM_ALIASES[g.term] ||
        g.term.replace(/\(([^)]+)\)/, " / $1").split(" / ").map((s) => s.trim()).filter(Boolean);
      aliases.forEach((a) => {
        const acronym = /^[A-Z0-9]{2,5}$/.test(a);
        const src = "(^|[^A-Za-z0-9_])(" + a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+") + (acronym ? "s?" : "(?:s|es)?") + ")(?![A-Za-z0-9_])";
        rows.push({ term: g.term, alias: a, re: new RegExp(src, acronym ? "" : "i") });
      });
    });
    rows.sort((a, b) => b.alias.length - a.alias.length);
    return (TERM_INDEX = rows);
  }
  function termsInText(text) {
    const plain = text.replace(/~~~[\s\S]*?~~~/g, " ").replace(/~[^~\n]+~/g, " ").replace(/\[\[[^\]]+\]\]/g, " ");
    const found = [];
    termIndex().forEach((r) => {
      const m = r.re.exec(plain);
      if (m && !found.some((f) => f.term === r.term)) found.push({ term: r.term, at: m.index });
    });
    return found.sort((a, b) => a.at - b.at).map((f) => f.term);
  }

  // --- inline explanation cards -------------------------------------------
  function patternCard(id, full) {
    const pt = PAT[id], d = (window.PATTERN_DEEP || {})[id], s = (window.SIMPLE || {})["pattern:" + id];
    if (!pt) return "";
    let h = s ? "<p><strong>In simple words:</strong> " + inline(s.simple) + "</p><p><strong>Think of it like:</strong> " + inline(s.analogy) + "</p>" : "";
    if (d) {
      h += "<p class='xsub'>The real-life story</p><ol class='story'>" + d.story.map((x) => "<li>" + inline(x) + "</li>").join("") + "</ol>";
      h += "<table><thead><tr><th>In real life</th><th>In the AI system</th></tr></thead><tbody>" +
        d.mapping.map(([a, b]) => "<tr><td>" + inline(a) + "</td><td>" + inline(b) + "</td></tr>").join("") + "</tbody></table>";
      h += "<p><strong>Why it works:</strong> " + inline(d.why) + "</p><p><strong>Where the comparison stops:</strong> " + inline(d.breaks) + "</p>";
    }
    if (full) {
      h += "<details class='xd inner'><summary>Technical details and minimal code</summary>" + md(pt.solution) + (pt.code ? codeBlock(pt.code, "python") : "") +
        (pt.pitfalls ? "<p class='xsub'>Pitfalls</p>" + md(pt.pitfalls) : "") + "</details>";
    }
    return h;
  }
  function docCard(kind, id, withBody) {
    const c = kind === "c" ? CON[id] : FW[id];
    const s = (window.SIMPLE || {})[(kind === "c" ? "concept:" : "chapter:") + id];
    if (!c) return "";
    let h = s ? "<p><strong>In simple words:</strong> " + inline(s.simple) + "</p><p><strong>Think of it like:</strong> " + inline(s.analogy) + "</p>" : "<p>" + esc(c.summary) + "</p>";
    if (withBody) h += "<details class='xd inner'><summary>Read the full explanation here</summary>" + md(c.body) + "</details>";
    return h;
  }
  function techCard(t) {
    return "<p>" + inline(t.simple) + "</p><p><strong>Think of it like:</strong> " + inline(t.analogy) + "</p>";
  }
  function pyCard(f) {
    return "<p>" + inline(f.simple) + "</p><p><strong>Think of it like:</strong> " + inline(f.analogy) + "</p>" +
      (f.example ? "<p class='xsub'>Tiny example</p>" + codeBlock(f.example, "python") : "");
  }
  function xcardBody(key) {
    const i = key.indexOf(":"), kind = key.slice(0, i), id = key.slice(i + 1);
    if (kind === "g") {
      const g = (window.GLOSSARY || []).find((x) => x.term === id);
      return g ? { title: g.term, html: "<p>" + inline(g.simple) + "</p><p><strong>Think of it like:</strong> " + inline(g.analogy) + "</p>", link: "#/glossary/" + slug(g.term) } : null;
    }
    if (kind === "p" && PAT[id]) return { title: PAT[id].name, html: patternCard(id, true), link: "#/pattern/" + id };
    if (kind === "c" && CON[id]) return { title: CON[id].title, html: docCard("c", id, true), link: "#/concept/" + id };
    if (kind === "f" && FW[id]) return { title: FW[id].title, html: docCard("f", id, true), link: "#/framework/" + id };
    if (kind === "t") { const t = TECH_BY()[id]; return t ? { title: t.name, html: techCard(t) } : null; }
    if (kind === "py") { const f = PY_BY()[id]; return f ? { title: f.name, html: pyCard(f) } : null; }
    return null;
  }
  function toggleXcard(trigger) {
    const key = trigger.dataset.x;
    const block = trigger.closest("li, p, td, blockquote, .file-head, .chips-row, dd, .simple-row") || trigger.parentElement;
    const anchor = block.tagName === "TD" ? block.closest("table") : block;
    const next = anchor.nextElementSibling;
    if (next && next.classList.contains("xcard") && next.dataset.key === key) { next.remove(); trigger.classList.remove("open"); return; }
    if (next && next.classList.contains("xcard")) next.remove();
    const body = xcardBody(key);
    if (!body) return;
    const card = document.createElement("div");
    card.className = "xcard";
    card.dataset.key = key;
    card.innerHTML = "<div class='xcard-head'><strong>" + inline(body.title) + "</strong><button type='button' class='xclose' aria-label='Close'>✕</button></div>" +
      body.html + (body.link ? "<p class='small'><a href='" + body.link + "'>Open its full page →</a></p>" : "");
    anchor.insertAdjacentElement("afterend", card);
    trigger.classList.add("open");
    card.querySelector(".xclose").addEventListener("click", () => { card.remove(); trigger.classList.remove("open"); });
    if (window.hljs) card.querySelectorAll("pre code").forEach((el) => { try { window.hljs.highlightElement(el); } catch (e) { /* ignore */ } });
  }

  // wrap the first occurrence of each glossary term per stage in a tap-to-explain button
  function markTerms(root) {
    const idx = termIndex();
    root.querySelectorAll(".stage[data-terms]").forEach((sec) => {
      const used = new Set();
      const walker = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement.closest("pre, code, a, button, h1, h2, h3, h4, .stage-label, .stage-analogy, .xcard, .simple, th, .file-head, .walk, .chips-row")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        let text = node.nodeValue, best = null;
        idx.forEach((r) => {
          if (used.has(r.term)) return;
          const m = r.re.exec(text);
          if (m) { const at = m.index + m[1].length; if (!best || at < best.at) best = { at, len: m[2].length, term: r.term }; }
        });
        if (!best) return;
        used.add(best.term);
        const span = document.createElement("span");
        span.innerHTML = esc(text.slice(0, best.at)) + "<button type='button' class='term' data-x='g:" + esc(best.term) + "'>" +
          esc(text.slice(best.at, best.at + best.len)) + "</button>" + esc(text.slice(best.at + best.len));
        node.parentNode.replaceChild(span, node);
      });
    });
  }

  // --- the project page ----------------------------------------------------
  function beforeYouStart(p) {
    const text = projectText(p);
    const steps = p.build || [];
    const techUse = {}, pyUse = {};
    steps.forEach((s, n) => {
      techOf(s).forEach((t) => (techUse[t.id] = (techUse[t.id] || []).concat(n)));
      pyOf(s).forEach((f) => (pyUse[f.id] = (pyUse[f.id] || []).concat(n)));
    });
    const stepName = (n) => "Step " + (n + 1) + " (" + esc(steps[n].file) + ")";
    const d = (summary, body, open) => "<details class='xd'" + (open ? " open" : "") + "><summary>" + summary + "</summary><div class='xd-body'>" + body + "</div></details>";
    let h = "<p>Everything this project uses is explained <strong>on this page</strong>. Open what's new to you and skip what you know. In the stages below, any <button type='button' class='term demo' tabindex='-1'>underlined word</button> can be tapped for a quick explanation, and pattern or guide links open right where you are.</p>";

    h += "<h3>A. The patterns: reusable ideas this project is built from</h3>";
    h += (p.patterns || []).map((id) => {
      const s = (window.SIMPLE || {})["pattern:" + id];
      return d("<strong>" + esc(PAT[id].name) + "</strong>" + (s ? "<span class='xd-like'>Like: " + inline(s.analogy) + "</span>" : ""), patternCard(id, true));
    }).join("");

    const cs = refsIn(text, "c"), fs = refsIn(text, "f");
    if (cs.length || fs.length) {
      h += "<h3>B. Ideas from the guides this project relies on</h3>";
      h += fs.map((id) => d("<strong>" + esc(FW[id].title) + "</strong>" + ((window.SIMPLE || {})["chapter:" + id] ? "<span class='xd-like'>Like: " + inline(window.SIMPLE["chapter:" + id].analogy) + "</span>" : ""), docCard("f", id, true))).join("");
      h += cs.map((id) => d("<strong>" + esc(CON[id].title) + "</strong>" + ((window.SIMPLE || {})["concept:" + id] ? "<span class='xd-like'>Like: " + inline(window.SIMPLE["concept:" + id].analogy) + "</span>" : ""), docCard("c", id, true))).join("");
    }

    const T = TECH_BY();
    const techIds = Object.keys(techUse);
    if (techIds.length) {
      h += "<h3>C. Technology used: libraries, services and AI features</h3>";
      const kinds = ["AI platform", "Integration", "Library", "Infrastructure", "Python standard library"];
      techIds.sort((a, b) => kinds.indexOf(T[a].kind) - kinds.indexOf(T[b].kind));
      h += techIds.map((id) => d("<strong>" + inline(T[id].name) + "</strong><span class='xd-like'>" + esc(T[id].kind) + "</span>",
        techCard(T[id]) + "<p class='small muted'>Used in: " + techUse[id].map(stepName).join(", ") + "</p>")).join("");
    }

    const F = PY_BY();
    const pyIds = (window.PYFEATURES || []).map((f) => f.id).filter((id) => pyUse[id]);
    if (pyIds.length) {
      h += "<h3>D. Python you'll see in the code</h3><p class='muted small'>Every Python feature the code below uses, in the order a beginner usually learns them. Each step's code also lists its own features.</p>";
      h += pyIds.map((id) => d("<strong>" + inline(F[id].name) + "</strong><span class='xd-like'>" + pyUse[id].length + (pyUse[id].length === 1 ? " step" : " steps") + "</span>",
        pyCard(F[id]) + "<p class='small muted'>Used in: " + pyUse[id].map(stepName).join(", ") + "</p>")).join("");
    }

    const words = termsInText(text + "\n" + (window.SIMPLE["project:" + p.id] || {}).simple);
    if (words.length) h += "<h3>E. Words to know</h3><p class='muted small'>Technical words that appear in this project, in the order you'll meet them.</p>" + wordList(words);
    return h;
  }

  function stepExtras(p, step, n) {
    let h = "";
    const walk = (window.WALK || {})[p.id + ":" + n];
    if (walk && walk.length) h += "<div class='walk'><p class='walk-title'>The code in plain words</p><ol>" + walk.map((w) => "<li>" + inline(w) + "</li>").join("") + "</ol></div>";
    const py = pyOf(step), tech = techOf(step);
    if (tech.length) h += "<div class='chips-row'><span class='simple-tag'>Technology here</span>" + tech.map((t) => "<button type='button' class='chip' data-x='t:" + t.id + "'>" + inline(t.name) + "</button>").join("") + "</div>";
    if (py.length) h += "<div class='chips-row'><span class='simple-tag'>Python used here</span>" + py.map((f) => "<button type='button' class='chip' data-x='py:" + f.id + "'>" + inline(f.name) + "</button>").join("") + "</div>";
    return h;
  }

  function recap(p) {
    const steps = p.build || [];
    const tech = [...new Set(steps.flatMap((s) => techOf(s).map((t) => t.id)))];
    const py = [...new Set(steps.flatMap((s) => pyOf(s).map((f) => f.id)))];
    const T = TECH_BY(), F = PY_BY();
    let h = "<p>Here's everything you met in this project. If you can explain each line below in your own words, you understood the project.</p>";
    h += "<h3>Patterns you used</h3><ul>" + (p.patterns || []).map((id) => {
      const s = (window.SIMPLE || {})["pattern:" + id];
      const files = steps.filter((st) => (st.patterns || []).includes(id)).map((st) => "~" + st.file.split(" ")[0] + "~");
      return "<li><button type='button' class='chip' data-x='p:" + id + "'>" + esc(PAT[id].name) + "</button> " + (s ? inline(s.analogy) : "") +
        (files.length ? " <span class='muted small'>Where: " + inline(files.join(", ")) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
    if (tech.length) h += "<h3>Technology you met</h3><div class='chips-row'>" + tech.map((id) => "<button type='button' class='chip' data-x='t:" + id + "'>" + inline(T[id].name) + "</button>").join("") + "</div>";
    if (py.length) h += "<h3>Python you practised</h3><div class='chips-row'>" + py.map((id) => "<button type='button' class='chip' data-x='py:" + id + "'>" + inline(F[id].name) + "</button>").join("") + "</div>";
    h += "<h3>Explain it back (say these out loud)</h3><ol>";
    h += "<li>In two sentences, what problem did the client have, and how did you measure success?</li>";
    (p.patterns || []).slice(0, 4).forEach((id) => {
      const s = (window.SIMPLE || {})["pattern:" + id];
      h += "<li>Explain <strong>" + esc(PAT[id].name) + "</strong> using its everyday comparison" + (s ? " (" + inline(s.analogy.replace(/\.$/, "")) + ")" : "") + ", then point to where it happens in this project's code.</li>";
    });
    h += "<li>Pick one code step and read it line by line, saying what each part does. Use the plain-words list under that step to check yourself.</li>";
    h += "<li>What is the most likely way this system could fail, and how would you notice?</li></ol>";
    return h;
  }

  function pageProject(id) {
    const p = P[id];
    if (!p) return notFound();
    const idx = ordered.indexOf(p);
    const prev = ordered[idx - 1], next = ordered[idx + 1];
    let h = lvlPill(p.level) + ' <span class="muted small" style="margin-left:6px">' + p.code + "</span>";
    h += "<h1 style='margin-top:10px'>" + esc(p.title) + "</h1>";
    h += '<p class="lead">' + esc(p.summary) + "</p>" + simpleBox("project:" + p.id);
    h += '<div class="meta"><span>🏢 ' + esc(p.client) + "</span><span>🏷️ " + esc(p.industry) + "</span>" + (p.time ? "<span>⏱️ " + esc(p.time) + "</span>" : "") + "</div>";
    h += "<div>" + (p.patterns || []).map((pt) => {
      const first = usage[pt] && usage[pt][0] === p.id;
      return first ? ref("p", pt).replace('class="chip"', 'class="chip new" title="First introduced here"') : ref("p", pt);
    }).join("") + "</div>";
    if (p.newConcepts && p.newConcepts.length) h += '<p class="small muted" style="margin-top:10px"><strong>New here:</strong> ' + p.newConcepts.map(esc).join(" · ") + "</p>";

    h += '<nav class="stage-nav">' + STAGES.map(([k, short]) => '<a href="#/project/' + id + "?s=" + k + '" data-stage="' + k + '">' + short + "</a>").join("") + "</nav>";

    STAGES.forEach(([k, short, long]) => {
      let body = "";
      if (k === "build") {
        if (p.tree) body += "<p class='muted small'>Project layout:</p>" + codeBlock(p.tree, "text");
        if (p.buildIntro) body += md(p.buildIntro);
        (p.build || []).forEach((step, n) => {
          body += '<div class="file-head"><strong>Step ' + (n + 1) + " · " + esc(step.file) + "</strong>" + (step.patterns ? step.patterns.map((x) => ref("p", x)).join("") : "") + "</div>";
          if (step.note) body += md(step.note);
          if (step.code) body += codeBlock(step.code, step.lang || "python");
          body += stepExtras(p, step, n);
          if (step.after) body += md(step.after);
        });
      } else if (k === "start") {
        body = beforeYouStart(p);
      } else if (k === "recap") {
        body = recap(p);
      } else if (k === "practice") {
        if (p.exercises && p.exercises.length) body += "<h3>Exercises</h3><ol>" + p.exercises.map((e) => "<li>" + inline(e) + "</li>").join("") + "</ol>";
        if (p.interview) body += "<h3>How to talk about this in an interview</h3>" + md(p.interview);
        if (p.skills && p.skills.length) body += "<h3>Skills this project proves</h3><ul>" + p.skills.map((s) => "<li>" + inline(s) + "</li>").join("") + "</ul>";
        body += "<h3>Your notes</h3><textarea class='notes' id='notes' placeholder='What surprised you? What would you do differently? (Saved in this browser only.)'></textarea>";
        body += "<p style='margin-top:14px'><button class='btn " + (isDone(id) ? "" : "primary") + "' id='done-btn'>" + (isDone(id) ? "✓ Completed (undo)" : "Mark project as completed") + "</button></p>";
      } else {
        body = md(p[k]);
      }
      if (!body) return;
      const termsAttr = ["start", "recap", "practice"].includes(k) ? "" : " data-terms";
      h += '<section class="stage"' + termsAttr + ' id="stage-' + k + '"><div class="stage-label">' + esc(short) + "</div><h2>" + esc(long) + "</h2>" + stageAnalogy(k) + body + "</section>";
    });

    if (STEP["proj:" + id]) return h + pathPager("proj:" + id);
    h += '<div class="pager">' + (prev ? '<a href="#/project/' + prev.id + '"><div class="card"><div class="k">← Previous</div><div class="t">' + esc(prev.code + " " + prev.title) + "</div></div></a>" : "<span></span>") +
      (next ? '<a href="#/project/' + next.id + '"><div class="card" style="text-align:right"><div class="k">Next →</div><div class="t">' + esc(next.code + " " + next.title) + "</div></div></a>" : "<span></span>") + "</div>";
    return h;
  }

  function pagePatterns() {
    let h = "<h1>Pattern library</h1><p class='lead'>Once you can name a pattern you start seeing it everywhere. The number on each one is how many of the 28 projects use it.</p>";
    h += md(window.PATTERNS_INTRO || "");
    h += "<h2>Words you'll need first</h2><p class='muted'>These words appear on almost every pattern page. If they're new, read them now. Each pattern page also lists its own new words before the technical part, and every word is in the <a href='#/glossary'>Glossary</a>.</p>";
    h += wordList(window.PATTERN_STARTER_WORDS || []);
    h += "<h2>How to read a pattern page</h2><ol><li><strong>In simple words</strong>: the idea in one or two sentences.</li><li><strong>The real-life story</strong>: the same idea happening in everyday life, step by step.</li><li><strong>How the story matches the system</strong>: a table pairing each real-life part with its technical part.</li><li><strong>Why it works / where it stops working</strong>: so the analogy helps without misleading you.</li><li><strong>New words</strong>, then the technical details and code.</li></ol>";
    const cats = [...new Set(window.PATTERNS.map((p) => p.category))];
    cats.forEach((cat) => {
      h += "<h2>" + esc(cat) + "</h2><div class='cards'>";
      window.PATTERNS.filter((p) => p.category === cat).forEach((pt) => {
        h += '<a class="card" href="#/pattern/' + pt.id + '"><div class="k">used in ' + usage[pt.id].length + ' projects</div><div class="t">' + esc(pt.name) + '</div><div class="s">' + esc(pt.summary) + "</div>" +
          (window.SIMPLE && window.SIMPLE["pattern:" + pt.id] ? '<div class="s like"><em>Like:</em> ' + inline(window.SIMPLE["pattern:" + pt.id].analogy) + "</div>" : "") + "</a>";
      });
      h += "</div>";
    });
    return h;
  }

  function pagePattern(id) {
    const pt = PAT[id];
    if (!pt) return notFound();
    let h = '<p class="muted small"><a href="#/patterns">Pattern library</a> · ' + esc(pt.category) + "</p>";
    h += "<h1>" + esc(pt.name) + "</h1><p class='lead'>" + esc(pt.summary) + "</p>" + simpleBox("pattern:" + pt.id);
    h += deepAnalogy(pt.id);
    h += "<hr><p class='stage-label'>The technical part</p>";
    if (pt.problem) h += "<h2>The problem it solves</h2>" + md(pt.problem);
    if (pt.solution) h += "<h2>The pattern</h2>" + md(pt.solution);
    if (pt.code) h += "<h2>Minimal code</h2>" + codeBlock(pt.code, pt.lang || "python");
    if (pt.pitfalls) h += "<h2>Pitfalls and when not to use it</h2>" + md(pt.pitfalls);
    const uses = usage[id].map((pid) => P[pid]);
    h += "<h2>Where it shows up (" + uses.length + ")</h2>";
    h += uses.length ? "<p class='muted'>Same pattern, different industries. Open two of these side by side and compare how the pattern bends to fit each problem.</p><div class='cards'>" + uses.map(projCard).join("") + "</div>" : "<p class='muted'>Not used by a project yet.</p>";
    if (pt.related && pt.related.length) h += "<h2>Related patterns</h2><p>" + pt.related.map((r) => ref("p", r)).join(" ") + "</p>";
    return h;
  }

  function pageMatrix() {
    let h = "<h1>Pattern matrix</h1><p class='lead'>Rows are patterns and columns are projects. Read across a row to see one idea travel from a beginner script to an advanced platform.</p>";
    const pats = window.PATTERNS.slice().sort((a, b) => usage[b.id].length - usage[a.id].length);
    h += "<div class='matrix-wrap'><table class='matrix'><thead><tr><th style='text-align:left'>Pattern</th><th>Σ</th>";
    ordered.forEach((p) => (h += "<th class='rot' title='" + esc(p.title) + "'><div><a href='#/project/" + p.id + "'>" + p.code + "</a></div></th>"));
    h += "</tr></thead><tbody>";
    pats.forEach((pt) => {
      h += "<tr><td class='name'><a href='#/pattern/" + pt.id + "'>" + esc(pt.name) + "</a></td><td class='total'>" + usage[pt.id].length + "</td>";
      ordered.forEach((p) => {
        const hit = (p.patterns || []).includes(pt.id);
        h += hit ? "<td class='hit' title='" + esc(pt.name + " in " + p.title) + "'>●</td>" : "<td></td>";
      });
      h += "</tr>";
    });
    h += "</tbody></table></div>";
    h += "<p class='muted small' style='margin-top:12px'>B = beginner, I = intermediate, A = advanced. The patterns at the top are the ones employers assume you know.</p>";
    return h;
  }

  function pageList(title, lead, items, base, intro) {
    let h = "<h1>" + title + "</h1><p class='lead'>" + lead + "</p>" + md(intro || "") + "<div class='cards'>";
    items.forEach((c, n) => (h += '<a class="card" href="#/' + base + "/" + c.id + '"><div class="k">' + String(n + 1).padStart(2, "0") + '</div><div class="t">' + esc(c.title) + '</div><div class="s">' + esc(c.summary) + "</div></a>"));
    return h + "</div>";
  }

  const KIND = { framework: "chapter", concepts: "concept", skills: "skill" };
  function pageDoc(list, id, base, crumb) {
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) return notFound();
    const c = list[i], prev = list[i - 1], next = list[i + 1];
    let h = '<p class="muted small"><a href="#/' + base + '">' + crumb + "</a></p><h1>" + esc(c.title) + "</h1><p class='lead'>" + esc(c.summary) + "</p>" + simpleBox(KIND[base] + ":" + c.id) + md(c.body);
    const key = { framework: "f:", concepts: "c:", skills: "s:" }[base] + c.id;
    if (STEP[key]) return h + pathPager(key);
    h += '<div class="pager">' + (prev ? '<a href="#/' + base + "/" + prev.id + '"><div class="card"><div class="k">← Previous</div><div class="t">' + esc(prev.title) + "</div></div></a>" : "<span></span>") +
      (next ? '<a href="#/' + base + "/" + next.id + '"><div class="card" style="text-align:right"><div class="k">Next →</div><div class="t">' + esc(next.title) + "</div></div></a>" : "<span></span>") + "</div>";
    return h;
  }

  /* plain-language layer */
  function simpleBox(key) {
    const x = (window.SIMPLE || {})[key];
    if (!x) return "";
    return '<div class="simple"><div class="simple-row"><span class="simple-tag">In simple words</span><span>' + inline(x.simple) +
      '</span></div><div class="simple-row"><span class="simple-tag">Think of it like</span><span>' + inline(x.analogy) + "</span></div></div>";
  }
  function stageAnalogy(k) {
    const x = (window.SIMPLE || {})["stage:" + k];
    return x ? '<p class="stage-analogy">' + inline(x.simple) + " <em>Like: " + inline(x.analogy) + "</em></p>" : "";
  }

  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function glossaryEntry(term) { return (window.GLOSSARY || []).find((g) => g.term === term); }
  function wordList(terms) {
    const rows = terms.map(glossaryEntry).filter(Boolean);
    if (!rows.length) return "";
    return "<dl class='words'>" + rows.map((g) =>
      "<div class='word'><dt><a href='#/glossary/" + slug(g.term) + "'>" + esc(g.term) + "</a></dt><dd>" + inline(g.simple) +
      " <span class='muted'><em>Like:</em> " + inline(g.analogy) + "</span></dd></div>").join("") + "</dl>";
  }
  function deepAnalogy(id) {
    const d = (window.PATTERN_DEEP || {})[id];
    if (!d) return "";
    let h = "<h2>The real-life story</h2><ol class='story'>" + d.story.map((x) => "<li>" + inline(x) + "</li>").join("") + "</ol>";
    h += "<h3>How the story matches the system</h3><table><thead><tr><th>In real life</th><th>In the AI system</th></tr></thead><tbody>" +
      d.mapping.map(([a, b]) => "<tr><td>" + inline(a) + "</td><td>" + inline(b) + "</td></tr>").join("") + "</tbody></table>";
    h += "<div class='logic'><div><span class='simple-tag'>Why the analogy works</span><p>" + inline(d.why) + "</p></div>" +
      "<div><span class='simple-tag warn-tag'>Where the analogy stops working</span><p>" + inline(d.breaks) + "</p></div></div>";
    if (d.words && d.words.length) h += "<h2>New words on this page</h2><p class='muted small'>Read these before the technical part below. Each one links to the full Glossary.</p>" + wordList(d.words);
    return h;
  }

  function pageGlossary() {
    const items = (window.GLOSSARY || []).slice().sort((a, b) => a.term.localeCompare(b.term));
    let h = "<h1>Glossary</h1><p class='lead'>Every piece of jargon in this lab, in plain words, with an everyday comparison. Come back here whenever a word stops you.</p>";
    h += "<div class='gloss'>";
    items.forEach((g) => {
      h += "<div class='gloss-item' id='g-" + slug(g.term) + "'><h3>" + esc(g.term) + "</h3><p>" + inline(g.simple) +
        "</p><p class='muted'><em>Think of it like:</em> " + inline(g.analogy) + "</p></div>";
    });
    return h + "</div>";
  }

  const notFound = () => "<h1>Not found</h1><p><a href='#/'>Go home</a></p>";

  /* ---------- router ---------- */
  function route() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, query] = hash.split("?");
    const parts = path.split("/").filter(Boolean);
    let html;
    switch (parts[0]) {
      case undefined: html = pageHome(); break;
      case "start": html = pageStart(); break;
      case "warmup": html = pageWarmup(); break;
      case "path": html = pagePath(); break;
      case "checkpoint": html = pageCheckpoint(parts[1]); break;
      case "track": html = pageTrack(parts[1]); break;
      case "project": html = pageProject(parts[1]); break;
      case "patterns": html = pagePatterns(); break;
      case "pattern": html = pagePattern(parts[1]); break;
      case "matrix": html = pageMatrix(); break;
      case "glossary": html = pageGlossary(); break;
      case "framework": html = parts[1] ? pageDoc(window.FRAMEWORK, parts[1], "framework", "How AI engineers think") : pageList("How AI engineers think", "The mental models every project in this lab uses. Read these first, then come back to them after each level.", window.FRAMEWORK, "framework", window.FRAMEWORK_INTRO); break;
      case "concepts": html = pageList("Core concepts", "The technology choices you'll have to explain to clients and interviewers: APIs, MCP, RAG, agents, evals and the rest.", window.CONCEPTS, "concept"); break;
      case "concept": html = pageDoc(window.CONCEPTS, parts[1], "concepts", "Core concepts"); break;
      case "skills": html = parts[1] ? pageDoc(window.SKILLS, parts[1], "skills", "Hiring & skills") : pageList("Hiring & skills", "What gets beginners hired, what separates a solid AI engineer from an average one, and what senior engineers do differently.", window.SKILLS, "skills"); break;
      default: html = notFound();
    }
    const sk = stepKeyFor(parts);
    if (sk && STEP[sk] && html !== notFound()) html = stepBanner(STEP[sk]) + html;
    main.innerHTML = html;
    renderNav($("#search").value);
    enhance();
    const stage = new URLSearchParams(query || "").get("s");
    if (parts[0] === "glossary" && parts[1] && $("#g-" + parts[1])) { $("#g-" + parts[1]).scrollIntoView(); $("#g-" + parts[1]).classList.add("flash"); }
    else if (stage && $("#stage-" + stage)) $("#stage-" + stage).scrollIntoView();
    else window.scrollTo(0, 0);
    $("#sidebar").classList.remove("open");
    const t = $("h1", main);
    document.title = (t && parts[0] ? t.textContent + " · " : "") + "AI Engineer Lab";
  }

  function enhance() {
    if (location.hash.startsWith("#/project/")) markTerms(main);
    if (window.hljs) main.querySelectorAll("pre code").forEach((el) => {
      if (!/language-(text|txt)$/.test(el.className)) { try { window.hljs.highlightElement(el); } catch (e) { /* ignore */ } }
    });
    main.querySelectorAll(".copy-btn").forEach((b) => b.addEventListener("click", () => {
      const code = b.parentElement.querySelector("code").innerText;
      const ok = () => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, () => {}); else ok();
    }));
    main.querySelectorAll(".stage-nav a").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const el = $("#stage-" + a.dataset.stage);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", a.getAttribute("href"));
    }));
    const notes = $("#notes");
    if (notes) {
      const id = location.hash.split("/")[2].split("?")[0];
      notes.value = store.get("notes:" + id, "");
      notes.addEventListener("input", () => store.set("notes:" + id, notes.value));
    }
    main.querySelectorAll("[data-step-next]").forEach((b) => b.addEventListener("click", () => {
      const s = STEP[b.dataset.stepNext];
      setStepDone(s, true);
      const next = STEPS[s.n + 1];
      location.hash = next ? stepHref(next) : "#/path";
    }));
    main.querySelectorAll("[data-step-undo]").forEach((b) => b.addEventListener("click", () => {
      setStepDone(STEP[b.dataset.stepUndo], false);
      const y = window.scrollY; route(); window.scrollTo(0, y);
    }));
    main.querySelectorAll("input[data-ready]").forEach((cb) => cb.addEventListener("change", () => {
      const [id, i] = cb.dataset.ready.split(":");
      const t = store.get("ready:" + id, {});
      if (cb.checked) t[i] = 1; else delete t[i];
      store.set("ready:" + id, t);
    }));
    const btn = $("#done-btn");
    if (btn) btn.addEventListener("click", () => {
      const id = location.hash.split("/")[2].split("?")[0];
      toggleDone(id);
      const y = window.scrollY; route(); window.scrollTo(0, y);
    });
  }

  // tap-to-explain: words everywhere; pattern/guide links too while reading a project
  main.addEventListener("click", (e) => {
    const t = e.target.closest("[data-x]");
    if (!t || !main.contains(t)) return;
    const kind = t.dataset.x.split(":")[0];
    const onProject = location.hash.startsWith("#/project/");
    if (kind === "g" || kind === "t" || kind === "py" || onProject) {
      e.preventDefault();
      toggleXcard(t);
    }
  });

  $("#search").addEventListener("input", (e) => renderNav(e.target.value));
  $("#open-nav").addEventListener("click", () => $("#sidebar").classList.add("open"));
  $("#close-nav").addEventListener("click", () => $("#sidebar").classList.remove("open"));
  window.addEventListener("hashchange", route);
  route();
})();
