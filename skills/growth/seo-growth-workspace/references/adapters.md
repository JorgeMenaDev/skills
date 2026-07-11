# Local Adapters

Use when installing or running this skill in a repo that already has project-specific SEO automation, content engines, publisher workflows, or local skill customizations.

The portable skill should stay generic. Project-specific adapters should be explicit, preserved, and documented outside the portable release surface.

## Adapter Locations

Prefer this order:

1. `.seo/adapters/<name>.md` for repo-local operating notes and project-specific bridges (in hub mode, per-site: `.seo/sites/<slug>/adapters/<name>.md`).
2. `.seo/strategy.md` for durable decisions and tool ownership.
3. The repo's own product/positioning doc for product, ICP, positioning, proof, and voice (for example `.agents/product-marketing.md` if the repo keeps one).

Avoid putting project-specific adapters inside `.agents/skills/seo-growth-workspace/references/` unless the skill copy is intentionally private to that repo. Generic reinstalls can replace the skill folder.

## Before Replacing A Repo-Local Skill Copy

Do not replace an existing `.agents/skills/seo-growth-workspace` folder blindly.

1. Inventory files that are not part of the portable package.
2. Preserve useful project-specific notes in `.seo/adapters/` or `.seo/strategy.md`.
3. Reinstall through the skills installer the repo already uses (for example `npx skills@latest add <owner>/<repo> --skill seo-growth-workspace`), then confirm the preserved notes still exist. Maintainers working from the authoring repo can use its dev exporter instead.

## Content Engine Adapters

When the target has a content engine, CMS, publisher bot, or app-owned workflow:

- Treat the skill as the strategist/operator layer.
- Treat the app/CMS/publisher as the execution layer.
- For engines that push articles by webhook, use `references/content-engine-webhooks.md` for the receiver contract and verification gates.
- Map `.seo/backlog.md` content tickets to the target's native project, keyword, calendar, article, or publish artifacts.
- Verify backend/CLI state and authenticated UI state agree before marking content work complete.
- Keep reconciliation/publish mutations behind explicit owner approval and dry-run proof when the target supports it.

Before content work is considered actionable, create or locate an adapter with:

| Field | Required detail |
| --- | --- |
| Read-only status | Commands, UI routes, or files that show current project/keyword/calendar/article state |
| Dry-run proof | Commands that validate planned imports, publishing, reconciliation, or pSEO batches without mutation |
| Mutation commands | Exact commands or admin actions that require explicit approval |
| UI proof | Authenticated or public routes that must agree with CLI/API state |
| Source of truth | Which system owns project, keyword, calendar, article, publish, and reconciliation state |
| Environment boundary | Local vs production deployment, workspace/team, Convex/Vercel/CMS target, and known mismatch risks |
| CLI access state | When the engine exposes a CLI: CLI name + version, auth mechanism and its location (env var names / config file paths only, never values), the workspace → project mapping the credential covers, and the probe command (e.g. `whoami`) that proves this installation is authenticated |
| No-secret rule | Which env var names may be referenced without printing values |

### Provenance adapter fields

For new or materially revised SEO pages, the adapter must also map the provider-neutral [Page Evidence](page-evidence.md) contract:

| Field | Required detail |
| --- | --- |
| Provenance system of record | The engine-native revision store and stable revision locator; if none exists, state that the dated no-engine fallback is authoritative |
| Verification / publish gate | How claim support, information gain, authorized inputs, rights snapshots, and exact-revision human approval block publication |
| Public citation transport | How citations move from the authoritative revision through payload/storage to the rendered page |
| Reverification owner | Who or what rechecks time-sensitive claims and failed/stale evidence, including trigger and destination |
| Legacy behavior | How pages with unavailable provenance are represented without invented mappings or mandatory back-fill |

When the engine has native revision evidence, keep it authoritative and do not create a second Markdown record. The adapter maps local field names to the contract; the portable contract does not require vendor-specific field names or unproven structured webhook fields.

The first run that proves engine-CLI access must record that CLI access state in the site's adapter note and mirror it in the registry Credentials column (hub mode). Later runs answer "does this machine have engine access, and to which projects?" by reading the workspace — never by re-exploring or falling back to the browser.

## Friction To Record

If an adapter is missing or unclear, record it in the run report:

| Surface | Missing adapter detail | Impact | Suggested home |
| --- | --- | --- | --- |

Good adapter notes explain how to prove reality in that repo. They should not duplicate the whole skill.
