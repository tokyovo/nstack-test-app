import { expect, test, type Browser, type Page } from "@playwright/test";
import { cards, column, createProject, newUser, persistedMove, type ColumnName } from "./helpers";

async function projectWithTask(page: Page, projectName: string, title: string): Promise<string> {
  const url = await createProject(page, projectName);
  await page.goto(url);
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(page, "To do")).toHaveCount(1);
  return url;
}

function card(page: Page, title: string) {
  return page.getByRole("listitem").filter({ hasText: title });
}

test("AC9: dragging a card to In progress, then Done, moves it and persists", async ({ browser }) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Drag", "Ship it");

  await persistedMove(a.page, () => card(a.page, "Ship it").dragTo(column(a.page, "In progress")));
  await expect(cards(a.page, "In progress")).toContainText(["Ship it"]);
  await expect(cards(a.page, "To do")).toHaveCount(0);
  await a.page.reload();
  await expect(cards(a.page, "In progress")).toContainText(["Ship it"]);
  await expect(cards(a.page, "To do")).toHaveCount(0);

  await persistedMove(a.page, () => card(a.page, "Ship it").dragTo(column(a.page, "Done")));
  await expect(cards(a.page, "Done")).toContainText(["Ship it"]);
  await a.page.reload();
  await expect(cards(a.page, "Done")).toContainText(["Ship it"]);
  await expect(cards(a.page, "In progress")).toHaveCount(0);
});

test("AC10: ArrowRight moves a focused card one column right, ArrowLeft one left; persists", async ({ browser }) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Keys", "Review PR");

  await card(a.page, "Review PR").focus();
  await persistedMove(a.page, () => a.page.keyboard.press("ArrowRight"));
  await expect(cards(a.page, "In progress")).toContainText(["Review PR"]);
  await expect(card(a.page, "Review PR")).toBeFocused();
  await a.page.reload();
  await expect(cards(a.page, "In progress")).toContainText(["Review PR"]);

  await card(a.page, "Review PR").focus();
  await persistedMove(a.page, () => a.page.keyboard.press("ArrowRight"));
  await expect(cards(a.page, "Done")).toContainText(["Review PR"]);
  await a.page.keyboard.press("ArrowRight");
  await a.page.reload();
  await expect(cards(a.page, "Done")).toContainText(["Review PR"]);

  await card(a.page, "Review PR").focus();
  await persistedMove(a.page, () => a.page.keyboard.press("ArrowLeft"));
  await expect(cards(a.page, "In progress")).toContainText(["Review PR"]);
  await a.page.reload();
  await expect(cards(a.page, "In progress")).toContainText(["Review PR"]);
  await expect(cards(a.page, "Done")).toHaveCount(0);
});

test("AC10: an arrow key that moves nothing does not pull focus back to the card later", async ({ browser }) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Edge", "First");

  await card(a.page, "First").focus();
  await a.page.keyboard.press("ArrowLeft");
  await expect(cards(a.page, "To do")).toContainText(["First"]);

  const title = a.page.getByLabel("Title");
  await title.fill("Second");
  await title.press("Enter");
  await expect(cards(a.page, "To do")).toHaveCount(2);
  await expect(title).toBeFocused();
  await expect(card(a.page, "First")).not.toBeFocused();
});

/**
 * B, who is not a member of A's project, presses ArrowRight on B's own card while the move
 * request's arguments ([projectId, taskId, status]) are rewritten by `tamper`. A's task must stay put.
 */
async function tamperedMove(browser: Browser, tamper: (args: unknown[], a: { projectId: number; taskId: number }) => void) {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await projectWithTask(a.page, "Private", "A's task");
  await projectWithTask(b.page, "Mine", "B's task");
  const target = {
    projectId: Number(urlA.split("/").pop()),
    taskId: Number(await card(a.page, "A's task").getAttribute("data-task-id")),
  };
  expect(target.taskId).toBeGreaterThan(0);

  let answered = false;
  await b.page.route("**/projects/*", async (route) => {
    const args = route.request().method() === "POST" ? JSON.parse(route.request().postData() ?? "null") : null;
    if (!Array.isArray(args) || !args.includes("in_progress")) return route.continue();
    tamper(args, target);
    const response = await route.fetch({ postData: JSON.stringify(args) });
    await route.fulfill({ response });
    answered = true;
  });
  await card(b.page, "B's task").focus();
  await b.page.keyboard.press("ArrowRight");
  await expect.poll(() => answered).toBe(true);

  await a.page.goto(urlA);
  await expect(cards(a.page, "To do")).toContainText(["A's task"]);
  await expect(cards(a.page, "In progress")).toHaveCount(0);
}

