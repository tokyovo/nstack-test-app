import "server-only";
import Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { getTask } from "@/lib/tasks";

export type Label = { id: number; name: string };

export type CreateLabelResult = "created" | "not-found" | "duplicate";

/** The project's labels in name order (any case); empty if the user is not a member. */
export function listLabels(userId: number, projectId: number): Label[] {
  if (!getProject(userId, projectId)) return [];
  return getDb()
    .prepare("SELECT id, name FROM labels WHERE project_id = ? ORDER BY name COLLATE NOCASE, id")
    .all(projectId) as Label[];
}

/** Adds a label to the project if the user is a member; a name already there in any case is a duplicate. */
export function createLabel(userId: number, projectId: number, name: string): CreateLabelResult {
  if (!getProject(userId, projectId)) return "not-found";
  try {
    getDb().prepare("INSERT INTO labels (project_id, name) VALUES (?, ?)").run(projectId, name);
  } catch (error) {
    if (error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE") return "duplicate";
    throw error;
  }
  return "created";
}

/**
 * Sets the task's labels to exactly the given ids that are labels of its project (others are ignored),
 * if the task is in the project and the user is a member; false otherwise.
 */
export function setTaskLabels(userId: number, projectId: number, taskId: number, labelIds: number[]): boolean {
  if (!getTask(userId, projectId, taskId)) return false;
  const db = getDb();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO task_labels (task_id, label_id) SELECT ?, id FROM labels WHERE id = ? AND project_id = ?",
  );
  db.transaction(() => {
    db.prepare("DELETE FROM task_labels WHERE task_id = ?").run(taskId);
    for (const labelId of labelIds) insert.run(taskId, labelId, projectId);
  })();
  return true;
}
