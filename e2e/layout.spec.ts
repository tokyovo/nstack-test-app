import { expect, test, type Page } from "@playwright/test";
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
