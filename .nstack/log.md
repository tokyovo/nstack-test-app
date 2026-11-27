# Log


Entries before 2026-11-27 are in git history: `git log -p .nstack/log.md`.

## 2026-11-27 go continue
- Read: go/SKILL.md abef3d4
- [x] 1. Never wait on a person. no person needed so far.
- [x] 2. Nothing is done until it is proven. see verify/ship entries.
- [x] 3. Smallest change that meets the goal. slice drive-tool replaces two scripts with one tool, no product code.
- [x] 4. Fix root causes. n/a: no workaround taken.
- [x] 5. State lives in files. state committed on nstack/drive-tool.
- [x] 6. Guard the context window. builders and reviewers got file pointers.
- [x] 7. Start every step with `step`. each step below has its Read line.
- [x] 8. Turn lessons into structure. `drive check` added to CI so the drive section cannot silently rot.
- [x] 1. n/a: existing project.
- [x] 2. n/a: existing project.
- [x] 3. n/a: existing project (Drive/Features handled under Orient 5).
- [x] 4. n/a: existing project (missing drive tool handled under Orient 4).
- [x] 1. git status clean on main, synced with origin; one worktree; no unmerged nstack/* branches; no open nstack PRs.
- [x] 2. Last entry (2026-11-26 hand-off) fully ticked; nothing to resume.
- [x] 3. n/a: main has no local-only commits.
- [x] 4. lint pass, typecheck pass on main d52bc4c; `drive check`: no drive tool (npm error); check-features: "no Features table". -> first ticket: slice drive-tool.
- [x] 5. verify.md lacks check table, drive tool and Features section, has per-ticket proof chains -> T36. goal.md has all four policy settings.
- [x] 6. needs-human.md: no open items; plan.md: no parked tickets.
- [x] 1. n/a: request is `continue`, not `maintain`.
- [x] 2. n/a: not maintain.
- [x] 3. n/a: not maintain.
- [x] 4. n/a: not maintain.
- Loop lines 1-4: ticked in the hand-off entry.

## 2026-11-27 plan slice drive-tool
- Read: plan/SKILL.md 4e0b788
- [x] 1. Learn the ground truth. Read scripts/{screens,seed,seed-app,e2e-temp-check}.mts, package.json, playwright.config.ts webServer, ci.yml, verify.md, go/references/state.md.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: state location, how to pick port, stale instances, build-if-needed, what check does on failure, CI placement, verify.md layout.
  - [x] 2.2. Answered from state.md format and existing scripts (screens behavior kept as-is).
  - [x] 2.3. Decisions logged below.
- [x] 3. Write the spec. Slice drive-tool, AC1-9 in plan.md.
- [x] 4. Cut tickets. T35 (tool), T36 (verify.md).
- [x] 5. Check the plan
  - [x] 5.1. AC1-8 -> T35 proof; AC9 -> T36 proof.
  - [x] 5.2. Fresh Explore agent listed 12 questions; all answered in plan.md "Answers".
  - [x] 5.3. Slice in plan.md, branch nstack/drive-tool.
- [x] Done when: met.
- Decision: instance state in `<os tmp>/taskboard-drive/<port>.json` because it allows several copies and needs no gitignore change.
- Decision: remove seed.mts/screens.mts rather than keep them beside drive (rule 3: remove before add).
- Decision: "builds if needed" = `.next/BUILD_ID` missing; stale builds need `--build`. Simplest, easy to tighten later.

## 2026-11-27 build T35
- Read: build/SKILL.md 42e2412
- [x] 1. Branch. nstack/drive-tool from d52bc4c.
- [x] 2. Starting state. lint exit 0, typecheck exit 0 (main d52bc4c).
- [x] 3. Dispatch. fresh nstack:builder with the pointer brief.
- [x] 4. Read the reply. done at e65299e; scripts/drive.mts (496 lines), package.json drive script, seed/screens removed, CI step added.
- [x] 5. Prove it yourself. At e65299e, exit codes taken unpiped: `drive --help` 0; unknown command 2; `seed` with nothing running 1 ("run `npm run drive -- start`"); `drive check --json` 0, 5 steps ok; `start --json` 0 (one JSON line), `stop --dry-run --json` 0 with port still listening, `stop --port N --json` 0 then port closed; mutant (console.error on board page in shoot) -> `check` exit 1, screens failed, stop ok, 0 temp dirs/state files/ports left; reverted, `git diff --stat` empty; AC7 grep exit 1 (no matches); lint 0; typecheck 0; `npx playwright test e2e/seed.spec.ts` 1 passed; no `data/`.
- [x] 6. Record. this entry; backlog line added (Ctrl-C during check).
- [x] Done when: committed e65299e, items ticked.
- Note: a `next-server` on 127.0.0.1:3400 (pid 114319, started 2026-11-26 20:04, beside a cloudflared tunnel pid 114277) is not nstack's (last hand-off found none listening); left untouched.

## 2026-11-27 build T36
- Read: build/SKILL.md 42e2412 (same file, this run)
- [x] 1. Branch. nstack/drive-tool.
- [x] 2. Starting state. lint 0, typecheck 0 at e65299e (T35 entry).
- [x] 3. Dispatch. n/a: T36 edits only `.nstack/verify.md`, which builders may not edit; the controller wrote it from `grep` of every e2e test title.
- [x] 4. Read the reply. n/a: no builder.
- [x] 5. Prove it yourself. `check-features .nstack/verify.md` exit 0 (36 rows); scratch copy `<tmp>/x/.nstack/verify.md` with e2e symlinked and one test name altered: exit 1 "missing test: Overdue marker". Seed row contents checked against scripts/seed-app.mts (labels, checklist).
- [x] 6. Record. this entry; per-ticket Proof chain sections removed (evidence is in log.md and git history).
- [x] Done when: committed with the state commit below.

## 2026-11-27 verify slice drive-tool
- Read: verify/SKILL.md 7f18bc2
- [x] 1. Clean tree. `git status` empty; HEAD 14474dc.
- [x] 2. Project checks. `rm -rf .next`; lint 0; typecheck 0; build 0 (0 warnings); `E2E_PORT=3227 npm run check:e2e-temp` exit 0, 119 passed, 0 skipped/flaky, 0 temp files; `drive check` exit 0, 5 steps; no `data/`.
- [x] 3. Every acceptance criterion in scope has a passing check. AC1-6: T35 commands (log above) at e65299e, scripts/package.json/ci.yml unchanged since (`git diff --quiet e65299e HEAD` 0) + `drive check` 0 at 14474dc; AC7: grep exit 1, seed.spec in the 119; AC8: ci.yml step, runs on the PR; AC9: check-features exit 0.
- [x] 4. Every new check bites. `drive check` red (exit 1) with a console.error mutant, restored, green; check-features red (exit 1) on a scratch copy with an altered test name. No new e2e tests.
- [x] 5. The real thing runs. `drive check` starts the real app, seeds through the UI, screenshots 10 pages; start/seed/stop run by hand in T35. The drive tool is a CLI, run as a user would.
- [x] 6. Every changed screen looks right. n/a: no product UI change (scripts and state only).
- [x] 7. Nothing got weaker. diff d52bc4c...HEAD: no test files changed; no any/ts-ignore/eslint-disable/skip added (grep exit 1).
- [x] 8. No new warnings or errors. 0 lint warnings, 0 build warnings, 119 tests as before (c724786: 119); verify.md Last result updated.
- [x] Done when: met. Not verified: CI's new drive step until the PR runs (ship waits for it).

| Claim | Command | Result |
|---|---|---|
| suite unchanged | `E2E_PORT=3227 npm run check:e2e-temp` | 119 passed, 0 temp files |
| drive works | `npm run drive -- check` | 5 steps ok, exit 0 |
| drive check bites | console.error mutant in shoot() | exit 1, cleaned up |
| features map true | `check-features .nstack/verify.md` | exit 0; altered copy exit 1 |
| screens | n/a: no UI change | - |

## 2026-11-27 review slice drive-tool
- Read: review/SKILL.md d8023cf
- [x] 1. Dispatch. nstack:reviewer in a worktree at f7960fc: 1 important (pruning rm -rf's any dir a state file names, also under --dry-run; state dir 0775), 2 nits (malformed state file crashes; `toString` etc. print nothing).
- [x] 2. Second reviewer. n/a: no auth, payments, migrations or public API; the important finding was a failure-mode one and its fix gets its own round.
- [x] 3. Act on every finding. Fresh builder (debug skill) fixed all three at 0e54c27, with e2e/drive.spec.ts (6 tests). Controller: repros rerun (victim dir kept under --dry-run and without; bad JSON -> one line, exit 0; toString -> exit 2 with command list); drive.spec red with f7960fc's drive.mts (6 failed), restored; full gate at 0e54c27: lint 0, typecheck 0, build 0 (0 warnings), check:e2e-temp 0 (125 passed, 0 temp files), drive check 0, no `data/`, check-features 0 (new row for drive.spec). Backlog: pid reuse (below).
- Round 2: nstack:reviewer at 62fd64c: 1 important (start creates the state dir after spawning, so a failure there orphans the server and temp dir; AC6), 2 nits (no fetch timeout; verify.md cites 0e54c27). Fresh builder (debug) fixed at 53a101e (+68/-14): state dir checked before spawn, failure after spawn kills the group and removes the dir, per-request AbortSignal.timeout, 2 new drive tests. Controller: the 2 new tests red with 62fd64c's drive.mts (2 failed, 6 passed; 2 leaked servers from the old code killed by pid group), restored; full gate at 53a101e: lint 0, typecheck 0, build 0 (0 warnings), check:e2e-temp 0 (127 passed, 0 temp files), drive check 0, check-features 0, no `data/`, no stray servers. Nit 3 fixed (results now cite 53a101e).
- Round 3: nstack:reviewer at de7020a: pass, no important findings; 2 nits (double seed in check; stop --all stops at first failure) -> backlog.md.
- [x] 4. Review the fixes. Round 2 reviewed round 1's fix; round 3 reviewed round 2's fix; latest round clean. Verify last passed at 53a101e (later commits change only .nstack/).
- [x] Done when: met. Worktrees removed.

## 2026-11-27 ship slice drive-tool
- Read: ship/SKILL.md 47e5182
- [x] 1. Commit. T35-T36, 2 review-fix commits and state on nstack/drive-tool.
- [x] 2. Sync. 0 new commits on origin/main.
- [x] 3. Push. done.
- [x] 4. Open the PR. https://github.com/tokyovo/nstack-test-app/pull/17
- [x] 5. Wait for CI. runs 45929754375, 45929758508 pass; 127 passed; drive check step 5/5 ok in CI.
- [x] 6. Merge. `merge: auto`, latest review clean: squash-merged as cd4603a.
- [x] 7. Confirm and clean up. main at cd4603a: lint 0, typecheck 0; CI run 45930318735 success; remote branch deleted (only main on origin); no worktrees.
- [x] Done when: met.

## 2026-11-27 improve
- Read: improve/SKILL.md 16dccd7
- [x] 1. Gather evidence
  - [x] 1.1. Broken things. CI on main cd4603a green (run 45930318735: 127 passed, drive check 5/5); local gate at 53a101e: 0 warnings.
  - [x] 1.2. Known problems. `gh issue list`: none open; needs-human: no open items; backlog read (new drive nits added this run).
  - [x] 1.3. Gaps against the goal. None: every feature has a Features row with a passing e2e test; CI green on main.
  - [x] 1.4. Outside demand. research.md dated 2026-11-25 (2 days, <7); its candidates already in backlog.md (duplicate 6, calendar 5, multiple assignees 5).
  - [x] 1.5. Risk. `npm audit` 0 vulnerabilities (all and --omit=dev); drive tool reviewed 3 rounds; no new input paths.
  - [x] 1.6. User experience. `drive start` + `drive screens /tmp/imp-shots` exit 0, 10 PNGs; looked at board-1280 and task-390: all flows render, no overflow; new candidate "looks plain" (browser-default controls) scored 5.
  - [x] 1.7. Code health. Nothing slowing the work; drive nits in backlog.
- [x] 2. Score. backlog normalized (malformed favicon line fixed, rejected items moved to `## Rejected`, shipped tooling line removed); `improve/scripts/score`: 22 candidates, 0 totals corrected.
- [x] 3. Decide. Nothing meets bar 7. Top three: 6 duplicate task, 6 header link hint + 404 font, 6 label rename/delete/colors. Stop.
- [x] Done when: met.

## 2026-11-27 hand-off (controller)
- Go loop lines: [x] 1. Pick work: no open slice, Orient found no drive tool/Features -> planned slice drive-tool. [x] 2. Each ticket: T35 (builder), T36 (controller, state file), each proven. [x] 3. verify, review (3 rounds), ship PR #17. [x] 4. Recorded: plan.md Done line on the slice branch before ship; lessons below.
- Audit: `audit-log .nstack/log.md 2026-11-27` exit 0 (no missing Read lines, no unticked items). Compared with what was done: T36 was written by the controller, not a builder (logged as n/a with reason); verify's AC1-6 evidence for T35 came from hand-run commands plus `drive check`, and later the 8 drive tests.
- Servers: none of ours listening (only the foreign next-server on 3400, pid 114319, untouched); no worktrees; /tmp/taskboard-drive empty; temp logs removed.
- log.md trimmed to this run (was 794 lines).
- Lesson: two review rounds found the drive tool leaving servers or deleting files on failure paths; e2e/drive.spec.ts (8 tests) now covers those paths and `drive check` runs in CI, so the next regression fails CI instead of needing a reviewer.
- Slowed the run: nstack's verify.md format changed (table, Drive, Features), which cost a whole slice; `drive screens` needs `drive start` first, which the error message says.
- After merge of PR #18 (efcd1aa): CI run 45931652688 never started (GitHub billing: failed payment or spending limit). Rerun once: same. Parked in needs-human.md. efcd1aa's tree equals PR #18 head 507f78c (git diff --quiet exit 0), which passed CI; last code commit cd4603a green on main (45930318735). This entry is on nstack/state-park-2026-11-27, PR left open because its CI cannot run either.

## 2026-11-27 go continue (controller): orient
- In flight: PR #19 (nstack/state-park-2026-11-27, state only) open; no worktrees, no other nstack branches, main == origin/main.
- Parked retry: `gh run view 45931652688 --json conclusion -q .conclusion` -> success (billing fixed). Resolved in needs-human.md; PR #19 CI green (45931744049).
- Verification on main efcd1aa: lint 0, typecheck 0, build ok, `drive check` exit 0 (5 steps, 10 PNGs), `check-features` exit 0.
- Formats: no `.nstack/design.md` for a UI app -> per go Orient 4-5 the next slice follows design (direction, then restyle main screens).

## 2026-11-27 improve
- Read: improve/SKILL.md c8daf07
- [x] 1. Gather evidence
  - [x] 1.1. Broken things. None: lint/typecheck/build/drive check pass on main efcd1aa; CI green on main (45931652688) and PR #19.
  - [x] 1.2. Known problems. `gh issue list` empty; needs-human billing item now passes (resolved, PR #19 merged 344be19); backlog.md read (22 open).
  - [x] 1.3. Gaps against the goal. None: every Features row has a proof (`check-features` exit 0), CI green on main.
  - [x] 1.4. Outside demand. research.md dated 2026-11-25 (2 days, under 7); its candidates are already in backlog.md (duplicate task 6, calendar 5, multiple assignees 5).
  - [x] 1.5. Risk. `npm audit` 0 vulnerabilities; no new input paths since slice 11.
  - [x] 1.6. User experience. `drive screens /tmp/design-before`: board and task pages are browser defaults (default buttons/selects, bulleted label/member lists, red side stripe on overdue card, raw UTC comment time); no `.nstack/design.md` exists, which go Orient 4 requires for a UI app.
  - [x] 1.7. Code health. n/a: nothing in the backlog's code-health lines slows the next slice.
- [x] 2. Score. "Looks plain" rescored v4 r2 c2 = 8 (was v2: goal.md defines users of a team tool; go Orient 4 makes design.md + restyle mandatory for a UI app), grouped with header-link hint/404 (6), search height (6), comment timestamps (5) which touch the same screens.
- [x] 3. Decide. 8 >= bar 7 -> slice `design` planned (see plan entry).
- [x] Done when: all sources checked, candidates scored, slice planned.
- Decision: design slice before any feature work because go Orient 4 requires design.md for a UI app and the UX pass shows default-styled screens.

## 2026-11-27 plan
- Read: plan/SKILL.md 4e0b788
- [x] 1. Learn the ground truth. Plain CSS in app/globals.css (223 lines, system-ui), 19 classNames, no inline styles; screens from verify.md Drive; board.tsx column regions named by `<h3 id>` (aria-labelledby); 404s via notFound() with Next's default page.
- [x] 2. Interrogate the goal yourself
  - [x] 2.1. Questions: font source, comment time zone, where the column count goes, danger colour vs asserted alert colour, 404 page content, which links need 44 px, how to prove focus, ticket order.
  - [x] 2.2. Answered from code: alert colour rgb(185,28,28) asserted in 3 specs; region names used by e2e/helpers.ts:47; datetime('now') is UTC.
  - [x] 2.3. Decisions logged in the slice (5 Decision lines in plan.md).
- [x] 3. Write the spec. Slice design, 10 acceptance criteria, out of scope listed; CSS modules considered and rejected (one line why).
- [x] 4. Cut tickets. T37 base+harness (riskiest: axe + token lint), T38 board, T39 task page, T40 projects; sequential (all edit globals.css).
- [x] 5. Check the plan
  - [x] 5.1. Criteria-to-proofs line in the slice; every AC has a ticket proof.
  - [x] 5.2. Fresh Explore subagent read /tmp/slice12-plan.md + code: 15 questions (count vs region name, danger colour vs tests, count of visible vs all, keyboard move refresh, timestamp parsing/format/regex, UTC suffix, drive screens lacks 404/empty/no-match, 404 logged in/out, not-found main, focus test page, 44 px exemptions, progress bar a11y, overdue markup, grid vs AC43/AC44, lint script rules); each answered in AC3-AC8, AC10, T37, T38 or a Decision.
  - [x] 5.3. Slice written to plan.md with branch nstack/design.
- [x] Done when: every criterion has a proof, the reader's questions are answered, the slice is in plan.md.

## 2026-11-27 build T37
- Read: build/SKILL.md 13386ea
- [x] 1. Branch. nstack/design from main 344be19.
- [x] 2. Starting state. lint 0, typecheck 0 on main efcd1aa/344be19 (same code; branch adds only .nstack/).
- [x] 3. Dispatch. Fresh nstack:builder with the pointer brief.
- [x] 4. Read the reply. Done: f60d337 + 6792ffe (critique fixes: header height logged in/out, 404 orphan word).
- [x] 5. Prove it yourself. At 6792ffe: lint 0 (incl. check-css-tokens), typecheck 0, build 0 (0 warnings), `check:e2e-temp` 0 (134 passed, 0 temp files, no data/), `drive check` 0 (12 PNGs), `check-features` 0. Looked at /tmp/t37-shots/login-1280.png: tokens applied, primary button accent.
- [x] 6. Record. verify.md rows/Drive updated (6 screens, 12 PNGs; 3 Features rows); backlog lines added.
- [x] Done when: T37 committed on nstack/design (6792ffe), items 1-6 ticked.
- Decision (builder): derived tokens accent-hover, danger-hover, accent-soft, danger-soft and control edge #8A939C because border #D5D9DD gives control edges ~1.4:1 (needs 3:1). Controls 2.5rem, 2.75rem at <=640px.
- Note: AC4 focus test passed before the CSS (Chromium's default ring); it guards against later removal.

## 2026-11-27 build T38
- Read: build/SKILL.md 13386ea
- [x] 1. Branch. nstack/design.
- [x] 2. Starting state. lint 0, typecheck 0 at 6792ffe (T37 proof).
- [x] 3. Dispatch. Fresh nstack:builder with the pointer brief (+ design.md).
- [x] 4. Read the reply. Done: 00652bd (AC6 count, red->green), 203afd3 (restyle, drive screens board-empty/board-nomatch), 724980f (critique fixes: filter text 16px, stacked headings spaced, empty-project pointer + test; removed the danger border on overdue cards).
- [x] 5. Prove it yourself. At 724980f: lint 0, typecheck 0, build 0, `check:e2e-temp` 0 (138 passed), `drive check` 0 (16 PNGs), `check-features` 0. Looked at /tmp/t38-shots/board-1280.png: title row with secondary exports + primary New task, counted columns, overdue badge, checklist bar, dimmed Done card, three sections below.
- [x] 6. Record. verify.md Drive (8 screens, 16 PNGs), result rows, Features rows for AC5/AC6; backlog line added.
- [x] Done when: T38 committed on nstack/design (724980f), items 1-6 ticked.
- Decision (builder): count is a bare-number span (no aria-label; axe flags aria-label on a span). Done cards use background colour + muted title, not opacity. Add task submit is primary; Create label/Invite secondary. a11y setup moves its card by keyboard (drag of an off-screen card timed out; move.spec drag tests pass).

## 2026-11-27 build T39
- Read: build/SKILL.md 13386ea
- [x] 1. Branch. nstack/design.
- [x] 2. Starting state. lint 0, typecheck 0 at 724980f (T38 proof).
- [x] 3. Dispatch. Fresh nstack:builder with the pointer brief (+ design.md).
- [x] 4. Read the reply. Done: 3214a22 (AC7, red on raw "2026-11-27 04:37:25" then green), a907aa4 (task page restyle; critique 8/8 at both widths, /tmp/t39-after). Builder did not hand-shoot form error states or tab through by hand (global [role=alert] and :focus-visible cover them); left for verify's critique.
- [x] 5. Prove it yourself. At a907aa4: lint 0, typecheck 0, build 0, `check:e2e-temp` 0 (140 passed), `drive check` 0 (16 PNGs), `check-features` 0. Looked at /tmp/t39-after/task-1280.png: details panel, ruled sections, primary saves, danger Delete task apart, comment "27 Nov 2026, 04:40 UTC"; label checkboxes sit slightly above their text.
- [x] 6. Record. verify.md results + AC7 Features row; backlog: newlines collapse (4); plan T40 extended with the duplicate chip CSS (builder finding) and checkbox alignment.
- [x] Done when: T39 committed on nstack/design (a907aa4), items 1-6 ticked.
- Decision (builder): comment times parsed at the DB boundary (lib/comments.ts). Only Save changes/Save labels primary. ConfirmButton takes an optional className; new `.quiet` button modifier.
