import { expect, test, type Page } from "@playwright/test";
import { createProject, newEmail, newUser, tamperBoundProjectId } from "./helpers";

async function invite(page: Page, projectUrl: string, email: string) {
  await page.goto(projectUrl);
  await page.getByLabel("Invite by email").fill(email);
  await page.getByRole("button", { name: "Invite" }).click();
}

function inviteError(page: Page) {
  return page.locator("form").getByRole("alert");
}

test("AC7: A invites B by email and B then sees and can open the project", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Shared plans");

  await invite(a.page, url, b.email);
  await expect(a.page.getByRole("list", { name: "Members" }).getByText(b.email)).toBeVisible();

  await b.page.goto("/projects");
  await expect(b.page.getByRole("list", { name: "Your projects" }).getByRole("link", { name: "Shared plans" })).toBeVisible();
  const response = await b.page.goto(url);
  expect(response?.status()).toBe(200);
  await expect(b.page.getByRole("heading", { name: "Shared plans" })).toBeVisible();
});

test("AC7: inviting an unknown email shows 'No user with that email'", async ({ browser }) => {
  const a = await newUser(browser);
  const url = await createProject(a.page, "Solo");
  await invite(a.page, url, newEmail());
  await expect(inviteError(a.page)).toHaveText("No user with that email");
});

test("AC7: inviting an existing member shows an error", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const url = await createProject(a.page, "Duo");

  await invite(a.page, url, b.email);
  await expect(a.page.getByRole("list", { name: "Members" }).getByText(b.email)).toBeVisible();
  await invite(a.page, url, b.email);
  await expect(inviteError(a.page)).toHaveText("That user is already a member");

  await invite(a.page, url, a.email);
  await expect(inviteError(a.page)).toHaveText("That user is already a member");
});

test("AC7: an invite request naming a project the user is not a member of adds no member there", async ({ browser }) => {
  const a = await newUser(browser);
  const b = await newUser(browser);
  const urlA = await createProject(a.page, "Private");
  const urlB = await createProject(b.page, "Mine");

  await b.page.goto(urlB);
  const answered = await tamperBoundProjectId(b.page, Number(urlA.split("/").pop()));
  await b.page.getByLabel("Invite by email").fill(b.email);
  await b.page.getByRole("button", { name: "Invite" }).click();
  await answered();

  const response = await b.page.goto(urlA);
  expect(response?.status()).toBe(404);
  await a.page.goto(urlA);
  await expect(a.page.getByRole("list", { name: "Members" })).toBeVisible();
  await expect(a.page.getByRole("list", { name: "Members" }).getByText(b.email)).toHaveCount(0);
});
