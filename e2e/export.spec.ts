import { readFile } from "node:fs/promises";
import { expect, request, test, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import { cards, createProject, newUser, persistedMove } from "./helpers";

type NewTask = { title: string; description?: string; assignee?: string; dueDate?: string };

async function addTask(page: Page, task: NewTask) {
  await page.getByLabel("Title").fill(task.title);
  await page.getByLabel("Description").fill(task.description ?? "");
  await page.getByLabel("Assignee").selectOption(task.assignee ? { label: task.assignee } : { value: "" });
  await page.getByLabel("Due date").fill(task.dueDate ?? "");
  const before = await cards(page, "To do").count();
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do")).toHaveCount(before + 1);
}

function projectId(url: string): number {
  return Number(url.split("/").pop());
}

/** The project's tasks as stored, oldest first. */
function storedTasks(id: number): { id: number; title: string; description: string }[] {
  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const rows = db.prepare("SELECT id, title, description FROM tasks WHERE project_id = ? ORDER BY id").all(id);
  db.close();
  return rows as { id: number; title: string; description: string }[];
}

/** Rows of an RFC 4180 CSV whose every row ends in CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\r" && text[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += char;
  }
  expect(cell, "text after the last CRLF").toBe("");
  expect(row, "cells after the last CRLF").toEqual([]);
  return rows;
}

test("AC32/AC33: Export CSV downloads every task, RFC 4180 quoted, formula-guarded, with a BOM", async ({ browser }) => {
  const { page, email } = await newUser(browser);
  const url = await createProject(page, "Exported");
  const id = projectId(url);
  await page.goto(url);
  await addTask(page, { title: "Plain task" });
  await addTask(page, {
    title: "Comma, task",
    description: 'Say "hi", then\nleave',
    assignee: email,
    dueDate: "2999-01-02",
  });
  await addTask(page, { title: "=SUM(A1:A2)" });
  await addTask(page, { title: "+1 more", description: "-minus" });
  await addTask(page, { title: "@mention", description: "=a,b" });
  await addTask(page, { title: "Café 日本 ü" });
  await page.getByRole("listitem").filter({ hasText: "Comma, task" }).focus();
  await persistedMove(page, () => page.keyboard.press("ArrowRight"));
  await expect(cards(page, "In progress")).toContainText(["Comma, task"]);

  const link = page.getByRole("link", { name: "Export CSV" });
  await expect(link).toHaveAttribute("download", "");
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  expect(download.suggestedFilename()).toBe(`project-${id}-tasks.csv`);
  const bytes = await readFile((await download.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes.subarray(3));

  expect(text.startsWith("id,title,description,status,assignee,due_date\r\n")).toBe(true);
  expect(text.endsWith("\r\n")).toBe(true);
  expect(text).toContain(`"Comma, task","Say ""hi"", then`);
  expect(text).toContain(`,"'=a,b",`);

  const stored = storedTasks(id);
  expect(stored.map((task) => task.title)).toEqual([
    "Plain task",
    "Comma, task",
    "=SUM(A1:A2)",
    "+1 more",
    "@mention",
    "Café 日本 ü",
  ]);
  const [plain, comma, sum, plus, at, cafe] = stored.map((task) => String(task.id));
  expect(stored[1].description).toMatch(/^Say "hi", then\r?\nleave$/);
  expect(parseCsv(text)).toEqual([
    ["id", "title", "description", "status", "assignee", "due_date"],
    [plain, "Plain task", "", "To do", "", ""],
    [comma, "Comma, task", stored[1].description, "In progress", email, "2999-01-02"],
    [sum, "'=SUM(A1:A2)", "", "To do", "", ""],
    [plus, "'+1 more", "'-minus", "To do", "", ""],
    [at, "'@mention", "'=a,b", "To do", "", ""],
    [cafe, "Café 日本 ü", "", "To do", "", ""],
  ]);
});

test("AC35: export CSV request checks: auth, membership, format, headers", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Private export");
  const id = projectId(url);
  await a.page.goto(url);
  await addTask(a.page, { title: "Secret roadmap item" });

  const ok = await a.page.request.get(`${url}/export?format=csv`);
  expect(ok.status()).toBe(200);
  expect(ok.headers()["content-type"]).toBe("text/csv; charset=utf-8");
  expect(ok.headers()["cache-control"]).toBe("no-store");
  expect(ok.headers()["content-disposition"]).toBe(`attachment; filename="project-${id}-tasks.csv"`);
  expect(await ok.text()).toContain("Secret roadmap item");

  const loggedOut = await request.newContext({ baseURL: test.info().project.use.baseURL });
  for (const query of ["format=csv", "format=xml"]) {
    const response = await loggedOut.get(`${url}/export?${query}`, { maxRedirects: 0 });
    expect(response.status(), query).toBe(307);
    expect(new URL(response.headers()["location"], "http://x").pathname, query).toBe("/login");
  }
  await loggedOut.dispose();

  for (const path of [`${url}/export?format=csv`, `${url}/export?format=xml`, "/projects/999999/export?format=csv", "/projects/abc/export?format=csv"]) {
    const response = await b.page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(await response.text(), path).not.toContain("Secret roadmap item");
  }

  for (const query of ["", "?format=xml", "?format=CSV"]) {
    const response = await a.page.request.get(`${url}/export${query}`, { maxRedirects: 0 });
    expect(response.status(), query).toBe(400);
    expect(await response.text(), query).not.toContain("Secret roadmap item");
  }
});

test("AC34: Export JSON downloads the project and every task with stored status keys", async ({ browser }) => {
  const { page, email } = await newUser(browser);
  const url = await createProject(page, 'Exported "JSON" ü');
  const id = projectId(url);
  await page.goto(url);
  await addTask(page, { title: "Plain task" });
  await addTask(page, { title: "Assigned, dated", description: 'Line "one"\nline two', assignee: email, dueDate: "2999-01-02" });
  await addTask(page, { title: "Café 日本 ü" });
  await page.getByRole("listitem").filter({ hasText: "Assigned, dated" }).focus();
  await persistedMove(page, () => page.keyboard.press("ArrowRight"));
  await page.getByRole("listitem").filter({ hasText: "Café 日本 ü" }).focus();
  await persistedMove(page, () => page.keyboard.press("ArrowRight"));
  await page.getByRole("listitem").filter({ hasText: "Café 日本 ü" }).focus();
  await persistedMove(page, () => page.keyboard.press("ArrowRight"));
  await expect(cards(page, "Done")).toContainText(["Café 日本 ü"]);

  const link = page.getByRole("link", { name: "Export JSON" });
  await expect(link).toHaveAttribute("download", "");
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  expect(download.suggestedFilename()).toBe(`project-${id}-tasks.json`);
  const bytes = await readFile((await download.path())!);
  expect(bytes[0], "no BOM").toBe("{".charCodeAt(0));

  const stored = storedTasks(id);
  const [plain, assigned, cafe] = stored.map((task) => task.id);
  expect(stored[1].description).toMatch(/^Line "one"\r?\nline two$/);
  expect(JSON.parse(bytes.toString("utf-8"))).toEqual({
    project: { id, name: 'Exported "JSON" ü' },
    tasks: [
      { id: plain, title: "Plain task", description: "", status: "todo", assignee: null, dueDate: null },
      { id: assigned, title: "Assigned, dated", description: stored[1].description, status: "in_progress", assignee: email, dueDate: "2999-01-02" },
      { id: cafe, title: "Café 日本 ü", description: "", status: "done", assignee: null, dueDate: null },
    ],
  });
});

test("AC35: export JSON request checks: auth, membership, headers", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Private JSON export");
  const id = projectId(url);
  await a.page.goto(url);
  await addTask(a.page, { title: "Secret JSON item" });

  const ok = await a.page.request.get(`${url}/export?format=json`);
  expect(ok.status()).toBe(200);
  expect(ok.headers()["content-type"]).toBe("application/json; charset=utf-8");
  expect(ok.headers()["cache-control"]).toBe("no-store");
  expect(ok.headers()["content-disposition"]).toBe(`attachment; filename="project-${id}-tasks.json"`);
  expect(await ok.text()).toContain("Secret JSON item");

  const loggedOut = await request.newContext({ baseURL: test.info().project.use.baseURL });
  const response = await loggedOut.get(`${url}/export?format=json`, { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers()["location"], "http://x").pathname).toBe("/login");
  await loggedOut.dispose();

  for (const path of [`${url}/export?format=json`, "/projects/999999/export?format=json", "/projects/abc/export?format=json"]) {
    const response = await b.page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
    expect(await response.text(), path).not.toContain("Secret JSON item");
  }

  const upper = await a.page.request.get(`${url}/export?format=JSON`, { maxRedirects: 0 });
  expect(upper.status()).toBe(400);
});

/** Stores a description as given, bypassing the trim on save. */
function storeDescription(taskId: number, description: string) {
  const db = new Database(process.env.E2E_DATABASE_PATH!);
  db.pragma("busy_timeout = 5000");
  db.prepare("UPDATE tasks SET description = ? WHERE id = ?").run(description, taskId);
  db.close();
}

test("AC51: the CSV formula guard looks past leading spaces", async ({ browser }) => {
  const { page } = await newUser(browser);
  const url = await createProject(page, "Spaced export");
  const id = projectId(url);
  await page.goto(url);
  await addTask(page, { title: "Spaced formula" });
  await addTask(page, { title: "Spaced tab minus" });
  await addTask(page, { title: "Spaced text" });
  await addTask(page, { title: "Only spaces" });
  const [formula, minus, text, blank] = storedTasks(id).map((task) => task.id);
  storeDescription(formula, '  =HYPERLINK("x")');
  storeDescription(minus, " \t-1");
  storeDescription(text, "  plain words");
  storeDescription(blank, "   ");

  const response = await page.request.get(`${url}/export?format=csv`);
  expect(response.status()).toBe(200);
  const rows = parseCsv((await response.text()).replace(/^﻿/, ""));
  expect(rows.slice(1).map((row) => [row[1], row[2]])).toEqual([
    ["Spaced formula", `'  =HYPERLINK("x")`],
    ["Spaced tab minus", "' \t-1"],
    ["Spaced text", "  plain words"],
    ["Only spaces", "   "],
  ]);
});
