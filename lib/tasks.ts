import "server-only";
import { getDb } from "@/lib/db";
import { getProject } from "@/lib/projects";

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export type Task = {
  id: number;
  title: string;
  description: string;
  status: Status;
  dueDate: string | null;
  assigneeEmail: string | null;
};

export type NewTask = { title: string; description: string; assigneeId: number | null; dueDate: string | null };

export type CreateTaskResult = "created" | "not-found" | "not-member";

/** Tasks in the project, oldest first; empty if the user is not a member. */
export function listTasks(userId: number, projectId: number): Task[] {
  if (!getProject(userId, projectId)) return [];
  return getDb()
    .prepare(
      `SELECT tasks.id, tasks.title, tasks.description, tasks.status, tasks.due_date AS dueDate, users.email AS assigneeEmail
       FROM tasks LEFT JOIN users ON users.id = tasks.assignee_id
       WHERE tasks.project_id = ? ORDER BY tasks.id`,
    )
    .all(projectId) as Task[];
}

/** Adds a task in "To do" if the user is a member; the assignee, if any, must be a member too. */
export function createTask(userId: number, projectId: number, task: NewTask): CreateTaskResult {
  if (!getProject(userId, projectId)) return "not-found";
  const db = getDb();
  if (task.assigneeId !== null) {
    const member = db
      .prepare("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?")
      .get(projectId, task.assigneeId);
    if (!member) return "not-member";
  }
  db.prepare("INSERT INTO tasks (project_id, title, description, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)").run(
    projectId,
    task.title,
    task.description,
    task.assigneeId,
    task.dueDate,
  );
  return "created";
}
