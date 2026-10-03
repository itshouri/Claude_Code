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
 *   - Never write a dollar sign followed by an opening brace inside a template.
 */
const md = String.raw;
const py = String.raw;
const txt = String.raw;

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
