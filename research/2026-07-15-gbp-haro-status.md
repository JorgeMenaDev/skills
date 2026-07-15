# GBP representation guidance + HARO/Qwoted/SOS live status — observed 2026-07-15

Research capture for [JorgeMenaDev/skills#129](https://github.com/JorgeMenaDev/skills/issues/129) (child of map #127; feeds #124 wording and the #125 guard). All quotes below were taken from live fetches on **2026-07-15**. Official primary sources only; anything not directly observed is labeled.

## 1. Google — "Guidelines for representing your business on Google"

- **URL:** https://support.google.com/business/answer/3038177?hl=en
- **Observed:** 2026-07-15 (direct HTTPS fetch of the live support page; quotes verified verbatim against the raw page text)

**Verdict: yes.** The page still states one profile per business as the default and still documents separate eligibility for chains, departments, and individual practitioners.

### One profile per business (default)

> "There should only be one profile per business, as this can cause problems with how your information displays on Google Maps and Search."

> "Do not create more than one page for each location of your business, either in a single account or multiple accounts. Individual practitioners and departments within businesses, universities, hospitals, and government buildings may have separate pages."

> "There are additional guidelines for multi-location stores (chains and brands), departments, and individual practitioners (such as doctors, lawyers, and real estate agents) below."

### Service-area businesses (SABs)

> "Service-area businesses, or businesses that serve customers at their locations, should have one profile for the central office or location with a designated service area."

> "If your business doesn't have a storefront with clear signage but travels to customers at their physical locations, you're allowed one service-area Business Profile. If you have different locations for your service business, with separate service areas and separate staff at each location, you're allowed one profile for each location."

> "The boundaries of your profile's overall service area shouldn't extend farther than about 2 hours of driving time from where your business is based. For some businesses, larger service areas may be appropriate."

> "If you're a service-area business, you should hide your business address from customers. For example, if you're a plumber and run your business from your residential address, clear the address from your Business Profile."

### Departments

> "Departments within businesses, universities, hospitals, and government institutions may have their own Business Profiles on Google."

> "Publicly-facing departments that operate as distinct entities should have their own page. The exact name of each department must be different from that of the main business and that of other departments."

### Individual practitioners

> "An individual practitioner is a public-facing professional, typically with their own customer base. Doctors, dentists, lawyers, financial planners, and insurance or real estate agents are all individual practitioners."

> "An individual practitioner should create their own dedicated Business Profile if: They operate in a public-facing role. Support staff should not create their own Business Profiles. They can be contacted directly at the verified location during stated hours."

> "A practitioner shouldn't have multiple Business Profiles to cover all of their specializations. Sales associates or lead generation agents for corporations aren't individual practitioners and aren't eligible for a Business Profile."

## 2. HARO — live under Featured

- **URLs:** https://www.helpareporter.com/ and https://www.helpareporter.com/about
- **Observed:** 2026-07-15

**Access caveat:** helpareporter.com serves a Vercel Security Checkpoint (HTTP 429 + JS challenge) to non-JS clients; plain `curl` and simple fetchers are blocked. Content below was captured with a real headless browser that passed the challenge. Future automated availability checks must account for this — a 429 to a plain fetch is *not* evidence the service is down.

**Verdict: live.** The homepage is a functioning HARO site with a live source-subscription form (an email input named `email` with placeholder "Add an email address" and a "Sign Up" submit button). Observed, not exercised: no test subscription was submitted, so end-to-end delivery of digests is **unverified**.

Homepage text (verbatim):

> "HARO connects journalists with sources for stories. Subscribe for free daily media queries. Sign Up"

> "Powered by Featured, your AI co-pilot for PR"

> "Want HARO queries in a platform? Try Connectively" *(banner linking to connectively.us — Featured appears to also operate a platform under the revived Connectively name)*

About page (verbatim):

> "In April 2025, HARO was acquired by Featured.com. The platform returns to HARO's roots: a free, straightforward email newsletter that puts reporters directly in touch with experts — with modern safeguards against spam and AI-generated content."

> "2024 — Cision rebrands HARO as \"Connectively,\" then permanently shuts the platform down in December. 2025 — Featured.com acquires HARO, restoring the free email model with modern anti-spam tools."

> "Registered sources receive up to three email digests per day, Monday through Friday, containing all active journalist queries."

The About page also claims "800K+ Registered Sources" and "75K+ Journalists & Bloggers" — first-party marketing figures, unverified.

## 3. Qwoted and Source of Sources

### Qwoted — https://www.qwoted.com/ — observed 2026-07-15

**Verdict: operating.** Live marketing site with headline "Where newsmakers connect.", multiple "Join for FREE" signup CTAs, active navigation for journalists/PR/experts, and a current copyright notice "© 2026 Qwoted, Inc." No maintenance or shutdown notices observed. (Captured via fetch-and-summarize; signup not exercised.)

### Source of Sources (SOS) — https://www.sourceofsources.com/ — observed 2026-07-15

**Verdict: operating.** Live site with headline "The Best way to Connect Reporters and Trusted Experts", a free source-registration form, a journalist query-submission form, and the stated model: "Up to three times a day, you'll get an email with queries by journalists from various media outlets." Ground rules present ("If you reply off-topic or spam reporters, you will be removed from the list. No exceptions, no appeals."). Current 2026 copyright; no shutdown indicators. (Captured via fetch-and-summarize; signup not exercised.)

## Implications for #124 (replacement wording)

- **No contradiction.** The proposed replacement is accurate as written: HARO relaunched under Featured (April 2025 acquisition confirmed on the official About page), free email-digest model, and Qwoted and SOS both operate as alternatives.
- The observation date in the wording can be refreshed to 2026-07-15 (or kept at 2026-07-14 with this capture as corroboration).
- **Suggested strengthening:** the "verify current official availability at use time" clause should tolerate bot protection — helpareporter.com 429s plain HTTP clients, so a naive automated check would falsely report HARO down. Verification should use a real browser or treat challenge responses as "unknown", not "defunct".
- HARO's scale figures (800K+ sources, 75K+ journalists) and the Connectively platform banner are first-party marketing; consistent with #124's rule to treat platform claims as marketing.

## Implications for #125 (GBP guard contract)

- **The proposed guard is fully supported by current official guidance.** Every element checks out: one-profile default ("There should only be one profile per business"), separate documented eligibility for chains/departments/practitioners, and the SAB rules.
- "Never create profiles merely to cover additional service areas" is directly supported: an extra SAB profile requires "separate service areas **and separate staff at each location**" — coverage alone never qualifies — and a single profile's service area is itself bounded ("about 2 hours of driving time", with case-by-case exceptions).
- "Service-area businesses stay eligible without a storefront display" is preserved: SABs get "one service-area Business Profile" and "should hide your business address from customers". One documented exception worth knowing: businesses selling age-restricted products (alcohol, cannabis, weapons) "aren't permitted as service-area businesses without a storefront".
- Additional supporting sentence the guard could cite: "A practitioner shouldn't have multiple Business Profiles to cover all of their specializations" — the practitioner-side analogue of the anti-proliferation rule.
- Nothing observed suggests profile count is a ranking lever; nothing observed requires weakening or rewording the guard.

## Unverified / not checked

- HARO digest delivery end-to-end (no test subscription submitted).
- Qwoted/SOS signup flows beyond the public pages.
- All first-party scale/outcome claims on every platform.
