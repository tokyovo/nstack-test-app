# Plan

## Slice: checklist-confirm (branch nstack/checklist-confirm)
Deleting a checklist item asks first, like every other delete in the app (task, project, label). Today one tap on "Delete" beside an item removes it for good. Found by improve 2026-11-27 (backlog score 8): the design skill and verify item 6 require a confirmation on destructive actions.
Acceptance criteria:
1. Pressing Delete on a checklist item opens a browser confirm whose message names the item: `Delete item "<text>"?`.
2. Dismissing the confirm keeps the item, both now and after a reload; the box and Delete stay usable.
3. Accepting the confirm removes the item (and it stays gone after a reload), as before.
4. A double-click on Delete, accepted, still sends one delete and shows no alert (AC47 keeps passing).
5. Existing checklist tests that press Delete accept the confirm; the old "AC39: Delete removes the item without asking" test becomes the new behaviour (spec change, logged).

Decisions: use `window.confirm` in `checklist-item.tsx`, the same pattern as `ConfirmButton` (app/projects/confirm-button.tsx). ConfirmButton itself is a form-submit button and this row is a `type="button"` with a transition, so the row does not reuse the component. Access is unchanged (member; deny proof stays "AC39: a non-member's checklist requests change nothing").

Plan-check answers (fresh reader, 2026-11-27):
- Every Delete click in e2e/checklist.spec.ts must handle the dialog (Playwright dismisses unhandled ones): lines ~131, 160, 193, 222 (on `b.page`), 245 (`deleteItemInOtherTab`, on the `other` page), 285/289 and 318 (dblclick). Use one helper, e.g. `deleteItem(page, text, "accept" | "dismiss")`, that registers `page.once("dialog")` before the click. The tamper and non-member tests accept, so the deny proof still sends its request. No other spec or the seed deletes checklist items (layout.spec AC41 only measures the button).
- Double-click: guard with a `useRef` flag set before `confirm` opens, so a second click never opens a second confirm or sends a second delete. AC47 counts dialogs (exactly 1) and `settledActions` sees exactly 1 action.
- Dismiss proof: count `next-action` POSTs: 0 sent after dismissing; reload, the item is still there; its box and Delete are enabled.
- Message is exact: `expect(message).toBe('Delete item "Drop"?')`.
- The new test replaces "AC39: Delete removes the item without asking" under the new title; red before the change (no dialog, message "", the item is gone). Update the doc comment in checklist-item.tsx. Spec change logged in log.md; the verify.md Features row "Checklist items" keeps its proof name, so no row change.

- [x] T52 Checklist Delete asks first. Proof: `e2e/checklist.spec.ts` "AC39: Delete asks first; dismissing keeps the item, accepting removes it" (red before the change: the item disappears with no dialog); AC47 double-click test still green with the dialog accepted; the full checklist.spec green; lint, typecheck. Needs: none

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
- labels-dup-calendar: T41-T46, PR #22
- secure-access: T47-T48, PR #24
- design-rules: T49-T51, PR #26
