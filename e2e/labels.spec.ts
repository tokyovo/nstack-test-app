import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applySchema } from "../lib/schema";
import { cards, createProject, newUser, tamperBoundIds, type ColumnName } from "./helpers";

function labelList(page: Page) {
  return page.getByRole("list", { name: "Labels", exact: true }).getByRole("listitem");
}

/** The chips of the board's Labels list, one per label in list order (each row also holds its edit form). */
function labelChips(page: Page) {
  return page.getByRole("list", { name: "Labels", exact: true }).locator(".label-chip");
}

function labelForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Create label" }) });
}

/** Submits the board's label form with `name` as typed; `required` and `maxlength` are removed so the server decides. */
async function submitLabel(page: Page, name: string, colour?: string) {
  const input = labelForm(page).getByLabel("Label name");
  await input.evaluate((field) => {
    field.removeAttribute("required");
    field.removeAttribute("maxlength");
  });
  await input.fill(name);
  if (colour) await labelForm(page).getByLabel("Colour").selectOption({ label: colour });
  await labelForm(page).getByRole("button", { name: "Create label" }).click();
}

async function createLabel(page: Page, name: string, colour?: string) {
  await submitLabel(page, name, colour);
  await expect(labelList(page).filter({ hasText: name.trim() })).toHaveCount(1);
}

/** The coloured chip that shows a label's name inside `scope`. */
function chip(scope: Page | Locator, name: string) {
  return scope.locator(".label-chip").filter({ hasText: new RegExp(`^${name}$`) });
}

/** The chip's computed background and text colours. */
function chipColours(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
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
  await expect(labelChips(a.page)).toHaveText(["Bug"]);
  await expect(labelForm(a.page).getByLabel("Label name")).toHaveValue("");
  await expect(a.page.getByText("No labels yet")).toHaveCount(0);
  await createLabel(a.page, "  design  ");
  await createLabel(a.page, "Chore");

  await a.page.reload();
  await expect(labelChips(a.page)).toHaveText(["Bug", "Chore", "design"]);
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
  await expect(labelChips(a.page)).toHaveText(["Bug", "x".repeat(40)]);
});

test("AC1: after a create error the New label form keeps the picked colour; after a create it is Gray again", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Colour kept");
  await a.page.goto(url);
  const alert = labelForm(a.page).getByRole("alert");
  const colour = labelForm(a.page).getByLabel("Colour");

  await submitLabel(a.page, "   ", "Blue");
  await expect(alert).toHaveText("Label name is required");
  await expect(colour).toHaveValue("blue");

  await createLabel(a.page, "Bug");
  await submitLabel(a.page, "bug", "Red");
  await expect(alert).toHaveText("That label already exists");
  await expect(colour).toHaveValue("red");

  await submitLabel(a.page, "Chore", "Green");
  await expect(labelChips(a.page)).toHaveText(["Bug", "Chore"]);
  await expect(chip(a.page.getByRole("list", { name: "Labels", exact: true }), "Chore")).toHaveClass(
    "label-chip label-green",
  );
  await expect(colour).toHaveValue("gray");
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
  await expect(labelChips(a.page)).toHaveText(["bug"]);
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
  await expect(cardLabels(a.page, "To do", "Fix header").first().locator(".label-chip")).toHaveClass(
    "label-chip label-gray",
  );
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

/** Ticks `names` on the task's page and saves, then returns to the board. */
async function labelTask(page: Page, projectUrl: string, title: string, names: string[]) {
  await page.goto(projectUrl);
  await openTask(page, title);
  for (const name of names) await page.getByRole("checkbox", { name, exact: true }).check();
  await saveLabels(page);
  await page.goto(projectUrl);
}

/** The titles of every card on the board, in board order. */
function cardTitles(page: Page) {
  return page.locator("[data-task-id] strong");
}

/** The board's label select; its name also holds the chosen option ("Label All labels"), as with "Show tasks for". */
function labelFilter(page: Page) {
  return page.getByRole("combobox", { name: /^Label\b/ });
}

function query(page: Page, key: string) {
  return new URL(page.url()).searchParams.get(key);
}

/** A project with labels Bug and Design and four tasks; "Fix login" is assigned to the creator. */
async function labelledBoard(browser: Browser) {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Filter by label");
  await a.page.goto(url);
  await createLabel(a.page, "Design");
  await createLabel(a.page, "Bug");
  await a.page.getByLabel("Title").fill("Fix login");
  await a.page.getByLabel("Assignee").selectOption({ label: a.email });
  await a.page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(a.page, "To do").filter({ hasText: "Fix login" })).toHaveCount(1);
  await addTask(a.page, url, "Fix logo");
  await addTask(a.page, url, "Draw icons");
  await addTask(a.page, url, "Plain");
  await labelTask(a.page, url, "Fix login", ["Bug"]);
  await labelTask(a.page, url, "Fix logo", ["Bug", "Design"]);
  await labelTask(a.page, url, "Draw icons", ["Design"]);
  return { ...a, url };
}

