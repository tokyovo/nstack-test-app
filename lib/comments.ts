import "server-only";
import { getDb } from "@/lib/db";
import { getTask } from "@/lib/tasks";

export type Comment = { id: number; body: string; authorEmail: string; createdAt: string };

/** Comments on the task, oldest first; empty unless the task is in the project and the user is a member. */
export function listComments(userId: number, projectId: number, taskId: number): Comment[] {
  if (!getTask(userId, projectId, taskId)) return [];
  return getDb()
    .prepare(
      `SELECT comments.id, comments.body, users.email AS authorEmail, comments.created_at AS createdAt
       FROM comments JOIN users ON users.id = comments.author_id
       WHERE comments.task_id = ? ORDER BY comments.id`,
    )
    .all(taskId) as Comment[];
}

/** Adds the user's comment if the task is in the project and the user is a member; false otherwise. */
export function addComment(userId: number, projectId: number, taskId: number, body: string): boolean {
  if (!getTask(userId, projectId, taskId)) return false;
  getDb().prepare("INSERT INTO comments (task_id, author_id, body) VALUES (?, ?, ?)").run(taskId, userId, body);
  return true;
}
