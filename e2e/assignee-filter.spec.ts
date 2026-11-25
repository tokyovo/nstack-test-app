import { expect, test, type Page } from "@playwright/test";
import { createProject, newUser } from "./helpers";

async function invite(page: Page, email: string) {
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByRole("list", { name: "Members" }).getByText(email)).toBeVisible();
}

async function addTask(page: Page, title: string, assignee: string, description = "") {
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Assignee").selectOption({ label: assignee });
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
}

/** The titles of every card on the board, in board order. */
function cardTitles(page: Page) {
  return page.locator("[data-task-id] strong");
}

test("AC21: the assignee filter shows My tasks, a member's tasks or Unassigned, and combines with search", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Filtered");
  await a.page.goto(url);
  await invite(a.page, b.email);
  await addTask(a.page, "Mine one", a.email, "release notes");
  await addTask(a.page, "Mine two", a.email);
  await addTask(a.page, "Theirs", b.email, "release plan");
  await addTask(a.page, "Nobody's", "Unassigned", "release party");

  const filter = a.page.getByLabel("Show tasks for");
  await expect(filter.locator("option")).toHaveText(["All", "My tasks", "Unassigned", a.email, b.email]);
  await expect(cardTitles(a.page)).toHaveCount(4);

  await filter.selectOption({ label: "My tasks" });
  await expect(cardTitles(a.page)).toHaveText(["Mine one", "Mine two"]);

  await filter.selectOption({ label: b.email });
  await expect(cardTitles(a.page)).toHaveText(["Theirs"]);

  await filter.selectOption({ label: "Unassigned" });
  await expect(cardTitles(a.page)).toHaveText(["Nobody's"]);

  const search = a.page.getByLabel("Search tasks");
  await search.fill("release");
  await expect(cardTitles(a.page)).toHaveText(["Nobody's"]);
  await filter.selectOption({ label: "My tasks" });
  await expect(cardTitles(a.page)).toHaveText(["Mine one"]);
  await search.fill("plan");
  await expect(cardTitles(a.page)).toHaveCount(0);

  await filter.selectOption({ label: "All" });
  await expect(cardTitles(a.page)).toHaveText(["Theirs"]);
  await search.fill("");
  await expect(cardTitles(a.page)).toHaveCount(4);
});

test("AC21: My tasks means the viewer's own tasks for each member", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Two views");
  await a.page.goto(url);
  await invite(a.page, b.email);
  await addTask(a.page, "For A", a.email);
  await addTask(a.page, "For B", b.email);

  await b.page.goto(url);
  await b.page.getByLabel("Show tasks for").selectOption({ label: "My tasks" });
  await expect(cardTitles(b.page)).toHaveText(["For B"]);
});
