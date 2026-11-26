import { expect, test, type Browser, type Page, type Request } from "@playwright/test";
import { cards, createProject, newUser, persistedMove, tamperBoundIds } from "./helpers";

async function addTask(page: Page, projectUrl: string, title: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do").filter({ hasText: title })).toHaveCount(1);
}

/** Opens a task from the board by its title link; returns the task page path. */
async function openTask(page: Page, title: string): Promise<string> {
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

function checklist(page: Page) {
  return page.getByRole("region", { name: "Checklist" });
}

function items(page: Page) {
  return checklist(page).getByRole("list", { name: "Checklist" }).getByRole("listitem");
}

function itemForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Add item" }) });
}

/** Submits the add-item form with `text` as typed; `required` and `maxlength` are removed so the server decides. */
async function submitItem(page: Page, text: string) {
  const input = itemForm(page).getByLabel("New item");
  await input.evaluate((field) => {
    field.removeAttribute("required");
    field.removeAttribute("maxlength");
  });
  await input.fill(text);
  await itemForm(page).getByRole("button", { name: "Add item" }).click();
}

async function addItem(page: Page, text: string) {
  const before = await items(page).count();
  await submitItem(page, text);
  await expect(items(page)).toHaveCount(before + 1);
}

function box(page: Page, text: string) {
  return checklist(page).getByRole("checkbox", { name: text, exact: true });
}

/** Ticks or unticks an item and waits until the server has stored it. */
async function setDone(page: Page, text: string, done: boolean) {
  await persistedMove(page, () => (done ? box(page, text).check() : box(page, text).uncheck()));
}

function progress(page: Page, title: string) {
  return cards(page, "To do").filter({ hasText: title }).locator("p.checklist-progress");
}

test("AC39: items are added to the end, unchecked, and kept after reload", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Lists");
  await addTask(a.page, url, "Launch");
  const taskUrl = await openTask(a.page, "Launch");
  await expect(checklist(a.page).getByRole("heading", { name: "Checklist" })).toBeVisible();
  await expect(items(a.page)).toHaveCount(0);

  await addItem(a.page, "Write the copy");
  await expect(itemForm(a.page).getByLabel("New item")).toHaveValue("");
  await addItem(a.page, "  Pick screenshots  ");
  await addItem(a.page, "Proofread");
  await expect(items(a.page)).toHaveText([/Write the copy/, /Pick screenshots/, /Proofread/]);
  await expect(box(a.page, "Pick screenshots")).not.toBeChecked();

  await a.page.goto(taskUrl);
  await expect(checklist(a.page).getByRole("checkbox")).toHaveCount(3);
  for (const text of ["Write the copy", "Pick screenshots", "Proofread"]) await expect(box(a.page, text)).not.toBeChecked();
  await expect(items(a.page).first().getByRole("button", { name: 'Delete item "Write the copy"' })).toBeVisible();
});

test("AC39: item errors are shown and the typed text is kept", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Strict lists");
  await addTask(a.page, url, "Careful");
  const taskUrl = await openTask(a.page, "Careful");
  const alert = itemForm(a.page).getByRole("alert");
  const input = itemForm(a.page).getByLabel("New item");
  await expect(input).toHaveAttribute("maxlength", "200");

  await submitItem(a.page, "   ");
  await expect(alert).toHaveText("Item is required");
  await submitItem(a.page, "x".repeat(201));
  await expect(alert).toHaveText("Item must be at most 200 characters");
  await expect(input).toHaveValue("x".repeat(201));
  await expect(items(a.page)).toHaveCount(0);

  await addItem(a.page, "y".repeat(200));
  await expect(alert).toHaveCount(0);
  await a.page.goto(taskUrl);
  await expect(items(a.page)).toHaveCount(1);
  await expect(box(a.page, "y".repeat(200))).toBeVisible();
});

test("AC39: ticking and unticking is saved without a button", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Ticks");
  await addTask(a.page, url, "Tick me");
  const taskUrl = await openTask(a.page, "Tick me");
  await addItem(a.page, "First");
  await addItem(a.page, "Second");

  await setDone(a.page, "Second", true);
  // A fresh visit, not reload(): Chromium restores ticked boxes on reload, which would hide a lost save.
  await a.page.goto(taskUrl);
  await expect(box(a.page, "Second")).toBeChecked();
  await expect(box(a.page, "First")).not.toBeChecked();

  await setDone(a.page, "Second", false);
  await a.page.goto(taskUrl);
  await expect(box(a.page, "Second")).not.toBeChecked();
});

