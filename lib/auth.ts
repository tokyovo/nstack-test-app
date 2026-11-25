import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "session";

export type User = { id: number; email: string };

/** Returns the logged-in user from the session cookie, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const db = getDb(); // opened even without a cookie so the schema exists from the first request
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?",
    )
    .get(token) as User | undefined;
  return row ?? null;
}

/** Redirect guard for pages that need a logged-in user. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
