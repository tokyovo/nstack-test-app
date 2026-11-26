# Backlog
Rescored 2026-11-26 after slice 8 (UX pass on /tmp/s8-shots/). Earlier: rescored 2026-11-25 after slice 5 (UX pass on T18 `npm run screens` output, /tmp/t18-shots/). Slice 4 and 5 shipped; items below are open.
Scored 2026-11-25 (value + risk + cost, cost 5 = cheapest). Sources: UX pass (headless Chromium, screenshots /tmp/ux-shots/), research.md (29 sources), earlier reviews.

- 6 (v2 r1 c3) Duplicate a task / templates. Evidence: 4 sources, research.md
- 7 (v2 r1 c4) Silent feedback: whitespace project name does nothing; no "no results" on empty search; no visible drop area in empty columns. (UX)
- 5 (v2 r1 c2) Calendar view. Evidence: 5 sources, research.md
- 5 (v2 r1 c2) Multiple assignees. Evidence: 3 sources, research.md
- 5 (v1 r1 c3) Comment timestamps shown as raw UTC with no timezone. (UX)
- 4 (v1 r1 c2) Link related tasks; recurring tasks; time tracking; timeline/Gantt (3-4 sources each, research.md).
- 3 (v1 r1 c1... cosmetic, cheap but no user value) favicon.ico 404 in console.
- Rejected: login timing leaks whether an email exists (signup/invite reveal it by design, AC2/AC7).
- Needs human (changes the goal's fixed three columns): custom columns / swimlanes, research.md.
- 6 (v2 r1 c3) (review nit, slice 2) `deleteTaskAction` (app/projects/actions.ts) does nothing visible when the delete is refused, e.g. the task was already deleted in another tab; the edit path shows "Task not found". Show the same error or redirect to the board.
- 3 (v1 r1 c1) (T18 review nit) Project rename fields do not line up across rows (start after each link); project list keeps the default ul indent at 390px.
- 5 (v2 r2 c1) (T22) e2e/seed.spec.ts AC22 takes 19-29s against the 30s default test timeout (1 worker, 2 CPUs); under load from a parallel run it timed out twice in T22 `check:e2e-temp` full runs. Give it `test.setTimeout(60_000)` (it seeds twice through the UI) or speed up seed.
- 6 (v1 r1 c4) (slice 6 screens) Header "Task board" link has no hover/focus hint, so users may not find the way back to Projects; and Next's default 404 page body uses a different font from the app. Add a hover underline and an app/not-found.tsx.
- 7 (v1 r2 c4) (slice 7 review nit) CSV formula guard checks only the first character; a description with leading spaces before `=` (e.g. `  =HYPERLINK(...)`) is not prefixed. Some importers evaluate it. Guard on the first non-space character.
- 6 (v3 r1 c2) Rename / delete labels, label colors (slice 8 left them out; the goal names create, assign, filter). Evidence: plan.md slice labels-checklist, Out of scope.
- 4 (v1 r1 c2) `withLabels` in lib/tasks.ts matches labels to tasks with a filter per row (O(tasks x labels)); a Map if boards get large. Evidence: T25 builder.
- 7 (v2 r2 c3) A checklist tick or delete the server refuses (item deleted in another tab) undoes silently and leaves the stale row; show an alert and refresh, like the board's failed move (AC29). Evidence: slice 8 reviewers 1 and 2 (two-session repro).
- 5 (v1 r1 c3) Label duplicate check and name order are ASCII-only (`COLLATE NOCASE`): "Été" and "été" can both exist. Same limit as user emails. Evidence: slice 8 security reviewer (better-sqlite3 repro).
- 6 (v1 r1 c4) Board search box is a few px taller than the two filter selects (browser default heights), board-1280.png. Evidence: T29 builder.
- (nstack tooling, not this app) Backlog score sums were miscounted in 7 lines across runs; nstack could ship a check that recomputes `v+r+c` in backlog.md (recomputed by a one-off script on 2026-11-26).
- 4 (v1 r2 c1) No test asserts that a non-member's refused task delete does not redirect (tamper tests only check nothing was deleted). Evidence: T31 builder.
- 4 (v1 r1 c2) No prettier config in the repo; default prettier (80 cols) reflows existing 120-col files, so builders revert reflows by hand. Check in a .prettierrc matching the code. Evidence: T32 builder.
- 3 (v1 r1 c1) Alert style is scoped to `main [role="alert"]`; an alert outside <main> would be unstyled, and no test checks font-weight. Evidence: T34 builder.
