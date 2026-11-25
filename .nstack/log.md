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

## Needs human
- 2026-11-25 Run `gh auth refresh -h github.com -s workflow` (adds `workflow` scope to the gh token). Then: `git push -u origin nstack/ci`, rebase `nstack/task-board` onto it (or merge both), open the PR, and nstack can wait for CI and merge. Changing credentials is a hard stop for nstack.
