# Portfolio Registry

Use when a request spans more than one site ("across my sites", "all my products", "which site needs SEO work"), names a site that does not resolve to the current working directory, or when a scheduled run needs to know which targets exist. Single-site work in the site's own repo does not need the registry.

The skill is a single-site operator; the registry is the map that makes it addressable across a portfolio. The registry itself is **consumer-owned**: this file defines only its shape and reading rules. Never hardcode a specific user's site list, paths, or credential locations into this skill.

## Read-First Rule

On any multi-site or by-name request: locate and read the registry **before** asking the user where things live, and before touching any workspace. Resolve the named site to its row; operate that row's workspace exactly as if the run had started there.

Registry locations to check, in order:

1. The path the invoking prompt or agent profile names (for agent-profile consumers, the convention is an `.agents/seo/REGISTRY.md` in the profile or org repo).
2. `.seo/registry.md` in the current repo (a repo that fronts several sites).
3. If none exists and the request is multi-site: offer to create one from the shape below, pre-filled with what the conversation and existing `.seo/` workspaces reveal. Do not iterate a portfolio from memory.

## Row Shape

One row per property. Columns are mandatory even when the value is `unknown` — an honest `unknown` is routable, a missing column is not.

```md
| Site | Workspace root | GSC property | Credentials | Market / language | Publish gate | Notes |
|---|---|---|---|---|---|---|
| example.com | ~/dev/code/example | sc-domain:example.com | GSC_CREDENTIALS_DIR=<credential-home>/example-gsc | UK / en-GB | human approves all publishes | content engine: webhook |
```

- **Site** — the public hostname (the identity users and reports use).
- **Workspace root** — where the site's workspace lives: the site's repo (containing `.seo/`), a hub-relative `sites/<slug>` folder (see Hub Registries), or an external root for partner-owned or repo-less sites (`SKILL.md` workspace rules apply).
- **GSC property** — the exact property string including its form, `sc-domain:example.com` or `https://example.com/` (the wrong form 403s; see Property String Forms in `references/search-console.md`).
- **Credentials** — the *location only*: an env var name, a credentials-dir path, or `none yet`. Never a value, never a token. The registry records that access exists and where the scripts should look, nothing more.
- **Market / language** — primary market and locale(s); multilingual sites list each lane.
- **Publish gate** — who or what approves outbound content for this site (a human, a review step, or `blocked: no publish path`). Scheduled runs treat this column as part of the mutation ceiling (`references/scheduled-operation.md`).
- **Notes** — content-engine wiring, adapters, quirks; link the site's `.seo/adapters/` note rather than restating it.

## Hub Registries

In hub mode (`references/hub-mode.md`), the registry is a first-class hub file at `<hub>/.seo/registry.md` (location 2 above). Hub-managed sites set Workspace root to `sites/<slug>` — **relative workspace roots resolve against the registry file's own directory**, so `sites/andy-partner` in `<hub>/.seo/registry.md` means `<hub>/.seo/sites/andy-partner/`. Absolute or `~`-prefixed roots stay valid for sites that keep their own repo-local `.seo/` or live on partner-owned paths.

```md
| andy-partner.com | sites/andy-partner | sc-domain:andy-partner.com | GSC_CREDENTIALS_DIR=<credential-home>/andy-partner-gsc | CR / es-CR | human approves all publishes | hub-managed |
```

## Portfolio Iteration

- One target per run: iterate registry rows as separate runs (or separate script invocations), never one blended workspace. Ticket IDs, logs, and reports stay per-site.
- Per-site monthly reports follow `references/monthly-reporting.md`; a portfolio pass writes one dated report per site, then one portfolio index from `templates/portfolio-index.md` linking them.
- For a ranked "which site deserves the next hour" view, run `node "$SKILL_DIR/scripts/portfolio-status.mjs" --registry <file>` — it reads each row's workspace and emits a ranked table (last-touched, open P0/P1, staleness, top opportunity). Treat its output as evidence for prioritization, not as the decision itself: a cold workspace on a revenue-critical site outranks a warm one on an experiment.
- Rows with `unknown` credentials or `blocked` publish gates are still iterated for read-only checks; the gaps land in `needs_human`, not silently skipped.

## Exit Criteria

A multi-site request exits cleanly when the registry was read (or created) before any site work, every named site resolved to a row, each operated site was handled in its own workspace under its own row's constraints, and any registry drift discovered (moved repo, changed property, dead credentials) was corrected in the registry in the same pass.
