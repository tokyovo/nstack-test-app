import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";

test("home page renders the app name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Task board" })).toBeVisible();
});

test("the app creates its schema in the DATABASE_PATH file", async ({ page }) => {
  await page.goto("/");
  const db = new Database(process.env.E2E_DATABASE_PATH!, { readonly: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => (row as { name: string }).name);
  db.close();
  expect(tables).toEqual([
    "comments",
    "labels",
    "project_members",
    "projects",
    "sessions",
    "task_labels",
    "tasks",
    "users",
  ]);
});
