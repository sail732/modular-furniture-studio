import path from "node:path";
import { openDatabase, type DatabaseHandle } from "@/server/db/client";
import { seedSampleCatalog } from "@/server/db/seed";

/** Fresh in-memory Postgres (PGlite) with migrations and the sample catalog. */
export async function createTestDatabase(): Promise<DatabaseHandle> {
  const handle = await openDatabase({ databaseUrl: "", pgliteDataDir: "memory://" });
  await handle.migrate(path.resolve(process.cwd(), "drizzle"));
  await seedSampleCatalog(handle.db, new Date("2026-01-15T00:00:00Z"));
  return handle;
}
