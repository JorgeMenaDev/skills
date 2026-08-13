# Andy Post lane

Operational facts for `andy-post`. No secrets live here.

## Host

Endpoint: `https://app.andypartner.com/api/mcp`.

Prefer native Andy tools when they are already on the session (`get_context`, `list_connections`, `list_posts`, `manage_post`). Some hosts inherit OAuth MCP servers only when a static token is already present. If Andy tools are missing, use any MCP client with a workspace `andy_sk_` key. Pipe the key. Never echo it.

Install: [docs.andypartner.com](https://docs.andypartner.com) / [app.andypartner.com/mcp](https://app.andypartner.com/mcp).

## Auth and destination

- An API key is pinned to one Workspace. `get_context` shows the selection.
- Content posts need `content:read` and `content:write`. Older `marketing:*` keys return 403 on `list_posts` and `manage_post`.
- `list_connections` needs `content:connections`. If that call is 403, recover `connectionId` from a `list_posts` row that already used the destination.
- Pick the destination by human label (`@handle`, page name), never by inventing an id.

## Tools

`manage_post` actions: `create`, `edit`, `approve`, `reject`, `reschedule`, `cancel`.

Create input: `channel` (`x` | `linkedin` | `instagram`), `text`, optional `connectionId`, optional `scheduledAt` (epoch ms), optional `mediaAssetId`.

A workspace API key create usually lands **approved** and can publish in seconds when `scheduledAt` is omitted. OAuth and member roles may land in `pending_approval`.

## Media

MCP dropped media tools. HTTP/CLI still has:

1. `POST /api/public/operations/content/media/upload-prepare` (`fileName`, `contentType`, `byteSize`)
2. `POST` the bytes to the returned `uploadUrl`
3. `POST /api/public/operations/content/media/upload-complete` (`preparationId`, `storageId`, `kind`, `sourceType`)
4. Pass `mediaAssetId` on `manage_post` create

Use this only when the operator supplied a file or confirmed a public URL to capture.

## Report friction

One issue per defect: https://github.com/JorgeMenaDev/skills/issues/new

- Skill wording, steps, or this file → label `andy-post`
- Missing tool, 403, bad schema, publish failure → label `andy-mcp`

Include tool name, requestId, and what you expected.
