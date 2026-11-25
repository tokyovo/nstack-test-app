"use server";

import { redirect } from "next/navigation";
import { createUser, endSession, startSession, verifyCredentials } from "@/lib/auth";

export type FormState = { error?: string };

/** Credentials form state: on an error, the email the user typed (never the password), to refill the form. */
export type CredentialsState = FormState & { email?: string };

const MIN_PASSWORD_LENGTH = 8;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUpAction(_prev: CredentialsState, formData: FormData): Promise<CredentialsState> {
  const { email, password } = readCredentials(formData);
  if (!email) return { error: "Email is required" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, email };
  }
  const user = await createUser(email, password);
  if (!user) return { error: "An account with that email already exists", email };
  await startSession(user.id);
  redirect("/projects");
}

export async function logInAction(_prev: CredentialsState, formData: FormData): Promise<CredentialsState> {
  const { email, password } = readCredentials(formData);
  const user = await verifyCredentials(email, password);
  if (!user) return { error: "Invalid email or password", email };
  await startSession(user.id);
  redirect("/projects");
}

export async function logOutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
