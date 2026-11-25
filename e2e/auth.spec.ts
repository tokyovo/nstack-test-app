import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";

const PASSWORD = "correct-horse-1";

/** A unique email per call, so parallel tests never collide on the shared DB. */
function newEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("AC1: visiting / while logged out redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("AC2: a new user signs up, lands on /projects and sees their email", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await expect(page).toHaveURL("/projects");
  await expect(page.getByTestId("current-user")).toHaveText(email);
});

test("AC2: signing up with an already-used email shows an error", async ({ browser }) => {
  const email = newEmail();
  const first = await browser.newPage();
  await signUp(first, email);
  await expect(first).toHaveURL("/projects");

  const second = await (await browser.newContext()).newPage();
  await signUp(second, email, "another-password");
  await expect(second.locator("form").getByRole("alert")).toHaveText("An account with that email already exists");
  await expect(second).toHaveURL("/signup");
});

test("AC2: a password shorter than 8 characters is rejected", async ({ page }) => {
  await signUp(page, newEmail(), "short7c");
  await expect(page.locator("form").getByRole("alert")).toHaveText("Password must be at least 8 characters");
  await expect(page).toHaveURL("/signup");
});

test("AC3: log out returns to /login and /projects is then guarded", async ({ page }) => {
  await signUp(page, newEmail());
  await expect(page).toHaveURL("/projects");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/projects");
  await expect(page).toHaveURL("/login");
});

test("AC3: log out ends the session on the server, so a copied cookie stops working", async ({ page, context }) => {
  await signUp(page, newEmail());
  await expect(page).toHaveURL("/projects");
  const copied = (await context.cookies()).filter((c) => c.name === "session");
  expect(copied).toHaveLength(1);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");

  await context.addCookies(copied);
  await page.goto("/projects");
  await expect(page).toHaveURL("/login");
});

test("AC3: logging back in with the right password works", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");

  await logIn(page, email, PASSWORD);
  await expect(page).toHaveURL("/projects");
  await expect(page.getByTestId("current-user")).toHaveText(email);
});

test("AC3: a wrong password shows 'Invalid email or password'", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");

  await logIn(page, email, "wrong-password");
  await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page).toHaveURL("/login");
});

test("AC3: an unknown email shows 'Invalid email or password'", async ({ page }) => {
  await logIn(page, newEmail(), PASSWORD);
  await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password");
});

test("AC4: the stored password is a salted hash, not the plain text", async ({ browser }) => {
  const a = newEmail();
  const b = newEmail();
  for (const email of [a, b]) {
    const page = await (await browser.newContext()).newPage();
    await signUp(page, email);
    await expect(page).toHaveURL("/projects");
  }

  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const rows = db
    .prepare("SELECT email, password_hash, password_salt FROM users WHERE email IN (?, ?)")
    .all(a, b) as { email: string; password_hash: string; password_salt: string }[];
  db.close();

  expect(rows).toHaveLength(2);
  for (const row of rows) {
    expect(row.password_hash).not.toBe(PASSWORD);
    expect(row.password_hash).not.toContain(PASSWORD);
    expect(row.password_hash).toMatch(/^[0-9a-f]{128}$/); // 64-byte scrypt key, hex
  }
  // Same password, different per-user salt -> different hashes.
  expect(rows[0].password_salt).not.toBe(rows[1].password_salt);
  expect(rows[0].password_hash).not.toBe(rows[1].password_hash);
});
