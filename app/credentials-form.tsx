"use client";

import { useActionState } from "react";
import type { CredentialsState } from "./auth-actions";

type Props = {
  action: (prev: CredentialsState, formData: FormData) => Promise<CredentialsState>;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
};

/** Email + password form shared by the login and signup pages; shows the action's error and keeps the typed email. */
export function CredentialsForm({ action, submitLabel, passwordAutoComplete }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Email <input name="email" type="email" required autoComplete="email" defaultValue={state.email} />
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
