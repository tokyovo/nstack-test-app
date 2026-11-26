import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listChecklist } from "@/lib/checklist";
import { listComments } from "@/lib/comments";
import { listLabels } from "@/lib/labels";
import { getProject, listMembers } from "@/lib/projects";
import { COLUMN_NAMES } from "@/lib/statuses";
import { getTask } from "@/lib/tasks";
import {
  addChecklistItemAction,
  addCommentAction,
  deleteChecklistItemAction,
  deleteTaskAction,
  saveTaskLabelsAction,
  toggleChecklistItemAction,
  updateTaskAction,
} from "../../../actions";
import { ConfirmButton } from "../../../confirm-button";
import { TaskForm } from "../../task-form";
import { ChecklistForm } from "./checklist-form";
import { Checklist } from "./checklist";
import { CommentForm } from "./comment-form";
import { TaskLabelsForm } from "./task-labels-form";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: PageProps<"/projects/[id]/tasks/[taskId]">) {
  const user = await requireUser();
  const { id, taskId } = await params;
  const projectId = Number(id);
  const project = Number.isInteger(projectId) ? getProject(user.id, projectId) : null;
  const task = project && Number.isInteger(Number(taskId)) ? getTask(user.id, project.id, Number(taskId)) : null;
  if (!project || !task) notFound();
  const comments = listComments(user.id, project.id, task.id);
  const members = listMembers(user.id, project.id);
  const labels = listLabels(user.id, project.id);
  const checklist = listChecklist(user.id, project.id, task.id);
  return (
    <main>
      <p>
        <Link href={`/projects/${project.id}`}>{project.name}</Link>
      </p>
      <h2>{task.title}</h2>
      <dl>
        <dt>Status</dt>
        <dd>{COLUMN_NAMES[task.status]}</dd>
        <dt>Assignee</dt>
        <dd>{task.assigneeEmail ?? "Unassigned"}</dd>
        <dt>Due date</dt>
        <dd>{task.dueDate ?? "No due date"}</dd>
        <dt>Description</dt>
        <dd>{task.description || "No description"}</dd>
      </dl>
      <section>
        <h3>Edit task</h3>
        <TaskForm
          action={updateTaskAction.bind(null, project.id, task.id)}
          members={members}
          task={task}
          submitLabel="Save changes"
        />
        <form action={deleteTaskAction.bind(null, project.id, task.id)}>
          <ConfirmButton message={`Delete task "${task.title}"? This also deletes its comments.`}>
            Delete task
          </ConfirmButton>
        </form>
      </section>
      <section aria-labelledby="task-labels-heading">
        <h3 id="task-labels-heading">Labels</h3>
        {labels.length === 0 ? (
          <p>No labels yet</p>
        ) : (
          <TaskLabelsForm
            action={saveTaskLabelsAction.bind(null, project.id, task.id)}
            labels={labels}
            checked={task.labels.map((label) => label.id)}
          />
        )}
      </section>
      <section aria-labelledby="checklist-heading">
        <h3 id="checklist-heading">Checklist</h3>
        {checklist.length === 0 && <p>No items yet</p>}
        <Checklist
          rows={checklist.map((item) => ({
            item,
            toggle: toggleChecklistItemAction.bind(null, project.id, task.id, item.id),
            remove: deleteChecklistItemAction.bind(null, project.id, task.id, item.id),
          }))}
        />
        <ChecklistForm action={addChecklistItemAction.bind(null, project.id, task.id)} />
      </section>
      <section>
        <h3>Comments</h3>
        <ul aria-label="Comments">
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.authorEmail}</strong> <time>{comment.createdAt}</time>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
        <CommentForm action={addCommentAction.bind(null, project.id, task.id)} />
      </section>
    </main>
  );
}
