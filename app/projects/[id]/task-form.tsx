"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth-actions";
import type { Member } from "@/lib/projects";
import { MAX_TITLE_LENGTH } from "@/lib/limits";

export type TaskFields = { title: string; description: string; assigneeId: number | null; dueDate: string | null };

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  members: Member[];
  /** The task's current fields when editing; empty for a new task. */
  task?: TaskFields;
  submitLabel?: string;
};

/** New- or edit-task form; the assignee is picked from the project's members. */
export function TaskForm({ action, members, task, submitLabel = "Add task" }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Title <input name="title" required maxLength={MAX_TITLE_LENGTH} defaultValue={task?.title} />
      </label>
      <label>
        Description <textarea name="description" defaultValue={task?.description} />
      </label>
      <label>
        Assignee{" "}
        <select name="assigneeId" defaultValue={task?.assigneeId ?? ""}>
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        Due date <input name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} />
      </label>
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
