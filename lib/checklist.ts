import "server-only";
import { getDb } from "@/lib/db";
import { getTask } from "@/lib/tasks";

export type ChecklistItem = { id: number; text: string; done: boolean };

/** The task's checklist in the order added; empty unless the task is in the project and the user is a member. */
export function listChecklist(userId: number, projectId: number, taskId: number): ChecklistItem[] {
  if (!getTask(userId, projectId, taskId)) return [];
  const rows = getDb()
    .prepare("SELECT id, text, done FROM checklist_items WHERE task_id = ? ORDER BY id")
    .all(taskId) as { id: number; text: string; done: 0 | 1 }[];
  return rows.map((row) => ({ ...row, done: row.done === 1 }));
}

/** Adds an unticked item to the end if the task is in the project and the user is a member; false otherwise. */
export function addChecklistItem(userId: number, projectId: number, taskId: number, text: string): boolean {
  if (!getTask(userId, projectId, taskId)) return false;
  getDb().prepare("INSERT INTO checklist_items (task_id, text) VALUES (?, ?)").run(taskId, text);
  return true;
}

/** Ticks or unticks an item of the task, if the task is in the project and the user is a member; false otherwise. */
export function setChecklistItemDone(
  userId: number,
  projectId: number,
  taskId: number,
  itemId: number,
  done: boolean,
): boolean {
  if (!getTask(userId, projectId, taskId)) return false;
  const result = getDb()
    .prepare("UPDATE checklist_items SET done = ? WHERE id = ? AND task_id = ?")
    .run(done ? 1 : 0, itemId, taskId);
  return result.changes > 0;
}

/** Deletes an item of the task, if the task is in the project and the user is a member; false otherwise. */
export function deleteChecklistItem(userId: number, projectId: number, taskId: number, itemId: number): boolean {
  if (!getTask(userId, projectId, taskId)) return false;
  return getDb().prepare("DELETE FROM checklist_items WHERE id = ? AND task_id = ?").run(itemId, taskId).changes > 0;
}
