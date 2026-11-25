# Log

## 2026-11-25 Orient
- Did: empty repo (README, .gitignore). Wrote goal.md, plan.md; no verify commands exist yet, T1 creates them.
- Decisions:
  - merge policy auto (default; user gave none).
  - better-sqlite3 for SQLite (prebuilt binaries, common with Next); node:sqlite is an easy swap later.
  - scrypt from node:crypto for hashing: no extra dependency.
  - Native HTML5 DnD + ArrowLeft/ArrowRight on a focused card for keyboard moves; avoids a DnD library.
  - Any project member may rename/delete/invite (no roles); invite only existing users.
  - Assignee limited to project members; due date is a plain date.

## 2026-11-25 T1 push blocked
- Did: T1 verified locally (lint, typecheck, build, 2/2 e2e). Push rejected: gh OAuth token lacks `workflow` scope, no SSH key. Moved .github/workflows/ci.yml to local branch `nstack/ci`; app work continues on `nstack/task-board` (pushed, no workflow file). Set Playwright retries to 0 (flakes must surface).
- Decisions: build all tickets on one slice branch `nstack/task-board`, verified locally; do not merge to main without CI (policy auto needs green CI).

## 2026-11-25 T2 auth
- Did: signup/login/logout, scrypt hash + per-user salt, session token cookie, requireUser() guard; e2e/auth.spec.ts covers AC1-4.
- Decisions:
  - Guard is per-page `requireUser()` in Server Components, not proxy/middleware: DB lookup stays in Node runtime, fewer moving parts.
  - Session cookie is httpOnly + SameSite=Lax, no Secure flag: spec names only those two, app runs on local http.
  - Server-side min-8 check only (no HTML minLength) so the error message is testable; dup email message "An account with that email already exists".
  - Root layout header shows app name, email and Log out; it keeps the smoke test's "Task board" heading on /login.
  - Unknown email and wrong password give the same "Invalid email or password".
  - Error locators scoped to `form` because Next's route announcer also has role=alert.

## 2026-11-25 T2 review + verify (controller)
- Did: two reviewers (general, security) both passed with nits only. Added e2e test that a copied session cookie is rejected after logout (both flagged it).
- Evidence:
| Claim | Command | Result |
|---|---|---|
| all checks | rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e | exit 0, 12 passed |
| logout test bites | removed DELETE FROM sessions in endSession, build, playwright -g "copied cookie" | 1 failed; restored, green |
| tests isolated | ls data | absent |
- Lesson: two verify chains in parallel collide on `.next` and port 3100 (a reviewer hit "Could not find a production build"). Run reviewers one at a time.
- Not verified: CI (parked, see Needs human).

## 2026-11-25 T3+T4 review + verify (controller)
- Did: one builder did T3 and T4 (same files). Reviewer (correctness + security) passed; its nit "no test for non-member writes" treated as important (access control) and fixed with a tamper e2e test.
- Evidence:
| Claim | Command | Result |
|---|---|---|
| all checks | rm -rf .next; lint && typecheck && build && test:e2e | exit 0, 22 passed |
| tamper test bites | MEMBER_CHECK -> always true, build, playwright -g tampering | 1 failed; restored, green |
| tests isolated | ls data | absent |
- Not verified: CI (parked).

## 2026-11-25 T5 tasks
- Did: lib/tasks.ts (listTasks, createTask; member-scoped, assignee must be a member), createTaskAction in app/projects/actions.ts, TaskForm client component, server-rendered Board with three columns (regions "To do", "In progress", "Done"). e2e/tasks.spec.ts covers AC8 plus tamper checks.
- Decisions:
  - Task form and board live on /projects/[id] above Members: one page per project, fewest routes.
  - Title has HTML `required` and a server check ("Title is required"); bad assignee -> "Assignee must be a project member"; due date must be a real YYYY-MM-DD else "Due date must be a date".
  - Card shows title, assignee email or "Unassigned", "Due <date>" or "No due date"; date shown as stored (no locale formatting).
  - Board is a Server Component for now; T6 will need a client card (draggable, key handlers), so move STATUSES/COLUMN_NAMES out of server-only lib/tasks.ts then.
- Lesson: tampering with a date input by changing its `type` does not stick (React resets `type` on re-render); prepend a hidden field instead.

## 2026-11-25 T6 move tasks
- Did: lib/statuses.ts (client-safe STATUSES, COLUMN_NAMES, isStatus, neighborStatus); moveTask in lib/tasks.ts (member + task-in-project); moveTaskAction; Board is now a client component (native DnD, ArrowLeft/ArrowRight on a focused card, useOptimistic). e2e/move.spec.ts covers AC9-10 plus two tamper tests; column/cards locators moved to e2e/helpers.ts.
- Decisions:
  - Optimistic move (useOptimistic) then server action + revalidatePath: instant UI, server stays the source of truth.
  - Keyboard-moved card gets focus back in its new column, so repeated presses keep working.
  - ArrowLeft in "To do" / ArrowRight in "Done" do nothing.
  - Action takes taskId/status as `unknown` and validates (integer, known status): they arrive from the client.
- Lesson: `.bind(null, projectId)` args travel in plain text in the action request body (`[projectId, taskId, status]`); a string replace on the body hit projectId first, so the first tamper test passed with guards removed. Parse the JSON args and wait for the response (route.fetch + fulfill).

## 2026-11-25 T5+T6 review + verify (controller)
- Did: reviewed T5+T6 together (decision: fewer review rounds for the sequential board tickets). Reviewer passed; fixed both nits (no-op arrow key stole focus later; tamper tests for task-create and invite bound projectId).
- Evidence:
| Claim | Command | Result |
|---|---|---|
| all checks at d89f021 | rm -rf .next; lint && typecheck && build && test:e2e | exit 0, 34 passed |
| focus test bites | builder: ran before fix | red, then green |
| create/invite tamper tests bite | builder: removed each getProject guard, rebuilt | red each; restored |
- Correction: `.bind` args to server actions are NOT encrypted by Next (my T3 note was wrong); every action re-checks membership server-side.
- Not verified: CI (parked).

## 2026-11-25 T7+T8 review + verify, PR (controller)
- Did: reviewer passed T7+T8, no findings. Controller ran the bite checks the reviewer could not: search on title only + removed addComment getTask guard -> 3 tests red; restored. Rebased `nstack/ci` onto `nstack/task-board` (branch tip + workflow commit). Opened PR https://github.com/tokyovo/nstack-test-app/pull/1 (no CI on it).
- Evidence: `rm -rf .next; lint && typecheck && build && test:e2e` at 6f3ddc8 -> 41 passed, 0 skipped; `CI=true npm run test:e2e` -> 41 passed.
- Stop: every remaining item (CI green, merge to main) is parked behind the token scope hard stop. Not merged: policy auto needs green CI.

## Needs human
- 2026-11-25 Run `gh auth refresh -h github.com -s workflow` (adds `workflow` scope to the gh token; credential change is a hard stop for nstack). Then `git push -u origin nstack/ci` (it is `nstack/task-board` + the CI workflow commit), open a PR from `nstack/ci` (or close PR #1 in favor of it), wait for CI, and merge. Rerunning `/nstack:go` after the scope is added lets nstack do the push/CI/merge itself.
