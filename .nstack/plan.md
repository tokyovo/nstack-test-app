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
- [~] T1 Harness: Next.js app scaffold, SQLite db module with schema bootstrap, Playwright config (starts the built app on a temp DB), one smoke e2e test, npm scripts (lint, typecheck, build, test:e2e), GitHub Actions CI. Proof: `npm run lint && npm run typecheck && npm run build && npm run test:e2e` pass locally; CI green on the PR. Needs: none. Built+verified locally (4cb449f); CI push parked: token lacks workflow scope, see log 2026-11-25
- [x] T2 Auth: signup, login, logout, session cookie, redirect guard. Proof: e2e for AC 1-4. Needs: T1
- [ ] T3 Projects: create, rename, delete, member-only visibility + 404 for non-members. Proof: e2e for AC 5-6. Needs: T2
- [ ] T4 Invite existing user by email. Proof: e2e for AC 7. Needs: T3
- [ ] T5 Tasks: create with fields; three-column board. Proof: e2e for AC 8. Needs: T4 (assignee needs members)
- [ ] T6 Move tasks by drag-and-drop and by keyboard. Proof: e2e for AC 9-10. Needs: T5
- [ ] T7 Comments on a task. Proof: e2e for AC 11. Needs: T5
- [ ] T8 Search tasks in a project. Proof: e2e for AC 12. Needs: T5
