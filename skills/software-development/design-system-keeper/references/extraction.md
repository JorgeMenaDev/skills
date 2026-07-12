# Extraction playbook

Fan out read-only subagents (Explore-type where available). Each returns findings **with file paths**; a finding without a path is discarded. Scale to repo size: small repo → one agent does all four sweeps.

## Sweep 1 — Tokens & theming

Where design values actually live: Tailwind config / `globals.css` `@theme` / CSS custom properties / styled-system theme / native design tokens. Capture: color tokens (semantic names + values), font families and where they're loaded, radius/spacing scales, dark-mode strategy (class, media, forced), shadow/elevation utilities. Also capture the *anti-inventory*: raw hex values and ad-hoc fonts used outside the token system (these are drift evidence).

## Sweep 2 — Component inventory

The real primitives: `components/ui/*` (shadcn-likes), house components above them (page shells, headers, switchers, empty states, data tables), and per-framework equivalents. For each: path, what it does in one line, notable props/variants. Note which primitives are *duplicated* (two buttons, three card styles) — duplication marks a system boundary. Also list *dead* styled components — imported by nothing routed. They're a drift seed-bank (the next agent greps, finds one, and copies its legacy styling), so the canon must name them for deletion, not skip them.

## Sweep 3 — Page patterns

How pages are actually composed: layout/shell chain per route group, the standard page wrapper (container widths, heading scale, spacing rhythm), form/create-flow pattern, empty-state pattern, navigation pattern. Cite 2–3 exemplar pages per pattern — the best existing page IS the pattern.

## Sweep 4 — Surface census

Walk the route tree (or page inventory). Attribute every user-facing surface to a visual language: name each language by its signature (e.g. "warm-paper shadcn", "mono-font dark brutalist", "legacy bootstrap-ish"). Output a table: route/surface → language → evidence path. This sweep is what finds the "three design systems on one site" problem — completeness matters more than depth here.

Two attribution traps, both hit on real runs:

- **Within-page mixing.** A route is not one language: classify chrome (header/footer/nav) and body separately. A legacy navbar wrapping a newer body (or vice versa) is often the single most load-bearing finding — it changes what "migrate this page" means. Flag every route whose chrome and body diverge.
- **Non-route surfaces.** The census isn't done at the route tree: 404/error/not-found pages (including *missing* ones that fall through to framework defaults), modals and drawers that portal outside a scoped style boundary, transactional email templates, and third-party embeds that take theme config (booking widgets, chat bubbles, checkout — grep for brand-color/theme options in hooks and config). An off-canon accent in a booking embed sits in the highest-intent funnel and no route walk will find it.

## Interview inputs

From the sweeps, prepare for the user: one screenshot-able exemplar route per detected language, the duplicated-primitive list, and any surface whose language you could not classify. Ask with concrete options, never "what's your design system?" in the abstract.

Users identify surfaces by what they see on the live site, not by component file names. When two components fill the same slot (two navbars, two footers), asking "is navbar.tsx legacy?" invites a wrong answer — the user pictures the navbar they like on the homepage and says "keep it," meaning a different component. Present same-slot look-alikes side by side (sketch each one's signature) and say **which routes render each**; only then ask which is legacy. If an answer comes back uncertain ("I think so?") over a factual mix-up you can resolve, resolve it with evidence and re-ask that one question — the legacy verdict must be the user's, made on correct facts.
