---
name: product-feedback-report
description: "Create and resume founder-led product feedback reports for web or mobile software. Use when someone wants to record product problems or ideas over time, continue an unfinished testing report, attach screenshots or short videos, or export a polished PDF for a product team."
version: 1.0.0
license: MIT
mutating: true
writes_to: ["~/.config/product-feedback-report/config.json", "user-selected Product Reports directory"]
triggers: ["create product feedback report", "resume product report", "record product problem", "record product idea"]
---

# Product Feedback Report

A **report workspace** lets one founder capture one testing mission across as many sessions as needed. The founder leads the testing; you listen, clarify, save, and keep one polished PDF current.

## Contract

- One local owner and one web/mobile testing mission per report.
- Speak in the founder's language. Let them describe findings naturally; ask one missing-detail question at a time.
- Findings are only **Problem** or **Idea**. Infer **Blocking / Important / Minor** from impact; ask only when uncertain.
- A visible Problem needs a screenshot; a flow may use a short video plus one representative screenshot for the PDF. Evidence is optional for an Idea.
- Keep the original evidence locally. The PDF uses a redacted copy, with a simple arrow or box when the relevant area is clear.
- Preserve a founder's proposed solution only as optional **Suggestion**. Never invent engineering requirements, architecture, tests, or implementation plans.
- Save each complete finding immediately and regenerate the PDF. A completed report remains editable.

## Preamble - run first

Resolve `SKILL_DIR` to the directory containing this file, then run:

```bash
node "$SKILL_DIR/scripts/report-workspace.mjs" state
```

Branch only on its tokens:

- `CONFIG: missing` - when creating the first report, ask where reports should live; recommend `~/Documents/Product Reports`. Run `configure` after the answer. Asking for a path on every run is the failure this state check prevents.
- `CONFIG: ready` - use `REPORTS_JSON` to offer unfinished reports newest-first plus **Start a new report**. If the user already named a report, select that match without asking again.
- `PDF_RENDERER: missing` - reports can still be saved and HTML regenerated, but Chrome/Chromium is required for automatic PDF output. State that exact gap. Claiming the PDF is current is the failure this gate prevents.

Before the first report mutation, read [references/workspace-contract.md](references/workspace-contract.md) in full and use its commands; do not reconstruct the JSON or CLI contract from memory.

## Conversation loop

1. **Orient.** For a new report, gather product, testing mission, tester, and scope. Propose `<Product> - <mission> - <date>`; accept or rename naturally. For a resumed report, briefly state its title and finding count.
2. **Listen.** Extract what the founder already supplied. A Problem is ready when title, what happened, expected behaviour, impact, reproduction context, and required evidence are known. An Idea is ready when title, desired change, and impact are known.
3. **Clarify.** Ask only the single highest-value missing question. A form-like batch of questions is the failure this conversational loop prevents.
4. **Prepare evidence.** Inspect it for customer data, credentials, or other sensitive information. Always create a separate shareable image for `display`; redact it automatically when clear and ask only when sharing safety is ambiguous. Add a minimal arrow or box when useful. Never pass the original file as `display`.
5. **Save.** Pass the command input over stdin with `--input -`, run `add`, and read the echoed `FINDING_ID`, `HTML`, `PDF`, and `PDF_STATUS`. Show one line: `Saved <id> - <priority> - <title>`. Do not ask for approval before saving; natural corrections use `update`.
6. **Continue.** Accept another finding, pause without ceremony, or run `complete` when the founder says the report is finished. `update` and `update-report` work on completed reports and refresh their PDF.

## Output status

- `SAVED <id>` - finding persisted; include the current PDF path when `PDF_STATUS: current`.
- `PAUSED` - report remains resumable; include its title and PDF path/status.
- `COMPLETE` - report marked complete but reopenable; include its PDF path/status.
- `BLOCKED_PDF` - structured report and HTML are saved, but no current PDF exists; name the renderer failure.
