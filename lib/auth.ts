import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "session";

export type User = { id: number; email: string };

/** Sessions expire this many days after they start (fixed, no sliding renewal). */
export const SESSION_DAYS = 30;

/** Returns the logged-in user from the session cookie, or null. */
export async function getCurrentUser(): Promise<User | null> {
  // cookies() first: it opts the page out of build-time prerendering, so the build never opens the DB.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const db = getDb(); // opened even without a cookie so the schema exists from the first request
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT users.id, users.email, sessions.created_at <= datetime('now', ?) AS expired
       FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?`,
    )
    .get(`-${SESSION_DAYS} days`, token) as (User & { expired: number }) | undefined;
  if (!row) return null;
  if (row.expired) {
    // The stale cookie cannot be cleared here (pages may not set cookies); without its row it is inert.
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, email: row.email };
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

/**
 * Starts a session for the user and sets the httpOnly, SameSite=Lax session cookie, which lasts
 * SESSION_DAYS and is Secure in production unless INSECURE_COOKIES=1 (the http e2e server sets it).
 */
export async function startSession(userId: number): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  getDb().prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
  });
}

/** Returns the user if the email exists and the password matches its scrypt hash, else null. */
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const row = getDb()
    .prepare("SELECT id, email, password_hash, password_salt FROM users WHERE email = ?")
    .get(email) as { id: number; email: string; password_hash: string; password_salt: string } | undefined;
  if (!row) return null;
  const hash = Buffer.from(await scrypt(password, row.password_salt), "hex");
  const stored = Buffer.from(row.password_hash, "hex");
  if (hash.length !== stored.length || !crypto.timingSafeEqual(hash, stored)) return null;
  return { id: row.id, email: row.email };
}

/** Deletes the current session row and clears the cookie. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(SESSION_COOKIE);
}
