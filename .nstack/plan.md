# Plan

## Slice: drive-tool (branch nstack/drive-tool)
An agent with no memory of this project can start, seed, screenshot, health-check and stop the app with one tool, and find every feature and its proof in `verify.md`. Replaces the loose `npm run seed` / `npm run screens` scripts and the manual `next start` / `kill` recipe. No product code changes.
Design: one `scripts/drive.mts` (Node 24 type stripping, like the other scripts) reusing `scripts/seed-app.mts`; chosen over a shell script because seed/screens already use Playwright from TypeScript. Instance state lives in `<os.tmpdir()>/taskboard-drive/<port>.json` (`{url, port, pid, db, dir}`) so several copies can run side by side and `stop` finds them by port.
Acceptance criteria:
1. `npm run drive -- --help` lists start, seed, screens, check, stop; `npm run drive -- <cmd> --help` prints that command's usage and options; exit 0. An unknown command exits 2 and prints the command list.
2. `npm run drive -- start --json` builds when `.next/BUILD_ID` is missing (`--build` forces a build), starts `next start` on a free port (or `--port N`) with `DATABASE_PATH` in a new `mkdtemp` dir under the OS temp dir and `INSECURE_COOKIES=1`, waits until `/login` returns 200 (60s limit), and prints one JSON line `{"url","db","pid","port"}`. The dev database (`data/`) is never created or touched. Without `--json` it prints the same as readable lines.
3. `npm run drive -- seed [--url U] [--json]` runs the existing seed (seed-app.mts) against U, or, with no `--url`, the single running drive instance; prints sign-in and board URL (`--json`: `{"email","password","boardUrl","taskUrl"}`). With no running instance, or more than one and no `--url`, it exits 1 with a message naming the command to run next (`drive start`, or `--url`/`--port`).
4. `npm run drive -- screens <dir> [--url U]` does what `scripts/screens.mts` does today (seed, 10 full-page PNGs: login/signup/projects/board/task at 1280 and 390, exit 1 listing console/page errors, favicon 404 ignored). Missing `<dir>` exits 2 with usage.
5. `npm run drive -- stop [--port N] [--all] [--dry-run] [--json]` stops the instance (the single one when no `--port`), by the pid recorded at start (process group, so `next start` and its children die; never `pkill -f`), and deletes its temp dir and state file. `--dry-run` prints what it would kill and delete and changes nothing. After stop, the port is not listening.
6. `npm run drive -- check [--json]` runs start (free port), seed, screens into a temp dir, checks 10 non-empty PNGs, then stops and cleans up even when a step failed; exit 0 only when every step passed; prints each step's result. A failing step (e.g. a page console error) gives exit 1 and still leaves no listening port, temp dir or state file.
7. `scripts/seed.mts`, `scripts/screens.mts` and the `seed`/`screens` npm scripts are removed; nothing references them (`grep -rn "seed.mts\|screens.mts\|npm run seed\|npm run screens"` outside `.nstack/log.md` and `node_modules` finds nothing). e2e/seed.spec.ts (AC22) still passes.
8. CI runs `npm run drive -- check` after `npm run test:e2e`.
9. `.nstack/verify.md` follows `go/references/state.md`: a check table (lint, typecheck, build, e2e/check:e2e-temp, drive check) with last results; a Drive section using the tool; a Features section with one row per goal feature and per shipped slice feature (auth, session expiry, projects + rename/delete, invite, tasks + edit/delete, board columns + drag + keyboard, overdue, comments, search, assignee filter, URL-kept filters, export CSV/JSON, labels + filter, checklist, empty states/feedback, nav, my tasks if present), each naming an existing spec file and a quoted test name in it; `../nstack/skills/go/scripts/check-features .nstack/verify.md` exits 0. Per-ticket "Proof chain" sections are removed (evidence stays in log.md and git history); the 2-CPU note stays.

Answers (plan check, 2026-11-27):
- start spawns `node_modules/.bin/next start -p <port>` directly (no npx), `detached: true`, stdout/stderr to `<dir>/server.log`, `unref()`; the recorded pid is that child's, and it leads its own process group. stop sends SIGTERM to `-pid` (group), waits up to 10s for the port to close, then SIGKILL to the group.
- Free port: listen on port 0, read the port, close. `--port N` already listening or already in the state dir: exit 1 naming `drive stop --port N` or another port.
- Stale state (pid dead or port not listening): pruned (state file + temp dir removed, one line printed) before any command picks "the running instance".
- seed, screens and stop all take `--url U` or `--port N` (seed/screens) / `--port N` (stop). With neither, all use the single running instance; none: exit 1 "run `npm run drive -- start`"; several: exit 1 listing ports, "pass --port N".
- screens takes `--json`: `{"dir","files":[...],"errors":[...]}`.
- stop with none running: exit 0, prints "nothing running". Several and no `--port`/`--all`: exit 1 listing ports. `--json`: `{"stopped":[{"port","pid","dir"}],"dryRun":bool}`.
- check steps: start, seed, screens, files, stop. `--json`: `{"ok":bool,"steps":[{"name","ok","detail"}]}`. check takes `--build` (passed to start). Unknown command or bad option: exit 2 with usage.
- The console.error mutant is a temporary edit inside drive's screens code path (e.g. an injected `page.evaluate(() => console.error("x"))` on one page), not product code; reverted after, shown by `git diff --stat` empty for it.
- The 60s limit is only the wait for /login. On timeout, start kills the group, removes the temp dir and state file, prints the last 20 lines of server.log, exits 1.
- CI: `drive check` reuses the `.next` from the earlier build step; default step condition (runs only when earlier steps passed).
- verify.md: the Fast/Full bullets and the CI section become rows of the one table (lint, typecheck, build, e2e = `npm run check:e2e-temp` (one row; it runs the suite and the temp-file check), drive check, ci). Old AC23/AC27/T17 bullets go. "Last result" rows are filled by the slice's verify run at its commit; T36 may copy the latest known result with its date and commit.
- Features: "My tasks" is part of the assignee-filter row. Reach = route plus the control (e.g. `/projects/<id>, Assignee select`). The red check for check-features uses a scratch copy `<tmp>/x/.nstack/verify.md` with `e2e/` symlinked into `<tmp>/x`.

- [x] T35 drive tool: `scripts/drive.mts` + `"drive"` npm script with start/seed/screens/check/stop as in AC1-6; remove seed.mts/screens.mts and their npm scripts (AC7); add the CI step (AC8). Proof: AC1-6 commands run by hand with outputs in log.md; `ss -ltnp` and `ls <tmpdir>/taskboard-drive` empty after stop and after check; check shown exit 1 with a mutant that logs console.error on one page, and still cleaned up; grep for AC7; lint + typecheck; `npx playwright test e2e/seed.spec.ts` pass. Needs: none
- [x] T36 verify.md in the state.md format (AC9), using T35's commands for the Drive section. Proof: `check-features` exit 0; a row whose test name is altered makes it exit 1. Needs: T35 (Drive section commands); Features rows can be written in parallel.

## Done
- task-board v1: T1-T8, PR #1
- usable-board: T9-T12, PR #2
- slice3 (hardening + my tasks): T13-T16, PR #5
- drive harness: T17, PR #7
- forms-layout: T18, PR #8
- board-feedback: T19-T22, PR #10
- export: T23-T24, PR #11
- labels-checklist: T25-T28, PR #13
- board-fold: T29-T30, PR #14
- task-feedback: T31-T34, PR #15
