import { defineConfig } from "drizzle-kit";

// Used only to generate SQL migrations from the schema (`npm run db:generate`).
// Applying migrations is done by scripts/migrate.ts so that the same command
// works for both PGlite and a real PostgreSQL server.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
