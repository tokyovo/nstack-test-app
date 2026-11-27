import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { cards, createProject, newUser, persistedMove, type ColumnName } from "./helpers";

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

/** axe violations with impact serious or critical on the current page, as "rule: target" lines. */
async function seriousViolations(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`));
}

/**
 * Controls in main and header shorter than 44 px, as "<tag> "<text>" <height>px" lines. Inline text links are
 * exempt; a checkbox is measured by its label.
 */
async function shortTouchTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = [
      "button",
      'input:not([type="checkbox"]):not([type="hidden"])',
      "select",
      "textarea",
      ".button",
      'label:has(> input[type="checkbox"])',
    ]
      .flatMap((control) => [`main ${control}`, `header ${control}`])
      .join(", ");
    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden")
      .map((element) => ({ element, height: element.getBoundingClientRect().height }))
      .filter(({ height }) => height < 44)
      .map(({ element, height }) => {
        const name = element.getAttribute("name") ?? element.textContent?.trim().slice(0, 30);
        return `${element.tagName.toLowerCase()} "${name}" ${Math.round(height)}px`;
      });
  });
}

/** AC2/AC3: no serious or critical axe violations at 1280x800 and 390x844; at 390 no sideways scroll and 44 px targets. */
async function expectAccessible(page: Page, path: string) {
  await page.setViewportSize(DESKTOP);
  await page.goto(path);
  expect(await seriousViolations(page), `axe at 1280 on ${path}`).toEqual([]);

  await page.setViewportSize(PHONE);
  await page.goto(path);
  expect(await seriousViolations(page), `axe at 390 on ${path}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `scrollWidth at 390 on ${path}`).toBeLessThanOrEqual(
    PHONE.width,
  );
  expect(await shortTouchTargets(page), `targets under 44px at 390 on ${path}`).toEqual([]);
}

/** The focused element shows a focus indicator: an outline or a box-shadow. */
async function expectVisibleFocus(target: Locator) {
  await expect(target).toBeFocused();
  const { outline, shadow } = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(outline !== "none" || shadow !== "none", `focus ring (outline ${outline}, box-shadow ${shadow})`).toBe(true);
}

test.describe("AC2, AC3 screens pass the axe scan and phone layout checks", () => {
  test("/login", async ({ page }) => {
    await expectAccessible(page, "/login");
  });

  test("/signup", async ({ page }) => {
    await expectAccessible(page, "/signup");
  });

  test("/projects with no project, and with one", async ({ browser }) => {
    const { page } = await newUser(browser);
    await expectAccessible(page, "/projects");
    await expect(page.getByText("No projects yet")).toBeVisible();
    await createProject(page, "Website relaunch");
    await expectAccessible(page, "/projects");
  });

  test("a 404 page, logged in", async ({ browser }) => {
    const { page } = await newUser(browser);
    await expectAccessible(page, "/projects/999999");
  });

  test("the board with tasks, and with a search that matches nothing", async ({ browser }) => {
    const { page } = await newUser(browser);
    const url = await busyBoard(page);
    await expectAccessible(page, url);
    await expectAccessible(page, `${url}?q=zzzz`);
    await expect(page.getByRole("status").filter({ hasText: "No tasks match" })).toBeVisible();
  });

  test("the calendar with an overdue, a Done and an undated task, and an empty month", async ({ browser }) => {
    const { page } = await newUser(browser);
    const url = await busyBoard(page);
    await page.goto(url);
    await page.getByRole("link", { name: "Finished task", exact: true }).click();
    await page.getByLabel("Due date").fill("2020-01-01");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".task-details")).toContainText("2020-01-01");
    await expectAccessible(page, `${url}/calendar?month=2020-01`);
    await expect(page.locator("li.calendar-day.has-tasks").getByRole("link")).toHaveText(["Late task", "Finished task"]);
    await expectAccessible(page, `${url}/calendar?month=2999-12`);
    await expect(page.getByText("No tasks due this month")).toBeVisible();
  });

  test("the task page with labels, checklist items and a comment", async ({ browser }) => {
    const { page } = await newUser(browser);
    const url = await busyBoard(page);
    await page.goto(url);
    await page.getByRole("link", { name: "Late task", exact: true }).click();
    await page.getByLabel("Comment", { exact: true }).fill("Started on the draft");
    await page.getByRole("button", { name: "Add comment" }).click();
    await expect(page.getByRole("list", { name: "Comments" }).getByRole("listitem")).toHaveCount(1);
    await expectAccessible(page, new URL(page.url()).pathname);
  });
});

/** One label per colour, named after it, so axe checks every chip's contrast (AC1). */
const LABEL_COLOURS = ["Gray", "Green", "Blue", "Purple", "Orange", "Red"];

/** Ticks every colour's label on the open task page and saves. */
async function labelWithEveryColour(page: Page) {
  for (const name of LABEL_COLOURS) await page.getByRole("checkbox", { name, exact: true }).check();
  await page.getByRole("button", { name: "Save labels" }).click();
  await expect(page.getByRole("status")).toHaveText("Labels saved");
}

/**
 * A board showing every card state: an overdue task with a label of every colour and a checklist, a plain task,
 * and a Done task with a label of every colour. Returns its path.
 */
async function busyBoard(page: Page): Promise<string> {
  const url = await createProject(page, "Busy board");
  await page.goto(url);
  const labelForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Create label" }) });
  for (const name of LABEL_COLOURS) {
    await page.getByLabel("Label name").fill(name);
    await labelForm.getByLabel("Colour").selectOption({ label: name });
    await page.getByRole("button", { name: "Create label" }).click();
    await expect(page.getByRole("list", { name: "Labels" }).getByText(name, { exact: true })).toBeVisible();
  }
  for (const [title, due] of [
    ["Late task", "2020-01-01"],
    ["Plain task", ""],
    ["Finished task", ""],
  ]) {
    await page.getByLabel("Title").fill(title);
    if (due) await page.getByLabel("Due date").fill(due);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();
  }
  const finished = page.getByRole("listitem").filter({ hasText: "Finished task" });
  for (const target of ["In progress", "Done"] satisfies ColumnName[]) {
    await finished.focus();
    await persistedMove(page, () => page.keyboard.press("ArrowRight"));
    await expect(cards(page, target)).toContainText(["Finished task"]);
  }

  await page.getByRole("link", { name: "Finished task", exact: true }).click();
  await labelWithEveryColour(page);
  await page.goto(url);
  await page.getByRole("link", { name: "Late task", exact: true }).click();
  await labelWithEveryColour(page);
  for (const item of ["Draft", "Review"]) {
    await page.getByLabel("New item").fill(item);
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByRole("checkbox", { name: item })).toBeVisible();
  }
  return url;
}

test("AC4: on /login, Tab reaches the email, the submit button and Sign up in turn, each with a visible focus", async ({
  page,
}) => {
  await page.goto("/login");
  const main = page.getByRole("main");
  for (const target of [
    main.getByLabel("Email"),
    main.getByLabel("Password"),
    main.getByRole("button", { name: "Log in" }),
    main.getByRole("link", { name: "Sign up" }),
  ]) {
    await page.keyboard.press("Tab");
    await expectVisibleFocus(target);
  }
});
