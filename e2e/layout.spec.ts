import { expect, test, type Browser, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { cards, column, createProject, newEmail, newUser, signUp, type ColumnName } from "./helpers";

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const COLUMNS: ColumnName[] = ["To do", "In progress", "Done"];

async function addTask(page: Page, title: string, description = "") {
  await page.getByLabel("Title").fill(title);
  if (description) await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Add task" }).click();
}

/** Asserts the document is no wider than the viewport (no horizontal scroll). */
async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, viewport } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(viewport);
}

/**
 * Stores a task straight in the DB, bypassing the 200-char title cap, as a task saved before the cap
 * existed would be. Returns its id.
 */
function insertTask(projectUrl: string, title: string): number {
  const db = new Database(process.env.E2E_DATABASE_PATH!);
  const projectId = Number(projectUrl.split("/").pop());
  const { lastInsertRowid } = db.prepare("INSERT INTO tasks (project_id, title) VALUES (?, ?)").run(projectId, title);
  db.close();
  return Number(lastInsertRowid);
}

test("AC15: at 1280x800 the three columns sit side by side", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Wide");
  await a.page.setViewportSize(DESKTOP);
  await a.page.goto(url);
  await addTask(a.page, "A card");
  await expect(cards(a.page, "To do")).toHaveCount(1);

  const boxes = await Promise.all(COLUMNS.map(async (name) => (await column(a.page, name).boundingBox())!));
  expect(boxes[1].y).toBe(boxes[0].y);
  expect(boxes[2].y).toBe(boxes[0].y);
  expect(boxes[1].x).toBeGreaterThanOrEqual(boxes[0].x + boxes[0].width);
  expect(boxes[2].x).toBeGreaterThanOrEqual(boxes[1].x + boxes[1].width);
});

test("AC15: at 390x844 the projects page and board have no horizontal scroll", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Narrow");
  await a.page.setViewportSize(PHONE);
  await a.page.goto("/projects");
  await expectNoHorizontalScroll(a.page);
  await a.page.goto(url);
  await addTask(a.page, "A card");
  await expect(cards(a.page, "To do")).toHaveCount(1);
  await expectNoHorizontalScroll(a.page);
});

