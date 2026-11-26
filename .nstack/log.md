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

## 2026-11-25 T17 seed and screens commands (builder)
- Did: scripts/seed-app.mts `seed(browser, baseURL)` fills the app through its UI (demo + long-email member, "Website relaunch" with overdue / 200-char / assigned / commented tasks across 3 columns, empty "Team offsite"); scripts/seed.mts (`npm run seed`) prints sign-in and board URL; scripts/screens.mts (`npm run screens -- <dir>`) seeds then saves 10 full-page PNGs, exit 1 on console/page errors except favicon.ico. e2e/seed.spec.ts (AC22). Full chain 67 passed; AC23 run on port 3417: 10 non-empty PNGs, exit 0.
- Decision: every seed step checks before acting (log in else sign up; project/member/task/comment only if missing; move right until in target column), so re-runs and interrupted runs converge (principle 7); the e2e test runs seed twice and checks nothing doubles.
- Decision: scripts are `.mts` (Node type stripping without the typeless-package.json warning; `"type": "module"` would change how Playwright loads e2e/*.ts). tsconfig: `allowImportingTsExtensions`, include `**/*.mts`.
- Decision: the overdue task is due 7 days before today (realistic dates, still overdue in any time zone); the comment task is reached via the href on the board.
- Note: headless Chromium did not log the favicon 404 during screens; the error check was shown to bite with a mutant that logs console.error on each page (exit 1).

## 2026-11-25 Slice 4 verify + review (controller)
- Read: verify/SKILL.md, review/SKILL.md, ship/SKILL.md.

| Claim | Command | Result |
|---|---|---|
| clean tree at acd877b | git status; git log -1 | clean, acd877b |
| all checks | `rm -rf .next; lint && typecheck && build && E2E_PORT=3121 test:e2e` | exit 0, 67 passed, 0 skipped, no warnings, no `data/` |
| AC22 seed test bites | overdue task dueInDays -7 -> +7, ran e2e/seed.spec.ts | 1 failed (Overdue count 0), restored, 1 passed |
| AC22/23 real run | isolated `next start -p 3422` + mktemp DB; `npm run seed`, `npm run screens -- $D/shots` | seed exit 0 (prints sign-in + board URL); screens exit 0, 10 non-empty PNGs |
| AC23 console check bites | injected `console.error("bite")` in app/layout.tsx, rebuilt, ran screens | exit 1, lists each page with "bite"; restored + rebuilt, tree clean |
| screens | /tmp/t17-shots/board-1280.png, board-390.png, task-390.png (all 10 kept there) | columns side by side / stacked, overdue card marked, long title and long email wrap, no overflow |
| nothing weaker | git diff d298d27...HEAD | no deleted/skipped tests, no any/ts-ignore/eslint-disable |

- Review: one reviewer -> pass, no findings. Its runs: e2e 67 passed; seed twice idempotent; screens 10 PNGs; mutant (comment-exists check removed) -> seed test red.
- Not verified: the favicon-404 filter in screens (headless Chromium never requested favicon in these runs). It does no harm if never hit.

## 2026-11-25 Slice 4 shipped; improve: slice 5 planned (controller)
- Ship: PR https://github.com/tokyovo/nstack-test-app/pull/7, CI green (runs 45563884016, 45563888822; 67 passed). Merged under `merge: auto` as ac360ee. On main after pull: lint + typecheck pass.
- Improve (read improve/SKILL.md, plan/SKILL.md): no broken checks; `gh issue list` empty; `npm audit` 0 vulnerabilities; research.md is from today. UX pass on the new `npm run screens` output (/tmp/t17-shots/): every form has inline labels and ragged fields, the edit-task Title field truncates, selects stretch to the longest email, project rows stack controls. Earlier UX passes called the UI "plain but usable" without scoring that as its own candidate, as improve requires; scored now: 8 (v3 r1 c4), meets bar 8. Planned as slice 5 (T18, AC24-27) on nstack/forms-layout; the T17 select-width backlog item is folded in.
- Decision: labels above fields (stacked) at every width: the most common form convention, and it removes the ragged wrapping at both widths with one rule set.

## 2026-11-25 T18 form and project-row layout (builder)
- Did: app/globals.css: every label is a block with its field below it, fields `width: min(100%, 32rem)` (512px at 1280, container width at 390); forms in main get 1rem bottom margin. /projects rows (`.project-row`, one className in app/projects/page.tsx) are flex rows that wrap. e2e/forms-layout.spec.ts covers AC24-26.
- Decision: the label rule applies to all labels, not only `form label`, so the board's "Show tasks for" select (spec evidence, not in a form) is capped too and its search/filter labels match the forms; plain CSS, no markup changes besides the row class (principle 2).
- Decision: AC25's 40-char title is a realistic sentence ("Prepare the launch checklist for Q3 2026", ~300px), not 40 wide glyphs: 40 "W"s exceed 512px in any common font, which the 280-512 bound allows. Field widths themselves are forced by CSS, not fonts (slice 2 lesson).
- Decision: form margin scoped to `main form` after the screens review showed it pushed the header's Log out button up.
- Evidence: each test red first (see verify.md T18); full chain exit 0, 71 passed, no `data/`; screens exit 0, 10 PNGs reviewed at both widths.

## 2026-11-25 Slice 5 verify + review (controller)

| Claim | Command | Result |
|---|---|---|
| clean tree at ab4e752 | git status; git log | clean |
| all checks | `rm -rf .next; lint && typecheck && build && E2E_PORT=3125 test:e2e` | exit 0, 71 passed, no warnings, no `data/` |
| AC25 bites | removed `width: min(100%, 32rem)`, ran e2e/forms-layout.spec.ts | AC25 failed, restored, 4 passed |
| AC24 bites | label + field `display: block` -> `inline-block` | both AC24 tests + AC25 failed, restored, tree clean |
| AC26 bites | reviewer: `.project-row` -> display:block | AC26 failed |
| screens | /tmp/t18-shots/{board,projects,task}-{1280,390}.png (10 files, `npm run screens` exit 0) | labels above fields, 512px fields at 1280, full width at 390, no select stretch, project rows one line at 1280, no overflow, no console errors |
| nothing weaker | git diff 0c2b054...HEAD | no deleted/skipped tests; AC15 tests unchanged |

- Review: one reviewer -> pass, no important findings; two cosmetic nits logged in backlog.md. Board-pushed-below-fold tradeoff (seen in board-1280) logged in backlog.md.
- Not verified: none.

## 2026-11-25 Slice 5 shipped; improve: nothing at the bar (controller)
- Ship: PR https://github.com/tokyovo/nstack-test-app/pull/8, CI green (runs 45567398138, 45567405499; 71 passed). Merged under `merge: auto` as c30759b. On main after pull: lint + typecheck pass.
- Improve: bar 8 (goal.md). research.md from today; UX pass = T18 screens (/tmp/t18-shots/); `npm audit` 0; no issues. Top three: 7 (no nav back to Projects), 7 (failed move reverts silently), 7 (search not in URL). New: 6 (board below the fold at 1280). None at the bar.
- needs-human: `origin/nstack/ci` still exists (10384bb); optional, left for the user.
- Stopping: goal met, verify green, nothing at or above the bar.

## 2026-11-25 Continue: improve at bar 7; slice 6 planned (controller)
- Read: go/SKILL.md, improve/SKILL.md, plan/SKILL.md, build/SKILL.md, go/references/state.md
- Orient: tree clean on main at 52442f7, no local-only commits; removed worktrees agent-a94c4166f0843f62b (nstack/t14) and agent-ac3106964929ad65a (nstack/t15), both clean and contained in merged origin/nstack/slice3 (PR #5); deleted the two local branches. Fast checks on main: lint + typecheck pass. needs-human: only the optional `origin/nstack/ci` cleanup is open, left to the user.
- [x] 1 broken things: CI on main green at 7de6fe1 (45568344695); 52442f7 run in progress at the time
- [x] 2 known problems: `gh issue list` empty; backlog.md read
- [x] 3 goal gaps: none (every Done-when item has a passing e2e; CI green)
- [x] 4 outside demand: research.md dated today (29 sources); its candidates are already in backlog.md
- [x] 5 risk: `npm audit` 0 vulnerabilities
- [x] 6 UX: n/a: no UI change since the slice 5 screens pass (/tmp/t18-shots/) earlier today; its findings are in backlog.md
- [x] 7 code health: nothing slowing the work
- [x] decide: bar now 7 (owner, 52442f7). Five candidates at 7. Grouped the three board-screen items (nav back, silent failed move, search not in URL) with the cheap e2e temp-file cleanup into slice 6 (T19-T22, AC28-31) on nstack/board-feedback. CSV/JSON export (7, c3) left for a later slice: different screen, new feature.
- [x] plan check: fresh reader (Explore agent) asked 13 questions; answered in plan.md "Fresh-reader answers"

## 2026-11-25 T19 header title links to Projects (builder)
- Did: app/layout.tsx: when logged in, the header `<h1>` wraps "Task board" in `<Link href="/projects">`; logged out it stays plain text. app/globals.css: `header h1 a` inherits color, no underline. e2e/nav.spec.ts covers AC28 (board click-through, task page, /projects/999999 404, /login and /signup plain).
- Decision: one conditional in the existing layout `<h1>`, no new component (principle 2; plan decision). Heading name unchanged, so smoke test untouched.
- Decision: logged-out checks assert no `a` in the header at all (the header has no other links logged out), which is stricter than checking the title alone.
- Evidence: logged-in tests red first (no link); logged-out tests red against an always-link mutant; full chain in verify.md "Proof chain (T19)".

## 2026-11-25 T20 failed move shows an alert (builder)
- Did: `moveTaskAction` returns `boolean` (false for invalid args or a refused move). Board: after the awaited move, sets `moveError` to `Could not move "<title>"` on false/throw (null on success) and calls `router.refresh()` on failure; the optimistic state reverts by itself. Alert is `<p role="alert" className="board-error">` inside `.board`, full grid row, red. Two AC29 tests in e2e/move.spec.ts (second tab of the same user deletes the task; drag, then ArrowRight with a following successful move).
- Decision: catch only to show the alert; `unstable_rethrow(error)` first so a redirect (expired session) or not-found still navigates (plan fresh-reader answer).
- Decision: the error state is a string, set once per finished move (`moved ? null : message`), so "one alert at a time, cleared by the next success" falls out of one assignment (principle 3).
- Evidence: both AC29 tests red first (no alert); clear test red with the clear-on-success removed (alert still shown); full chain at the commit, see verify.md T20.

## 2026-11-25 Continue: slice 6 build (controller)
- Read: go/SKILL.md, build/SKILL.md, verify/SKILL.md; state files.
- Orient: found builder worktrees from the previous session with no live agents: nstack/t19 (d8c8daf, committed), nstack/t20 (4445de2, committed), nstack/t22 (uncommitted draft: playwright.config.ts + e2e/global-teardown.ts). No open PRs; main == origin/main.
- [x] merge T19, T20 into nstack/board-feedback: T19 fast-forward; T20 conflict in log.md only (kept both entries). lint + typecheck pass after merge. Removed both worktrees and branches.
- [x] T21: builder done (afbaacd), merged as c17d85f (log.md conflict only, kept both)
- [x] T22: builder kept the draft, added `npm run check:e2e-temp` (scripts/e2e-temp-check.mts); 1a95b9e merged as bdc27bf. Its two full runs hit a 30s timeout in the AC22 seed test under load from the parallel builder; rerun below on an idle machine passed.
- [x] ticket-scope verify T19-T22: covered by the slice verify below (same commit, wider scope). Removed all worktrees and the 6 stale `worktree-agent-*` branches (each contained in HEAD or origin/main).
## 2026-11-25 T22 e2e run removes its temp SQLite files (builder)
- Did: playwright.config.ts sets `E2E_DB_GENERATED=1` only when it fills the default `E2E_DATABASE_PATH`; new e2e/global-teardown.ts (`globalTeardown`) removes that file and its -wal/-shm (`force`, missing ignored); a caller-set path is kept. New `npm run check:e2e-temp` (scripts/e2e-temp-check.mts) runs `playwright test` as a child, then lists `taskboard-e2e-<child pid>-*` in the temp dir and exits 1 if any remain.
- Started from an interrupted builder's uncommitted draft (config + teardown); kept it unchanged after proving it.
- Decision: AC31 check is a script, not a manual count: the config names the file after the Playwright process pid, which is the child the script spawns, so parallel runs never count. It drops an inherited `E2E_DATABASE_PATH` so the default (cleaned) path is the one checked.
- Decision: order confirmed in Playwright 1.65.0 source (lib/runner/index.js `createGlobalSetupTasks`): plugin (webServer) setup runs before global teardown tasks, and teardowns run in reverse, so globalTeardown runs while `next start` is still up and the server is killed after. Unlinking open files is fine on Linux; the script counts after the child exits (server already killed) and found 0, so nothing is recreated on shutdown.
- Evidence: red with config reverted to HEAD: `check:e2e-temp -- e2e/smoke.spec.ts` exit 1, 3 files left (.db, -shm, -wal, pid matched). Green with the teardown: same command 0 left, exit 0. Caller-set `E2E_DATABASE_PATH=$D/own.db`: own.db/-shm/-wal kept. Full chain exit 0, 71 passed, no `data/`. Full suite via `check:e2e-temp` twice: 0 files left each time, exit 1 from an AC22 seed-test timeout (30s, load from a parallel builder; passes alone 3/3); so the teardown also runs after a failure. Seed timeout logged in backlog.md, not fixed here.
- Backlog: /tmp holds ~540 `taskboard-e2e-*` files from earlier runs; not this ticket's to delete (other builders may be running).
## 2026-11-25 T21 search and assignee filter live in the URL (builder)
- Did: page.tsx reads `searchParams` and passes `initialQuery` / `initialAssignee` (first entry of a repeated key, "" when missing) to Board. Board seeds its state from them (an unknown `for` becomes "all") and, on each search keystroke or filter change, calls `replaceUrl`, which writes `?q=&for=` with `history.replaceState` (q as typed, left out when it trims to empty; for left out when "all"). Three AC30 e2e tests.
- Decision: `for` is validated in Board, not page.tsx: the filter values live in the client module and page already passes members (principle 6 boundary is the props; one check, `isAssignee`).
- Decision: `replaceUrl` builds a fresh query (no other keys exist on the board URL), smaller than merging into location.search (principle 2).
- Evidence: red first (q/for null); `for=bogus` red without validation; history checks red with pushState; full chain 80 passed, see verify.md T21. One full run was accidentally made with the pushState mutant still in place (2 AC30 failures, 78 passed); the restored code was then rerun clean.

## 2026-11-25 Slice 6 verify (controller)
- Read: verify/SKILL.md.

| Claim | Command | Result |
|---|---|---|
| clean tree at c17d85f | git status; git rev-parse HEAD | clean, c17d85f |
| all checks + AC31 | `rm -rf .next; lint && typecheck && build && E2E_PORT=3160 npm run check:e2e-temp` | exit 0, 80 passed, 0 skipped, 0 build warnings, `0 taskboard-e2e-189724-* file(s) left`, no `data/` |
| AC22 seed timeout (T22 report) | same run, idle machine | passed; timeout only under parallel builder load |
| AC28 bites | layout title Link -> span | both logged-in nav tests failed |
| AC29 bites | board `setMoveError(null)` always | both AC29 tests failed |
| AC30 bites | `replaceState` -> `pushState` | AC30 search + assignee-filter tests failed |
| AC31 bites | `globalTeardown` commented out, `check:e2e-temp -- e2e/smoke.spec.ts` | db-wal and db-shm left (listed) |
| restored | git checkout; rebuild; nav/move/search/assignee-filter via check:e2e-temp | 17 passed, 0 files left, tree clean |
| screens | isolated `next start -p 3400` + mktemp DB; `npm run screens` exit 0 (10 PNGs) + board-filtered (`?q=launch&for=bogus`), board-alert (task deleted in tab 2, ArrowRight), 404 at 1280 and 390: /tmp/s6-shots/*.png | header title same look, alert red between filter and columns, filtered board shows 1 card with "launch" filled and "All" selected, stacked at 390, no overflow |
| nothing weaker | git diff main...HEAD | e2e +195 lines, 0 deleted; no skip/only/any/ts-ignore/eslint-disable |

- Observed, not in scope: the header link has no visual hint (plan decision: looks like the title); Next's default 404 body uses its own font (unchanged). Logged in backlog.md.
- Not verified: none.

## 2026-11-25 Slice 6 review + record (controller)
- Read: review/SKILL.md, ship/SKILL.md.
- [x] review: one reviewer at 8d017f5 -> pass, no findings. Its runs: full chain via check:e2e-temp 80 passed, 0 temp files; mutant (alert not cleared on success) -> AC29 test red; drove the app on 3470 (deleted task + ArrowRight -> alert, card gone, ?q kept, no overflow at 390/1280). Second reviewer not started: no auth, payments, migrations or public API changes.
- [x] seed-test timeout (T22 builder, twice): 16.7s on an idle machine; both timeouts came from two suites running at once on 2 CPUs. Lesson (rule 9, second time e2e load hurt a parallel run): the fact is now at the top of verify.md, so the next dispatch sees it; the backlog item (score 5, seed test headroom) stays.
- [x] plan.md: T19-T22 ticked, slice 6 marked done.

## 2026-11-25 Slice 6 shipped; improve: slice 7 planned (controller)
- Ship (read ship/SKILL.md): PR https://github.com/tokyovo/nstack-test-app/pull/10, CI green (runs 45617130310, 45617165810; 80 passed). Merged under `merge: auto` as 85d592e. On main after pull: lint + typecheck pass. CI on main 85d592e: run 45617827969 (result in the next entry).
- Read: improve/SKILL.md, plan/SKILL.md.
- [x] 1 broken things: none (slice 6 verify + PR CI green)
- [x] 2 known problems: `gh issue list` empty; backlog.md read; slice 6 items shipped
- [x] 3 goal gaps: none
- [x] 4 outside demand: research.md dated today
- [x] 5 risk: `npm audit` 0 vulnerabilities
- [x] 6 UX: slice 6 screens (/tmp/s6-shots/), new items in backlog.md (header link hint + 404 font, 4)
- [x] 7 code health: nothing slowing the work
- [x] decide: only CSV/JSON export (7) meets bar 7. Planned slice 7 (T23-T24, AC32-35) on nstack/export.
- [x] plan check: fresh reader (Explore) asked 15 questions; answered in plan.md "Fresh-reader answers"
- [x] T23 build + verify: builder 4e7825c (CSV route, lib/export.ts, Export CSV link; JSON link deferred to T24 so the board never links a 400). Controller at 4e7825c: lint, typecheck, build pass; `check:e2e-temp -- e2e/export.spec.ts` 2 passed, 0 files left; quote-doubling mutant -> 1 failed, restored, tree clean. Main CI on 85d592e: run 45617827969 success, 80 passed.
- [x] T24 build + verify: builder 67908d4 + 8d73c8d (JSON in lib/export.ts, route takes json, Export JSON link); covered by the slice verify below.
## 2026-11-25 T23 CSV export route and board link (builder)
- Did: new GET route `app/projects/[id]/export/route.ts`: getCurrentUser (else 307 to /login), integer id + getProject (else plain `Not found` 404), `format=csv` (else `Unknown format` 400), then `tasksToCsv(listTasks(...))` with Content-Type, attachment Content-Disposition and `Cache-Control: no-store`. New `lib/export.ts`: BOM, header, one row per task, formula guard (`'` before leading `=+-@`, tab, CR) then RFC 4180 quoting, CRLF after every row. Board page: `<p className="export-links">` with a plain `<a href=... download>Export CSV</a>` under the `<h2>`. New e2e/export.spec.ts (2 tests).
- Decision: T23 adds only the "Export CSV" link; "Export JSON" comes with T24, so the board never links to a format the route rejects with 400 (principle 11).
- Decision: CSV code in lib/export.ts, route stays a list of checks (principle 3); T24's JSON goes beside it.
- Evidence: both tests red first (no link; route 404). Mutants each red: formula guard removed, quote doubling removed, BOM removed (AC32/33 test); membership check replaced by a stub project, format check disabled (AC35 test). Full chain via check:e2e-temp: exit 0, 82 passed, 0 temp files left, no `data/`.
## 2026-11-25 T24 JSON export (builder)
- Did: `lib/export.ts` `tasksToJson(project, tasks)`: compact JSON `{ project: { id, name }, tasks: [{ id, title, description, status, assignee, dueDate }] }`, stored status key, email or null, date or null. Route accepts `format=json` beside csv (same auth, 404, 400 order), Content-Type `application/json; charset=utf-8`, filename `.json`. Board: "Export JSON" link (`download`) next to "Export CSV". e2e/export.spec.ts: +2 tests (AC34 download, AC35 json request checks).
- Decision: route picks content type and body with one ternary rather than a format table (principle 2: two formats do not need a lookup structure).
- Decision: AC34 test project name has quotes and non-ASCII to check JSON escaping and UTF-8; first byte checked as `{` (no BOM, plan decision).
- Evidence: both tests red first (no "Export JSON" link; route 400 for json). Mutant (JSON status as column name) -> AC34 red, restored. Full chain at 67908d4: `rm -rf .next; lint && typecheck && build && E2E_PORT=3124 npm run check:e2e-temp` exit 0, 84 passed, 0 temp files left, no `data/`.

## 2026-11-25 Slice 7 verify (controller)
- Read: verify/SKILL.md.

| Claim | Command | Result |
|---|---|---|
| clean tree at 8d73c8d | git status; git rev-parse | clean |
| all checks | `rm -rf .next; lint && typecheck && build && E2E_PORT=3190 npm run check:e2e-temp` | exit 0, 84 passed, 0 skipped, 0 build warnings, 0 temp files, no `data/` |
| AC32 quoting bites | quote doubling removed (T23 verify) | 1 failed |
| AC33/AC35 bite | formula guard off + membership check replaced by a stub project | all 4 export tests failed; restored, tree clean |
| AC34 bites | builder: JSON status as column name | AC34 failed |
| real downloads | isolated server :3400 + seed, clicked Export CSV / Export JSON in Chromium | project-1-tasks.csv: BOM, CRLF, header, 4 rows, comma-title quoted, "To do"/"In progress"/"Done"; project-1-tasks.json: project + 4 tasks, status keys, null assignee/due; kept in /tmp/s7-shots/ |
| screens | `npm run screens` exit 0; /tmp/s7-shots/board-1280.png, board-390.png | "Export CSV Export JSON" under the project title, fits at 390, no overflow |
| nothing weaker | git diff main...HEAD | no deleted/skipped tests, no any/ts-ignore/eslint-disable |

- Not verified: leading tab/CR formula prefixes end to end (the server trims them before storage; plan answer). None else.

## 2026-11-25 Slice 7 review + record (controller)
- Read: review/SKILL.md, ship/SKILL.md.
- [x] review: reviewer 1 at 5005a44 -> pass, two nits (export link spacing; formula after leading spaces), both in backlog.md. Its runs: full chain 84 passed, 0 temp files; mutant (no `@` in guard) red; screens at 1280/390.
- [x] security reviewer (export exposes project data) at 5005a44 -> pass, no findings. Its runs: 84 passed; mutant (no `-` in guard) red; spoofed Host on the logged-out redirect not reflected; HEAD -> 307. Run after reviewer 1, not alongside (2-CPU note in verify.md).
- [x] plan.md: T23-T24 ticked, slice 7 marked done.

## 2026-11-25 Slice 7 shipped; improve: nothing at the bar; stop (controller)
- Ship: PR https://github.com/tokyovo/nstack-test-app/pull/11, CI green (runs 45625803739, 45625838808; 84 passed). Merged under `merge: auto` as 60f49fc. On main after pull: lint + typecheck pass; CI on main run 45626440811 success, 84 passed. Slice 6 main CI (85d592e, run 45617827969): success, 80 passed.
- Improve: sources as in the slice 7 planning entry (same day, no change since but the export feature). Top three: 6 (silent feedback), 6 (labels), 6 (duplicate task); none at bar 7.
- needs-human retried: `origin/nstack/ci` still exists (optional, user's call).
- Hand-off audit: every step entry this run has its checklist ticked; skill files read per step (named in entries). Servers: none listening (ss). Removed all stale `/tmp/taskboard-e2e-*` files from earlier runs (570; T22 stops new ones). Worktrees: none left; stale `worktree-agent-*` branches deleted.
- Slowed down: a previous session ended with three builders in flight, so this run started by finding and merging their work; two parallel e2e suites on 2 CPUs timed out the seed test (now a note at the top of verify.md).
- Stopping: goal met, full checks green on main, nothing in improve meets bar 7.

## 2026-11-26 go labels + checklist
- Read: go/SKILL.md c1fd976
- [x] 1. Never wait on a person. Goal addition applied without asking; decisions logged in plan.md.
- [ ] 2. Nothing is done until it is proven.
- [x] 3. Smallest change that meets the goal. Out of scope list in plan.md (colors, rename/delete, export).
- [ ] 4. Fix root causes.
- [ ] 5. State lives in files.
- [ ] 6. Guard the context window.
- [ ] 7. Start every step with `step`.
- [ ] 8. Turn lessons into structure.
- [x] 1. n/a: existing project.
- [x] 2. n/a: existing project.
- [x] 3. n/a: existing project.
- [x] 4. n/a: existing project.
- [x] 1. git status clean at 6c30825; no worktrees; no unmerged nstack/* branches; no open nstack PRs; main == origin/main; last log entry fully ticked.
- [x] 2. Nothing to resume.
- [x] 3. n/a: no local-only commits on main.
- [x] 4. `npm run lint` 0 problems; `npm run typecheck` pass (main 6c30825).
- [x] 5. Policy settings and Drive section present. goal.md updated with the owner's addition (labels, checklist).
- [x] 6. needs-human: `git ls-remote --heads origin nstack/ci` still lists it (optional, user's call). No `Retry when` in plan.md.
- [ ] 1. Pick work.
- [ ] 2. For each ticket in the slice:
- [ ] 3. When every ticket is done:
- [ ] 4. Record it:

## 2026-11-26 plan slice 8 labels + checklist
- Read: plan/SKILL.md 59d57d8
- [x] 1. Learn the ground truth. Read lib/db.ts, lib/tasks.ts, lib/comments.ts, app/projects/actions.ts, board page/board.tsx/task page, e2e/helpers.ts, scripts/seed-app.mts.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: where labels are created, how assigned, color, uniqueness, limits, rename/delete; checklist toggle UX, delete confirm, card format, tamper.
  - [x] 2.2. Answered from code patterns (comments, invite form, AC20 keep-values, AC30 URL state, tamperBoundIds).
  - [x] 2.3. Decision lines in plan.md (no colors, SQL uniqueness, no label rename/delete, no confirm on item delete, text progress).
- [x] 3. Write the spec. AC36-41 in plan.md.
- [x] 4. Cut tickets. T25-T28, sequential (shared files: lib/tasks.ts, board.tsx, task page).
- [x] 5. Check the plan
  - [x] 5.1. AC36,37->T25; AC38->T26; AC39,40->T27; AC41->T28.
  - [x] 5.2. Fresh Explore reader: 15 questions (card counting, list name clash, placement, URL order, tamper mechanics, toggle wait, seed, screens, CSS); all answered under "Fresh-reader answers"; AC37 list renamed "Task labels", AC41 seed moved to the commented task so screens show it.
  - [x] 5.3. Slice in plan.md with branch nstack/labels-checklist; finished slices compacted to `## Done` lines (format in state.md; earlier runs had kept full sections).
- [x] Done when: every criterion has a proof, the fresh reader's questions are answered, slice in plan.md.

## 2026-11-26 build T25
- Read: build/SKILL.md 141fcec
- Did: builder: labels/task_labels tables, lib/labels.ts, LabelForm on the board, TaskLabelsForm on the task page, card chips, e2e/labels.spec.ts (8 tests), helpers count `li.task-card`. Commits 061d106, 9807a22.
- Decision (builder): smoke.spec table list adds labels, task_labels (spec change: the plan adds the tables). Task page shows only "No labels yet" (no form) when the project has no labels. Tests use goto() not reload() (Chromium restores checkbox state on reload).
- Controller proof at 9807a22: `rm -rf .next; lint && typecheck && build && E2E_PORT=3191 npm run check:e2e-temp` exit 0, 92 passed, 0 temp files, no `data/`. Diff of existing tests: only the planned helper/seed locator change and the two table names.
- [x] 1. n/a: first attempt passed.
- [x] 2. n/a: first attempt passed.
- [x] 3. n/a: nothing parked.
- [ ] Done when: (slice) T26-T28 pending.
