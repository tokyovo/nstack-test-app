import "server-only";
import { getDb } from "@/lib/db";
import { getTask } from "@/lib/tasks";

export type Comment = { id: number; body: string; authorEmail: string; createdAt: Date };

const utcFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A comment time as shown on the task page, e.g. "27 Nov 2026, 03:50 UTC". */
export function formatCommentTime(time: Date): string {
  return `${utcFormat.format(time)} UTC`;
}

/** Comments on the task, oldest first; empty unless the task is in the project and the user is a member. */
export function listComments(userId: number, projectId: number, taskId: number): Comment[] {
  if (!getTask(userId, projectId, taskId)) return [];
  const rows = getDb()
    .prepare(
      `SELECT comments.id, comments.body, users.email AS authorEmail, comments.created_at AS createdAt
       FROM comments JOIN users ON users.id = comments.author_id
       WHERE comments.task_id = ? ORDER BY comments.id`,
    )
    .all(taskId) as (Omit<Comment, "createdAt"> & { createdAt: string })[];
  // created_at is SQLite datetime('now'): "YYYY-MM-DD HH:MM:SS" in UTC, with no zone in the text.
  return rows.map((row) => ({ ...row, createdAt: new Date(`${row.createdAt.replace(" ", "T")}Z`) }));
}

/** Adds the user's comment if the task is in the project and the user is a member; false otherwise. */
export function addComment(userId: number, projectId: number, taskId: number, body: string): boolean {
  if (!getTask(userId, projectId, taskId)) return false;
  getDb().prepare("INSERT INTO comments (task_id, author_id, body) VALUES (?, ?, ?)").run(taskId, userId, body);
  return true;
}
