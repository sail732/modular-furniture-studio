import path from "node:path";
import fs from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DatabaseHandle {
  db: Database;
  driver: "postgres" | "pglite";
  migrate: (migrationsFolder: string) => Promise<void>;
  close: () => Promise<void>;
}

export interface OpenOptions {
  /** PostgreSQL connection string. When empty, PGlite is used. */
  databaseUrl?: string;
  /** PGlite data directory, or "memory://" for an in-memory database. */
  pgliteDataDir?: string;
}

/**
 * Open a database connection.
 *
 * - DATABASE_URL set  -> real PostgreSQL through node-postgres (production).
 * - otherwise         -> embedded PGlite (Postgres compiled to WASM) so local
 *                        development and tests need no database install.
 * Both speak the same SQL dialect and run the same migrations.
 */
export async function openDatabase(options: OpenOptions = {}): Promise<DatabaseHandle> {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL ?? "";

  if (databaseUrl !== "") {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: databaseUrl, max: 10 });
    const db = drizzle(pool, { schema });
    return {
      db: db as unknown as Database,
      driver: "postgres",
      migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
      close: () => pool.end(),
    };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = options.pgliteDataDir ?? process.env.PGLITE_DATA_DIR ?? "./.data/pglite";
  let client;
  if (dataDir === "memory://") {
    client = new PGlite();
  } else {
    const resolved = path.resolve(/* turbopackIgnore: true */ process.cwd(), dataDir);
    fs.mkdirSync(resolved, { recursive: true });
    client = new PGlite(resolved);
  }
  await client.waitReady;
  const db = drizzle(client, { schema });
  return {
    db: db as unknown as Database,
    driver: "pglite",
    migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
    close: () => client.close(),
  };
}

// One connection per server process; survives dev hot reloads.
const globalForDb = globalThis as unknown as { __mfsDb?: Promise<DatabaseHandle> };

export function getDb(): Promise<Database> {
  if (!globalForDb.__mfsDb) {
    globalForDb.__mfsDb = openDatabase().catch((error) => {
      globalForDb.__mfsDb = undefined;
      throw error;
    });
  }
  return globalForDb.__mfsDb.then((handle) => handle.db);
}
