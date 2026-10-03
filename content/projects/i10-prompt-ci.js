project({
  id: "i10",
  level: "intermediate",
  title: "Observability and prompt CI for existing LLM features",
  industry: "Media / publishing",
  client: "Northstar Media: a digital news publisher with three LLM features already in production",
  time: "6–8 hours",
  summary: "Add tracing to every model call, a prompt registry, eval suites per feature, and a CI gate that blocks regressions, plus shadow testing for model upgrades.",
  newConcepts: ["OpenTelemetry GenAI spans", "Prompt registry and versions", "Baselines with tolerances", "CI eval gates", "Shadow/canary rollouts for prompts and models"],
  patterns: ["observability", "prompt-ci", "eval-harness", "prompt-as-code", "llm-gateway", "llm-judge"],
  skills: ["LLMOps fundamentals", "Turning ad-hoc prompts into an engineered system", "Safe change management"],

  brief: md`
> "We shipped three AI features last year: headline suggestions, article summaries for the newsletter, and topic tagging for our archive. They mostly work. But last month someone 'improved' the summary prompt and it started inventing quotes. We found out from a reader. We have no idea what changes break what."
> (VP Engineering, Northstar Media)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Where do prompts live? | Inline strings in three services, edited directly | Move to a registry with versions |
| What's logged? | HTTP status codes only | Need traces with prompt version, tokens, latency, outputs (sampled) |
| Who changes prompts? | Engineers *and* editors | Changes must be reviewed and tested automatically |
| What's a regression? | Summaries: invented quotes or facts (critical), length overruns. Tags: precision drops. Headlines: clickbait or style-guide violations | Per-feature metrics with **critical** vs **soft** thresholds |
| Model upgrades? | "We're afraid to change models" | Shadow testing on live traffic before switching |
| Labelled data? | Editors' corrections on tags; approved newsletter summaries | Seed eval sets |

**Success:** every prompt/model change runs evals in CI; no critical-metric regression reaches production; time to diagnose a bad output < 10 minutes.
`,

  frame: md`
This is an **LLMOps** engagement: the features exist, and the job is to make them *engineered*. Three gaps, three patterns:

1. **"We can't see what happened"** → [[p:observability]]: a trace per request, a span per model call, with prompt version, model, tokens, latency and finish reason.
2. **"Anyone can change a prompt"** → [[p:prompt-as-code]]: a registry where prompts are versioned files, reviewed in PRs, and loaded by name and version.
3. **"Changes break things silently"** → [[p:prompt-ci]]: eval suites per feature that run in CI against stored baselines, with critical metrics that block the merge.

Plus a fourth practice: **shadow mode** for model upgrades. Run the new model on a copy of live traffic, compare offline, then switch.
`,

  design: md`
~~~text
  developer/editor edits prompts/summaries/v7.md ──▶ pull request
                                                         │
                                                         ▼
                         CI: detect changed prompts/models ──▶ run eval suite(s) for affected features
                                                         │         (golden sets, code graders, judges)
                                                         ▼
                                    compare with evals/baselines/*.json (floors + tolerances)
                                       │ critical regression → ✗ block merge, post report on PR
                                       │ soft regression     → ⚠ require reviewer sign-off
                                       ▼
                               merge ──▶ deploy (registry: summaries → v7)

  production: gateway v3 ──▶ OpenTelemetry spans ──▶ tracing backend (dashboards, search by trace id)
              │ 1% sampled outputs ──▶ online judge (faithfulness) ──▶ alerts
              └ shadow: new model on 5% mirrored traffic ──▶ offline comparison report
~~~
`,

  tree: txt`
llm-platform/
├── llm.py                     # gateway v3: + registry, tracing, shadow
├── prompts/
│   ├── registry.yaml          # feature → active version
│   ├── summaries/v6.md, v7.md
│   ├── headlines/v3.md
│   └── tags/v4.md
├── evals/
│   ├── suites/summaries.py    # metrics for one feature
│   ├── suites/tags.py
│   ├── data/                  # golden sets per feature
│   ├── baselines/             # last accepted metrics per feature
│   └── gate.py                # CI entry point
└── .github/workflows/llm-evals.yml
`,

  build: [
    {
      file: "llm.py (v3: registry + tracing)",
      patterns: ["llm-gateway", "observability", "prompt-as-code"],
      note: md`The gateway now loads prompts **by feature name** from the registry and emits an **OpenTelemetry span** for every call, using the GenAI semantic-convention attribute names so any tracing backend understands them. Callers don't change: they say ~run("summaries", ...)~.`,
      code: py`
import time
from pathlib import Path

import anthropic
import yaml
from opentelemetry import trace

tracer = trace.get_tracer("northstar.llm")
_client = anthropic.Anthropic()
ROOT = Path(__file__).parent / "prompts"
REGISTRY = yaml.safe_load(open(ROOT / "registry.yaml"))
# registry.yaml:
#   summaries: {version: v7, model: claude-opus-5-5, max_tokens: 800}
#   headlines: {version: v3, model: claude-haiku-4-5, max_tokens: 300}
#   tags:      {version: v4, model: claude-haiku-4-5, max_tokens: 300}


def prompt(feature: str, version: str | None = None) -> tuple[str, str]:
    v = version or REGISTRY[feature]["version"]
    return (ROOT / feature / f"{v}.md").read_text(), v


def run(feature: str, user: str, schema=None, *, version: str | None = None, model: str | None = None):
    cfg = REGISTRY[feature]
    system, v = prompt(feature, version)
    model = model or cfg["model"]
    with tracer.start_as_current_span(f"chat {model}") as span:
        span.set_attribute("gen_ai.operation.name", "chat")
        span.set_attribute("gen_ai.system", "anthropic")
        span.set_attribute("gen_ai.request.model", model)
        span.set_attribute("gen_ai.request.max_tokens", cfg["max_tokens"])
        span.set_attribute("app.feature", feature)
        span.set_attribute("app.prompt_version", v)
        t0 = time.perf_counter()
        kwargs = dict(model=model, max_tokens=cfg["max_tokens"], system=system,
                      messages=[{"role": "user", "content": user}])
        resp = _client.messages.parse(**kwargs, output_format=schema) if schema else _client.messages.create(**kwargs)
        span.set_attribute("gen_ai.response.model", resp.model)
        span.set_attribute("gen_ai.response.finish_reasons", [resp.stop_reason])
        span.set_attribute("gen_ai.usage.input_tokens", resp.usage.input_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", resp.usage.output_tokens)
        span.set_attribute("app.cache_read_tokens", resp.usage.cache_read_input_tokens or 0)
        span.set_attribute("app.latency_ms", int((time.perf_counter() - t0) * 1000))
        if resp.stop_reason == "max_tokens":
            span.set_attribute("app.truncated", True)
        return resp.parsed_output if schema else "".join(b.text for b in resp.content if b.type == "text")
`,
    },
    {
      file: "evals/suites/summaries.py",
      patterns: ["eval-harness", "llm-judge"],
      note: md`One suite per feature, returning a **dict of metrics**. Critical metrics use **code graders** where possible (quote verification is exact), and a judge only for what code can't check (faithfulness of paraphrases). The suite accepts a version or model override, so CI can test the *candidate*.`,
      code: py`
import json
import re
from typing import Literal

from pydantic import BaseModel

import llm


class Claim(BaseModel):
    claim: str
    supported: Literal["yes", "no"]


class Faith(BaseModel):
    claims: list[Claim]


def quotes_verified(summary: str, article: str) -> bool:
    quotes = re.findall(r"[\"“]([^\"”]{12,})[\"”]", summary)
    norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()
    return all(norm(q) in norm(article) for q in quotes)


def run_suite(version: str | None = None, model: str | None = None, limit: int | None = None) -> dict:
    rows = [json.loads(l) for l in open("evals/data/summaries.jsonl")][:limit]
    ok_quotes = within_len = 0
    faith_scores = []
    for r in rows:
        s = llm.run("summaries", f"<article>{r['article']}</article>", version=version, model=model)
        ok_quotes += quotes_verified(s, r["article"])
        within_len += len(s.split()) <= 90
        f = llm.parse("List the factual claims in the summary and whether the article supports each.",
                      f"<article>{r['article']}</article>\n<summary>{s}</summary>", Faith, tier="smart")
        faith_scores.append(sum(c.supported == "yes" for c in f.claims) / max(len(f.claims), 1))
    n = len(rows)
    return {
        "summaries.quote_verified_rate": round(ok_quotes / n, 3),     # critical
        "summaries.faithfulness": round(sum(faith_scores) / n, 3),    # critical
        "summaries.length_ok_rate": round(within_len / n, 3),         # soft
    }
`,
    },
    {
      file: "evals/gate.py",
      patterns: ["prompt-ci"],
      note: md`The **CI gate**. It figures out which features a PR touches, runs only those suites, compares each metric with the baseline (minus a **tolerance** to absorb LLM noise), and returns a non-zero exit code on any critical regression. It writes a markdown report for the PR comment.`,
      code: py`
import importlib
import json
import subprocess
import sys
from pathlib import Path

CRITICAL = {"summaries.quote_verified_rate", "summaries.faithfulness", "tags.precision", "headlines.style_violations_inv"}
TOLERANCE = 0.02


def changed_features(base: str = "origin/main") -> set[str]:
    files = subprocess.run(["git", "diff", "--name-only", base], capture_output=True, text=True).stdout.split()
    feats = {f.split("/")[1] for f in files if f.startswith("prompts/") and f.count("/") >= 2}
    if any(f in ("llm.py", "prompts/registry.yaml") for f in files):
        feats |= {"summaries", "headlines", "tags"}            # gateway/registry change → run everything
    return feats


def main() -> int:
    report, failed, warned = ["| metric | baseline | candidate | status |", "|---|---|---|---|"], [], []
    for feat in sorted(changed_features()):
        current = importlib.import_module(f"evals.suites.{feat}").run_suite()
        baseline = json.loads(Path(f"evals/baselines/{feat}.json").read_text())
        for metric, value in current.items():
            base = baseline.get(metric)
            if base is None:
                status = "new"
            elif value < base - TOLERANCE:
                status = "❌ regression" if metric in CRITICAL else "⚠️ soft regression"
                (failed if metric in CRITICAL else warned).append(metric)
            else:
                status = "✅"
            report.append(f"| {metric} | {base} | {value} | {status} |")
    Path("eval_report.md").write_text("\n".join(report))
    print("\n".join(report))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
`,
    },
    {
      file: ".github/workflows/llm-evals.yml",
      lang: "yaml",
      note: md`CI runs the gate on PRs that touch prompts or the gateway. Secrets come from the repository's secret store. Large suites cost money, so run a fast subset on every push and the full suite before merge.`,
      code: txt`
name: llm-evals
on:
  pull_request:
    paths: ["prompts/**", "llm.py", "evals/**"]
jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: astral-sh/setup-uv@v6
      - run: uv sync
      - name: Run eval gate
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: uv run python -m evals.gate
      - name: Comment report on PR
        if: always()
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: eval_report.md
`,
    },
    {
      file: "shadow.py",
      patterns: ["observability"],
      note: md`**Shadow testing a model upgrade.** Mirror a small share of live requests to the candidate model *asynchronously*, never shown to users, store both outputs, and run the same suite metrics on the pairs. You get real-traffic evidence before you switch, and zero user risk.`,
      code: py`
import random
import threading

import llm

SHADOW = {"summaries": {"model": "claude-sonnet-5-5", "rate": 0.05}}


def run_with_shadow(feature: str, user: str, store, **kw):
    out = llm.run(feature, user, **kw)
    cfg = SHADOW.get(feature)
    if cfg and random.random() < cfg["rate"]:
        def shadow():
            try:
                cand = llm.run(feature, user, model=cfg["model"], **kw)
                store.save_pair(feature=feature, input=user, prod=out, candidate=cand, candidate_model=cfg["model"])
            except Exception:
                pass                                   # shadow failures never affect users
        threading.Thread(target=shadow, daemon=True).start()
    return out
`,
    },
  ],

  evaluate: md`
## Building the first baselines
- **Summaries:** 120 articles with editor-approved summaries. Critical: quote verification (code) ≥ 0.99, faithfulness (judge, calibrated on 40 editor labels) ≥ 0.95.
- **Tags:** 500 archive articles with editor-corrected tags. Critical: precision ≥ 0.9. Soft: recall.
- **Headlines:** 200 articles with a style-guide checker (code) and a pairwise judge vs the published headline.

## Re-running last month's incident
Re-run the "improved" summary prompt (v6 → v7) through the gate. Quote verification drops from 0.99 to 0.91, so the gate **blocks** it. That's the demo that sells the whole engagement to the client.

## Noise check
Run each suite 3× on the same version. If a metric moves more than the tolerance between identical runs, enlarge the dataset or widen the tolerance. Otherwise CI will flake and people will stop trusting it.
`,

  operate: md`
- **Eval cost in CI:** 120 summaries × (generation + judge) is a few dollars per run. Run the full suite only when the prompts for that feature change, and cache unchanged candidate outputs by (prompt hash, model, input hash).
- **Dashboards:** tokens and cost by feature and prompt version, p50/p95 latency, truncation rate, online faithfulness scores (sampled), error rate.
- **Alerts:** online faithfulness < threshold for 1 h; truncation > 1%; cost/day > budget.
- **PII:** article text is public, but if inputs are user data, sample and redact before storing outputs in traces.
- **Ownership:** each feature has an owner who approves baseline updates. Baselines only move with intent.
`,

  levelUp: md`
- **A company with 30 teams doing this?** A shared platform: [[proj:a04]].
- **Online evals, feedback and failure mining at scale?** [[proj:a07]].
- **Agents (multi-step traces) instead of single calls?** Trajectory-level tracing and evaluation: [[proj:a05]].
`,

  exercises: [
    "Write ~evals/suites/tags.py~ with precision, recall and per-tag F1, and set baselines.",
    "Reproduce the incident: write a v7 summary prompt that encourages 'vivid quotes' and watch the gate block it.",
    "Run a shadow comparison of two models on 100 inputs and write a one-paragraph recommendation with numbers.",
    "Add a cost metric to each suite (tokens × price) and make cost increases > 30% a soft regression.",
  ],

  interview: md`
> "Northstar had three LLM features with inline prompts and no visibility, and a prompt edit had started inventing quotes. I moved prompts into a versioned registry loaded through the gateway, added an OpenTelemetry span per call with GenAI semantic-convention attributes (model, prompt version, tokens, finish reason, latency), and built an eval suite per feature, using code graders like quote verification where possible and calibrated judges where not. A CI gate runs only the affected suites on PRs, compares them with baselines using noise-calibrated tolerances, blocks critical regressions and comments a report. Replaying the incident, the gate blocked the bad prompt. Model upgrades go through shadow traffic first."
`,
});
