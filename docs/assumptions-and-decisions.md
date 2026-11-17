# Assumptions and decisions

Decisions made so far, the reason for each, and what is still open. Nothing under "Needs a business decision" should be treated as settled.

## Decisions

| # | Decision | Reason | Reversible? |
| --- | --- | --- | --- |
| D1 | Next.js 16 + TypeScript + PostgreSQL + Drizzle, single application | See `architecture.md` | Costly after Phase 2 |
| D2 | PGlite as the default local and test database; real PostgreSQL through `DATABASE_URL` | No install needed, same SQL and migrations, real constraints in tests | Yes, set `DATABASE_URL` |
| D3 | Lengths stored as integer micrometres | Exact for 1/8-inch steps and for metric; no float rounding | Costly later |
| D4 | Money stored as integer cents with a currency code | Spec requirement | No |
| D5 | Brand, contact details and social links come from environment configuration (`src/config/site.ts`) | Spec: placeholder brand must not be hardcoded | Yes |
| D6 | `CATALOG_IS_SAMPLE=true` shows a site-wide notice, sets `noindex`, and disallows crawling | A sample catalog must not be mistaken for a real one or indexed | Yes, one variable |
| D7 | Product imagery is a front-view illustration drawn from catalog data, captioned as an illustration | No licensed photography exists; avoids stock or competitor images; cannot be mistaken for a photo or for 3D | Yes, add photos in Phase 5 |
| D8 | No testimonials, even sample ones. The reviews section says there are none yet | Invented customer voices are easy to mistake for real ones; an empty state is the honest version | Yes |
| D9 | No newsletter signup | Spec: only with consent handling and a real backend | Yes |
| D10 | No product structured data (JSON-LD) yet | Spec: only when accurate; the data is sample | Add at launch |
| D11 | Product pages show no "configure" or "add to cart" button. A panel states that the configurator is not built | Spec: no fake flows, do not claim the configurator exists | Replaced in Phase 2 |
| D12 | Design and finish selection on product pages are links that change the URL | Works without JavaScript, shareable, server-rendered | Yes |
| D13 | Listing filters are a GET form validated on the server | Same reasons; every filter state is a URL | Yes |
| D14 | Pages render per request; no caching yet; Cache Components turned off | Simplicity and no stale prices before a publish event exists | Yes, Phase 5/8 |
| D15 | No loading boundary on product and category routes | Keeps real HTTP 404 for unknown URLs (a streamed page is always 200) | Yes |
| D16 | Policy pages exist as clearly marked drafts with no policy text | Spec: draft until legally reviewed; writing plausible legal text would be inventing terms | Replace with reviewed text |
| D17 | Width filter matches a product when any published design can be built at a width inside the band | Matches what a shopper means by "fits a 60-inch wall" | Yes |
| D18 | Node.js 22 minimum | Current LTS; required by test tooling | Yes |
| D19 | **Width is the only customer-adjustable dimension, in fixed steps. Height and depth are fixed per design. No made-to-measure sizes in release 1.** Confirmed by the business owner on 2026-11-16 (business decision 10) | Keeps every configuration buildable from standard parts | Costly after Phase 2 |
| D21 | First hosted preview targets Google Cloud Run, with the sample catalog baked into the image on embedded PGlite (requested by the business owner 2026-11-16) | Runs within Cloud Run's free allowance with no database service; acceptable only while the site is read-only | Yes: set `DATABASE_URL` and rebuild without the baked database |
| D20 | The database rejects a design whose width range or standard width is off its step grid; `src/lib/width-options.ts` is the single definition of "allowed width" | Makes D19 a rule the system enforces, not a convention | Yes |

## Assumptions in the sample catalog

Everything in `src/server/db/seed-data.ts` is invented: product names, prices, sizes, width ranges and steps, materials, finishes, assembly difficulty and times, and descriptive claims such as "cable channel behind every bay" or "add bays later". They exist to exercise the software and are flagged `is_sample`. Replace them before any public use.

Customer-facing copy avoids claims the spec lists as unsupported (sustainability, origin, wood grade, delivery times). Where a fact is unknown, the page says it has not been set.

## Needs a business decision

Numbered as in spec Part XIII. "Blocks" is the first phase that cannot be finished properly without it.

| # | Decision | Blocks |
| --- | --- | --- |
| 1 | Launch categories and exact catalog | Launch |
| 2 | Target customer and price positioning | Launch (copy, pricing) |
| 3 | Materials | Phase 2 seed realism; Phase 6 |
| 4 | Panel thicknesses and finish options | Phase 2 (geometry), Phase 6 |
| 5 | Manufacturing location and suppliers | Phase 6; any origin claim |
| 6 | In-house CNC or outsourced cutting | Phase 6 output formats |
| 7 | Packaging and parcel vs freight | Phase 3 shipping estimate; Phase 6 packing lists |
| 8 | Hardware system and instruction format | Phase 2 rules; Phase 6 |
| 9 | Returns, damage, warranty, replacement parts | Phase 4 checkout terms; legal pages |
| 10 | Made-to-measure dimensions in release 1? | **Decided: no.** Width in fixed steps only; height and depth fixed per design (D19) |
| 11 | Payment provider, tax and shipping integrations | Phase 4 |
| 12 | Brand name, identity, photography | Launch |
| 13 | Manufacturing tolerances and engineering review | Phase 6 "production-ready" status |
| 14 | Assembly or installation service | Phase 3 pricing options |

## Questions for review now

1. ~~Decision 10~~ Answered: see D19.
2. Checkout for the MVP: Stripe test-mode checkout, or an order-request (inquiry) flow with no payment? The spec allows either.
3. ~~Hosting preference~~ Answered for the preview: Google Cloud Run (D21). Production database hosting is still open and is needed by Phase 3.
