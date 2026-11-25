import { expect, test, type Browser, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { cards, createProject, newUser, tamperBoundIds } from "./helpers";

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

function editForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Save changes" }) });
}

function userId(email: string): number {
  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
  db.close();
  return row.id;
}

test("AC17: a member edits a task's fields; the changes persist and show on the board", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Editing");
  await invite(a.page, url, b.email);
  await addTask(a.page, url, "Draft title");
  await openTask(a.page, "Draft title");

  const form = editForm(a.page);
  await form.getByLabel("Title").fill("Final title");
  await form.getByLabel("Description").fill("Now with details");
  await form.getByLabel("Assignee").selectOption({ label: b.email });
  await form.getByLabel("Due date").fill("2999-06-30");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(a.page.getByRole("heading", { name: "Final title", exact: true })).toBeVisible();

  await a.page.reload();
  const main = a.page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Final title", exact: true })).toBeVisible();
  await expect(main.locator("dl")).toContainText("Now with details");
  await expect(main.locator("dl")).toContainText(b.email);
  await expect(main.locator("dl")).toContainText("2999-06-30");
  await expect(editForm(a.page).getByLabel("Title")).toHaveValue("Final title");
  await expect(editForm(a.page).getByLabel("Assignee")).toHaveValue(String(userId(b.email)));

  await b.page.goto(url);
  const card = cards(b.page, "To do");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Final title");
  await expect(card).toContainText(b.email);
  await expect(card).toContainText("Due 2999-06-30");
  await expect(card).not.toContainText("Draft title");
});

test("AC17: a member can clear the assignee and due date", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Clearing");
  await a.page.goto(url);
  await a.page.getByLabel("Title").fill("Has everything");
  await a.page.getByLabel("Assignee").selectOption({ label: a.email });
  await a.page.getByLabel("Due date").fill("2999-01-01");
  await a.page.getByRole("button", { name: "Add task" }).click();
  await openTask(a.page, "Has everything");

  const form = editForm(a.page);
  await form.getByLabel("Assignee").selectOption({ label: "Unassigned" });
  await form.getByLabel("Due date").fill("");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(a.page.locator("dl")).toContainText("Unassigned");

  await a.page.reload();
  await expect(a.page.locator("dl")).toContainText("Unassigned");
  await expect(a.page.locator("dl")).toContainText("No due date");
});

test("AC17: edits get the same validation as new tasks", async ({ browser }) => {
  const a = await newUser(browser);
  const outsider = await newUser(browser);
  const url = await createProject(a.page, "Rules");
  await addTask(a.page, url, "Keep me");
  await openTask(a.page, "Keep me");
  const form = editForm(a.page);
  const title = form.getByLabel("Title");
  await title.evaluate((input) => {
    input.removeAttribute("required");
    input.removeAttribute("maxlength");
  });

  await title.fill("   ");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByRole("alert")).toHaveText("Title is required");

  await title.fill("x".repeat(201));
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByRole("alert")).toHaveText("Title must be at most 200 characters");

  await title.fill("Keep me");
  const outsiderId = String(userId(outsider.email));
  await form
    .getByLabel("Assignee")
    .evaluate((select, id) => ((select as HTMLSelectElement).options[0].value = id), outsiderId);
  await form.getByLabel("Assignee").selectOption(outsiderId);
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByRole("alert")).toHaveText("Assignee must be a project member");

  await a.page.reload();
  await expect(a.page.getByRole("heading", { name: "Keep me", exact: true })).toBeVisible();
  await expect(a.page.locator("dl")).toContainText("Unassigned");
});

/** B acts on B's own task page while the bound [projectId, taskId] are rewritten to `ids` (null keeps one). */
async function tampered(
  browser: Browser,
  ids: (a: { projectId: number; taskId: number }) => (number | null)[],
  act: (page: Page) => Promise<void>,
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
  await act(b.page);
  await answered();

  await a.page.reload();
  await expect(a.page.getByRole("heading", { name: "A's task", exact: true })).toBeVisible();
}

async function editTitle(page: Page) {
  await editForm(page).getByLabel("Title").fill("Hijacked");
  await editForm(page).getByRole("button", { name: "Save changes" }).click();
}

test("AC17: an edit request naming a project the user is not a member of changes nothing", async ({ browser }) => {
  await tampered(browser, (a) => [a.projectId, a.taskId], editTitle);
});

test("AC17: an edit request naming another project's task id changes nothing", async ({ browser }) => {
  await tampered(browser, (a) => [null, a.taskId], editTitle); // keeps B's own project id
});
