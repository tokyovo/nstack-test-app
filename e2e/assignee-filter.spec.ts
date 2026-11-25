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

function query(page: Page, key: string) {
  return new URL(page.url()).searchParams.get(key);
}

test("AC30: the assignee filter lives in the URL with the search, without adding history; a reload keeps both", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Shareable filter");
  await a.page.goto(url);
  await invite(a.page, b.email);
  await addTask(a.page, "Mine", a.email, "release notes");
  await addTask(a.page, "Theirs one", b.email, "release plan");
  await addTask(a.page, "Theirs two", b.email);
  await a.page.goto(url);
  const historyLength = await a.page.evaluate(() => history.length);
  const filter = a.page.getByLabel("Show tasks for");
  const bId = await filter.locator("option", { hasText: b.email }).getAttribute("value");

  await filter.selectOption({ label: b.email });
  await expect.poll(() => query(a.page, "for")).toBe(bId);
  await a.page.getByLabel("Search tasks").fill("release");
  await expect.poll(() => query(a.page, "q")).toBe("release");
  expect(query(a.page, "for")).toBe(bId);
  expect(await a.page.evaluate(() => history.length)).toBe(historyLength);
  await expect(cardTitles(a.page)).toHaveText(["Theirs one"]);

  await a.page.reload();
  await expect(a.page.getByLabel("Show tasks for")).toHaveValue(bId!);
  await expect(a.page.getByLabel("Search tasks")).toHaveValue("release");
  await expect(cardTitles(a.page)).toHaveText(["Theirs one"]);

  await a.page.getByLabel("Show tasks for").selectOption({ label: "My tasks" });
  await expect.poll(() => query(a.page, "for")).toBe("mine");
  await expect(cardTitles(a.page)).toHaveText(["Mine"]);
  await a.page.getByLabel("Show tasks for").selectOption({ label: "All" });
  await expect.poll(() => query(a.page, "for")).toBeNull();
  expect(query(a.page, "q")).toBe("release");
  expect(await a.page.evaluate(() => history.length)).toBe(historyLength);
});

test("AC30: an unknown for value shows all tasks and is dropped on the next change", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Bogus filter");
  await a.page.goto(url);
  await addTask(a.page, "Mine", a.email);
  await addTask(a.page, "Nobody's", "Unassigned");

  await a.page.goto(`${url}?for=bogus`);
  await expect(a.page.getByLabel("Show tasks for")).toHaveValue("all");
  await expect(cardTitles(a.page)).toHaveCount(2);

  await a.page.goto(`${url}?for=999999`);
  await expect(a.page.getByLabel("Show tasks for")).toHaveValue("all");
  await expect(cardTitles(a.page)).toHaveCount(2);
  await a.page.getByLabel("Search tasks").fill("Mine");
  await expect.poll(() => query(a.page, "q")).toBe("Mine");
  expect(query(a.page, "for")).toBeNull();
  await expect(cardTitles(a.page)).toHaveText(["Mine"]);
});
