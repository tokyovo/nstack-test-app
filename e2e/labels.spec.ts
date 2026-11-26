import { expect, test, type Browser, type Page } from "@playwright/test";
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

test("AC37: a task's labels are ticked on its page, saved, and shown on its card", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Tagged");
  await a.page.goto(url);
  await createLabel(a.page, "Design");
  await createLabel(a.page, "bug");
  await addTask(a.page, url, "Plain task");
  await addTask(a.page, url, "Fix header");
  await expect(cards(a.page, "To do")).toHaveCount(2);
  // A fresh visit, not reload(): Chromium restores ticked boxes on reload, which would hide a lost save.
  const taskUrl = await openTask(a.page, "Fix header");

  await expect(taskLabels(a.page)).toHaveCount(2);
  await expect(a.page.getByRole("checkbox", { name: "bug" })).not.toBeChecked();
  await expect(a.page.getByRole("checkbox", { name: "Design" })).not.toBeChecked();
  await a.page.getByRole("checkbox", { name: "Design" }).check();
  await a.page.getByRole("checkbox", { name: "bug" }).check();
  await saveLabels(a.page);
  await a.page.goto(taskUrl);
  await expect(a.page.getByRole("checkbox", { name: "bug" })).toBeChecked();
  await expect(a.page.getByRole("checkbox", { name: "Design" })).toBeChecked();

  await a.page.goto(url);
  await expect(cardLabels(a.page, "To do", "Fix header")).toHaveText(["bug", "Design"]);
  await expect(cardLabels(a.page, "To do", "Fix header").first()).toHaveClass("label");
  await expect(cards(a.page, "To do").filter({ hasText: "Plain task" }).getByRole("list")).toHaveCount(0);

  await openTask(a.page, "Fix header");
  await a.page.getByRole("checkbox", { name: "Design" }).uncheck();
  await saveLabels(a.page);
  await a.page.goto(taskUrl);
  await expect(a.page.getByRole("checkbox", { name: "bug" })).toBeChecked();
  await expect(a.page.getByRole("checkbox", { name: "Design" })).not.toBeChecked();
  await a.page.goto(url);
  await expect(cardLabels(a.page, "To do", "Fix header")).toHaveText(["bug"]);

  await openTask(a.page, "Fix header");
  await a.page.getByRole("checkbox", { name: "bug" }).uncheck();
  await saveLabels(a.page);
  await a.page.goto(url);
  await expect(cards(a.page, "To do").filter({ hasText: "Fix header" }).getByRole("list")).toHaveCount(0);
});

test("AC37: a task in a project with no labels says so", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Bare");
  await addTask(a.page, url, "Unlabelled");
  await openTask(a.page, "Unlabelled");
  await expect(a.page.getByRole("region", { name: "Labels" })).toContainText("No labels yet");
  await expect(taskLabels(a.page)).toHaveCount(0);
});

test("AC37: a label id from another project, put into the form, is ignored", async ({ browser }) => {
  const a = await newUser(browser);
  const other = await createProject(a.page, "Other");
  await a.page.goto(other);
  await createLabel(a.page, "Foreign");
  await addTask(a.page, other, "Other task");
  await openTask(a.page, "Other task");
  const foreignId = await a.page.getByRole("checkbox", { name: "Foreign" }).getAttribute("value");
  expect(foreignId).toMatch(/^\d+$/);

  const url = await createProject(a.page, "Home");
  await a.page.goto(url);
  await createLabel(a.page, "Bug");
  await addTask(a.page, url, "Home task");
  const taskUrl = await openTask(a.page, "Home task");
  const box = a.page.getByRole("checkbox", { name: "Bug" });
  await box.check();
  // After the tick: React puts the prop value back on the input after its change event.
  await box.evaluate((input, id) => input.setAttribute("value", id), foreignId!);
  await saveLabels(a.page);

  await a.page.goto(taskUrl);
  await expect(a.page.getByRole("checkbox", { name: "Bug" })).not.toBeChecked();
  await a.page.goto(url);
  await expect(cards(a.page, "To do").filter({ hasText: "Home task" }).getByRole("list")).toHaveCount(0);
  await a.page.goto(other);
  await expect(cards(a.page, "To do").filter({ hasText: "Other task" }).getByRole("list")).toHaveCount(0);
});

/** B saves labels on B's own task while the bound [projectId, taskId] are rewritten to `ids`; A's task keeps its label. */
async function tamperedSave(
  browser: Browser,
  ids: (a: { projectId: number; taskId: number }) => (number | null)[],
) {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Victim");
  await a.page.goto(urlA);
  await createLabel(a.page, "Bug");
  await addTask(a.page, urlA, "A's task");
  const taskUrlA = await openTask(a.page, "A's task");
  await a.page.getByRole("checkbox", { name: "Bug" }).check();
  await saveLabels(a.page);

  const urlB = await createProject(b.page, "Attacker");
  await b.page.goto(urlB);
  await createLabel(b.page, "Mine");
  await addTask(b.page, urlB, "B's task");
  await openTask(b.page, "B's task");
  const [, , projectId, , taskId] = taskUrlA.split("/");
  const answered = await tamperBoundIds(b.page, ids({ projectId: Number(projectId), taskId: Number(taskId) }));
  await b.page.getByRole("button", { name: "Save labels" }).click(); // nothing ticked: would clear A's labels
  await answered();

  await a.page.goto(urlA);
  await expect(cardLabels(a.page, "To do", "A's task")).toHaveText(["Bug"]);
}

test("AC37: a save-labels request naming a project the user is not a member of changes nothing", async ({
  browser,
}) => {
  await tamperedSave(browser, (a) => [a.projectId, a.taskId]);
});

test("AC37: a save-labels request naming another project's task id changes nothing", async ({ browser }) => {
  await tamperedSave(browser, (a) => [null, a.taskId]); // keeps B's own project id
});
