# Testing

## Commands

```bash
npm run check        # typecheck + lint + unit/integration
npm test             # unit and integration only
npm run build && npm run db:setup && npm run test:e2e
```

End-to-end tests start a production server on port 3100 and need a browser (`npx playwright install chromium`, or `PW_CHANNEL=chrome`).

## Layers

| Layer | Tool | Where | Covers |
| --- | --- | --- | --- |
| Unit | Vitest | `src/**/*.test.ts` | Unit conversion and formatting, money formatting, filter parsing (including hostile input), illustration layout schema |
| Integration | Vitest + in-memory PGlite | `tests/integration` | Migrations apply; seed is idempotent; catalog queries, filters, sorting, search; draft and hidden content never returned; database constraints reject bad rows |
| End-to-end | Playwright, three viewports (desktop 1280, tablet 820, mobile Pixel 7) | `tests/e2e` | Browse home → category → product; search empty state; filters; design and finish selection; 404s; navigation including the mobile menu; one `h1`, a title and no horizontal overflow on key pages; `noindex` on sample catalogs |

Integration tests run against real PostgreSQL semantics, so constraint and SQL behaviour is the same as production.

## Last run (end of Phase 1)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | pass |
| `eslint` | pass, no warnings |
| Vitest | 33 passed in 5 files |
| `next build` | pass |
| Playwright | 24 passed (8 scenarios × 3 viewports) |

## Not yet tested

- Automated accessibility scanning (axe). Manual checks so far: semantic landmarks, labels, focus styles, keyboard reachability of menu and filters.
- Performance budgets.
- Real PostgreSQL server (only PGlite has been exercised).
- Browsers other than Chrome.

## Fixtures required by the spec

Valid TV console and bookshelf configurations, invalid dimension, incompatible door/module, finish/material mismatch, price change between cart and order, repeated webhook. None exist yet; they arrive with Phases 2 to 4.
