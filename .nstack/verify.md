# Verify

Run from the repo root. Needs Node 24, `npm ci`, and Chromium for Playwright 1.65.0 (`npx playwright install chromium`; CI uses `--with-deps`). This machine has 2 CPUs: two full e2e suites at once push AC22 (seed, ~17s idle) past the 30s test limit (seen twice on 2026-11-25 with parallel builders; CI runs one suite). Run at most one full e2e suite at a time here.

| Check | Speed | Command | Last result |
|---|---|---|---|
| lint | fast | `npm run lint` (eslint, then `scripts/check-css-tokens.mjs`: no colour literals in app/globals.css outside `:root`) | pass, 0 warnings (2026-11-27, a03be3e) |
| typecheck | fast | `npm run typecheck` | pass (2026-11-27, a03be3e) |
| build | full | `npm run build` | pass, 0 warnings (2026-11-27, a03be3e) |
| e2e | full | `npm run check:e2e-temp` | pass, 143 tests, 0 skipped, 0 temp files left (2026-11-27, a03be3e) |
| drive | full | `npm run drive -- check` | pass, 5 steps, 16 screenshots (2026-11-27, a03be3e) |
| ci | full | `.github/workflows/ci.yml` on push and PR: npm ci, playwright install, lint, typecheck, build, test:e2e, drive check | green on main e9490a1 (run 45945258200, 143 passed, drive check 16 PNGs) |

- `check:e2e-temp [-- <playwright args>]` runs `playwright test` (needs `npm run build` first; it starts `next start -p ${E2E_PORT:-3100}` with `DATABASE_PATH` set to a fresh temp SQLite file, also readable by tests as `E2E_DATABASE_PATH`), then exits 1 if any `taskboard-e2e-<pid>-*` file is left in the OS temp dir; else the suite's exit code. `npm run test:e2e` is the suite alone.
- `E2E_SECURE_COOKIES=1` drops the e2e server's `INSECURE_COOKIES=1` (production cookie flags).
- Also check after a full run: no `data/` dir was created (tests never touch the dev database).