test("AC9: a move request naming another project's task id does not move it", async ({ browser }) => {
  await tamperedMove(browser, (args, a) => {
    args[args.length - 2] = a.taskId;
  });
});

test("AC9: a move request naming a project the user is not a member of does not move its task", async ({
  browser,
}) => {
  await tamperedMove(browser, (args, a) => {
    args[args.length - 3] = a.projectId;
    args[args.length - 2] = a.taskId;
  });
});

/** Deletes the task from its own task page, in a second tab of the same user, leaving `page`'s board stale. */
async function deleteInOtherTab(page: Page, title: string) {
  const other = await page.context().newPage();
  await other.goto(page.url());
  await other.getByRole("link", { name: title, exact: true }).click();
  other.once("dialog", (dialog) => void dialog.accept());
  await other.getByRole("button", { name: "Delete task" }).click();
  await expect(other.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  await other.close();
}

function moveAlert(page: Page) {
  return page.locator(".board").getByRole("alert");
}

test("AC29: dragging a card deleted in another tab shows an alert and leaves it out of the target column", async ({
  browser,
}) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Stale drag", "Gone task");
  await deleteInOtherTab(a.page, "Gone task");

  await card(a.page, "Gone task").dragTo(column(a.page, "In progress"));
  await expect(moveAlert(a.page)).toHaveText('Could not move "Gone task"');
  await expect(cards(a.page, "In progress")).toHaveCount(0);
  await expect(cards(a.page, "To do")).toHaveCount(0); // the board refreshed: the deleted card is gone
});

test("AC29: ArrowRight on a card deleted in another tab shows an alert; the next successful move clears it", async ({
  browser,
}) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Stale keys", "Gone task");
  await a.page.getByLabel("Title").fill("Live task");
  await a.page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(a.page, "To do")).toHaveCount(2);

  await persistedMove(a.page, () => card(a.page, "Live task").dragTo(column(a.page, "In progress")));
  await expect(cards(a.page, "In progress")).toContainText(["Live task"]);
  await expect(moveAlert(a.page)).toHaveCount(0);

  await deleteInOtherTab(a.page, "Gone task");
  await card(a.page, "Gone task").focus();
  await a.page.keyboard.press("ArrowRight");
  await expect(moveAlert(a.page)).toHaveText('Could not move "Gone task"');
  await expect(cards(a.page, "In progress")).toHaveText([/Live task/]);

  await card(a.page, "Live task").focus();
  await persistedMove(a.page, () => a.page.keyboard.press("ArrowRight"));
  await expect(cards(a.page, "Done")).toContainText(["Live task"]);
  await expect(moveAlert(a.page)).toHaveCount(0);
});

/** The count beside a column's heading. */
function columnCount(page: Page, name: ColumnName) {
  return column(page, name).locator(".column-count");
}

test("AC6: each column shows the count of its visible cards beside its heading; search and moves change the counts", async ({
  browser,
}) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Counts", "Write docs");
  await a.page.getByLabel("Title").fill("Fix bug");
  await a.page.getByRole("button", { name: "Add task" }).click();
  await expect(cards(a.page, "To do")).toHaveCount(2);

  await expect(columnCount(a.page, "To do")).toHaveText("2");
  await expect(columnCount(a.page, "In progress")).toHaveText("0");
  await expect(columnCount(a.page, "Done")).toHaveText("0");
  // Next to the heading, not in it: the heading and the region name stay "To do".
  await expect(column(a.page, "To do").locator("h2 .column-count")).toHaveCount(0);
  await expect(column(a.page, "To do").getByRole("heading", { level: 2 })).toHaveText("To do");

  await a.page.getByLabel("Search tasks").fill("zzzz");
  for (const name of ["To do", "In progress", "Done"] satisfies ColumnName[]) await expect(columnCount(a.page, name)).toHaveText("0");
  await a.page.getByLabel("Search tasks").fill("");
  await expect(columnCount(a.page, "To do")).toHaveText("2");

  await card(a.page, "Write docs").focus();
  await persistedMove(a.page, () => a.page.keyboard.press("ArrowRight"));
  await expect(columnCount(a.page, "To do")).toHaveText("1");
  await expect(columnCount(a.page, "In progress")).toHaveText("1");
});
