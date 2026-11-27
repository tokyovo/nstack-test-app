import "server-only";
import Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import type { LabelColor } from "@/lib/label-colors";
import { getProject } from "@/lib/projects";
import { getTask } from "@/lib/tasks";

export type Label = { id: number; name: string; color: LabelColor };

export type CreateLabelResult = "created" | "not-found" | "duplicate";

export type UpdateLabelResult = "updated" | "not-found" | "duplicate";

/** The labels table allows one name per project in any case. */
function isDuplicateName(error: unknown): boolean {
  return error instanceof Database.SqliteError && error.code === "SQLITE_CONSTRAINT_UNIQUE";
}

/** The project's labels in name order (any case); empty if the user is not a member. */
export function listLabels(userId: number, projectId: number): Label[] {
  if (!getProject(userId, projectId)) return [];
  return getDb()
    .prepare("SELECT id, name, color FROM labels WHERE project_id = ? ORDER BY name COLLATE NOCASE, id")
    .all(projectId) as Label[];
}

/** Adds a label to the project if the user is a member; a name already there in any case is a duplicate. */
export function createLabel(userId: number, projectId: number, name: string, color: LabelColor): CreateLabelResult {
  if (!getProject(userId, projectId)) return "not-found";
  try {
    getDb().prepare("INSERT INTO labels (project_id, name, color) VALUES (?, ?, ?)").run(projectId, name, color);
  } catch (error) {
    if (isDuplicateName(error)) return "duplicate";
    throw error;
  }
  return "created";
}

/**
 * Renames and recolours a label of the project if the user is a member; another label's name in any case
 * is a duplicate, the label's own name in another case is not.
 */
export function updateLabel(
  userId: number,
  projectId: number,
  labelId: number,
  name: string,
  color: LabelColor,
): UpdateLabelResult {
  if (!getProject(userId, projectId)) return "not-found";
  try {
    const { changes } = getDb()
      .prepare("UPDATE labels SET name = ?, color = ? WHERE id = ? AND project_id = ?")
      .run(name, color, labelId, projectId);
    return changes === 0 ? "not-found" : "updated";
  } catch (error) {
    if (isDuplicateName(error)) return "duplicate";
    throw error;
  }
}

/** Deletes a label of the project (and so its task links) if the user is a member; true when one was deleted. */
export function deleteLabel(userId: number, projectId: number, labelId: number): boolean {
  if (!getProject(userId, projectId)) return false;
  return getDb().prepare("DELETE FROM labels WHERE id = ? AND project_id = ?").run(labelId, projectId).changes > 0;
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