test("AC15: at 390x844 a member with a long email (assignee option) causes no horizontal scroll", async ({ browser }) => {
  // The assignee <select> is as wide as its longest option; a long email must not widen the page.
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await signUp(page, `long-address-${"x".repeat(40)}-${newEmail()}`);
  await expect(page).toHaveURL("/projects");
  const url = await createProject(page, "Long email");
  await page.goto(url);
  await expect(page.getByLabel("Assignee")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await addTask(page, "A card");
  await expect(cards(page, "To do")).toHaveCount(1);
  await page.goto(`${url}/tasks/${(await page.getByRole("link", { name: "A card" }).getAttribute("href"))!.split("/").pop()}`);
  await expect(page.getByLabel("Assignee")).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("AC15: a 400-char unbroken title or description causes no horizontal scroll", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Long words");
  const longTitle = "T".repeat(400);
  const longDescription = "D".repeat(400);
  const taskId = insertTask(url, longTitle);
  await a.page.goto(url);
  await addTask(a.page, "Short title", longDescription);
  await expect(cards(a.page, "To do")).toHaveCount(2);
  const shortTaskHref = await a.page.getByRole("link", { name: "Short title" }).getAttribute("href");

  for (const size of [DESKTOP, PHONE]) {
    await a.page.setViewportSize(size);
    await a.page.goto(url);
    await expect(a.page.getByRole("link", { name: longTitle })).toBeVisible();
    await expectNoHorizontalScroll(a.page);

    await a.page.goto(`${url}/tasks/${taskId}`);
    await expect(a.page.getByRole("heading", { name: longTitle })).toBeVisible();
    await expectNoHorizontalScroll(a.page);

    await a.page.goto(shortTaskHref!);
    await expect(a.page.locator("dl").getByText(longDescription)).toBeVisible();
    await expectNoHorizontalScroll(a.page);
  }
});

test("AC15: a title is capped at 200 chars on the server", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Capped");
  await a.page.goto(url);

  const title = a.page.getByLabel("Title");
  await expect(title).toHaveAttribute("maxlength", "200");
  await title.evaluate((input) => input.removeAttribute("maxlength"));
  await addTask(a.page, "x".repeat(201));
  await expect(
    a.page.locator("form").filter({ has: a.page.getByRole("button", { name: "Add task" }) }).getByRole("alert"),
  ).toHaveText("Title must be at most 200 characters");
  await a.page.reload();
  await expect(cards(a.page, "To do")).toHaveCount(0);

  await addTask(a.page, "y".repeat(200));
  await expect(cards(a.page, "To do")).toHaveCount(1);
  await expect(cards(a.page, "To do")).toContainText("y".repeat(200));
});

test("AC41: at 390x844 a 40-char label on a card and a 200-char unbroken checklist item cause no horizontal scroll", async ({
  browser,
}) => {
  const page = await (await browser.newContext({ viewport: PHONE })).newPage();
  await signUp(page, newEmail());
  await expect(page).toHaveURL("/projects");
  const url = await createProject(page, "Long labels");
  await page.goto(url);
  const labelName = "W".repeat(40); // W is the widest glyph: unwrapped, 40 of them overflow a 390px card
  await page.getByLabel("Label name").fill(labelName);
  await page.getByRole("button", { name: "Create label" }).click();
  await expect(page.getByRole("list", { name: "Labels" }).getByText(labelName)).toBeVisible();
  await addTask(page, "A card");
  await page.getByRole("link", { name: "A card" }).click();
  await expect(page.getByRole("heading", { name: "A card" })).toBeVisible();
  const taskUrl = page.url();

  await page.getByRole("checkbox", { name: labelName }).check();
  await page.getByRole("button", { name: "Save labels" }).click();
  await expect(page.getByRole("status")).toHaveText("Labels saved");
  const item = "C".repeat(200);
  await page.getByLabel("New item").fill(item);
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("checkbox", { name: item })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.goto(url);
  await expect(cards(page, "To do").getByRole("list", { name: "Task labels" })).toHaveText(labelName);
  await expect(cards(page, "To do").locator("p.checklist-progress")).toHaveText("Checklist 0/1");
  await expectNoHorizontalScroll(page);
  await page.goto(taskUrl);
  await expectNoHorizontalScroll(page);
});

test("AC41: at 1280x800 a checklist item's Delete button sits within the form width, near its item", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: DESKTOP })).newPage();
  await signUp(page, newEmail());
  await expect(page).toHaveURL("/projects");
  const url = await createProject(page, "Wide checklist");
  await page.goto(url);
  await addTask(page, "A card");
  await page.getByRole("link", { name: "A card" }).click();
  await page.getByLabel("New item").fill("Proofread");
  await page.getByRole("button", { name: "Add item" }).click();
  const remove = page.getByRole("button", { name: 'Delete item "Proofread"' });
  await expect(remove).toBeVisible();

  const button = (await remove.boundingBox())!;
  const field = (await page.getByLabel("New item").boundingBox())!;
  expect(button.x + button.width).toBeLessThanOrEqual(field.x + field.width);
});

/**
 * A board like the seed's: the viewer has a 60+ char email (the widest assignee option), one label
 * and a few tasks. Returns the page on the board at `viewport`.
 */
async function seedLikeBoard(browser: Browser, viewport: { width: number; height: number }): Promise<Page> {
  const page = await (await browser.newContext({ viewport })).newPage();
  await signUp(page, `long-address-${"x".repeat(40)}-${newEmail()}`);
  await expect(page).toHaveURL("/projects");
  const url = await createProject(page, "Fold");
  await page.goto(url);
  await page.getByLabel("Label name").fill("Bug");
  await page.getByRole("button", { name: "Create label" }).click();
  await expect(page.getByRole("list", { name: "Labels" }).getByText("Bug")).toBeVisible();
  for (const [i, title] of ["First", "Second", "Third"].entries()) {
    await addTask(page, title);
    await expect(cards(page, "To do")).toHaveCount(i + 1);
  }
  await page.goto(url);
  return page;
}

