project({
  id: "a04",
  level: "advanced",
  title: "Company-wide LLM platform (the gateway grows up)",
  industry: "Banking",
  client: "Crestline Bank: 9,000 employees; 30 teams want to build LLM features",
  time: "2–3 days of study",
  summary: "Turn the per-project gateway into a shared internal platform: authentication, policy, PII controls, routing, budgets, fallbacks, caching, audit, an eval registry and a paved-road SDK.",
  newConcepts: ["Platform vs product thinking", "Policy-as-config", "Per-team budgets and chargeback", "Central audit and model risk management", "Paved-road SDKs", "Build vs buy for gateways"],
  patterns: ["llm-gateway", "guardrails", "caching", "model-cascade", "observability", "prompt-ci", "eval-harness", "fake-model"],
  skills: ["Platform architecture", "Governance in regulated enterprises", "Designing for many internal customers", "Cost attribution"],

  brief: md`
> "Thirty teams want to use LLMs: fraud ops, wealth advisors, call-center QA, developers, compliance. Each is signing its own vendor contracts, pasting customer data who-knows-where, and nobody can tell me what we spend or what the models are doing. Risk and compliance are about to ban everything. Give us one safe, fast way to build."
> (CTO, Crestline Bank)
`,

  discovery: md`
| Stakeholder | Needs | Platform feature |
|---|---|---|
| Product teams | Fast access, good defaults, no paperwork per experiment | Self-service onboarding, SDK, sandbox keys |
| Security | No secrets or credentials in prompts; vendor and data controls | Central egress, key management, DLP checks |
| Privacy | PII handled per policy (masking, retention) | Per-use-case data classification + redaction policies |
| Model risk management (MRM) | Inventory of every model use, evaluation evidence, monitoring | Use-case registry, eval registry, audit logs |
| Finance | Spend by team, forecasts, limits | Metering, budgets, chargeback |
| SRE | Reliability: provider outages shouldn't take down features | Retries, fallbacks across regions/providers, quotas |
| Compliance | Records of AI-assisted customer communications | Retention + audit of inputs/outputs per policy |

**Success:** onboarding a new use case in < 1 day; 100% of LLM traffic through the platform; spend visible per team daily; zero high-severity data incidents; provider outages cause degraded features, not failures.
`,

  frame: md`
This is the [[p:llm-gateway]] from [[proj:b01]], grown into a **platform**: same idea, many more stakeholders. Platform engineering has its own rules:

1. **Paved road, not a toll booth.** If the platform is slower or harder than calling a vendor directly, teams will route around it. Make the safe path the easy path (SDK, defaults, docs, sandbox).
2. **Policy as configuration.** Each *use case* (not each team) registers with a data classification and gets a policy: allowed models, PII handling, retention, budget, and whether outputs go to customers.
3. **Thin core, pluggable steps.** The request path is a pipeline of middleware (auth → policy → redaction → cache → route → call → filter → meter → audit). Each is small and testable.
4. **Pass-through of provider power.** Don't hide tools, structured outputs, caching or batch behind a lowest-common-denominator API. Teams need them.

**Build vs buy:** open-source and commercial LLM gateways exist (and cloud providers offer gateway features). A bank usually **buys or adopts the proxy core** and **builds the policy, registry and governance layer**, which is specific to the bank. Say this in the design doc.
`,

  design: md`
~~~text
  team app ──(paved-road SDK: crestline_llm)──▶  LLM PLATFORM (internal, HA, multi-region)
                                                ┌──────────────────────────────────────────────┐
                                                │ 1 authN: workload identity / service token   │
                                                │ 2 use-case lookup → policy (YAML in git)     │
                                                │ 3 budget check (team + use case)             │
                                                │ 4 input controls: PII redaction/tokenisation,│
                                                │   secrets scan, size limits                  │
                                                │ 5 response cache (opt-in, deterministic)     │
                                                │ 6 route: policy model + fallbacks            │
                                                │ 7 provider call (pass-through features)      │
                                                │ 8 output controls (per policy)               │
                                                │ 9 meter tokens/cost → ledger                 │
                                                │10 audit record (per retention policy)        │
                                                └───────────┬──────────────────────────────────┘
                                                            ▼
                         providers / regions (primary, secondary), via private networking
  side systems: use-case registry (MRM inventory) · eval registry (CI results per use case) ·
                cost dashboards · trace store · policy repo with code review
~~~
`,

  tree: txt`
llm-platform/
├── policies/                 # one YAML per use case, reviewed by risk + privacy
│   └── wealth-advisor-notes.yaml
├── service/
│   ├── app.py                # FastAPI: /v1/messages (provider-compatible shape)
│   ├── pipeline.py           # middleware chain
│   ├── steps/                # auth, policy, budget, redact, cache, route, call, filter, meter, audit
│   └── ledger.py             # budgets + chargeback
├── sdk/crestline_llm/        # paved-road client for teams
└── registry/                 # use cases, owners, eval evidence, risk tier
`,

  build: [
    {
      file: "policies/wealth-advisor-notes.yaml",
      lang: "yaml",
      patterns: ["guardrails"],
      note: md`**Policy as config, per use case.** Risk and privacy review a YAML file in a pull request, not a 40-page questionnaire. The platform enforces exactly what's written. The ~risk_tier~ drives MRM requirements, for example "tier 2 needs an eval suite registered before production".`,
      code: txt`
use_case: wealth-advisor-notes
owner: team-wealth-tech
description: Summarise advisor-client meeting notes into CRM entries (advisor reviews before saving).
risk_tier: 2                       # 1 low … 3 high (customer-facing decisions)
data_classification: confidential-customer
customer_facing_output: false
models:
  primary: claude-opus-5-5
  fallbacks: [claude-sonnet-5-5]
  allow_tools: false
input_controls:
  pii: tokenize                    # names, account numbers → reversible tokens; restored on output
  block_patterns: [credentials, card_numbers]
  max_input_tokens: 60000
output_controls:
  detokenize: true
  block_patterns: [card_numbers]
cache: { response_cache: false, prompt_cache: true }
budget: { monthly_usd: 4000, alert_at: 0.8, hard_stop: false }
retention: { audit_inputs: hashed, audit_outputs: 90d }
evals:
  required_before_prod: true
  suite: evals/wealth-notes          # registered; CI results attached to the use case
`,
    },
    {
      file: "service/pipeline.py",
      patterns: ["llm-gateway"],
      note: md`A **middleware pipeline**: each step can enrich the request context, short-circuit (deny, cache hit), or post-process the response. New controls are new steps, and the core never changes.`,
      code: py`
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Ctx:
    caller: str
    use_case: str
    request: dict
    policy: dict = field(default_factory=dict)
    token_map: dict = field(default_factory=dict)   # PII tokens → originals (never logged)
    response: Any = None
    cost_usd: float = 0.0
    events: list[str] = field(default_factory=list)


class Deny(Exception):
    def __init__(self, status: int, reason: str):
        self.status, self.reason = status, reason


Step = Callable[[Ctx, Callable[[Ctx], Ctx]], Ctx]


def build(steps: list[Step]) -> Callable[[Ctx], Ctx]:
    def terminal(ctx: Ctx) -> Ctx:
        return ctx
    handler = terminal
    for step in reversed(steps):
        handler = (lambda s, nxt: (lambda c: s(c, nxt)))(step, handler)
    return handler

# PIPELINE = build([authn, load_policy, check_budget, input_controls, response_cache,
#                   route_and_call, output_controls, meter, audit])
`,
    },
    {
      file: "service/steps/input_controls.py",
      patterns: ["guardrails"],
      note: md`**Reversible tokenisation**: the model sees ~<PERSON_1>~ and ~<ACCT_1>~ instead of real names and account numbers, and the platform restores them in the output. The model provider never receives the identifiers, and the use case still works. (Real deployments use a PII-detection service. The regexes here are placeholders.)`,
      code: py`
import re

from service.pipeline import Ctx, Deny

ACCOUNT = re.compile(r"\b\d{10,12}\b")
CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
SECRET = re.compile(r"(?i)(api[_-]?key|password|secret)\s*[:=]\s*\S+")


def tokenize(text: str, ctx: Ctx, detector) -> str:
    for kind, value in detector.entities(text):            # e.g. a PII detection service → [("PERSON", "Ana Ruiz"), ...]
        tok = f"<{kind}_{len(ctx.token_map) + 1}>"
        ctx.token_map.setdefault(value, tok)
    for value, tok in ctx.token_map.items():
        text = text.replace(value, tok)
    return ACCOUNT.sub(lambda m: ctx.token_map.setdefault(m.group(0), f"<ACCT_{len(ctx.token_map) + 1}>"), text)


def input_controls(ctx: Ctx, nxt):
    pol = ctx.policy["input_controls"]
    for msg in ctx.request["messages"]:
        if isinstance(msg["content"], str):
            if "card_numbers" in pol.get("block_patterns", []) and CARD.search(msg["content"]):
                raise Deny(422, "Card numbers are not allowed for this use case")
            if "credentials" in pol.get("block_patterns", []) and SECRET.search(msg["content"]):
                raise Deny(422, "Credentials detected in input")
            if pol.get("pii") == "tokenize":
                msg["content"] = tokenize(msg["content"], ctx, DETECTOR)
    ctx.events.append(f"pii_tokens={len(ctx.token_map)}")
    return nxt(ctx)
`,
    },
    {
      file: "service/steps/route_and_call.py",
      patterns: ["model-cascade", "caching"],
      note: md`Routing honours the policy's model list. **Two kinds of fallback:** the provider's *server-side* refusal fallback (opt-in parameter, so a policy decline on one model is retried on another inside the same call), and *client-side* fallback on outages or rate limits to the next allowed model or region. Provider features (tools, structured output, cache control) pass through untouched.`,
      code: py`
import anthropic

from service.pipeline import Ctx, Deny

CLIENTS = {"primary": anthropic.Anthropic(base_url=PRIMARY_REGION_URL),
           "secondary": anthropic.Anthropic(base_url=SECONDARY_REGION_URL)}
PASS_THROUGH = {"system", "messages", "tools", "tool_choice", "output_config", "max_tokens", "cache_control", "metadata"}


def route_and_call(ctx: Ctx, nxt):
    models = [ctx.policy["models"]["primary"], *ctx.policy["models"].get("fallbacks", [])]
    requested = ctx.request.get("model")
    if requested and requested not in models:
        raise Deny(403, f"Model {requested} not allowed for {ctx.use_case}")
    if ctx.request.get("tools") and not ctx.policy["models"].get("allow_tools"):
        raise Deny(403, "Tools not enabled for this use case")
    body = {k: v for k, v in ctx.request.items() if k in PASS_THROUGH}

    last_error = None
    for region in ("primary", "secondary"):
        for model in ([requested] if requested else models):
            try:
                ctx.response = CLIENTS[region].beta.messages.create(
                    model=model, **body,
                    betas=["server-side-fallback-2026-07-01"], fallbacks="default",   # refusal → re-run server-side
                )
                ctx.events.append(f"served_by={model}@{region}")
                return nxt(ctx)
            except (anthropic.RateLimitError, anthropic.InternalServerError, anthropic.APIConnectionError) as e:
                last_error = e
                ctx.events.append(f"fallback_from={model}@{region}:{type(e).__name__}")
    raise Deny(503, f"All routes failed: {type(last_error).__name__}")
`,
    },
    {
      file: "service/ledger.py",
      note: md`**Metering and budgets.** Every response's usage becomes a ledger row (team, use case, model, tokens, cache reads, cost). Budgets are checked *before* the call. Hard stops are opt-in per policy, because cutting off a production feature at month-end can be worse than overspending. That's a business decision, so it lives in the policy.`,
      code: py`
from datetime import date

PRICE = {"claude-opus-5-5": {"in": 4.0, "out": 20.0, "cache_read": 0.20},
         "claude-sonnet-5-5": {"in": 2.0, "out": 10.0, "cache_read": 0.20},
         "claude-haiku-4-5": {"in": 1.0, "out": 5.0, "cache_read": 0.10}}       # $/MTok, from config


def cost_of(model: str, usage) -> float:
    p = PRICE[model]
    cached = usage.cache_read_input_tokens or 0
    return (usage.input_tokens * p["in"] + usage.output_tokens * p["out"] + cached * p["cache_read"]) / 1e6


def check_budget(ctx, nxt):
    b = ctx.policy["budget"]
    spent = LEDGER.month_to_date(ctx.use_case, date.today())
    if spent >= b["monthly_usd"] and b.get("hard_stop"):
        from service.pipeline import Deny
        raise Deny(429, "Monthly budget exhausted for this use case")
    if spent >= b["monthly_usd"] * b.get("alert_at", 0.8):
        ALERTS.notify_once(ctx.use_case, f"Budget {spent:.0f}/{b['monthly_usd']} USD")
    return nxt(ctx)


def meter(ctx, nxt):
    model = ctx.response.model
    ctx.cost_usd = cost_of(model, ctx.response.usage)
    LEDGER.insert(team=ctx.policy["owner"], use_case=ctx.use_case, caller=ctx.caller, model=model,
                  input_tokens=ctx.response.usage.input_tokens, output_tokens=ctx.response.usage.output_tokens,
                  cache_read=ctx.response.usage.cache_read_input_tokens or 0, cost_usd=ctx.cost_usd)
    return nxt(ctx)
`,
    },
    {
      file: "sdk/crestline_llm/__init__.py",
      patterns: ["fake-model"],
      note: md`**The paved road.** Teams write ~crestline_llm.parse(...)~ with their use-case id, and get auth, retries, tracing headers, typed output and a built-in **fake mode for tests**. A good SDK is the platform's best adoption tool.`,
      code: py`
import os

import anthropic
from pydantic import BaseModel

_PLATFORM_URL = os.environ.get("CRESTLINE_LLM_URL", "https://llm.internal.crestline.example")
_FAKE = os.environ.get("CRESTLINE_LLM_FAKE") == "1"


class Client:
    def __init__(self, use_case: str):
        self.use_case = use_case
        # The platform speaks the provider's wire format, so the official SDK works as a client
        self._c = anthropic.Anthropic(base_url=_PLATFORM_URL, api_key=workload_token(),
                                      default_headers={"x-use-case": use_case})

    def parse(self, system: str, user: str, schema: type[BaseModel], **kw) -> BaseModel:
        if _FAKE:
            return schema.model_construct()             # deterministic stub for unit tests
        resp = self._c.messages.parse(model=kw.get("model", "claude-opus-5-5"), max_tokens=kw.get("max_tokens", 2048),
                                      system=system, messages=[{"role": "user", "content": user}], output_format=schema)
        return resp.parsed_output

# usage in a team's service:
#   llm = crestline_llm.Client("wealth-advisor-notes")
#   entry = llm.parse(SYSTEM, notes, CrmEntry)
`,
    },
  ],

  evaluate: md`
A platform is evaluated differently from a feature: **adoption, safety, reliability and cost transparency**.

| Area | Metric | Target |
|---|---|---|
| Adoption | % of LLM traffic through the platform (egress monitoring catches direct vendor calls) | 100% within 6 months |
| Speed | Time from use-case request to sandbox access / to production | < 1 day / < 3 weeks |
| Safety | PII tokens per request on confidential use cases; blocked-pattern hits; incidents | 0 high-severity incidents |
| Reliability | Platform availability; % of requests served via fallback during provider incidents | 99.9%; graceful degradation |
| Overhead | Added p50/p95 latency vs direct calls | < 30 ms / < 100 ms |
| Governance | % of tier-2/3 use cases with registered, passing eval suites | 100% before production |
| Cost | Spend attributed to a team and use case | 100% |

**Test the controls like code:** unit tests per middleware step, a red-team suite (PII smuggling, card numbers in base64, secrets in tool results), and chaos tests (primary region down).
`,

  operate: md`
- **On-call and SLOs** like any tier-1 internal service, with runbooks for provider outages, budget exhaustion and policy misconfiguration.
- **Change management:** policies change via PRs with risk/privacy approvers (code owners). Model additions require an MRM review and evaluation evidence.
- **Cost reviews:** monthly per-team reports with optimisation suggestions (caching hit rates, batch-eligible traffic, output-length outliers).
- **Audit:** records per retention policy, queryable by use case, time and caller for regulators and internal audit.
- **Platform team KPIs:** adoption, time-to-production and satisfaction of internal teams, not just uptime.
`,

  levelUp: md`
- **Agents with tools across bank systems?** The platform adds tool registries (approved MCP servers), per-tool permissions with user delegation, and action audit: [[proj:a05]], [[proj:a06]].
- **Platform-wide quality monitoring and flywheel?** [[proj:a07]].
- **Deciding which use cases deserve investment in the first place?** [[proj:a08]].
`,

  exercises: [
    "Write the ~output_controls~ step: detokenise PII in text blocks and block card numbers. What about tool-use blocks and streaming responses?",
    "Design streaming support through the pipeline: which steps must operate on the full response, and how do you handle them while streaming?",
    "Write the one-page build-vs-buy recommendation, comparing an open-source proxy + custom policy layer against a fully custom build.",
    "Simulate a primary-region outage in tests and verify requests are served from the secondary region with an event recorded.",
  ],

  interview: md`
> "Crestline had 30 teams heading for 30 vendor contracts while risk was preparing to ban everything, so I designed a paved-road LLM platform. Every use case registers a YAML policy reviewed by risk and privacy: allowed models, PII handling, retention, budget and risk tier. The request path is a middleware pipeline with authentication, policy, budget checks, reversible PII tokenisation, provider-compatible pass-through, server-side refusal fallback plus client-side region and model fallback, metering into a cost ledger, and audit. Teams use a thin SDK with a fake mode for tests, and tier-2+ use cases need a registered eval suite before production. I recommended adopting an existing proxy core and building the bank-specific policy and governance layer, and success is measured by adoption, time-to-production, safety incidents and added latency."
`,
});
