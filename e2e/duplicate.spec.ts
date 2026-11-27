import { expect, test, type Browser, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { cards, createProject, newUser, persistedMove, tamperBoundIds } from "./helpers";

async function invite(page: Page, projectUrl: string, email: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByRole("list", { name: "Members" }).getByText(email)).toBeVisible();
}

async function addTask(page: Page, projectUrl: string, title: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do").filter({ hasText: title })).toHaveCount(1);
}

/** Opens a task from the board by its title link; returns the task page path. */
async function openTask(page: Page, title: string): Promise<string> {
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function createLabel(page: Page, name: string) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Create label" }) });
  await form.getByLabel("Label name").fill(name);
  await form.getByRole("button", { name: "Create label" }).click();
  await expect(page.getByRole("list", { name: "Labels", exact: true })).toContainText(name);
}

function checklistBox(page: Page, text: string) {
  return page.getByRole("region", { name: "Checklist" }).getByRole("checkbox", { name: text, exact: true });
}

function comments(page: Page) {
  return page.getByRole("list", { name: "Comments" }).getByRole("listitem");
}

async function duplicate(page: Page) {
  await page.getByRole("button", { name: "Duplicate task" }).click();
}

function taskCount(projectUrl: string): number {
  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const row = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE project_id = ?").get(Number(projectUrl.split("/")[2])) as {
    n: number;
  };
  db.close();
  return row.n;
}

test("AC5: duplicating copies the fields, labels and an unticked checklist into To do, without comments", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Copies");
  await invite(a.page, url, b.email);
  await createLabel(a.page, "Design");
  await createLabel(a.page, "bug");
  await createLabel(a.page, "Unused");
  await a.page.getByLabel("Title").fill("Ship release");
  await a.page.getByLabel("Description").fill("Tag and announce");
  await a.page.getByLabel("Assignee").selectOption({ label: b.email });
  await a.page.getByLabel("Due date").fill("2999-03-15");
  await a.page.getByRole("button", { name: "Add task" }).click();
  const card = cards(a.page, "To do").filter({ hasText: "Ship release" });
  await card.focus();
  await persistedMove(a.page, () => a.page.keyboard.press("ArrowRight"));

  const originalUrl = await openTask(a.page, "Ship release");
  await a.page.getByRole("checkbox", { name: "Design" }).check();
  await a.page.getByRole("checkbox", { name: "bug" }).check();
  await a.page.getByRole("button", { name: "Save labels" }).click();
  await expect(a.page.getByRole("status").filter({ hasText: "Labels saved" })).toBeVisible();
  const itemInput = a.page.getByLabel("New item");
  for (const text of ["Write notes", "Tag build"]) {
    await itemInput.fill(text);
    await a.page.getByRole("button", { name: "Add item" }).click();
    await expect(checklistBox(a.page, text)).toBeVisible();
  }
  await persistedMove(a.page, () => checklistBox(a.page, "Write notes").check());
  await a.page.getByRole("textbox", { name: "Comment" }).fill("Waiting on QA");
  await a.page.getByRole("button", { name: "Add comment" }).click();
  await expect(comments(a.page)).toHaveCount(1);
  await a.page.goto(originalUrl);
  await expect(a.page.getByRole("checkbox", { name: "bug" })).toBeChecked();

  await duplicate(a.page);
  await expect(a.page.getByRole("heading", { name: "Copy of Ship release", exact: true })).toBeVisible();
  const copyUrl = new URL(a.page.url()).pathname;
  expect(copyUrl).toMatch(/^\/projects\/\d+\/tasks\/\d+$/);
  expect(copyUrl).not.toBe(originalUrl);

  await a.page.goto(copyUrl);
  const details = a.page.getByRole("main").locator("dl");
  await expect(details).toContainText("To do");
  await expect(details).toContainText("Tag and announce");
  await expect(details).toContainText(b.email);
  await expect(details).toContainText("2999-03-15");
  await expect(a.page.getByRole("checkbox", { name: "Design" })).toBeChecked();
  await expect(a.page.getByRole("checkbox", { name: "bug" })).toBeChecked();
  await expect(a.page.getByRole("checkbox", { name: "Unused" })).not.toBeChecked();
  await expect(a.page.getByRole("region", { name: "Checklist" }).getByRole("checkbox")).toHaveCount(2);
  await expect(a.page.getByRole("region", { name: "Checklist" }).getByRole("listitem")).toHaveText([
    /Write notes/,
    /Tag build/,
  ]);
  await expect(checklistBox(a.page, "Write notes")).not.toBeChecked();
  await expect(checklistBox(a.page, "Tag build")).not.toBeChecked();
  await expect(comments(a.page)).toHaveCount(0);

  await a.page.goto(originalUrl);
  await expect(a.page.getByRole("heading", { name: "Ship release", exact: true })).toBeVisible();
  await expect(a.page.getByRole("main").locator("dl")).toContainText("In progress");
  await expect(checklistBox(a.page, "Write notes")).toBeChecked();
  await expect(checklistBox(a.page, "Tag build")).not.toBeChecked();
  await expect(comments(a.page)).toHaveText([/Waiting on QA/]);

  await a.page.goto(url);
  await expect(cards(a.page, "To do")).toContainText(["Copy of Ship release"]);
  await expect(cards(a.page, "In progress")).toContainText(["Ship release"]);
  expect(taskCount(url)).toBe(2);
});

test("AC5: a copy of a 200-character title is cut to 200 characters with the prefix", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Long copies");
  const title = "T" + "a".repeat(199);
  await addTask(a.page, url, title);
  await openTask(a.page, title);

  await duplicate(a.page);
  const expected = "Copy of T" + "a".repeat(191);
  await expect(a.page.getByRole("heading", { name: expected, exact: true })).toBeVisible();
  expect(expected).toHaveLength(200);
});

test("AC5: a copy is cut by whole characters, so an emoji across the 200th place is dropped, not split", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Emoji copies");
  const title = "T" + "a".repeat(190) + "\u{1F600}" + "b".repeat(7);
  expect(title).toHaveLength(200);
  await addTask(a.page, url, title);
  await openTask(a.page, title);

  await duplicate(a.page);
  const expected = "Copy of T" + "a".repeat(190);
  await expect(a.page.getByRole("heading", { name: expected, exact: true })).toBeVisible();
  await expect(a.page.getByRole("heading", { level: 1 })).not.toContainText("�");
});

/** B presses Duplicate on B's own task while the bound [projectId, taskId] are rewritten; nothing is created anywhere. */
async function forgedDuplicate(browser: Browser, ids: (a: { projectId: number; taskId: number }) => (number | null)[]) {
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
  await duplicate(b.page);
  await answered();

  expect(taskCount(urlA)).toBe(1);
  expect(taskCount(urlB)).toBe(1);
  await a.page.goto(urlA);
  await expect(a.page.getByRole("link", { name: /Copy of/ })).toHaveCount(0);
}

test("AC5: a duplicate request naming a project the user is not a member of creates nothing", async ({ browser }) => {
  await forgedDuplicate(browser, (a) => [a.projectId, a.taskId]);
});

test("AC5: a duplicate request naming another project's task id creates nothing", async ({ browser }) => {
  await forgedDuplicate(browser, (a) => [null, a.taskId]); // keeps B's own project id
});
