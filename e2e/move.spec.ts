import { expect, test, type Browser, type Page } from "@playwright/test";
import { cards, column, createProject, newUser } from "./helpers";

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

  await card(a.page, "Ship it").dragTo(column(a.page, "In progress"));
  await expect(cards(a.page, "In progress")).toContainText(["Ship it"]);
  await expect(cards(a.page, "To do")).toHaveCount(0);
  await a.page.reload();
  await expect(cards(a.page, "In progress")).toContainText(["Ship it"]);
  await expect(cards(a.page, "To do")).toHaveCount(0);

  await card(a.page, "Ship it").dragTo(column(a.page, "Done"));
  await expect(cards(a.page, "Done")).toContainText(["Ship it"]);
  await a.page.reload();
  await expect(cards(a.page, "Done")).toContainText(["Ship it"]);
  await expect(cards(a.page, "In progress")).toHaveCount(0);
});

test("AC10: ArrowRight moves a focused card one column right, ArrowLeft one left; persists", async ({ browser }) => {
  const a = await newUser(browser);
  await projectWithTask(a.page, "Keys", "Review PR");

  await card(a.page, "Review PR").focus();
  await a.page.keyboard.press("ArrowRight");
  await expect(cards(a.page, "In progress")).toContainText(["Review PR"]);
  await expect(card(a.page, "Review PR")).toBeFocused();
  await a.page.reload();
  await expect(cards(a.page, "In progress")).toContainText(["Review PR"]);

  await card(a.page, "Review PR").focus();
  await a.page.keyboard.press("ArrowRight");
  await expect(cards(a.page, "Done")).toContainText(["Review PR"]);
  await a.page.keyboard.press("ArrowRight");
  await a.page.reload();
  await expect(cards(a.page, "Done")).toContainText(["Review PR"]);

  await card(a.page, "Review PR").focus();
  await a.page.keyboard.press("ArrowLeft");
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
