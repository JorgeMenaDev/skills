# Report workspace contract

Read this file before creating or changing a report. The bundled helper is the only writer of `report.json`. Pass founder content over stdin with `--input -`; do not leave it in shared temporary files.

## State and configuration

```bash
node "$SKILL_DIR/scripts/report-workspace.mjs" state
node "$SKILL_DIR/scripts/report-workspace.mjs" configure --root "$HOME/Documents/Product Reports"
```

Configuration lives at `~/.config/product-feedback-report/config.json` unless `PRODUCT_FEEDBACK_REPORT_CONFIG` overrides it. A report workspace contains:

```text
<chosen root>/<date>-<product>-<mission>/
  report.json       # canonical structured state; helper-owned
  REPORT.html       # always regenerated
  REPORT.pdf        # regenerated when Chrome/Chromium is available
  evidence/         # originals plus redacted/annotated display copies
```

## Create a report

```bash
node "$SKILL_DIR/scripts/report-workspace.mjs" create --input - <<'JSON'
{
  "product": "Nexonet",
  "mission": "Flujo de nueva recepción",
  "title": "Nexonet - Flujo de nueva recepción - 14 de julio de 2026",
  "language": "es",
  "testedBy": "Jean",
  "scope": "Creación de una recepción desde el primer paso hasta adjuntos",
  "brand": {
    "primaryColor": "#24577a",
    "logo": "/optional/path/logo.png"
  }
}
JSON
```

Only `product` and `mission` are required. Match `language` to the founder (`es` and `en` have built-in labels). Use the echoed `REPORT` directory for later commands.

## Add a finding

Problem input and command:

```bash
node "$SKILL_DIR/scripts/report-workspace.mjs" add --report "<report directory>" --input - <<'JSON'
{
  "kind": "problem",
  "title": "El flujo se cierra después del paso 2",
  "priority": "blocking",
  "whatIDid": [
    "Abrí Nueva recepción",
    "Completé Transporte y recepción",
    "Presioné Siguiente"
  ],
  "happened": "El paso 3 aparece brevemente y el flujo se cierra.",
  "expected": "El paso 3 debe permanecer abierto con la misma recepción.",
  "impact": "No es posible terminar una recepción.",
  "suggestion": "Revisar el guardado entre pasos.",
  "evidence": [
    {
      "kind": "image",
      "original": "/path/screenshot.png",
      "display": "/path/screenshot-redacted-annotated.png",
      "caption": "El flujo vuelve al listado después de mostrar el paso 3."
    }
  ]
}
JSON
```

Idea input uses `kind: "idea"`; `whatIDid`, `happened`, and evidence may be omitted. Put the desired change in `expected` and its value in `impact`.

Allowed priorities: `blocking`, `important`, `minor`. Evidence kinds: `image`, `video`. Every evidence item requires `display`: a separate shareable PNG, JPEG, WebP, or GIF that is never the original path. For video, use a representative screenshot; the video original remains beside the report as a supplementary file.

The helper copies evidence into the workspace before saving. `original` is never embedded in the PDF when a separate `display` copy exists.

## Correct or update

The input contains only fields that should change:

```bash
node "$SKILL_DIR/scripts/report-workspace.mjs" update --report "<report directory>" --id F-001 --input - <<'JSON'
{"priority":"important"}
JSON

node "$SKILL_DIR/scripts/report-workspace.mjs" update-report --report "<report directory>" --input - <<'JSON'
{"scope":"Flujo completo, incluido adjuntos"}
JSON
```

`update-report` accepts `title`, `product`, `mission`, `language`, `testedBy`, `scope`, `status`, and `brand`. Supplying `brand.logo` copies it into the workspace.

## Pause, complete, reopen, inspect

Pausing requires no command: every mutation is durable.

```bash
node "$SKILL_DIR/scripts/report-workspace.mjs" show --report "<report directory>"
node "$SKILL_DIR/scripts/report-workspace.mjs" complete --report "<report directory>"
node "$SKILL_DIR/scripts/report-workspace.mjs" reopen --report "<report directory>"
node "$SKILL_DIR/scripts/report-workspace.mjs" render --report "<report directory>"
```

Every mutating command writes `REPORT.html`, attempts `REPORT.pdf`, and echoes `PDF_STATUS: current|missing|failed`. A nonzero exit after `report.json` was saved means the report is durable but the PDF gate remains open.
