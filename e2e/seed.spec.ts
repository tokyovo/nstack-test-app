import { expect, test } from "@playwright/test";
import { seed, DEMO_EMAIL, PROJECT_NAME } from "../scripts/seed-app.mts";
import { localToday } from "../lib/due-dates.ts";
import { cards, logIn, PASSWORD } from "./helpers";

test("AC22, AC41: seed fills the app with a demo user, a busy board and an empty project; re-running adds nothing", async ({
  browser,
  baseURL,
}) => {
  const monthBeforeSeed = localToday().slice(0, 7);
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
  const members = page.getByRole("list", { name: "Members" }).getByRole("listitem");
  await expect(members).toHaveCount(2);

  await page.goto(first.taskUrl);
  await expect(page.getByRole("list", { name: "Comments" }).getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Checklist" }).getByRole("checkbox")).toHaveCount(3);
  await expect(page.getByRole("checkbox", { name: "Write the copy", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Bug", exact: true })).toBeChecked();

  // AC8: the seeded month has tasks on its calendar on days 1 and 28 (the Done task is due on day 1); the overdue
  // task, due 7 days ago, may sit in this month too.
  const due = (await page.locator('dt:text-is("Due date") + dd').textContent()) ?? "";
  expect(due).toMatch(/^\d{4}-\d{2}-01$/);
  // The seed ran this month, or last month if it crossed midnight at a month end.
  expect([monthBeforeSeed, localToday().slice(0, 7)]).toContain(due.slice(0, 7));
  await page.goto(`${first.boardUrl}/calendar?month=${due.slice(0, 7)}`);
  const dayOf = (title: string) =>
    page.locator("li.calendar-day").filter({ has: page.getByRole("link", { name: title, exact: true }) });
  await expect(dayOf("Pick the new domain name").getByRole("heading")).toHaveText("1", { useInnerText: true });
  await expect(dayOf("Redesign the pricing page").getByRole("heading")).toHaveText("28", { useInnerText: true });
  await expect(page.getByText("1 task has no due date")).toBeVisible();
});
