# Plan: task board v1

## Spec
Users of a small team manage shared task boards in the browser.

Design: Next.js App Router with Server Components + Server Actions (no separate API layer); `better-sqlite3` on a file at `DATABASE_PATH` (default `./data/app.db`), schema created on first open; passwords hashed with Node `crypto.scrypt` + per-user salt; sessions = random token in a `sessions` table, sent as an httpOnly, SameSite=Lax cookie. Drag-and-drop uses native HTML5 DnD (no library); keyboard: focus a task card and press `ArrowRight`/`ArrowLeft` to move it to the next/previous column. Alternative considered: @dnd-kit (gives both) — rejected as more code/deps than native DnD + two key handlers.

Acceptance criteria (each is a Playwright test in `e2e/`):
1. Visiting `/` while logged out redirects to `/login`.
2. A new user can sign up with email + password (min 8 chars), lands on `/projects`, and the header shows their email. Signing up with an already-used email shows an error.
3. Log out returns to `/login`; afterwards `/projects` redirects to `/login`. Logging back in with the right password works; a wrong password shows "Invalid email or password".
4. Passwords are not stored in plain text (unit/integration check on the DB row: hash != password).
5. A user can create a project, rename it, and delete it; the list updates each time.
6. User B does not see user A's project in their list, and visiting A's project URL as B gives a 404 (not found) page.
7. A can invite B by email; B then sees the project. Inviting an unknown email shows "No user with that email". Inviting an existing member shows an error.
8. In a project, a member can create a task with title (required), description, assignee (a project member, optional), due date (optional); it appears in "To do" showing title, assignee and due date.
9. Dragging a task card to "In progress" / "Done" moves it, and the move persists after reload.
10. Focusing a task card and pressing ArrowRight moves it one column right, ArrowLeft one left; persists after reload.
11. Opening a task shows its details; a member can add a comment, which appears with author email and persists after reload.
12. Searching in a project filters the board to tasks whose title or description contains the query (case-insensitive); clearing shows all.
13. CI (GitHub Actions) runs lint, typecheck, build and all Playwright tests on push and PR, and is green on main.

Out of scope: see goal.md.

## Tickets
- [x] T1 Harness: Next.js app scaffold, SQLite db module with schema bootstrap, Playwright config (starts the built app on a temp DB), one smoke e2e test, npm scripts (lint, typecheck, build, test:e2e), GitHub Actions CI. Proof: `npm run lint && npm run typecheck && npm run build && npm run test:e2e` pass locally; CI green on the PR. Needs: none. Evidence: CI green on PR #1 at bd433c8 (run 45535731993, 41 passed).
- [x] T2 Auth: signup, login, logout, session cookie, redirect guard. Proof: e2e for AC 1-4. Needs: T1
- [x] T3 Projects: create, rename, delete, member-only visibility + 404 for non-members. Proof: e2e for AC 5-6. Needs: T2
- [x] T4 Invite existing user by email. Proof: e2e for AC 7. Needs: T3
- [x] T5 Tasks: create with fields; three-column board. Proof: e2e for AC 8. Needs: T4 (assignee needs members)
- [x] T6 Move tasks by drag-and-drop and by keyboard. Proof: e2e for AC 9-10. Needs: T5
- [x] T7 Comments on a task. Proof: e2e for AC 11. Needs: T5
- [x] T8 Search tasks in a project. Proof: e2e for AC 12. Needs: T5

AC13 met: PR #1 merged to main as e2ecb58; CI on main green (run 45541011124, 41 passed).

# Plan: slice 2 "usable board" (from improve, 2026-11-25)

## Spec
Evidence: UX pass + research (see backlog.md, research.md). Keep it small: plain CSS in `app/globals.css` (no CSS framework), no new deps.

