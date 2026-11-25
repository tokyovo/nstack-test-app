# Research 2026-11-25
Category: kanban / task board web app for small teams | Sources read: 29

Sources were five open-source kanban projects' most-upvoted open issues (vote count in brackets), Hacker News comments (Algolia API), review sites (Capterra/G2 excerpts seen in search results), vendor trackers and forums (Trello Jira, Asana forum), and comparison articles. Reddit threads did not come up in search. "accessed" marks pages that show no date.

Already have: email+password auth, projects, invite existing users, tasks (title, description, single assignee, due date), 3 fixed columns, drag-and-drop + keyboard moves, comments, search within a project.

## Needs
1. See overdue and due-soon tasks at a glance (in-app, no email). Status: missing. Evidence: 4 sources.
   - https://github.com/plankanban/planka/issues/1042 (2025-02-21) [16]: "Notification on due date"
   - https://github.com/plankanban/planka/issues/461 (2023-06-08) [11]: "Notifications for cards that passed due date"
   - https://github.com/kanboard/kanboard/issues/5595 (2024-11-12): "send notifications for soon overdue tasks"
   - https://www.capterra.com/p/139990/MeisterTask/reviews/?page=4 (accessed 2026-11-25): reviewers praise a dashboard of what is due today or this week
2. "My tasks": see every task assigned to me across projects, or filter the board to them. Status: missing. Evidence: 3 sources.
   - https://github.com/kanboard/kanboard/issues/5501 (2024-06-18): "Allow users to only see tasks assigned to them"
   - https://github.com/plankanban/planka/issues/1139 (2025-05-19) [13]: "Task Dashboard"
   - https://www.capterra.com/p/139990/MeisterTask/reviews/?page=4 (accessed 2026-11-25): due today/this week dashboard
3. Checklists or subtasks inside a task. Status: missing. Evidence: 4 sources.
   - https://github.com/go-vikunja/vikunja/issues/336 (2024-10-06) [11]: "Simplify adding subtasks"
   - https://github.com/mattermost-community/focalboard/issues/252 (2021-04-13) [18]: "Subtasks"
   - https://github.com/kanboard/kanboard/issues/4824 (2021-06-03): "Show subtasks in board view"
   - https://www.capterra.com/p/132750/Kanban-Tool/reviews/ (accessed 2026-11-25): "I can also assign labels, due dates, checklists ... to each card"
4. Labels/tags on tasks, and filtering the board by them. Status: missing. Evidence: 4 sources.
   - https://github.com/go-vikunja/vikunja/issues/2023 (2025-12-23) [8]: "Project level labels"
   - https://www.capterra.com/p/140681/Kanbanchi-for-G-Suite/reviews/?page=3 (accessed 2026-11-25): reviewer likes "tag labels and colours" for filtering
   - https://www.capterra.com/p/161732/KanbanFlow/reviews (accessed 2026-11-25): "Adding labels is a little slow"
   - https://news.ycombinator.com/item?id=33970441 (2022-12-13): lists "labels" first among what makes GitHub issues enough
5. Calendar view of tasks by due date. Status: missing. Evidence: 5 sources.
   - https://github.com/plankanban/planka/issues/623 (2024-03-13) [18]: "Addition of Calendar View"
   - https://github.com/plankanban/planka/issues/1064 (2025-03-17) [12]: "Add a Calendar for organize events"
   - https://github.com/go-vikunja/vikunja/issues/1364 (2025-08-31) [11]: "Week and month calendar view"
   - https://github.com/mattermost-community/focalboard/issues/2505 (2022-03-09) [22]: "Additional Views for Calendar"
   - https://www.capterra.com/p/211559/Trello/reviews/?page=18 (accessed 2026-11-25): "I wish that it had a greater variety of views"
6. Assign a task to more than one person. Status: missing (we have a single assignee). Evidence: 3 sources.
   - https://github.com/kanboard/kanboard/issues/5432 (2024-03-12): "Assign more than one user to a task"
   - https://forum.asana.com/t/assign-multiple-assignees-on-one-task/1176?page=20 (accessed 2026-11-25): long-running request, "Assign multiple assignees on one task"
   - https://jira.atlassian.com/browse/TRELLO-757 (accessed 2026-11-25): Trello has multiple members; users ask for a "lead card member" on top
7. Duplicate a task or start one from a template. Status: missing. Evidence: 4 sources.
   - https://github.com/plankanban/planka/issues/1228 (2025-07-01) [15]: "Ability to use cards as templates"
   - https://github.com/plankanban/planka/issues/926 (2024-10-27) [8]: "Create a Template board?"
   - https://github.com/go-vikunja/vikunja/issues/490 (2025-04-01) [6]: "Templates"
   - https://github.com/plankanban/planka/issues/149 (2021-08-10) [11]: "Enable duplication of resources (boards, cards)"
8. Export a project's tasks (CSV/JSON) for backup or spreadsheets. Status: missing. Evidence: 4 sources.
   - https://github.com/plankanban/planka/issues/670 (2024-04-04): "Export (json, csv)"
   - https://github.com/kanboard/kanboard/issues/5624 (2025-01-26): "Backup to json / Restore from json"
   - https://github.com/kanboard/kanboard/issues/4795 (2021-04-23): "Export / import of task"
   - https://jira.atlassian.com/browse/TRELLO-1064 (accessed 2026-11-25): "export one specific List in CSV format"
