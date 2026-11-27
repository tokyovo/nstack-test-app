import "server-only";
import { getDb } from "@/lib/db";
import type { Label } from "@/lib/labels";
import { MAX_TITLE_LENGTH } from "@/lib/limits";
import { getProject } from "@/lib/projects";
import type { Status } from "@/lib/statuses";

export type Task = {
  id: number;
  title: string;
  description: string;
  status: Status;
  dueDate: string | null;
  assigneeId: number | null;
  assigneeEmail: string | null;
  /** The task's labels in name order (any case). */
  labels: Label[];
  /** Checklist items ticked, and all items; both 0 for a task without a checklist. */
  checklistDone: number;
  checklistTotal: number;
};

type TaskRow = Omit<Task, "labels">;

const TASK_SELECT = `SELECT tasks.id, tasks.title, tasks.description, tasks.status, tasks.due_date AS dueDate, tasks.assignee_id AS assigneeId, users.email AS assigneeEmail,
       (SELECT COUNT(*) FROM checklist_items WHERE task_id = tasks.id) AS checklistTotal,
       (SELECT COALESCE(SUM(done), 0) FROM checklist_items WHERE task_id = tasks.id) AS checklistDone
       FROM tasks LEFT JOIN users ON users.id = tasks.assignee_id`;

/** The rows with each task's labels attached, read in one query. */
function withLabels(rows: TaskRow[]): Task[] {
  const labels = getDb()
    .prepare(
      `SELECT task_labels.task_id AS taskId, labels.id, labels.name, labels.color
       FROM task_labels JOIN labels ON labels.id = task_labels.label_id
       WHERE task_labels.task_id IN (SELECT value FROM json_each(?))
       ORDER BY labels.name COLLATE NOCASE, labels.id`,
    )
    .all(JSON.stringify(rows.map((row) => row.id))) as (Label & { taskId: number })[];
  return rows.map((row) => ({
    ...row,
    labels: labels.filter((label) => label.taskId === row.id).map(({ id, name, color }) => ({ id, name, color })),
  }));
}

export type NewTask = { title: string; description: string; assigneeId: number | null; dueDate: string | null };

export type CreateTaskResult = "created" | "not-found" | "not-member";

export type UpdateTaskResult = "updated" | "not-found" | "not-member";

function isMember(projectId: number, userId: number): boolean {
  return !!getDb().prepare("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, userId);
}

/** Tasks in the project, oldest first; empty if the user is not a member. */
export function listTasks(userId: number, projectId: number): Task[] {
  if (!getProject(userId, projectId)) return [];
  const rows = getDb().prepare(`${TASK_SELECT} WHERE tasks.project_id = ? ORDER BY tasks.id`).all(projectId);
  return withLabels(rows as TaskRow[]);
}

/** Adds a task in "To do" if the user is a member; the assignee, if any, must be a member too. */
export function createTask(userId: number, projectId: number, task: NewTask): CreateTaskResult {
  if (!getProject(userId, projectId)) return "not-found";
  if (task.assigneeId !== null && !isMember(projectId, task.assigneeId)) return "not-member";
  getDb().prepare("INSERT INTO tasks (project_id, title, description, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)").run(
    projectId,
    task.title,
    task.description,
    task.assigneeId,
    task.dueDate,
  );
  return "created";
}

/** Sets a task's status if it is in the project and the user is a member; false otherwise. */
export function moveTask(userId: number, projectId: number, taskId: number, status: Status): boolean {
  if (!getProject(userId, projectId)) return false;
  const result = getDb()
    .prepare("UPDATE tasks SET status = ? WHERE id = ? AND project_id = ?")
    .run(status, taskId, projectId);
  return result.changes > 0;
}

/** The task if it is in the project and the user is a member; null otherwise. */
export function getTask(userId: number, projectId: number, taskId: number): Task | null {
  if (!getProject(userId, projectId)) return null;
  const row = getDb().prepare(`${TASK_SELECT} WHERE tasks.id = ? AND tasks.project_id = ?`).get(taskId, projectId);
  return row ? withLabels([row as TaskRow])[0] : null;
}

/** Replaces a task's fields if it is in the project and the user is a member; the assignee, if any, must be a member too. */
export function updateTask(userId: number, projectId: number, taskId: number, task: NewTask): UpdateTaskResult {
  if (!getProject(userId, projectId)) return "not-found";
  if (task.assigneeId !== null && !isMember(projectId, task.assigneeId)) return "not-member";
  const result = getDb()
    .prepare(
      "UPDATE tasks SET title = ?, description = ?, assignee_id = ?, due_date = ? WHERE id = ? AND project_id = ?",
    )
    .run(task.title, task.description, task.assigneeId, task.dueDate, taskId, projectId);
  return result.changes > 0 ? "updated" : "not-found";
}

/**
 * Copies a task of the project into "To do" as "Copy of <title>" (cut to the title limit), with its description,
 * due date, labels and checklist (all unticked), but no comments; the assignee is kept only if still a member.
 * Returns the copy's id, or null unless the task is in the project and the user is a member.
 */
export function duplicateTask(userId: number, projectId: number, taskId: number): number | null {
  const task = getTask(userId, projectId, taskId);
  if (!task) return null;
  const db = getDb();
  const assigneeId = task.assigneeId !== null && isMember(projectId, task.assigneeId) ? task.assigneeId : null;
  return db.transaction(() => {
    const copyId = Number(
      db
        .prepare("INSERT INTO tasks (project_id, title, description, assignee_id, due_date) VALUES (?, ?, ?, ?, ?)")
        .run(projectId, `Copy of ${task.title}`.slice(0, MAX_TITLE_LENGTH), task.description, assigneeId, task.dueDate)
        .lastInsertRowid,
    );
    db.prepare("INSERT INTO task_labels (task_id, label_id) SELECT ?, label_id FROM task_labels WHERE task_id = ?").run(
      copyId,
      taskId,
    );
    db.prepare(
      "INSERT INTO checklist_items (task_id, text) SELECT ?, text FROM checklist_items WHERE task_id = ? ORDER BY id",
    ).run(copyId, taskId);
    return copyId;
  })();
}

/** Deletes the task (and, by cascade, its comments, labels and checklist) if it is in the project and the user is a member. */
export function deleteTask(userId: number, projectId: number, taskId: number): boolean {
  if (!getProject(userId, projectId)) return false;
  return getDb().prepare("DELETE FROM tasks WHERE id = ? AND project_id = ?").run(taskId, projectId).changes > 0;
}
