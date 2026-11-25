"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth-actions";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState> };

/** New-comment form on a task page; React resets the form after each submit. */
export function CommentForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Comment <textarea name="body" required />
      </label>
      <button type="submit" disabled={pending}>
        Add comment
      </button>
    </form>
  );
}
