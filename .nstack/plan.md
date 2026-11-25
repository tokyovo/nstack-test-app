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

# Plan: slice 5 "forms look finished" (from improve, 2026-11-25)

## Spec
Evidence: UX pass on `npm run screens` output (/tmp/t17-shots/, 1280 and 390 px). Every form puts its label inline before the field, so fields and buttons wrap raggedly; the edit-task Title field is ~160px and cuts off the title; the Assignee and "Show tasks for" selects stretch to the longest member email (~530px); each project row stacks a rename field and a Delete button under the link. Score 8 (v3 r1 c4), bar 8. Plain CSS in `app/globals.css`, markup changes only where CSS cannot do it; no new deps.

Acceptance criteria (e2e, Playwright, at 1280x800 unless stated; seed data or a long-email member as in AC15):
24. In the new-task and edit-task forms, the comment form, the invite form, the new-project form and login/signup, each label sits above its field (label's bottom <= field's top) and the fields of one form share a left edge.
25. Text inputs, textareas and selects in the task forms are between 280px and 512px wide at 1280px, also with a member whose email is 60+ chars (selects no longer stretch to the longest email); the edit-task Title field shows a 40-char title in full (input scrollWidth <= clientWidth).
26. On /projects at 1280px, a project's link, rename field, Rename and Delete buttons are on one row (their vertical centers within 4px of each other).
27. Nothing regresses: the AC15 tests (no horizontal scroll at 390px, long text wraps) still pass, and the screens at 1280 and 390 px are reviewed by eye.

## Tickets
- [x] T18 Form and project-row layout. Proof: e2e AC24-26 (new e2e/forms-layout.spec.ts), full chain, `npm run screens` reviewed at both widths. Needs: none Evidence: 20cf901, full chain 71 passed; controller verify + review in log.md (2026-11-25 Slice 5 verify + review).

Slices 4-5 shipped: PR #7 merged as ac360ee (CI 67 passed), PR #8 merged as c30759b (CI run 45567398138, 71 passed).

# Plan: slice 6 "board feedback" (from improve, 2026-11-25, bar 7)

## Spec
Evidence: backlog.md items scored 7 (bar lowered to 7 by the owner, 52442f7): no way back to Projects from a board, task page or 404 page; a move the server refuses snaps the card back with no message; search and filter are lost on reload and cannot be shared; every e2e run leaves its SQLite file in the OS temp dir. All but the last touch the board screen.

Acceptance criteria (Playwright e2e unless stated):
28. When logged in, the header's "Task board" title is a link to /projects, on every page (board, task page, a 404 such as /projects/999999); clicking it on the board lands on /projects. Logged out (/login), the title is plain text (not a link).
29. When the server refuses a move (the task was deleted in another tab, then the card is dragged or moved with ArrowRight), the card ends up back in its original column and an element with role="alert" says `Could not move "<title>"` ; the next successful move clears that message. A successful move shows no alert.
30. Typing in Search tasks and choosing "Show tasks for" updates the URL query (`?q=<text>&for=<all|mine|unassigned|member id>`, a key left out when empty / "all") without adding history entries; loading the board with that URL shows the same filtered board with the inputs filled. Unknown `for` values behave as "all".
31. (Script check) After `npm run test:e2e` exits, no `taskboard-e2e-*` file from that run (db, -wal, -shm) remains in the OS temp dir.

Out of scope: breadcrumbs, a nav menu, retrying failed moves, persisting filters per user.

Decision: header link (one element in app/layout.tsx) rather than per-page back links: covers board, task page and 404 with one change. The task page already links to its board.
Decision: `moveTaskAction` returns `boolean` (true when stored); the board shows the alert when it returns false or throws. The optimistic state reverts on its own when the transition ends, so no extra revert code.
Decision: URL state via `window.history.replaceState` (Next App Router syncs it with useSearchParams; no navigation, no server round trip); the page passes the initial `q` / `for` from `searchParams` as props so the board needs no Suspense boundary. replace, not push: typing should not fill the back button.
Decision: temp DB cleanup in a Playwright `globalTeardown` that removes `E2E_DATABASE_PATH` and its -wal/-shm (missing files ignored). If the webServer is still running when it runs, unlinking open files is fine on Linux (local and CI); the builder confirms the order in the Playwright version pinned. Check AC31 by counting `taskboard-e2e-*` in the temp dir before and after a run.

