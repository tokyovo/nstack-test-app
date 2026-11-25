"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createProject, deleteProject, renameProject } from "@/lib/projects";

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
