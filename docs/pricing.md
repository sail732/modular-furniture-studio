# Pricing

**Status: not implemented.** Phase 1 shows a base price per design and nothing else.

## What exists today

- `design_templates.base_price_cents` and `currency`.
- A product's "From" price is the lowest base price among its published designs, computed in SQL.
- `formatMoney` in `src/lib/money.ts` formats integer cents and throws on non-integers.
- Product pages state that the price is for the standard size, before shipping and tax, and that the final price depends on configuration.

No cost or margin data is stored yet, so none can leak.

## Requirements for Phase 3 (from the spec)

- A deterministic server-side service returning a line-item breakdown.
- Supports fixed, per-component, area/length-based prices and configurable upcharges.
- Cost and margin never leave the server.
- Pricing rules are versioned; an order snapshots the breakdown and the pricing version.
- Shipping and tax are separate lines and are labeled as estimates unless an integration makes them final.

## Rounding policy (proposed)

Area- and length-based prices produce fractions of a cent. Each line is rounded half-up to a whole cent, and the total is the sum of rounded lines, so the breakdown always adds up to the total shown.

## Shipping and tax assumptions

None. No shipping rules, tax rates or integrations are defined (business decisions 7 and 11). The storefront makes no shipping-cost or delivery-time statements.
