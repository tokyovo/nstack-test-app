import { expect, test, type Locator, type Page } from "@playwright/test";
import { cards, createProject, newEmail, newUser, signUp } from "./helpers";

const DESKTOP = { width: 1280, height: 800 };

/** The form on the page whose submit button has this name. */
function formWith(page: Page, button: string): Locator {
  return page.locator("form").filter({ has: page.getByRole("button", { name: button, exact: true }) });
}

/**
 * For each label in the form: the bottom of its text and the box of its field. The label wraps its
 * field, so the text's own box (a Range over the label's text nodes) is what must sit above the field.
 */
async function labelBoxes(form: Locator) {
  return form.evaluate((el) =>
    [...el.querySelectorAll("label")].map((label) => {
      const range = document.createRange();
      const text = [...label.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
      range.selectNodeContents(text);
      const field = label.control!.getBoundingClientRect();
      return { name: text.textContent!.trim(), textBottom: range.getBoundingClientRect().bottom, fieldTop: field.top, fieldLeft: field.left };
    }),
  );
}

async function expectLabelsAboveFields(form: Locator, expectedLabels: string[]) {
  const boxes = await labelBoxes(form);
  expect(boxes.map((b) => b.name)).toEqual(expectedLabels);
  for (const box of boxes) expect(box.textBottom, `${box.name} label above its field`).toBeLessThanOrEqual(box.fieldTop);
  for (const box of boxes) expect(box.fieldLeft, `${box.name} field on the form's left edge`).toBe(boxes[0].fieldLeft);
}

async function addTask(page: Page, projectUrl: string, title: string): Promise<string> {
  await page.goto(projectUrl);
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do").filter({ hasText: title })).toHaveCount(1);
  return (await page.getByRole("link", { name: title, exact: true }).getAttribute("href"))!;
}

test.use({ viewport: DESKTOP });

test("AC24: login and signup labels sit above their fields, fields share a left edge", async ({ page }) => {
  await page.goto("/login");
  await expectLabelsAboveFields(formWith(page, "Log in"), ["Email", "Password"]);
  await page.goto("/signup");
  await expectLabelsAboveFields(formWith(page, "Sign up"), ["Email", "Password"]);
});

test("AC24: project, task, invite and comment form labels sit above their fields", async ({ browser }) => {
  const a = await newUser(browser);
  await a.page.setViewportSize(DESKTOP);
  const url = await createProject(a.page, "Layout");
  await expectLabelsAboveFields(formWith(a.page, "Create project"), ["New project name"]);

  const taskFields = ["Title", "Description", "Assignee", "Due date"];
  const taskUrl = await addTask(a.page, url, "A task");
  await expectLabelsAboveFields(formWith(a.page, "Add task"), taskFields);
  await expectLabelsAboveFields(formWith(a.page, "Invite"), ["Invite by email"]);

  await a.page.goto(taskUrl);
  await expectLabelsAboveFields(formWith(a.page, "Save changes"), taskFields);
  await expectLabelsAboveFields(formWith(a.page, "Add comment"), ["Comment"]);
});

/** Widths of the text inputs, textareas and selects in a form (hidden inputs excluded). */
async function fieldWidths(form: Locator) {
  return form.evaluate((el) =>
    [...el.querySelectorAll("input:not([type=hidden]), textarea, select")].map((field) => ({
      name: field.getAttribute("name"),
      width: field.getBoundingClientRect().width,
    })),
  );
}

async function expectTaskFieldWidths(form: Locator) {
  const widths = await fieldWidths(form);
  expect(widths.map((w) => w.name)).toEqual(["title", "description", "assigneeId", "dueDate"]);
  for (const { name, width } of widths) {
    expect(width, `${name} width`).toBeGreaterThanOrEqual(280);
    expect(width, `${name} width`).toBeLessThanOrEqual(512);
  }
}

test("AC25: task form fields are 280-512px wide with a 60+ char member email; the edit Title shows 40 chars", async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: DESKTOP })).newPage();
  const longEmail = `long-address-${"x".repeat(40)}-${newEmail()}`;
  expect(longEmail.length).toBeGreaterThanOrEqual(60);
  await signUp(page, longEmail);
  await expect(page).toHaveURL("/projects");
  const url = await createProject(page, "Widths");

  const title = "Prepare the launch checklist for Q3 2026";
  expect(title).toHaveLength(40);
  const taskUrl = await addTask(page, url, title);
  await expectTaskFieldWidths(formWith(page, "Add task"));

  await page.goto(taskUrl);
  const edit = formWith(page, "Save changes");
  await expectTaskFieldWidths(edit);
  const titleInput = edit.getByLabel("Title");
  await expect(titleInput).toHaveValue(title);
  const { scrollWidth, clientWidth } = await titleInput.evaluate((input) => ({ scrollWidth: input.scrollWidth, clientWidth: input.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test("AC26: on /projects a project's link, rename field, Rename and Delete sit on one row", async ({ browser }) => {
  const a = await newUser(browser);
  await a.page.setViewportSize(DESKTOP);
  await createProject(a.page, "One row");
  const row = a.page.getByRole("list", { name: "Your projects" }).getByRole("listitem").filter({ hasText: "One row" });
  const parts = [
    row.getByRole("link", { name: "One row", exact: true }),
    row.getByLabel("Rename One row"),
    row.getByRole("button", { name: "Rename", exact: true }),
    row.getByRole("button", { name: "Delete", exact: true }),
  ];
  const centers = await Promise.all(parts.map(async (part) => {
    const box = (await part.boundingBox())!;
    return box.y + box.height / 2;
  }));
  for (const center of centers) expect(Math.abs(center - centers[0])).toBeLessThanOrEqual(4);
});

test("on the task page at 1280, each label checkbox is vertically centred on its text", async ({ browser }) => {
  const { page } = await newUser(browser);
  await page.setViewportSize(DESKTOP);
  const url = await createProject(page, "Aligned boxes");
  await page.goto(url);
  await page.getByLabel("Label name").fill("Bug");
  await page.getByRole("button", { name: "Create label" }).click();
  await expect(page.getByRole("list", { name: "Labels" }).getByText("Bug")).toBeVisible();
  const taskUrl = await addTask(page, url, "Has a label");
  await page.goto(taskUrl);

  const { box, text } = await page.getByRole("checkbox", { name: "Bug" }).evaluate((input) => {
    const range = document.createRange();
    const node = [...input.parentElement!.childNodes].findLast((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
    range.selectNodeContents(node);
    const middle = (rect: DOMRect) => rect.top + rect.height / 2;
    return { box: middle(input.getBoundingClientRect()), text: middle(range.getBoundingClientRect()) };
  });
  expect(Math.abs(box - text), `checkbox centre ${box}, text centre ${text}`).toBeLessThanOrEqual(1);
});
