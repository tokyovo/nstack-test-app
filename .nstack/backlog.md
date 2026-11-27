# Backlog
Rescored 2026-11-26 after slice 8 (UX pass on /tmp/s8-shots/). Earlier: rescored 2026-11-25 after slice 5 (UX pass on T18 `npm run screens` output, /tmp/t18-shots/). Slice 4 and 5 shipped; items below are open.
Scored 2026-11-25 (value + risk + cost, cost 5 = cheapest). Sources: UX pass (headless Chromium, screenshots /tmp/ux-shots/), research.md (29 sources), earlier reviews.

- 5 (v2 r1 c2) Task templates (duplicate shipped in PR #22; a saved template list is the rest of that research candidate). Evidence: research.md (4 sources for duplicate/templates).
- 5 (v2 r1 c2) Multiple assignees. Evidence: 3 sources, research.md
- 5 (v1 r1 c3) Label duplicate check and name order are ASCII-only (`COLLATE NOCASE`): "Été" and "été" can both exist. Same limit as user emails. Evidence: slice 8 security reviewer (better-sqlite3 repro).
- 4 (v1 r1 c2) Link related tasks; recurring tasks; time tracking; timeline/Gantt (3-4 sources each, research.md).
- 4 (v1 r1 c2) `withLabels` in lib/tasks.ts matches labels to tasks with a filter per row (O(tasks x labels)); a Map if boards get large. Evidence: T25 builder.
- 4 (v1 r1 c2) No prettier config in the repo; default prettier (80 cols) reflows existing 120-col files, so builders revert reflows by hand. Check in a .prettierrc matching the code. Evidence: T32 builder.
- 4 (v1 r1 c2) When the last checklist item fails (deleted elsewhere), "No items yet" (page.tsx) shows above the alert (inside Checklist); move the empty text into Checklist after the alert. Evidence: slice 10 reviewer 1.
- 4 (v1 r2 c1) `drive stop` trusts a recorded pid that is alive on a listening port; a pid reused by an unrelated process would be killed. Check /proc/<pid>/cmdline for next-server. Evidence: T35 review-fix builder.
- 4 (v2 r1 c1) Descriptions and comments collapse typed newlines; `white-space: pre-line` would keep them. Evidence: T39 builder.
- 4 (v1 r1 c2) At 390 px with a long email the header "Log out" wraps under the email (projects-empty-390). Predates slice design. Evidence: T40 builder.
- 4 (v2 r1 c1) Checklist-item Delete removes the row without asking or undo (design skill wants confirmation on destructive actions); add an undo toast or confirm. Evidence: verify slice design.
- 4 (v1 r2 c1) AC7 test (e2e/comments.spec.ts:153) cannot catch a dropped `Z` in lib/comments.ts:33 because the e2e server runs in UTC; run the e2e server with a non-UTC `TZ` (check the overdue tests, which use the server local date) or unit-check the parse. Evidence: review slice design.
- 3 (v1 r1 c1) `drive screens --port N` fails with connection refused unless `drive start` ran first; its --help does not say so. Evidence: T43 builder.
- 3 (v1 r1 c1) Board Labels rows: the edit name input and colour select have accessible names ("Name for Bug") but no visible label; the chip names the row. Evidence: verify labels-dup-calendar.
- 3 (v1 r1 c1) favicon.ico 404 in console (cosmetic, ignored by drive screens).
- 3 (v1 r1 c1) (T18 review nit) Project rename fields do not line up across rows (start after each link); project list keeps the default ul indent at 390px.
- 3 (v1 r1 c1) Alert style is scoped to `main [role="alert"]`; an alert outside <main> would be unstyled, and no test checks font-weight. Evidence: T34 builder.
- 3 (v1 r1 c1) Ctrl-C during `drive check` leaves its server running; `npm run drive -- stop` cleans it up. Evidence: T35 builder.
- 3 (v1 r1 c1) drive: a non-DriveError (e.g. EACCES) ends with a Node stack trace, not one line; `existsSync(STATE_DIR)` after `secureStateDir` is redundant. Evidence: T35 round-2 builder.
- 3 (v1 r1 c1) `drive check` seeds twice (screens seeds again); idempotent but ~5-15s slower. Evidence: drive-tool review round 3.
- 3 (v1 r1 c1) `drive stop --all`: if one instance fails to stop, the loop ends there without reporting the ones already stopped or trying the rest. Evidence: drive-tool review round 3.
- 3 (v1 r1 c1) `page.getByRole("alert")` also matches Next's route announcer; tests and scripts should scope alerts to `main [role=alert]`. Evidence: T37 builder.
- 3 (v1 r1 c1) Headless Chromium here renders 500/600 font weights as regular (system font has no medium face), so headings look light in screenshots; consider weight 700 or a check on a machine with the font. Evidence: T37, T38 builders.
- 2 (v1 r0 c1) A forged label colour (not in the list) shows the error but leaves the Colour select on Gray, not the typed value (no option matches; nothing stored). Evidence: T45 builder.
- 2 (v1 r0 c1) scripts/check-css-tokens.mjs:8 would flag an ID selector made of hex letters (`#feed`) as a colour; none exist. Evidence: review slice design.

## Rejected
- Login timing leaks whether an email exists: signup and invite reveal it by design (AC2/AC7). Reconsider if: signup or invite stop revealing it.
- Custom columns / swimlanes (research.md): changes the goal's fixed three columns. Reconsider if: the owner changes the goal.
