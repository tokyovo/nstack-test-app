import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { newUser } from "./helpers";

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

  test("a 404 page, logged in", async ({ browser }) => {
    const { page } = await newUser(browser);
    await expectAccessible(page, "/projects/999999");
  });
});

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
