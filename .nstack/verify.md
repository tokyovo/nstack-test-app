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

## CI
- `.github/workflows/ci.yml`: on push and pull_request, ubuntu-latest, Node 24: npm ci, playwright install --with-deps chromium, lint, typecheck, build, test:e2e. Not yet run (branch not pushed).
