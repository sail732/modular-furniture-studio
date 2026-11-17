# Security

## Current surface (Phases 1 and 2)

Public catalog pages plus the configurator. Anonymous visitors can validate selections and save configurations. There are no accounts, uploads, payments or personal data: a saved configuration holds furniture choices and an optional name the visitor types.

| Control | Status |
| --- | --- |
| Input validation | All URL parameters parsed with Zod; malformed values dropped (`src/server/catalog/filters.ts`, tested with hostile input) |
| SQL injection | Parameterized queries only (Drizzle); LIKE wildcards escaped |
| Output encoding | React escaping; no `dangerouslySetInnerHTML` |
| Draft content | Queries return only published products and designs in visible categories (tested) |
| Request bodies | Zod-validated at every API route; 20 kB size cap; JSON content type required |
| Cross-site requests | Write endpoints refuse a request whose `Origin` does not match the host (403). Session cookie is `SameSite=Lax` |
| Rate limiting | Per-client fixed window on validate, resize and save. In-memory, so per instance only |
| Sessions | Anonymous id in an `httpOnly`, `SameSite=Lax` cookie, `Secure` in production. Only its SHA-256 hash is stored |
| Ownership | Read, update and duplicate require the owning session. Unknown, malformed and foreign ids all return the same 404 |
| Share links | 24 random bytes (base64url). The shared view is read-only, `noindex`, and contains no owner data (tested) |
| Private data | Component cost and manufacturing attributes are never selected by configurator queries (tested) |
| Headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` removed |
| Secrets | None required yet. `.env*` is git-ignored except `.env.example` |
| Indexing | Sample catalog is `noindex` and disallowed in `robots.txt` |
| Test data | Synthetic only |

## Not yet in place

- Content Security Policy (planned with Phase 4, when third-party scripts such as Stripe are known).
- Rate limiting on catalog search, and a shared rate-limit store for multi-instance hosting.
- Authentication, role-based authorization, audit log (Phases 4 and 5).
- Expiry or cleanup of old anonymous configurations (data-retention policy is a business decision).
- Dependency audit: `npm audit` reports moderate advisories in development tooling at the time of writing. Review before production.

## Rules for later phases

1. Authorization is checked in the service or route handler for every privileged operation, with tests proving a customer is refused.
2. Shareable configuration links expose the configuration only, never the owner's identity.
3. Payment state changes only on a signature-verified, idempotent webhook.
4. No card data is stored or logged. No personal data in logs.
5. Least-privilege database role for the application; migrations run with a separate role.
