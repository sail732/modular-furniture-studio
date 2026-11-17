import { config } from "dotenv";

// Load .env.local first (developer overrides), then .env.
config({ path: [".env.local", ".env"], quiet: true });
