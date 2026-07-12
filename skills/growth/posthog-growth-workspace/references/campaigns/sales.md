# Campaign Play: Sales

Use for outbound motions and sales collateral — prospecting, cold outreach, and the assets that help deals close. Product usage data is this play's unfair advantage: PostHog tells you which accounts hit the value moment (product-qualified leads) and which usage patterns precede expansion — start outbound there before buying lists.

## Prospecting (list quality beats volume)

1. **ICP with a "why now"**: firmographic fit + a **buying signal** (trigger event: team growth, new hire, incident, competitor move) + named decision-maker profile + explicit disqualifiers. ICP fit alone is never Hot — the signal makes the timing.
2. **Source 2–3× the target** from 2+ cross-verifying sources; 25 verified leads beat 250 junk. Every claim carries a source URL and date; verify email deliverability before listing.
3. **Score**: Hot = fit + clear signal + accessible decision-maker + verified contact; Warm = fit + soft signal; Skip = any disqualifier. Target roughly 20% hot.
4. Compliance: public business contacts only, no bulk scraping, keep source lineage per contact.

## Cold email

- Write like a peer (read-aloud test); every sentence earns its place; you/your over I/we; **one interest-based CTA** ("Worth exploring?") beats a meeting ask.
- **Brevity is a measured lever**: 25–75 words. Personalization must connect to the *problem* — if deleting the opener leaves the email intact, it was an attention hack. The 3-minute system: pre-rank your top buying signals, keep a 3-sentence skeleton (signal-hooked observation / problem / one-line solution + soft CTA), pre-write trigger paragraphs.
- Subject lines: 2–4 words, lowercase, internal camouflage — it should look like a colleague sent it.
- **Follow-up wins the majority of replies**: cap at 5 total, widening cadence (~day 0/3/7/14/21), each touch a genuinely new angle (value piece → proof → insight → breakup). The breakup email out-performs; if you send it, honor it. Never "just checking in".
- Benchmarks are directional and decay ~15%/year: good ≈ 40%+ open, 10%+ reply; ≤50 contacts per tight campaign out-replies spray. Log campaign → reply → meeting → close in `campaigns.md`, not in memory.

## Collateral (build what reps — or the founder — actually use)

- **Deck arc** (10–12 slides): current-world problem → its cost → the shift creating urgency → your approach → 3–4 *workflows* (never a feature tour) → proof → one customer story → timeline → ROI → pricing → next steps. One idea per slide; customize per buyer (technical → architecture/security; economic → payback/risk; champion → internal-selling ammo).
- **One-pager**: problem in one sentence → solution → 3 differentiators → one strong proof point → CTA with a named human. Scannable in 30 seconds; its jobs are post-meeting recap and champion forwarding.
- **Objection library**: per objection — exact phrasing, *the real concern underneath*, acknowledge-and-redirect, proof point, forward-moving question. The load-bearing reframes: "too expensive" → "compared to what? what does the problem cost today?"; "we use X" → "how's that working for [specific pain]?" (never trash the rival); "need to ask my boss" → arm the champion.
- **Demo discipline**: demo after discovery, never before; open by recapping *their* priorities; show 3–4 workflows mapped to their pain; a demo where the prospect doesn't talk doesn't close.
- **ROI calculator**: their inputs (time on manual work, tool costs, team size) → your value formula → ROI %, payback months. Claims obey the honesty rules (`positioning.md`) — numbers a skeptic can check.

## Product-led sales signals (the PostHog loop)

Define PQL criteria as events (activation event + usage depth + team breadth), query them on cadence (cookbook), and feed Hot rows into the outreach list with the usage fact as the opener's signal — "your team ran 40 reports last week" is the personalization level that actually moves replies. Expansion mirror: usage approaching plan limits is a warm upgrade conversation, not a paywall surprise.

---
*Frameworks adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT, © 2025 Corey Haines).*
