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

const SCRYPT_KEYLEN = 64;

function scrypt(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, key) =>
      err ? reject(err) : resolve(key.toString("hex")),
    ),
  );
}

/** Creates a user with a scrypt-hashed password; returns null if the email is taken. */
export async function createUser(email: string, password: string): Promise<User | null> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  const result = getDb()
    .prepare(
      "INSERT INTO users (email, password_hash, password_salt) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING",
    )
    .run(email, hash, salt);
  return result.changes ? { id: Number(result.lastInsertRowid), email } : null;
}

/** Starts a session for the user and sets the httpOnly, SameSite=Lax session cookie. */
export async function startSession(userId: number): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  getDb().prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
