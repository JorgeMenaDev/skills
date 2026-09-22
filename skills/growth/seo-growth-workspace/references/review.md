# Review

The weekly pass that finds the next bets. It is the main mode; `ship` and `scoreboard` exist to serve it. Research broadly, recommend few.

## 1. Load state

Read `context.md`, `strategy.md`, `bets.md`, the newest `reports/review-*.md` and `research.md`. Owner decisions in `strategy.md` are constraints: a candidate that contradicts one is rejected with that decision as the reason, or raised as a question for the owner. If `archive/v7/backlog.md` exists and no v8 review has read it yet, treat its open rows as candidates for this review only.

Done when you can name the open bets, the owner decisions that constrain this site, and the brand terms.

## 2. Pull the data pack

```bash
node "$SKILL_DIR/scripts/review-data.mjs" --site <property> --brand "<brand terms>" \
  --urls "<home>,<top money page>,<origin>/robots.txt,<origin>/sitemap.xml" \
  --out "$SITE_WORKSPACE/reports/data/review-YYYY-MM-DD"
```

Credentials and property come from `context.md` (hub: the registry row). A failed live check (status not 200 on a page that should be up, a lost canonical, an unexpected `noindex`) is the first candidate and the run status becomes `alerted`. So is a lane with at least 10 clicks in the previous window that lost more than half of them.

When the run exists because traffic dropped, characterise the drop with the diagnosis section of [search-console.md](search-console.md) before going further; the drop is the first candidate.

Done when the pack exists and every live check has a verdict.

## 3. Resolve bets that are due

For each bet whose check date has passed, compare the bet's metric over equal windows before and after its live date, using final data only:

```bash
node "$SKILL_DIR/scripts/gsc-fetch.mjs" --site <property> --start <d> --end <d> \
  --dimensions query,page --filter page:equals:<url>
```

Decide one verdict per bet: `won` (met its success line), `lost` (missed it; say what you learned), `killed` (its kill rule fired) or `extended` (data incomplete; a later date, allowed once). Move resolved bets to Closed with one line and the report link.

## 4. Shortlist

Write five to ten candidates, drawn from at least three kinds:

| Kind | Where it shows up |
| --- | --- |
| `gap` | Demand with no page that answers it: queries landing on a loosely related page, competitor pages, product capabilities nobody searches for yet on your site |
| `underperformer` | A page with demand but few clicks: page-one low CTR, page two, split across pages |
| `protect` | A page that already wins and is slipping, or a change that would put it at risk |
| `defect` | Access, indexing, redirect or rendering problem that costs visits |
| `conversion` | Visitors arrive and do not take the next step |
| `authority` | Listings, links, partner pages and AI-answer sources that would send visitors or trust |
| `cut` | A lane whose clicks per URL do not justify what it costs (see step 5) |

For each candidate record: evidence (with its label), the demand it serves, the mechanism (new ranking, better position, more clicks at the same position, more conversions, referral traffic), a size scenario, effort, confidence and who it reaches. Before ranking, run the lookup that would change a row's place: a live result check with `serp.mjs` for any ranking claim, a `demand.mjs` volume for a `gap`. Check `research.md` first and reuse anything under 30 days old. Default budget per review: ten live checks and one demand request, unless `context.md` sets another.

Done when every row has a mechanism, a size (a number or a stated direction with its reason) and evidence labels.

## 5. Judge the lanes

For each lane in the pack: URLs, clicks, clicks per URL per month. A lane with ten or more URLs that earns under one click per URL per month for two reviews in a row becomes a `cut` candidate: stop adding to it, re-point it at measured demand, or consolidate. The threshold is a local heuristic that forces the question; the answer is a judgment with reasons. A content engine that keeps publishing into a failing lane is the most common case.

## 6. Choose

Pick one to three bets. Prefer a bounded change that fixes a demonstrated problem for people likely to buy, with a credible path to a meaningful gain. A real access or indexing defect, or a measurable loss, goes first. Raw volume with a weak diagnosis does not win by itself; neither does ease.

Then argue for the strongest rejected candidate as if you had to ship it. If it wins, swap. Write one sentence on why the leader beats the runner-up; it goes in the report. Every other candidate lands in "What else we checked" with a real reason. "Later" is not a reason; "a quarter of the leader's demand and already sixth" is.

## 7. Write bets, report and log

Add each chosen bet to `bets.md`:

```md
### B-012 One page per mining mandante platform
- Kind: gap · Status: proposed · Opened: YYYY-MM-DD · Evidence: reports/review-YYYY-MM-DD.md
- Hypothesis: A dedicated SGCAS Collahuasi guide ranks top 5 for "sgcas collahuasi" (observed 19 impressions/28 days at 9.2; live check: official site, Scribd and YouTube only).
- Ship: page + internal links from the mining page; pages.md launch gates.
- Success: 20+ clicks per month across the three pages by the check date. Kill: under 5 clicks by then, with impressions flat.
- Check: live date + 42 days.
```

Status moves `proposed → approved → live → won | lost | killed`. Approval follows the boundary in `context.md`; without one, the owner approves. Keep each bet under ten lines; evidence lives in the report.

Write `reports/review-YYYY-MM-DD.md`:

```md
# SEO review: <site>, YYYY-MM-DD

## Your next SEO move
- <the first action, who does it>
- <the next action, if any>
- <what is working and should be left alone>

## Numbers (28 days vs previous 28)
<clicks, impressions, non-brand clicks with query-row coverage, lane table with calls>

## Bets
### B-NNN <action>
- Do this: <two to four bullets, starting with a verb>
- Why: <gap observed, who searches, size scenario, main uncertainty>
- Check: <date, metric, success line, kill rule>

## Resolved bets
## What else we checked
| Candidate | What we found | Decision |
## How this was made
<data windows, tools, live checks with query, country, language and time, costs, limits>
```

Keep the first section to three bullets a busy owner can act on. Append a `log.md` entry of two to four sentences in plain prose: what the review found, what it chose, what it needs from the owner.

Done when the report, `bets.md` and the log agree, and every shortlist row is either a bet or a "What else we checked" row.
