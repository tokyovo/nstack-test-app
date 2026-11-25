# Backlog
Rescored 2026-11-25 after slice 5 (UX pass on T18 `npm run screens` output, /tmp/t18-shots/). Slice 4 and 5 shipped; items below are open.
Scored 2026-11-25 (value + risk + cost, cost 5 = cheapest). Sources: UX pass (headless Chromium, screenshots /tmp/ux-shots/), research.md (29 sources), earlier reviews.

- 6 (v2 r1 c3) Labels/tags with filtering. Evidence: 4 sources, research.md
- 6 (v2 r1 c3) Checklists/subtasks. Evidence: 4 sources, research.md
- 6 (v2 r1 c3) Duplicate a task / templates. Evidence: 4 sources, research.md
- 6 (v2 r1 c4) Silent feedback: whitespace project name does nothing; no "no results" on empty search; no visible drop area in empty columns. (UX)
- 5 (v2 r1 c2) Calendar view. Evidence: 5 sources, research.md
- 5 (v2 r1 c2) Multiple assignees. Evidence: 3 sources, research.md
- 5 (v1 r1 c3) Comment timestamps shown as raw UTC with no timezone. (UX)
- 4 (v1 r1 c2) Link related tasks; recurring tasks; time tracking; timeline/Gantt (3-4 sources each, research.md).
- 3 (v1 r1 c1... cosmetic, cheap but no user value) favicon.ico 404 in console.
- Rejected: login timing leaks whether an email exists (signup/invite reveal it by design, AC2/AC7).
- Needs human (changes the goal's fixed three columns): custom columns / swimlanes, research.md.
- 6 (v2 r1 c3) (review nit, slice 2) `deleteTaskAction` (app/projects/actions.ts) does nothing visible when the delete is refused, e.g. the task was already deleted in another tab; the edit path shows "Task not found". Show the same error or redirect to the board.
- 6 (v2 r1 c3) (T18 screens) At 1280px the stacked new-task form, search and filter take ~600px above the board, so the columns start below the fold on a laptop. Collapse the new-task form behind an "Add task" toggle, or put search + filter in one row.
- 4 (v1 r1 c2) (T18 review nit) Board Search and "Show tasks for" labels get the label margin on top of the grid gap (~40px between them vs ~12px elsewhere), app/globals.css:47-51.
- 3 (v1 r1 c1) (T18 review nit) Project rename fields do not line up across rows (start after each link); project list keeps the default ul indent at 390px.
- 2 (v1 r1 c1) (T22) /tmp still holds ~540 `taskboard-e2e-*` files from runs before the teardown; T22 only cleans new runs. One-off `rm /tmp/taskboard-e2e-*` when no e2e run is in progress.
- 5 (v2 r2 c1) (T22) e2e/seed.spec.ts AC22 takes 19-29s against the 30s default test timeout (1 worker, 2 CPUs); under load from a parallel run it timed out twice in T22 `check:e2e-temp` full runs. Give it `test.setTimeout(60_000)` (it seeds twice through the UI) or speed up seed.
- 4 (v1 r1 c4) (slice 6 screens) Header "Task board" link has no hover/focus hint, so users may not find the way back to Projects; and Next's default 404 page body uses a different font from the app. Add a hover underline and an app/not-found.tsx.
- 4 (v1 r1 c5) (slice 7 review nit) "Export CSV" and "Export JSON" are separated only by a space (`.export-links` has no CSS), so they read like one link; add a gap.
- 4 (v1 r2 c4) (slice 7 review nit) CSV formula guard checks only the first character; a description with leading spaces before `=` (e.g. `  =HYPERLINK(...)`) is not prefixed. Some importers evaluate it. Guard on the first non-space character.
