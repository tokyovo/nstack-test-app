"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth-actions";
import { requireUser } from "@/lib/auth";
import { createProject, deleteProject, inviteMember, renameProject } from "@/lib/projects";
import { addComment } from "@/lib/comments";
import { MAX_TITLE_LENGTH } from "@/lib/limits";
import { isStatus } from "@/lib/statuses";
import { createTask, moveTask } from "@/lib/tasks";

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

export async function createTaskAction(projectId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (title.length > MAX_TITLE_LENGTH) return { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` };
  const description = String(formData.get("description") ?? "").trim();
  const assignee = String(formData.get("assigneeId") ?? "");
  const assigneeId = assignee ? Number(assignee) : null;
  if (assigneeId !== null && !Number.isInteger(assigneeId)) return { error: TASK_ERRORS["not-member"] };
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  if (dueDate !== null && !isDate(dueDate)) return { error: "Due date must be a date" };
  const result = createTask(user.id, projectId, { title, description, assigneeId, dueDate });
  if (result !== "created") return { error: TASK_ERRORS[result] };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

/** Moves a task to another column; called from the board with untrusted arguments. */
export async function moveTaskAction(projectId: number, taskId: unknown, status: unknown): Promise<void> {
  const user = await requireUser();
  if (!Number.isInteger(taskId) || !isStatus(status)) return;
  if (moveTask(user.id, projectId, taskId as number, status)) revalidatePath(`/projects/${projectId}`);
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