test("AC39: Delete removes the item without asking", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Trim");
  await addTask(a.page, url, "Shorten");
  const taskUrl = await openTask(a.page, "Shorten");
  await addItem(a.page, "Keep");
  await addItem(a.page, "Drop");

  await checklist(a.page).getByRole("button", { name: 'Delete item "Drop"' }).click();
  await expect(items(a.page)).toHaveText([/Keep/]);
  await a.page.goto(taskUrl);
  await expect(items(a.page)).toHaveText([/Keep/]);
});

test("AC40: the card shows checklist progress, and none without items", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Progress");
  await addTask(a.page, url, "Plain");
  await addTask(a.page, url, "Tracked");
  await expect(progress(a.page, "Plain")).toHaveCount(0);
  await expect(progress(a.page, "Tracked")).toHaveCount(0);

  await openTask(a.page, "Tracked");
  await addItem(a.page, "One");
  await addItem(a.page, "Two");
  await addItem(a.page, "Three");
  await setDone(a.page, "Two", true);
  await a.page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(progress(a.page, "Tracked")).toHaveText("Checklist 1/3");
  await expect(progress(a.page, "Plain")).toHaveCount(0);

  await openTask(a.page, "Tracked");
  await setDone(a.page, "Three", true);
  await a.page.goto(url);
  await expect(progress(a.page, "Tracked")).toHaveText("Checklist 2/3");

  await openTask(a.page, "Tracked");
  await checklist(a.page).getByRole("button", { name: 'Delete item "One"' }).click();
  await expect(items(a.page)).toHaveCount(2);
  await a.page.goto(url);
  await expect(progress(a.page, "Tracked")).toHaveText("Checklist 2/2");
});

/** The id of an item, read from its checkbox's value. */
async function itemId(page: Page, text: string): Promise<number> {
  const value = await box(page, text).getAttribute("value");
  expect(value).toMatch(/^\d+$/);
  return Number(value);
}

function ids(taskUrl: string): { projectId: number; taskId: number } {
  const [, , projectId, , taskId] = taskUrl.split("/");
  return { projectId: Number(projectId), taskId: Number(taskId) };
}

test("AC39: an item id of another task in the project is not toggled or deleted", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Two tasks");
  await addTask(a.page, url, "Target");
  const targetUrl = await openTask(a.page, "Target");
  await addItem(a.page, "Protected");
  const protectedId = await itemId(a.page, "Protected");
  await addTask(a.page, url, "Attacker");
  const attackerUrl = await openTask(a.page, "Attacker");
  await addItem(a.page, "Bait");

  const toggled = await tamperBoundIds(a.page, [null, null, protectedId]);
  await setDone(a.page, "Bait", true);
  await toggled();
  const deleted = await tamperBoundIds(a.page, [null, null, protectedId]);
  await checklist(a.page).getByRole("button", { name: 'Delete item "Bait"' }).click();
  await deleted();

  await a.page.goto(targetUrl);
  await expect(items(a.page)).toHaveCount(1);
  await expect(box(a.page, "Protected")).not.toBeChecked();
  await a.page.goto(attackerUrl);
  await expect(box(a.page, "Bait")).not.toBeChecked();
});

/** B ticks, deletes and adds on B's own task while the bound ids are rewritten to A's; A's checklist is unchanged. */
async function tamperedByNonMember(browser: Browser) {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Private");
  await addTask(a.page, urlA, "A's task");
  const taskUrlA = await openTask(a.page, "A's task");
  await addItem(a.page, "Secret");
  const target = { ...ids(taskUrlA), itemId: await itemId(a.page, "Secret") };

  const urlB = await createProject(b.page, "Mine");
  await addTask(b.page, urlB, "B's task");
  await openTask(b.page, "B's task");
  await addItem(b.page, "Decoy");

  const toggled = await tamperBoundIds(b.page, [target.projectId, target.taskId, target.itemId]);
  await setDone(b.page, "Decoy", true);
  await toggled();
  const deleted = await tamperBoundIds(b.page, [target.projectId, target.taskId, target.itemId]);
  await checklist(b.page).getByRole("button", { name: 'Delete item "Decoy"' }).click();
  await deleted();
  const added = await tamperBoundIds(b.page, [target.projectId, target.taskId]);
  await submitItem(b.page, "Planted");
  await added();

  await a.page.goto(taskUrlA);
  await expect(items(a.page)).toHaveText([/Secret/]);
  await expect(box(a.page, "Secret")).not.toBeChecked();
}

