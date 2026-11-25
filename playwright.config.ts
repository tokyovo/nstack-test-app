import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// One fresh SQLite file per test run, shared by the app server and the test
// workers (workers inherit this env), so e2e runs never touch dev data.
process.env.E2E_DATABASE_PATH ??= path.join(
  os.tmpdir(),
  `taskboard-e2e-${process.pid}-${Date.now()}.db`,
);

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky test is a bug: no retries
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Runs the production build: run `npm run build` first.
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { DATABASE_PATH: process.env.E2E_DATABASE_PATH },
  },
});
