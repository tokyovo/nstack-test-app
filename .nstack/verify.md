# Verify

Run from the repo root. Needs Node 24, `npm ci`, and Chromium for Playwright 1.65.0 (`npx playwright install chromium`; CI uses `--with-deps`).

## Fast checks
- `npm run lint` — ESLint (eslint-config-next core-web-vitals + typescript). 2026-11-25 T1: pass, 0 problems.
- `npm run typecheck` — `next typegen && tsc --noEmit`. 2026-11-25 T1: pass.

## Full checks
- `npm run build` — `next build` (production). 2026-11-25 T1: pass.
- `npm run test:e2e` — Playwright, Chromium headless. Starts `next start -p 3100` on the existing build (run `npm run build` first) with `DATABASE_PATH` set to a fresh temp SQLite file per run; tests read the same file via `process.env.E2E_DATABASE_PATH`. 2026-11-25 T1: 2 passed (e2e/smoke.spec.ts).
- `npm run check:e2e-temp [-- <playwright args>]` — runs `playwright test`, then exits 1 if any `taskboard-e2e-<that run's pid>-*` file (db, -wal, -shm) is left in the OS temp dir (AC31); else the suite's exit code. 2026-11-25 T22: 0 left.

## Proof chain (T1)
- `npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T1: exit 0; no `data/` dir created (tests isolated from dev DB).

## Proof chain (T2)
- `npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T2: exit 0, 11 passed (e2e/auth.spec.ts AC1-4 + smoke); no `data/` dir created. AC4 test shown red against a plain-text-storing build.

## Proof chain (T3)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T3: exit 0, 18 passed (e2e/projects.spec.ts AC5-6 + auth + smoke); no `data/` dir. AC6 test shown red with the membership check removed from getProject.

## Proof chain (T4)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T4: exit 0, 21 passed (e2e/invite.spec.ts AC7 + earlier); no `data/` dir. Invite tests shown red (no invite form) before the code.

## Proof chain (T5)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T5: exit 0, 27 passed (e2e/tasks.spec.ts AC8 + earlier); no `data/` dir. Task tests shown red (no board/form) before the code; tamper test shown red with the assignee member check disabled.

## Proof chain (T6)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T6: exit 0, 31 passed (e2e/move.spec.ts AC9-10 + earlier); no `data/` dir. Drag/key tests shown red (cards did not move) before the code; each tamper test shown red with its own guard removed (membership check, task-in-project check).

## CI
- `.github/workflows/ci.yml`: on push and pull_request, ubuntu-latest, Node 24: npm ci, playwright install --with-deps chromium, lint, typecheck, build, test:e2e. 2026-11-25: green on PR #1 (runs 45536064790, 45536071126) and on main at e2ecb58 (run 45541011124, 41 passed).

## Proof chain (T6 review fixes)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25: exit 0, 34 passed; no `data/` dir. Focus test shown red before the fix; task-create and invite tamper tests each shown red with their own getProject guard removed.

## Proof chain (T7)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T7: exit 0, 40 passed (e2e/comments.spec.ts AC11 + earlier); no `data/` dir. Comment tests shown red (no task link) before the code; each tamper test shown red with its own guard removed (membership check in getTask, task-in-project condition).

## Proof chain (T8)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T8: exit 0, 41 passed (e2e/search.spec.ts AC12 + earlier); no `data/` dir. Search test shown red (no search box) before the code.

## Proof chain (T9)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T9: exit 0, 42 passed (e2e/projects.spec.ts AC14 + earlier); no `data/` dir. AC14 tests shown red (no dialog) before the code; dismiss test shown red with the preventDefault removed.

## Proof chain (T10)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T10: exit 0, 46 passed (e2e/layout.spec.ts AC15 + earlier); no `data/` dir. Side-by-side, long-text and cap tests shown red before the code; 390px test shown red against a fixed-width-grid mutant.

## Proof chain (T11)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T11: exit 0, 47 passed (e2e/overdue.spec.ts AC16 + earlier); no `data/` dir. AC16 test shown red (no "Overdue") before the code; shown red with the Done exclusion removed from isOverdue.
- 2026-11-25 T11 review fix: that test was flaky (reviewer saw 54 passed / 1 failed under full-suite load: "Finished task" still Overdue after reload). Cause: it reloaded after the optimistic Done count, before the second move's server action had been stored. Reproduced deterministically by delaying the Done move request 1.5s (same failure). Fix: `persistedMove` in e2e/helpers.ts waits for each move's server-action response; used in overdue.spec.ts and every move-then-reload in move.spec.ts. Same delayed run then passed; `npx playwright test e2e/overdue.spec.ts e2e/move.spec.ts --repeat-each=10 --workers=4`: 60 passed.

