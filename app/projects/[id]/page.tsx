import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject, listMembers } from "@/lib/projects";
import { localToday } from "@/lib/due-dates";
import { listLabels } from "@/lib/labels";
import { listTasks } from "@/lib/tasks";
import { createLabelAction, createTaskAction, inviteMemberAction, moveTaskAction } from "../actions";
import { Board } from "./board";
import { InviteForm } from "./invite-form";
import { LabelChip } from "./label-chip";
import { LabelForm } from "./label-form";
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
  const labels = listLabels(user.id, project.id);
  const query = await searchParams;
  return (
    <main>
      <div className="board-title">
        <h2>{project.name}</h2>
        <p className="export-links">
          {/* A plain link, not next/link: a download from a route handler, no prefetch or client navigation. */}
          <a className="button" href={`/projects/${project.id}/export?format=csv`} download>
            Export CSV
          </a>
          <a className="button" href={`/projects/${project.id}/export?format=json`} download>
            Export JSON
          </a>
          <a className="button primary" href="#new-task">
            New task
          </a>
        </p>
      </div>
      <Board
        projectId={project.id}
        tasks={tasks}
        members={members}
        labels={labels}
        userId={user.id}
        today={localToday()}
        move={moveTaskAction.bind(null, project.id)}
        initialQuery={first(query.q)}
        initialAssignee={first(query.for)}
        initialLabel={first(query.label)}
      />
      {/* After the board so the columns show without scrolling; the "New task" link above jumps here. */}
      <div className="board-sections">
        <section id="new-task">
          <h3>New task</h3>
          <TaskForm action={createTaskAction.bind(null, project.id)} members={members} />
        </section>
        <section>
          <h3>Labels</h3>
          {labels.length === 0 && <p className="section-empty">No labels yet</p>}
          <ul aria-label="Labels" className="plain-list">
            {labels.map((label) => (
              <li key={label.id}>
                <LabelChip label={label} />
              </li>
            ))}
          </ul>
          <LabelForm action={createLabelAction.bind(null, project.id)} />
        </section>
        <section>
          <h3>Members</h3>
          <ul aria-label="Members" className="plain-list">
            {members.map((member) => (
              <li key={member.id}>{member.email}</li>
            ))}
          </ul>
          <InviteForm action={inviteMemberAction.bind(null, project.id)} />
        </section>
      </div>
    </main>
  );
}
