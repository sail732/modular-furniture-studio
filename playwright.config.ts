import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
// Set PW_CHANNEL=chrome to use an installed Chrome instead of the bundled
// Chromium (`npx playwright install chromium`).
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel } },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 820, height: 1180 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