Acceptance criteria (each a Playwright test in `e2e/`):
14. Clicking a project's Delete asks for confirmation; dismissing it keeps the project; accepting deletes it.
15. On the board at 1280x800, the three columns sit side by side (same top, different left); at 390x844 the page has no horizontal scroll (document scrollWidth <= viewport width). A task with a 400-char unbroken title causes no horizontal scroll on the board or task page at either size. Title length is capped server-side at 200 chars (longer is rejected with an error).
16. A task whose due date is before today (server's local date) and that is not in Done is marked overdue on its card (visible text "Overdue" and a CSS class); a future-dated task and a past-dated task in Done are not.
17. A member can edit a task's title, description, assignee and due date from the task page; changes persist after reload and show on the board. A member can delete a task (with confirmation); it disappears from the board and its URL then 404s. Non-members cannot edit/delete (server-side check, tamper test).

## Tickets
- [x] T9 Confirm before project delete. Proof: e2e AC14. Needs: none
- [x] T10 Base stylesheet: side-by-side columns, responsive at 390px, word-wrap long text, 200-char title cap. Proof: e2e AC15. Needs: none
- [x] T11 Overdue flag on cards. Proof: e2e AC16. Needs: T10 (same board files)
- [x] T12 Edit and delete tasks. Proof: e2e AC17. Needs: T11

Slice 2 shipped: PR #2 merged to main as 5f950cf; CI on main green (run 45552549785, 56 passed).

# Plan: slice 3 "hardening + my tasks" (from improve, 2026-11-25)

## Spec
Evidence: backlog.md items scored 8 (bar 8 in goal.md). No new deps.

Acceptance criteria:
18. CI uses Node-24-based action majors (actions/checkout@v6+, actions/setup-node@v6+, actions/upload-artifact@v6+ or the latest major), and CI is green with no "Node.js 20 is deprecated" annotation.
19. A session older than 30 days is rejected: the user is treated as logged out and the expired row is deleted (e2e: set the session row's created_at to 31 days ago in the DB, then `/projects` redirects to `/login`; a 29-day-old session still works). The session cookie has a 30-day maxAge (e2e checks its expiry is ~30 days out) and `secure: true` when NODE_ENV is production, unless `INSECURE_COOKIES=1` (set by the Playwright webServer, which serves http).
20. After a validation error, forms keep what the user typed: signup/login keep the email (not the password); new-task and edit-task forms keep title, description, assignee and due date. e2e per form: submit invalid input, see the error, and the fields still hold the typed values.
21. The board has an assignee filter ("All", "My tasks", "Unassigned", each member's email). Choosing one shows only matching tasks; it combines with search (AND); "All" restores the board. e2e covers My tasks, a specific member, Unassigned, combined with search.

## Tickets
- [x] T13 Bump CI action majors. Proof: AC18, CI green on the PR and the run log has no Node 20 deprecation annotation. Needs: none Evidence: PR #5 CI runs 45558869560, 45558876172 green, no annotations.
- [x] T14 Session expiry (30 days) + cookie maxAge + secure in production. Proof: e2e AC19. Needs: none Evidence: 9a84ee8, full chain 59 passed (verify.md).
- [x] T15 Forms keep typed values after a validation error. Proof: e2e AC20. Needs: none Evidence: f8be80b, full chain 61 passed (verify.md).
- [x] T16 Assignee filter on the board. Proof: e2e AC21. Needs: T15 (both touch board files; run in sequence) Evidence: 4016f7c, full chain 66 passed (verify.md).

Slice 3 shipped: PR #5 merged to main as 6d9be09; CI on main green (run 45559280150, 66 passed).

# Plan: slice 4 "drive harness" (from go step 0, 2026-11-25)

## Spec
verify.md had no Drive section and no one command takes screenshots of the main screens, so agents (improve's UX pass, reviewers) drive the app by hand each time. Add a seed and a screens command. No new deps (`@playwright/test` already ships the browser API); scripts run with Node 24's built-in TypeScript type stripping.

Acceptance criteria:
22. `BASE_URL=<url> npm run seed` fills a running app, through its UI, with realistic data: user demo@example.com / correct-horse-1 (created, or logged in if it exists), a second member with a long email, a project "Website relaunch" with tasks in all three columns (one overdue, one with a 200-char title, one assigned, one with a comment), and an empty project. It prints the sign-in and the board URL. e2e/seed.spec.ts runs the seed function against the e2e server and checks the board shows tasks in all three columns, an "Overdue" card and a comment on a task; runs in CI.
23. `BASE_URL=<url> npm run screens -- <dir>` seeds (as in 22), then saves PNG screenshots of /login, /signup, /projects, the board and a task page at 1280x800 and 390x844 (10 files, full page) into <dir>, and exits non-zero if any page logs a console error other than the favicon 404. Proof: run against an isolated server; 10 files exist and are non-empty.

## Tickets
- [x] T17 Seed and screens commands. Proof: e2e AC22 in the full chain; AC23 run once against an isolated server (`ls <dir>` shows 10 non-empty PNGs). Needs: none Evidence: acd877b, full chain 67 passed; controller verify + review in log.md (2026-11-25 Slice 4 verify + review).
