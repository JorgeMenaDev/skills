# Scoreboard

The monthly read that says whether SEO is working, per site and across a hub. Run it in the first days of the month for the month just closed.

1. **Pull the month.** For each site:

   ```bash
   node "$SKILL_DIR/scripts/review-data.mjs" --site <property> --brand "<brand terms>" \
     --month YYYY-MM --out "$SITE_WORKSPACE/reports/data/scoreboard-YYYY-MM"
   ```

2. **Add outcomes.** Qualified outcomes from search (signups, demos, bookings, orders) for the same month, from the product's analytics. With PostHog, the Organic Outcome Bridge in [conversion.md](conversion.md) gives landing-page outcomes. When attribution is missing, write `unknown` and name the gap; a missing number is never zero.
3. **Separate delivery and outcomes.** Count opened, prepared, shipped, won, lost and killed bets from `bets.md`, and distinguish delivery-only wins from measured search/business wins. Report qualified outcomes separately; neither a completed fix nor a lead is automatically a customer. Add actual research/preparation cost and operator handoffs where recorded, with unknowns explicit.
4. **Call the lanes.** For each lane: keep, cut or re-point, with clicks per URL, page age, mature observation windows, role and qualified outcomes behind the call (see [review.md](review.md)). The heuristic is not a deletion or publishing quota.
5. **Write** `reports/scoreboard-YYYY-MM.md`:

   ```md
   # SEO scoreboard: <site>, YYYY-MM
   | Clicks | Non-brand clicks (query rows, coverage) | Impressions | Search outcomes | Shipped / delivery wins / outcome wins / lost / killed |
   - What worked: <prediction supported, evidence and limits>
   - What we stopped or changed: <one line>
   - Focus next month: <one line>
   ## Lanes
   ```

   In a hub, also write `HUB_ROOT/reports/scoreboard-YYYY-MM.md`: one row per registered site, and one sentence naming the site that deserves the next SEO hour and why.

Done when every site in scope has a scoreboard with numbers or named unknowns, and the hub file ranks the sites.
