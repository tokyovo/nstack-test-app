import { expect, test, type Browser, type Page } from "@playwright/test";
import { localToday } from "../lib/due-dates.ts";
import { createProject, newUser } from "./helpers";

const WIDTHS = [1280, 390];
/** --accent in .nstack/design.md (#1D6B57). */
const ACCENT = "rgb(29, 107, 87)";

/** The nine drive screens (plus a logged-out 404) for one fresh user, as [name, path, signed in]. */
async function screens(browser: Browser): Promise<{ page: Page; list: [string, string, boolean][] }> {
  const { page } = await newUser(browser);
  const board = await createProject(page, "Website relaunch");
  const empty = await createProject(page, "Team offsite");
  await page.goto(board);
  await page.getByLabel("Label name").fill("Bug");
  await page.getByRole("button", { name: "Create label" }).click();
  await expect(page.getByRole("list", { name: "Labels", exact: true }).getByText("Bug")).toBeVisible();
  await page.getByLabel("Title").fill("Write the launch announcement");
  await page.getByLabel("Due date").fill(localToday());
  await page.getByRole("button", { name: "Add task" }).click();
  const link = page.getByRole("link", { name: "Write the launch announcement", exact: true });
  await expect(link).toBeVisible();
  const task = (await link.getAttribute("href"))!;
  await page.goto(task);
  await page.getByLabel("New item").fill("Draft");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByRole("checkbox", { name: "Draft" })).toBeVisible();
  return {
    page,
    list: [
      ["login", "/login", false],
      ["signup", "/signup", false],
      ["notfound-logged-out", "/nope", false],
      ["projects", "/projects", true],
      ["board", board, true],
      ["board-empty", empty, true],
      ["board-nomatch", `${board}?q=zzzz`, true],
      ["task", task, true],
      ["calendar", `${board}/calendar`, true],
      ["notfound", "/projects/999999", true],
    ],
  };
}

/**
 * AC7-AC9 problems on the current page at rest (nothing focused or hovered), one line each. Controls are the visible
 * text-like inputs, date inputs, selects, buttons and .button links; textareas join for everything but height.
 */
async function controlProblems(page: Page): Promise<string[]> {
  await page.mouse.move(0, 0);
  return page.evaluate((accent) => {
    (document.activeElement as HTMLElement | null)?.blur();
    const visible = (element: Element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
    const all = <T extends Element>(selector: string) => [...document.querySelectorAll<T>(selector)].filter(visible);
    const name = (element: Element) =>
      `${element.tagName.toLowerCase()} "${(element.getAttribute("name") ?? element.getAttribute("aria-label") ?? element.textContent ?? "").trim().slice(0, 24)}"`;
    const problems: string[] = [];

    /** Every element has the same value of `measure`; else one line listing each value and who has it. */
    function same(label: string, elements: Element[], measure: (element: Element) => string) {
      const groups = new Map<string, string[]>();
      for (const element of elements) {
        const value = measure(element);
        groups.set(value, [...(groups.get(value) ?? []), name(element)]);
      }
      if (groups.size > 1)
        problems.push(`${label} differs: ${[...groups].map(([value, names]) => `${value} (${names.join(", ")})`).join("; ")}`);
    }

    const singleLine = all<HTMLElement>(
      'input:not([type="checkbox"]):not([type="hidden"]), select, button, .button',
    );
    const textareas = all<HTMLElement>("textarea");
    const family = [...singleLine, ...textareas];
    const style = (element: Element) => getComputedStyle(element);
    same("height", singleLine, (element) => `${Math.round(element.getBoundingClientRect().height)}px`);
    same("border-radius", family, (element) => style(element).borderRadius);
    same("border-width", family, (element) => style(element).borderWidth);
    same("font-family", family, (element) => style(element).fontFamily);
    same("font-size", family, (element) => style(element).fontSize);
    const framed = family.filter(
      (element) => !element.matches(".primary, .danger, .quiet, :disabled"),
    );
    same("border-color", framed, (element) => style(element).borderColor);

    for (const select of all<HTMLSelectElement>("select")) {
      const { appearance, backgroundImage, paddingRight } = style(select);
      if (appearance !== "none") problems.push(`${name(select)} appearance ${appearance}`);
      if (backgroundImage === "none") problems.push(`${name(select)} has no chevron`);
      if (parseFloat(paddingRight) < 32) problems.push(`${name(select)} padding-right ${paddingRight}`);
    }
    for (const box of all<HTMLInputElement>('input[type="checkbox"]')) {
      if (style(box).accentColor !== accent) problems.push(`${name(box)} accent-color ${style(box).accentColor}`);
    }
    for (const date of all<HTMLInputElement>('input[type="date"]')) {
      const title = date.form?.querySelector<HTMLInputElement>('input[name="title"]');
      if (!title) {
        problems.push(`${name(date)} has no Title input in its form`);
        continue;
      }
      for (const property of ["paddingLeft", "fontFamily", "fontSize", "color"] as const) {
        if (style(date)[property] !== style(title)[property])
          problems.push(`date input ${property} ${style(date)[property]}, Title input ${style(title)[property]}`);
      }
    }
    return problems;
  }, ACCENT);
}

test("AC7-AC9: every screen's inputs, selects, date inputs and buttons share height, radius, border and font; selects have a chevron; checkboxes use the accent", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const { page: signedIn, list } = await screens(browser);
  const loggedOut = await (await browser.newContext()).newPage();
  let sawSelect = false;
  let sawDate = false;
  let sawCheckbox = false;
  for (const [screen, path, needsSession] of list) {
    const page = needsSession ? signedIn : loggedOut;
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      expect.soft(await controlProblems(page), `${screen} at ${width}`).toEqual([]);
      sawSelect ||= (await page.locator("select").count()) > 0;
      sawDate ||= (await page.locator('input[type="date"]').count()) > 0;
      sawCheckbox ||= (await page.locator('input[type="checkbox"]').count()) > 0;
    }
  }
  // The screens must hold each kind of control, or the checks above prove nothing.
  expect([sawSelect, sawDate, sawCheckbox]).toEqual([true, true, true]);
});

test("every screen shows at most one visible primary button", async ({ browser }) => {
  test.setTimeout(60_000);
  const { page: signedIn, list } = await screens(browser);
  const loggedOut = await (await browser.newContext()).newPage();
  for (const [screen, path, needsSession] of list) {
    const page = needsSession ? signedIn : loggedOut;
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      const primaries = await page.locator(":is(button, .button).primary").evaluateAll((elements) =>
        elements
          .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden")
          .map((element) => (element.textContent ?? "").trim()),
      );
      expect.soft(primaries.length, `${screen} at ${width}: ${primaries.join(", ")}`).toBeLessThanOrEqual(1);
    }
  }
});
