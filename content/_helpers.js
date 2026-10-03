/*
 * Content helpers shared by every content file.
 *
 * Authoring rules (so content never breaks the JS):
 *   - Prose is written with  md`...`  (String.raw, so backslashes survive).
 *   - Inside prose, inline code is written ~like_this~ (not with backticks).
 *   - Code fences inside prose use ~~~lang ... ~~~ .
 *   - Code samples are written with  py`...`  (also String.raw).
 *   - [[p:pattern-id]] renders a pattern chip, [[proj:b01]] a project link,
 *     [[c:concept-id]] a concept link, [[f:chapter-id]] a framework link.
 *   - A literal dollar-brace (e.g. GitHub Actions expressions) must be written as
 *     backslash-dollar-brace; the tags below strip the backslash.
 */
const _raw = (s, ...v) => String.raw(s, ...v).replace(/\\\$\{/g, "$" + "{");
const md = _raw;
const py = _raw;
const txt = _raw;

window.FRAMEWORK = [];
window.CONCEPTS = [];
window.PATTERNS = [];
window.SKILLS = [];
window.PROJECTS = [];

function project(p) { p.code = p.id.toUpperCase(); window.PROJECTS.push(p); }
function pattern(p) { window.PATTERNS.push(p); }
function concept(c) { window.CONCEPTS.push(c); }
function chapter(c) { window.FRAMEWORK.push(c); }
function skillPage(s) { window.SKILLS.push(s); }