test("AC38: the label filter shows only tasks with that label and combines with search and assignee", async ({
  browser,
}) => {
  const a = await labelledBoard(browser);
  const filter = labelFilter(a.page);
  await expect(filter).toHaveValue("all");
  await expect(filter.locator("option")).toHaveText(["All labels", "Bug", "Design"]);
  await expect(cardTitles(a.page)).toHaveCount(4);

  await filter.selectOption({ label: "Bug" });
  await expect(cardTitles(a.page)).toHaveText(["Fix login", "Fix logo"]);
  await filter.selectOption({ label: "Design" });
  await expect(cardTitles(a.page)).toHaveText(["Fix logo", "Draw icons"]);

  await a.page.getByLabel("Search tasks").fill("fix");
  await expect(cardTitles(a.page)).toHaveText(["Fix logo"]);
  await filter.selectOption({ label: "Bug" });
  await expect(cardTitles(a.page)).toHaveText(["Fix login", "Fix logo"]);
  await a.page.getByLabel("Show tasks for").selectOption({ label: "My tasks" });
  await expect(cardTitles(a.page)).toHaveText(["Fix login"]);
  await filter.selectOption({ label: "Design" });
  await expect(cardTitles(a.page)).toHaveCount(0);

  await filter.selectOption({ label: "All labels" });
  await expect(cardTitles(a.page)).toHaveText(["Fix login"]);
});

test("AC38: a board with no labels still has the label filter with only All labels", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "No labels");
  await addTask(a.page, url, "Lonely");
  await expect(labelFilter(a.page).locator("option")).toHaveText(["All labels"]);
  await expect(cardTitles(a.page)).toHaveText(["Lonely"]);
});

test("AC38: the label filter lives in the URL without adding history; a reload keeps it", async ({ browser }) => {
  const a = await labelledBoard(browser);
  const historyLength = await a.page.evaluate(() => history.length);
  const bugId = await labelFilter(a.page).locator("option", { hasText: "Bug" }).getAttribute("value");
  expect(bugId).toMatch(/^\d+$/);

  await labelFilter(a.page).selectOption({ label: "Bug" });
  await expect.poll(() => query(a.page, "label")).toBe(bugId);
  await a.page.getByLabel("Search tasks").fill("logo");
  await expect.poll(() => query(a.page, "q")).toBe("logo");
  await a.page.getByLabel("Show tasks for").selectOption({ label: "Unassigned" });
  await expect.poll(() => query(a.page, "for")).toBe("unassigned");
  expect(query(a.page, "label")).toBe(bugId);
  expect(await a.page.evaluate(() => history.length)).toBe(historyLength);
  await expect(cardTitles(a.page)).toHaveText(["Fix logo"]);

  await a.page.reload();
  await expect(labelFilter(a.page)).toHaveValue(bugId!);
  await expect(a.page.getByLabel("Search tasks")).toHaveValue("logo");
  await expect(a.page.getByLabel("Show tasks for")).toHaveValue("unassigned");
  await expect(cardTitles(a.page)).toHaveText(["Fix logo"]);

  await labelFilter(a.page).selectOption({ label: "All labels" });
  await expect.poll(() => query(a.page, "label")).toBeNull();
  expect(query(a.page, "q")).toBe("logo");
  expect(query(a.page, "for")).toBe("unassigned");
  expect(await a.page.evaluate(() => history.length)).toBe(historyLength);
});

