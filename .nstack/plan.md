# Plan

## Slice: labels-dup-calendar (branch nstack/labels-dup-calendar)
Members can give a label one of a few colours, rename it and delete it; can duplicate a task from its page; and can open a Calendar page that shows the project's tasks on their due dates, a month at a time.

Acceptance criteria:
1. (colour) The New label form has a Colour select with 6 named colours: Gray (default), Green, Blue, Purple, Orange, Red. A label's chip on a card, its row in the board's Labels list, and its checkbox row on the task page show that colour; every colour's chip text passes axe contrast (AA) at 1280 and 390. A colour value not in the list is rejected with "Pick a colour from the list" and nothing is stored.
2. (migration) A database file created before this slice (a `labels` table with no colour column) opens without error; its labels become Gray and keep their names and task links.
3. (rename) Each row of the board's Labels list has an Edit form (name + colour + Save). Saving changes the name and colour everywhere (list, cards, filter option, task page). Empty, too long (40+), or a name another label of the project has in any case shows the create form's error texts on that row and keeps the typed name; renaming to the same name in another case is allowed.
4. (delete) Each row has Delete label, which asks first (confirm text: `Delete label "<name>"? It is removed from every task.`). Dismissing keeps it; accepting removes it from the list, the filter and every card, and the tasks stay.
5. (dup) The task page has a Duplicate task button. It creates a new task in To do with title "Copy of <title>" (cut to 200 chars), the same description, assignee, due date and labels, and the same checklist items all unticked; no comments. The browser lands on the new task's page; the original is unchanged.
6. (calendar) The board has a Calendar link to /projects/<id>/calendar. It shows one month (default: the server's local month, `?month=YYYY-MM` picks another; an invalid value shows the current month), a heading like "November 2026", Previous/Next month links, and each task with a due date in that month under its day, as a link to the task page, with an overdue marker like the board's. Tasks with no due date are counted below the grid ("3 tasks have no due date"). A month with no due tasks says "No tasks due this month". Non-members get a 404.
7. (calendar layout) At 1280 the month is a 7-column Mon-Sun grid; at 390 it is one column listing only the days with tasks; no sideways scroll; the a11y spec covers the calendar screen at both widths.
8. (drive) Seed gives its labels colours (T41) and has due dates in the current month (T44); `drive screens` adds the calendar screen (18 PNGs); `drive check` passes.
9. Every new behaviour has a Playwright test that fails when the behaviour is broken; full suite, lint, typecheck, build pass.

Out of scope: colour pickers or custom hex colours; label colours in CSV/JSON export (export has no labels today); week or day calendar views, drag to reschedule on the calendar; duplicating to another project; copying comments.

Designs considered: (colour) a free hex column with inline styles vs a named key mapped to CSS tokens: the key keeps colours in :root (check-css-tokens) and contrast fixed, and a new key is one line. (calendar) a client component vs a server page with `?month=` links: the server page needs no JS, reuses `listTasks`, and keeps the month in the URL. (migration) keep `CREATE TABLE IF NOT EXISTS` and add the column with `ALTER TABLE` when `PRAGMA table_info(labels)` lacks it, the smallest change that keeps existing files working.

Decision: colour stored as `labels.color TEXT NOT NULL DEFAULT 'gray'`, a key from `LABEL_COLORS` in lib/labels.ts; CSS classes `label-<key>` with soft background + dark text tokens in :root (design.md Tokens gets the six pairs).
Decision: duplicate keeps the assignee only if still a member (createTask's rule), copies checklist items unticked (a copy is usually reused as a fresh start), status To do, no comments.
Decision: calendar weeks start Monday (ISO); "today" and the default month come from `localToday()` like the board's overdue marker.
Decision: label rename/delete live on the board's Labels section (where labels are created), not a separate page.

Plan check answers (fresh reader, 2026-11-27):
- Q1 Labels row: shows the label as a coloured chip (plain text name), then the Edit form: input named "Name for <label>", select "Colour for <label>", buttons "Save" and "Delete label" scoped by the row; New label form keeps "Label name" and "Colour". Tests and seed that read the list use the chips (e.g. `.label-chip` text), and update existing `toHaveText` reads of the list accordingly (a spec change, logged per ticket).
- Q2 On a rename error the row keeps the typed name and the picked colour; after a save it shows the stored values.
- Q3 Forged or missing colour on create or rename: "Pick a colour from the list", nothing changes. The form always sends one, so missing is forged.
- Q4 Builder picks the six pairs and writes them in design.md Tokens; AA on the chip itself, and on Done cards too (axe runs on the seeded board, which has a labelled Done task).
- Q5 Task page: a chip `<span class="label-chip label-<key>">` inside the checkbox `<label>`; the label row keeps its 44 px height and centring.
- Q6 Export `applySchema(db)` from lib/schema.ts; the test imports it with a relative path and calls it on an old-schema temp file.
- Q7 Duplicate copies the assignee only if still a member, else Unassigned (no error); members cannot be removed today, so that branch has no e2e proof (noted, not built as a feature).
- Q8 Always prefix "Copy of " (no dedupe); no confirm (creating is not destructive); button sits in the Edit task section next to Delete task.
- Q9 Grid pads with blank cells (no dates, no tasks) before day 1 and after the last day.
- Q10 Done tasks appear, without the overdue marker; within a day order by id (listTasks order).
- Q11 "1 task has no due date" / "N tasks have no due date"; hidden at 0. Empty month: the grid still renders, with "No tasks due this month" above it.
- Q12 Valid `month`: `^\d{4}-(0[1-9]|1[0-2])$` with year 1970-9999; anything else shows the current month. Previous/Next links are hidden past those ends.
- Q13 Grid cell heading: the day number, with an accessible name like "Monday 2 November"; at 390 the same element shows "Mon 2 November". The board's Calendar link is a `.button` in the export-links row (44 px check applies).
- Q14 Seed: compute due dates from the server-local month: keep one overdue task (-7 days stays, it may sit in the previous month), and add/shift two tasks to days 1 and 28 of the current local month (use local date parts, not toISOString). Idempotent as before.
- Q15 Default-month test reads the expected month at test start and accepts either it or the month at assertion time (midnight month-end race). `drive screens` captures the default month (`calendar`).

- [ ] T41 Label colours: `color` column + migration (move SCHEMA and the migration into a module the e2e tests can import, e.g. lib/schema.ts without server-only, used by lib/db.ts), LABEL_COLORS, Colour select in LabelForm, coloured chips on cards, Labels list and task page; design.md tokens; seed gives its labels colours (AC8 part). Proof: e2e/labels.spec.ts new tests for AC1 (pick Blue, chip shows the blue class/computed background; a forged colour value is rejected) and AC2 (e2e test builds an old-schema temp DB with better-sqlite3, applies the schema/migration, reads back color 'gray' and the task link); a11y spec still passes. Needs: none
- [ ] T42 Rename and delete labels on the board's Labels list. Proof: e2e/labels.spec.ts tests for AC3 (rename + recolour shows everywhere; each error case keeps the typed name; case-only rename allowed; a non-member's forged request changes nothing) and AC4 (dismiss keeps, accept removes from list, filter and cards; tasks stay; `?label=<deleted id>` shows all). Needs: T41
- [x] T43 Duplicate task on the task page. Proof: new e2e/duplicate.spec.ts for AC5 (all copied fields, unticked checklist, no comments, lands on the copy, original unchanged, a 200-char title is cut to 200 with the prefix; a non-member's forged request creates nothing). Needs: none
- [ ] T44 Calendar page, its link on the board, seed due dates in the current month, drive calendar screen. Proof: new e2e/calendar.spec.ts for AC6 (month heading, tasks on their days incl. first/last day of month, prev/next and `?month=`, invalid month, no-due-date count, empty month text, overdue marker, 404 for non-member) and AC7 (layout at 1280/390); a11y.spec screens list gains calendar; `drive check` 18 PNGs for AC8. Needs: none

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
- drive-tool: T35-T36, PR #17
- design: T37-T40, PR #20
