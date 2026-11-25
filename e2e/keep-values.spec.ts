import { expect, test, type Page } from "@playwright/test";
import { cards, createProject, newEmail, newUser, PASSWORD, signUp } from "./helpers";

function formWith(page: Page, button: string) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: button }) });
}

test("AC20: signup keeps the email, not the password, after a validation error", async ({ page }) => {
  const email = newEmail();
  await signUp(page, email, "short7c");
  await expect(page.locator("form").getByRole("alert")).toHaveText("Password must be at least 8 characters");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");
});

test("AC20: login keeps the email, not the password, after a failed login", async ({ browser }) => {
  const { email } = await newUser(browser);
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(`${PASSWORD}-wrong`);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid email or password");
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Password")).toHaveValue("");
});

/** Fills a task form with a blank (spaces-only) title, which only the server rejects, and submits it. */
async function submitBlankTitle(page: Page, button: string, assignee: string) {
  const form = formWith(page, button);
  await form.getByLabel("Title").fill("   ");
  await form.getByLabel("Description").fill("Typed description");
  await form.getByLabel("Assignee").selectOption({ label: assignee });
  await form.getByLabel("Due date").fill("2999-03-14");
  await form.getByRole("button", { name: button }).click();
  await expect(form.getByRole("alert")).toHaveText("Title is required");
  return form;
}

async function expectKept(page: Page, button: string, assignee: string) {
  const form = formWith(page, button);
  await expect(form.getByLabel("Title")).toHaveValue("   ");
  await expect(form.getByLabel("Description")).toHaveValue("Typed description");
  await expect(form.getByLabel("Assignee").locator("option:checked")).toHaveText(assignee);
  await expect(form.getByLabel("Due date")).toHaveValue("2999-03-14");
}

test("AC20: the new-task form keeps title, description, assignee and due date after an error", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Keep new");
  await a.page.goto(url);
  await submitBlankTitle(a.page, "Add task", a.email);
  await expectKept(a.page, "Add task", a.email);
  await expect(cards(a.page, "To do")).toHaveCount(0);

  // The same invalid input again: still kept.
  const form = formWith(a.page, "Add task");
  const answered = a.page.waitForResponse((response) => !!response.request().headers()["next-action"]);
  await form.getByRole("button", { name: "Add task" }).click();
  await (await answered).finished();
  await expectKept(a.page, "Add task", a.email);
});

test("AC20: the edit-task form keeps the typed fields after an error", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Keep edit");
  await a.page.goto(url);
  await formWith(a.page, "Add task").getByLabel("Title").fill("Original");
  await a.page.getByRole("button", { name: "Add task" }).click();
  await a.page.getByRole("link", { name: "Original", exact: true }).click();
  await expect(a.page.getByRole("heading", { name: "Original", exact: true })).toBeVisible();

  await submitBlankTitle(a.page, "Save changes", a.email);
  await expectKept(a.page, "Save changes", a.email);
  await expect(a.page.getByRole("heading", { name: "Original", exact: true })).toBeVisible();
});

test("AC20: after a successful add the new-task form is empty again", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Keep then clear");
  await a.page.goto(url);
  await submitBlankTitle(a.page, "Add task", a.email);
  const form = formWith(a.page, "Add task");
  await form.getByLabel("Title").fill("Real title");
  await form.getByRole("button", { name: "Add task" }).click();
  await expect(cards(a.page, "To do").filter({ hasText: "Real title" })).toHaveCount(1);
  await expect(form.getByLabel("Title")).toHaveValue("");
  await expect(form.getByLabel("Description")).toHaveValue("");
  await expect(form.getByLabel("Due date")).toHaveValue("");
  await expect(form.getByRole("alert")).toHaveCount(0);
});