## Proof chain (T12)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T12: exit 0, 55 passed (e2e/edit-task.spec.ts AC17 + earlier); no `data/` dir. Edit and delete tests shown red (no form/button) before the code; each tamper test shown red with its own guard removed (getProject check, task-in-project condition) in updateTask and deleteTask.

## Proof chain (slice 2 CI fix)
- 2026-11-25: PR #2 CI failed 2 AC15 tests at 390px (page 402/405 wide); local runs passed. Cause (CI trace screenshot): the Assignee `<select>` is as wide as its longest option (a member's email); its `max-width: 100%` did not resolve inside a shrink-to-fit inline-block label, and CI fonts are wider. New test (member with a long email, 390px, board + task page) red locally first (750 > 390). Fix: `max-width: 100%` on `form label`. `rm -rf .next; lint && typecheck && build && test:e2e` exit 0, 56 passed, no `data/`.

## Proof chain (T14)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3114 npm run test:e2e` — 2026-11-25 T14: exit 0, 59 passed (e2e/session-expiry.spec.ts AC19 + earlier); no `data/` dir. 31-day and cookie-expiry tests shown red (session accepted; cookie had no expiry) before the code. `E2E_SECURE_COOKIES=1 npx playwright test e2e/session-expiry.spec.ts e2e/auth.spec.ts`: 13 passed (Secure cookie in the production build, auth flows still work on localhost); cookie test shown red with `secure` forced false.
- `E2E_PORT` (default 3100) picks the e2e server port; `E2E_SECURE_COOKIES=1` drops the webServer's `INSECURE_COOKIES=1`.
## Proof chain (T15)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T15: exit 0, 61 passed (e2e/keep-values.spec.ts AC20 + earlier); no `data/` dir. AC20 tests shown red (fields cleared or reset) before the code; assignee check shown red without the select key.
## Proof chain (T16)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T16: exit 0, 66 passed (e2e/assignee-filter.spec.ts AC21 + earlier); no `data/` dir. AC21 tests shown red (no filter) before the code; both shown red with the search/filter AND changed to OR.

## Proof chain (T17)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3117 npm run test:e2e` — 2026-11-25 T17: exit 0, 67 passed (e2e/seed.spec.ts AC22 + earlier); no `data/` dir. AC22 test red against a stub seed; red with the task-exists check removed (duplicate tasks) and with the overdue due date made future.
- AC23: isolated server (`next start -p 3417`, mktemp DB), `BASE_URL=http://localhost:3417 npm run seed` twice (same output, exit 0), then `npm run screens -- $D/shots`: exit 0, `ls` 10 files, all non-empty. Mutant logging `console.error` on each page: exit 1 with the errors listed.
- Scripts are `scripts/*.mts` run by Node 24 type stripping (`.mts`, so Node does not warn about a typeless package.json); tsconfig has `allowImportingTsExtensions` and includes `**/*.mts`, so lint and typecheck cover them.

## Proof chain (slice 3, controller)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` at 299a094 (T13-T16 merged) — 2026-11-25: exit 0, 66 passed; no `data/` dir.

## Proof chain (T18)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3118 npm run test:e2e` — 2026-11-25 T18: exit 0, 71 passed (e2e/forms-layout.spec.ts AC24-26 + earlier, AC15 layout tests unchanged and green); no `data/` dir. AC24 and AC26 tests shown red (label text bottom 163 > field top 138; row centers 27px apart) before the code; AC25 shown red with the field width rule removed (title 160px < 280) and with selects left out of it (assignee 719px > 512, long-email member).
- AC27 screens: isolated `next start -p 3418` + mktemp DB, `BASE_URL=http://localhost:3418 npm run screens -- $D/shots`: exit 0, 10 non-empty PNGs (kept in /tmp/tmp.gH28IFPH9w/shots/). Reviewed login/signup/projects/board/task at 1280 and 390: labels above fields, fields 512px (full width at 390), project rows on one line at 1280 (wrap under the link at 390), no overflow.

