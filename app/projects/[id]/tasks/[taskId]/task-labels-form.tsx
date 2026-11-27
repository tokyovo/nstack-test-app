"use client";

import { useActionState } from "react";
import type { SaveLabelsState } from "@/app/projects/actions";
import type { Label } from "@/lib/labels";
import { LabelChip } from "../../label-chip";

type Props = {
  action: (prev: SaveLabelsState, formData: FormData) => Promise<SaveLabelsState>;
  /** The project's labels, in name order. */
  labels: Label[];
  /** Ids of the labels the task has. */
  checked: number[];
};

/** One checkbox per project label; "Save labels" sets the task's labels to exactly the ticked ones. */
export function TaskLabelsForm({ action, labels, checked }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {state.error && <p role="alert">{state.error}</p>}
      {state.saved && <p role="status">Labels saved</p>}
      {labels.map((label) => (
        <label key={label.id} className="checkbox-row">
          <input type="checkbox" name="labelId" value={label.id} defaultChecked={checked.includes(label.id)} />{" "}
          <LabelChip label={label} />
        </label>
      ))}
      <button type="submit" disabled={pending}>
        Save labels
      </button>
    </form>
  );
}
