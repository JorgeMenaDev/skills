# Ship

Carry a chosen bet to **finished** in the run that chose it. A review invokes this method directly; preparing the work needs no second request.

## Finished

A chosen bet ends the run in exactly one of three states. Name the state and its proof in the bet's `Finished` line.

| State | Meaning | Proof |
| --- | --- | --- |
| `live` | Delivered and verified | Live URL, commit or admin readback; baseline and check date (step 5) |
| `package` | Every step up to execution is done; an owner or decision executes it | The package at a named location, the remaining gate and the owner's exact next action |
| `evidence request` | The work depends on proof this run cannot obtain | The collection already attempted, the exact question or test, its owner and how the answer changes the package |

A package holds the work itself, ready to execute without further writing:

| Work | Package | Method |
| --- | --- | --- |
| Page or tool | Complete draft or build as an engine revision, PR or file; its page evidence record; exact link edits; CTA and destination | [content-ops.md](content-ops.md), [pages.md](pages.md) |
| Engine content | The engine revision, or its complete draft text or exact revision edits ready to enter through the engine's supported fields | [content-engine-webhooks.md](content-engine-webhooks.md) |
| Authority or local | Exact profile edit, listing correction, asset or individual message text; eligibility evidence; destination and follow-up | [backlinks-entity.md](backlinks-entity.md), [local-seo-gbp.md](local-seo-gbp.md) |
| Technical or admin | Exact diff, PR or setting value; expected effect and the check that confirms it | The owning domain reference |
| Conversion | Exact copy or code change to the path; the event that measures it | [conversion.md](conversion.md) |

Outlines, briefs, prospect lists, calendar rows and instructions to write something are inputs to a package.

## Steps

1. **Establish authority and destination.** Read the bet, current focus, the site's approval boundary and owner decisions. Reuse granted authorization; a scheduled run has no extra authority. A new public action needs the applicable approval, and outreach needs explicit authorization. Keep exact-revision review, product PR/merge ownership and engine restrictions where the site requires them.
2. **Build the package** for the work the bet needs, from the table above, through the product repository's normal branch and review process or the engine's native records.
3. **Connect distribution and conversion.** Name how the intended customer reaches the work and the next action they take. For pages, inspect relevant incoming and outgoing links with [internal-linking.md](internal-linking.md). Choose proportionate distribution; outreach is one option among several.
4. **Execute through the owner and pass the gates.** Every new or materially revised public page passes [pages.md](pages.md); commercial pages also pass [commercial-integrity.md](commercial-integrity.md). Run applicable checks and inspect the rendered result. For admin changes, read back the setting. When another actor or decision executes, the bet ends as a `package` with status `proposed` or `approved`.
5. **Record delivery and measurement separately.** Only verified delivery makes the bet `live`. Add live date, URL/commit/admin readback, and its metric over the preceding 28 days of final data. A genuinely new URL has no prior URL performance; verify available history and keep unavailable metrics unknown. Check existing-page outcomes at live date + 28 days, new-page outcomes + 42 days, unless a justified bet-specific window was recorded. Delivery defects can be checked immediately. Record overlapping changes and attribution limits.
6. **Log the result and next owner.** Two or three sentences: the finished state, its proof and the next decision. The next review follows up every open `package` and `evidence request`.

Done when the bet is finished.
