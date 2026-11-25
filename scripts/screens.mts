// Usage: BASE_URL=http://localhost:3400 npm run screens -- <dir>
// Seeds the app, then saves full-page screenshots of the main screens at desktop and phone widths.
// Exits non-zero if a page logs a console error (the browser's favicon.ico 404 is ignored).
import { chromium, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { DEMO_EMAIL, seed, signedInPage } from "./seed-app.mts";

const baseURL = process.env.BASE_URL;
const dir = process.argv[2];
if (!baseURL || !dir) throw new Error("Usage: BASE_URL=http://localhost:3400 npm run screens -- <dir>");

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];

const errors: string[] = [];

function recordErrors(page: Page) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (new URL(message.location().url || baseURL!).pathname === "/favicon.ico") return;
    errors.push(`${page.url()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
}

async function shoot(page: Page, urlPath: string, name: string, width: number) {
  await page.goto(urlPath);
  const file = path.join(dir!, `${name}-${width}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

const browser = await chromium.launch();
try {
  const seeded = await seed(browser, baseURL);
  await mkdir(dir, { recursive: true });
  for (const viewport of VIEWPORTS) {
    const guest = await (await browser.newContext({ baseURL, viewport })).newPage();
    recordErrors(guest);
    await shoot(guest, "/login", "login", viewport.width);
    await shoot(guest, "/signup", "signup", viewport.width);
    await guest.context().close();

    const page = await signedInPage(browser, baseURL, DEMO_EMAIL);
    await page.setViewportSize(viewport);
    recordErrors(page);
    await shoot(page, "/projects", "projects", viewport.width);
    await shoot(page, seeded.boardUrl, "board", viewport.width);
    await shoot(page, seeded.taskUrl, "task", viewport.width);
    await page.context().close();
  }
} finally {
  await browser.close();
}

if (errors.length > 0) {
  console.error(`Console errors:\n${errors.join("\n")}`);
  process.exitCode = 1;
}
