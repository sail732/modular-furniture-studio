# Modular Furniture Studio

E-commerce and configuration platform for modular, flat-pack furniture.
The full brief is in [`PROJECT_SPEC.md`](PROJECT_SPEC.md). "Modular Furniture Studio" is a placeholder brand set in configuration.

**Status: Phase 2 complete (storefront and configurator).** Browsing, search, filters, product pages and the configurator (server-validated, with a live 2D preview, saving and sharing) work against a sample catalog. There is no pricing of configured designs, cart, checkout, accounts or admin yet. See [`docs/roadmap.md`](docs/roadmap.md).

## Quick start

Requires Node.js 22 or newer. No database install is needed for local development.

```bash
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
npm run db:setup                # apply migrations and load the sample catalog
npm run dev                     # http://localhost:3000
```

Without `DATABASE_URL`, the app uses PGlite, an embedded build of PostgreSQL stored in `.data/pglite`. Set `DATABASE_URL` to use a real PostgreSQL server; the same migrations and seed run on both.

PGlite allows one process at a time. Stop the dev server before running `db:migrate` or `db:seed`.

After pulling changes that add a migration, run `npm run db:setup` again. Re-seeding replaces the sample catalog and clears saved designs.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm test` | Unit and integration tests (Vitest, in-memory PGlite) |
| `npm run test:e2e` | End-to-end tests (Playwright) against a production build; run `npm run build` and `npm run db:setup` first |
| `npm run check` | Type check, lint and unit/integration tests |
| `npm run db:generate` | Generate a SQL migration from `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Replace sample catalog content (rows flagged `is_sample`) |
| `npm run db:setup` | Migrate, then seed |

Playwright needs a browser: `npx playwright install chromium`, or set `PW_CHANNEL=chrome` to use an installed Chrome.

## Hosting

A `Dockerfile` is included for Google Cloud Run. See [`docs/deployment.md`](docs/deployment.md) for the one-command preview deploy and its limits.

## Layout

```
PROJECT_SPEC.md          Master specification
docs/                    Architecture, data model, decisions, roadmap
drizzle/                 SQL migrations (generated, committed)
scripts/                 migrate and seed entry points
src/app/                 Routes (Next.js App Router), server-rendered
src/components/          Presentation only: layout, catalog, furniture, ui
src/config/              Brand, policies and shared content (no hardcoded brand in pages)
src/lib/                 Pure helpers: units, money, illustration layout schema
src/server/db/           Schema, connection, sample seed
src/server/catalog/      Catalog service: filter validation and queries
src/server/configuration/ Configuration engine, component resolution, persistence
src/lib/configuration/   Selection, issue and rule types shared with the browser
src/components/configurator/  Configurator UI
src/app/api/             JSON API (configurations)
tests/integration/       Service tests against a real (in-memory) Postgres
tests/e2e/               Browser journeys at desktop, tablet and mobile sizes
```

Business logic lives in `src/server` and `src/lib`. Components receive data and render it.

## Documentation

Start with [`docs/assumptions-and-decisions.md`](docs/assumptions-and-decisions.md) (what was decided, and what the business still has to decide) and [`docs/roadmap.md`](docs/roadmap.md).
