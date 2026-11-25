import { expect, test } from "@playwright/test";
import { createProject, newUser } from "./helpers";

function projectList(page: import("@playwright/test").Page) {
  return page.getByRole("list", { name: "Your projects" });
}

test("AC5: a user creates a project and it appears in their list", async ({ browser }) => {
  const { page } = await newUser(browser);
  await expect(projectList(page).getByRole("listitem")).toHaveCount(0);

  await page.getByLabel("New project name").fill("Website relaunch");
  await page.getByRole("button", { name: "Create project" }).click();

  await expect(projectList(page).getByRole("listitem")).toHaveCount(1);
  await expect(projectList(page).getByRole("link", { name: "Website relaunch" })).toBeVisible();
  await page.reload();
  await expect(projectList(page).getByRole("link", { name: "Website relaunch" })).toBeVisible();
});

test("AC5: a user renames a project and the list shows the new name", async ({ browser }) => {
  const { page } = await newUser(browser);
  await createProject(page, "Old name");

  const item = projectList(page).getByRole("listitem").filter({ hasText: "Old name" });
  await item.getByLabel("Rename Old name").fill("New name");
  await item.getByRole("button", { name: "Rename" }).click();

  await expect(projectList(page).getByRole("link", { name: "New name" })).toBeVisible();
  await expect(projectList(page).getByRole("link", { name: "Old name" })).toHaveCount(0);
  await page.reload();
  await expect(projectList(page).getByRole("link", { name: "New name" })).toBeVisible();
});

test("AC5: a user deletes a project and it leaves the list", async ({ browser }) => {
  const { page } = await newUser(browser);
  await createProject(page, "Keep me");
  const doomedUrl = await createProject(page, "Delete me");

  const item = projectList(page).getByRole("listitem").filter({ hasText: "Delete me" });
  await item.getByRole("button", { name: "Delete" }).click();

  await expect(projectList(page).getByRole("link", { name: "Delete me" })).toHaveCount(0);
  await expect(projectList(page).getByRole("link", { name: "Keep me" })).toBeVisible();
  const response = await page.goto(doomedUrl);
  expect(response?.status()).toBe(404);
});

test("AC5: the project page shows the project name", async ({ browser }) => {
  const { page } = await newUser(browser);
  const url = await createProject(page, "Roadmap");
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "Roadmap" })).toBeVisible();
});

test("AC6: user B does not see user A's project and gets a 404 on its URL", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "A's secret project");

  const b = await newUser(browser);
  await b.page.goto("/projects");
  await expect(projectList(b.page).getByRole("link", { name: "A's secret project" })).toHaveCount(0);

  const response = await b.page.goto(url);
  expect(response?.status()).toBe(404);
  await expect(b.page.getByText("A's secret project")).toHaveCount(0);
});

test("AC6: logged-out visitors to a project URL are sent to /login", async ({ browser, page }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Private");
  await page.goto(url);
  await expect(page).toHaveURL("/login");
});
