import type { Status, Task } from "@/lib/tasks";
import { STATUSES } from "@/lib/tasks";

const COLUMN_NAMES: Record<Status, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

/** The project's tasks in three columns, one per status. */
export function Board({ tasks }: { tasks: Task[] }) {
  return (
    <div>
      {STATUSES.map((status) => {
        const name = COLUMN_NAMES[status];
        const headingId = `column-${status}`;
        return (
          <section key={status} aria-labelledby={headingId}>
            <h3 id={headingId}>{name}</h3>
            <ul>
              {tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <p>{task.assigneeEmail ?? "Unassigned"}</p>
                    <p>{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</p>
                  </li>
                ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
