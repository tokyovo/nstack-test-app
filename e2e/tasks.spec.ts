import { expect, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { cards, column, createProject, newUser, tamperBoundProjectId } from "./helpers";

function taskError(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Add task" }) }).getByRole("alert");
}

async function invite(page: Page, projectUrl: string, email: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByRole("list", { name: "Members" }).getByText(email)).toBeVisible();
}

function userId(email: string): number {
  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
  db.close();
  return row.id;
}

test("AC8: the project page shows an empty three-column board", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Empty board");
  await a.page.goto(url);
  for (const name of ["To do", "In progress", "Done"] as const) {
    await expect(column(a.page, name).getByRole("heading", { name })).toBeVisible();
    await expect(cards(a.page, name)).toHaveCount(0);
  }
});

test("AC8: a member creates a task with all fields and it appears in To do", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Launch");
  await invite(a.page, url, b.email);

  await a.page.getByLabel("Title").fill("Write release notes");
  await a.page.getByLabel("Description").fill("Cover the new board");
  await a.page.getByLabel("Assignee").selectOption({ label: b.email });
  await a.page.getByLabel("Due date").fill("2026-12-31");
  await a.page.getByRole("button", { name: "Add task" }).click();

  for (const page of [a.page, b.page]) {
    if (page === b.page) await page.goto(url);
    else await page.reload();
    const card = cards(page, "To do");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Write release notes");
    await expect(card).toContainText(b.email);
    await expect(card).toContainText("2026-12-31");
    await expect(cards(page, "In progress")).toHaveCount(0);
    await expect(cards(page, "Done")).toHaveCount(0);
  }
});

test("AC8: a task needs only a title; assignee and due date are optional", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Minimal");
  await a.page.goto(url);

  await a.page.getByLabel("Title").fill("Just a title");
  await a.page.getByRole("button", { name: "Add task" }).click();

  const card = cards(a.page, "To do");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Just a title");
  await expect(card).toContainText("Unassigned");
  await expect(card).toContainText("No due date");
});

test("AC8: the title is required, also when the browser check is bypassed", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Strict");
  await a.page.goto(url);

  const title = a.page.getByLabel("Title");
  await expect(title).toHaveAttribute("required", "");
  await title.evaluate((input) => input.removeAttribute("required"));
  await title.fill("   ");
  await a.page.getByRole("button", { name: "Add task" }).click();

  await expect(taskError(a.page)).toHaveText("Title is required");
  await expect(cards(a.page, "To do")).toHaveCount(0);
});

test("AC8: a tampered form cannot assign a non-member or store a bad due date", async ({ browser }) => {
  const a = await newUser(browser);
  const outsider = await newUser(browser);
  const url = await createProject(a.page, "Guarded");
  await a.page.goto(url);

  const assignee = a.page.getByLabel("Assignee");
  await assignee.evaluate((select, id) => {
    const option = document.createElement("option");
    option.value = String(id);
    option.textContent = "outsider";
    select.appendChild(option);
  }, userId(outsider.email));
  await assignee.selectOption({ label: "outsider" });
  await a.page.getByLabel("Title").fill("Sneaky");
  await a.page.getByRole("button", { name: "Add task" }).click();
  await expect(taskError(a.page)).toHaveText("Assignee must be a project member");

  // A hand-crafted request: an extra dueDate field placed first, so the server reads it.
  // (Changing the date input's type does not stick: React resets it on re-render.)
  await assignee.selectOption({ label: "Unassigned" });
  await a.page.locator("form").filter({ has: assignee }).evaluate((form) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "dueDate";
    input.value = "next week";
    form.prepend(input);
  });
  await a.page.getByLabel("Title").fill("Vague");
  await a.page.getByRole("button", { name: "Add task" }).click();
  await expect(taskError(a.page)).toHaveText("Due date must be a date");

  await a.page.reload();
  await expect(cards(a.page, "To do")).toHaveCount(0);
});

test("AC8: a create request naming a project the user is not a member of adds no task there", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Private");
  const urlB = await createProject(b.page, "Mine");

  await b.page.goto(urlB);
  const answered = await tamperBoundProjectId(b.page, Number(urlA.split("/").pop()));
  await b.page.getByLabel("Title").fill("Planted");
  await b.page.getByRole("button", { name: "Add task" }).click();
  await answered();

  await a.page.goto(urlA);
  await expect(column(a.page, "To do")).toBeVisible();
  await expect(cards(a.page, "To do")).toHaveCount(0);
});

test("AC46: after adding a task the new-task form says what it added; the next submit replaces or clears it", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Busy board");
  await a.page.setViewportSize({ width: 1280, height: 800 });
  await a.page.goto(url);
  const form = a.page.locator("form").filter({ has: a.page.getByRole("button", { name: "Add task" }) });
  const status = form.getByRole("status");
  const title = a.page.getByLabel("Title");
  const add = a.page.getByRole("button", { name: "Add task" });

  for (const name of ["First task", "Second task", "Third task", "Fourth task"]) {
    await title.fill(name);
    await add.click();
    await expect(status).toHaveText(`Added "${name}"`);
    await expect(status).toBeInViewport();
  }
  await expect(cards(a.page, "To do")).toHaveCount(4);

  await title.evaluate((input) => input.removeAttribute("required"));
  await title.fill("   ");
  await add.click();
  await expect(taskError(a.page)).toHaveText("Title is required");
  await expect(status).toHaveCount(0);

  // The edit-task form shares the component but never shows a status.
  await cards(a.page, "To do").first().getByRole("link").first().click();
  const saved = a.page.waitForResponse((response) => response.request().method() === "POST");
  await a.page.getByRole("button", { name: "Save changes" }).click();
  await saved;
  const editForm = a.page.locator("form").filter({ has: a.page.getByRole("button", { name: "Save changes" }) });
  await expect(editForm.getByRole("button", { name: "Save changes" })).toBeEnabled();
  await expect(editForm.getByRole("status")).toHaveCount(0);
});
