project({
  id: "a05",
  level: "advanced",
  title: "On-call incident investigation agent",
  industry: "SaaS / DevOps",
  client: "Pulsewave: a B2B analytics SaaS with 400 microservices and a 30-person SRE organisation",
  time: "2 days of study",
  summary: "An agent that investigates alerts through read-only MCP servers (logs, metrics, deploys, runbooks), forms evidence-backed hypotheses, and proposes remediations that humans approve in Slack. Evaluated by replaying past incidents.",
  newConcepts: ["Tool permission tiers (read / propose / act)", "Investigation notebooks", "Approval flows in chat tools", "Trajectory evaluation", "Incident replay sandboxes", "Blast-radius limits"],
  patterns: ["agent-loop", "mcp-server", "tool-calling", "human-in-loop", "observability", "guardrails", "idempotency", "eval-harness"],
  skills: ["Agent design where errors are costly", "Evaluating agents on trajectories and outcomes", "Operational safety engineering"],

  brief: md`
> "When the pager goes off at 3am, the first 20 minutes are always the same: check dashboards, grep logs, look at what was deployed, find the runbook. Then someone decides to roll back or scale up. We want an agent that does those first 20 minutes and has a hypothesis ready when the human opens Slack, but it must not make things worse."
> (VP Engineering, Pulsewave)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Data sources? | Logs (search API), metrics (PromQL), traces, deploy history, feature flags, runbooks (Markdown), past incident reports | Each becomes an MCP server (some already exist from vendors) |
| What does the agent do first? | Investigate and summarise. Actions later | Start **read-only**; actions come as *proposals* |
| Which actions eventually? | Roll back a deploy, scale a deployment, toggle a feature flag, restart pods | Small, reversible, allowlisted |
| What must never happen? | Deleting data, changing prod config outside the allowlist, actions on multiple services at once, actions without a human | Permission tiers + approval + blast-radius limits |
| Time budget? | Hypothesis in Slack within 5 minutes of the alert | Parallel tool calls, step budget |
| History? | 18 months of incident reports with root cause and fix | **Replay eval set** |

**Success:** on replayed incidents, the correct root-cause area appears in the top 2 hypotheses ≥ 70% of the time; time-to-first-hypothesis < 5 min; **zero** unapproved or out-of-policy actions; on-call engineers rate summaries "useful" ≥ 80%.
`,

  frame: md`
**Shape:** *Decide + act* with an unknown path. Investigation genuinely can't be scripted: the next query depends on what the last one showed. This is where an **agent** belongs ([[f:complexity-ladder]] rung 6).

**Design around the cost of error:**
- **Three permission tiers.** ~read~ tools run freely. ~propose~ tools create a proposal object (no side effect). ~act~ tools are **not available to the agent at all**: they execute only when a human approves a proposal in Slack, via a separate service.
- **Evidence-backed hypotheses.** Every hypothesis cites tool results (query + output excerpt), recorded in an **investigation notebook**, so the human can check reasoning in seconds.
- **Blast-radius limits** in the action service (one service, one action at a time, only allowlisted actions, cooldowns), enforced in code no matter what was approved.

**MCP fits naturally** ([[proj:i03]]): logs and metrics vendors increasingly ship MCP servers, and internal systems (deploys, flags, runbooks) get thin MCP servers. The agent is an MCP client with a curated, read-only tool set.
`,

  design: md`
~~~text
 alert (PagerDuty webhook) ──▶ investigation service
                                 │
                                 ▼
          AGENT LOOP (budget: 25 steps, 6 min, $3)          read-only MCP servers
          ┌────────────────────────────────────────┐        ┌─────────────────────────┐
          │ plan → call tools (parallel) → observe │◀──────▶│ logs: search, count     │
          │ → update NOTEBOOK (facts + evidence)   │        │ metrics: query_range    │
          │ → hypotheses ranked with evidence      │        │ deploys: recent, diff   │
          │ → propose_action (no side effects)     │        │ flags: recent changes   │
          └────────────────┬───────────────────────┘        │ runbooks: search        │
                           │                                │ incidents: similar past │
                           ▼                                └─────────────────────────┘
       Slack: summary + hypotheses + evidence links + [Approve rollback] [Dismiss]
                           │ human clicks Approve (identity, reason)
                           ▼
       ACTION SERVICE (separate, not reachable by the agent):
       allowlist · blast-radius · cooldown · idempotency · dry-run · audit
                           │
                           ▼
          kubectl/deploy API ──▶ result posted back + agent verifies recovery (read tools)
~~~
`,

  tree: txt`
incident-agent/
├── mcp_servers/
│   ├── deploys_server.py      # thin read-only MCP server over the deploy API
│   └── runbooks_server.py
├── agent/
│   ├── notebook.py            # structured investigation state
│   ├── tools.py               # MCP clients + local propose_action tool
│   └── investigate.py         # bounded loop
├── actions/
│   ├── policy.py              # allowlist, blast radius, cooldowns
│   └── service.py             # executes approved proposals only
├── slack_app.py               # approval UI
└── evals/
    ├── replay/                # frozen tool outputs for past incidents
    └── replay_eval.py         # outcome + trajectory metrics
`,

  build: [
    {
      file: "mcp_servers/deploys_server.py",
      patterns: ["mcp-server"],
      note: md`A thin **read-only** MCP server over the deploy system. Tools return compact, investigation-friendly summaries, not raw API dumps. There are no write tools on this server, by design.`,
      code: py`
from mcp.server.fastmcp import FastMCP

import deploy_api

mcp = FastMCP("deploys-readonly")


@mcp.tool()
def recent_deploys(service: str | None = None, hours: int = 6) -> list[dict]:
    """Deploys in the last N hours (max 48), newest first: service, version, author, time, status, change summary."""
    rows = deploy_api.list(service=service, since_hours=min(hours, 48))
    return [{"service": r.service, "version": r.version, "prev_version": r.prev_version, "at": r.finished_at,
             "author": r.author, "status": r.status, "summary": r.title[:200]} for r in rows[:30]]


@mcp.tool()
def deploy_diff(service: str, version: str) -> dict:
    """Files changed and config changes in a deploy (truncated); use to connect a deploy to an error."""
    d = deploy_api.diff(service, version)
    return {"files": d.files[:50], "config_changes": d.config_changes[:20], "migrations": d.migrations}


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
`,
    },
    {
      file: "agent/notebook.py",
      patterns: ["structured-output"],
      note: md`The **investigation notebook** is the agent's working memory *and* the human's view. Facts carry evidence (which tool, which query, an excerpt). Hypotheses reference facts. This structure is what makes an agent's reasoning reviewable in 30 seconds at 3am.`,
      code: py`
from typing import Literal

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    tool: str
    query: str
    excerpt: str = Field(description="Short excerpt of the tool output that matters")


class Fact(BaseModel):
    id: str
    statement: str
    evidence: list[Evidence]


class Hypothesis(BaseModel):
    title: str
    supporting_fact_ids: list[str]
    contradicting_fact_ids: list[str] = []
    confidence: Literal["low", "medium", "high"]
    next_check: str = Field(description="The single most useful check to confirm or reject it")


class ProposedAction(BaseModel):
    action: Literal["rollback_deploy", "scale_deployment", "disable_feature_flag", "restart_pods"]
    service: str
    params: dict
    rationale: str
    expected_effect: str
    rollback_plan: str


class Notebook(BaseModel):
    alert_summary: str
    facts: list[Fact] = []
    hypotheses: list[Hypothesis] = []
    proposals: list[ProposedAction] = []
`,
    },
    {
      file: "agent/investigate.py",
      patterns: ["agent-loop", "tool-calling", "observability"],
      note: md`The **bounded agent loop**. It has read tools (from MCP servers), a ~record_fact~ tool to write to the notebook, and a ~propose_action~ tool that only *appends a proposal*. There are no act tools. The step, time and cost budgets end the loop with whatever the notebook holds: a partial investigation is still useful to the human.`,
      code: py`
import json
import time

import anthropic

from agent.notebook import Fact, Hypothesis, Notebook, ProposedAction

client = anthropic.Anthropic()
MODEL = "claude-opus-5-5"
LIMITS = {"steps": 25, "seconds": 360, "usd": 3.0}

SYSTEM = """You are an SRE investigation agent. Goal: find the most likely cause of the alert, fast.
Method: check recent deploys and flag changes first; compare error rates before/after; look for the first
error in logs; check dependencies. Run independent queries in parallel.
Record every important observation with record_fact (with evidence). Keep 1-3 ranked hypotheses updated
with set_hypotheses. You CANNOT change anything. If a remediation is clearly indicated, call propose_action
once; a human will review it. Never propose actions on more than one service."""

LOCAL_TOOLS = [
    {"name": "record_fact", "description": "Add a fact with evidence to the investigation notebook.",
     "input_schema": Fact.model_json_schema()},
    {"name": "set_hypotheses", "description": "Replace the ranked hypotheses list (max 3).",
     "input_schema": {"type": "object", "properties": {"hypotheses": {"type": "array", "items": Hypothesis.model_json_schema(), "maxItems": 3}},
                      "required": ["hypotheses"]}},
    {"name": "propose_action", "description": "Propose ONE remediation for human approval. No side effects.",
     "input_schema": ProposedAction.model_json_schema()},
]


def investigate(alert: dict, mcp_tools: dict, cost_of) -> Notebook:
    nb = Notebook(alert_summary=f"{alert['title']} on {alert['service']} at {alert['started_at']}")
    tools = [t.schema for t in mcp_tools.values()] + LOCAL_TOOLS
    messages = [{"role": "user", "content": f"<alert>{json.dumps(alert)}</alert>"}]
    t0, spent = time.time(), 0.0
    for step in range(LIMITS["steps"]):
        if time.time() - t0 > LIMITS["seconds"] or spent > LIMITS["usd"]:
            break
        resp = client.messages.create(model=MODEL, max_tokens=4096, system=SYSTEM, tools=tools, messages=messages,
                                      output_config={"effort": "medium"})
        spent += cost_of(MODEL, resp.usage)
        messages.append({"role": "assistant", "content": resp.content})
        calls = [b for b in resp.content if b.type == "tool_use"]
        if resp.stop_reason != "tool_use" or not calls:
            break
        results = []
        for c in calls:
            try:
                if c.name == "record_fact":
                    nb.facts.append(Fact(**c.input)); out = {"ok": True, "fact_count": len(nb.facts)}
                elif c.name == "set_hypotheses":
                    nb.hypotheses = [Hypothesis(**h) for h in c.input["hypotheses"]][:3]; out = {"ok": True}
                elif c.name == "propose_action":
                    if nb.proposals:
                        out = {"error": "Only one proposal per investigation."}
                    else:
                        nb.proposals.append(ProposedAction(**c.input)); out = {"ok": True, "status": "awaiting human"}
                elif c.name in mcp_tools:
                    out = mcp_tools[c.name].call(c.input)              # read-only by construction
                else:
                    out = {"error": "unknown tool"}
            except Exception as e:
                out = {"error": f"{type(e).__name__}: {str(e)[:200]}"}
            results.append({"type": "tool_result", "tool_use_id": c.id, "content": json.dumps(out, default=str)[:20000]})
        messages.append({"role": "user", "content": results})
    return nb
`,
    },
    {
      file: "actions/policy.py",
      patterns: ["guardrails", "idempotency"],
      note: md`**The action service's policy is the real safety boundary**, separate from the agent and enforced in code even after human approval. Humans click "approve" at 3am, so the system still refuses anything outside the allowlist, anything on a protected service, or a second action within the cooldown.`,
      code: py`
import time

ALLOWED = {
    "rollback_deploy": {"max_versions_back": 1},
    "scale_deployment": {"max_factor": 2.0, "max_replicas": 60},
    "disable_feature_flag": {},
    "restart_pods": {"max_pods": 10},
}
PROTECTED_SERVICES = {"billing-ledger", "auth-core", "postgres-primary"}
COOLDOWN_S = 600
_last_action: dict[str, float] = {}


def check(proposal, approver, current_state) -> list[str]:
    errs = []
    if proposal.action not in ALLOWED:
        errs.append("action not allowlisted")
    if proposal.service in PROTECTED_SERVICES:
        errs.append("protected service: requires manual runbook")
    if not approver.on_call_for(proposal.service):
        errs.append("approver is not on call for this service")
    if time.time() - _last_action.get(proposal.service, 0) < COOLDOWN_S:
        errs.append("cooldown active: one automated action per service per 10 min")
    if proposal.action == "scale_deployment":
        target = proposal.params.get("replicas", 0)
        if target > ALLOWED["scale_deployment"]["max_replicas"] or target > current_state.replicas * ALLOWED["scale_deployment"]["max_factor"]:
            errs.append("scale target exceeds blast-radius limit")
    if proposal.action == "rollback_deploy" and proposal.params.get("to_version") != current_state.prev_version:
        errs.append("rollback only to the immediately previous version")
    return errs


def execute(proposal, approver, current_state, executor, audit) -> dict:
    errs = check(proposal, approver, current_state)
    key = f"{proposal.service}:{proposal.action}:{proposal.params}"
    if errs:
        audit.write(proposal=proposal, approver=approver.id, result="refused", reasons=errs)
        return {"refused": errs}
    result = executor.run(proposal, idempotency_key=key, dry_run_first=True)
    _last_action[proposal.service] = time.time()
    audit.write(proposal=proposal, approver=approver.id, result=result)
    return result
`,
    },
    {
      file: "evals/replay_eval.py",
      patterns: ["eval-harness"],
      note: md`**Replay evaluation.** For 60 past incidents, freeze the tool outputs (logs, metrics, deploys) as they were at alert time, and serve them from fake MCP servers. Run the agent and grade the **outcome** (is the true root-cause area in the top 2 hypotheses? was the right action proposed?) and the **trajectory** (steps, time, cost, any forbidden proposals).`,
      code: py`
from typing import Literal

from pydantic import BaseModel

import llm


class RootCauseMatch(BaseModel):
    rank_of_correct: Literal[1, 2, 3, 0]          # 0 = not among hypotheses
    reasoning: str


def grade(nb, incident) -> dict:
    hyps = "\n".join(f"{i+1}. {h.title}" for i, h in enumerate(nb.hypotheses))
    m = llm.parse("Does any hypothesis identify the same root cause area as the post-mortem? "
                  "Same area = same failing component and mechanism, even if worded differently.",
                  f"<postmortem_root_cause>{incident['root_cause']}</postmortem_root_cause>\n<hypotheses>\n{hyps}\n</hypotheses>",
                  RootCauseMatch)
    proposal = nb.proposals[0] if nb.proposals else None
    return {
        "id": incident["id"],
        "top2": m.rank_of_correct in (1, 2),
        "action_match": bool(proposal and proposal.action == incident.get("fix_action")),
        "unsafe_proposal": bool(proposal and proposal.service in incident.get("must_not_touch", [])),
        "facts_with_evidence": sum(bool(f.evidence) for f in nb.facts) / max(len(nb.facts), 1),
    }


def run(incidents, run_agent_on_frozen):
    rows = []
    for inc in incidents:
        nb, traj = run_agent_on_frozen(inc)          # traj: steps, seconds, usd
        rows.append({**grade(nb, inc), **traj})
    n = len(rows)
    print({"top2_root_cause": sum(r["top2"] for r in rows) / n,
           "action_match": sum(r["action_match"] for r in rows) / n,
           "unsafe_proposals": sum(r["unsafe_proposal"] for r in rows),
           "median_seconds": sorted(r["seconds"] for r in rows)[n // 2],
           "median_usd": sorted(r["usd"] for r in rows)[n // 2]})
`,
    },
  ],

  evaluate: md`
| Metric | Target | Why |
|---|---|---|
| Root cause in top 2 (replay) | ≥ 70% | The core usefulness metric |
| Correct action proposed (when one existed) | ≥ 60% | Proposals that would have helped |
| **Unsafe proposals** | 0 | E.g. touching a service the post-mortem says must not be touched |
| Facts with evidence | 100% | Reviewability |
| Time to first hypothesis | < 5 min median | From the brief |
| Cost per investigation | < $3 median | Budget sanity |
| **Live shadow mode** (first month) | Agent runs on real alerts, humans see output but don't act on it | Measure usefulness ratings before enabling proposals |

> **Grade trajectories, not just answers.** Two agents can reach the same hypothesis, one in 6 steps and one in 24 steps while issuing a dangerous-looking query. Track tool-call patterns and add trajectory checks (e.g. "never queried the protected DB directly").
`,

  operate: md`
- **Rollout:** shadow mode (summaries only) → proposals enabled for 3 low-risk services → wider, based on approval and success rates.
- **Approval UX:** Slack message with the hypothesis, the top 3 evidence excerpts, the exact action, expected effect and rollback plan. One click to approve, and it requires the approver's identity.
- **Post-action verification:** after an approved action, the agent re-runs the key metric queries and posts "error rate back to baseline" or "no improvement: consider rollback of the action".
- **Observability:** every investigation is a trace; every tool call is a span with query and size. On-call ratings feed the flywheel ([[proj:a07]]).
- **Security:** MCP servers authenticate the agent as a service identity with **read-only** credentials; the action service uses separate credentials the agent never has.
`,

  levelUp: md`
- **Agents reading untrusted content (customer tickets, external status pages)?** Injection defences: [[proj:a06]].
- **Many agents across the company sharing tool registries and policies?** [[proj:a04]].
- **Learning from every incident automatically?** New post-mortems become replay cases: [[p:feedback-flywheel]].
`,

  exercises: [
    "Freeze the tool outputs for one incident you know well (or invent a realistic one) and build the replay harness for it.",
    "Add a trajectory check: fail the eval if the agent issued more than 5 log searches with near-identical queries.",
    "Write the Slack approval message template. Have someone unfamiliar with the incident decide from it alone in 60 seconds.",
    "Extend ~actions/policy.py~ with a 'canary first' rule for rollbacks: roll back one region, verify, then the rest.",
  ],

  interview: md`
> "Pulsewave wanted the first 20 minutes of incident response automated without making things worse. The agent is an MCP client over read-only servers for logs, metrics, deploys, flags and runbooks, running a bounded loop with step, time and dollar budgets. It writes an investigation notebook of facts with tool evidence and ranked hypotheses, and can only *propose* one remediation: the agent has no act tools at all. A separate action service executes approved proposals and enforces an allowlist, protected services, blast-radius limits, cooldowns, the approver's on-call status and idempotency, even after a human clicks approve. I evaluated by replaying 60 past incidents with frozen tool outputs, grading root cause in the top 2, action match, zero unsafe proposals and trajectory cost, then rolled out through shadow mode first."
`,
});
