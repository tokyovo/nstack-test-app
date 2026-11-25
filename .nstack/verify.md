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
- `.github/workflows/ci.yml`: on push and pull_request, ubuntu-latest, Node 24: npm ci, playwright install --with-deps chromium, lint, typecheck, build, test:e2e. Not yet run (branch not pushed).

## Proof chain (T6 review fixes)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25: exit 0, 34 passed; no `data/` dir. Focus test shown red before the fix; task-create and invite tamper tests each shown red with their own getProject guard removed.

## Proof chain (T7)
- `rm -rf .next; npm run lint && npm run typecheck && npm run build && npm run test:e2e` — 2026-11-25 T7: exit 0, 40 passed (e2e/comments.spec.ts AC11 + earlier); no `data/` dir. Comment tests shown red (no task link) before the code; each tamper test shown red with its own guard removed (membership check in getTask, task-in-project condition).
