---
name: andy-post
description: "Draft and publish social posts through Andy MCP. Use when the user wants to post, tweet, schedule, or create an X, LinkedIn, or Instagram post; when they give a raw idea for a social post; or when they run /andy-post."
version: 0.2.0
license: MIT
mutating: true
writes_to: ["Andy Workspace posts"]
---

# Andy Post

> **Active build.** Andy MCP and this skill are still moving. File one issue per defect on [JorgeMenaDev/skills](https://github.com/JorgeMenaDev/skills/issues/new): skill gap → label `andy-post`; MCP or API gap → label `andy-mcp`. Include the tool name, requestId, and what you expected.

Draft and publish through [Andy MCP](https://docs.andypartner.com). The operator gives a raw idea. You return 2-3 distinct drafts. They pick one. Then you save a draft by default — publishing or scheduling only on their explicit word.

## Contract

- A raw idea with no save instruction → 2-3 distinct drafts → operator picks one → stop. Creating a post before the pick is the failure this gate prevents.
- An explicit save request skips the ritual entirely: when the operator supplies the exact text, or names previously chosen copy and asks to save it as a draft, save it directly with the intent omitted (it defaults to `request_approval`, always `pending_approval`, no dispatch). A `pending_approval` draft is not a public position, so the 2-3 options and the pick do not apply. The ritual still applies before any `schedule` or `publish_now`.
- When the act is already explicit (draft, schedule, or publish now), do not ask which one. When it is not explicit, default safely to a draft.
- A live publish is a public position. Schedule or publish only when the operator explicitly names it ("schedule it", "publish now") and holds the grant: Owner/Admin, or a Workspace API key with the matching scope. Members can only leave drafts for approval.
- Prefer native Andy tools when `manage_post` is on this session. Otherwise use a workspace API key against `https://app.andypartner.com/api/mcp`. Lane facts: [references/lane.md](references/lane.md).
- Voice: load the host's voice or brand notes if they exist. Else write as the operator talks. `manage_brand` `inspect_voice` is a floor, not a replacement for the operator's corrections.

## Preamble

```bash
echo "MCP: https://app.andypartner.com/api/mcp"
echo "TOOLS: get_context list_connections list_posts manage_post manage_media"
```

If `manage_post` is not on this session, read `references/lane.md` before the first call.

## Steps

1. Call `get_context`. Done when one Workspace is selected. If several are listed, ask which one.
2. If the operator gave a raw idea with no save instruction, turn it into 2-3 drafts that are different approaches, not rewords. Recommend one. Match the destination register (X short, LinkedIn a short story).
3. **STOP — raw ideas only.** Show numbered drafts. Wait for the pick. Writing `manage_post` create here is the failure this gate prevents. Skip this stop when the operator already supplied the exact text or named chosen copy to save: go straight to step 4.
4. Save, schedule, or publish the chosen or supplied text: resolve the destination from `list_connections`, or from a `list_posts` row when connections are not authorized. When the act is already explicit, use it; otherwise save a draft. Then call `manage_post`:
   - Draft: `{action:"create", channel, text, connectionId}` (intent omitted → `request_approval`). An optional future `scheduledAt` (epoch ms) is only a proposal; approval still needs its own explicit date.
   - Schedule: `{action:"create", channel, text, connectionId, intent:"schedule", scheduledAt}` with an explicit future `scheduledAt`. Owner/Admin or `content:schedule` scope.
   - Publish now: `{action:"create", channel, text, connectionId, intent:"publish_now"}` and no `scheduledAt`. Owner/Admin or `content:publish` scope.
5. Verify with `list_posts` on the new `postId`. Report `connectionLabel`, `status`, `publishState`. A draft reports `pending_approval`; only a named schedule/publish you were granted reports `approved`.

## Media

One image can ride any channel: upload it with `manage_media` `{action:"upload_bytes", bytesBase64, contentType, fileName}`, read it back with `{action:"inspect", assetId}`, then pass its id as `mediaAssetId` on `manage_post` create. Instagram requires an image; X and LinkedIn carry it optionally. Text-only is valid. If the operator wants an image, follow `references/lane.md` ## Media.

## Output

After drafts:

```
**Drafts** - 1 / 2 / 3, each with one-line angle
**Recommend** - number + why
**Media** - text-only, or image attached
```

Example idea: "happy with the landing" → 1 build-log / 2 restraint / 3 screenshot-caption.

After save:

```
**Drafted** - connectionLabel, postId, status (pending_approval, waiting in Por aprobar)
```

After a named schedule or publish:

```
**Posted** - connectionLabel, postId, publishState
```

## Anti-patterns

- Publishing through a retired scheduler or a parallel social CLI
- Guessing a `connectionId` when a listed label exists
- Inventing a screenshot of the wrong site
- Treating a saved draft as published, or a proposal date as permission to skip approval
- Passing the removed `publish` boolean: there is no compatibility fallback, the call is refused
