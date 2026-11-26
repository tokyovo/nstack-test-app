# Goal
A team task board web app: users sign up / log in with email + password, create projects, invite other existing users by email, manage tasks (title, description, assignee, due date) across three columns (To do, In progress, Done) with drag-and-drop and keyboard moves, comment on tasks, and search tasks within a project. Tasks can have labels (members create a project's labels, assign them to tasks, and filter the board by label), and a checklist of subtasks whose progress shows on the card (added 2026-11-26 by the owner). Stack: Next.js (App Router, TypeScript), SQLite in a local file, Playwright e2e tests, GitHub Actions CI. Free, local, no external APIs or keys.

## Done when
- Every feature above works in a real (headless Chromium) browser.
- Each feature is covered by a Playwright test that runs in CI.
- GitHub Actions CI is green on main.

## Out of scope
- Password reset, email delivery, OAuth, inviting users who have no account yet.
- Roles/permissions beyond "member of project" (all members are equal; any member can rename/delete/invite).
- Real-time updates between browsers, deployment, file attachments.

## Policy
- merge: auto
- branch: main
- evolve: yes
- bar: 7