Fresh-reader answers (2026-11-25):
- Alerts: Next's route announcer also has role="alert", so the move alert is `<p role="alert" className="board-error">` inside `.board`, and tests scope it as `page.locator(".board").getByRole("alert")`. Text exactly `Could not move "<title>"` (no period).
- AC28: the Link goes inside the existing `<h1>` (heading "Task board" stays; smoke test unchanged). /signup counts as logged out like /login. `header h1 a` may be styled to look like the title (inherit color, no underline).
- AC29 errors: the board catches only to show the alert and rethrows Next redirect/not-found errors (`unstable_rethrow` from next/navigation) so an expired session still redirects to /login. Invalid taskId/status returns false. On a false result the board calls `router.refresh()`, so a task deleted elsewhere disappears from the board; the alert stays. "Back in its original column" means: not shown in the target column; after the refresh a deleted card is gone. Test: after the failed move the card is not in the target column and the alert shows.
- AC29 timing: one alert at a time, cleared when the next move succeeds (a new failure replaces the text). tamperedMove tests need no change.
- AC30: an array value takes the first entry. `for` is valid when it is all/mine/unassigned or the id of a current member; anything else shows "all" and is dropped from the URL on the next replace (not rewritten on load). `q` is written as typed (untrimmed) and dropped when it trims to empty. Tests compare `new URL(page.url()).searchParams.get(...)`, not raw strings. The board does not need to react to back/forward (replaceState adds no entries).
- AC30 history: baseline `history.length` right after `goto`; checked again after typing and after choosing a filter.
- AC31: teardown deletes only the file the config generated (config sets a flag, e.g. an env var `E2E_DB_GENERATED=1`, when it fills the default), plus its -wal/-shm. If the server could recreate files after unlink, kill order must be handled; builder checks in 1.65 by running and counting. Interrupted runs: best effort only. Proof: count files matching this run's pid-based name after the run (0), not a global before/after count; red first without the teardown (1+).

## Tickets
Slice 6 done 2026-11-25: T19-T22 merged on nstack/board-feedback, slice verify + review passed at 8d017f5.
- [x] T19 Header title links to /projects when logged in (AC28). Proof: new e2e/nav.spec.ts, red first; full chain. Needs: none
- [x] T20 Failed move shows an alert and the card stays put (AC29). Proof: e2e in e2e/move.spec.ts (second page deletes the task, first page drags and keyboard-moves it), red first; full chain. Needs: none
- [x] T21 Search and assignee filter live in the URL (AC30). Proof: e2e in e2e/search.spec.ts and e2e/assignee-filter.spec.ts (type, check URL, reload, check board and inputs; history length unchanged; `for=bogus` shows all), red first; full chain. Needs: T20 (same file, board.tsx)
- [x] T22 e2e run removes its temp SQLite files (AC31). Proof: after `npm run test:e2e`, no file named for that run (taskboard-e2e-<pid>-*) remains in the temp dir (red first: 1+ without the teardown); full chain. Needs: none

# Plan: slice 7 "export" (from improve, 2026-11-25, bar 7)
Branch: nstack/export

