"use client";

import { useActionState } from "react";
import type { ChecklistFormState } from "@/app/projects/actions";
import { MAX_CHECKLIST_ITEM_LENGTH } from "@/lib/limits";

type Props = { action: (prev: ChecklistFormState, formData: FormData) => Promise<ChecklistFormState> };

/** Add-item form under a task's checklist; refilled with the typed text after an error, empty after an add. */
export function ChecklistForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        New item{" "}
        <input name="text" required maxLength={MAX_CHECKLIST_ITEM_LENGTH} defaultValue={state.values?.text ?? ""} />
      </label>
      <button type="submit" disabled={pending}>
        Add item
      </button>
    </form>
  );
}
