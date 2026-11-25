"use client";

import { useActionState } from "react";
import type { FormState } from "./auth-actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
};

/** Email + password form shared by the login and signup pages; shows the action's error. */
export function CredentialsForm({ action, submitLabel, passwordAutoComplete }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Email <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Password <input name="password" type="password" required autoComplete={passwordAutoComplete} />
      </label>
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}
