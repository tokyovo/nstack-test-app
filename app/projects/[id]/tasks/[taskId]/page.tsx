import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listComments } from "@/lib/comments";
import { getProject } from "@/lib/projects";
import { COLUMN_NAMES } from "@/lib/statuses";
import { getTask } from "@/lib/tasks";
import { addCommentAction } from "../../../actions";
import { CommentForm } from "./comment-form";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: PageProps<"/projects/[id]/tasks/[taskId]">) {
  const user = await requireUser();
  const { id, taskId } = await params;
  const projectId = Number(id);
  const project = Number.isInteger(projectId) ? getProject(user.id, projectId) : null;
  const task = project && Number.isInteger(Number(taskId)) ? getTask(user.id, project.id, Number(taskId)) : null;
  if (!project || !task) notFound();
  const comments = listComments(user.id, project.id, task.id);
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
