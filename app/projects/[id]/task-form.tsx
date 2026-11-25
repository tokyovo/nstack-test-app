"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth-actions";
import type { Member } from "@/lib/projects";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  members: Member[];
};

/** New-task form for a project page; the assignee is picked from the project's members. */
export function TaskForm({ action, members }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Title <input name="title" required />
      </label>
      <label>
        Description <textarea name="description" />
      </label>
      <label>
        Assignee{" "}
        <select name="assigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        Due date <input name="dueDate" type="date" />
      </label>
      <button type="submit" disabled={pending}>
        Add task
      </button>
    </form>
  );
}
