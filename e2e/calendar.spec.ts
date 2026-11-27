import { expect, test, type Page } from "@playwright/test";
import { cards, createProject, newUser, persistedMove } from "./helpers";

// January 2000 starts on a Saturday and ends on a Monday, so its grid pads both ends; it is long past, so a task
// due then and not Done is always overdue.
const JAN_2000 = "?month=2000-01";

async function addTask(page: Page, title: string, dueDate = "") {
  await page.getByLabel("Title").fill(title);
  if (dueDate) await page.getByLabel("Due date").fill(dueDate);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
}

/** A board with tasks due on 1, 15 and 31 January 2000 (the 15th one Done) and two tasks with no due date. */
async function januaryBoard(page: Page): Promise<string> {
  const url = await createProject(page, "Calendar project");
  await page.goto(url);
  await addTask(page, "New year kickoff", "2000-01-01");
  await addTask(page, "Mid-month review", "2000-01-15");
  await addTask(page, "Done in January", "2000-01-15");
  await addTask(page, "Month-end report", "2000-01-31");
  await addTask(page, "Someday task");
  await addTask(page, "Another someday task");
  const done = page.locator("li.task-card").filter({ hasText: "Done in January" });
  for (let step = 0; step < 2; step++) {
    await done.focus();
    await persistedMove(page, () => page.keyboard.press("ArrowRight"));
  }
  await expect(cards(page, "Done")).toHaveText([/Done in January/]);
  return url;
}

/** The grid cell of one day, found by its heading's accessible name ("Saturday 1 January"). */
function day(page: Page, name: string) {
  return page.locator("li.calendar-day").filter({ has: page.getByRole("heading", { name, exact: true }) });
}

/** The month shown by default, "November 2026", read where the server runs (same machine, same zone). */
function monthHeading(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date);
}

