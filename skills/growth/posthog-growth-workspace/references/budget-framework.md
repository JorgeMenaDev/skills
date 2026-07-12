# Marketing-Budget Framework

Use in `campaign` and `growth-review` modes when the question is where to put money or people. Source: PostHog's public 2026 budget breakdown (Charles Cook, July 2026 — a 215-person, post-PMF, product-led company spending ~$1.2m/month; he frames it as a data point, not a prescription). The dollar figures don't transfer to a small fleet; the decision rules do.

## The channel framework (the reusable core)

New channels earn budget in four steps:

1. **Side project** — someone tries the channel with a small budget.
2. **Verdict** — the side project decides whether the channel broadly works for this product. Record the verdict in `campaigns.md` either way.
3. **Dedicated owner** — only after the verdict, put someone (or a standing agent lane) genuinely good at that channel on it.
4. **Real budget** — scale spend only once the owner exists.

The load-bearing rule: **you need owners to spend more money**. Turning up spend on an unowned channel is the failure mode — PostHog spent $0 on events until the first events hire, even after knowing the channel worked. For an agent-operated fleet, "owner" means a standing lane with cadence and a registry, not a hire — the gate still applies.

## Decision rules that transfer at any size

- **Conversion vs awareness is an explicit split, revisited on repositioning.** Define conversion as spend designed to produce signups directly; awareness as spend making the ICP know you exist. PostHog ran 80/20 and moved to 60/40 when their positioning and ICP changed. Pick a split per product in `strategy.md`; a product with weak activation shouldn't buy awareness.
- **Double down on measured winners** at review time — reallocate toward the channels whose `campaigns.md` outcomes are best, rather than defending last period's allocation.
- **Keep a deliberate non-ROI line.** PostHog budgets ~4% to "do more weird" specifically to counter pure-ROI marketing sucking the life out of the brand. At fleet scale this is permission for one odd experiment per review period without an ROI case.
- **In-house what carries the brand**; outsource what doesn't. The website is a product, not a marketing expense.
- **$0 is a valid line.** PostHog spends nothing on PR, deliberately. An empty channel with a reason beats a token spend.

## Applying it in a session

At `growth-review`, the budget questions are: which channels have verdicts vs are still side projects; does any verdict-positive channel lack an owner (that blocks scaling, per the rule); does the conversion/awareness split still match the product's stage? Answers land as `strategy.md` decisions and `campaigns.md` rows, not a spreadsheet.
