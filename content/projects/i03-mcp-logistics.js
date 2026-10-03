project({
  id: "i03",
  level: "intermediate",
  title: "Exposing a logistics platform through MCP",
  industry: "Logistics / 3PL",
  client: "Meridian Freight: a third-party logistics provider shipping for 700 business customers",
  time: "5–7 hours",
  summary: "Build an MCP server for shipment tracking used by internal agents, customers' AI assistants and Claude Desktop, and compare it with plain function calling.",
  newConcepts: ["MCP server: tools, resources, prompts", "stdio vs Streamable HTTP transports", "Task-level tool design", "Tenant scoping in the server", "Consuming MCP from your own agent"],
  patterns: ["mcp-server", "tool-calling", "guardrails", "agent-loop", "observability"],
  skills: ["Explaining API vs function calling vs MCP", "Designing tools for models, not for REST purists", "Securing an AI-facing API surface"],

  brief: md`
> "Our biggest customers are building AI assistants internally and they all ask the same thing: 'how do we let our assistant check our shipments with you?' Meanwhile our own ops team wants an assistant that finds delayed shipments. And our account managers use Claude Desktop. We don't want to build three integrations."
> (CTO, Meridian Freight)
`,

  discovery: md`
| Question | Answer | Impact |
|---|---|---|
| Who are the consumers? | (1) internal ops agent, (2) customers' AI apps (various vendors), (3) staff using desktop AI apps | Several AI clients → a **standard protocol** beats bespoke integrations |
| What existing API? | A REST API with 60 endpoints (shipments, scans, exceptions, documents, rates) | Don't map 60 endpoints to 60 tools |
| Most common questions? | "Where is X?", "Which of my shipments are late?", "What happened to X?", "Can you redeliver?" | 4–6 **task-level** tools |
| Data isolation? | Customer A must never see customer B's shipments | Tenant scoping **inside the server**, from the auth token |
| Write actions? | Redelivery requests, and later claims | Explicit confirmation step; audit log |
| Hosting? | Internal staff locally; customers remotely over the internet | stdio **and** Streamable HTTP with auth |

**Success:** two customers integrated in < 1 day each using their own AI stacks; zero cross-tenant data exposure in the security review; the ops agent answers "what's late today" correctly on a 50-question eval.
`,

  frame: md`
Read [[c:api-vs-mcp]] first. The decision here:

| Option | Fits? |
|---|---|
| Just the REST API | Customers' AI teams would each write wrappers and tool descriptions, with inconsistent quality and N integrations |
| Function calling inside *our* agent only | Solves the internal use case, but not customers or desktop apps |
| **MCP server** | Write it once, and any MCP client can discover and use it. Our internal agent becomes just another client |

**Tool design matters more than protocol.** A model with 60 thin endpoint tools (~GET /shipments/{id}/scans~…) makes many calls and gets confused. Design tools around **user tasks**: ~track_shipment~ returns status, last scan, ETA, exceptions and the next action in one call.

**Security is server-side.** The model, and the client app, are untrusted. The server derives the tenant from the auth token and filters every query by it. No tool takes a ~customer_id~ argument.
`,

  design: md`
~~~text
                ┌───────────────── MCP clients (hosts) ─────────────────┐
                │ Ops agent (ours)   Customer AI apps   Desktop AI apps  │
                └──────┬───────────────────┬──────────────────┬────────┘
                       │ Streamable HTTP   │ Streamable HTTP  │ stdio (local) or HTTP
                       │ + OAuth/token     │ + OAuth/token    │
                       ▼                   ▼                  ▼
               ┌───────────────────────────────────────────────────────┐
               │              meridian-mcp (one server)                │
               │  auth → tenant_id   rate limit   audit log   tracing  │
               │  TOOLS:     track_shipment  find_shipments            │
               │             delivery_exceptions  request_redelivery   │
               │  RESOURCES: shipment://{id}/timeline                  │
               │  PROMPTS:   daily-exceptions-report                   │
               └───────────────────────────┬───────────────────────────┘
                                           │ (tenant-scoped calls)
                                           ▼
                                 existing REST API / database
~~~
`,

  tree: txt`
meridian-mcp/
├── server.py          # FastMCP server: tools, resources, prompts
├── backend.py         # tenant-scoped wrapper over the REST API
├── auth.py            # token → tenant (remote transport)
├── http_app.py        # Streamable HTTP app with auth middleware
├── clients/
│   ├── ops_agent.py         # our agent, consuming the server via MCP
│   └── connector_example.py # API-side MCP connector to the remote server
└── evals/ops_questions.jsonl
`,

  build: [
    {
      file: "backend.py",
      note: md`A thin, **tenant-scoped** layer over the existing API. Every method takes the tenant from the request context, never from tool arguments. This is where isolation is enforced.`,
      code: py`
from contextvars import ContextVar
from dataclasses import dataclass

import httpx

current_tenant: ContextVar[str] = ContextVar("current_tenant")
API = httpx.Client(base_url="https://api.internal.meridian.example", timeout=10)


@dataclass
class Shipment:
    id: str
    status: str
    origin: str
    destination: str
    eta: str | None
    last_scan: str
    exceptions: list[str]


def _get(path: str, **params) -> dict:
    tenant = current_tenant.get()                          # raises if unset: fail closed
    r = API.get(path, params={**params, "tenant_id": tenant})
    r.raise_for_status()
    return r.json()


def shipment(tracking_id: str) -> Shipment | None:
    data = _get(f"/v2/shipments/{tracking_id}")
    if not data or data["tenant_id"] != current_tenant.get():   # double-check ownership
        return None
    scans = _get(f"/v2/shipments/{tracking_id}/scans", limit=1)
    exc = _get(f"/v2/shipments/{tracking_id}/exceptions")
    return Shipment(data["id"], data["status"], data["origin"]["city"], data["destination"]["city"],
                    data.get("eta"), scans[0]["description"] if scans else "no scans yet",
                    [e["code"] + ": " + e["description"] for e in exc])
`,
    },
    {
      file: "server.py",
      patterns: ["mcp-server", "tool-calling"],
      note: md`**The MCP server.** Docstrings and type hints become the tool descriptions and schemas clients see. Four task-level tools, one resource and one prompt template. The write tool uses a **two-step confirmation**, so a model can't redeliver on a whim.`,
      code: py`
# uv add "mcp[cli]" httpx
import secrets
from typing import Literal

from mcp.server.fastmcp import FastMCP

import backend

mcp = FastMCP("meridian-shipments")
_pending: dict[str, dict] = {}          # confirmation tokens (use Redis with TTL in production)


@mcp.tool()
def track_shipment(tracking_id: str) -> dict:
    """Current status, location of last scan, ETA and any exceptions for ONE shipment.
    Use when the user gives a tracking id (format MF followed by 10 digits)."""
    s = backend.shipment(tracking_id)
    if s is None:
        return {"error": "Not found on this account. Check the tracking id."}
    return s.__dict__ | {"next_action": "none" if not s.exceptions else "consider request_redelivery"}


@mcp.tool()
def find_shipments(status: Literal["in_transit", "delayed", "delivered", "exception", "any"] = "any",
                   destination_city: str | None = None, shipped_after: str | None = None,
                   reference: str | None = None, limit: int = 20) -> list[dict]:
    """Search this account's shipments by status, destination city, ship date (ISO) or the customer's
    own reference (PO number). Returns at most 'limit' (max 50) compact rows."""
    rows = backend._get("/v2/shipments", status=None if status == "any" else status,
                        dest_city=destination_city, shipped_after=shipped_after,
                        reference=reference, limit=min(limit, 50))
    return [{"id": r["id"], "status": r["status"], "destination": r["destination"]["city"],
             "eta": r.get("eta"), "reference": r.get("reference")} for r in rows]


@mcp.tool()
def delivery_exceptions(days: int = 1) -> list[dict]:
    """Shipments with problems (damaged, address issue, missed delivery, customs hold) in the last N days."""
    return backend._get("/v2/exceptions", days=min(days, 14))


@mcp.tool()
def request_redelivery(tracking_id: str, preferred_date: str, confirm_token: str | None = None) -> dict:
    """Request a redelivery for a shipment with a missed delivery. Two steps:
    1) call without confirm_token: returns a summary and a token; show the summary to the user;
    2) call again with the token ONLY after the user explicitly confirms."""
    if confirm_token is None:
        s = backend.shipment(tracking_id)
        if s is None:
            return {"error": "Not found on this account."}
        token = secrets.token_urlsafe(8)
        _pending[token] = {"tracking_id": tracking_id, "date": preferred_date,
                           "tenant": backend.current_tenant.get()}
        return {"needs_confirmation": True, "confirm_token": token,
                "summary": f"Redeliver {tracking_id} to {s.destination} on {preferred_date}."}
    req = _pending.pop(confirm_token, None)
    if not req or req["tenant"] != backend.current_tenant.get() or req["tracking_id"] != tracking_id:
        return {"error": "Invalid or expired confirmation. Start again."}
    r = backend.API.post(f"/v2/shipments/{tracking_id}/redelivery",
                         json={"date": req["date"], "tenant_id": req["tenant"]},
                         headers={"Idempotency-Key": confirm_token})
    return {"ok": r.status_code == 201, "reference": r.json().get("id")}


@mcp.resource("shipment://{tracking_id}/timeline")
def timeline(tracking_id: str) -> str:
    """Full scan history as text: app-controlled context the host can attach."""
    scans = backend._get(f"/v2/shipments/{tracking_id}/scans", limit=200)
    return "\n".join(f"{s['time']}  {s['location']}  {s['description']}" for s in scans)


@mcp.prompt()
def daily_exceptions_report() -> str:
    """A ready-made prompt users can pick from a menu (user-controlled)."""
    return ("Use delivery_exceptions(days=1) and produce a short report grouped by exception type, "
            "with the 5 most urgent shipments first and a suggested action for each.")


if __name__ == "__main__":
    backend.current_tenant.set("internal-staff")   # stdio = local staff use; tenant from config
    mcp.run()                                      # stdio transport
`,
    },
    {
      file: "http_app.py",
      patterns: ["guardrails", "observability"],
      note: md`**Remote transport.** The same server over Streamable HTTP, behind authentication. In production, use the MCP spec's OAuth-based authorisation flow (or your API gateway) so tokens are scoped per customer. The key line is the one that turns the token into a ~tenant~ for the request.`,
      code: py`
# Run: uv run uvicorn http_app:app --port 8080
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

import backend
from auth import tenant_for_token, audit
from server import mcp

app = mcp.streamable_http_app()          # ASGI app serving the MCP endpoint (default path /mcp)


class TenantAuth(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
        tenant = tenant_for_token(token)                 # validate signature, expiry, scopes
        if tenant is None:
            return JSONResponse({"error": "unauthorized"}, status_code=401)
        ctx_token = backend.current_tenant.set(tenant)
        try:
            response = await call_next(request)
        finally:
            backend.current_tenant.reset(ctx_token)
        audit(tenant=tenant, path=request.url.path, status=response.status_code)
        return response


app.add_middleware(TenantAuth)
`,
    },
    {
      file: "clients/ops_agent.py",
      patterns: ["agent-loop"],
      note: md`**Our own agent as an MCP client.** It doesn't import ~backend~ at all: it discovers tools from the server at runtime, exactly like a customer's app would. The SDK's MCP helpers convert MCP tools into tool-runner tools.`,
      code: py`
import asyncio

from anthropic import AsyncAnthropic
from anthropic.lib.tools.mcp import async_mcp_tool
from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

client = AsyncAnthropic()
SYSTEM = ("You help Meridian's operations team. Use the shipment tools; never guess statuses or ETAs. "
          "For redelivery, always show the summary and wait for the user's explicit confirmation.")


async def ask(question: str) -> str:
    params = StdioServerParameters(command="uv", args=["run", "python", "server.py"])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = (await session.list_tools()).tools        # discovered at runtime
            runner = client.beta.messages.tool_runner(
                model="claude-opus-5-5", max_tokens=4096, system=SYSTEM,
                tools=[async_mcp_tool(t, session) for t in tools],
                messages=[{"role": "user", "content": question}],
            )
            last = None
            async for message in runner:
                last = message
            return "".join(b.text for b in last.content if b.type == "text")


if __name__ == "__main__":
    print(asyncio.run(ask("Which shipments to Denver are delayed, and why?")))
`,
    },
    {
      file: "clients/connector_example.py",
      note: md`**Alternative: let the model API connect to the remote server directly** (the MCP connector). Your code doesn't run an MCP client at all; the API calls the server's tools during the request. You need both halves: ~mcp_servers~ *and* an ~mcp_toolset~ entry.`,
      code: py`
import anthropic

client = anthropic.Anthropic()

resp = client.beta.messages.create(
    model="claude-opus-5-5",
    max_tokens=2048,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[{
        "type": "url",
        "url": "https://mcp.meridian.example/mcp",
        "name": "meridian",
        "authorization_token": CUSTOMER_SCOPED_TOKEN,   # issued to this customer, tenant-scoped
    }],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "meridian"}],
    messages=[{"role": "user", "content": "Any exceptions on my shipments today?"}],
)
`,
    },
    {
      file: "claude_desktop_config.json (staff laptops)",
      lang: "json",
      note: md`For desktop AI apps that support MCP, staff add the server to the app's MCP configuration. Same server, zero extra code.`,
      code: txt`
{
  "mcpServers": {
    "meridian-shipments": {
      "command": "uv",
      "args": ["--directory", "/opt/meridian-mcp", "run", "python", "server.py"]
    }
  }
}
`,
    },
  ],

  evaluate: md`
## Functional eval (the ops agent through MCP)
50 questions with known answers on a seeded staging dataset ("How many shipments to Texas are delayed?", "What happened to MF0000012345?"). Check the answer and the **tool trace**: did it use ~find_shipments~ with sensible filters instead of calling ~track_shipment~ 40 times?

## Tool-design A/B
| Tool surface | Task success | Avg tool calls | Tokens |
|---|---|---|---|
| 60 endpoint-mirroring tools | 74% | 7.9 | high |
| 4 task-level tools | **92%** | **2.1** | low |

*Illustrative of a typical outcome.* Fewer, richer tools usually win. Measure it on your own eval.

## Security eval (most important)
- With tenant A's token, try to read tenant B's tracking ids through every tool and resource. Expected: always "not found".
- Call ~request_redelivery~ with a token minted by another tenant → rejected.
- Tool *outputs* from your server are input to someone else's model: make sure they never contain instructions (e.g. no raw customer-entered notes without delimiting).
`,

  operate: md`
- **Versioning:** tool names and schemas are a public API now. Add new tools rather than changing existing ones, and deprecate with notice.
- **Rate limits** per tenant; agents can be chatty.
- **Observability:** trace every tool call (tenant, tool, latency, result size, errors). Watch for tools that are never used (bad descriptions) or always error (bad schemas).
- **Docs:** publish the server URL, auth flow, tool list and example prompts. Customers' AI teams are your users.
`,

  levelUp: md`
- **Agents consuming *many* MCP servers (logs, metrics, tickets) to investigate incidents?** [[proj:a05]].
- **MCP servers from third parties feeding untrusted content into your agent?** [[proj:a06]].
- **Company-wide catalogue of MCP servers with central auth and policy?** A platform concern: [[proj:a04]].
`,

  exercises: [
    "Add a ~shipping_documents~ resource (bill of lading as text) and a tool to *find* documents. Why is one a resource and one a tool?",
    "Write the cross-tenant security test as an automated pytest using two tokens.",
    "Implement the 60-thin-tools version for 3 endpoints and compare traces with the task-level tool on 10 questions.",
    "Connect the server to a desktop AI app and ask it to generate the daily exceptions report via the prompt template.",
  ],

  interview: md`
> "Meridian needed the same shipment capabilities in their ops agent, customers' AI apps and staff desktop tools, so instead of three integrations I built one MCP server. I designed four task-level tools instead of mirroring 60 REST endpoints, which cut tool calls per question by about 4x on our eval. Tenant isolation is enforced in the server from the auth token (no tool takes a customer id), the write tool needs a two-step confirmation token, and remote access runs over Streamable HTTP behind auth, while staff use stdio locally. Our own agent is just another MCP client that discovers tools at runtime. The security eval tries cross-tenant reads through every tool and resource."
`,
});
