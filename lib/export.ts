import "server-only";
import { COLUMN_NAMES } from "@/lib/statuses";
import type { Project } from "@/lib/projects";
import type { Task } from "@/lib/tasks";

const CSV_HEADER = ["id", "title", "description", "status", "assignee", "due_date"];

/** Prefixes `'` to a value a spreadsheet would run as a formula. */
function guardFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** One RFC 4180 cell: quoted, with inner quotes doubled, when it holds a comma, quote, CR or LF. */
function csvCell(value: string): string {
  const safe = guardFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** The tasks as a UTF-8 CSV (with BOM, CRLF after every row), in the given order. */
export function tasksToCsv(tasks: Task[]): string {
  const rows = [
    CSV_HEADER,
    ...tasks.map((task) => [
      String(task.id),
      task.title,
      task.description,
      COLUMN_NAMES[task.status],
      task.assigneeEmail ?? "",
      task.dueDate ?? "",
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",") + "\r\n").join("");
}

/** The project and its tasks as compact JSON (stored status keys, null for no assignee or due date). */
export function tasksToJson(project: Project, tasks: Task[]): string {
  return JSON.stringify({
    project: { id: project.id, name: project.name },
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignee: task.assigneeEmail,
      dueDate: task.dueDate,
    })),
  });
}
