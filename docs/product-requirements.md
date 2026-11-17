# Product requirements (summary)

Source of truth: [`PROJECT_SPEC.md`](../PROJECT_SPEC.md). This file is the working summary; if the two disagree, the spec wins until this file is updated by agreement.

## Product

A US-market (USD, inches) store where customers pick a professionally designed starting point, configure it from a controlled library of standard modules, see a preview and a transparent price, and order flat-packed, labeled furniture. Staff manage the catalog, rules, prices, orders and manufacturing outputs in an admin application.

Core principle: sell configurable products assembled from standardized, reusable components, not arbitrary one-off designs.

Most important success criterion: a customer can configure a valid piece, see an accurate representation, get a correct price, place an order, and have that exact configuration become traceable manufacturing information.

## Roles

| Role | Can do |
| --- | --- |
| Customer | Browse, configure, save configurations (signed in), cart, checkout, track orders |
| Catalog manager / admin | Manage categories, products, templates, modules, components, rules, prices; preview and publish |
| Operations / manufacturing | View accepted orders, download BOM, cut lists, labels, packing lists; update production status |
| Support | Look up customers and orders, add internal notes |

Role checks are enforced on the server. A customer must never reach admin or manufacturing functions.

## Non-negotiable rules carried through every phase

1. The server is the authority for configuration validity and price. The browser never is.
2. Money is integer minor units. Lengths are integers in a canonical unit.
3. Out-of-range input is explained and alternatives offered; values are never silently clamped.
4. Orders keep immutable snapshots; catalog or price changes never rewrite history.
5. Rules are data, not frontend conditionals.
6. Visualization is never the source of truth for dimensions, rules or price. A 2D preview is labeled 2D.
7. No fake payment success, fabricated trust badges, unsupported product claims, or placeholder content presented as real.
8. Cut lists are not called production-ready until a qualified manufacturing professional has reviewed the rules.

## Dimension rule (confirmed)

Customers can change width only, in fixed steps within each design's range. Height and depth are fixed per design. No made-to-measure sizes in the first release.

## MVP boundary

In: responsive storefront; at least three categories with a small curated catalog; a few designs per category; standard modules and components; controlled dimension and compatibility rules; live 2D preview; server-validated price; cart and saved configurations; admin catalog management; test checkout or a clearly separate order-request flow; basic order management; BOM CSV export.

Out (must not block MVP): photorealistic 3D, CNC integration, AI design generation, warehouse management, advanced promotions, complex shipping optimization.

## Acceptance scenarios

The fifteen scenarios in spec section 24 are the release gate. Their status is tracked in [`roadmap.md`](roadmap.md).
