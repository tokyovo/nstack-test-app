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

## 2026-11-25 T9 confirm before project delete (builder)
- Did: `ConfirmButton` client component (native `window.confirm`, preventDefault on cancel) used for the project Delete button. AC14 tests in e2e/projects.spec.ts; the existing delete and tamper tests now accept the dialog.
- Decision: native confirm() over a custom modal: no deps, accessible by default, smallest diff; easy to swap later.
- Evidence: full chain exit 0, 42 passed.

## 2026-11-25 T10 base stylesheet + title cap (builder)
- Did: `app/globals.css` (imported in layout): CSS grid board, 3 columns (minmax(0,1fr)), 1 column under 640px; `overflow-wrap: anywhere` on body; card/column classes on the board. Title cap 200 in `lib/limits.ts` (shared by server action and the form's maxLength; lib/tasks.ts is server-only). AC15 tests in e2e/layout.spec.ts.
- Decision: the 400-char title is inserted straight into the DB in the test (models a task saved before the cap); the cap makes it impossible via the UI. The long description goes through the UI.
- Decision: columns stack to one column under 640px rather than scrolling sideways; spec only requires no horizontal scroll.
- Decision: the 390px no-scroll test passed on the unstyled app (stacked lists); kept as a guard and shown red against a fixed-width-grid mutant (scrollWidth 624).

## 2026-11-25 T11 overdue flag on cards (builder)
- Did: `lib/due-dates.ts` (client-safe `localToday`, `isOverdue`); the project page passes the server's local date to `Board` as `today`; overdue cards get class `overdue` and an "Overdue" line, styled in globals.css. AC16 test in e2e/overdue.spec.ts.
- Decision: server computes `today` and the client compares, so an optimistic move to Done clears the flag at once without a reload; the date still comes from the server's clock as the spec says.
- Decision: test uses fixed far dates (2000-01-15, 2999-12-31) so it never depends on the run date or time zone; the due-today boundary (not overdue) is not e2e-tested, as it would flake at midnight.
- Evidence: full chain exit 0, 47 passed; bite check (Done exclusion removed) -> red; restored.

## 2026-11-25 T12 edit and delete tasks (builder)
- Did: task page gets an "Edit task" section reusing `TaskForm` (now takes optional `task` defaults and `submitLabel`) bound to `updateTaskAction`, plus a "Delete task" `ConfirmButton` form bound to `deleteTaskAction` (redirects to the board). Create and edit share one `readTask` validator in actions.ts (title required, <= MAX_TITLE_LENGTH, integer assignee, valid date); `updateTask`/`deleteTask` in lib/tasks.ts check membership, task-in-project, and assignee membership. `Task` now carries `assigneeId`. AC17 tests in e2e/edit-task.spec.ts.
- Decision: reused TaskForm for editing instead of a second form: same fields and limits, one place to change.
- Decision: delete redirects to the project board on success; a refused delete does nothing (same as moveTaskAction).
- Decision: extended `tamperBoundIds` to also rewrite a bare JSON body (`[projectId,taskId]`), which is what Next sends for a bound action with no form fields (the delete form).
- Decision: e2e/layout.spec.ts long-description locator scoped to the `dl`; the edit textarea now also holds the text (strict-mode clash). Assertion unchanged.
- Evidence: full chain exit 0 (see verify.md T12). Bite checks: getProject guard removed from updateTask+deleteTask -> 2 non-member tamper tests red; `project_id` condition removed from both -> 2 other-task tamper tests red; restored.

## 2026-11-25 Continue: slice 2 review (controller)
- Orient: on nstack/usable-board at d7a00a0, T9-T12 marked done, lint + typecheck pass. No logged review pass for the slice (only the T11 flaky-test fix), so reviewing T9-T12 now before ship. needs-human: only the optional `origin/nstack/ci` cleanup is open.
- Review: one reviewer (correctness + security, T9-T12) -> pass, no important findings. Its own run: `rm -rf .next; lint && typecheck && build && test:e2e` exit 0, 55 passed, no `data/`. One nit (silent refused delete) logged in backlog.md. Its mutation check was blocked by the permission classifier; tamper-test bite rests on the builder's recorded bite checks (verify.md T12).
- Ship: PR https://github.com/tokyovo/nstack-test-app/pull/2. CI red: AC15 390px tests (402/405 wide) on the runner only. Debug: CI trace screenshot showed the Assignee select overflowing (width = longest member email; label shrink-to-fit made its max-width:100% ineffective; CI fonts wider). Added a font-independent test (long-email member), red locally (750px), fixed with `form label { max-width: 100% }`. Full chain 56 passed.
- Lesson: layout tests that depend on test data widths pass or fail by font; make the data force the worst case (long email, long title) instead of relying on the runner's fonts.

## 2026-11-25 Slice 2 merged; improve: nothing above the bar (controller)
- Did: PR #2 CI green after the select-width fix (runs 45552206435, 45552215407; 56 passed). No re-review after the CI fix (one CSS rule + one test, proven red then green). Merged under `merge: auto` as 5f950cf. Local main reset to origin/main (its only extra commit, 780fe09, was inside the squash). CI on main green: run 45552549785, 56 passed. Fast checks on main: lint and typecheck pass.
- Improve: no broken checks; research.md is from today; UX pass after slice 2 (1280px and 390px screenshots of the board, the task page and signup; no console errors): the UI is plain but usable. Rescored the backlog. Best is 8 (forms lose typed values; session expiry; filter by assignee), below the bar of 9. Stopping.
- Decision: the post-merge state goes through a small PR from nstack/state-slice2, not a local commit on main.

## 2026-11-25 Continue: orient; still nothing above the bar (controller)
- Orient: main == origin/main at 67f5043 (state-only change since 5f950cf: `git diff --stat` touches only .nstack/). lint + typecheck pass. CI on main at 67f5043 green: run 45553194725, 56 passed.
- needs-human: only open item is the optional `origin/nstack/ci` cleanup; `git ls-remote` shows it still exists (10384bb). Left for the user.
- Improve: no code change since the last improve pass (research + UX pass today), so they were not redone. New evidence: the CI log warns that Node 20 is deprecated for actions/checkout@v4 and setup-node@v4; rescored that item 6 -> 8, still below the bar of 9. Stopping: goal met, verify green, nothing above the bar.
- Decision: this log entry is a local commit on main, not pushed; it rides along with the next real PR instead of opening a state-only PR each run.

## 2026-11-25 Continue: ship stranded state commit; nothing above the bar (controller)
- Orient: local main was 1 ahead of origin/main (ad92a68, state-only). Moved it to branch nstack/state-continue-3 and reset main to origin/main (67f5043). lint + typecheck pass. CI on main at 67f5043 green (run 45553194725).
- Correction: the previous run's decision to leave a local-only commit on main breaks the state rule (never leave a default-branch commit off the remote). State changes now ship by PR even when state-only.
- needs-human: optional `origin/nstack/ci` cleanup still open; `git ls-remote` shows 10384bb still there. Left for the user.
- Improve: no code change since the last improve pass (research + UX pass today); backlog best is still 8, below the bar of 9. Stopping: goal met, verify green, nothing above the bar.

## 2026-11-25 Continue: policy fix; slice 3 planned (controller)
- Orient: main == origin/main at 6d15479; lint + typecheck pass; CI on main green (run 45553944083). needs-human: optional `origin/nstack/ci` cleanup re-checked (`git ls-remote` still shows 10384bb); left for the user.
- Correction: goal.md policy lacked `evolve` and `bar`; added defaults `evolve: yes`, `bar: 8` and removed the "Bar: 9" line from backlog.md (rules live only in goal.md/skills). Earlier stops used bar 9 from backlog.md, which was wrong.
- Improve: research.md and the UX pass are from today, no code change since; four items score 8 and meet the bar: CI action majors, session expiry, forms keep values, assignee filter. Planned as slice 3 (T13-T16) on branch nstack/slice3.
- Decision: session lifetime 30 days (common default), fixed from creation (no sliding renewal): simplest, easy to change.
- Decision: `secure` cookie in production, opt-out via `INSECURE_COOKIES=1` for the http e2e/CI server, so tests cover the production build.
- Decision: assignee filter is client-side like search (board already has all tasks), not in the URL (search isn't either; that's a separate backlog item).

## 2026-11-25 T14 session expiry (builder)
- Did: getCurrentUser rejects sessions with created_at <= now - 30 days and deletes the row; cookie gets maxAge 30d and `secure` when NODE_ENV=production unless INSECURE_COOKIES=1; Playwright webServer sets INSECURE_COOKIES=1. e2e/session-expiry.spec.ts (AC19: 31 days rejected + row gone, 29 days works, cookie ~30d/httpOnly/Lax/secure matches mode). Full chain 59 passed.
- Decision: the expired cookie is not cleared on rejection (server components cannot set cookies); with its row deleted it is inert and the browser drops it at maxAge.
- Decision: added `E2E_PORT` to playwright.config.ts because a parallel worktree's run held port 3100; default unchanged, so CI is unaffected.
- Decision: added `E2E_SECURE_COOKIES=1` so `secure: true` in the production build is proven by e2e (Chromium accepts Secure cookies on http://localhost); the default run asserts secure=false (the opt-out).
## 2026-11-25 T15 forms keep typed values after an error (builder)
- Did: signup/login actions return the typed email with the error (`CredentialsState`); `CredentialsForm` uses it as the email default; the password is never returned. Task create/update actions return the raw typed fields (`TaskFormState.values`) on every error; `TaskForm` defaults to them, else to the task (edit) or empty (new). AC20 tests in e2e/keep-values.spec.ts.
- Decision: values come back from the server in action state (uncontrolled inputs, defaultValue) rather than controlled inputs: smallest diff, same pattern as the existing error state.
- Decision: the Assignee `<select>` is keyed on its default; without the key React's post-action form reset kept "Unassigned" (test red), text inputs did not need it.
- Decision: the server-only error used for task forms is a spaces-only title (passes the browser `required` check); kept title is the raw typed value, not trimmed.
- Evidence: tests red first (fields empty / original values), then green; full chain exit 0, 61 passed, no `data/`.

## 2026-11-25 T16 assignee filter on the board (builder)
- Did: `Board` gets `members` and the viewer's `userId`; a "Show tasks for" select (All, My tasks, Unassigned, each member's email in member order) filters cards client-side, ANDed with the search box. Page passes the already-loaded members. AC21 tests in e2e/assignee-filter.spec.ts.
- Decision: label is "Show tasks for", not "...assignee...": existing tests use page-level `getByLabel("Assignee")`, which would match two controls.
- Decision: filter is client-side state like search (not a URL param): smallest diff, same pattern; not persisted across reloads.
- Evidence: tests red first (no filter control); mutant with search OR filter instead of AND made both tests red; full chain exit 0, 66 passed, no `data/`.

## 2026-11-25 Slice 3 verify + review (controller)
- Verify: full chain at 299a094: exit 0, 66 passed, no `data/`.
- Review: reviewer -> pass, no important findings. Its runs: e2e 66 passed; `E2E_SECURE_COOKIES=1` session/auth specs 13 passed; bite checks (expired-row DELETE removed; Unassigned matching viewer) each turned a test red. Nits: checkout/setup-node at v6 not latest v7 (meets AC18); AC18 needs CI.
- Lesson: ESLint linted `.claude/worktrees/` (agent worktrees) -> errors. Encoded: `.claude/**` in eslint globalIgnores, `.claude/worktrees/` in .gitignore.

## 2026-11-25 Slice 3 shipped; improve: nothing at the bar (controller)
- Ship: PR https://github.com/tokyovo/nstack-test-app/pull/5, CI green (runs 45558869560, 45558876172; 66 passed; zero check-run annotations, so AC18's Node 20 warning is gone). Merged under `merge: auto` as 6d9be09. CI on main green: run 45559280150, 66 passed.
- Backlog: removed shipped items (T9-T16). Top three left: 7 (no nav back to Projects), 7 (failed move reverts silently), 7 (search not in URL). All below bar 8. research.md is from today; no new UX pass, as slice 3 only added one board select, covered by e2e.
- needs-human: `origin/nstack/ci` still exists (10384bb); optional, left for the user.
- Stopping: goal met, verify green on main, nothing at or above the bar.

## 2026-11-25 Continue: Drive section; slice 4 planned (controller)
- Read: go/SKILL.md, go/references/state.md, improve/SKILL.md, plan/SKILL.md, build/SKILL.md.
- Orient: main == origin/main at d298d27; lint + typecheck pass; CI on main green (run 45560003645). needs-human: optional `origin/nstack/ci` cleanup re-checked (`git ls-remote` still shows 10384bb); left for the user.
- verify.md had no Drive section (go step 0 item 4). Ran start/sign-in/screenshot/cleanup once: build, `next start -p 3400` on a mktemp DB, `/` -> 307 /login, signup via playwright-cli landed on /projects, screenshot saved, console only the known favicon 404; stopped by port, temp dir removed. Wrote Drive with those values. No seed or screens command exists, so slice 4 (T17) adds them before any further improve pass.
- Decision: seed goes through the UI with Playwright's browser API (no direct DB writes): reuses the app's validation and the server-only db module stays server-only; no new deps.
