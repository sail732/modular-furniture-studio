# Security

## Current surface (Phase 1)

The application is read-only and public. There are no accounts, sessions, forms that write data, uploads, payments or personal data.

| Control | Status |
| --- | --- |
| Input validation | All URL parameters parsed with Zod; malformed values dropped (`src/server/catalog/filters.ts`, tested with hostile input) |
| SQL injection | Parameterized queries only (Drizzle); LIKE wildcards escaped |
| Output encoding | React escaping; no `dangerouslySetInnerHTML` |
| Draft content | Queries return only published products and designs in visible categories (tested) |
| Headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` removed |
| Secrets | None required yet. `.env*` is git-ignored except `.env.example` |
| Indexing | Sample catalog is `noindex` and disallowed in `robots.txt` |
| Test data | Synthetic only |

## Not yet in place

- Content Security Policy (planned with Phase 4, when third-party scripts such as Stripe are known).
- Rate limiting (planned for search and all write endpoints from Phase 2).
- Authentication, authorization, CSRF protection, audit log (Phases 4 and 5).
- Dependency audit: `npm audit` reports moderate advisories in development tooling at the time of writing. Review before production.

## Rules for later phases

1. Authorization is checked in the service or route handler for every privileged operation, with tests proving a customer is refused.
2. Shareable configuration links expose the configuration only, never the owner's identity.
3. Payment state changes only on a signature-verified, idempotent webhook.
4. No card data is stored or logged. No personal data in logs.
5. Least-privilege database role for the application; migrations run with a separate role.
