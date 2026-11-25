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

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? getProject(user.id, id) : null;
  if (!project) notFound();
  const members = listMembers(user.id, project.id);
  const tasks = listTasks(user.id, project.id);
  return (
    <main>
      <h2>{project.name}</h2>
      <TaskForm action={createTaskAction.bind(null, project.id)} members={members} />
      <Board projectId={project.id} tasks={tasks} members={members} userId={user.id} today={localToday()} move={moveTaskAction.bind(null, project.id)} />
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