## Spec
Evidence: backlog.md 7 (v3 r1 c3), research.md candidate 8 (4 sources: planka #670, kanboard #4795, TRELLO-1064, ...): users want a project's tasks out of the app for backup or a spreadsheet.

What changes for the user: on a board, "Export CSV" and "Export JSON" links download every task in the project.

Design: one GET route handler `app/projects/[id]/export/route.ts` taking `?format=csv|json`, reusing `getCurrentUser` and `listTasks` (which already returns [] for non-members) plus `getProject` for the 404. Alternative considered: a server action returning a string the client turns into a Blob: rejected, more client code and no plain URL to test with a request.

Acceptance criteria (Playwright e2e unless stated):
32. The board shows links "Export CSV" and "Export JSON" (`download` attribute). Clicking "Export CSV" downloads `project-<id>-tasks.csv`: UTF-8 with a BOM, rows end in CRLF, header `id,title,description,status,assignee,due_date`, then one row per task in id order. `status` is the column name (To do / In progress / Done); no assignee or due date is an empty cell; a value containing a comma, double quote, CR or LF is wrapped in double quotes with inner quotes doubled (RFC 4180).
33. In the CSV, a value that starts with `=`, `+`, `-`, `@`, tab or CR is prefixed with a single quote `'` (spreadsheet formula injection).
34. Clicking "Export JSON" downloads `project-<id>-tasks.json`, which parses to `{"project":{"id":<n>,"name":"..."},"tasks":[{"id","title","description","status","assignee","dueDate"}]}` in id order; `status` is the stored key (todo / in_progress / done); `assignee` is the email or null; `dueDate` is `YYYY-MM-DD` or null.
35. (Request checks via Playwright `request`) Logged out: 307 with Location ending in `/login`. Logged in but not a member, or an unknown project id: 404 and the body contains none of the project's task titles. `format` missing or other than csv/json: 400. Both formats send `Cache-Control: no-store` and `Content-Disposition: attachment; filename="project-<id>-tasks.<ext>"`; Content-Type `text/csv; charset=utf-8` / `application/json; charset=utf-8`.

Out of scope: comments, members, importing, exporting only the filtered tasks, other formats.

Decision: export ignores the board's search and filter (backup is the main use; a filtered export can come later).
Decision: CSV gets a BOM so Excel reads non-ASCII titles correctly; JSON does not.
Decision: filename uses the project id, not the name, so no escaping of user text in a header.
Decision: logged out redirects to /login like every page (requireUser), rather than 401.

## Tickets
- [x] T23 CSV export route and board links (AC32, AC33, AC35 for csv). Proof: new e2e/export.spec.ts (download event, read file; tasks with comma/quote/newline/leading `=`/non-ASCII; request checks), red first; full chain. Needs: none
- [x] T24 JSON export (AC34, AC35 for json). Proof: e2e in e2e/export.spec.ts, red first; full chain. Needs: T23 (same route file)

Fresh-reader answers (2026-11-25):
- Links: plain `<a href download>` (not next/link: no prefetch or client navigation of a route handler), in page.tsx next to the project `<h2>`, inside `<p className="export-links">`. Href `/projects/<id>/export?format=csv|json`; `download` with no value (filename from Content-Disposition).
- Order of checks: auth first (307), then id/project (404), then format (400). So logged out + bad format = 307; unknown project + bad format = 404. A non-integer id is 404, same `Number.isInteger` check as page.tsx.
- Logged out: `NextResponse.redirect(new URL("/login", request.url), 307)`; tests check status 307 and `new URL(location).pathname === "/login"`. 404 and 400 are plain-text responses (`Not found`, `Unknown format`), not the HTML 404 page.
- BOM: the string starts with U+FEFF, encoded as UTF-8; the test checks the first three bytes of the file are EF BB BF and decodes the rest.
- CRLF after every row including the last (file ends with CRLF). Values are written exactly as stored (no newline normalizing). The test parses the CSV with a small RFC 4180 parser in the spec and compares each description cell to the stored value read from the DB at `process.env.E2E_DATABASE_PATH` (as earlier specs do).
- Formula guard: applied to every cell before RFC 4180 quoting (`'=x,y` is then quoted); a no-op for id, status and due_date. In e2e: comma/quote/newline cases in the description, `=`/`+`/`-`/`@` cases in titles. Leading tab/CR cannot survive the server's trim, so those two prefixes are covered by reading the code and the same function; not separately in e2e.
- No unit runner: proof is e2e through the route only. CSV code may live in `lib/export.ts` if the route reads better that way (builder's call).
- Requests: logged-in checks use `page.request` (shares the context cookie); logged-out uses a fresh `request` context with `maxRedirects: 0`. Add a helper for the project id to e2e/helpers.ts only if two specs need it.
- JSON: compact `JSON.stringify({ project, tasks })`, key order as in AC34; `project.name` from `getProject` (current name). Test compares parsed values, not raw text.