test("AC6: the board's Calendar link opens the current month; tasks sit under their due days as links", async ({
  browser,
}) => {
  const { page } = await newUser(browser);
  const url = await januaryBoard(page);
  const expected = monthHeading();
  await page.goto(url);
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(page).toHaveURL(`${url}/calendar`);
  // The month can roll over at midnight between reading it and the page rendering.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(new RegExp(`^(${expected}|${monthHeading()})$`));
  await expect(page.getByText("No tasks due this month")).toBeVisible();
  await expect(page.getByText("2 tasks have no due date")).toBeVisible();

  await page.goto(`${url}/calendar${JAN_2000}`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("January 2000");
  await expect(page.getByText("No tasks due this month")).toHaveCount(0);
  // 5 blank cells (Mon-Fri) before Saturday the 1st, 31 days, 6 blank cells (Tue-Sun) after Monday the 31st.
  const cells = page.locator(".calendar-grid > li");
  await expect(cells).toHaveCount(42);
  await expect(page.locator("li.calendar-day")).toHaveCount(31);
  await expect(cells.nth(5)).toHaveClass(/calendar-day/);
  await expect(cells.nth(4)).not.toHaveClass(/calendar-day/);
  await expect(cells.nth(35)).toHaveClass(/calendar-day/);
  await expect(cells.nth(36)).not.toHaveClass(/calendar-day/);

  await expect(day(page, "Saturday 1 January").getByRole("link")).toHaveText(["New year kickoff"]);
  await expect(day(page, "Saturday 15 January").getByRole("link")).toHaveText(["Mid-month review", "Done in January"]);
  await expect(day(page, "Monday 31 January").getByRole("link")).toHaveText(["Month-end report"]);
  await expect(day(page, "Sunday 2 January").getByRole("link")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Someday task" })).toHaveCount(0);

  // Overdue like the board: past due and not Done.
  await expect(day(page, "Saturday 1 January").locator(".overdue-label")).toHaveText(["Overdue"]);
  const fifteenth = day(page, "Saturday 15 January").getByRole("listitem");
  await expect(fifteenth.filter({ hasText: "Mid-month review" })).toContainText("Overdue");
  await expect(fifteenth.filter({ hasText: "Done in January" })).not.toContainText("Overdue");

  await day(page, "Monday 31 January").getByRole("link", { name: "Month-end report" }).click();
  await expect(page).toHaveURL(new RegExp(`^.*${url}/tasks/\\d+$`));
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("Month-end report");
});

test("AC6: Previous and Next month links walk the months in the URL, and stop at 1970-01 and 9999-12", async ({
  browser,
}) => {
  const { page } = await newUser(browser);
  const url = await januaryBoard(page);
  await page.goto(`${url}/calendar${JAN_2000}`);
  await page.getByRole("link", { name: "Next month" }).click();
  await expect(page).toHaveURL(`${url}/calendar?month=2000-02`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("February 2000");
  // A leap year: February 2000 has a 29th.
  await expect(page.locator("li.calendar-day")).toHaveCount(29);
  await expect(page.getByText("No tasks due this month")).toBeVisible();

  await page.getByRole("link", { name: "Previous month" }).click();
  await page.getByRole("link", { name: "Previous month" }).click();
  await expect(page).toHaveURL(`${url}/calendar?month=1999-12`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("December 1999");

  await page.goto(`${url}/calendar?month=1970-01`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("January 1970");
  await expect(page.getByRole("link", { name: "Previous month" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Next month" })).toHaveAttribute("href", /month=1970-02$/);

  await page.goto(`${url}/calendar?month=9999-12`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText("December 9999");
  await expect(page.getByRole("link", { name: "Next month" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Previous month" })).toHaveAttribute("href", /month=9999-11$/);
});

test("AC6: an invalid month shows the current month", async ({ browser }) => {
  const { page } = await newUser(browser);
  const url = await createProject(page, "Invalid months");
  const expected = monthHeading();
  for (const month of ["2026-13", "2026-00", "1969-12", "26-11", "2026-1", "abc", "2026-11-01"]) {
    await page.goto(`${url}/calendar?month=${month}`);
    await expect(page.getByRole("heading", { level: 2 }), month).toHaveText(
      new RegExp(`^(${expected}|${monthHeading()})$`),
    );
  }
});

test("AC6: the no-due-date count is hidden at 0 and says "1 task" for one", async ({ browser }) => {
  const { page } = await newUser(browser);
  const url = await createProject(page, "Counts");
  await page.goto(`${url}/calendar`);
  await expect(page.getByText(/no due date/)).toHaveCount(0);
  await expect(page.getByText("No tasks due this month")).toBeVisible();
  await page.goto(url);
  await addTask(page, "Dated", "2000-01-10");
  await addTask(page, "Undated");
  await page.goto(`${url}/calendar`);
  await expect(page.getByText("1 task has no due date")).toBeVisible();
});

test("AC6: a non-member gets a 404 on the calendar", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Private calendar");
  const b = await newUser(browser);
  const response = await b.page.goto(`${url}/calendar`);
  expect(response?.status()).toBe(404);
  await expect(b.page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("AC7: at 1280 the month is a 7-column Mon-Sun grid; at 390 one column of only the days with tasks", async ({
  browser,
}) => {
  const { page } = await newUser(browser);
  const url = await januaryBoard(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${url}/calendar${JAN_2000}`);
  await expect(page.locator(".calendar-weekdays > li")).toHaveText(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const cells = page.locator(".calendar-grid > li");
  const boxes = await cells.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect()));
  for (let week = 0; week < 6; week++) {
    const row = boxes.slice(week * 7, week * 7 + 7);
    expect(new Set(row.map((box) => Math.round(box.top))).size, `week ${week + 1} on one row`).toBe(1);
    for (let i = 1; i < 7; i++) expect(row[i].left).toBeGreaterThan(row[i - 1].left);
    if (week > 0) expect(row[0].top).toBeGreaterThan(boxes[(week - 1) * 7].top);
  }
  // Saturday the 1st sits under "Sat".
  const sat = await page.locator(".calendar-weekdays > li").nth(5).boundingBox();
  const first = await day(page, "Saturday 1 January").boundingBox();
  expect(Math.round(first!.x)).toBe(Math.round(sat!.x));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${url}/calendar${JAN_2000}`);
  await expect(page.locator(".calendar-weekdays")).toBeHidden();
  const shown = page.locator(".calendar-grid > li:visible");
  await expect(shown).toHaveCount(3);
  await expect(shown.getByRole("heading")).toHaveText(["Sat 1 January", "Sat 15 January", "Mon 31 January"], { useInnerText: true });
  const lefts = await shown.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().left));
  expect(new Set(lefts.map(Math.round)).size, "one column").toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
