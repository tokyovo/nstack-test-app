// Usage: BASE_URL=http://localhost:3400 npm run seed
import { chromium } from "@playwright/test";
import { seed } from "./seed-app.mts";

const baseURL = process.env.BASE_URL;
if (!baseURL) throw new Error("Set BASE_URL to the running app, e.g. BASE_URL=http://localhost:3400");

const browser = await chromium.launch();
try {
  const seeded = await seed(browser, baseURL);
  console.log(`Sign in: ${seeded.email} / ${seeded.password}`);
  console.log(`Board: ${seeded.boardUrl}`);
} finally {
  await browser.close();
}
