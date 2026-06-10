# Local Adapters

Use when installing or running this skill in a repo that already has project-specific SEO automation, content engines, publisher workflows, or local skill customizations.

The portable skill should stay generic. Project-specific adapters should be explicit, preserved, and documented outside the portable release surface.

## Adapter Locations

Prefer this order:

1. `.seo/adapters/<name>.md` for repo-local operating notes and project-specific bridges.
2. `.seo/strategy.md` for durable decisions and tool ownership.
3. `.agents/product-marketing.md` for product, ICP, positioning, proof, and voice.

Avoid putting project-specific adapters inside `.agents/skills/seo-growth-workspace/references/` unless the skill copy is intentionally private to that repo. Generic reinstalls can replace the skill folder.

## Before Replacing A Repo-Local Skill Copy

Do not replace an existing `.agents/skills/seo-growth-workspace` folder blindly.

1. Inventory files that are not part of the portable package.
2. Preserve useful project-specific notes in `.seo/adapters/` or `.seo/strategy.md`.
3. Run the clean exporter instead of raw copy commands:

```bash
bun skills/growth/seo-growth-workspace/scripts/export-clean-skill.mjs --target /path/to/repo --dry-run
bun skills/growth/seo-growth-workspace/scripts/export-clean-skill.mjs --target /path/to/repo --force
```

4. Validate the installed copy:

```bash
bun /path/to/repo/.agents/skills/seo-growth-workspace/scripts/validate-skill.mjs
```

## Content Engine Adapters

When the target has a content engine, CMS, publisher bot, or app-owned workflow:

- Treat the skill as the strategist/operator layer.
- Treat the app/CMS/publisher as the execution layer.
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
| No-secret rule | Which env var names may be referenced without printing values |

## Friction To Record

If an adapter is missing or unclear, record it in the run report:

| Surface | Missing adapter detail | Impact | Suggested home |
| --- | --- | --- | --- |

Good adapter notes explain how to prove reality in that repo. They should not duplicate the whole skill.
