import { expect, test } from "@playwright/test";
import { logIn, newUser, PASSWORD } from "./helpers";

test("AC2: a create-project request without a session goes to /login and adds no project", async ({ browser }) => {
  const { page, email } = await newUser(browser);
  await page.context().clearCookies();

  await page.getByLabel("New project name").fill("Made without a session");
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL("/login");

  await logIn(page, email, PASSWORD);
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("main").getByText("No projects yet. Create your first project below.")).toBeVisible();
  await expect(page.getByText("Made without a session")).toHaveCount(0);
});

test("AC2: logged out, /projects goes to /login", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
