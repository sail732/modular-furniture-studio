# Roadmap

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Discovery and architecture | Done. Open questions in `assumptions-and-decisions.md` |
| 1 | Storefront foundation | Done |
| 2 | Modular catalog and configuration engine, 2D live preview | Next |
| 3 | Pricing and cart | Planned |
| 4 | Accounts and checkout | Planned |
| 5 | Admin and operations | Planned |
| 6 | Manufacturing outputs | Planned |
| 7 | 3D and advanced capabilities | Planned |
| 8 | Production readiness | Planned |

## Phase 1: what works

- App shell with configurable brand, responsive header with search, footer, skip link, sample-content notice.
- Design tokens and reusable components: header/navigation, footer, product card and grid, category card, price, finish swatches, filter form, state messages (empty, error, notice), loading skeleton, page header, section.
- Homepage: hero, categories, featured designs, how it works, modularity, materials, delivery, reviews empty state.
- Listing at `/shop` and `/shop/[category]`: search, category tabs, filters for price, width, material and finish, four sort orders, result count, empty state.
- Product pages: illustration with dimensions, design and finish selection, per-design price, dimensions table in inches and centimetres, included items, what can change, materials, assembly, related products.
- Content pages: How it works, Materials & finishes (data-driven), Delivery & assembly, About, Contact & FAQ, five draft policy pages.
- Data-driven categories: hide or add a category in the database and navigation, tabs, footer and sitemap follow.
- Sample catalog: 5 categories, 8 products, 18 designs, 3 materials, 8 finishes.
- 404 and error pages, `robots.txt`, `sitemap.xml`, per-page titles, descriptions and canonical URLs.

## Phase 1: known gaps

| Gap | Why | Planned |
| --- | --- | --- |
| No configurator, cart, checkout, account or order pages | Later phases; not linked from navigation | 2 to 4 |
| No photography; illustrations only | No licensed assets (business decision 12) | 5 / launch |
| No admin: catalog changes need SQL or the seed file | Phase 5 | 5 |
| No caching | Deliberate, see architecture | 5 / 8 |
| Hosted preview uses a baked, per-instance database | Free and simple while read-only; see `deployment.md` | Real PostgreSQL by Phase 3 |
| Container image build not yet run end to end | No Docker daemon where it was written; layout was simulated and tested | First Cloud Run deploy |
| Search is substring matching | Enough for a small catalog | Revisit with catalog size |
| About and policy pages are placeholders | Need business and legal input | Launch |
| No CSP, rate limiting or automated accessibility scan | See `security.md`, `testing.md` | 2, 4, 8 |
| Only Chrome and PGlite exercised | Environment limits | 8 |
| Filters on small screens need JavaScript to open | Trade-off for a compact layout | Could render open without JS |

## Acceptance scenarios (spec section 24)

| # | Scenario | Status |
| --- | --- | --- |
| 1 | Visitor can browse categories and open a product | **Passing** (e2e) |
| 2 | Select a design and configure valid dimensions | Phase 2 |
| 3 | Invalid dimension rejected with explanation | Phase 2 |
| 4 | Incompatible combination rejected | Phase 2 |
| 5 | Changing a module updates preview and server price | Phase 2 to 3 |
| 6 | Save and reload a configuration | Phase 2 |
| 7 | Add configured product to cart and edit | Phase 3 |
| 8 | Price change does not rewrite a placed order | Phase 4 |
| 9 | Customer cannot reach admin or manufacturing endpoints | Phase 5 (none exist yet) |
| 10 | Admin can publish a product and configure modules | Phase 5 |
| 11 | Order generates a correct BOM | Phase 6 |
| 12 | Payment confirmed by verified server event | Phase 4 |
| 13 | Duplicate webhooks do not duplicate payments or orders | Phase 4 |
| 14 | Historical order reproducible after catalog changes | Phase 4 |
| 15 | Main journey works on mobile, tablet, desktop | **Partly**: the browsing part passes at all three sizes |

## Phase 2: scope and files likely to change

Scope: components, modules and template-module arrangement; versioned templates and rule sets; dimension constraints; typed compatibility rules; pure validation function with actionable errors; configuration persistence with stable ids; configurator UI with stepper and live 2D preview; unit and integration tests with the spec's fixtures; one complete TV-console journey.

Likely to change: `src/server/db/schema.ts` and a new migration; `src/server/db/seed*.ts`; new `src/server/configuration/`; new `src/app/configure/`; `src/components/furniture/elevation.tsx` (driven by modules instead of `preview_layout`); the "Next step" panel on product pages; `docs/configuration-engine.md`, `docs/data-model.md`.

Business decision 10 is answered (width in fixed steps only; height and depth fixed per design), so Phase 2 is unblocked.
