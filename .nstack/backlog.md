# Backlog
Scored 2026-11-25 (value + risk + cost, cost 5 = cheapest). Bar for a ticket: 9. Sources: UX pass (headless Chromium, screenshots /tmp/ux-shots/), research.md (29 sources), earlier reviews.

- 11 (v3 r3 c5) Project Delete runs instantly with no confirmation; one misclick destroys all tasks/comments (unrecoverable data loss). (UX) -> T9
- 10 (v4 r2 c4) No CSS: board columns render as stacked bullet lists, not three side-by-side columns; long unbroken titles stretch the page to 2765-4083px; unusable at 390px. Merges research "board usable on a phone" (4 sources). (UX + research) -> T10
- 9 (v3 r1 c5) Past-due tasks look identical to future ones; flag overdue on the board. Research "see overdue at a glance" (4 sources). (UX + research) -> T11
- 9 (v4 r2 c3) Tasks cannot be edited or deleted after creation (title, description, assignee, due date). Core flow gap. (UX) -> T12
- 8 (v2 r2 c4) Sessions never expire; add expiry (and `secure` cookie flag in production). (T2 security review)
- 8 (v3 r1 c4) Forms lose typed values after a validation error (email on signup/login, description/assignee on add task). (UX)
- 8 (v3 r1 c4) Filter board by assignee / "my tasks". Evidence: 3 sources, research.md
- 7 (v2 r1 c4) No navigation back to Projects from a board / 404 page; header not a link. (UX)
- 7 (v2 r1 c4) A failed move reverts the card silently, no error shown. (T6)
- 7 (v2 r1 c4) Board search query is not in the URL. (T8)
- 7 (v1 r1 c5) e2e temp SQLite files left in the OS temp dir; add a globalTeardown.
- 7 (v3 r1 c3) Export a project's tasks as CSV/JSON. Evidence: 4 sources, research.md
- 6 (v2 r1 c3) Labels/tags with filtering. Evidence: 4 sources, research.md
- 6 (v2 r1 c3) Checklists/subtasks. Evidence: 4 sources, research.md
- 6 (v2 r1 c3) Duplicate a task / templates. Evidence: 4 sources, research.md
- 6 (v2 r1 c4) Silent feedback: whitespace project name does nothing; no "no results" on empty search; no visible drop area in empty columns. (UX)
- 6 (v1 r1 c4) CI action majors (@v4); bump when newer majors are standard.
- 5 (v2 r1 c2) Calendar view. Evidence: 5 sources, research.md
- 5 (v2 r1 c2) Multiple assignees. Evidence: 3 sources, research.md
- 5 (v1 r1 c3) Comment timestamps shown as raw UTC with no timezone. (UX)
- 4 (v1 r1 c2) Link related tasks; recurring tasks; time tracking; timeline/Gantt (3-4 sources each, research.md).
- 3 (v1 r1 c1... cosmetic, cheap but no user value) favicon.ico 404 in console.
- Rejected: login timing leaks whether an email exists (signup/invite reveal it by design, AC2/AC7).
- Needs human (changes the goal's fixed three columns): custom columns / swimlanes, research.md.
- 5 (v2 r1 c2) (T12) Task forms reset to their defaults after a failed submit (React form-action reset), so a validation error loses the user's edits on both the new-task and edit-task forms. Fix: return the submitted values in FormState or use controlled inputs.
- 2026-11-25 (review nit, slice 2) `deleteTaskAction` (app/projects/actions.ts) does nothing visible when the delete is refused, e.g. the task was already deleted in another tab; the edit path shows "Task not found". Show the same error or redirect to the board.
