import { expect, test, type Page } from "@playwright/test";
import { cards, createProject, newUser } from "./helpers";

// Far from today, so the outcome never depends on when (or in which time zone) the test runs.
const PAST = "2000-01-15";
const FUTURE = "2999-12-31";

async function addTask(page: Page, title: string, dueDate: string) {
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
}

function card(page: Page, title: string) {
  return page.getByRole("listitem").filter({ has: page.getByRole("link", { name: title }) });
}

test("AC16: a past-due task not in Done is marked overdue; future and done ones are not", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Deadlines");
  await a.page.goto(url);
  await addTask(a.page, "Late task", PAST);
  await addTask(a.page, "Later task", FUTURE);
  await addTask(a.page, "Finished task", PAST);

  // Move "Finished task" to Done with the keyboard (To do -> In progress -> Done).
  await card(a.page, "Finished task").focus();
  await a.page.keyboard.press("ArrowRight");
  await a.page.keyboard.press("ArrowRight");
  await expect(cards(a.page, "Done")).toHaveCount(1);

  await a.page.reload();
  await expect(card(a.page, "Late task")).toContainText("Overdue");
  await expect(card(a.page, "Late task")).toHaveClass(/\boverdue\b/);
  for (const title of ["Later task", "Finished task"]) {
    await expect(card(a.page, title)).toBeVisible();
    await expect(card(a.page, title)).not.toContainText("Overdue");
    await expect(card(a.page, title)).not.toHaveClass(/\boverdue\b/);
  }
});