test("AC39: a non-member's checklist requests change nothing", async ({ browser }) => {
  await tamperedByNonMember(browser);
});

function checklistAlert(page: Page) {
  return checklist(page).getByRole("alert");
}

/** Deletes the item from a second tab of the same user, leaving `page`'s checklist stale. */
async function deleteItemInOtherTab(page: Page, text: string) {
  const other = await page.context().newPage();
  await other.goto(page.url());
  await checklist(other).getByRole("button", { name: `Delete item "${text}"` }).click();
  await expect(box(other, text)).toHaveCount(0);
  await other.close();
}

test("AC47: ticking an item deleted in another tab shows an alert and drops the row; the next tick clears it", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Stale ticks");
  await addTask(a.page, url, "Two tabs");
  await openTask(a.page, "Two tabs");
  await addItem(a.page, "Live");
  await addItem(a.page, "Gone");
  await setDone(a.page, "Live", true);
  await expect(checklistAlert(a.page)).toHaveCount(0);

  await deleteItemInOtherTab(a.page, "Gone");
  await box(a.page, "Gone").check();
  await expect(checklistAlert(a.page)).toHaveText('Could not update "Gone"');
  await expect(checklistAlert(a.page)).toHaveCSS("color", "rgb(185, 28, 28)");
  await expect(items(a.page)).toHaveText([/Live/]);

  await setDone(a.page, "Live", false);
  await expect(checklistAlert(a.page)).toHaveCount(0);
  await expect(box(a.page, "Live")).not.toBeChecked();
});

test("AC47: deleting an item already deleted in another tab shows an alert and drops the row; the next delete clears it", async ({
  browser,
}) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Stale deletes");
  await addTask(a.page, url, "Two tabs");
  await openTask(a.page, "Two tabs");
  await addItem(a.page, "Keep");
  await addItem(a.page, "Drop");
  await addItem(a.page, "Gone");

  await deleteItemInOtherTab(a.page, "Gone");
  await checklist(a.page).getByRole("button", { name: 'Delete item "Gone"' }).click();
  await expect(checklistAlert(a.page)).toHaveText('Could not update "Gone"');
  await expect(items(a.page)).toHaveText([/Keep/, /Drop/]);

  await checklist(a.page).getByRole("button", { name: 'Delete item "Drop"' }).click();
  await expect(items(a.page)).toHaveText([/Keep/]);
  await expect(checklistAlert(a.page)).toHaveCount(0);
});

/** Runs `act`, then waits until every server action it sent has been answered and the page has re-rendered. */
async function settledActions(page: Page, act: () => Promise<void>) {
  let sent = 0;
  let answered = 0;
  const isAction = (request: Request) => request.method() === "POST" && !!request.headers()["next-action"];
  const onRequest = (request: Request) => void (isAction(request) && sent++);
  const onFinished = (request: Request) => void (isAction(request) && answered++);
  page.on("request", onRequest);
  page.on("requestfinished", onFinished);
  await act();
  await expect.poll(() => sent > 0 && answered === sent).toBe(true);
  await page.waitForLoadState("networkidle");
  page.off("request", onRequest);
  page.off("requestfinished", onFinished);
}

test("AC47: double-clicking Delete removes the item and shows no alert", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Quick hands");
  await addTask(a.page, url, "Double click");
  await openTask(a.page, "Double click");
  await addItem(a.page, "Keep");
  await addItem(a.page, "Twice");

  await settledActions(a.page, () => checklist(a.page).getByRole("button", { name: 'Delete item "Twice"' }).dblclick());
  await expect(items(a.page)).toHaveText([/Keep/]);
  await expect(checklistAlert(a.page)).toHaveCount(0);
});
