# Higgsfield API

## Two balances

The `higgsfield` CLI signs in with OAuth and spends its **workspace credits** (a free plan has about 10).
The **Higgsfield API** (console.higgsfield.ai) is a separate product billed in dollars from its own balance,
and the CLI cannot spend it. This skill uses the API. When the human quotes a dollar balance, it is the API.

## Key

- The Console shows each key as one string, `KEY_ID:SECRET` (a 36-character UUID, a colon, a 64-character
  secret). `scripts/hf-key-setup.sh` takes the whole string, splits it at the colon and writes
  `HF_API_KEY_ID` and `HF_API_KEY_SECRET` to `~/.config/higgsfield/api.env` with mode 600.
- `scripts/hf-api.sh` sends `Authorization: Key ID:SECRET` through curl's stdin (`-H @-`), so the secret
  never shows in the process list or logs. A `401 Invalid credentials` usually means the combined string
  went into one field: inspect lengths, never values.

## Estimate, then generate

- `POST /estimate/<endpoint>` with the same body returns `{"credits","usd"}` and creates no job.
  `scripts/hf-gen.sh` estimates, prints the dollar figure, then submits with an `Idempotency-Key`, polls
  `/requests/<id>/status` every 5 s and downloads the outputs. `HF_DRY=1` stops after the estimate.
- Every job appends `{t, id, endpoint, out, est_usd}` to `media/jobs.jsonl`; sum it for the spend report.
- Failed, moderated and cancelled requests are refunded. Outputs are kept at least 7 days: download them.

## Endpoints that work for this skill

Prices observed October 2026; re-estimate, never quote these as current.

| Use | Endpoint | Body | Observed |
| --- | --- | --- | --- |
| Stills | `higgsfield-ai/soul/cinema` | `prompt`, `aspect_ratio: "16:9"`, `resolution: "1080p"`, `batch_size: 4` | $0.022 per batch of 4, 2048x1152 PNG, about 1 min |
| Clips | `minimax/h3/image-to-video` | `prompt`, `image_url`, `end_image_url`, `duration: 8`, `resolution: "2K"`, `aspect_ratio: "16:9"` | $0.88 per clip, 2560x1440 at 24 fps, about 10 min |

- MiniMax H3 follows the start frame's aspect ratio and has no negative prompt field: put the exclusions in
  the prompt.
- Model pages live at `docs.higgsfield.ai/docs/models/<family>/<endpoint>.md`; the shared index is
  `docs.higgsfield.ai/docs/llms.txt`. Read the model page before using a new endpoint.

## Uploads

`scripts/hf-upload.sh FILE` asks `/files/generate-upload-url` for a presigned URL, PUTs the file with the
returned headers and prints the `public_url` to pass as `image_url`. That URL is public and unauthenticated:
upload only stills the owner may share, never real customer or internal data.
