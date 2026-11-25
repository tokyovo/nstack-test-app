import { expect, test, type Page } from "@playwright/test";
import { createProject, newUser } from "./helpers";

/** The "Task board" title in the header, as a link. */
function titleLink(page: Page) {
  return page.locator("header").getByRole("link", { name: "Task board", exact: true });
}

test.describe("AC28 header title links to Projects", () => {
  test("on the board, clicking the title lands on /projects", async ({ browser }) => {
    const { page } = await newUser(browser);
    const board = await createProject(page, "Nav project");
    await page.goto(board);
    await expect(titleLink(page)).toHaveAttribute("href", "/projects");
    await titleLink(page).click();
    await expect(page).toHaveURL("/projects");
    await expect(page.getByRole("heading", { name: "Task board" })).toBeVisible();
  });

  test("on a task page and a 404 page, the title links to /projects", async ({ browser }) => {
    const { page } = await newUser(browser);
    const board = await createProject(page, "Nav task project");
    await page.goto(board);
    await page.getByLabel("Title").fill("Nav task");
    await page.getByRole("button", { name: "Add task" }).click();
    await page.getByRole("link", { name: "Nav task", exact: true }).click();
    await expect(page).toHaveURL(/\/tasks\/\d+$/);
    await expect(titleLink(page)).toHaveAttribute("href", "/projects");

    const response = await page.goto("/projects/999999");
    expect(response?.status()).toBe(404);
    await expect(titleLink(page)).toHaveAttribute("href", "/projects");
  });

  for (const path of ["/login", "/signup"]) {
    test(`logged out on ${path}, the title is plain text`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Task board" })).toBeVisible();
      await expect(page.locator("header a")).toHaveCount(0);
    });
  }
});
