import { expect, test, type Page } from "@playwright/test";
import { cards, column, createProject, newUser, type ColumnName } from "./helpers";

const COLUMNS: ColumnName[] = ["To do", "In progress", "Done"];

async function addTask(page: Page, title: string) {
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
}

function columnEmpty(page: Page, name: ColumnName) {
  return column(page, name).locator("p.column-empty");
}

function noMatch(page: Page) {
  return page.getByRole("status").filter({ hasText: "No tasks match the search or filters" });
}

test("AC49: a project with no tasks shows 'No tasks' in each column and no 'No tasks match' message", async ({
  browser,
}) => {
  const a = await newUser(browser);
  await a.page.goto(await createProject(a.page, "Empty board"));
  for (const name of COLUMNS) await expect(columnEmpty(a.page, name)).toHaveText("No tasks");
  await expect(a.page.locator(".board-empty")).toHaveCount(0);
});

test("AC49: only columns without a visible task say 'No tasks'", async ({ browser }) => {
  const a = await newUser(browser);
  await a.page.goto(await createProject(a.page, "One task"));
  await addTask(a.page, "Only task");
  await expect(cards(a.page, "To do")).toHaveCount(1);
  await expect(columnEmpty(a.page, "To do")).toHaveCount(0);
  await expect(columnEmpty(a.page, "In progress")).toHaveText("No tasks");
  await expect(columnEmpty(a.page, "Done")).toHaveText("No tasks");
});

test("AC49: when search or filters hide every task the board says so above the columns, until a task matches", async ({
  browser,
}) => {
  const a = await newUser(browser);
  await a.page.goto(await createProject(a.page, "Filtered board"));
  await addTask(a.page, "Write docs");
  await expect(noMatch(a.page)).toHaveCount(0);

  const search = a.page.getByLabel("Search tasks");
  await search.fill("nothing like this");
  await expect(noMatch(a.page)).toBeVisible();
  for (const name of COLUMNS) await expect(columnEmpty(a.page, name)).toHaveText("No tasks");
  const message = (await noMatch(a.page).boundingBox())!;
  const todo = (await column(a.page, "To do").boundingBox())!;
  expect(message.y + message.height).toBeLessThanOrEqual(todo.y);
  const board = (await a.page.locator(".board").boundingBox())!;
  expect(message.width).toBeGreaterThan(board.width * 0.9); // spans the full grid row

  await search.fill("docs");
  await expect(noMatch(a.page)).toHaveCount(0);
  await expect(cards(a.page, "To do")).toHaveCount(1);

  await search.fill("");
  await a.page.getByLabel("Show tasks for").selectOption("Unassigned");
  await expect(noMatch(a.page)).toHaveCount(0);
  await a.page.getByLabel("Show tasks for").selectOption("My tasks");
  await expect(noMatch(a.page)).toBeVisible();
});
