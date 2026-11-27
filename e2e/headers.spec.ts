import { expect, test, type APIResponse } from "@playwright/test";
import { createProject, newUser } from "./helpers";

const SECURITY_HEADERS = {
  "content-security-policy": "frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
};

function expectSecurityHeaders(response: APIResponse, expectedStatus: number) {
  expect(response.status(), response.url()).toBe(expectedStatus);
  const headers = response.headers();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(headers[name], `${name} on ${response.url()}`).toBe(value);
  }
}

test("AC1: pages, the export, a 404 and a static file carry frame-ancestors 'none' and nosniff", async ({
  browser,
  playwright,
}) => {
  const anonymous = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL });
  expectSecurityHeaders(await anonymous.get("/", { maxRedirects: 0 }), 307);
  const login = await anonymous.get("/login");
  expectSecurityHeaders(login, 200);
  const script = (await login.text()).match(/src="(\/_next\/static\/[^"]+\.js)"/)?.[1];
  expect(script, "a /_next/static script in the /login HTML").toBeDefined();
  expectSecurityHeaders(await anonymous.get(script!), 200);
  await anonymous.dispose();

  const { page } = await newUser(browser);
  const board = await createProject(page, "Headers project");
  const signedIn = page.request;
  expectSecurityHeaders(await signedIn.get("/projects"), 200);
  expectSecurityHeaders(await signedIn.get(board), 200);
  expectSecurityHeaders(await signedIn.get(`${board}/export?format=csv`), 200);
  expectSecurityHeaders(await signedIn.get("/nope"), 404);
});
