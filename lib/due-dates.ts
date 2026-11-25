import type { Status } from "@/lib/statuses";

/** Today's date as YYYY-MM-DD in the local time zone of whoever calls it (the server, for the board). */
export function localToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A task is overdue when its due date (YYYY-MM-DD) is before `today` and it is not Done. */
export function isOverdue(task: { dueDate: string | null; status: Status }, today: string): boolean {
  return task.dueDate !== null && task.dueDate < today && task.status !== "done";
}
