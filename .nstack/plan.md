# Plan

## Slice: task-feedback (branch nstack/task-feedback)
From improve 2026-11-26 (backlog re-summed: four items were miscounted below their real score). Items at bar 7: silent checklist failure (reviewers of slice 8), silent board/project feedback (UX), CSV formula guard after leading spaces (slice 7 review). Grouped with the 6 "task delete refused does nothing" (same task page, same fix kind).

What changes for the user: when something they did cannot be done, or shows nothing, the app says so instead of staying silent.

Acceptance criteria (Playwright e2e):
47. Checklist: when the server refuses a tick/untick or a delete (the item was deleted in another tab), the Checklist section shows `<p role="alert">` with text `Could not update "<item text>"`, and the page refreshes (`router.refresh()`), so a deleted item disappears. The next successful tick/delete clears the alert. A successful action shows no alert. Test: two pages of the same user; page 2 deletes the item; page 1 ticks it -> alert, row gone; second test: page 1 deletes the already-deleted item -> alert, row gone.
48. Task delete: when "Delete task" is refused because the task no longer exists (deleted in another tab), the user lands on the project board (`/projects/<id>`) instead of staying on a page for a task that is gone. (A non-member who tampers still changes nothing: the board then 404s for them, as today.)
49. Board empty states: a column with no visible task shows `<p className="column-empty">No tasks</p>` inside its section (drop target stays the whole section). When the project has tasks but search/filters hide all of them, the board shows `<p role="status" className="board-empty">No tasks match the search or filters</p>` (full grid row, above the columns); it goes away when a task matches again. A project with no tasks shows the "No tasks" column placeholders but not the "No tasks match" message.
50. Project names: the new-project and rename inputs reject a whitespace-only name in the browser (`pattern` requiring a non-space character, with `title="Name cannot be blank"`); the input is `:invalid` and submitting creates/renames nothing (server already ignores blank names).
51. CSV export: the formula guard looks at the first character after leading spaces: a cell like `  =HYPERLINK("x")` (spaces then `=`/`+`/`-`/`@`) is written as `'  =HYPERLINK("x")` (quote prepended to the original value, spaces kept). Values without such a character are unchanged. Test in e2e/export.spec.ts with a description stored with leading spaces (descriptions are trimmed on save, so set it in the DB at `process.env.E2E_DATABASE_PATH`, as earlier specs read it).

52. Every error alert in the app's forms and the board/checklist (`<p role="alert">` inside `main`) shows in the same red (#b91c1c) bold style: one CSS rule on `main [role="alert"]` replaces the per-class colour rules (`.board-error` keeps only its grid placement). e2e: a login error, a task-form error and the checklist alert each have computed color rgb(185, 28, 28). Added 2026-11-26 from the controller's screens check (checklist alert was plain text) and the builder's note that all form alerts were.

Out of scope: undo, toasts, retrying, server-side error messages for project forms (no useActionState rewrite).

Decision: task delete refused -> redirect to the board rather than an error message: the task is gone, the board is where the user goes next when the user is a member of the project; a non-member's refused delete still does nothing (no redirect), so the existing tamper tests keep their meaning.
Decision: blank project names blocked by the HTML `pattern` (the server already ignores them); no server error message, so project forms stay plain server actions.
Decision: CSV guard prefix goes before the leading spaces (`'` + original value), so the cell text is otherwise as stored.

Fresh-reader answers (2026-11-26):
- AC47 structure: a new client component (e.g. `checklist.tsx`) renders the list, owns the one shared error state, and renders `ChecklistItem` rows; rows report success/failure up via a callback. Any row's later success clears the alert. page.tsx passes the bound actions per item as today.
- AC47 delete: `deleteChecklistItemAction` returns `Promise<boolean>` and is called from a client handler (button onClick in a transition), like toggle. The existing tamper tests (checklist.spec.ts) must pass unedited or with only an added alert assertion; re-run them (bare JSON array body is handled by `tamperBoundIds`).
- AC47 errors: `false` or a thrown error both count as refused: catch, `unstable_rethrow(error)` first (as board.tsx `moveTo`), then show the alert and `router.refresh()`. The optimistic tick reverts on its own when the transition ends; no extra rollback. Tamper tests: the alert and refresh mid-test are fine; if a later click races the refresh, wait for the alert first.
- AC48: `deleteTaskAction`: on refusal, `if (getProject(user.id, projectId)) redirect(`/projects/${projectId}`)`; otherwise return (non-member: no redirect, no revalidate). edit-task.spec.ts tamper tests unchanged. New two-tab test like move.spec.ts:131 (second page deletes first), then `expect(page).toHaveURL(boardPath)` and the board heading is visible.
- AC49: "No tasks" `<p className="column-empty">` inside the section, after the `<ul>`, driven by the same `visible`/`shown` list the column renders (it may show while a card is dragged out; fine). "Project has tasks" = `shown.length > 0`. `.board-empty` shares `.board-error`'s `grid-column: 1 / -1`; order: error first, then empty message. Screens: builder looks at an empty project board and a filtered-to-nothing board at 1280/390 (playwright-cli or a scratch script; no new screens.mts output), plus the existing AC42/AC15 tests must pass.
- AC50: `pattern=".*\S.*"` (as written in JSX: `pattern=".*\S.*"` string, i.e. regex `.*\S.*`) on the two project inputs only. Test: fill "   ", submit, expect `input:invalid` matched and (after a short wait) the project list unchanged (no new row / old name still there). Other forms already reject blank on the server with a message.
- AC51: "leading spaces" = any characters matched by JS `\s` before the first non-space; guard regex becomes `/^\s*[=+\-@]/` OR the existing leading `\t`/`\r` rule (keep both). An all-space value is unchanged. Test: new test in export.spec.ts; open `E2E_DATABASE_PATH` writable with better-sqlite3 (`busy_timeout` 5000), UPDATE one task's description to `  =HYPERLINK("x")`, close, then export; WAL handles the concurrent writer.

- [x] T31 Checklist and task-delete failures are not silent (AC47, AC48). Proof: e2e in e2e/checklist.spec.ts and e2e/edit-task.spec.ts, red first; full chain. Needs: none
- [x] T32 Board empty states and blank project names (AC49, AC50). Proof: e2e in e2e/search.spec.ts (or a new e2e/empty-states.spec.ts) and e2e/projects.spec.ts, red first; full chain; screens of an empty and a filtered-to-nothing board at 1280/390 looked at. Needs: T31 (one builder at a time, 2 CPUs)
- [x] T34 All error alerts styled alike (AC52). Proof: e2e colour checks (login, task form, checklist), red first; full chain. Needs: T33
- [x] T33 CSV formula guard after leading spaces (AC51). Proof: e2e in e2e/export.spec.ts, red first; full chain. Needs: T32

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
