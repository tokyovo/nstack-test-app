"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/auth-actions";
import { requireUser } from "@/lib/auth";
import { createProject, deleteProject, inviteMember, renameProject } from "@/lib/projects";
import { addComment } from "@/lib/comments";
import { createLabel, setTaskLabels } from "@/lib/labels";
import { MAX_LABEL_LENGTH, MAX_TITLE_LENGTH } from "@/lib/limits";
import { isStatus } from "@/lib/statuses";
import { createTask, deleteTask, moveTask, updateTask, type NewTask } from "@/lib/tasks";

function readName(formData: FormData): string {
  return String(formData.get("name") ?? "").trim();
}

function readId(formData: FormData): number {
  return Number(formData.get("projectId"));
}

export async function createProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = readName(formData);
  if (name) createProject(user.id, name);
  revalidatePath("/projects");
}

export async function renameProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const name = readName(formData);
  if (name) renameProject(user.id, readId(formData), name);
  revalidatePath("/projects");
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  deleteProject(user.id, readId(formData));
  revalidatePath("/projects");
}

const INVITE_ERRORS = {
  "not-found": "Project not found",
  "no-user": "No user with that email",
  "already-member": "That user is already a member",
} as const;

export async function inviteMemberAction(projectId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required" };
  const result = inviteMember(user.id, projectId, email);
  if (result !== "invited") return { error: INVITE_ERRORS[result] };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

/** A plain calendar date (YYYY-MM-DD) that exists, e.g. not 2026-02-30. */
function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const TASK_ERRORS = {
  "not-found": "Project not found",
  "not-member": "Assignee must be a project member",
} as const;

/** The task form fields as typed, sent back with an error so the form can be refilled. */
export type TaskFormValues = { title: string; description: string; assigneeId: string; dueDate: string };

export type TaskFormState = FormState & { values?: TaskFormValues };

function typedTask(formData: FormData): TaskFormValues {
  const field = (name: string) => String(formData.get(name) ?? "");
  return { title: field("title"), description: field("description"), assigneeId: field("assigneeId"), dueDate: field("dueDate") };
}

/** Reads and validates the task form fields shared by create and edit; an error message if invalid. */
function readTask(formData: FormData): NewTask | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (title.length > MAX_TITLE_LENGTH) return { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` };
  const description = String(formData.get("description") ?? "").trim();
  const assignee = String(formData.get("assigneeId") ?? "");
  const assigneeId = assignee ? Number(assignee) : null;
  if (assigneeId !== null && !Number.isInteger(assigneeId)) return { error: TASK_ERRORS["not-member"] };
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  if (dueDate !== null && !isDate(dueDate)) return { error: "Due date must be a date" };
  return { title, description, assigneeId, dueDate };
}

export async function createTaskAction(
  projectId: number,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();
  const task = readTask(formData);
  if ("error" in task) return { error: task.error, values: typedTask(formData) };
  const result = createTask(user.id, projectId, task);
  if (result !== "created") return { error: TASK_ERRORS[result], values: typedTask(formData) };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export async function updateTaskAction(
  projectId: number,
  taskId: number,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await requireUser();
  const task = readTask(formData);
  if ("error" in task) return { error: task.error, values: typedTask(formData) };
  const result = updateTask(user.id, projectId, taskId, task);
  if (result !== "updated") {
    return { error: result === "not-found" ? "Task not found" : TASK_ERRORS[result], values: typedTask(formData) };
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  return {};
}

/** Deletes a task, then goes back to its board; does nothing unless the user may delete it. */
export async function deleteTaskAction(projectId: number, taskId: number): Promise<void> {
  const user = await requireUser();
  if (!deleteTask(user.id, projectId, taskId)) return;
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

/** Moves a task to another column; called from the board with untrusted arguments. True when the move was stored. */
export async function moveTaskAction(projectId: number, taskId: unknown, status: unknown): Promise<boolean> {
  const user = await requireUser();
  if (!Number.isInteger(taskId) || !isStatus(status)) return false;
  if (!moveTask(user.id, projectId, taskId as number, status)) return false;
  revalidatePath(`/projects/${projectId}`);
  return true;
}

export async function addCommentAction(
  projectId: number,
  taskId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Comment is required" };
  if (!addComment(user.id, projectId, taskId, body)) return { error: "Task not found" };
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  return {};
}

export type LabelFormState = FormState & { values?: { name: string } };

const LABEL_ERRORS = {
  "not-found": "Project not found",
  duplicate: "That label already exists",
} as const;

export async function createLabelAction(
  projectId: number,
  _prev: LabelFormState,
  formData: FormData,
): Promise<LabelFormState> {
  const user = await requireUser();
  const typed = String(formData.get("name") ?? "");
  const name = typed.trim();
  if (!name) return { error: "Label name is required", values: { name: typed } };
  if (name.length > MAX_LABEL_LENGTH) {
    return { error: `Label name must be at most ${MAX_LABEL_LENGTH} characters`, values: { name: typed } };
  }
  const result = createLabel(user.id, projectId, name);
  if (result !== "created") return { error: LABEL_ERRORS[result], values: { name: typed } };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

export type SaveLabelsState = FormState & { saved?: boolean };

/** Sets a task's labels to the checked boxes; ids that are not labels of the project are ignored. */
export async function saveTaskLabelsAction(
  projectId: number,
  taskId: number,
  _prev: SaveLabelsState,
  formData: FormData,
): Promise<SaveLabelsState> {
  const user = await requireUser();
  const labelIds = formData.getAll("labelId").map(Number).filter(Number.isInteger);
  if (!setTaskLabels(user.id, projectId, taskId, labelIds)) return { error: "Task not found" };
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  return { saved: true };
}
