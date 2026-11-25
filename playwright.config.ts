import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// One fresh SQLite file per test run, shared by the app server and the test
// workers (workers inherit this env), so e2e runs never touch dev data.
// The generated file is removed by e2e/global-teardown.ts; a path the caller
// set is kept.
if (process.env.E2E_DATABASE_PATH === undefined) {
  process.env.E2E_DATABASE_PATH = path.join(
    os.tmpdir(),
    `taskboard-e2e-${process.pid}-${Date.now()}.db`,
  );
  process.env.E2E_DB_GENERATED = "1";
}

// E2E_PORT lets parallel worktrees run the suite side by side.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
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
    // The server is plain http, so the session cookie is not Secure (INSECURE_COOKIES=1).
    // E2E_SECURE_COOKIES=1 keeps the production default instead; Chromium accepts Secure cookies on localhost.
    env: {
      DATABASE_PATH: process.env.E2E_DATABASE_PATH!,
      INSECURE_COOKIES: process.env.E2E_SECURE_COOKIES === "1" ? "0" : "1",
    },
  },
});
