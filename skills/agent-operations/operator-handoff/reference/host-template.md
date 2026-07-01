# HOST.md Template

The host profile carries every machine-, account-, or repo-specific fact the protocol needs —
the skill itself stays generic. Write it to `.agents/operator/HOST.md`, keep it committed
(add a gitignore exception if `.agents/operator/` is ignored: `!.agents/operator/HOST.md`),
and keep it short — both roles read it in full before every job. Delete sections that don't
apply; add ones the repo needs. When a job reveals a missing host fact, add it here.

```markdown
# Operator Host Profile — <repo name>

## Requester

- Jobs are signed: **Requested by:** <name — e.g. "Matias (coordinator profile)" or "Claude (<branch>, <task>)">

## Operator environment

- Machine: <e.g. "Jorge's Mac — macOS computer-use agent (`computer_use` tool + `macos-computer-use` skill)">
- Supervising human (credentials, 2FA, approvals): <name>

## Secrets destinations (the only legal ones)

- <e.g. `.env.local` at repo root>
- <e.g. Convex env — `bunx convex env set`>
- <e.g. a password manager the human points to>

## App under test  <!-- delete if this repo has no app -->

- URL: <e.g. `https://app.localhost:1355` (must already be running)>
- Sign in: <path + actor, e.g. `/sign-in` → "<button label>">
- Fixtures / preconditions: <command or "per job">

## Review gate for `code` jobs  <!-- delete if code jobs never happen here -->

- `<exact command>` — loop fix → re-run until clean; a `code` job is not done while it's red.

## Conventions

- <package manager, test policy (e.g. no new test files), commit trailer, CLAUDE.md pointers>

## Typical jobs here

- <which kinds dominate + 2–3 real examples, e.g. "mostly `generic` desktop errands: OBS setup, HMRC dashboards">
```
