import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject, listMembers } from "@/lib/projects";
import { localToday } from "@/lib/due-dates";
import { listTasks } from "@/lib/tasks";
import { createTaskAction, inviteMemberAction, moveTaskAction } from "../actions";
import { Board } from "./board";
import { InviteForm } from "./invite-form";
import { TaskForm } from "./task-form";

export const dynamic = "force-dynamic";

/** A query value as one string: the first entry of a repeated key, "" when missing. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? getProject(user.id, id) : null;
  if (!project) notFound();
  const members = listMembers(user.id, project.id);
  const tasks = listTasks(user.id, project.id);
  const query = await searchParams;
  return (
    <main>
      <h2>{project.name}</h2>
      <p className="export-links">
        {/* A plain link, not next/link: a download from a route handler, no prefetch or client navigation. */}
        <a href={`/projects/${project.id}/export?format=csv`} download>
          Export CSV
        </a>{" "}
        <a href={`/projects/${project.id}/export?format=json`} download>
          Export JSON
        </a>
      </p>
      <TaskForm action={createTaskAction.bind(null, project.id)} members={members} />
      <Board
        projectId={project.id}
        tasks={tasks}
        members={members}
        userId={user.id}
        today={localToday()}
        move={moveTaskAction.bind(null, project.id)}
        initialQuery={first(query.q)}
        initialAssignee={first(query.for)}
      />
      <section>
        <h3>Members</h3>
        <ul aria-label="Members">
          {members.map((member) => (
            <li key={member.id}>{member.email}</li>
          ))}
        </ul>
        <InviteForm action={inviteMemberAction.bind(null, project.id)} />
      </section>
    </main>
  );
}
