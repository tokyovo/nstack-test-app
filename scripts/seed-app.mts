import type { Browser, Page } from "@playwright/test";

// Seeds a running app through its UI (no direct DB writes), so the data passes the app's own checks.
// Every step looks before it acts, so running it again, or after an interrupted run, ends in the same state.

export const DEMO_EMAIL = "demo@example.com";
export const PASSWORD = "correct-horse-1";
export const PROJECT_NAME = "Website relaunch";
const MEMBER_EMAIL = "alexandra.konstantinopoulou-whitfield.design-lead@example-agency.com";
const EMPTY_PROJECT_NAME = "Team offsite";

type Column = "To do" | "In progress" | "Done";
const COLUMNS: Column[] = ["To do", "In progress", "Done"];

type SeedTask = { title: string; description?: string; assignee?: string; dueInDays?: number; column: Column };

const LONG_TITLE = (
  "Audit every page of the old site for broken links, missing alt text, outdated pricing, stale team photos " +
  "and legal copy, then list what to migrate, rewrite or drop before the new site goes live in the spring"
)
  .padEnd(200, ".")
  .slice(0, 200);

const COMMENTED_TITLE = "Pick the new domain name";
const COMMENT = "Registered relaunch.example.com; the old domain redirects there from Monday.";

const TASKS: SeedTask[] = [
  { title: "Write the launch announcement", description: "Blog post and newsletter.", dueInDays: -7, column: "To do" },
  { title: LONG_TITLE, column: "To do" },
  { title: "Redesign the pricing page", assignee: MEMBER_EMAIL, dueInDays: 14, column: "In progress" },
  { title: COMMENTED_TITLE, assignee: DEMO_EMAIL, column: "Done" },
];

export type Seeded = { email: string; password: string; boardUrl: string; taskUrl: string };

export async function seed(browser: Browser, baseURL: string): Promise<Seeded> {
  const member = await signedInPage(browser, baseURL, MEMBER_EMAIL);
  await member.context().close();

  const page = await signedInPage(browser, baseURL, DEMO_EMAIL);
  const boardPath = await ensureProject(page, PROJECT_NAME);
  await ensureProject(page, EMPTY_PROJECT_NAME);
  await page.goto(boardPath);
  await ensureMember(page, MEMBER_EMAIL);
  for (const task of TASKS) await ensureTask(page, task);
  for (const task of TASKS) await ensureColumn(page, task.title, task.column);
  const taskPath = await taskLink(page, COMMENTED_TITLE).getAttribute("href");
  if (!taskPath) throw new Error(`No link for task "${COMMENTED_TITLE}"`);
  await page.goto(taskPath);
  await ensureComment(page, COMMENT);
  await page.context().close();

  return { email: DEMO_EMAIL, password: PASSWORD, boardUrl: baseURL + boardPath, taskUrl: baseURL + taskPath };
}

/** A page in a new browser context, logged in as `email` (signed up first if the account does not exist). */
export async function signedInPage(browser: Browser, baseURL: string, email: string): Promise<Page> {
  const page = await (await browser.newContext({ baseURL })).newPage();
  if (await submitCredentials(page, "/login", "Log in", email)) return page;
  if (await submitCredentials(page, "/signup", "Sign up", email)) return page;
  throw new Error(`Could not log in or sign up as ${email}: ${await page.getByRole("alert").textContent()}`);
}

/** Submits the login or signup form; true when it lands on /projects, false when it shows an error. */
async function submitCredentials(page: Page, path: string, button: string, email: string): Promise<boolean> {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: button }).click();
  await page.waitForFunction(() => location.pathname === "/projects" || !!document.querySelector("[role=alert]"));
  return new URL(page.url()).pathname === "/projects";
}

/** Creates the project unless the user already has one with that name; returns its path. */
async function ensureProject(page: Page, name: string): Promise<string> {
  await page.goto("/projects");
  const link = page.getByRole("list", { name: "Your projects" }).getByRole("link", { name, exact: true });
  if ((await link.count()) === 0) {
    await page.getByLabel("New project name").fill(name);
    await page.getByRole("button", { name: "Create project" }).click();
    await link.waitFor();
  }
  const href = await link.getAttribute("href");
  if (!href) throw new Error(`No link for project "${name}"`);
  return href;
}

async function ensureMember(page: Page, email: string) {
  const member = page.getByRole("list", { name: "Members" }).getByText(email, { exact: true });
  if ((await member.count()) > 0) return;
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Invite" }).click();
  await member.waitFor();
}

function taskLink(page: Page, title: string) {
  return page.getByRole("link", { name: title, exact: true });
}

/** A due date `days` from today, as the date input's yyyy-mm-dd. */
function dateInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function ensureTask(page: Page, task: SeedTask) {
  if ((await taskLink(page, task.title).count()) > 0) return;
  await page.getByLabel("Title").fill(task.title);
  await page.getByLabel("Description").fill(task.description ?? "");
  if (task.assignee) await page.getByLabel("Assignee").selectOption({ label: task.assignee });
  if (task.dueInDays !== undefined) await page.getByLabel("Due date").fill(dateInDays(task.dueInDays));
  await page.getByRole("button", { name: "Add task" }).click();
  await taskLink(page, task.title).waitFor();
}

function card(page: Page, column: Column, title: string) {
  return page
    .getByRole("region", { name: column, exact: true })
    .getByRole("listitem")
    .filter({ has: taskLink(page, title) });
}

/** Moves the card right with the keyboard until it is in `target`, waiting for each move to be stored. */
async function ensureColumn(page: Page, title: string, target: Column) {
  for (;;) {
    await page.reload();
    const current = await currentColumn(page, title);
    if (current === target) return;
    if (COLUMNS.indexOf(current) > COLUMNS.indexOf(target)) throw new Error(`"${title}" is past ${target}`);
    const stored = page.waitForResponse(
      (response) => response.request().method() === "POST" && !!response.request().headers()["next-action"],
    );
    await card(page, current, title).focus();
    await page.keyboard.press("ArrowRight");
    await (await stored).finished();
  }
}

async function currentColumn(page: Page, title: string): Promise<Column> {
  await taskLink(page, title).waitFor();
  for (const column of COLUMNS) if ((await card(page, column, title).count()) > 0) return column;
  throw new Error(`"${title}" is in no column`);
}

async function ensureComment(page: Page, body: string) {
  const comment = page.getByRole("list", { name: "Comments" }).getByText(body);
  if ((await comment.count()) > 0) return;
  await page.getByLabel("Comment", { exact: true }).fill(body);
  await page.getByRole("button", { name: "Add comment" }).click();
  await comment.waitFor();
}
