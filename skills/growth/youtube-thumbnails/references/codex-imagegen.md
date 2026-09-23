# Codex image generation on a ChatGPT plan

Measured on codex-cli 0.156.0, 2026-09-23, ChatGPT login.

## Preflight

```sh
codex login status              # must say ChatGPT; API-key auth bills the API instead
codex features list | grep image_generation   # must be: stable  true
```

## Inside a Codex session

- The built-in tool is `image_gen` (Codex's bundled skill: `$imagegen`). It uses gpt-image-2 per OpenAI's docs: https://learn.chatgpt.com/docs/image-generation
- Arguments are the prompt plus reference images (local paths, or images already in the conversation). There is **no** size, quality, seed or destination argument. Ask for 16:9 in the prompt; in the 2026-09 test the output arrived as **1672×941** PNG whatever size was requested — an observation, not a contract.
- To edit a local file, open it with `view_image` first so it is in the conversation, then ask for the edit.
- Output lands in `~/.codex/generated_images/<session>/<id>.png`; the tool's reply names the path. Copy it into `raw/`; never leave a deliverable only there.
- ~24–27 s per image in that test; later runs ranged ~15–40 s by call type. Three sequential calls hit no rate limit there.
- Cost: it draws on the plan's included Codex usage, roughly 3–5× a normal turn per image, then credits. No per-image number is returned; check `/status`. https://learn.chatgpt.com/docs/pricing

## From another agent (Claude, a script)

Hand a brief to a Codex session and have it make the calls: your host's delegation lane if it has one, otherwise `codex exec` (documented, not yet proven for images here):

```sh
codex exec --skip-git-repo-check --sandbox workspace-write -C <workdir> \
  -i <abs/path/logo.png> '$imagegen <brief>. Copy every output into raw/ and list the paths.'
```

The brief carries the concepts, the prompt skeleton, the absolute reference paths and the destination. Ask for the prompts and paths back as `prompts.jsonl` lines.

## Fallback

`scripts/image_gen.py` inside Codex's imagegen skill calls the API with `OPENAI_API_KEY` (billed per image, exposes size and quality). Use it only when the human asks for it.
