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
| Unit | Vitest | `src/**/*.test.ts` | Allowed-width rule, unit conversion and formatting, money formatting, filter parsing (including hostile input), 2D layout building |
| Integration | Vitest + in-memory PGlite | `tests/integration` | Catalog queries and visibility; database constraints; the configuration engine against the seeded catalog; component resolution; save, reload, update, duplicate, share and ownership |
| End-to-end | Playwright, three viewports (desktop 1280, tablet 820, mobile Pixel 7) | `tests/e2e` | Storefront browsing, search, filters, 404s, navigation; the full TV-console configuration journey including save, reload and share; invalid combinations; the API called directly |

Integration tests run against real PostgreSQL semantics, so constraint and SQL behaviour is the same as production.

## Fixtures required by the spec

In `tests/fixtures/configurations.ts`:

| Fixture | Status |
| --- | --- |
| Valid TV console | Present, tested |
| Valid bookshelf | Present, tested |
| Invalid dimension | Present, tested |
| Incompatible door/module combination | Present, tested |
| Finish/material mismatch | Present, tested |
| Price change between cart and order | Phase 3 to 4 |
| Repeated payment webhook | Phase 4 |

Two invariants are checked over the whole sample catalog: every template's starting arrangement is a valid configuration, and every allowed width of every template can be reached and validates.

## Last run (end of Phase 2)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | pass |
| `eslint` | pass, no warnings |
| Vitest | 75 passed in 7 files |
| `next build` | pass |
| Playwright | 36 passed (12 scenarios × 3 viewports) |

## Not yet tested

- Automated accessibility scanning (axe). Manual checks so far: semantic landmarks, labels, focus styles, keyboard reachability of menu and filters.
- Performance budgets.
- Real PostgreSQL server (only PGlite has been exercised).
- Browsers other than Chrome.
