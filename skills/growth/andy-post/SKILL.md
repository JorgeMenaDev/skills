---
name: andy-post
description: "Draft and publish social posts through Andy MCP. Use when the user wants to post, tweet, schedule, or create an X, LinkedIn, or Instagram post; when they give a raw idea for a social post; or when they run /andy-post."
version: 0.1.0
license: MIT
mutating: true
writes_to: ["Andy Workspace posts"]
---

# Andy Post

> **Active build.** Andy MCP and this skill are still moving. File one issue per defect on [JorgeMenaDev/skills](https://github.com/JorgeMenaDev/skills/issues/new): skill gap → label `andy-post`; MCP or API gap → label `andy-mcp`. Include the tool name, requestId, and what you expected.

Draft and publish through [Andy MCP](https://docs.andypartner.com). The operator gives a raw idea. You return 2-3 distinct drafts. They pick one. Then you publish or schedule.

## Contract

- Raw idea → 2-3 distinct drafts → operator picks one → stop. Creating a post before the pick is the failure this gate prevents.
- A live publish is a public position. Create only after the pick and a time (now or a schedule).
- Prefer native Andy tools when `manage_post` is on this session. Otherwise use a workspace API key against `https://app.andypartner.com/api/mcp`. Lane facts: [references/lane.md](references/lane.md).
- Voice: load the host's voice or brand notes if they exist. Else write as the operator talks. `manage_brand` `inspect_voice` is a floor, not a replacement for the operator's corrections.

## Preamble

```bash
echo "MCP: https://app.andypartner.com/api/mcp"
echo "TOOLS: get_context list_connections list_posts manage_post"
```

If `manage_post` is not on this session, read `references/lane.md` before the first call.

## Steps

1. Call `get_context`. Done when one Workspace is selected. If several are listed, ask which one.
2. Turn the raw idea into 2-3 drafts that are different approaches, not rewords. Recommend one. Match the destination register (X short, LinkedIn a short story).
3. **STOP.** Show numbered drafts. Wait for the pick. Writing `manage_post` create here is the failure this gate prevents.
4. After pick: resolve the destination from `list_connections`, or from a `list_posts` row when connections are not authorized. Call `manage_post` `{action:"create", channel, text, connectionId}`. Omit `scheduledAt` to publish now. Pass future epoch ms to queue.
5. Verify with `list_posts` on the new `postId`. Report `connectionLabel`, `status`, `publishState`.

## Media

MCP has no upload tool. `manage_post` accepts `mediaAssetId` only after the asset exists. Text-only is valid. If the operator wants an image, follow `references/lane.md` ## Media.

## Output

After drafts:

```
**Drafts** - 1 / 2 / 3, each with one-line angle
**Recommend** - number + why
**Media** - text-only, or blocked on image
```

Example idea: "happy with the landing" → 1 build-log / 2 restraint / 3 screenshot-caption.

After publish:

```
**Posted** - connectionLabel, postId, publishState
```

## Anti-patterns

- Publishing through a retired scheduler or a parallel social CLI
- Guessing a `connectionId` when a listed label exists
- Inventing a screenshot of the wrong site
