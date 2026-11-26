"use client";

import { useActionState } from "react";
import type { LabelFormState } from "@/app/projects/actions";
import { MAX_LABEL_LENGTH } from "@/lib/limits";

type Props = { action: (prev: LabelFormState, formData: FormData) => Promise<LabelFormState> };

/** New-label form on a board; refilled with the typed name after an error, empty after a create. */
export function LabelForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Label name{" "}
        <input name="name" required maxLength={MAX_LABEL_LENGTH} defaultValue={state.values?.name ?? ""} />
      </label>
      <button type="submit" disabled={pending}>
        Create label
      </button>
    </form>
  );
}
