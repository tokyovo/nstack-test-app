# Plan

## Slice: design-rules (branch nstack/design-rules)
The design skill gained rules: a heading hierarchy (the page title is the largest text; every heading is at least two scale steps above body and weight 600+), form controls as one family (inputs, selects, date inputs and buttons share height, border, radius and font; no browser-default select, date picker or checkbox), and critique line 9 (squint: title, headings and primary action stand out). Every screen is brought up to them. Users see a clear, bold page title on every screen, bold section headings, and selects that look like the text inputs beside them.
Screens (the Drive "Screens" list): login, signup, projects, board, board-empty, board-nomatch, task, calendar, 404.
Acceptance criteria:
1. On every screen, at 1280 and 390, there is exactly one `h1` and it is the page title: "Log in", "Sign up", "Projects", the project name (board), the task title (task page), the month title (calendar), "Page not found" (404). Its computed font-size is the largest of any visible text element on the page.
2. The header "Task board" is not a heading (plain link to /projects when signed in, plain text when not), at most `var(--text-lg)`, and still clickable to /projects (nav.spec).
3. Heading levels never skip: below the `h1`, section headings are `h2` (board: the three column headings, New task, Labels, Members; task page: Edit task, Labels, Checklist, Comments). No `h3`-`h6` remain unless under an `h2`.
4. Every visible `h1`-`h6` on every screen has computed font-size >= 1.375rem (22px; two steps above body 1rem on the scale 1 / 1.125 / 1.375) and font-weight >= 600; `h1` is 1.75rem and 700.
5. Bold actually renders: for every visible heading, its rendered width at its own weight differs from the same text at weight 400 (catches a font stack that resolves to a face with no bold, as `system-ui` does on this machine: WenQuanYi Zen Hei).
6. Calendar day numbers are not headings; each day cell keeps an accessible name of weekday, day and month (the existing aria-label text), and calendar.spec still finds tasks under their days.
7. On every screen, visible text-like inputs (`input` except checkbox/hidden), date inputs, selects and buttons/.button share computed height, border-radius, border-width, font-family and font-size; inputs, selects and secondary buttons share border-color (`--edge`).
8. Every `select` has computed `appearance: none` and a non-`none` background-image (a chevron drawn from token colours, no colour literal outside `:root`: `npm run lint` passes); its text does not run under the chevron (padding-right >= 2rem).
9. Every checkbox has computed accent-color equal to `--accent`; the date input has the same padding-left, font and color as a text input.
10. Design critique: all nine lines of the design skill critique pass on every screen at 1280 and 390 (drive screens), and the axe scan in a11y.spec passes.

Decisions: font stack drops leading `system-ui` (it resolves to a no-bold CJK face on this machine; platform UI fonts are named instead: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Liberation Sans", Arial, sans-serif`). Column headings become `h2` at 1.375rem rather than losing heading semantics. Calendar day numbers stop being headings (22px day numbers in 7 cells would crowd the grid); the cell keeps its name. Existing tests that assert a heading level change with the spec (log the spec change); tests by heading name stay.

Plan-check answers (fresh reader, 2026-11-27):
- AC1: "largest" is strict: the h1's font-size is greater than that of every other visible element that has its own non-whitespace text node. Set `h1 { font-size: var(--text-2xl); font-weight: 700 }` explicitly (UA default is 2em).
- AC2: the header title becomes `<p class="app-title">` (a link when signed in) at `--text-lg`/600; nav.spec's `getByRole("heading", { name: "Task board" })` changes to the link/text (spec change, logged).
- Extra screen for T49 and T50 specs: a logged-out unknown URL (e.g. /nope) has exactly one h1 "Page not found".
- AC6: move the day's aria-label to the `li.calendar-day` (no aria-label on a bare span/div); the number is a `<span>` (aria-hidden if the li carries the name). calendar.spec cells found by heading name (:36, :177) change to find the `li` by that name (logged). Every calendar.spec `level: 2` page-title assertion, including the task page at :84, becomes `level: 1`; move.spec :196-197 `h3`/`level: 3` become `h2`/`level: 2`.
- Columns and New task/Labels/Members are all h2; the count pill stays beside the 22px heading; check 390.
- AC5 measure: copy each visible heading's text into an offscreen span with its computed font, width at weight 400 vs its own weight must differ by > 1px; skip visually hidden headings.
- AC7: compare only single-line controls in their rest state; add `white-space: nowrap` to buttons/.button so a label does not wrap (if that causes sideways scroll at 390, the a11y spec will catch it: then the layout wraps the row, not the label). Quiet, primary, danger and disabled buttons share height, radius, border-width and font but are exempt from the `--edge` border-color check. Textareas: same radius, border-width, border-color, font-family and font-size; height exempt. Font weight is out of scope.
- AC9: reference text input is the Title input in the same form; skip screens with no date input; the picker indicator is checked by eye in the critique.
- AC8: the chevron uses only `var()` colours (check-css-tokens allows that); same chevron in every state; padding-left stays `--space-3`, padding-right >= 2rem.
- design.md: replace the `system-ui stack` type line and the Generic check's "system-ui stack" line, add a headings line (h1 1.75rem/700, h2 1.375rem/600, header title 1.125rem/600 not a heading) and a controls line (select chevron, date input).
- AC10: the controller runs the critique in `verify` on `npm run drive -- screens` after T49+T50 and records it in log.md; a11y.spec already scans the 9 drive screens.
- One primary per screen: on the task page "Save labels" becomes secondary (Save changes stays primary); part of T50.

- [x] T49 Heading hierarchy on every screen: font stack, `h1` page titles, `h2` sections at 1.375rem/600, header title not a heading, calendar day numbers not headings, design.md tokens updated (font stack, heading roles). Update tests that assert levels (calendar.spec level 2 -> 1, move.spec column level 3 -> 2, duplicate.spec level 1 stays meaning the task title, any `locator("h2")`). Proof: new `e2e/headings.spec.ts` "AC1-AC5: every screen has one h1 page title, the largest text, and every heading is 22px+, bold, and renders bold" over all 9 screens at both widths (seed with helpers like a11y.spec does); AC6 in calendar.spec; full suite green. Needs: none
- [x] T50 Form controls as one family: selects `appearance: none` with a token-coloured chevron (e.g. two linear-gradients of `var(--muted)`), padding-right for it; date input matched to text inputs (padding, colour, picker indicator sized to fit); checkbox accent kept; task page "Save labels" secondary; design.md controls line updated. Proof: new `e2e/controls.spec.ts` "AC7-AC9: every screen's inputs, selects, date inputs and buttons share height, radius, border and font; selects have a chevron; checkboxes use the accent" over all 9 screens at both widths; `npm run lint`. Needs: none

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
