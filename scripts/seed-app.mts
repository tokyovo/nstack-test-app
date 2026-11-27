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

/** Due `dueInDays` from today, or on day `dueOnDay` of the current local month (so the calendar has tasks). */
type SeedTask = {
  title: string;
  description?: string;
  assignee?: string;
  dueInDays?: number;
  dueOnDay?: number;
  column: Column;
};

const LONG_TITLE = (
  "Audit every page of the old site for broken links, missing alt text, outdated pricing, stale team photos " +
  "and legal copy, then list what to migrate, rewrite or drop before the new site goes live in the spring"
)
  .padEnd(200, ".")
  .slice(0, 200);

const COMMENTED_TITLE = "Pick the new domain name";
const COMMENT = "Registered relaunch.example.com; the old domain redirects there from Monday.";
const LABELS = ["Bug", "Design"];
const CHECKLIST = [
  { text: "Write the copy", done: true },
  { text: "Pick screenshots", done: false },
  { text: "Proofread", done: false },
];

const TASKS: SeedTask[] = [
  { title: "Write the launch announcement", description: "Blog post and newsletter.", dueInDays: -7, column: "To do" },
  { title: LONG_TITLE, column: "To do" },
  { title: "Redesign the pricing page", assignee: MEMBER_EMAIL, dueOnDay: 28, column: "In progress" },
  { title: COMMENTED_TITLE, assignee: DEMO_EMAIL, dueOnDay: 1, column: "Done" },
];

export type Seeded = { email: string; password: string; boardUrl: string; emptyBoardUrl: string; taskUrl: string };

export async function seed(browser: Browser, baseURL: string): Promise<Seeded> {
  const member = await signedInPage(browser, baseURL, MEMBER_EMAIL);
  await member.context().close();

  const page = await signedInPage(browser, baseURL, DEMO_EMAIL);
  const boardPath = await ensureProject(page, PROJECT_NAME);
  const emptyBoardPath = await ensureProject(page, EMPTY_PROJECT_NAME);
  await page.goto(boardPath);
  await ensureMember(page, MEMBER_EMAIL);
  for (const name of LABELS) await ensureLabel(page, name);
  for (const task of TASKS) await ensureTask(page, task);
  for (const task of TASKS) await ensureColumn(page, task.title, task.column);
  const taskPath = await taskLink(page, COMMENTED_TITLE).getAttribute("href");
  if (!taskPath) throw new Error(`No link for task "${COMMENTED_TITLE}"`);
  await page.goto(taskPath);
  await ensureComment(page, COMMENT);
  await ensureTaskLabels(page, LABELS);
  for (const item of CHECKLIST) await ensureChecklistItem(page, item.text, item.done);
  await page.context().close();

  return {
    email: DEMO_EMAIL,
    password: PASSWORD,
    boardUrl: baseURL + boardPath,
    emptyBoardUrl: baseURL + emptyBoardPath,
    taskUrl: baseURL + taskPath,
  };
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

async function ensureLabel(page: Page, name: string) {
  const label = page.getByRole("list", { name: "Labels", exact: true }).getByText(name, { exact: true });
  if ((await label.count()) > 0) return;
  await page.getByLabel("Label name").fill(name);
  await page.getByRole("button", { name: "Create label" }).click();
  await label.waitFor();
}

/** Ticks each of `names` on the task page and saves, unless the task already has them all. */
async function ensureTaskLabels(page: Page, names: string[]) {
  const section = page.getByRole("region", { name: "Labels", exact: true });
  let changed = false;
  for (const name of names) {
    const box = section.getByRole("checkbox", { name, exact: true });
    if (await box.isChecked()) continue;
    await box.check();
    changed = true;
  }
  if (!changed) return;
  await section.getByRole("button", { name: "Save labels" }).click();
  await section.getByRole("status").waitFor();
}

/** Adds the item unless the checklist has it, then ticks it when `done`, waiting for the tick to be stored. */
async function ensureChecklistItem(page: Page, text: string, done: boolean) {
  const section = page.getByRole("region", { name: "Checklist", exact: true });
  const box = section.getByRole("checkbox", { name: text, exact: true });
  if ((await box.count()) === 0) {
    await section.getByLabel("New item").fill(text);
    await section.getByRole("button", { name: "Add item" }).click();
    await box.waitFor();
  }
  if (!done || (await box.isChecked())) return;
  const stored = waitForServerAction(page);
  await box.check();
  await (await stored).finished();
}

/** Resolves with the response to the next server-action request (a POST with a next-action header). */
function waitForServerAction(page: Page) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST" && !!response.request().headers()["next-action"],
  );
}

function taskLink(page: Page, title: string) {
  return page.getByRole("link", { name: title, exact: true });
}

/** A date as the date input's yyyy-mm-dd, from local parts like the server's `localToday` (not UTC). */
function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The task's due date, or null if it has none. */
function dueDate(task: SeedTask, now = new Date()): string | null {
  const [year, month, day] = [now.getFullYear(), now.getMonth(), now.getDate()];
  if (task.dueOnDay !== undefined) return localDate(new Date(year, month, task.dueOnDay));
  if (task.dueInDays !== undefined) return localDate(new Date(year, month, day + task.dueInDays));
  return null;
}

async function ensureTask(page: Page, task: SeedTask) {
  if ((await taskLink(page, task.title).count()) > 0) return;
  await page.getByLabel("Title").fill(task.title);
  await page.getByLabel("Description").fill(task.description ?? "");
  if (task.assignee) await page.getByLabel("Assignee").selectOption({ label: task.assignee });
  const due = dueDate(task);
  if (due) await page.getByLabel("Due date").fill(due);
  await page.getByRole("button", { name: "Add task" }).click();
  await taskLink(page, task.title).waitFor();
}

function card(page: Page, column: Column, title: string) {
  return page
    .getByRole("region", { name: column, exact: true })
    .locator("li.task-card")
    .filter({ has: taskLink(page, title) });
}

/** Moves the card right with the keyboard until it is in `target`, waiting for each move to be stored. */
async function ensureColumn(page: Page, title: string, target: Column) {
  for (;;) {
    await page.reload();
    const current = await currentColumn(page, title);
    if (current === target) return;
    if (COLUMNS.indexOf(current) > COLUMNS.indexOf(target)) throw new Error(`"${title}" is past ${target}`);
    const stored = waitForServerAction(page);
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