test("AC38: an unknown or another project's label id shows all labels", async ({ browser }) => {
  const a = await labelledBoard(browser);
  const other = await createProject(a.page, "Elsewhere");
  await a.page.goto(other);
  await createLabel(a.page, "Foreign");
  const foreignId = await labelFilter(a.page).locator("option", { hasText: "Foreign" }).getAttribute("value");
  expect(foreignId).toMatch(/^\d+$/);

  for (const id of ["999999", foreignId!, "bogus"]) {
    await a.page.goto(`${a.url}?label=${id}`);
    await expect(labelFilter(a.page)).toHaveValue("all");
    await expect(cardTitles(a.page)).toHaveCount(4);
  }
  await a.page.getByLabel("Search tasks").fill("Plain");
  await expect.poll(() => query(a.page, "q")).toBe("Plain");
  expect(query(a.page, "label")).toBeNull();
  await expect(cardTitles(a.page)).toHaveText(["Plain"]);
});

const BLUE = { background: "rgb(223, 235, 251)", color: "rgb(31, 79, 143)" }; // #DFEBFB, #1F4F8F
const GRAY = { background: "rgb(232, 234, 237)", color: "rgb(58, 65, 73)" }; // #E8EAED, #3A4149

test("AC1: a label's colour shows on its chip in the Labels list, on cards and on the task page; Gray is the default", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Colourful");
  await a.page.goto(url);
  const colour = labelForm(a.page).getByLabel("Colour");
  await expect(colour.locator("option")).toHaveText(["Gray", "Green", "Blue", "Purple", "Orange", "Red"]);
  await expect(colour).toHaveValue("gray");

  await createLabel(a.page, "Urgent", "Blue");
  await expect(colour).toHaveValue("gray");
  await createLabel(a.page, "Someday");
  await a.page.reload();
  const list = a.page.getByRole("list", { name: "Labels", exact: true });
  await expect(chip(list, "Urgent")).toHaveClass("label-chip label-blue");
  expect(await chipColours(chip(list, "Urgent"))).toEqual(BLUE);
  await expect(chip(list, "Someday")).toHaveClass("label-chip label-gray");
  expect(await chipColours(chip(list, "Someday"))).toEqual(GRAY);

  await addTask(a.page, url, "Ship it");
  await openTask(a.page, "Ship it");
  const section = a.page.getByRole("region", { name: "Labels" });
  expect(await chipColours(chip(section, "Urgent"))).toEqual(BLUE);
  expect(await chipColours(chip(section, "Someday"))).toEqual(GRAY);
  await a.page.getByRole("checkbox", { name: "Urgent" }).check();
  await a.page.getByRole("checkbox", { name: "Someday" }).check();
  await saveLabels(a.page);

  await a.page.goto(url);
  const card = cards(a.page, "To do").filter({ hasText: "Ship it" });
  await expect(cardLabels(a.page, "To do", "Ship it")).toHaveText(["Someday", "Urgent"]);
  expect(await chipColours(chip(card, "Urgent"))).toEqual(BLUE);
  expect(await chipColours(chip(card, "Someday"))).toEqual(GRAY);
});

test("AC1: a colour that is not in the list is rejected and nothing is stored", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Forged colour");
  await a.page.goto(url);
  await labelForm(a.page)
    .getByLabel("Colour")
    .evaluate((select: HTMLSelectElement) => {
      select.options[select.selectedIndex].value = "pink";
    });
  await submitLabel(a.page, "Hot");
  await expect(labelForm(a.page).getByRole("alert")).toHaveText("Pick a colour from the list");
  await expect(labelForm(a.page).getByLabel("Label name")).toHaveValue("Hot");

  await a.page.reload();
  await expect(labelList(a.page)).toHaveCount(0);
});

