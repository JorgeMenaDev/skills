# Extraction playbook

Fan out read-only subagents (Explore-type where available). Each returns findings **with file paths**; a finding without a path is discarded. Scale to repo size: small repo → one agent does all four sweeps.

## Sweep 1 — Tokens & theming

Where design values actually live: Tailwind config / `globals.css` `@theme` / CSS custom properties / styled-system theme / native design tokens. Capture: color tokens (semantic names + values), font families and where they're loaded, radius/spacing scales, dark-mode strategy (class, media, forced), shadow/elevation utilities. Also capture the *anti-inventory*: raw hex values and ad-hoc fonts used outside the token system (these are drift evidence).

## Sweep 2 — Component inventory

The real primitives: `components/ui/*` (shadcn-likes), house components above them (page shells, headers, switchers, empty states, data tables), and per-framework equivalents. For each: path, what it does in one line, notable props/variants. Note which primitives are *duplicated* (two buttons, three card styles) — duplication marks a system boundary.

## Sweep 3 — Page patterns

How pages are actually composed: layout/shell chain per route group, the standard page wrapper (container widths, heading scale, spacing rhythm), form/create-flow pattern, empty-state pattern, navigation pattern. Cite 2–3 exemplar pages per pattern — the best existing page IS the pattern.

## Sweep 4 — Surface census

Walk the route tree (or page inventory). Attribute every user-facing surface to a visual language: name each language by its signature (e.g. "warm-paper shadcn", "mono-font dark brutalist", "legacy bootstrap-ish"). Output a table: route/surface → language → evidence path. This sweep is what finds the "three design systems on one site" problem — completeness matters more than depth here.

## Interview inputs

From the sweeps, prepare for the user: one screenshot-able exemplar route per detected language, the duplicated-primitive list, and any surface whose language you could not classify. Ask with concrete options, never "what's your design system?" in the abstract.
