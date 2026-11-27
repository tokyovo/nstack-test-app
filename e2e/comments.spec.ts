import { expect, test, type Browser, type Page } from "@playwright/test";
import { cards, createProject, newUser, tamperBoundIds } from "./helpers";

async function invite(page: Page, projectUrl: string, email: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByRole("list", { name: "Members" }).getByText(email)).toBeVisible();
}

async function addTask(page: Page, projectUrl: string, title: string, description = "") {
  await page.goto(projectUrl);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do").filter({ hasText: title })).toHaveCount(1);
}

/** Opens a task from the board by its title link; returns the task page path. */
async function openTask(page: Page, title: string): Promise<string> {
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

function comments(page: Page) {
  return page.getByRole("list", { name: "Comments" }).getByRole("listitem");
}

async function comment(page: Page, body: string) {
  await page.getByLabel("Comment", { exact: true }).fill(body);
  await page.getByRole("button", { name: "Add comment" }).click();
}

test("AC11: opening a task shows its details", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Details");
  await addTask(a.page, url, "Fix login", "Users see a blank page");

  const taskUrl = await openTask(a.page, "Fix login");
  expect(taskUrl).toMatch(/^\/projects\/\d+\/tasks\/\d+$/);
  const main = a.page.getByRole("main");
  await expect(main).toContainText("Users see a blank page");
  await expect(main).toContainText("To do");
  await expect(main).toContainText("Unassigned");
  await expect(main).toContainText("No due date");
  await expect(comments(a.page)).toHaveCount(0);
});

test("AC11: members add comments that show the author's email and persist", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Discuss");
  await invite(a.page, url, b.email);
  await addTask(a.page, url, "Pick a name");
  const taskUrl = await openTask(a.page, "Pick a name");

  await comment(a.page, "How about Orbit?");
  await expect(comments(a.page)).toHaveCount(1);
  await expect(comments(a.page).first()).toContainText("How about Orbit?");
  await expect(comments(a.page).first()).toContainText(a.email);
  await expect(a.page.getByLabel("Comment", { exact: true })).toHaveValue("");

  await b.page.goto(taskUrl);
  await expect(comments(b.page)).toHaveCount(1);
  await comment(b.page, "Sounds good");
  await expect(comments(b.page)).toHaveCount(2);
  await expect(comments(b.page).nth(1)).toContainText("Sounds good");
  await expect(comments(b.page).nth(1)).toContainText(b.email);

  await a.page.reload();
  await expect(comments(a.page)).toHaveCount(2);
  await expect(comments(a.page).nth(0)).toContainText(a.email);
  await expect(comments(a.page).nth(0)).toContainText("How about Orbit?");
  await expect(comments(a.page).nth(1)).toContainText(b.email);
  await expect(comments(a.page).nth(1)).toContainText("Sounds good");
});

test("AC11: an empty comment is not added", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Quiet");
  await addTask(a.page, url, "Nothing to say");
  await openTask(a.page, "Nothing to say");

  const body = a.page.getByLabel("Comment", { exact: true });
  await body.evaluate((input) => input.removeAttribute("required"));
  await comment(a.page, "   ");
  await expect(a.page.locator("form").getByRole("alert")).toHaveText("Comment is required");
  await a.page.reload();
  await expect(comments(a.page)).toHaveCount(0);
});

test("AC11: a non-member gets a 404 on a task URL, also when the task id belongs to another project", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Secret");
  await addTask(a.page, urlA, "Hidden task");
  const taskUrlA = await openTask(a.page, "Hidden task");
  const urlB = await createProject(b.page, "Own");

  expect((await b.page.goto(taskUrlA))?.status()).toBe(404);
  const taskId = taskUrlA.split("/").pop();
  expect((await b.page.goto(`${urlB}/tasks/${taskId}`))?.status()).toBe(404);
  expect((await a.page.goto(`${urlA}/tasks/999999`))?.status()).toBe(404);
});

/** B comments on B's own task while the bound [projectId, taskId] are rewritten to `ids` (null keeps one). */
async function tamperedComment(
  browser: Browser,
  ids: (a: { projectId: number; taskId: number }) => (number | null)[],
) {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Private");
  await addTask(a.page, urlA, "A's task");
  const taskUrlA = await openTask(a.page, "A's task");
  const urlB = await createProject(b.page, "Mine");
  await addTask(b.page, urlB, "B's task");
  await openTask(b.page, "B's task");

  const [, , projectId, , taskId] = taskUrlA.split("/");
  const answered = await tamperBoundIds(b.page, ids({ projectId: Number(projectId), taskId: Number(taskId) }));
  await comment(b.page, "Planted");
  await answered();

  await a.page.reload();
  await expect(a.page.getByRole("heading", { name: "A's task" })).toBeVisible();
  await expect(comments(a.page)).toHaveCount(0);
}

test("AC11: a comment request naming a project the user is not a member of adds nothing", async ({ browser }) => {
  await tamperedComment(browser, (a) => [a.projectId, a.taskId]);
});

test("AC11: a comment request naming another project's task id adds nothing", async ({ browser }) => {
  await tamperedComment(browser, (a) => [null, a.taskId]); // keeps B's own project id
});

test("AC7: a comment shows its author, then a UTC <time> with an ISO dateTime, then its body", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Timestamps");
  await addTask(a.page, url, "When was this");
  await openTask(a.page, "When was this");
  await comment(a.page, "Noted");

  const item = comments(a.page).first();
  const time = item.locator("time");
  await expect(time).toHaveText(/^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2} UTC$/);
  const dateTime = await time.getAttribute("dateTime");
  expect(dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
  // Stored in UTC seconds ago: the parsed instant is within a minute of now, not hours off by a zone.
  expect(Math.abs(Date.parse(dateTime ?? "") - Date.now())).toBeLessThan(60_000);
  await expect(item).toHaveText(new RegExp(`^${a.email.replace(/[.+]/g, "\\$&")}\\s*\\d.* UTC\\s*Noted$`));
});
