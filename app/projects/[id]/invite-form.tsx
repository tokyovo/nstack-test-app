"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/auth-actions";

type Props = { action: (prev: FormState, formData: FormData) => Promise<FormState> };

/** Invite-by-email form for a project page; shows the action's error. */
export function InviteForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Invite by email <input name="email" type="email" required />
      </label>
      <button type="submit" disabled={pending}>
        Invite
      </button>
    </form>
  );
}
