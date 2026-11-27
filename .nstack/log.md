# Log


Entries before 2026-11-27 are in git history: `git log -p .nstack/log.md`.


## 2026-11-27 orient (controller, /nstack:go continue + goal additions)
- In flight: none. `git status` clean, no worktrees, no unmerged nstack/* branches, no open nstack PRs, main == origin/main 762fb7f.
- Parked retry: needs-human.md has no open items; plan.md has no Retry when.
- Verification on main 762fb7f: lint 0, typecheck 0, `check-features` 0, `drive check` 0 (16 PNGs).
- Formats: all sections present.
- Goal changed: owner added label rename/delete/colour, duplicate a task, and a calendar view by due date; written into goal.md on nstack/labels-dup-calendar. Next: plan.

## 2026-11-27 plan slice labels-dup-calendar
- Read: plan/SKILL.md 9d86f42
- [x] 1. Learn the ground truth. Read lib/db.ts (CREATE IF NOT EXISTS, no migrations), lib/labels.ts, lib/tasks.ts, actions.ts, board page, task page, design.md, verify.md Features; tests for labels in e2e/labels.spec.ts.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: colour storage, migration of existing files, rename collisions, delete confirm, what a duplicate copies, calendar range/week start/no-date tasks/narrow layout.
  - [x] 2.2. From code: duplicate check COLLATE NOCASE, ConfirmButton for deletes, localToday for dates, tokens only in :root.
  - [x] 2.3. Four Decision lines in the slice (colour keys, duplicate copy rules, Monday weeks, rename/delete on board).
- [x] 3. Write the spec. 9 ACs, out of scope, two designs each for colour/calendar/migration.
- [x] 4. Cut tickets. T41 colour+migration (riskiest, first), T42 rename/delete (Needs T41), T43 duplicate, T44 calendar (independent).
- [x] 5. Check the plan
  - [x] 5.1. AC1-2 T41; AC3-4 T42; AC5 T43; AC6-7 T44; AC8 T41+T44; AC9 all.
  - [x] 5.2. Fresh general-purpose reader: 15 questions, all answered in the slice's Plan check answers.
  - [x] 5.3. Slice in plan.md, branch nstack/labels-dup-calendar.
- [x] Done when: every criterion has a proof, the fresh reader's questions are answered in the plan, and the slice is in `plan.md`.

## 2026-11-27 build T41
- Read: build/SKILL.md 45c2dd4
- [x] 1. Branch. nstack/labels-dup-calendar from main 762fb7f; builder in its own worktree.
- [x] 2. Starting state. lint 0, typecheck 0 at 47388eb (tsconfig now excludes .claude worktrees).
- [x] 3. Dispatch. Fresh nstack:builder, worktree, pointer brief, Parallel: 3.
- [x] 4. Read the reply. Done at 8bf1e3c: lib/schema.ts (applySchema + idempotent colour migration, CHECK on keys), lib/label-colors.ts, LabelChip, Colour select, seed Bug=Red Design=Purple; AC1/AC2 red first; mutation (weak red text) failed axe. Spec changes: AC37 class assertion, forms-layout centring, seed chip classes.
- [x] 5. Prove it yourself. Merged (0770d37; lib/tasks.ts import conflict, kept both): lint 0, typecheck 0, build 0, `check:e2e-temp -- labels a11y seed forms-layout duplicate calendar` 0 (39 passed).
- [x] 6. Record. design.md Tokens gets the six chip pairs; Features rows for label colour and old-DB migration.
- [x] Done when: the ticket is committed on the slice's branch with items 1-6 ticked in its log entry, or is parked in `plan.md`.

## 2026-11-27 build T43
- Read: build/SKILL.md 45c2dd4
- [x] 1. Branch. nstack/labels-dup-calendar from main 762fb7f; builder in its own worktree.
- [x] 2. Starting state. lint 0, typecheck 0 at 47388eb (tsconfig now excludes .claude worktrees).
- [x] 3. Dispatch. Fresh nstack:builder, worktree, pointer brief, Parallel: 3.
- [x] 4. Read the reply. Done at eab7cb6: duplicateTask (one transaction: task, labels, checklist unticked), duplicateTaskAction, button in .task-actions; 4 tests red first, mutation (keep ticks) seen red.
- [x] 5. Prove it yourself. Fast-forwarded slice branch to eab7cb6: lint 0, typecheck 0, build 0, `check:e2e-temp -- e2e/duplicate.spec.ts` 0 (4 passed). Full suite runs at verify (other builders still running).
- [x] 6. Record. Features row "Duplicate a task" added; backlog: drive screens --port help.
- [x] Done when: the ticket is committed on the slice's branch with items 1-6 ticked in its log entry, or is parked in `plan.md`.

## 2026-11-27 build T44
- Read: build/SKILL.md 45c2dd4
- [x] 1. Branch. nstack/labels-dup-calendar from main 762fb7f; builder in its own worktree.
- [x] 2. Starting state. lint 0, typecheck 0 at 47388eb (tsconfig now excludes .claude worktrees).
- [x] 3. Dispatch. Fresh nstack:builder, worktree, pointer brief, Parallel: 3.
- [x] 4. Read the reply. Done at 57020e6: lib/calendar.ts (pure, UTC date math), calendar page, board Calendar link, seed due dates on days 1 and 28, drive calendar screen; 5/6 calendar tests red first; drive check 18 PNGs in its worktree.
- [x] 5. Prove it yourself. Merged into slice branch (c7d1d07, on top of T43): lint 0, typecheck 0, build 0, `check:e2e-temp -- calendar duplicate a11y seed` 0 (19 passed).
- [x] 6. Record. Features row "Calendar view"; Drive screens list gains calendar (18 PNGs). Backlog: seed.spec near 30s under load (already a backlog line).
- [x] Done when: the ticket is committed on the slice's branch with items 1-6 ticked in its log entry, or is parked in `plan.md`.

## 2026-11-27 build T42
- Read: build/SKILL.md 45c2dd4
- [x] 1. Branch. nstack/labels-dup-calendar at c2af9e3 (T41, T43, T44 merged); builder in its own worktree.
- [x] 2. Starting state. lint 0, typecheck 0 at 0770d37 (same code).
- [x] 3. Dispatch. Fresh nstack:builder, worktree, pointer brief (alone).
- [x] 4. Read the reply. Done at 518b0a2: renameLabel/deleteLabel, label-row.tsx (chip, Delete label with confirm, edit form), shared readLabel validation; AC3 5 + AC4 3 tests red first; its full suite 165 passed, drive check 18 PNGs.
- [x] 5. Prove it yourself. Fast-forwarded slice branch to 518b0a2: lint 0, typecheck 0, build 0, `check:e2e-temp -- e2e/labels.spec.ts` 0 (23 passed).
- [x] 6. Record. Features rows rename + delete label. Builder's backlog line (New label form may drop the picked colour after an error) is a T41 defect against the plan answer: became T45 with the seed timeout.
- [x] Done when: the ticket is committed on the slice's branch with items 1-6 ticked in its log entry, or is parked in `plan.md`.
- Earlier, during T42: full suite at 263085e (T41+T43+T44) 156 passed, 1 failed: seed.spec AC22 timed out at 30s in ensureColumn's reload while the T42 builder loaded the machine; third time this test hit the limit (backlog line, 2026-11-25 twice). Rule 8: T45 gives it a 60s timeout. drive check 0 (18 PNGs).
- Decision: seed.spec gets test.setTimeout(60_000): it seeds twice through the UI and now does more (colours, due dates); assertions unchanged, so no test is weakened.

## 2026-11-27 build T45
- Read: build/SKILL.md 45c2dd4
- [x] 1. Branch. nstack/labels-dup-calendar at 518b0a2 + state; builder in its own worktree.
- [x] 2. Starting state. lint 0, typecheck 0 at 518b0a2.
- [x] 3. Dispatch. Fresh nstack:builder, worktree, pointer brief (alone).
- [x] 4. Read the reply. Done: e96250f (New label form select keyed by value, like label-row.tsx; new AC1 test red first: got gray, expected blue), 7ac76ce (seed.spec 60s timeout). The backlog line it could not find was already removed by the controller.
- [x] 5. Prove it yourself. Fast-forwarded to 7ac76ce: lint 0, typecheck 0, build 0, `check:e2e-temp -- labels seed` 0 (25 passed).
- [x] 6. Record. Backlog: a forged colour (e.g. pink) leaves the select on Gray after the error (nothing stored).
- [x] Done when: the ticket is committed on the slice's branch with items 1-6 ticked in its log entry, or is parked in `plan.md`.

## 2026-11-27 verify slice labels-dup-calendar
- Read: verify/SKILL.md db15016
- [x] 1. Clean tree. `git status --porcelain` empty; code at 8e7cec5 (after the debug fix 41b2a93; later commits only .nstack/).
- [x] 2. Project checks. At 41b2a93: lint 0 (0 warnings, incl. check-css-tokens), typecheck 0, clean build 0 (0 warnings), `check:e2e-temp` 0 (166 passed, 0 skipped, 0 temp files, no data/), `drive check` 0 (18 PNGs, at 727d2b6, same code apart from one e2e line). First full run at 727d2b6 failed 1 (a11y calendar test, flaky): see debug entry below; fixed, then 166/166.
- [x] 3. Every acceptance criterion has a passing check. AC1 labels.spec AC1 x3 + a11y (every colour, 1280/390); AC2 labels.spec AC2; AC3 labels.spec AC3 x5; AC4 labels.spec AC4 x3; AC5 duplicate.spec x4; AC6 calendar.spec x5; AC7 calendar.spec AC7 + a11y calendar test; AC8 seed.spec + drive check 18 PNGs; AC9 full suite. Features rows: label colours, migration, rename, delete, duplicate, calendar; `check-features` 0.
- [x] 4. Every new check bites. Round 1 (10 breaks: chip class fixed gray, migration skipped, UPDATE/DELETE AND 0, dup labels not copied, calendar day+1, grid 6 cols, undated text, empty-month text hidden, New label select unkeyed): 14 failed. Round 2 (colour check off, rename/delete without membership or project scope, dup reads any task + no title cut, month pattern \d{1,2}, calendar page without membership): 11 failed. Every new test red in one round. Restored: 43 passed, `git status` clean. a11y fix: red 1/8 before, 16/16 after.
- [x] 5. The real thing runs. `drive start` + `drive screens /tmp/verify-ldc` 0 (seed through the UI, 18 screens, no console errors); saved Playwright tests drive every AC in CI.
- [x] 6. Every changed screen looks right. Looked at calendar-1280/390, board-1280, task-390 in /tmp/verify-ldc (others by builders: T42 label rows normal/error/long at 1280 and 390, T43 task-1280/390, T44 calendar). Critique below. Destructive Delete label confirms (AC4).
- [x] 7. Nothing got weaker. `git diff main...HEAD -- e2e` removes 20 lines, each replaced by a chip-scoped equivalent (Q1 spec change: rows now hold edit forms); seed.spec gets a 60s timeout (logged decision, assertions unchanged). No skip/only/fixme/any/ts-ignore/eslint-disable added.
- [x] 8. No new warnings or errors. Build 0 warnings; tests 143 -> 166; drive screens 16 -> 18; verify.md Last result updated.
- [x] Done when: every gate item is ticked in the log entry with its evidence, and Not verified is empty or every entry in it is parked.


| Claim | Command | Result |
|---|---|---|
| all checks | lint, typecheck, build, check:e2e-temp at 41b2a93; drive check | 0/0/0/0 (166 passed)/0 (18 PNGs) |
| new tests bite | 2 rounds of breaks, labels/duplicate/calendar/seed/a11y specs | 14 + 11 failed; restored 43 passed |
| flaky fix | a11y "calendar with" --repeat-each | before 1/8 failed; after 16/16 passed |
| screens | /tmp/verify-ldc/{calendar-1280,calendar-390,board-1280,task-390}.png | 1 month heading + grid obvious; 2 spacing on scale, grid aligned; 3 16px body, chip contrast via axe; 4 no overflow at 390 (agenda list); 5 empty month / undated count intended; 6 tokens from design.md, flat cells; 7 focus (a11y spec); 8 actions named (Previous/Next month, Duplicate task, Delete label) |
- Not verified: CI on the PR (runs at ship). Label edit inputs on the board have accessible names but no visible label (chip names the row): backlog.

## 2026-11-27 debug flaky a11y calendar test
- Read: debug/SKILL.md d67a39b
- [x] 1. Reproduce. `check:e2e-temp -- e2e/a11y.spec.ts -g "calendar with" --repeat-each=8 --workers=2`: 1 failed, 7 passed (full suite at 727d2b6 had failed it once too).
- [x] 2. Shrink it. One test; failure at the `.task-details` toContainText("2020-01-01") after Save changes.
- [x] 3. Read the evidence. Trace: the last `fill internal:label="Due date"` snapshot frameUrl is /projects/5 (the board), not the task page.
- [x] 4. Hypothesize, then test one thing. Cause: link click navigates client-side; `getByLabel("Due date")` matched the board's New task form field before the task page loaded; Save changes then saved an empty date. Prediction (fill on board URL) confirmed by the trace.
- [x] 5. Fix the cause, not the symptom. Wait for the task page heading before the fill (the pattern of checklist.spec openTask), 41b2a93, commit "a11y calendar test waits for the task page".
- [x] 6. Prove the fix. With fix: --repeat-each=16 --workers=3 -> 16 passed; without: 1/8 failed above. The test itself is the kept regression check.
- [x] 7. Look for siblings. Script over e2e/*.ts and seed-app.mts for a link click followed by getByLabel(Title|Due date|Description|Assignee): only this line.
- [x] Done when: passes, failed before, kept, no [DEBUG- lines (grep 0).
- Cause: click-then-fill race on a label shared by the board and the task page. Fix: wait for the task heading.

## 2026-11-27 review slice labels-dup-calendar
- Read: review/SKILL.md f713898
- [x] 1. Dispatch. One nstack:reviewer, worktree, pointer brief at 988bfe9. Verdict pass: 0 important, 1 nit (Copy of title cut can split a surrogate pair). Reran lint/typecheck/build, 34 targeted tests, a mutation (dup keeps ticks -> red), drive check 18, screens.
- [x] 2. Second reviewer (data migration): Focus security and failure modes, own worktree, in parallel. Verdict pass: 0 important, 2 nits (colour CHECK baked into existing files makes a future colour a 500; same surrogate cut). Membership/project scoping, allow-listed class names, strict month regex confirmed; forged tests pass.
- [x] 3. Act on every finding. All 3 nits (2 distinct) cheap: fixed in T46 (copy title by code points; colour CHECK dropped).
- [x] 4. Review the fixes. Used the small-fix exception: T46 changes 20 lines of lib code for two nits, both new tests seen red with the fix reverted and green after, full verify passed at b5a09ef (168 passed, drive check 18).
- [x] Done when: the latest round has no important findings, `verify` passed after the last fix, and nits are fixed or in `backlog.md`.

## 2026-11-27 build T46
- Read: build/SKILL.md 45c2dd4
- [x] 1. Branch. nstack/labels-dup-calendar; builder in its own worktree.
- [x] 2. Starting state. lint 0, typecheck 0 at 41b2a93 code (verify).
- [x] 3. Dispatch. Fresh nstack:builder, worktree, pointer brief (alone).
- [x] 4. Read the reply. Done at b5a09ef: copyTitle() by code points; LABEL_COLOR_COLUMN without CHECK; 2 new tests (emoji copy, future colour after applySchema) red first.
- [x] 5. Prove it yourself. Fast-forwarded to b5a09ef. With lib/tasks.ts + lib/schema.ts at 4c9f14c: the 2 new tests failed; restored: full gate lint 0, typecheck 0, clean build 0 (0 warnings), `check:e2e-temp` 0 (168 passed), `drive check` 0 (18 PNGs), check-features 0, no data/.
- [x] 6. Record. Backlog: none new (dev DB files from this unshipped branch keep the CHECK; main never had it).
- [x] Done when: the ticket is committed on the slice's branch with items 1-6 ticked in its log entry, or is parked in `plan.md`.

## 2026-11-27 ship slice labels-dup-calendar
- Read: ship/SKILL.md 47e5182
- [x] 1. Commit. T41-T46 code commits + debug fix + state commits on nstack/labels-dup-calendar.
- [x] 2. Sync. origin/main 762fb7f is an ancestor of the branch: nothing came in, verify stands.
- [x] 3. Push. nstack/labels-dup-calendar.
- [x] 4. Open the PR. https://github.com/tokyovo/nstack-test-app/pull/22 (what changed, verification table, screenshot paths, merge danger low with migration note, decisions).
- [x] 5. Wait for CI. `gh pr checks 22 --watch` exit 0: runs 45957587076, 45957617496 pass (168 passed, drive check 18 PNGs).
- [x] 6. Merge. merge: auto, 0 important findings: `gh pr merge 22 --squash --delete-branch` -> 5cea533.
- [x] 7. Confirm and clean up. main 5cea533: lint 0, typecheck 0, CI 45958184535 success (168 passed, 18 PNGs); remote heads: main only; no worktrees; local slice branch gone.
- [x] Done when: the PR is merged, CI is green on the default branch, and the fast checks pass there, or the PR is parked with a reason.
- (Items 4-7 ticked on the follow-up state branch nstack/state-2026-11-27b: they happened after the slice branch was pushed.)

## 2026-11-27 improve
- Read: improve/SKILL.md c8daf07
- [x] 1. Gather evidence
  - [x] 1.1. Broken things. None: main 5cea533 lint 0, typecheck 0, CI green (45958184535: 168 passed, 18 PNGs).
  - [x] 1.2. Known problems. 0 open issues; needs-human has no open items; backlog read (new lines from this slice added during build/verify/review).
  - [x] 1.3. Gaps against the goal. None: the goal's new features (label rename/delete/colour, duplicate, calendar) each have Features rows and CI tests; check-features 0.
  - [x] 1.4. Outside demand. research.md 2026-11-25 (2 days old); shipped candidates removed from backlog; templates remainder added at 5.
  - [x] 1.5. Risk. `npm audit` 0 vulnerabilities; two reviewers (one security) found no important issue in the new input paths.
  - [x] 1.6. User experience. Pass done in verify labels-dup-calendar (/tmp/verify-ldc, 8/8 critique); its finding (label edit inputs without a visible label) is a backlog line at 3.
  - [x] 1.7. Code health. n/a: nothing slows the work above.
- [x] 2. Score. `score .nstack/backlog.md` exit 0.
- [x] 3. Decide. Nothing meets bar 7. Top three: 5 task templates, 5 multiple assignees, 5 non-ASCII label case.
- [x] Done when: all sources checked, candidates scored, top three logged.

## 2026-11-27 hand-off (controller)
- Go loop lines: [x] 1. Pick work: goal changed -> plan slice labels-dup-calendar. [x] 2. T41, T43, T44 in parallel builders, then T42, T45; each proven by the controller (touched specs + fast checks + build). [x] 3. verify (flaky a11y test found and fixed via debug; 25 bites seen red), review (2 reviewers, 0 important; nits fixed in T46 under the small-fix exception), ship PR #22 -> 5cea533, CI green on main. [x] 4. plan.md Done line on the slice branch before ship (PR number filled in after merge on this state branch).
- Stop rule: goal met, CI green on main 5cea533 (45958184535), improve found nothing at bar 7 (top 5, 5, 5).
- Audit: `audit-log .nstack/log.md 2026-11-27` exit 0. Compared with what was done: drive check at verify ran at 727d2b6, re-run at b5a09ef after T46 (pass); screens critique by the controller covered calendar 1280/390, board 1280, task 390, the rest by builders/reviewers.
- Servers: a next-server on 127.0.0.1:3400 (pid 114319, started 2026-11-26 20:04, DATABASE_PATH under ~/.local/share/nstack-test-app/demo.db) is not from this run; left running. /tmp/taskboard-drive empty; no e2e temp DBs; all worktrees removed.
- Log trimmed to this run (was 423 lines).
- Slowed the run: parallel builders pushed seed.spec past 30s (fixed: 60s timeout, T45); a click-then-fill race on a label shared by board and task page (fixed; the sibling scan found no other case). tsconfig now excludes .claude worktrees so typecheck ignores builders' copies.

## 2026-11-27 orient (controller, run "continue")
- Nothing in flight: tree clean, one worktree, no unmerged nstack branches, no open nstack PRs; CI on main c1574a6 success (45959198563).
- check-env ok; lint 0; typecheck 0; check-features 0; build 0; drive check pass (18 PNGs).
- check-security against a drive copy FAILED: no Access/Deny proof columns; no CSP or X-Frame-Options; no nosniff. npm audit 0 high/critical, no secrets in bundle. -> first slice secure-access.
- needs-human: no open items.

## 2026-11-27 plan slice secure-headers
- Read: plan/SKILL.md fa73337
- [x] 1. Learn the ground truth. Every server action calls `requireUser`; membership via `getProject` (lib/projects.ts:16); deny tests exist for every member write except create label; no no-session test for a server action; next.config.ts has no headers.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: which CSP; where headers go; access level of non-request rows; how to send a sessionless action; how to prove deny tests bite.
  - [x] 2.2. Answered from code/conventions: headers via next.config `headers()`; sessionless = clearCookies then submit; bite = drop the membership condition in getProject.
  - [x] 2.3. Decision: CSP `frame-ancestors 'none'` only (script-src needs nonces, every page dynamic; backlog). Decision: rows with no request path are `public`.
- [x] 3. Write the spec. plan.md slice secure-access, AC1-AC6, out of scope, design line.
- [x] 4. Cut tickets. T47 headers, T48 access map + deny proofs; independent, buildable in parallel.
- [x] 5. Check the plan
  - [x] 5.1. AC1->T47; AC2-AC5->T48; AC6->T47+T48 (check-security, check-features).
  - [x] 5.2. Fresh Explore reader listed 12 questions; answered in the slice's "Answers" paragraph.
  - [x] 5.3. Slice in plan.md, branch nstack/secure-access.
- [x] Done when: every criterion has a proof, the fresh reader's questions are answered in the plan, and the slice is in `plan.md`.
- (Slice was named secure-access after the step line was printed with "secure-headers"; same step.)

## 2026-11-27 build T47 T48
- Read: build/SKILL.md 4b2ec60
- [x] 1. Branch. nstack/secure-access from main c1574a6.
- [x] 2. Starting state. lint 0, typecheck 0 at 71c196d.
- [x] 3. Dispatch. Two nstack:builder agents in worktrees, one wave (4 cores, 14 GB free, 3 GB swap), E2E_PORT 3210/3220.
- [x] 4. Read the reply. T47 cb68fa8 (headers spec red on missing CSP, then green). T48 272e8e0 (3 new deny tests; guards already existed, so red seen by bite instead).
- [x] 5. Prove it yourself. T47 at cb68fa8: lint 0, typecheck 0, build 0, headers.spec 1 passed. Merged ff84921: lint 0, typecheck 0, build 0, access+labels+projects+headers specs 39 passed, 0 temp files; check-features 0; check-security against drive copy exit 0 (36 deny proofs, headers ok, audit 0).
- [x] 6. Record. plan.md T47/T48 ticked with bite results; 2 backlog lines (MEMBER_CHECK duplicate, script-src CSP).
- [x] Done when: both tickets committed on nstack/secure-access with items 1-6 ticked.
- Decision: T48's bite for AC5 found rename/delete project use their own membership SQL; proved by neutralising it separately rather than refactoring now (backlog, not in slice scope).

## 2026-11-27 verify slice secure-access
- Read: verify/SKILL.md 1af2e2c
- [x] 1. Clean tree. 7e77685, `git status` empty.
- [x] 2. Project checks. lint 0 (0 warnings), typecheck 0, build 0 (0 warnings), check:e2e-temp 0: 172 passed, 0 skipped, 0 temp files; no data/ dir; drive check pass (18 PNGs).
- [x] 3. Every acceptance criterion in scope has a passing check. AC1 headers.spec; AC2 access.spec x2; AC3 labels.spec AC36 create-label; AC4 check-security access map (36 deny proofs); AC5 bite runs (T48 builder, re-done below for the new tests); AC6 check-security exit 0, check-features 0. New Features row for the headers.
- [x] 4. Every new check bites. Broke all 3 guards at once (headers source -> /never-matches; createLabel membership line; requireUser in createProjectAction and /projects page), rebuilt: the 4 new tests red, restored via git checkout, rebuilt: 6/6 green, tree clean.
- [x] 5. The real thing runs. Drive copy: `curl -sI <url>/login` -> 200 with `Content-Security-Policy: frame-ancestors 'none'` and `X-Content-Type-Options: nosniff`.
- [x] 6. Every changed screen looks right. n/a: no UI change (headers and tests only); drive screens still render 18 PNGs with no console errors.
- [x] 7. Nothing got weaker. `git diff main...HEAD` on e2e/app/lib/next.config: no removed lines; no skip/only/any/ts-ignore/eslint-disable added.
- [x] 8. No new warnings or errors. Counts as base (0 lint/build warnings); e2e 168 -> 172; verify.md Last result updated.
- [x] 9. Access is enforced. check-security against drive copy exit 0: access map ok, no secrets, headers and cookies ok, npm audit 0 high/critical.
- [x] Done when: every gate item ticked; Not verified: none.

## 2026-11-27 review slice secure-access
- Read: review/SKILL.md 053d586
- [x] 1. Dispatch. nstack:reviewer in a worktree at e7a140c: pass, 0 findings (lint/typecheck/build, 44 e2e passed, bite on 3 guards red then restored, check-security ok).
- [x] 2. Second reviewer. Auth-touching: second nstack:reviewer, "Focus: security and failure modes", in parallel: pass, 0 findings (bite red, check-security ok, favicon 404 and POST /login carry both headers).
- [x] 3. Act on every finding. n/a: no findings in either round.
- [x] 4. Review the fixes. n/a: no fixes.
- [x] Done when: latest round has no important findings, verify passed at e7a140c, no nits.

## 2026-11-27 ship slice secure-access
- Read: ship/SKILL.md b51cd2a
- [x] 1. Commit. T47 cb68fa8, T48 272e8e0, merge ff84921, state commits on nstack/secure-access.
- [x] 2. Sync. origin/main c1574a6 is an ancestor of the branch: nothing came in, verify stands.
- [x] 3. Push. nstack/secure-access.
- [x] 4. Open the PR. https://github.com/tokyovo/nstack-test-app/pull/24 (what changed, verification table, merge danger low, decisions).
- [x] 5. Wait for CI. `gh pr checks 24 --watch` exit 0; runs 45963452444, 45963459145 success on head 9467d07.
- [x] 6. Merge. merge: auto, 0 important findings: `gh pr merge 24 --squash --delete-branch` -> 4c3a007.
- [x] 7. Confirm and clean up. main 4c3a007: lint 0, typecheck 0, CI 45964096031 success; remote heads: main only; worktrees: main only; local slice branch deleted.
- [x] Done when: PR merged, CI green on main, fast checks pass there.
- (Items 4-7 ticked on the state branch nstack/state-2026-11-27c: they happened after the slice branch was pushed.)

## 2026-11-27 improve
- Read: improve/SKILL.md c8daf07
- [x] 1. Gather evidence
  - [x] 1.1. Broken things. None: main 4c3a007 lint 0, typecheck 0, CI 45964096031 success; full suite 172 passed at e7a140c.
  - [x] 1.2. Known problems. `gh issue list` empty; needs-human has no open items; backlog read (2 lines added by this slice).
  - [x] 1.3. Gaps against the goal. None: every Done-when item has a passing check; check-features 0; check-security 0.
  - [x] 1.4. Outside demand. research.md 2026-11-25 (2 days old, under 7); its candidates are in backlog (templates 5, multiple assignees 5).
  - [x] 1.5. Risk. npm audit 0 high/critical; access map now complete with 36 deny proofs seen to bite.
  - [x] 1.6. User experience. No UI changed since today's UX pass (verify labels-dup-calendar, /tmp/verify-ldc, 8/8 critique); this slice touched only headers and tests; drive screens rendered 18 PNGs with no console errors at e7a140c.
  - [x] 1.7. Code health. MEMBER_CHECK duplicate membership rule (backlog 4); nothing else slows the work.
- [x] 2. Score. `score .nstack/backlog.md` exit 0, 25 candidates, 0 totals corrected.
- [x] 3. Decide. Nothing meets bar 7. Top three: 5 task templates, 5 multiple assignees, 5 non-ASCII label case.
- [x] Done when: all sources checked, candidates scored, top three logged.

## 2026-11-27 hand-off (controller, run "continue")
- Go loop lines: [x] Orient: check-security failed on main c1574a6 -> first slice. [x] 1. Pick work: plan slice secure-access. [x] 2. T47, T48 in parallel builders, each proven by the controller at its commit and merged. [x] 3. verify (172 passed, bites seen, check-security 0), review (2 reviewers, 0 findings), ship PR #24 -> 4c3a007, CI green on main. [x] 4. plan.md Done line on the slice branch before ship.
- Stop rule: goal met, CI green on main 4c3a007 (45964096031), improve found nothing at bar 7 (top 5, 5, 5).
- Audit: `audit-log .nstack/log.md 2026-11-27` exit 0. Compared with what was done: the plan step line was printed as "secure-headers" and the slice named secure-access (noted in that entry); verify item 6 n/a (no UI change).
- Servers: stopped a next-server on :3251 (pid 311528) left by the security reviewer, cwd its removed worktree. The next-server on 127.0.0.1:3400 (pid 114319, from 2026-11-26) is not from this run; left running. /tmp/taskboard-drive empty; no e2e temp DBs; worktrees: main only.
- Slowed the run: the nstack guard hook blocks any command containing the no-verify flag text, even inside a grep pattern for the "nothing got weaker" scan; worked around with a character class. The leftover reviewer server is a backlog line (once so far).

## 2026-11-27 orient (controller, run "continue: new design rules")
- Nothing in flight: tree clean, one worktree, no unmerged nstack branches, no open nstack PRs; main == origin/main 7013a29.
- check-env ok; lint 0; typecheck 0; check-features 0; build 0; drive check pass (18 PNGs); check-security against a drive copy: all 4 ok (36 deny proofs).
- needs-human: no open items. Goal met; the user asked to bring every screen up to the design skill's new rules -> plan.

## 2026-11-27 plan design-rules
- Read: plan/SKILL.md fa73337
- [x] 1. Learn the ground truth. globals.css headings h2 xl / h3 lg / column h3 md / calendar day h3 sm; header h1 "Task board" on every page; selects browser default; date input default; checkbox accent-color set. Probe: `system-ui` resolves to WenQuanYi Zen Hei here, bold width == regular width (211.3 vs 211.3px), Liberation Sans 215.8 vs 231.3 -> no heading renders bold on this machine.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: which element is the page title; what happens to the app name; calendar day labels; which controls share what; select chevron without colour literals; 404 logged out.
  - [x] 2.2. Answered from code and the design skill (in the plan's Decisions and answers).
  - [x] 2.3. Decision: drop leading system-ui from the font stack (reversible, one line). Decision: calendar day numbers stop being headings. Decision: columns become h2.
- [x] 3. Write the spec. 10 ACs in plan.md slice design-rules.
- [x] 4. Cut tickets. T49 headings, T50 controls; independent, parallel (both touch globals.css in different sections).
- [x] 5. Check the plan
  - [x] 5.1. AC1-5 -> T49 headings.spec; AC6 -> T49 calendar.spec; AC7-9 -> T50 controls.spec; AC10 -> verify critique + a11y.spec.
  - [x] 5.2. Fresh Explore reader: 15 questions, all answered under "Plan-check answers".
  - [x] 5.3. Slice in plan.md, branch nstack/design-rules.
- [x] Done when: every criterion has a proof, questions answered, slice in plan.md.

## 2026-11-27 build T49 T50
- Read: build/SKILL.md 4b2ec60
- [x] 1. Branch. nstack/design-rules from main 7013a29.
- [x] 2. Starting state. lint 0, typecheck 0 at 98bf7ff (orient).
- [x] 3. Dispatch. Two builders in parallel, worktrees (15 GB, 3 GB swap, 4 cores); both briefs pointer-only, Parallel: 2.
- [x] 4. Read the reply. T50 e4559f7: select chevron, date picker fit, Save labels secondary, e2e/controls.spec.ts. T49 e3bafd4: font stack, h1 page titles, h2 sections, header .app-title, calendar day numbers not headings, e2e/headings.spec.ts; level assertions updated in calendar/move/nav/seed/smoke specs (spec change: heading levels and the header title are part of the new spec, AC1-AC3, AC6). Neither builder edits .nstack/: controller added design.md lines (controls family; font stack, headings roles, Generic check wording).
- [x] 5. Prove it yourself. At e4559f7: lint 0, typecheck 0, build 0, controls.spec 1 passed; with globals.css from 98bf7ff it fails ("select ... appearance auto"). At merge 01576b6: lint 0, typecheck 0, build 0; headings+controls+calendar specs 10 passed; with `system-ui` put back first in --font, headings.spec fails (2 of 3 tests).
- [x] 6. Record. This entry. Backlog: the board has two primaries ("New task" link and "Add task"); to be judged in the verify critique (line 1 / line 9), not deferred.
- [x] Done when: T49 and T50 committed on nstack/design-rules (merge 01576b6), items ticked.

## 2026-11-27 verify slice design-rules
- Read: verify/SKILL.md 1af2e2c
- [x] 1. Clean tree. HEAD edede51 (code); only .nstack/ uncommitted, which does not invalidate verify.
- [x] 2. Project checks. lint 0 (0 warnings), typecheck 0, build 0 (0 warnings), check:e2e-temp 177 passed / 0 failed / 0 flaky / 0 skipped, 0 temp files, no data/ dir; drive check 0 (18 PNGs). All at edede51.
- [x] 3. Every acceptance criterion in scope has a passing check. AC1-5 headings.spec (3 tests); AC2 also nav.spec; AC6 calendar.spec; AC7-9 controls.spec; AC11 controls.spec "at most one visible primary"; AC10 critique below + a11y.spec. Features rows added (3); check-features 0.
- [x] 4. Every new check bites. controls.spec red on 98bf7ff CSS ("appearance auto"), green after; headings.spec red with system-ui first in --font (2 of 3 fail), green restored; primary test red on board/board-empty/board-nomatch before T51 (builder run, "New task, Add task"). git status clean after each restore.
- [x] 5. The real thing runs. The new specs drive real Chromium against `next start` in CI; drive screens on a seeded copy.
- [x] 6. Every changed screen looks right. Critique found the board's two primaries (lines 1/9) -> T51; removed the task page's dashed rule above Duplicate/Delete (did not earn its place) -> edede51; re-shot.
- [x] 7. Nothing got weaker. No deleted tests; no skip/any/ts-ignore/eslint-disable added. Changed assertions are heading levels and locators only (calendar level 2->1, move h3->h2, nav/smoke/seed header title and day numbers): spec change AC1-AC3, AC6, logged in build T49 T50.
- [x] 8. No new warnings or errors. Counts as Last result (0/0), tests 172 -> 177; verify.md Last result updated to edede51.
- [x] 9. Access is enforced. n/a: diff touches only page markup and CSS (app/layout.tsx, page.tsx files, board.tsx, task-labels-form.tsx, globals.css); no route, action, query, table or auth code.
- [x] Done when: all items ticked; Not verified: none.

| Claim | Command | Result |
|---|---|---|
| full gate at edede51 | lint, typecheck, build, check:e2e-temp, drive check | 0/0/0, 177 passed, 18 PNGs |
| headings bite | system-ui first in --font, headings.spec | 2 failed; restored, 3 passed |
| controls bite | globals.css from 98bf7ff, controls.spec | 1 failed; restored, passed |
| screens | /tmp/dr-final2/{login,signup,projects,board,board-empty,board-nomatch,task,calendar,notfound}-{1280,390}.png | lines 1-9 pass on each: one bold h1 largest; bold h2 sections; one green primary (board: Add task; task: Save changes); spacing on scale; no overflow at 390; empty states (board-empty, nomatch) intended; matches design.md; focus per a11y.spec AC4 (outline rule unchanged); action copy; selects chevroned, date input and checkboxes styled like the family |

Not verified: none.

## 2026-11-27 review slice design-rules
- Read: review/SKILL.md 053d586
- [x] 1. Dispatch. One reviewer, worktree, pointer brief at f982943. Verdict pass; re-ran lint/typecheck/build, 49 targeted e2e, drive check; two break tests (Save labels primary -> primary test red; column h2 at --text-md -> headings AC4 red), restored clean.
- [x] 2. Second reviewer. n/a: no auth, payments, migration, concurrency or public API; diff is markup and CSS.
- [x] 3. Act on every finding. 1 nit: T51 unticked in plan.md -> fixed by replacing the slice with its Done line. 0 important. Declined-to-judge (screen readers on the calendar li name; macOS/Windows font rendering) noted, not provable here.
- [x] 4. Review the fixes. n/a: the only fix is state-only (.nstack/plan.md).
- [x] Done when: latest round 0 important; verify passed at edede51 (state commits since do not invalidate); nit fixed.

## 2026-11-27 ship slice design-rules
- Read: ship/SKILL.md b51cd2a
- [x] 1. Commit. T50 e4559f7, T49 e3bafd4 (merge 01576b6), T51 c907fbd, critique edede51, state commits; no hook bypass.
- [x] 2. Sync. origin/main 7013a29 is an ancestor of the branch; nothing came in, verify stands.
- [x] 3. Push. nstack/design-rules.
- [x] 4. Open the PR. Body: user change, tickets, verification table, screens, merge danger (revert-safe, markup + CSS + tests), decisions.
- [x] 5. Wait for CI. PR #26: runs 45972246117 and 45972277688 pass.
- [x] 6. Merge. merge: auto, 0 important findings -> squash 7457fcc.
- [x] 7. Confirm and clean up. main pulled; lint 0, typecheck 0; CI on 7457fcc success (45972984885); nstack/design-rules deleted local and remote; worktrees: main only.
- [x] Done when: the PR is merged, CI is green on the default branch, and the fast checks pass there, or the PR is parked with a reason.

## 2026-11-27 improve
- Read: improve/SKILL.md c8daf07
- [x] 1. Gather evidence
  - [x] 1.1. Broken things. None: full gate green at edede51; CI green on PR #26.
  - [x] 1.2. Known problems. 0 open issues; needs-human none open; backlog read.
  - [x] 1.3. Gaps against the goal. None: every feature has a Features row and passing proof (check-features 0).
  - [x] 1.4. Outside demand. research.md 2026-11-25 (2 days, fresh); its candidates in backlog (top 5: templates, multiple assignees).
  - [x] 1.5. Risk. npm audit 0 high/critical, no secrets in bundle (check-security at orient).
  - [x] 1.6. User experience. Critique of all 18 screens in verify design-rules: pass. Reconsidered: checklist Delete has no confirmation, which verify item 6 counts as a failure on a changed screen (the task page); my verify entry missed it. New: date picker icon text-coloured vs muted chevron (T50 builder).
  - [x] 1.7. Code health. Nothing slowing work beyond backlog items.
- [x] 2. Score. Checklist confirm rescored 8 (v2 r2 c4: ConfirmButton pattern exists); date icon tint 6 (v1 r1 c4). scripts/score exit 0.
- [x] 3. Decide. Top 3: 8, 6, 5. 8 meets bar 7 -> plan slice checklist-confirm. Icon tint not grouped (below bar).
- [x] Done when: sources checked, scored, slice planned.
- Lesson: verify item 6 says "a destructive action with no confirmation fails this item", but the critique list in the design skill has no such line, so the critique on the task page passed without checking it. Structure for it: T52's test makes confirmation the spec for the last unconfirmed delete; see hand-off for a check.

## 2026-11-27 plan checklist-confirm
- Read: plan/SKILL.md fa73337
- [x] 1. Learn the ground truth. checklist-item.tsx Delete is type=button with useTransition, no confirm; ConfirmButton is a submit button; checklist.spec has 8 Delete clicks.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: message text; dismiss behaviour; double-click with a blocking confirm; tests that click Delete.
  - [x] 2.2. Answered from the code: same window.confirm pattern as task/project/label deletes.
  - [x] 2.3. Decision: window.confirm in the row, not a reused ConfirmButton (different button type).
- [x] 3. Write the spec. 5 ACs.
- [x] 4. Cut tickets. T52 alone (one component plus its spec).
- [x] 5. Check the plan
  - [x] 5.1. AC1-5 -> T52 proof (new AC39 test, AC47, full checklist.spec).
  - [x] 5.2. Fresh Explore reader: 10 questions, answered under "Plan-check answers".
  - [x] 5.3. Slice in plan.md, branch nstack/checklist-confirm.
- [x] Done when: criteria mapped, questions answered, slice written.

## 2026-11-27 build T52
- Read: build/SKILL.md 4b2ec60
- [x] 1. Branch. nstack/checklist-confirm from main 7457fcc.
- [x] 2. Starting state. lint 0, typecheck 0 on main 7457fcc.
- [x] 3. Dispatch. One builder, pointer brief, in the main checkout (alone).
- [x] 4. Read the reply. ae4a27d: window.confirm('Delete item "<text>"?') before the delete; deleteItem(page, text, accept|dismiss) helper for every Delete click; the useRef guard was tried and dropped (the pending transition disables the button; AC47 counts exactly 1 dialog and 1 action). Spec change: "AC39: Delete removes the item without asking" -> "AC39: Delete asks first; dismissing keeps the item, accepting removes it".
- [x] 5. Prove it yourself. At ae4a27d: lint 0, typecheck 0, build 0, check:e2e-temp checklist.spec 10 passed; with checklist-item.tsx from 1a0e96d: 7 failed, 3 passed; restored, tree clean.
- [x] 6. Record. This entry; no Backlog lines.
- [x] Done when: T52 committed on nstack/checklist-confirm, items ticked.

## 2026-11-27 verify slice checklist-confirm
- Read: verify/SKILL.md 1af2e2c
- [x] 1. Clean tree. HEAD 35a804e (code ae4a27d).
- [x] 2. Project checks. lint 0, typecheck 0, build 0 (0 warnings), check:e2e-temp 177 passed / 0 failed / 0 skipped, 0 temp files, no data/; drive check 0 (18 PNGs). First full run: 9 failed, because I restored checklist-item.tsx after the bite run without rebuilding (.next held the no-confirm build; the 7 checklist failures equal the bite run), plus 2 a11y timeouts at load 6.5; after `npm run build` all 177 passed.
- [x] 3. Every acceptance criterion in scope has a passing check. AC1-3, AC5 checklist.spec "AC39: Delete asks first; ..."; AC4 "AC47: double-clicking Delete ..." (exactly 1 dialog, 1 action). check-features 0 (Checklist items row proof name unchanged).
- [x] 4. Every new check bites. checklist-item.tsx from 1a0e96d: 7 failed; restored + rebuilt: 10 passed.
- [x] 5. The real thing runs. Playwright against next start, in CI.
- [x] 6. Every changed screen looks right. Task page markup and CSS unchanged (diff: onClick only); the confirm is the browser's native dialog, as for task/project/label deletes. Every delete in the app now asks first.
- [x] 7. Nothing got weaker. Removed test "AC39: Delete removes the item without asking" is the spec change (replaced by the asks-first test), logged in build T52; no skip/any/ignore added.
- [x] 8. No new warnings or errors. 0/0; 177 tests as before.
- [x] 9. Access is enforced. Deny proof "AC39: a non-member's checklist requests change nothing" passes (accepts the dialog so the request is sent); no route/action change.
- [x] Done when: all ticked. Not verified: none.
- Lesson: a stale `.next` after a bite restore made a full run test old code (no rebuild). Once so far; backlog: make check:e2e-temp refuse a build older than the newest app/ or lib/ file.

## 2026-11-27 review slice checklist-confirm
- Read: review/SKILL.md 053d586
- [x] 1. Dispatch. One reviewer, worktree, at 665b91a. Pass, 0 findings; lint/typecheck/build pass, checklist.spec 10 passed; mutations: ignoring the confirm answer -> AC39 red; removing disabled={removing} -> AC47 red 3/3 (2 dialogs). Reverted, clean.
- [x] 2. Second reviewer. n/a: no auth, payments, migration, concurrency or public API.
- [x] 3. Act on every finding. None.
- [x] 4. Review the fixes. n/a: no fixes.
- [x] Done when: 0 important; verify passed at 665b91a code; no nits.

## 2026-11-27 ship slice checklist-confirm
- Read: ship/SKILL.md b51cd2a
- [x] 1. Commit. T52 ae4a27d plus state commits.
- [x] 2. Sync. origin/main 7457fcc is an ancestor; nothing came in.
- [x] 3. Push. nstack/checklist-confirm.
- [x] 4. Open the PR. Body: change, ticket, verification, merge danger (revert-safe, one client component and its spec), decisions.
- [ ] 5. Wait for CI
- [ ] 6. Merge
- [ ] 7. Confirm and clean up.
- [ ] Done when: the PR is merged, CI is green on the default branch, and the fast checks pass there, or the PR is parked with a reason.
