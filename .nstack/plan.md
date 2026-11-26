# Plan

## Slice: board-fold (branch nstack/board-fold; also carries the slice 8 state updates)
From improve 2026-11-26, backlog score 7: at 1280x800 the board's columns start at y~788 (below the fold) because the new-task form, search, "Show tasks for" and "Label" all stack above them (/tmp/s8-shots/board-1280.png).

What changes for the user: opening a board on a laptop shows the tasks straight away. The three filters sit on one row; the new-task form moves below the board, with a "New task" link near the project title that jumps to it.

Design: in app/projects/[id]/page.tsx move `<TaskForm>` after `<Board>` inside `<section id="new-task"><h3>New task</h3>...</section>`, and add `<a href="#new-task">New task</a>` to the `.export-links` paragraph (renamed `.board-links` only if the builder finds that clearer; then update its CSS). In app/globals.css: at widths over 640px, `.board-search`, `.board-filter` and the label filter share one row (grid spans of one column each in the existing three-column `.board` grid, so no new markup), each field 100% of its cell; `.board-error` keeps `1 / -1`; the label filter wrapper gets a class like the other two if it has none; filter labels drop the extra bottom margin inside the grid (backlog nit, globals.css:47-51); `.board-links a` / `.export-links a` get a gap of at least 0.75rem. Alternative considered: collapsing the new-task form behind a toggle: rejected, ~15 specs fill that form and would all need an extra click; moving it changes no test.

Acceptance criteria (Playwright e2e in e2e/layout.spec.ts unless stated; seed-like data: a few tasks, a 60+ char member email):
42. At 1280x800 the "To do" column heading's top is at most 400px from the top of the page (no scrolling). Search tasks, Show tasks for and Label fields have the same top (within 4px) and increasing left edges. At 390x844 they stack (each one's top below the previous one's bottom) and the board still has no horizontal scroll (AC15 tests unchanged and passing).
43. The new-task form is after the board columns in the page (its top is below the "Done" column's bottom at 1280) under an h3 "New task"; clicking the "New task" link moves to `#new-task` (URL hash) and the Title field is in the viewport. All existing specs that create tasks pass unchanged.
44. "Export CSV", "Export JSON" and "New task" links have at least 8px between neighbours (right edge to next left edge) at 1280.
46. After "Add task" succeeds in the new-task form, a `<p role="status">` inside that form says `Added "<title>"` and is in the viewport (the new card may be off-screen above); the next submit (success or error) replaces or clears it. Edit-task form unchanged (no status). Added 2026-11-26 from slice 9 review nit.
45. `npm run screens` at 1280 and 390 reviewed by eye: board fits as described, nothing overlaps.

Out of scope: collapsing forms, sticky filters, per-column add buttons.

Decision: move rather than hide the new-task form (no test churn, no hidden UI); the skip link keeps adding a task one click away on a long board.

Fresh-reader answers (2026-11-26):
- TaskForm stays a direct child of `<main>`, outside `.board` (inside its own `<section id="new-task">`), so AC24/AC25 keep holding unchanged; forms-layout.spec.ts must pass unedited.
- Both filters already use `board-filter`; keep the shared class. "the label filter gets a class" is moot.
- Margin nit: the extra space comes from `label { margin: 0 0 0.75rem }` (globals.css:52-56) inside the `.board` grid gap. Scope `.board > label { margin: 0 }`, at all widths (the grid gap spaces them when stacked).
- AC42 measures the `<label>` wrappers (`.board-search`, both `.board-filter`) via boundingBox at scroll 0; "To do" heading top <= 400 with a 60+ char email member and at least one label in the project.
- Above 640px: `.board > label > :is(input, select) { width: 100% }` (overrides the 32rem cap only inside the board grid); each label takes one grid column. Test also checks each control's right edge <= the next label's left edge (the long email does not overflow into the next cell).
- Links: order "Export CSV", "Export JSON", "New task". Make `.export-links` a flex row with `gap: 0.75rem` (whitespace between links may stay). Keep the class name (no rename).
- replaceUrl dropping `#new-task` after a filter change is fine (the hash is only a jump target). Note it in a code comment only if the builder touches replaceUrl; no change needed.
- Locate by role with exact names: `getByRole("link", { name: "New task", exact: true })`, `getByRole("heading", { name: "New task", exact: true })`.
- AC43: `expect(page).toHaveURL(/#new-task$/)` and `expect(page.getByLabel("Title")).toBeInViewport()` (the new-task Title; Playwright's default ratio, any part visible).
- AC45: screens.mts stays full-page (no new file, AC23's 10 files unchanged); the above-the-fold claim is proven by AC42's test, and the reviewer of the screens judges layout. Seed already has labels and a 60+ char member (T17, T28); no seed change.

- [ ] T30 New-task form says what it added (AC46). Proof: e2e in e2e/tasks.spec.ts at 1280 on a board with tasks: add, status text in viewport; then an empty-title error clears it; red first; full chain. Needs: T29
- [x] T29 Board above the fold (AC42-45). Proof: new tests in e2e/layout.spec.ts, red first; full chain; screens reviewed. Needs: none

## Done
- task-board v1: T1-T8, PR #1
- usable-board: T9-T12, PR #2
- slice3 (hardening + my tasks): T13-T16, PR #5
- drive harness: T17, PR #7
- forms-layout: T18, PR #8
- board-feedback: T19-T22, PR #10
- export: T23-T24, PR #11
- labels-checklist: T25-T28, PR #13