9. Link related tasks to each other. Status: missing. Evidence: 3 sources.
   - https://github.com/plankanban/planka/issues/522 (2023-10-17) [9]: "Board/Card Linking"
   - https://github.com/mattermost-community/focalboard/issues/4850 (2021-04-24) [40]: "Link to another card"
   - https://github.com/mattermost-community/focalboard/issues/129 (2021-03-19) [16]: "ability to reference other tasks"
10. Board usable on a phone (responsive web, not native apps). Status: missing (not a stated feature; untested). Evidence: 4 sources.
   - https://github.com/plankanban/planka/issues/19 (2020-08-12) [20]: "Mobile Support"
   - https://github.com/mattermost-community/focalboard/issues/160 (2021-03-21) [75]: "mobile apps"
   - https://github.com/kanboard/kanboard/issues/5379 (2023-11-24): "Progressive web app"
   - https://www.capterra.com/p/140681/Kanbanchi-for-G-Suite/reviews/?page=5 (accessed 2026-11-25): weak mobile experience, wants more than "using my browser"
11. Recurring tasks. Status: missing. Evidence: 3 sources.
   - https://github.com/go-vikunja/vikunja/issues/1369 (2025-09-01) [11]: "More precise settings for the recurrence of a task"
   - https://github.com/go-vikunja/vikunja/issues/1872 (2025-11-25) [6]: "Configurable Behaviour for repeat tasks"
   - https://www.capterra.com/p/132750/Kanban-Tool/reviews/ (accessed 2026-11-25): "It would be great to have a card automatically recur"
12. Time estimates / time tracking on tasks. Status: missing. Evidence: 4 sources.
   - https://github.com/go-vikunja/vikunja/issues/2521 (2026-04-02) [8]: "Task Time Tracking with Timer"
   - https://github.com/go-vikunja/vikunja/issues/46 (2022-08-25) [13]: "Set estimated time"
   - https://github.com/mattermost-community/focalboard/issues/1982 (2021-12-14) [14]: "Task time tracking"
   - https://toggl.com/blog/?p=20409 (accessed 2026-11-25): Trello's lack of native time tracking named as a core shortcoming
13. Timeline / Gantt view. Status: missing. Evidence: 3 sources.
   - https://github.com/mattermost-community/focalboard/issues/662 (2021-07-01) [35]: "Timeline / Gantt"
   - https://github.com/plankanban/planka/issues/57 (2020-12-02) [9]: "Add a Gantt Chart"
   - https://www.capterra.com/p/211559/Trello/reviews/?page=18 (accessed 2026-11-25): wants "lists and Gantt"

## Already covered
- Search cards within a board: https://github.com/plankanban/planka/issues/308 (2022-10-04) [10]
- Due dates on tasks: https://github.com/mattermost-community/focalboard/issues/257 (2021-04-13) [19]

## Not pursued
- Email notifications and reminders (https://github.com/plankanban/planka/issues/493, 2023-08-15; Kanban Tool email digest), because email delivery is out of scope. Need 1 covers the in-app part.
- SSO / OAuth / OIDC (https://github.com/mattermost-community/focalboard/issues/103, 2021-03-18; https://github.com/go-vikunja/vikunja/issues/1501, 2025-09-15), out of scope.
- Attachments and inline images (https://github.com/kanboard/kanboard/issues/4752, 2021-03-11; https://github.com/kanboard/kanboard/issues/4893, 2021-10-08), out of scope.
- Real-time shared board state (https://news.ycombinator.com/item?id=44385574, 2025-06-26), out of scope.
- Native mobile apps and desktop packages, out of scope (no deployment). The in-scope part is need 10.
- Custom columns, swimlanes, column sorting (https://news.ycombinator.com/item?id=20014369, 2019-05-26; https://github.com/plankanban/planka/issues/92, 2021-03-09; https://github.com/go-vikunja/vikunja/issues/2085, 2026-01-11), because they conflict with the goal's three fixed columns. Changing that is a goal change for a human.
- WIP limits (https://news.ycombinator.com/item?id=44158637, 2025-06-02), only one recent source.
- Custom fields (https://github.com/plankanban/planka/issues/355, 2022-12-15; https://github.com/go-vikunja/vikunja/issues/120, 2022-09-22), only two sources, both near the 3-year limit.
- Archive or clear done tasks, bulk edit (https://github.com/go-vikunja/vikunja/issues/474, 2025-04-01; https://github.com/go-vikunja/vikunja/issues/114, 2022-01-01), only two sources from one project.
- Board feels slow or janky with many cards (https://news.ycombinator.com/item?id=15453213, 2017-10-11; https://github.com/kanboard/kanboard/issues/4389, 2020-01-08), sources are older than 3 years.
- Dark mode (https://github.com/plankanban/planka/issues/1043, 2025-02-22), one source.
- Public read-only boards (https://github.com/plankanban/planka/issues/602, 2024-02-14), one source, and it conflicts with members-only access.
