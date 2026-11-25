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

export type ColumnName = "To do" | "In progress" | "Done";

/** A board column on a project page. */
export function column(page: Page, name: ColumnName) {
  return page.getByRole("region", { name, exact: true });
}

/** The task cards in a board column. */
export function cards(page: Page, name: ColumnName) {
  return column(page, name).getByRole("listitem");
}

/**
 * Rewrites the project id bound (`.bind(null, projectId)`) into the next form-action request
 * sent from `page` to `projectId`. The bound args travel as plain JSON in the multipart body:
 * the call args in field "0" (`[id,{},"$K1"]`) and the bound list in `$ACTION_<n>:1` (`[id,{}]`).
 * Returns a function that resolves once the tampered request has been answered.
 */
export async function tamperBoundProjectId(page: Page, projectId: number): Promise<() => Promise<void>> {
  let answered = false;
  await page.route("**/projects/*", async (route) => {
    const body = route.request().method() === "POST" ? route.request().postData() : null;
    if (!body?.includes("$ACTION_")) return route.continue();
    const tampered = body.replace(/(name="(?:0|[^"]*\$ACTION_\d+:1)"\r\n\r\n\[)\d+,/g, `$1${projectId},`);
    expect(tampered.match(new RegExp(`\\r\\n\\r\\n\\[${projectId},`, "g"))).toHaveLength(2);
    const response = await route.fetch({ postData: tampered });
    await route.fulfill({ response });
    answered = true;
    await page.unroute("**/projects/*");
  });
  return () => expect.poll(() => answered).toBe(true);
}
