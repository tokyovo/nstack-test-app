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
  return column(page, name).locator("li.task-card");
}

/**
 * Rewrites the leading ids bound (`.bind(null, projectId, ...)`) into the next server-action request
 * sent from `page`; a null entry keeps that id. The bound args travel as plain JSON in the multipart
 * body: the call args in field "0" (`[id,...,{},"$K1"]`) and, when the form was server-rendered, also
 * the bound list in `$ACTION_<n>:1` (`[id,...,{}]`). Every copy is rewritten; field "0" must be found.
 * An action that sends no form data posts the args as a bare JSON array (`[id,...]`); that counts as field "0".
 * Returns a function that resolves once the tampered request has been answered.
 */
export async function tamperBoundIds(page: Page, ids: (number | null)[]): Promise<() => Promise<void>> {
  let answered = false;
  const leading = new RegExp(`(name="(0|[^"]*\\$ACTION_\\d+:1)"\r\n\r\n\\[)${ids.map(() => "(\\d+),").join("")}`, "g");
  const bare = new RegExp(`^\\[${ids.map(() => "(\\d+)").join(",")}(?=[,\\]])`);
  await page.route("**/projects/**", async (route) => {
    const body = route.request().headers()["next-action"] ? route.request().postData() : null;
    if (!body) return route.continue();
    const fields: string[] = [];
    const rewrite = (rest: string[]) => ids.map((id, i) => `${id ?? rest[i]}`);
    const tampered = body
      .replace(leading, (_match, head: string, field: string, ...rest: string[]) => {
        fields.push(field);
        return head + rewrite(rest).join(",") + ",";
      })
      .replace(bare, (_match, ...rest: string[]) => {
        fields.push("0");
        return `[${rewrite(rest).join(",")}`;
      });
    expect(fields).toContain("0");
    const response = await route.fetch({ postData: tampered });
    await route.fulfill({ response });
    answered = true;
    await page.unroute("**/projects/**");
  });
  return () => expect.poll(() => answered).toBe(true);
}

/** Rewrites the bound project id of the next form-action request; see `tamperBoundIds`. */
export function tamperBoundProjectId(page: Page, projectId: number): Promise<() => Promise<void>> {
  return tamperBoundIds(page, [projectId]);
}

/**
 * Runs `move`, which must move one card on the board, and waits until the server has answered the
 * move's server action. The board updates optimistically, so the card shows in its new column before
 * the move is stored; a reload straight after that can beat the request and show the old column.
 */
export async function persistedMove(page: Page, move: () => Promise<void>) {
  const answered = page.waitForResponse(
    (response) => response.request().method() === "POST" && !!response.request().headers()["next-action"],
  );
  await move();
  await (await answered).finished();
}
