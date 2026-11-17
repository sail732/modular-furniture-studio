import "./env";
import path from "node:path";
import { openDatabase } from "../src/server/db/client";

async function main() {
  const handle = await openDatabase();
  await handle.migrate(path.resolve(process.cwd(), "drizzle"));
  console.log(`Migrations applied (${handle.driver}).`);
  await handle.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
