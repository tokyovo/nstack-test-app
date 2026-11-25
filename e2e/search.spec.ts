import { expect, test, type Page } from "@playwright/test";
import { cards, createProject, newUser } from "./helpers";

async function addTask(page: Page, title: string, description = "") {
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
}

function allCards(page: Page) {
  return page.locator("[data-task-id]");
}

test("AC12: search filters the board by title or description, case-insensitively; clearing shows all", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Searchable");
  await a.page.goto(url);
  await addTask(a.page, "Fix Login bug", "Blank page after submit");
  await addTask(a.page, "Write docs", "Explain the LOGIN flow");
  await addTask(a.page, "Plan sprint", "Pick tickets");
  await a.page.locator("[data-task-id]").filter({ hasText: "Plan sprint" }).focus();
  await a.page.keyboard.press("ArrowRight");
  await expect(cards(a.page, "In progress")).toContainText(["Plan sprint"]);

  const search = a.page.getByLabel("Search tasks");
  await search.fill("login");
  await expect(allCards(a.page)).toHaveCount(2);
  await expect(cards(a.page, "To do")).toContainText(["Fix Login bug", "Write docs"]);

  await search.fill("TICKETS");
  await expect(allCards(a.page)).toHaveCount(1);
  await expect(cards(a.page, "In progress")).toContainText(["Plan sprint"]);
  await expect(cards(a.page, "To do")).toHaveCount(0);

  await search.fill("nothing like this");
  await expect(allCards(a.page)).toHaveCount(0);

  await search.fill("");
  await expect(allCards(a.page)).toHaveCount(3);
  await expect(cards(a.page, "To do")).toHaveCount(2);
  await expect(cards(a.page, "In progress")).toContainText(["Plan sprint"]);
});
