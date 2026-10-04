# Notes for Claude

- The owner of this repo is a beginner. Always explain concepts in simple, everyday words and
  always include an analogy (a comparison to something from everyday life). Avoid unexplained jargon;
  if a technical word is needed, define it in plain words first.
- Platform content follows the same rule: every project, pattern, concept, chapter and skill page has an
  entry in `content/simple.js` (`SIMPLE["<kind>:<id>"] = { simple, analogy }`), and new jargon gets a
  `GLOSSARY` entry there. Add these whenever you add content.
- Every pattern also has a step-by-step real-life story in `content/patterns-explained.js`
  (`PATTERN_DEEP[id] = { story, mapping, why, breaks, words }`). `words` must name existing `GLOSSARY` terms.
