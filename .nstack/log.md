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

## Needs human
- (none)

## 2026-11-25 T1 Harness
- Did: Next 16.4.6 App Router scaffold, lib/db.ts (better-sqlite3, schema bootstrap), Playwright config on temp DB, smoke e2e (2 tests), npm scripts, GitHub Actions CI.
- Decisions:
  - Full v1 schema (users, sessions, projects, project_members, tasks, comments) created in T1's db module: the design fixes it, later tickets just use it; CREATE IF NOT EXISTS keeps it easy to change.
  - better-sqlite3 install script denied via npm allowScripts: v13 ships prebuilds for linux-x64, no node-gyp needed.
  - next-env.d.ts gitignored; typecheck runs `next typegen` first so a fresh clone typechecks without a build.
  - e2e server on port 3100, reuseExistingServer false, so tests always hit a fresh temp DB and never a dev server.
  - test:e2e does not build; CI and the proof run `npm run build` first (avoids double builds).
  - Smoke test asserts the DB file's tables directly from the test process (same env var), so later AC 4 can check DB rows the same way.