## Proof chain (T19)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3119 npm run test:e2e` — 2026-11-25 T19: lint, typecheck, build pass; e2e 73 passed, 2 failed on 30s timeouts (edit-task AC17, seed AC22) with load average 10 on 2 cores (parallel builders); no `data/` dir. Reruns: nav+smoke+edit-task+seed 14 passed (seed again timed out); seed alone with `--timeout=120000` passed in 34.2s. e2e/nav.spec.ts (AC28): logged-in tests shown red (no link) before the code; logged-out tests shown red against an always-link mutant.
## Proof chain (T22)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3122 npm run test:e2e` — 2026-11-25 T22: exit 0, 71 passed; no `data/` dir. AC31: `E2E_PORT=3122 npm run check:e2e-temp -- e2e/smoke.spec.ts` red with playwright.config.ts at HEAD (exit 1, .db/-shm/-wal of the run left), green with the teardown (0 left, exit 0). Full suite via `check:e2e-temp` twice: 0 left both times, but exit 1 from one AC22 seed timeout each (30s limit, test takes 19-29s on this 2-CPU box at load 8 with a parallel builder; passes alone, see backlog). Teardown runs after a failed test too. Caller-set `E2E_DATABASE_PATH` kept.

## Drive
How an agent runs and uses the app on its own, without touching anyone's data. Each value below was run on 2026-11-25 (d298d27) unless marked "T17".
- **Start:** `npm run build`, then `D=$(mktemp -d); DATABASE_PATH=$D/app.db INSECURE_COOKIES=1 npx next start -p 3400` (any free port; `INSECURE_COOKIES=1` because it is http). Ready when `curl -s -o /dev/null -w '%{http_code}' localhost:3400/login` prints 200; `/` then gives 307 to /login.
- **Seed:** `BASE_URL=http://localhost:3400 npm run seed` (T17). Through the UI: demo@example.com / correct-horse-1 (signed up or logged in), a member with a long email, "Website relaunch" (2 To do incl. one overdue and one 200-char title, 1 In progress assigned, 1 Done with a comment) and empty "Team offsite". Prints `Sign in: ...` and `Board: <url>`. Idempotent: a second run changes nothing (T17: printed the same board URL). ~15s.
- **Sign in:** sign up at /signup with any email and `correct-horse-1` (min 8 chars); lands on /projects. In tests, `e2e/helpers.ts` `signUp()` / `newUser()`. playwright-cli: `playwright-cli -s=drive open http://localhost:3400/signup`, `fill 'input[name=email]' ...`, `fill 'input[name=password]' ...`, `press Enter`.
- **Screens:** /login, /signup, /projects, /projects/<id> (board), /projects/<id>/tasks/<taskId> (task page).
- **Evidence:** `BASE_URL=http://localhost:3400 npm run screens -- <dir>` (T17): seeds, then writes login/signup/projects/board/task `-1280.png` and `-390.png` (10 full-page PNGs) into <dir>; exits 1 listing any console error or page error (favicon.ico 404 ignored). T17: exit 0, 10 non-empty files. One-off: `playwright-cli -s=drive screenshot --filename=<file>.png`; `playwright-cli -s=drive console` (expect only the favicon.ico 404).
- **Isolate:** own port and own mktemp DB per copy; e2e uses `E2E_PORT` and its own temp DB.
- **Clean up:** `kill $(ss -ltnp 'sport = :3400' | grep -o 'pid=[0-9]*' | cut -d= -f2)` (pkill -f matches the calling shell, avoid), then `rm -rf $D`; `playwright-cli -s=drive close`.

## Proof chain (T20)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3120 npm run test:e2e` — 2026-11-25 T20: see log.md T20 for the run at the commit. AC29 tests (e2e/move.spec.ts) shown red (no alert) before the code; the clear-on-success check shown red with the clear removed. e2e/move.spec.ts alone: 7 passed.

## Proof chain (T21)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && E2E_PORT=3121 npm run test:e2e` — 2026-11-25 T21: exit 0, 80 passed (AC30 in e2e/search.spec.ts and e2e/assignee-filter.spec.ts + earlier); no `data/` dir. AC30 tests shown red (URL had no q/for) before the code; `for=bogus` test red with the member check removed (0 cards); both history checks red with `pushState` instead of `replaceState` (4 -> 5 and 6).
