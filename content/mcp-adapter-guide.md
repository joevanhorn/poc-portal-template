# Using the Okta MCP Adapter

A general guide to connecting AI agents to enterprise systems through the **Okta MCP Adapter** —
an identity-aware OAuth gateway for the [Model Context Protocol (MCP)](https://developer.okta.com/docs/concepts/mcp-server/).
It is agent-agnostic (any MCP-over-HTTP client) and system-agnostic (any MCP backend). Replace the
`<placeholders>` with the values for your environment.

---

## Overview — three authorization layers

Okta secures [AI agent access](https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agent-register.htm)
to your systems by composing three layers, so the same identity model that governs humans governs
agents:

- **Layer 1 — Okta authorization server.** Authenticates the user, evaluates group membership, and
  issues a **scoped** access token. The agent acts strictly on behalf of that user.
- **Layer 2 — MCP server (scope-based tool filtering).** Reads the token's scopes and filters the
  tool catalog. Unauthorized tools are **invisible**, not merely disabled.
- **Layer 3 — fine-grained authorization (optional, Okta FGA).** Per-tool and per-record checks
  ("may this user act on *this specific* resource?").

Net effect: identity-aware, governed, least-privilege control over exactly what an agent can do.

---

## Endpoints

Your environment exposes three services (substitute your hostnames):

| Service | URL | Purpose |
| --- | --- | --- |
| **MCP Adapter** | `https://<adapter-host>` | OAuth gateway — **agents connect here** |
| **Admin UI** | `https://<admin-host>` | Manage agents, resources, and managed connections |
| **MCP Server(s)** | `https://<mcp-host>` | Backend tools — your systems (for example, a CRM such as **Salesforce** and an ITSM such as **ServiceNow**) |

The adapter is the only endpoint agents touch; it brokers identity and routes authorized tool calls
to the backend MCP server(s).

> **System-agnostic.** The adapter can front **any** MCP-over-HTTP backend. This guide uses a CRM
> (Salesforce) and an ITSM (ServiceNow) as running examples to make the patterns concrete — they are
> **examples, not requirements**. Swap in whatever systems you need (see
> [Bringing your own MCP server](#bringing-your-own-mcp-server-custom-tools)).

---

## Connecting an AI agent

Any agent that speaks **MCP over HTTP** can connect. The adapter authenticates the agent's OAuth
client and then redirects the user to Okta (PKCE + MFA). Pick the OAuth client mode that matches
your agent:

| Agent / client | OAuth mode | Okta "Client Mode" |
| --- | --- | --- |
| Most MCP clients & custom connectors | **DCR** (Dynamic Client Registration — self-registers) | DCR Enabled |
| Org-installed / managed connectors | **Admin-supplied** OAuth `client_id` + `client_secret` | DCR Enabled |
| CLI clients that use CIMD (e.g. a coding-CLI agent) | **CIMD** (client-metadata-document URL) | CIMD Client |
| Any other MCP-over-HTTP agent | DCR or standard OAuth 2.0 PKCE | DCR Enabled |

> **DCR is the default path.** CIMD is a variant used by a few CLI agents that identify via a
> published client-metadata URL instead of registering a client. Admin-supplied credentials are for
> connectors an org installs centrally.

### Generic connect flow

Point your MCP client at the adapter URL. For example, a CLI client typically does:

```bash
<your-mcp-client> mcp add --transport http <name> https://<adapter-host>
```

The client then:
1. Discovers the adapter via [MCP discovery](https://spec.modelcontextprotocol.io/specification/2025-03-26/).
2. Registers or identifies its OAuth client (DCR / admin-supplied / CIMD).
3. Redirects you to Okta to authenticate (PKCE + MFA).
4. Receives **scoped** tokens based on your group membership.
5. Lists only the tools your authorization allows.

For a hosted/managed connector, add the adapter as a custom connector in your agent platform and
(if the mode is admin-supplied) paste the Okta OIDC app's `client_id` / `client_secret` into the
connector's advanced settings.

---

## Registering an AI agent in Okta

Create **one AI Agent (and one dedicated OIDC app) per agent surface** — don't share OAuth
credentials across agents.

### Step 1 — Create the OIDC application

In the [Okta Admin Console](https://help.okta.com/oie/en-us/content/topics/apps/apps_app_integration_wizard_oidc.htm):
**Applications → Create App Integration → OIDC → Web Application**.
- **Grant types:** `authorization_code` (+ `refresh_token`; add `urn:ietf:params:oauth:grant-type:jwt-bearer` if the agent does token exchange).
- **Sign-in redirect URIs:** the adapter callback `https://<adapter-host>/oauth/callback`, plus any
  hosted callback URL(s) your agent platform requires.
- **Assignments:** the groups (or Everyone) that should be able to use this agent.
- Record the generated **Client ID / Client Secret**.

### Step 2 — Create the AI Agent

**Directory → AI Agents → Create AI Agent**
([docs](https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agent-register.htm)). Name it
for the surface and link the OIDC app from Step 1.

### Step 3 — Add a managed connection

In the agent → **Managed Connections → Add**, point at the **MCP Adapter authorization server**
(`<auth-server-id>`) and select the scopes the agent may receive
([docs](https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agent-secure.htm)).

### Step 4 — Assign users to groups

Group membership is the access lever — define one read + one write group per tool family:

| Group | Scopes granted | Tools visible |
| --- | --- | --- |
| `<App>-Read` | `<app>:read`, `mcp:read` | read tools for that system |
| `<App>-Write` | `<app>:read`, `<app>:write`, `mcp:read` | all tools for that system |

Define one read + one write group per tool family. For example, a deployment that connects
Salesforce and ServiceNow might use `CRM-Read` / `CRM-Write` (scopes `sfdc:read` / `sfdc:write`) and
`ITSM-Read` / `ITSM-Write` (scopes `snow:read` / `snow:write`) — illustrative examples of the
pattern, not a required set.

### Step 5 — Verify in the Admin UI

Open the Admin UI → **Agents**, confirm the agent appears, and click **Sync All** to resolve the
managed connection.
- **DCR / admin-supplied agents:** leave **Client Mode = DCR Enabled**.
- **CIMD agents only:** open the agent → **Edit** → set **Client Mode = CIMD Client** and paste the
  client's metadata-document URL into the **CIMD Client ID** field. (Don't set this on DCR agents —
  they ignore it.)

---

## The authorization model (groups → scopes → tools)

The auth server uses [access policies](https://help.okta.com/oie/en-us/content/topics/security/api-config-access-policies.htm)
to decide which [scopes](https://help.okta.com/oie/en-us/content/topics/security/api-config-scopes.htm)
a token receives, based on the user's groups:

- **Write group** → read + write scopes
- **Read group** → read scopes only
- **No groups** → no scopes → no tools

The token must also carry a **`groups` claim** (auth server → Claims → add a Groups claim) if the
backend or FGA layer needs to read group membership.

**Illustrative access tiers** (no standing privilege is granted by default):

| Example user | Groups | Result |
| --- | --- | --- |
| Power user | `<App>-Read` + `<App>-Write` | all tools (read + write) |
| Read-only user | `<App>-Read` | read tools only — write tools never appear |
| New / unprovisioned user | (none) | **0 tools** until added to a group |

Adding a user to a group instantly grants the matching tools on the next reconnect; removing them
revokes — scope filtering is invisible, not disabled.

---

## Layer 2 — scope-based tool filtering (the backend's job)

The MCP server filters `tools/list` by the token's scopes so unauthorized tools never appear:

```python
# Example registry — tool names and scopes are illustrative (here: a CRM + an ITSM backend).
ALL_TOOLS = [
    {"name": "sfdc_get_account",    "scope": "sfdc:read"},
    {"name": "sfdc_update_account", "scope": "sfdc:write"},
    {"name": "snow_lookup_ticket",  "scope": "snow:read"},
    {"name": "snow_create_ticket",  "scope": "snow:write"},
]

def list_tools(token_scopes):
    return [t for t in ALL_TOOLS if t["scope"] in token_scopes]
```

---

## Layer 3 — fine-grained authorization (optional, Okta FGA)

Scope filtering answers "may this user see this tool?" — a coarse, role-shaped check.
[Okta FGA](https://docs.fga.dev/) (powered by [OpenFGA](https://openfga.dev/)) answers the finer
questions:

| Question | Best layer |
| --- | --- |
| Should this user have read access? | Layer 1 — Okta groups + scopes |
| Should the agent see this tool? | Layer 2 — MCP server scope filter |
| May this user act on **this specific record**? | **Layer 3 — FGA** |

**Example model:**

```
type user
type ai_agent
  relations
    define operator: [user]
type mcp_tool
  relations
    define invoker: [user, ai_agent, group#member]
type resource
  relations
    define owner: [user]
    define reader: [user, ai_agent, group#member] or owner
    define writer: [user, ai_agent] or owner
type group
  relations
    define member: [user]
```

**Per-call check (Python):**

```python
async def authorize(token_sub, tool_name, resource_id=None):
    # tool invocation check
    if not (await fga.check(user=f"user:{token_sub}", relation="invoker",
                            object=f"mcp_tool:{tool_name}")).allowed:
        raise PermissionError(f"FGA denied invocation of {tool_name}")
    # per-resource check
    if resource_id:
        relation = "writer" if tool_name.endswith(("_create", "_update", "_delete")) else "reader"
        if not (await fga.check(user=f"user:{token_sub}", relation=relation,
                                object=f"resource:{resource_id}")).allowed:
            raise PermissionError(f"FGA denied {relation} on {resource_id}")
```

The FGA subject (`user:<sub>`) comes from the **token claim**, not the agent — the agent acts
strictly with the user's authority. **Fail closed:** if FGA errors or times out, deny.

---

## Bringing your own MCP server (custom tools)

The example backends in this guide (a Salesforce CRM and a ServiceNow ITSM) are just that — examples.
To put **any** tools behind the same Okta-governed adapter, deploy an MCP server and register it as
a backend.

### Backend contract

A custom MCP server must:
1. Speak **MCP over HTTP** — at minimum `tools/list` and `tools/call`
   ([2025-03-26 spec](https://spec.modelcontextprotocol.io/specification/2025-03-26/)).
2. Accept the adapter's forwarded bearer token (`Authorization: Bearer <token>`) and read scopes from it.
3. **Filter `tools/list` by scope** — unauthorized tools must be invisible.
4. Expose `/health` returning HTTP 200 (for the load balancer's health check).
5. Authenticate to the adapter with a **shared service key** (or mTLS).

### Register the backend

1. **Deploy** the MCP server (its own hostname, TLS cert, DNS record, target group/route).
2. **Wire it into the adapter** by adding the backend URL + service key to the adapter's
   configuration (e.g. `BACKEND_<NAME>_URL` / `BACKEND_<NAME>_API_KEY`) and adding it to the
   adapter's trusted-backend list.
3. **Add scopes:** in the auth server, define one read + one write scope per new tool family (e.g.
   `app2:read`, `app2:write`) and update the access policy to grant them by group.
4. **Add groups** (`<App2>-Read` / `<App2>-Write`) and test: assign a user to the read group only,
   reconnect, and confirm they see only the read tools.

> Identity federation tip: if a backend brokers to a cloud platform (e.g. via Workforce Identity
> Federation), map the Okta token's `sub`/`groups`/`scp` claims into the platform's federated
> principal and gate at the token-exchange (STS) layer — so no long-lived service-account keys are
> stored.

---

## Validating it (demo scenarios)

1. **Zero standing privilege.** A user in no groups connects → the agent sees **0 tools**. Add them
   to `<App>-Read` → reconnect → read tools appear. Nothing was pre-granted.
2. **Scope-based filtering.** A read-only user never sees write tools — they're absent from
   `tools/list`, not greyed out. Add `<App>-Write` → reconnect → write tools appear.
3. **Governed access lifecycle (with OIG).** Make the scope/group requestable via an
   [access request](https://help.okta.com/oie/en-us/content/topics/identity-governance/access-requests/access-requests-overview.htm)
   with approval (and optional time-bound elevation). On approval the tools appear; on expiry/
   revocation they disappear — governed exactly like human access.

---

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Agent sees 0 tools | User isn't in any group that grants scopes |
| Agent can't connect | Wrong adapter URL, or the agent's OAuth mode doesn't match its Okta Client Mode |
| CIMD client fails to authorize | Client Mode not set to **CIMD Client**, or the metadata URL not pasted on the agent |
| Hosted connector loops on redirect | The OIDC app is missing the agent platform's hosted callback URL |
| Scopes present but action denied | Layer-3 FGA blocked it (no relation on that specific resource) |
| Backend returns tools the user shouldn't see | The MCP server isn't filtering `tools/list` by scope |

---

## References

- [Register AI agents in Okta](https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agent-register.htm)
- [AI agent managed connections](https://help.okta.com/oie/en-us/content/topics/ai-agents/ai-agent-secure.htm)
- [Okta MCP server concepts](https://developer.okta.com/docs/concepts/mcp-server/) ·
  [Configure MCP authentication / DCR](https://developer.okta.com/docs/guides/configure-mcp-authentication/main/)
- [API access policies](https://help.okta.com/oie/en-us/content/topics/security/api-config-access-policies.htm) ·
  [scopes](https://help.okta.com/oie/en-us/content/topics/security/api-config-scopes.htm)
- [Okta FGA](https://docs.fga.dev/) · [OpenFGA modeling](https://openfga.dev/docs/modeling)
- [MCP specification](https://spec.modelcontextprotocol.io/specification/2025-03-26/)