/** The tables a label touches, as they were before labels had a colour. */
const OLD_LABELS_SCHEMA = `
CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assignee_id INTEGER,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE labels (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE (project_id, name COLLATE NOCASE)
);
CREATE TABLE task_labels (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);
INSERT INTO projects (id, name) VALUES (1, 'Old project');
INSERT INTO tasks (id, project_id, title) VALUES (7, 1, 'Old task');
INSERT INTO labels (id, project_id, name) VALUES (3, 1, 'Legacy');
INSERT INTO task_labels (task_id, label_id) VALUES (7, 3);
`;

test("AC2: a database file from before label colours opens; its labels become Gray and keep names and task links", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskboard-migrate-"));
  try {
    const file = path.join(dir, "old.db");
    const old = new Database(file);
    old.exec(OLD_LABELS_SCHEMA);
    old.close();

    for (let open = 0; open < 2; open++) {
      const db = new Database(file);
      try {
        applySchema(db);
        expect(db.prepare("SELECT id, name, color FROM labels").all()).toEqual([{ id: 3, name: "Legacy", color: "gray" }]);
        expect(db.prepare("SELECT task_id, label_id FROM task_labels").all()).toEqual([{ task_id: 7, label_id: 3 }]);
      } finally {
        db.close();
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("AC2: the database accepts a label colour outside today's list, on an old file and a new one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "taskboard-migrate-"));
  try {
    const oldFile = path.join(dir, "old.db");
    const old = new Database(oldFile);
    old.exec(OLD_LABELS_SCHEMA);
    old.close();

    for (const file of [oldFile, path.join(dir, "new.db")]) {
      const db = new Database(file);
      try {
        applySchema(db);
        db.prepare("INSERT OR IGNORE INTO projects (id, name) VALUES (1, 'Project')").run();
        db.prepare("INSERT INTO labels (project_id, name, color) VALUES (1, 'Future', 'future-colour')").run();
        expect(db.prepare("SELECT color FROM labels WHERE name = 'Future'").get()).toEqual({ color: "future-colour" });
      } finally {
        db.close();
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** The Labels list row whose edit form is for the label now named `name`. */
function labelRow(page: Page, name: string) {
  return labelList(page).filter({ has: page.getByLabel(`Name for ${name}`, { exact: true }) });
}

/** Submits `name`'s row edit form with `newName` as typed (`required`, `maxlength` removed) and maybe a colour. */
async function submitRename(page: Page, name: string, newName: string, colour?: string) {
  const row = labelRow(page, name);
  const input = row.getByLabel(`Name for ${name}`, { exact: true });
  await input.evaluate((field) => {
    field.removeAttribute("required");
    field.removeAttribute("maxlength");
  });
  await input.fill(newName);
  if (colour) await row.getByLabel(`Colour for ${name}`, { exact: true }).selectOption({ label: colour });
  await row.getByRole("button", { name: "Save", exact: true }).click();
}

/** The label's id, read from the board's label filter. */
async function labelId(page: Page, name: string): Promise<string> {
  const id = await labelFilter(page).locator("option", { hasText: name }).getAttribute("value");
  expect(id).toMatch(/^\d+$/);
  return id!;
}

test("AC3: renaming and recolouring a label shows everywhere: list, cards, filter and task page", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Renamed labels");
  await a.page.goto(url);
  await createLabel(a.page, "Bug");
  await createLabel(a.page, "Design");
  await addTask(a.page, url, "Fix header");
  await labelTask(a.page, url, "Fix header", ["Bug"]);
  const id = await labelId(a.page, "Bug");

  await submitRename(a.page, "Bug", "  Zebra ", "Blue");
  await expect(labelChips(a.page)).toHaveText(["Design", "Zebra"]);
  const row = labelRow(a.page, "Zebra");
  await expect(row.getByLabel("Name for Zebra", { exact: true })).toHaveValue("Zebra");
  await expect(row.getByLabel("Colour for Zebra", { exact: true })).toHaveValue("blue");
  await expect(row.getByRole("alert")).toHaveCount(0);

  await a.page.goto(url);
  expect(await chipColours(chip(a.page.getByRole("list", { name: "Labels", exact: true }), "Zebra"))).toEqual(BLUE);
  await expect(cardLabels(a.page, "To do", "Fix header")).toHaveText(["Zebra"]);
  expect(await chipColours(chip(cards(a.page, "To do"), "Zebra"))).toEqual(BLUE);
  await expect(labelFilter(a.page).locator("option")).toHaveText(["All labels", "Design", "Zebra"]);
  expect(await labelId(a.page, "Zebra")).toBe(id);
  await labelFilter(a.page).selectOption({ label: "Zebra" });
  await expect(cardTitles(a.page)).toHaveText(["Fix header"]);

  await a.page.goto(url);
  await openTask(a.page, "Fix header");
  await expect(a.page.getByRole("checkbox", { name: "Zebra", exact: true })).toBeChecked();
  expect(await chipColours(chip(a.page.getByRole("region", { name: "Labels" }), "Zebra"))).toEqual(BLUE);
  await expect(a.page.getByRole("checkbox", { name: "Bug" })).toHaveCount(0);
});

test("AC3: rename errors show on that row and keep the typed name and colour; nothing changes", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Strict renames");
  await a.page.goto(url);
  await createLabel(a.page, "Bug");
  await createLabel(a.page, "Chore");
  const row = labelRow(a.page, "Bug");
  const alert = row.getByRole("alert");
  const input = row.getByLabel("Name for Bug", { exact: true });
  await expect(input).toHaveAttribute("maxlength", "40");

  await submitRename(a.page, "Bug", "   ");
  await expect(alert).toHaveText("Label name is required");

  const long = "y".repeat(41);
  await submitRename(a.page, "Bug", long);
  await expect(alert).toHaveText("Label name must be at most 40 characters");
  await expect(input).toHaveValue(long);

  await submitRename(a.page, "Bug", " cHORE ", "Red");
  await expect(alert).toHaveText("That label already exists");
  await expect(input).toHaveValue(" cHORE ");
  await expect(row.getByLabel("Colour for Bug", { exact: true })).toHaveValue("red");
  await expect(labelRow(a.page, "Chore").getByRole("alert")).toHaveCount(0);

  await row.getByLabel("Colour for Bug", { exact: true }).evaluate((select: HTMLSelectElement) => {
    select.options[select.selectedIndex].value = "pink";
  });
  await submitRename(a.page, "Bug", "Hot");
  await expect(alert).toHaveText("Pick a colour from the list");
  await expect(input).toHaveValue("Hot");

  await a.page.reload();
  await expect(labelChips(a.page)).toHaveText(["Bug", "Chore"]);
  await expect(chip(a.page.getByRole("list", { name: "Labels", exact: true }), "Bug")).toHaveClass(
    "label-chip label-gray",
  );
});

test("AC3: a label can be renamed to its own name in another case", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Case rename");
  await a.page.goto(url);
  await createLabel(a.page, "Bug");
  await submitRename(a.page, "Bug", "BUG");
  await expect(labelChips(a.page)).toHaveText(["BUG"]);
  await a.page.reload();
  await expect(labelChips(a.page)).toHaveText(["BUG"]);
});

/** B acts on B's own label "Mine" while the bound [projectId, labelId] are rewritten to `ids`; nothing changes. */
async function tamperedLabelRequest(
  browser: Browser,
  ids: (a: { projectId: number; labelId: number }) => (number | null)[],
  act: (page: Page) => Promise<void>,
) {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Victim");
  await a.page.goto(urlA);
  await createLabel(a.page, "Bug");
  await addTask(a.page, urlA, "A's task");
  await labelTask(a.page, urlA, "A's task", ["Bug"]);
  const labelIdA = Number(await labelId(a.page, "Bug"));
  const projectIdA = Number(urlA.split("/").pop());

  const urlB = await createProject(b.page, "Attacker");
  await b.page.goto(urlB);
  await createLabel(b.page, "Mine");
  const answered = await tamperBoundIds(b.page, ids({ projectId: projectIdA, labelId: labelIdA }));
  await act(b.page);
  await answered();

  await a.page.goto(urlA);
  await expect(labelChips(a.page)).toHaveText(["Bug"]);
  await expect(chip(a.page.getByRole("list", { name: "Labels", exact: true }), "Bug")).toHaveClass(
    "label-chip label-gray",
  );
  await expect(cardLabels(a.page, "To do", "A's task")).toHaveText(["Bug"]);
  await b.page.goto(urlB);
  await expect(labelChips(b.page)).toHaveText(["Mine"]);
}

test("AC36: a create-label request naming a project the user is not a member of adds no label there", async ({
  browser,
}) => {
  await tamperedLabelRequest(browser, (a) => [a.projectId], (page) => submitLabel(page, "Hacked"));
});

const renameMine = (page: Page) => submitRename(page, "Mine", "Hacked", "Red");

test("AC3: a rename request naming a project the user is not a member of changes nothing", async ({ browser }) => {
  await tamperedLabelRequest(browser, (a) => [a.projectId, a.labelId], renameMine);
});

test("AC3: a rename request naming another project's label id changes nothing", async ({ browser }) => {
  await tamperedLabelRequest(browser, (a) => [null, a.labelId], renameMine); // keeps B's own project id
});

/** Clicks `name`'s Delete label and answers the confirm; returns the confirm's message. */
async function deleteLabel(page: Page, name: string, answer: "accept" | "dismiss"): Promise<string> {
  let message = "";
  page.once("dialog", (dialog) => {
    message = dialog.message();
    void dialog[answer]();
  });
  await labelRow(page, name).getByRole("button", { name: "Delete label" }).click();
  await expect.poll(() => message).not.toBe("");
  return message;
}

test("AC4: Delete label asks first; accepting removes it from the list, the filter and every card; tasks stay", async ({
  browser,
}) => {
  const a = await labelledBoard(browser);
  const bugId = await labelId(a.page, "Bug");

  expect(await deleteLabel(a.page, "Bug", "dismiss")).toBe('Delete label "Bug"? It is removed from every task.');
  await a.page.goto(a.url);
  await expect(labelChips(a.page)).toHaveText(["Bug", "Design"]);
  await expect(cardLabels(a.page, "To do", "Fix logo")).toHaveText(["Bug", "Design"]);

  await deleteLabel(a.page, "Bug", "accept");
  await expect(labelChips(a.page)).toHaveText(["Design"]);
  await a.page.goto(a.url);
  await expect(labelChips(a.page)).toHaveText(["Design"]);
  await expect(labelFilter(a.page).locator("option")).toHaveText(["All labels", "Design"]);
  await expect(cardTitles(a.page)).toHaveText(["Fix login", "Fix logo", "Draw icons", "Plain"]);
  await expect(cardLabels(a.page, "To do", "Fix logo")).toHaveText(["Design"]);
  await expect(cards(a.page, "To do").filter({ hasText: "Fix login" }).getByRole("list")).toHaveCount(0);

  await a.page.goto(`${a.url}?label=${bugId}`);
  await expect(labelFilter(a.page)).toHaveValue("all");
  await expect(cardTitles(a.page)).toHaveCount(4);

  await openTask(a.page, "Fix login");
  await expect(taskLabels(a.page)).toHaveCount(1);
  await expect(a.page.getByRole("checkbox", { name: "Design" })).not.toBeChecked();
});

const deleteMine = async (page: Page) => {
  await deleteLabel(page, "Mine", "accept");
};

test("AC4: a delete-label request naming a project the user is not a member of changes nothing", async ({
  browser,
}) => {
  await tamperedLabelRequest(browser, (a) => [a.projectId, a.labelId], deleteMine);
});

test("AC4: a delete-label request naming another project's label id changes nothing", async ({ browser }) => {
  await tamperedLabelRequest(browser, (a) => [null, a.labelId], deleteMine); // keeps B's own project id
});
