# Roadmap

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Discovery and architecture | Done. Open questions in `assumptions-and-decisions.md` |
| 1 | Storefront foundation | Done |
| 2 | Modular catalog and configuration engine, 2D live preview | Done |
| 3 | Pricing and cart | Next |
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

## Phase 2: what works

- Components, modules and templates as three separate levels; every sample product is configurable (8 products, 18 designs, 21 modules, 92 components, 6 rules).
- Configurator at `/configure/[slug]` with six steps: design, size, layout, finish, details, review. Selections are kept when moving back and forward.
- Live 2D front view with dimensions, labelled as 2D, with the bay being edited outlined.
- Width chosen from the allowed list; the server resizes the bays or explains why it cannot.
- Bays can be added, removed, reordered, switched to another module, resized and given a unit count.
- Server validation of every change with messages next to the control that caused them; nothing is clamped.
- Compatibility rules stored as data.
- Save, reload, update, duplicate, and a read-only share link. Saved designs list at `/configurations`.
- Resolved component list (SKUs, quantities, cut lengths, finish) stored with each saved design.

## Phase 2: known gaps

| Gap | Why | Planned |
| --- | --- | --- |
| No price for a configured design | Pricing service is Phase 3 | 3 |
| Saved designs are tied to one browser | No accounts yet | 4 |
| An unsaved design is lost on full reload | Kept simple | Could persist a draft locally |
| No side or top view | Spec: "if practical" | 7 |
| Version columns, not version rows | Nothing publishes versions yet | 5 |
| Rate limits are per instance | In-memory store | 8 |
| Wide Ledger designs default to legs and need a manual switch to plinth above 96″ | The rule is enforced and explained, not auto-fixed (no silent changes) | Could offer a one-click fix |

## Phase 1: known gaps

| Gap | Why | Planned |
| --- | --- | --- |
| No cart, checkout, account or order pages | Later phases; not linked from navigation | 3 to 4 |
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
| 2 | Select a design and configure valid dimensions | **Passing** (integration, e2e) |
| 3 | Invalid dimension rejected with explanation | **Passing** (integration, e2e) |
| 4 | Incompatible combination rejected | **Passing** (integration, e2e) |
| 5 | Changing a module updates preview and server price | **Partly**: preview and server validation pass; price is Phase 3 |
| 6 | Save and reload a configuration | **Passing** (integration, e2e) |
| 7 | Add configured product to cart and edit | Phase 3 |
| 8 | Price change does not rewrite a placed order | Phase 4 |
| 9 | Customer cannot reach admin or manufacturing endpoints | Phase 5 (none exist yet) |
| 10 | Admin can publish a product and configure modules | Phase 5 |
| 11 | Order generates a correct BOM | Phase 6 |
| 12 | Payment confirmed by verified server event | Phase 4 |
| 13 | Duplicate webhooks do not duplicate payments or orders | Phase 4 |
| 14 | Historical order reproducible after catalog changes | Phase 4 |
| 15 | Main journey works on mobile, tablet, desktop | **Partly**: browsing and configuring pass at all three sizes; cart and checkout do not exist yet |

## Phase 3: scope and files likely to change

Scope: deterministic server-side pricing with a line-item breakdown (base design, modules and components, material and finish upcharges, accessories); pricing versions; cost and margin kept private; live price in the configurator; cart whose lines reference saved configurations, with preview thumbnails, quantity, edit and remove; revalidation of configuration and price on every cart change and before checkout; tests for rounding, price changes, invalid configurations and quantity changes.

Likely to change: `src/server/db/schema.ts` and a new migration (pricing rules and versions, carts, cart items); new `src/server/pricing/` and `src/server/cart/`; new `/api/cart` routes and `/cart` page; the configurator review step and product pages (live price, add to cart); `docs/pricing.md`.

Needs first: nothing blocking. Useful to know: how prices should be built up (per module, per width, or a formula on area), and whether shipping should appear as an estimate or be left out until an integration exists.
