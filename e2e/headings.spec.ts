import { expect, test, type Page } from "@playwright/test";
import { createProject, newUser } from "./helpers";

const WIDTHS = [1280, 390];

/** What the page's headings look like, read from the rendered page. */
type HeadingReport = {
  h1s: string[];
  /** Visible text outside the h1 whose font-size is at least the h1's, as "<tag> "text" <px>". */
  asLargeAsTitle: string[];
  /** Heading levels in document order. */
  levels: number[];
  /** Visible headings under 22px or under weight 600, as "h2 "text" <px>/<weight>". */
  weak: string[];
  /** The h1's font-size in px and weight. */
  title: { size: number; weight: number } | null;
  /** Visible headings whose text is no wider at their own weight than at 400: bold does not render. */
  notBold: string[];
};

async function readHeadings(page: Page): Promise<HeadingReport> {
  return page.evaluate(() => {
    const visible = (element: Element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
    const label = (element: Element) => `${element.tagName.toLowerCase()} "${element.textContent?.trim().slice(0, 40)}"`;
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(visible);
    const h1s = headings.filter((heading) => heading.tagName === "H1");
    const h1 = h1s[0];
    const title = h1 ? { size: parseFloat(getComputedStyle(h1).fontSize), weight: Number(getComputedStyle(h1).fontWeight) } : null;

    const ownText = (element: Element) =>
      [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    const asLargeAsTitle = title
      ? [...document.body.querySelectorAll("*")]
          .filter((element) => !h1.contains(element) && ownText(element) && visible(element))
          .filter((element) => parseFloat(getComputedStyle(element).fontSize) >= title.size)
          .map((element) => `${label(element)} ${getComputedStyle(element).fontSize}`)
      : [];

    const weak = headings
      .filter((heading) => {
        const style = getComputedStyle(heading);
        return parseFloat(style.fontSize) < 22 || Number(style.fontWeight) < 600;
      })
      .map((heading) => `${label(heading)} ${getComputedStyle(heading).fontSize}/${getComputedStyle(heading).fontWeight}`);

    // The same text in the heading's font, offscreen, at weight 400 and at the heading's weight.
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;left:-10000px;top:0;white-space:nowrap";
    document.body.append(probe);
    const width = (heading: Element, weight: string) => {
      const style = getComputedStyle(heading);
      probe.style.fontFamily = style.fontFamily;
      probe.style.fontSize = style.fontSize;
      probe.style.letterSpacing = style.letterSpacing;
      probe.style.fontWeight = weight;
      probe.textContent = heading.textContent;
      return probe.getBoundingClientRect().width;
    };
    const notBold = headings
      .filter((heading) => heading.getBoundingClientRect().width > 1)
      .filter((heading) => Math.abs(width(heading, getComputedStyle(heading).fontWeight) - width(heading, "400")) <= 1)
      .map(label);
    probe.remove();

    return {
      h1s: h1s.map((heading) => heading.textContent?.trim() ?? ""),
      asLargeAsTitle,
      levels: headings.map((heading) => Number(heading.tagName[1])),
      weak,
      title,
      notBold,
    };
  });
}

/** AC1-AC5 on the page at `path`, at 1280 and 390. */
async function expectHeadings(page: Page, path: string, pageTitle: string) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(path);
    const where = `${path} at ${width}`;
    const report = await readHeadings(page);
    expect(report.h1s, `AC1 one h1, the page title, on ${where}`).toEqual([pageTitle]);
    expect(report.asLargeAsTitle, `AC1 text as large as the h1 on ${where}`).toEqual([]);
    expect(report.title, `AC4 h1 is 1.75rem and 700 on ${where}`).toEqual({ size: 28, weight: 700 });
    const skips = report.levels.filter((level, i) => level > (i === 0 ? 1 : report.levels[i - 1] + 1));
    expect(skips, `AC3 heading levels ${report.levels.join(",")} never skip on ${where}`).toEqual([]);
    expect(report.weak, `AC4 headings 22px+ and 600+ on ${where}`).toEqual([]);
    expect(report.notBold, `AC5 bold renders on ${where}`).toEqual([]);
  }
}

test.describe("AC1-AC5: every screen has one h1 page title, the largest text, and every heading is 22px+, bold, and renders bold", () => {
  test("logged out: login, signup and a 404", async ({ page }) => {
    await expectHeadings(page, "/login", "Log in");
    await expectHeadings(page, "/signup", "Sign up");
    await expectHeadings(page, "/nope", "Page not found");
  });

  test("logged in: projects, board-empty and a 404", async ({ browser }) => {
    const { page } = await newUser(browser);
    await expectHeadings(page, "/projects", "Projects");
    const empty = await createProject(page, "Team offsite");
    await expectHeadings(page, empty, "Team offsite");
    await expectHeadings(page, "/projects/999999", "Page not found");
  });

  test("logged in: board, board-nomatch, task and calendar", async ({ browser }) => {
    const { page } = await newUser(browser);
    const board = await createProject(page, "Website relaunch");
    await page.goto(board);
    const today = new Date().toISOString().slice(0, 10);
    await page.getByLabel("Title").fill("Write the launch post");
    await page.getByLabel("Due date").fill(today);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByRole("link", { name: "Write the launch post", exact: true })).toBeVisible();
    await page.getByLabel("Label name").fill("Copy");
    await page.getByRole("button", { name: "Create label" }).click();
    await expect(page.getByRole("list", { name: "Labels", exact: true })).toContainText("Copy");
    await expectHeadings(page, board, "Website relaunch");
    await expectHeadings(page, `${board}?q=zzzz`, "Website relaunch");

    await page.goto(board);
    await page.getByRole("link", { name: "Write the launch post", exact: true }).click();
    await expect(page).toHaveURL(/\/tasks\/\d+$/);
    await expectHeadings(page, new URL(page.url()).pathname, "Write the launch post");

    const month = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${today}T12:00`));
    await expectHeadings(page, `${board}/calendar?month=${today.slice(0, 7)}`, month);
  });
});
