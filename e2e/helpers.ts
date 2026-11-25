import { expect, type Browser, type Page } from "@playwright/test";

export const PASSWORD = "correct-horse-1";

/** A unique email per call, so parallel tests never collide on the shared DB. */
export function newEmail(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function signUp(page: Page, email: string, password = PASSWORD) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Signs up a fresh user in its own browser context and returns their page, on /projects. */
export async function newUser(browser: Browser): Promise<{ page: Page; email: string }> {
  const email = newEmail();
  const page = await (await browser.newContext()).newPage();
  await signUp(page, email);
  await expect(page).toHaveURL("/projects");
  return { page, email };
}

/** Creates a project from /projects and returns its URL path (/projects/<id>). */
export async function createProject(page: Page, name: string): Promise<string> {
  await page.goto("/projects");
  await page.getByLabel("New project name").fill(name);
  await page.getByRole("button", { name: "Create project" }).click();
  const link = page.getByRole("link", { name, exact: true });
  await expect(link).toBeVisible();
  return (await link.getAttribute("href"))!;
}
