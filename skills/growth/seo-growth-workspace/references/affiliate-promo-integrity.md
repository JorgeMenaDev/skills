# Affiliate and offer integrity

> **Dogfood status:** fixture-validated only — not yet exercised against a live operation. Keep this path out of any dogfooded-completion claim until its manual gates pass on a named live target.

Use this specialist contract only for affiliate links, referral codes or links, coupon or promo-code pages, CPA offers, partner-funded placements, sponsored comparisons, or commission-influenced recommendations.

Use [Commercial Integrity](commercial-integrity.md) for material-benefit disclosure, comparison methodology, editorial conflicts, and the anti-authority-rental boundary. Every commission-bearing relationship must appear in that required disclosure; a commission-bearing link without it fails publication. Use [Page Evidence](page-evidence.md) for claim substantiation, revision approval, and the publish gate. Use [Conversion and CTA Audits](conversion-cta.md) for event mechanics and [Evidence Conventions](evidence-conventions.md) for the shared evidence states and non-causal outcome ladder. Those references own their rules; this contract adds only affiliate-, referral-, and offer-specific controls.

## Offer evidence and publication state

Before publication, record one evidence entry per offer, discount code, referral benefit, or promotional claim in the existing page-evidence record or a dated report. Put follow-up work in `.seo/backlog.md`; do not create a new required workspace file. Record:

- Offer ID; brand or merchant; program/source and official source location.
- Authorization basis: who issued the code or offer, the program or agreement under which it was issued, and the permitted publisher/audience/use.
- Verbatim terms supplied by the issuer, including eligible products/services, new/existing-customer rule, geography, currency, minimum spend, maximum saving, and every other material restriction.
- Start date; expiry date or explicitly evidenced `no stated expiry`; checked-at date; checker; verification method and result; next recheck; evidence artifact/location.
- Public code/link or, for sensitive material, the evidence pointer described below.
- Status: `verified-active`, `expiring`, `expired`, `revoked`, or `unverified`.

`verified-active` means current issuer/program evidence supports authorization, terms, availability, and the public label at the checked date. `expiring` means a previously verified offer is inside its scheduled pre-expiry review window **and its recheck is pending**; it is not publishable while that recheck remains pending. A successful reverification during the window explicitly transitions the offer back to `verified-active`, with a new checked-at date and, where applicable, a new recheck scheduled before the same expiry; that transition overrides the time-based `expiring` state. `expired` has passed its evidenced deadline. `revoked` has been withdrawn or authorization was removed. `unverified` lacks current, complete evidence; an offer whose scheduled `next recheck` date passes without successful reverification becomes `unverified` at that date — including offers with `no stated expiry` and offers whose volatility-based recheck falls before any expiry window — and publication is blocked until a successful reverification restores `verified-active`. Only `verified-active` offers may be published or remain presented as available. Never invent or infer a code, and reject leaked, private, employee-only, targeted, negotiated, or otherwise unauthorized offers unless the recorded authorization explicitly permits this publication.

Schedule a human recheck before expiry, with timing proportional to volatility and enough lead time to change the page. At expiry, promptly remove, unpublish, or update the offer and its CTA; do not silently redirect it or replace it with an unrelated affiliate destination. Broken, incorrect, withdrawn, or terminated offers follow the same prompt removal/update path. Automated checks may alert but never establish truth or publish changes without human verification. Never describe a dated offer as evergreen, “live,” or “real-time” beyond what dated evidence supports.

Price, savings, fees, urgency, exclusivity, earnings, availability, and “best” claims must pass [Page Evidence](page-evidence.md) with the applicable date, geography, audience eligibility, comparison basis, inclusions/exclusions, and limitations. False scarcity or unsupported superlatives fail publication.

## Program and trademark capture

Record the affiliate/referral program identity, current terms location, checked date, responsible program owner/contact, and every applicable recorded constraint on coupon publishing, trademark bidding, domains/handles, titles/URLs/hashtags/ad copy, paid search, social or email promotion, QR codes, link shortening, incentives/cashback, self-referrals, sub-affiliates, geography, and creative approval. Treat advertiser bidding and brand-usage restrictions as recorded program facts, not assumptions. Program acceptance does not authorize every promotional method, and no page may imply official status, sponsorship, or endorsement without recorded authorization. Ambiguity blocks publication pending confirmation from the operator or program owner.

## Regulated-category escalation

Finance and financial products, credit, banking/neobanks, investments, cryptoassets, health, insurance, gambling, alcohol, supplements, and similar regulated or high-risk categories require escalation to the operator **before publication**. Record the category flag, target jurisdiction(s), escalation owner and date, materials reviewed, outcome (`approved`, `approved with conditions`, or `rejected`), approver, and conditions/evidence location. `Unknown`, missing, or rejected outcomes block publication.

This is an escalation and evidence gate, not legal approval. Do not embed jurisdictional legal rules or let generated copy stand in for current review by an appropriately competent or authorised party selected by the operator.

## Commission lifecycle and reporting

Use the observable events owned by [Conversion and CTA Audits](conversion-cta.md), then keep these affiliate states distinct:

`tracked conversion` → `merchant validation` → `confirmed/approved conversion` → `approved commission` → `paid commission` → `reversed/adjusted` → `net revenue`

A tracked click is not a conversion. A tracked conversion is not confirmed or approved. An approved conversion is not an approved commission: the merchant may validate the conversion before calculating or approving the commission payable, so conversion approval is never evidence of commission approval or amount. None of those states is payout or revenue. Paid commission is gross cash received. `reversed/adjusted` records refunds, cancellations, reversals, chargebacks, invalid leads, or later merchant adjustments as a distinct state and separately identified amount; reports must never show only a figure netted into revenue. Net revenue is paid commission minus the separately reported reversal/adjustment amount and any genuine revenue deductions withheld by the program (e.g. program fees taken out of payment). Media spend, tooling, and attributable content/operating costs are expenses, not revenue deductions — report them separately and label the result of subtracting them `contribution/profit`, never `net revenue`. Record state, amount/currency, period, merchant/program evidence location, checked date, limitations, and adjustments without upgrading one state into another. Code use, direct-code journeys, cookie windows, cross-device paths, QR traffic, last-click rules, and blocked tracking are attribution limitations, not proof of source causation.

Report results with the [shared non-causal outcome ladder](evidence-conventions.md#non-causal-outcome-ladder). Keep tracked/approved pipeline values visibly separate from paid commission and net revenue; never call pending commission revenue. The [Commercial Integrity disclosure](commercial-integrity.md#material-benefit-disclosure) is a structural prerequisite for every commission-bearing relationship, including links whose commission is only possible or pending.

## Sensitive codes and terms

Do not store private or negotiated codes, credentials, access tokens, confidential schedules, or non-public commercial terms verbatim in the Markdown workspace. Store a stable secret/evidence ID, approved secure location, issuer/owner, authorization scope, checked date, verifier, public-safe summary, and expiry/recheck metadata. The workspace holds the evidence pointer, not the secret. Reviewers must be able to confirm authorization through that approved location before status can become `verified-active`.

## Rejected operating patterns

Reject parasite publishing, authority rental, opaque or unnamed indexers, artificial link networks, manufactured engagement, bought or simulated traffic presented as demand, and automated cross-platform scaling. Apply the [Commercial Integrity anti-authority-rental boundary](commercial-integrity.md#anti-authority-rental-boundary). For sponsored-link qualification use [Backlinks and Entity Authority](backlinks-entity.md); for human-value and scaled-content review use [Content Operations](content-ops.md). None of these tactics may be used to establish offer authorization, verification, or performance.
