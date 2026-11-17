# Deployment

**Status: no deployment exists.** Hosting has not been chosen.

## Requirements

- Node.js 22 runtime that can run a Next.js server (`npm run build`, `npm run start`).
- PostgreSQL, reachable through `DATABASE_URL`. PGlite is for development and tests only: it is single-process and must not be used in production.

## Environment variables

See `.env.example`. For production: set `DATABASE_URL`, `SITE_URL` and the brand variables. Leave `CATALOG_IS_SAMPLE=true` until the catalog, prices and policies are real.

## Release steps (manual, until a pipeline exists)

1. `npm ci`
2. `npm run check` and `npm run build`
3. `npm run db:migrate` against the target database
4. Start with `npm run start`

Do not run `db:seed` against a production database unless sample content is wanted there.

## External services that will need accounts

| Service | Needed for | Phase | Paid? |
| --- | --- | --- | --- |
| Managed PostgreSQL | Any hosted environment | First deploy | Free tiers exist; paid for production |
| Application hosting | Any hosted environment | First deploy | Free tiers exist |
| Stripe | Payments (test mode first) | 4 | No monthly fee; per-transaction when live |
| Auth provider (if not self-hosted) | Accounts | 4 | Depends on choice |
| Transactional email | Order confirmations, account recovery | 4 | Free tiers exist |
| Object storage | Product images, exports | 5 | Usage-based |
| Tax calculation | Final tax at checkout | 4 or later | Usage-based |
| Shipping rates | Final shipping quotes | 7 | Usage-based |
| Error monitoring | Production readiness | 8 | Free tiers exist |

None of these has been selected or set up. No credentials exist in the project.

## Backups

Not configured. A backup and tested-restore procedure is a Phase 8 deliverable and depends on the database host.
