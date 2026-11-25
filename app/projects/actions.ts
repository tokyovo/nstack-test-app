"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/auth-actions";
import { requireUser } from "@/lib/auth";
import { createProject, deleteProject, inviteMember, renameProject } from "@/lib/projects";

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
