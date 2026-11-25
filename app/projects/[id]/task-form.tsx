"use client";

import { useActionState } from "react";
import type { TaskFormState } from "@/app/projects/actions";
import type { Member } from "@/lib/projects";
import { MAX_TITLE_LENGTH } from "@/lib/limits";

export type TaskFields = { title: string; description: string; assigneeId: number | null; dueDate: string | null };

type Props = {
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  members: Member[];
  /** The task's current fields when editing; empty for a new task. */
  task?: TaskFields;
  submitLabel?: string;
};

/**
 * New- or edit-task form; the assignee is picked from the project's members. After an error it is
 * refilled with what the user typed; otherwise it shows the task's fields (or is empty).
 */
export function TaskForm({ action, members, task, submitLabel = "Add task" }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? {
    title: task?.title ?? "",
    description: task?.description ?? "",
    assigneeId: String(task?.assigneeId ?? ""),
    dueDate: task?.dueDate ?? "",
  };
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Title <input name="title" required maxLength={MAX_TITLE_LENGTH} defaultValue={values.title} />
      </label>
      <label>
        Description <textarea name="description" defaultValue={values.description} />
      </label>
      <label>
        Assignee{" "}
        {/* Keyed so a changed default takes effect: the form reset after an action keeps the old selection. */}
        <select key={values.assigneeId} name="assigneeId" defaultValue={values.assigneeId}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        Due date <input name="dueDate" type="date" defaultValue={values.dueDate} />
      </label>
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
