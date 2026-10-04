# Notes for Claude

- The owner of this repo is a beginner. Always explain concepts in simple, everyday words and
  always include an analogy (a comparison to something from everyday life). Avoid unexplained jargon;
  if a technical word is needed, define it in plain words first.
- Platform content follows the same rule: every project, pattern, concept, chapter and skill page has an
  entry in `content/simple.js` (`SIMPLE["<kind>:<id>"] = { simple, analogy }`), and new jargon gets a
  `GLOSSARY` entry there. Add these whenever you add content.
- Every pattern also has a step-by-step real-life story in `content/patterns-explained.js`
  (`PATTERN_DEEP[id] = { story, mapping, why, breaks, words }`). `words` must name existing `GLOSSARY` terms.
- Project pages are all-in-one. When adding or changing a project's code step, also update its walkthrough
  in `content/walkthroughs-*.js` (`WALK["<project>:<step index>"] = [...]`, plain words, top to bottom).
  Technologies and Python features are detected automatically from code via `content/tech.js`
  (`TECH`, `PYFEATURES`); add an entry there when code uses a new library or language feature.
- The lab has one guided order: the learning path in `content/path.js` (`PATH` phases → steps with a
  plain-words `why` it comes now). Every new project, chapter, concept or skill page must be added to `PATH`
  exactly once, "just in time" before the project that first needs it. The Start page, Warm-up words and
  level checkpoints (`START_PAGE`, `WARMUP_PAGE`, `CHECKPOINTS`) live in the same file.
