/* AI Engineer Lab — tiny hash-router app. No build step, no framework. */
(function () {
  "use strict";

  const LEVELS = [
    { id: "beginner", name: "Beginner", blurb: "One model call, done properly. Structured outputs, validation, routing, simple retrieval, evaluation from day one." },
    { id: "intermediate", name: "Intermediate", blurb: "Real retrieval, tools, MCP, workflows, cascades, memory, LLM judges and prompt CI. Systems with several moving parts." },
    { id: "advanced", name: "Advanced", blurb: "Platforms and production systems: multi-tenant RAG, durable workflows, multi-agent research, gateways, security, eval flywheels, strategy." },
  ];

  const STAGES = [
    ["brief", "1 · Brief", "The client brief"],
    ["discovery", "2 · Discover", "Discovery: what you ask before you build"],
    ["frame", "3 · Frame", "Frame the problem"],
    ["design", "4 · Design", "System design"],
    ["build", "5 · Build", "Build it"],
    ["evaluate", "6 · Evaluate", "Evaluate it"],
    ["operate", "7 · Operate", "Ship and operate"],
    ["levelUp", "8 · Level up", "What changes at 10x"],
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
      return '<a class="chip" href="#/pattern/' + id + '">' + esc(pt.name) + '<span class="count">×' + usage[id].length + "</span></a>";
    }
    if (kind === "proj") { const p = P[id]; return p ? '<a href="#/project/' + id + '">' + esc(p.code + " " + p.title) + "</a>" : esc(id); }
    if (kind === "c") { const c = CON[id]; return c ? '<a href="#/concept/' + id + '">' + esc(c.title) + "</a>" : esc(id); }
    if (kind === "f") { const c = FW[id]; return c ? '<a href="#/framework/' + id + '">' + esc(c.title) + "</a>" : esc(id); }
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
      h += link("#/framework", "How AI engineers think");
      h += link("#/concepts", "Core concepts (API, MCP, RAG…)");
      h += link("#/patterns", "Pattern library");
      h += link("#/matrix", "Pattern matrix");
      h += link("#/skills", "Hiring & skills");
      h += link("#/glossary", "Glossary (simple words)");
    }
    LEVELS.forEach((lvl) => {
      const items = projectsOf(lvl.id).filter((p) => !q || searchText(p).includes(q));
      if (!items.length) return;
      h += '<div class="nav-section"><a href="#/track/' + lvl.id + '" style="color:inherit">' + lvl.name + "</a></div>";
      items.forEach((p) => {
        h += link("#/project/" + p.id, '<span class="num">' + p.code + "</span>" + esc(p.title), isDone(p.id) ? '<span class="done">✓</span>' : "");
      });
    });
    if (q) {
      const pats = window.PATTERNS.filter((pt) => (pt.name + " " + pt.summary).toLowerCase().includes(q));
      if (pats.length) {
        h += '<div class="nav-section">Patterns</div>';
        pats.forEach((pt) => (h += link("#/pattern/" + pt.id, esc(pt.name))));
      }
      const gl = (window.GLOSSARY || []).filter((g) => (g.term + " " + g.simple).toLowerCase().includes(q));
      if (gl.length) {
        h += '<div class="nav-section">Glossary</div>';
        gl.slice(0, 8).forEach((g) => (h += link("#/glossary", esc(g.term))));
      }
      if (h === "") h = '<p class="muted small" style="padding:0 8px">No matches.</p>';
    }
    $("#nav").innerHTML = h;
    const done = window.PROJECTS.filter((p) => isDone(p.id)).length;
    const tot = window.PROJECTS.length;
    $("#progress-summary").innerHTML = done + " of " + tot + " projects completed" +
      '<div class="bar"><span style="width:' + (tot ? (100 * done) / tot : 0) + '%"></span></div>';
  }
  const searchText = (p) => [p.title, p.industry, p.client, p.summary, ...(p.patterns || []).map((id) => (PAT[id] || {}).name || id), ...(p.newConcepts || [])].join(" ").toLowerCase();

  /* ---------- pages ---------- */
  const lvlPill = (lvl) => '<span class="pill lvl-' + lvl + '">' + lvl[0].toUpperCase() + lvl.slice(1) + "</span>";
  const projCard = (p) =>
    '<a class="card' + (isDone(p.id) ? " done" : "") + '" href="#/project/' + p.id + '"><div class="k">' + p.code + " · " + esc(p.industry) + (isDone(p.id) ? " · ✓" : "") +
    '</div><div class="t">' + esc(p.title) + '</div><div class="s">' + esc(p.summary) + "</div></a>";

  function pageHome() {
    let h = "<h1>Learn to think like an AI engineer</h1>";
    h += '<p class="lead">Twenty-eight realistic client projects, each one worked from the business problem to a running, evaluated system. The same few patterns keep coming back. Learning to spot them is most of the job.</p>';
    h += md(window.HOME_INTRO || "");
    LEVELS.forEach((l) => {
      const ps = projectsOf(l.id);
      const done = ps.filter((p) => isDone(p.id)).length;
      h += '<h2><a href="#/track/' + l.id + '" style="color:inherit">' + l.name + "</a> " + '<span class="muted small">' + done + "/" + ps.length + "</span></h2>";
      h += '<p class="muted">' + esc(l.blurb) + "</p>";
      h += '<div class="cards">' + ps.map(projCard).join("") + "</div>";
    });
    return h;
  }

  function pageTrack(id) {
    const l = LEVELS.find((x) => x.id === id);
    if (!l) return notFound();
    const ps = projectsOf(id);
    let h = lvlPill(id) + "<h1 style='margin-top:10px'>" + l.name + " projects</h1><p class='lead'>" + esc(l.blurb) + "</p>";
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
          if (step.after) body += md(step.after);
        });
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
      h += '<section class="stage" id="stage-' + k + '"><div class="stage-label">' + esc(short) + "</div><h2>" + esc(long) + "</h2>" + stageAnalogy(k) + body + "</section>";
    });

    h += '<div class="pager">' + (prev ? '<a href="#/project/' + prev.id + '"><div class="card"><div class="k">← Previous</div><div class="t">' + esc(prev.code + " " + prev.title) + "</div></div></a>" : "<span></span>") +
      (next ? '<a href="#/project/' + next.id + '"><div class="card" style="text-align:right"><div class="k">Next →</div><div class="t">' + esc(next.code + " " + next.title) + "</div></div></a>" : "<span></span>") + "</div>";
    return h;
  }

  function pagePatterns() {
    let h = "<h1>Pattern library</h1><p class='lead'>Once you can name a pattern you start seeing it everywhere. The number on each one is how many of the 28 projects use it.</p>";
    h += md(window.PATTERNS_INTRO || "");
    const cats = [...new Set(window.PATTERNS.map((p) => p.category))];
    cats.forEach((cat) => {
      h += "<h2>" + esc(cat) + "</h2><div class='cards'>";
      window.PATTERNS.filter((p) => p.category === cat).forEach((pt) => {
        h += '<a class="card" href="#/pattern/' + pt.id + '"><div class="k">used in ' + usage[pt.id].length + ' projects</div><div class="t">' + esc(pt.name) + '</div><div class="s">' + esc(pt.summary) + "</div></a>";
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

  function pageGlossary() {
    const items = (window.GLOSSARY || []).slice().sort((a, b) => a.term.localeCompare(b.term));
    let h = "<h1>Glossary</h1><p class='lead'>Every piece of jargon in this lab, in plain words, with an everyday comparison. Come back here whenever a word stops you.</p>";
    h += "<div class='gloss'>";
    items.forEach((g) => {
      h += "<div class='gloss-item' id='g-" + g.term.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "'><h3>" + esc(g.term) + "</h3><p>" + inline(g.simple) +
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
    main.innerHTML = html;
    renderNav($("#search").value);
    enhance();
    const stage = new URLSearchParams(query || "").get("s");
    if (stage && $("#stage-" + stage)) $("#stage-" + stage).scrollIntoView();
    else window.scrollTo(0, 0);
    $("#sidebar").classList.remove("open");
    const t = $("h1", main);
    document.title = (t && parts[0] ? t.textContent + " · " : "") + "AI Engineer Lab";
  }

  function enhance() {
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
    const btn = $("#done-btn");
    if (btn) btn.addEventListener("click", () => {
      const id = location.hash.split("/")[2].split("?")[0];
      toggleDone(id);
      const y = window.scrollY; route(); window.scrollTo(0, y);
    });
  }

  $("#search").addEventListener("input", (e) => renderNav(e.target.value));
  $("#open-nav").addEventListener("click", () => $("#sidebar").classList.add("open"));
  $("#close-nav").addEventListener("click", () => $("#sidebar").classList.remove("open"));
  window.addEventListener("hashchange", route);
  route();
})();
