# Evidence Conventions

Use this vocabulary from the specialist workflow that linked here. Specialist references own their domain-specific states and fields.

## Evidence states

- **Reported** — stated by a customer, stakeholder, platform, or other identified source.
- **Observed** — directly inspected or measured in the declared sample.
- **Third-party estimate** — modelled or supplied by a third party; assumptions and coverage are stated.
- **Inference** — a reasoned interpretation of reported, observed, or estimated evidence, not a direct fact.
- **Action completed** — a dated intervention or completed task, separate from its result.
- **Outcome** — a later observed result; the label alone never establishes causation.

## Loop evidence tiers

Use these provenance labels when a loop gate or configurable default needs to distinguish evidence strength:

- `[E]` — established evidence, such as a first-party observation or a documented external standard.
- `[P]` — practitioner or platform consensus, clearly attributed and dated.
- `[H]` — hypothesis or skill default; configurable and never a universal standard.
- `[V]` — vendor marketing or an unverified vendor claim; configurable and never a universal standard.

`[H]` and `[V]` can support a labeled research lead, but cannot independently qualify an implementation ticket. Keep the underlying source and date in the evidence record.

## Non-causal outcome ladder

Keep each rung distinct: exposure → mention → citation → referral/session → qualified conversion → customer → revenue. No arrow implies causation.

## Provenance fields

Every material evidence record identifies: source/provider; observation date or period; sample/query set; locale, device, and account state where relevant; owner; limitations; and recheck date. Preserve verbatim inputs and the stored artifact path where reproducibility depends on them.

## Buyer stages

Use **Discovery**, **Research**, **Comparison**, **Trust validation**, **Action**, and **Retention/referral** when supported. Use **Unknown** when the buyer stage or journey is not evidenced; this buyer-stage value is distinct from the lifecycle `stage: unknown` context stamp in `references/phase-architecture.md`. Site-specific stage notes are allowed, but never infer a stage merely to fill a field.
