import "server-only";
import { getDb } from "@/lib/db";

export type Project = { id: number; name: string };

/** Projects the user is a member of, oldest first. */
export function listProjects(userId: number): Project[] {
  return getDb()
    .prepare(
      "SELECT projects.id, projects.name FROM projects JOIN project_members ON project_members.project_id = projects.id WHERE project_members.user_id = ? ORDER BY projects.id",
    )
    .all(userId) as Project[];
}

/** The project if the user is a member of it, else null (non-members cannot tell it exists). */
export function getProject(userId: number, projectId: number): Project | null {
  const row = getDb()
    .prepare(
      "SELECT projects.id, projects.name FROM projects JOIN project_members ON project_members.project_id = projects.id WHERE projects.id = ? AND project_members.user_id = ?",
    )
    .get(projectId, userId) as Project | undefined;
  return row ?? null;
}

/** Creates a project with the user as its first member. */
export function createProject(userId: number, name: string): Project {
  const db = getDb();
  return db.transaction(() => {
    const id = Number(db.prepare("INSERT INTO projects (name) VALUES (?)").run(name).lastInsertRowid);
    db.prepare("INSERT INTO project_members (project_id, user_id) VALUES (?, ?)").run(id, userId);
    return { id, name };
  })();
}

const MEMBER_CHECK = "EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = ?)";

/** Renames the project if the user is a member; returns whether it changed. */
export function renameProject(userId: number, projectId: number, name: string): boolean {
  return (
    getDb().prepare(`UPDATE projects SET name = ? WHERE id = ? AND ${MEMBER_CHECK}`).run(name, projectId, userId)
      .changes > 0
  );
}

/** Deletes the project (and, by cascade, its members and tasks) if the user is a member. */
export function deleteProject(userId: number, projectId: number): boolean {
  return getDb().prepare(`DELETE FROM projects WHERE id = ? AND ${MEMBER_CHECK}`).run(projectId, userId).changes > 0;
}

export type Member = { id: number; email: string };

/** Members of the project, oldest first; empty if the user is not a member. */
export function listMembers(userId: number, projectId: number): Member[] {
  if (!getProject(userId, projectId)) return [];
  return getDb()
    .prepare(
      "SELECT users.id, users.email FROM users JOIN project_members ON project_members.user_id = users.id WHERE project_members.project_id = ? ORDER BY users.id",
    )
    .all(projectId) as Member[];
}

export type InviteResult = "invited" | "not-found" | "no-user" | "already-member";

/** Adds the existing user with that email to the project, if the inviter is a member. */
export function inviteMember(userId: number, projectId: number, email: string): InviteResult {
  if (!getProject(userId, projectId)) return "not-found";
  const db = getDb();
  const invitee = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
  if (!invitee) return "no-user";
  const { changes } = db
    .prepare("INSERT INTO project_members (project_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
    .run(projectId, invitee.id);
  return changes ? "invited" : "already-member";
}
