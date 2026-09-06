# Andy Post lane

Operational facts for `andy-post`. No secrets live here.

## Host

Endpoint: `https://app.andypartner.com/api/mcp`.

Prefer native Andy tools when they are already on the session (`get_context`, `list_connections`, `list_posts`, `manage_post`, `manage_media`). Some hosts inherit OAuth MCP servers only when a static token is already present. If Andy tools are missing, use any MCP client with a workspace `andy_sk_` key. Pipe the key. Never echo it.

Install: [docs.andypartner.com](https://docs.andypartner.com) / [app.andypartner.com/mcp](https://app.andypartner.com/mcp).

## Auth and destination

- An API key is pinned to one Workspace. `get_context` shows the selection.
- Content posts need `content:read` and `content:write`. Older `marketing:*` keys return 403 on `list_posts` and `manage_post`.
- `list_connections` needs `content:connections`. If that call is 403, recover `connectionId` from a `list_posts` row that already used the destination.
- Pick the destination by human label (`@handle`, page name), never by inventing an id.

## Intents

Saving never implies publication. `manage_post` create takes an explicit intent:

- Omitted intent defaults to `request_approval`: always `pending_approval`, no dispatch. An optional future `scheduledAt` (epoch ms) is a proposal only — approval still needs an explicit date chosen by the approver.
- `schedule` needs an explicit future `scheduledAt` and approves+schedules at once. Owner/Admin, or a Workspace API key with `content:schedule` (plus `content:write`).
- `publish_now` is immediate and rejects `scheduledAt`. Owner/Admin, or a Workspace API key with `content:publish` (plus `content:write`).
- Members can only request approval. There is no `publish` boolean; passing one is refused with no fallback.

Approving a draft (`manage_post` action `approve`) always needs an explicit future `scheduledAt` — approval schedules, never publishes now. A Workspace API key needs `content:write` plus `content:approve` and `content:schedule`. A missing or elapsed proposal must be replaced by the caller, never defaulted.

## Tools

`manage_post` actions: `create`, `edit`, `approve`, `reject`, `reschedule`, `cancel`.

Create input: `channel` (`x` | `linkedin` | `instagram`), `text`, optional `connectionId`, optional `intent` (`request_approval` | `schedule` | `publish_now`), optional `scheduledAt` (epoch ms), optional `mediaAssetId`.

`manage_media` actions: `upload_bytes`, `list`, `inspect`.

## Media

Upload one PNG/JPEG image (up to 3 MB raw) as JSON-transport bytes:

1. `manage_media` `{action:"upload_bytes", bytesBase64, contentType, fileName}` → reusable photo Media Asset (replaying the same idempotency key and bytes returns the same asset)
2. `manage_media` `{action:"inspect", assetId}` → read it back
3. Pass its id as `mediaAssetId` on `manage_post` create — on `x`, `linkedin`, or `instagram` alike

Instagram requires an image Media Asset (`instagram_media_required`, non-image kinds are `instagram_media_unsupported`); X and LinkedIn carry an image optionally. The App and CLI keep the direct-upload door (`content media upload-prepare` → PUT bytes to the upload URL → `content media upload-complete`); use it only when the operator supplied a file outside MCP.

## Report friction

One issue per defect: https://github.com/JorgeMenaDev/skills/issues/new

- Skill wording, steps, or this file → label `andy-post`
- Missing tool, 403, bad schema, publish failure → label `andy-mcp`

Include tool name, requestId, and what you expected.
