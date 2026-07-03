# Installing the pipeline in a new repo

Copy-adapt from an existing registered repo. Rule of three: copy-paste for the second repo; the third copy is the trigger to extract a template repo / reusable workflow — record that decision when it happens, don't drift into it.

## Components

1. **`.sandcastle/`** — phase scripts + prompts (implement, verify, write-pr, recap) and a README documenting the phase contracts. Adapt per repo: build/check commands, dev-server startup, viewport matrix, locales. Phase contracts are monopolies — implement builds (lint + production build is its whole gate), verify audits in a real browser and owns all evidence, write-pr narrates, recap illustrates. Blurring them re-creates duplicate work.
2. **Workflow** (`.github/workflows/agent-implement.yml`) — the label state machine + phases + the Pipeline Flags parser (contract in [brief-template.md](brief-template.md)). **Recap runs as a separate best-effort job on `ubuntu-latest`, dispatched when the draft PR opens — never inside the implement job.** A single-slot self-hosted runner must free the moment the draft PR exists; nothing non-gating runs before the PR.
3. **Labels** — trigger label(s) per lane (e.g. `agent:implement` cloud, `agent:implement-local` self-hosted) plus state labels (`agent:in-progress`, `agent:blocked`).
4. **Secrets** — the harness OAuth token; a user PAT for PR creation (orgs commonly disallow Actions-created PRs, and pushes touching `.github/workflows/` need it too); recap app URL + token if recap is wired.
5. **Local lane (optional)** — self-hosted runner + a Docker image with the harness CLI, runtime, `gh`, and browser tooling baked in; an env switch set from the trigger label picks sandboxing per lane. A persistent runner on real hardware must not run agents unsandboxed.

## Performance defaults (bake in from day one)

- Pin every CLI the workflow installs — never `@latest`. Cache or bake browsers into the image / actions cache; never install a browser the environment already has.
- Any short-circuit gate (e.g. tiny-diff recap skip) runs **before** the installs it would skip, and excludes committed evidence directories from its diff calculation — screenshots must not defeat the gate.
- Emit per-subphase timing lines (sandbox setup, installs, build reuse, agent run, publish) so the next optimization pass measures instead of guessing.

## Last step — always

Add or update the repo's row in the consumer's `.agents/afk-pipeline/REGISTRY.md`. A row is a **routing cache, not truth**: repo, trigger labels, default lane, local clone path, and a pointer to the repo's `.sandcastle/README.md` for mechanics. Keep rows thin; mechanics stay in the repo. When in doubt whether a registry row is still true, verify the workflow file exists (`gh api repos/<owner>/<repo>/contents/.github/workflows/agent-implement.yml`) rather than trusting the row. This step also closes every lane/secret/label change — a registry edit is part of the change, not follow-up.
