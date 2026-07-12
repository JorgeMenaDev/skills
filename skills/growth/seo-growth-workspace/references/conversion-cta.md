# Conversion And CTA Audits

Use for CRO, cold organic visitor paths, lead capture, signup, and CTA hierarchy.

## Audit Matrix

| Page | Visitor intent | Primary CTA | Secondary CTA | Friction | Missing trust | Fix | Verify |
| ---- | -------------- | ----------- | ------------- | -------- | ------------- | --- | ------ |

## Conversion Event Matrix

Use this when SEO traffic needs a measurable path to signup, lead capture, booking, demo, purchase, or contact. The goal is to connect the visible CTA path to a real destination and an observable event.

| Path | Pageviews? | CTA/action event? | Properties | Destination real? | Admin proof | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Homepage CTA | yes/no | click / request / login / demo / contact | label, location, destination, plan, or intent | provider or route | live/admin evidence | repo/admin/user | missing / working / blocked |
| Pricing CTA | yes/no | click / request / login / demo / contact | label, location, destination, plan, or intent | provider or route | live/admin evidence | repo/admin/user | missing / working / blocked |
| Contact/demo form | yes/no | submit / success | source, page, form type | inbox, CRM, or event | test result | repo/admin/user | missing / working / blocked |
| Organic landing page CTA | yes/no | click / submit | page type, query intent, CTA label | event and destination | mobile/desktop proof | repo/admin/user | missing / working / blocked |

If a form or CTA has no real destination, do not fake the conversion path. Log the blocker and recommend the smallest honest next step.

Do not treat analytics installation as conversion measurement. Distinguish pageviews flowing, CTA/action events firing, useful event properties, a real conversion destination, and admin/reporting proof.

Two evidence pitfalls when filling the matrix:

- **Verify analytics presence in the shipped JS, not the initial HTML.** Modern app routers bundle the analytics library and its key into JS chunks, so grepping the page HTML for the library name false-negatives even when tracking is live. Extract the chunk URLs from the page source and scan those for the library name or key prefix before concluding analytics is absent (or trusting an older audit that grepped HTML).
- **A CTA that redirects to an external booking/checkout domain is unmeasured by default.** Once the visitor leaves for Cal.com/Calendly/Stripe/etc., no owned client event can fire on completion, and embed success hooks only cover embed paths — a redirect path silently bypasses them even when "booking tracking" exists and fires for embeds. Mark redirect CTAs `missing` in the matrix unless a provider-side webhook (configured in the provider's admin) feeds an owned sink, and check where each CTA variant actually points: the same site often mixes tracked embeds on some pages with untracked redirects on its highest-traffic ones.

## Naming Conventions

Events: `object_action`, lowercase snake_case (`cta_hero_clicked`, `form_submitted`, `signup_completed`). Context goes in properties, not the event name. These names feed the conversion event matrix above.

| UTM            | Discipline                                          | Example              |
| -------------- | --------------------------------------------------- | -------------------- |
| `utm_source`   | Real traffic source, lowercase                      | `google`, `newsletter` |
| `utm_medium`   | Fixed vocabulary: `cpc`, `email`, `social`, `referral` | `email`              |
| `utm_campaign` | One consistent scheme, documented                   | `spring_sale`        |
| `utm_content`  | Variant/placement differentiator                    | `hero_cta`           |

Keep one documented list of event names and UTMs; inconsistent casing splits reports.

## Checks

- Cold visitors have a lower-friction path than immediate login/signup when appropriate.
- CTA labels match the user's readiness: learn, compare, request access, book, start, contact.
- Pricing/plan CTAs are visible and consistent.
- Forms send to a real destination.
- Auth/login CTAs are not the only conversion path for SEO traffic unless that is intentional.
- Mobile CTAs are visible and do not overlap content.
- Thank-you/success states are tracked or documented.
- Off-site booking/checkout CTAs have a provider-side webhook sink, or are explicitly recorded as unmeasured.

## Done Criteria

- Desktop and mobile CTA paths verified.
- Important forms/actions tested where safe.
- Analytics/conversion tracking exists or a P1 analytics ticket is created.
