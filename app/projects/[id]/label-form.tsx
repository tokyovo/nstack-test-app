"use client";

import { useActionState } from "react";
import type { LabelFormState } from "@/app/projects/actions";
import { DEFAULT_LABEL_COLOR, LABEL_COLORS } from "@/lib/label-colors";
import { MAX_LABEL_LENGTH } from "@/lib/limits";

type Props = { action: (prev: LabelFormState, formData: FormData) => Promise<LabelFormState> };

/** New-label form on a board; refilled with the typed name and picked colour after an error, reset after a create. */
export function LabelForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      <label>
        Label name{" "}
        <input name="name" required maxLength={MAX_LABEL_LENGTH} defaultValue={state.values?.name ?? ""} />
      </label>
      <label>
        Colour{" "}
        <select name="color" defaultValue={state.values?.color ?? DEFAULT_LABEL_COLOR}>
          {LABEL_COLORS.map((color) => (
            <option key={color.key} value={color.key}>
              {color.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending}>
        Create label
      </button>
    </form>
  );
}