## Drive
How an agent runs and uses the app on its own, without touching anyone's data.
- **Tool:** `npm run drive -- <command>`; `npm run drive -- --help` lists the commands, `<command> --help` its options. Source: `scripts/drive.mts` (seed data in `scripts/seed-app.mts`).
- **Start:** `npm run drive -- start --json` builds if `.next/BUILD_ID` is missing (`--build` forces; a stale build is not detected), starts `next start` on 127.0.0.1 on a free port (`--port N`) with a temp database, waits for /login, prints `{"url","db","pid","port"}`. Instance state: `<os tmp>/taskboard-drive/<port>.json`; server log: `<dir>/server.log`.
- **Seed:** `npm run drive -- seed [--port N | --url U] [--json]`, through the UI: demo user, a member with a long email, "Website relaunch" (overdue task, 200-char title, assigned In progress task, Done task with a comment, labels, checklist) and empty "Team offsite". Idempotent. ~15s.
- **Sign in:** demo@example.com / correct-horse-1 (after seed), or sign up at /signup with any email and an 8+ char password. In tests: `e2e/helpers.ts` `signUp()` / `newUser()`.
- **Screens:** /login, /signup, /projects, /projects/<id> (board), /projects/<id>/tasks/<taskId> (task page), /projects/999999 (404 page, logged in), plus the board of the empty "Team offsite" (board-empty) and the busy board with `?q=zzzz` (board-nomatch), and /projects/<id>/calendar of "Website relaunch" (calendar).
- **Evidence:** `npm run drive -- screens <dir>` seeds, then writes those 9 screens at 1280 and 390 px (18 full-page PNGs); exits 1 listing console or page errors (favicon.ico 404 and the 404 screen's own load ignored).
- **Health:** `npm run drive -- check` starts, seeds, takes screens, checks the non-empty PNGs, stops and cleans up even after a failure; exit 0 means this section is true.
- **Clean up:** `npm run drive -- stop [--port N | --all] [--dry-run]` kills the instance's process group by its recorded pid and deletes its temp dir and state file; stale instances are pruned (not under `--dry-run`). State files are validated on read: one naming a dir that is not `<os tmp>/taskboard-drive-*`, a bad pid or bad JSON is reported and only the state file is removed. The state dir is kept at mode 0700. Ctrl-C during `check` leaves its server; run `stop`.
- **Isolate:** each instance has its own port and temp database; e2e uses `E2E_PORT` and its own temp DB.

## Features
| Feature | Reach | Proof |
|---|---|---|
| Logged-out visitors go to /login | / | `e2e/auth.spec.ts` "AC1: visiting / while logged out redirects to /login" |
| Sign up | /signup | `e2e/auth.spec.ts` "AC2: a new user signs up, lands on /projects and sees their email" |
| Log in and log out | /login, header Log out | `e2e/auth.spec.ts` "AC3: log out ends the session on the server, so a copied cookie stops working" |
| Passwords stored as salted hashes | DB `users` table | `e2e/auth.spec.ts` "AC4: the stored password is a salted hash, not the plain text" |
| Sessions expire after 30 days | session cookie | `e2e/session-expiry.spec.ts` "AC19: a 31-day-old session is rejected and its row deleted" |
| Forms keep typed values after an error | /login, /signup, task forms | `e2e/keep-values.spec.ts` "AC20: the new-task form keeps title, description, assignee and due date after an error" |
| Create a project | /projects, New project form | `e2e/projects.spec.ts` "AC5: a user creates a project and it appears in their list" |
| Empty project list says what to do | /projects with no projects | `e2e/projects.spec.ts` "a user with no projects is told to create their first one with the New project form" |
| Rename a project | /projects, Rename | `e2e/projects.spec.ts` "AC5: a user renames a project and the list shows the new name" |
| Delete a project (asks first) | /projects, Delete | `e2e/projects.spec.ts` "AC5, AC14: a user confirms the delete and the project leaves the list" |
| Only members see a project | /projects/<id> | `e2e/projects.spec.ts` "AC6: user B does not see user A's project and gets a 404 on its URL" |
| Invite an existing user by email | /projects/<id>, Invite form | `e2e/invite.spec.ts` "AC7: A invites B by email and B then sees and can open the project" |
| Create a task | /projects/<id>, New task form | `e2e/tasks.spec.ts` "AC8: a member creates a task with all fields and it appears in To do" |
| New-task form confirms what it added | /projects/<id>, New task form | `e2e/tasks.spec.ts` "AC46: after adding a task the new-task form says what it added; the next submit replaces or clears it" |
| Edit a task | /projects/<id>/tasks/<taskId>, edit form | `e2e/edit-task.spec.ts` "AC17: a member edits a task's fields; the changes persist and show on the board" |
| Duplicate a task | /projects/<id>/tasks/<taskId>, Duplicate task | `e2e/duplicate.spec.ts` "AC5: duplicating copies the fields, labels and an unticked checklist into To do, without comments" |
| Delete a task (asks first) | /projects/<id>/tasks/<taskId>, Delete | `e2e/edit-task.spec.ts` "AC17: deleting a task asks first; dismissing keeps it, accepting removes it and its URL 404s" |
| Move a task by drag and drop | /projects/<id>, drag a card | `e2e/move.spec.ts` "AC9: dragging a card to In progress, then Done, moves it and persists" |
| Move a task with arrow keys | /projects/<id>, focused card + ArrowLeft/ArrowRight | `e2e/move.spec.ts` "AC10: ArrowRight moves a focused card one column right, ArrowLeft one left; persists" |
| Failed moves show an alert | /projects/<id> | `e2e/move.spec.ts` "AC29: dragging a card deleted in another tab shows an alert and leaves it out of the target column" |
| Overdue marker | /projects/<id>, card | `e2e/overdue.spec.ts` "AC16: a past-due task not in Done is marked overdue; future and done ones are not" |
| Comments | /projects/<id>/tasks/<taskId>, Comment form | `e2e/comments.spec.ts` "AC11: members add comments that show the author's email and persist" |
| Comment times show date and zone | /projects/<id>/tasks/<taskId>, Comments | `e2e/comments.spec.ts` "AC7: a comment shows its author, then a UTC <time> with an ISO dateTime, then its body" |
| Calendar view by due date | /projects/<id>/calendar?month=YYYY-MM, board Calendar link | `e2e/calendar.spec.ts` "AC6: the board's Calendar link opens the current month; tasks sit under their due days as links" |
| Search tasks | /projects/<id>, Search box | `e2e/search.spec.ts` "AC12: search filters the board by title or description, case-insensitively; clearing shows all" |
| Filter by assignee (incl. My tasks, Unassigned) | /projects/<id>, Assignee select | `e2e/assignee-filter.spec.ts` "AC21: the assignee filter shows My tasks, a member's tasks or Unassigned, and combines with search" |
| Filters kept in the URL | /projects/<id>?q=&for=&label= | `e2e/assignee-filter.spec.ts` "AC30: the assignee filter lives in the URL with the search, without adding history; a reload keeps both" |
| Create labels | /projects/<id>, New label form | `e2e/labels.spec.ts` "AC36: creating labels lists them on the board in name order, any case" |
| Assign labels to a task | /projects/<id>/tasks/<taskId>, Labels checkboxes | `e2e/labels.spec.ts` "AC37: a task's labels are ticked on its page, saved, and shown on its card" |
| Filter by label | /projects/<id>, Label select | `e2e/labels.spec.ts` "AC38: the label filter shows only tasks with that label and combines with search and assignee" |
| Checklist items | /projects/<id>/tasks/<taskId>, Checklist | `e2e/checklist.spec.ts` "AC39: items are added to the end, unchecked, and kept after reload" |
| Checklist progress on the card | /projects/<id>, card | `e2e/checklist.spec.ts` "AC40: the card shows checklist progress, and none without items" |
| Checklist failures show an alert | /projects/<id>/tasks/<taskId>, Checklist | `e2e/checklist.spec.ts` "AC47: ticking an item deleted in another tab shows an alert and drops the row; the next tick clears it" |
| Column card counts | /projects/<id>, column headings | `e2e/move.spec.ts` "AC6: each column shows the count of its visible cards beside its heading; search and moves change the counts" |
| Search and filters share one height | /projects/<id> at 1280 | `e2e/layout.spec.ts` "AC5: at 1280 the search box and both filter selects are the same height" |
| Empty board and no-match messages | /projects/<id> | `e2e/empty-states.spec.ts` "AC49: when search or filters hide every task the board says so above the columns, until a task matches" |
| Export CSV | /projects/<id>, Export CSV | `e2e/export.spec.ts` "AC32/AC33: Export CSV downloads every task, RFC 4180 quoted, formula-guarded, with a BOM" |
| Export JSON | /projects/<id>, Export JSON | `e2e/export.spec.ts` "AC34: Export JSON downloads the project and every task with stored status keys" |
| App-styled 404 page with a way back | /nope, /projects/999999 | `e2e/nav.spec.ts` "logged in, /nope and a missing project are 404s whose link leads to /projects" |
| Every screen passes axe and phone checks (44 px targets, no sideways scroll) | all screens at 1280 and 390 | `e2e/a11y.spec.ts` "AC2, AC3 screens pass the axe scan and phone layout checks" |
| Keyboard focus is always visible | Tab on any screen | `e2e/a11y.spec.ts` "AC4: on /login, Tab reaches the email, the submit button and Sign up in turn, each with a visible focus" |
| Header title links to Projects | every page, header "Task board" | `e2e/nav.spec.ts` "on the board, clicking the title lands on /projects" |
| Board layout: columns above the fold, no horizontal scroll at 390px | /projects/<id> at 1280 and 390 | `e2e/layout.spec.ts` "AC42: at 1280x800 the columns start above the fold and the three filters share one row" |
| Form labels above fields | all forms | `e2e/forms-layout.spec.ts` "AC24: project, task, invite and comment form labels sit above their fields" |
| Demo data seed | `npm run drive -- seed` | `e2e/seed.spec.ts` "AC22, AC41: seed fills the app with a demo user, a busy board and an empty project; re-running adds nothing" |
| Drive tool never deletes or kills what a bad state file names | `npm run drive -- stop` | `e2e/drive.spec.ts` "a state file naming a dir that is not a drive temp dir is reported and the dir is never deleted" |
