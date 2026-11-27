import { expect, test } from "@playwright/test";
import { seed, DEMO_EMAIL, PROJECT_NAME } from "../scripts/seed-app.mts";
import { cards, logIn, PASSWORD } from "./helpers";

test("AC22, AC41: seed fills the app with a demo user, a busy board and an empty project; re-running adds nothing", async ({
  browser,
  baseURL,
}) => {
  const first = await seed(browser, baseURL!);
  expect(first.email).toBe("demo@example.com");
  expect(first.password).toBe(PASSWORD);
  expect(first.boardUrl).toMatch(/^http:\/\/localhost:\d+\/projects\/\d+$/);

  const again = await seed(browser, baseURL!);
  expect(again).toEqual(first);

  const page = await (await browser.newContext()).newPage();
  await logIn(page, DEMO_EMAIL, PASSWORD);
  await expect(page).toHaveURL("/projects");
  const projects = page.getByRole("list", { name: "Your projects" }).getByRole("link");
  await expect(projects).toHaveCount(2);
  await expect(projects.filter({ hasText: PROJECT_NAME })).toHaveCount(1);

  await page.goto(first.boardUrl);
  await expect(cards(page, "To do")).toHaveCount(2);
  await expect(cards(page, "In progress")).toHaveCount(1);
  await expect(cards(page, "Done")).toHaveCount(1);
  await expect(cards(page, "To do").filter({ hasText: "Overdue" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /^.{200}$/ })).toHaveCount(1);
  const done = cards(page, "Done");
  await expect(done.locator("p.checklist-progress")).toHaveText("Checklist 1/3");
  await expect(done.getByRole("list", { name: "Task labels" }).getByRole("listitem")).toHaveText(["Bug", "Design"]);
  await expect(page.getByRole("list", { name: "Labels", exact: true }).getByRole("listitem")).toHaveText(["Bug", "Design"]);
  await expect(page.getByRole("list", { name: "Labels", exact: true }).locator(".label-chip")).toHaveClass([
    "label-chip label-red",
    "label-chip label-purple",
  ]);
  const members = page.getByRole("list", { name: "Members" }).getByRole("listitem");
  await expect(members).toHaveCount(2);

  await page.goto(first.taskUrl);
  await expect(page.getByRole("list", { name: "Comments" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Checklist" }).getByRole("checkbox")).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: "Write the copy", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Bug", exact: true })).toBeChecked();
});
