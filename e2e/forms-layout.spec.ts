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
