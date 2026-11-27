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
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
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
      await expect(page.locator("header .app-title")).toHaveText("Task board");
      await expect(page.getByRole("heading", { name: "Task board" })).toHaveCount(0);
      await expect(page.locator("header a")).toHaveCount(0);
    });
  }
});

test.describe("AC8 unknown URLs show the app's 404 page", () => {
  async function expectNotFound(page: Page, path: string) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Back to projects" })).toHaveAttribute("href", "/projects");
  }

  test("logged out, /nope is a 404 whose link leads on to /login", async ({ page }) => {
    await expectNotFound(page, "/nope");
    await page.getByRole("link", { name: "Back to projects" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("logged in, /nope and a missing project are 404s whose link leads to /projects", async ({ browser }) => {
    const { page } = await newUser(browser);
    await expectNotFound(page, "/nope");
    await expectNotFound(page, "/projects/999999");
    await page.getByRole("link", { name: "Back to projects" }).click();
    await expect(page).toHaveURL("/projects");
  });

  test("logged in, the header title is underlined on hover and outlined on keyboard focus", async ({ browser }) => {
    const { page } = await newUser(browser);
    await page.mouse.move(0, 0);
    await expect(titleLink(page)).toHaveCSS("text-decoration-line", "none");
    await titleLink(page).hover();
    await expect(titleLink(page)).toHaveCSS("text-decoration-line", "underline");

    await page.mouse.move(0, 0);
    await page.goto("/projects");
    await page.keyboard.press("Tab");
    await expect(titleLink(page)).toBeFocused();
    await expect(titleLink(page)).not.toHaveCSS("outline-style", "none");
  });
});
