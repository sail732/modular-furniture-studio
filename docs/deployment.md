# Deployment

**Status: prepared for Google Cloud Run as a read-only preview. Not yet deployed by anyone.** The container layout was tested locally by running the standalone server with a baked database; the `docker build` itself has not been run, because no Docker daemon was available where the files were written. Expect to fix small issues on the first real build.

## Preview on Google Cloud Run

This puts the Phase 1 storefront on a public URL at little or no cost. The sample catalog is seeded into the embedded PGlite database during the image build and shipped inside the image, so no database service is needed.

**The baked database is not durable.** Each container instance has its own private copy, and anything written is lost when the instance stops. Since Phase 2 the configurator saves designs, so on this preview setup saved designs and share links disappear whenever an instance restarts and are not shared between instances. Treat the hosted preview as a demo only; use a real PostgreSQL database through `DATABASE_URL` for anything people rely on. Cloud SQL has no always-free tier.

### Before you start

- A Google Cloud project with billing enabled (Cloud Run's free monthly allowance still requires a billing account).
- The `gcloud` CLI, signed in: `gcloud auth login`, then `gcloud config set project YOUR_PROJECT_ID`.

### Deploy

From the project folder:

```
gcloud run deploy modular-furniture-studio --source . --region us-east1 --allow-unauthenticated --memory 1Gi --cpu 1 --min-instances 0 --max-instances 1
```

`gcloud` asks to enable the Cloud Run, Cloud Build and Artifact Registry APIs the first time; answer yes. It builds the `Dockerfile` in Cloud Build and prints the service URL when done.

Then tell the app its own address (used for canonical links and the sitemap):

```
gcloud run services update modular-furniture-studio --region us-east1 --update-env-vars SITE_URL=https://YOUR-SERVICE-URL
```

Optional brand settings use the same flag, for example `--update-env-vars SITE_NAME="Your Brand",SITE_CONTACT_EMAIL=hello@example.com`.

### Why these flags

| Flag | Reason |
| --- | --- |
| `--memory 1Gi` | The server used about 450 MB under a burst of 300 concurrent requests in testing; the 512 MB default is too tight |
| `--min-instances 0` | Scales to zero when idle, so idle time costs nothing. The first request after idle takes a few seconds |
| `--max-instances 1` | Caps spend, and keeps one copy of the baked database so a share link always reaches the instance that saved it. Raise it only after switching to a real database |
| `--allow-unauthenticated` | Makes the site public. Omit it to keep the preview private to your Google account |

### Cost notes

Cloud Run has a monthly free allowance per billing account and bills only beyond it. Cloud Build minutes and Artifact Registry image storage have their own allowances and can incur small charges past them. Set a budget alert on the billing account. Check current figures on Google's pricing pages; none are restated here.

The site stays marked as a sample preview and is hidden from search engines while `CATALOG_IS_SAMPLE` is unset or `true`.

### Updating and removing

Re-run the deploy command after pulling new code. To remove everything: `gcloud run services delete modular-furniture-studio --region us-east1`, then delete the image in Artifact Registry.

### Switching to a real database later

Build with `--build-arg BAKE_SAMPLE_DB=false`, run `npm run db:migrate` against the database, and set `DATABASE_URL` on the service (as a Secret Manager secret, not a plain variable).

## Requirements

- Node.js 22 runtime that can run a Next.js server (`npm run build`, `npm run start`).
- PostgreSQL, reachable through `DATABASE_URL`. PGlite is for development, tests and the read-only preview above: it is single-process and must not hold real customer or order data.

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
