import { expect, test, type BrowserContext } from "@playwright/test";
import Database from "better-sqlite3";
import { newEmail, signUp } from "./helpers";

const DAY_MS = 24 * 60 * 60 * 1000;

async function sessionCookie(context: BrowserContext) {
  const session = (await context.cookies()).find((c) => c.name === "session");
  expect(session).toBeDefined();
  return session!;
}

/** Backdates the session row's created_at by `days` days, in SQLite's datetime('now') format. */
function ageSession(token: string, days: number) {
  const db = new Database(process.env.E2E_DATABASE_PATH!);
  db.prepare("UPDATE sessions SET created_at = datetime('now', ?) WHERE token = ?").run(`-${days} days`, token);
  db.close();
}

function sessionRowCount(token: string): number {
  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const row = db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token = ?").get(token) as { n: number };
  db.close();
  return row.n;
}

test("AC19: a 31-day-old session is rejected and its row deleted", async ({ page, context }) => {
  await signUp(page, newEmail());
  await expect(page).toHaveURL("/projects");
  const token = (await sessionCookie(context)).value;

  ageSession(token, 31);
  await page.goto("/projects");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  expect(sessionRowCount(token)).toBe(0);
});

test("AC19: a 29-day-old session still works", async ({ page, context }) => {
  const email = newEmail();
  await signUp(page, email);
  await expect(page).toHaveURL("/projects");
  const token = (await sessionCookie(context)).value;

  ageSession(token, 29);
  await page.goto("/projects");
  await expect(page).toHaveURL("/projects");
  await expect(page.getByTestId("current-user")).toHaveText(email);
  expect(sessionRowCount(token)).toBe(1);
});

test("AC19: the session cookie expires about 30 days out", async ({ page, context }) => {
  await signUp(page, newEmail());
  await expect(page).toHaveURL("/projects");
  const session = await sessionCookie(context);

  // Playwright reports expires in seconds since the epoch; -1 means a browser-session cookie.
  const msLeft = session.expires * 1000 - Date.now();
  expect(msLeft).toBeGreaterThan(30 * DAY_MS - 60 * 60 * 1000);
  expect(msLeft).toBeLessThanOrEqual(30 * DAY_MS + 60 * 1000);
  expect(session.httpOnly).toBe(true);
  expect(session.sameSite).toBe("Lax");
  // Production build: Secure unless the webServer opted out (see playwright.config.ts).
  expect(session.secure).toBe(process.env.E2E_SECURE_COOKIES === "1");
});
