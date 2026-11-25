# Verify

Run from the repo root. Needs Node 24, `npm ci`, and Chromium for Playwright 1.65.0 (`npx playwright install chromium`; CI uses `--with-deps`).

## Fast checks
- `npm run lint` — ESLint (eslint-config-next core-web-vitals + typescript). 2026-11-25 T1: pass, 0 problems.
- `npm run typecheck` — `next typegen && tsc --noEmit`. 2026-11-25 T1: pass.

## Full checks
- `npm run build` — `next build` (production). 2026-11-25 T1: pass.
- `npm run test:e2e` — Playwright, Chromium headless. Starts `next start -p 3100` on the existing build (run `npm run build` first) with `DATABASE_PATH` set to a fresh temp SQLite file per run; tests read the same file via `process.env.E2E_DATABASE_PATH`. 2026-11-25 T1: 2 passed (e2e/smoke.spec.ts).

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
