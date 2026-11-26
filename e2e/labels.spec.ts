import { expect, test, type Page } from "@playwright/test";
import { cards, createProject, newUser, tamperBoundIds, type ColumnName } from "./helpers";

function labelList(page: Page) {
  return page.getByRole("list", { name: "Labels", exact: true }).getByRole("listitem");
}

function labelForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Create label" }) });
}

/** Submits the board's label form with `name` as typed; `required` and `maxlength` are removed so the server decides. */
async function submitLabel(page: Page, name: string) {
  const input = labelForm(page).getByLabel("Label name");
  await input.evaluate((field) => {
    field.removeAttribute("required");
    field.removeAttribute("maxlength");
  });
  await input.fill(name);
  await labelForm(page).getByRole("button", { name: "Create label" }).click();
}

async function createLabel(page: Page, name: string) {
  await submitLabel(page, name);
  await expect(labelList(page).filter({ hasText: name.trim() })).toHaveCount(1);
}

async function addTask(page: Page, projectUrl: string, title: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do").filter({ hasText: title })).toHaveCount(1);
}

/** Opens a task from the board by its title link; returns the task page path. */
async function openTask(page: Page, title: string): Promise<string> {
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

function taskLabels(page: Page) {
  return page.getByRole("region", { name: "Labels" }).getByRole("checkbox");
}

async function saveLabels(page: Page) {
  await page.getByRole("button", { name: "Save labels" }).click();
  await expect(page.getByRole("status")).toHaveText("Labels saved");
}

function cardLabels(page: Page, column: ColumnName, title: string) {
  return cards(page, column).filter({ hasText: title }).getByRole("list", { name: "Task labels" }).getByRole("listitem");
}

test("AC36: creating labels lists them on the board in name order, any case", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Labelled");
  await a.page.goto(url);
  await expect(a.page.getByRole("heading", { name: "Labels", exact: true })).toBeVisible();
  await expect(a.page.getByText("No labels yet")).toBeVisible();
  await expect(labelList(a.page)).toHaveCount(0);

  await createLabel(a.page, "Bug");
  await expect(labelList(a.page)).toHaveText(["Bug"]);
  await expect(labelForm(a.page).getByLabel("Label name")).toHaveValue("");
  await expect(a.page.getByText("No labels yet")).toHaveCount(0);
  await createLabel(a.page, "  design  ");
  await createLabel(a.page, "Chore");

  await a.page.reload();
  await expect(labelList(a.page)).toHaveText(["Bug", "Chore", "design"]);
});

test("AC36: label errors are shown and the typed name is kept", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Strict labels");
  await a.page.goto(url);
  const alert = labelForm(a.page).getByRole("alert");
  const input = labelForm(a.page).getByLabel("Label name");
  await expect(input).toHaveAttribute("maxlength", "40");

  await submitLabel(a.page, "   ");
  await expect(alert).toHaveText("Label name is required");

  const long = "x".repeat(41);
  await submitLabel(a.page, long);
  await expect(alert).toHaveText("Label name must be at most 40 characters");
  await expect(input).toHaveValue(long);

  await createLabel(a.page, "x".repeat(40));
  await createLabel(a.page, "Bug");
  await submitLabel(a.page, "  bUG ");
  await expect(alert).toHaveText("That label already exists");
  await expect(input).toHaveValue("  bUG ");

  await a.page.reload();
  await expect(labelList(a.page)).toHaveText(["Bug", "x".repeat(40)]);
});

test("AC36: labels belong to one project and a name can exist in two projects", async ({ browser }) => {
  const a = await newUser(browser);
  const first = await createProject(a.page, "First");
  const second = await createProject(a.page, "Second");
  await a.page.goto(first);
  await createLabel(a.page, "Bug");
  await createLabel(a.page, "Only first");

  await a.page.goto(second);
  await expect(labelList(a.page)).toHaveCount(0);
  await createLabel(a.page, "bug");
  await a.page.reload();
  await expect(labelList(a.page)).toHaveText(["bug"]);
});
