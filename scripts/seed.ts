import "./env";
import { openDatabase } from "../src/server/db/client";
import { seedSampleCatalog } from "../src/server/db/seed";

async function main() {
  const handle = await openDatabase();
  const counts = await seedSampleCatalog(handle.db);
  console.log(`Sample catalog seeded (${handle.driver}):`, counts);
  await handle.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