/** The board's filter field labels, in page order: Search tasks, Show tasks for, Label. */
function filterLabels(page: Page) {
  return [
    page.locator("label.board-search"),
    page.locator("label.board-filter").filter({ hasText: /^Show tasks for/ }),
    page.locator("label.board-filter").filter({ hasText: /^Label/ }),
  ];
}

async function filterBoxes(page: Page) {
  return Promise.all(filterLabels(page).map(async (label) => (await label.boundingBox())!));
}

test("AC42: at 1280x800 the columns start above the fold and the three filters share one row", async ({ browser }) => {
  const page = await seedLikeBoard(browser, DESKTOP);
  const heading = (await page.getByRole("heading", { name: "To do", exact: true }).boundingBox())!;
  expect(heading.y).toBeLessThanOrEqual(400);

  const boxes = await filterBoxes(page);
  expect(Math.abs(boxes[1].y - boxes[0].y)).toBeLessThanOrEqual(4);
  expect(Math.abs(boxes[2].y - boxes[0].y)).toBeLessThanOrEqual(4);
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
  expect(boxes[2].x).toBeGreaterThan(boxes[1].x);

  // Each control stays in its own cell: the long-email assignee select does not reach into the Label cell.
  const labels = filterLabels(page);
  for (const i of [0, 1]) {
    const control = (await labels[i].locator(":is(input, select)").boundingBox())!;
    expect(control.x + control.width).toBeLessThanOrEqual(boxes[i + 1].x);
  }
});

test("AC42: at 390x844 the three filters stack and the board has no horizontal scroll", async ({ browser }) => {
  const page = await seedLikeBoard(browser, PHONE);
  const boxes = await filterBoxes(page);
  expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height);
  expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].y + boxes[1].height);
  await expectNoHorizontalScroll(page);
});

test("AC43: the new-task form sits after the board under 'New task', and the 'New task' link jumps to it", async ({
  browser,
}) => {
  const page = await seedLikeBoard(browser, DESKTOP);
  const done = (await column(page, "Done").boundingBox())!;
  const heading = page.getByRole("heading", { name: "New task", exact: true });
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Add task" }) });
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(done.y + done.height);
  expect((await form.boundingBox())!.y).toBeGreaterThanOrEqual(done.y + done.height);
  await expect(page.locator("section#new-task").getByRole("heading", { name: "New task", exact: true })).toBeVisible();
  await expect(page.locator("section#new-task form")).toHaveCount(1);

  await page.getByRole("link", { name: "New task", exact: true }).click();
  await expect(page).toHaveURL(/#new-task$/);
  await expect(page.getByLabel("Title")).toBeInViewport();
});

test("AC44: at 1280 the Export CSV, Export JSON and New task links are at least 8px apart", async ({ browser }) => {
  const page = await seedLikeBoard(browser, DESKTOP);
  const names = ["Export CSV", "Export JSON", "New task"];
  const boxes = await Promise.all(
    names.map(async (name) => (await page.getByRole("link", { name, exact: true }).boundingBox())!),
  );
  for (const i of [0, 1]) {
    expect(boxes[i + 1].x - (boxes[i].x + boxes[i].width)).toBeGreaterThanOrEqual(8);
  }
});

test("AC5: at 1280 the search box and both filter selects are the same height", async ({ browser }) => {
  const page = await seedLikeBoard(browser, DESKTOP);
  const heights = await Promise.all(
    filterLabels(page).map(async (label) => (await label.locator(":is(input, select)").boundingBox())!.height),
  );
  for (const height of heights.slice(1)) expect(Math.abs(height - heights[0])).toBeLessThanOrEqual(1);
});
