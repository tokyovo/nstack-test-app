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

## 2026-11-25 CI unparked, merge parked (controller)
- Did: re-tested the parked scope item: the token now has `workflow`. Fast-forwarded nstack/task-board to the CI commit (bd433c8, parent b0d423e) and pushed it, so PR #1 now has CI. No force-push needed.
- Evidence:
| Claim | Command | Result |
|---|---|---|
| all checks at bd433c8 | rm -rf .next; lint && typecheck && build && test:e2e | exit 0, 41 passed; no `data/` |
| CI green on PR #1 | gh pr checks 1 --watch | push + pull_request runs pass; CI log "41 passed" |
| main not moved | git merge-base --is-ancestor origin/main HEAD | true |
- Decision: put CI on PR #1's branch (ff) instead of opening a second PR from nstack/ci.
- Blocked: `gh pr merge 1 --squash --delete-branch` denied by the Claude Code permission classifier. Parked in needs-human.md. AC13 ("green on main") still needs the merge.

## 2026-11-25 Merged to main; goal met (controller)
- Did: re-tested the parked merge. CI green at PR head a03ab45; retried `gh pr merge 1 --squash --delete-branch`, allowed this time. Merged as e2ecb58; remote nstack/task-board deleted.
- Evidence:
| Claim | Command | Result |
|---|---|---|
| fast checks at a03ab45 | npm run lint; npm run typecheck | pass |
| CI green on PR head | gh pr checks 1 | 2/2 pass |
| main tree == verified PR head | git diff --stat a03ab45 e2ecb58 | empty |
| CI green on main (AC13) | gh run watch 45541011124 --exit-status | exit 0, "41 passed" |
| no known vulnerable deps | npm audit --omit=dev | 0 vulnerabilities |
- Improve: scored backlog.md; best is 8 (session expiry), below the bar of 9. Stopping: goal met, nothing above the bar.
- Decision: skipped the `research` step (outside demand). goal.md is a fixed v1 spec; new features past it should come from the user's direction, not from web research.
- Decision: left `origin/nstack/ci` in place (deleting a remote branch is the user's call; listed in needs-human.md).
- Not committed upstream: this state update is a local commit on main; not pushed, to keep main changing only through PRs.

## 2026-11-25 Continue: orient + improve rerun (controller)
- Orient: main ahead of origin/main by 1 (local state commit 780fe09), origin/main e2ecb58; lint + typecheck pass; CI on main green (run 45541011124). needs-human: only open item is optional `origin/nstack/ci` cleanup; branch still exists (git ls-remote), left for the user.
- Correction: the previous run skipped `research` with "goal is a fixed spec"; improve forbids that reason. Rerunning improve with research (step 4) and a UX pass (step 6).
