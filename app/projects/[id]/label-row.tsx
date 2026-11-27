"use client";

import { useActionState } from "react";
import type { LabelFormState } from "@/app/projects/actions";
import type { Label } from "@/lib/labels";
import { MAX_LABEL_LENGTH } from "@/lib/limits";
import { ConfirmButton } from "../confirm-button";
import { LabelChip } from "./label-chip";
import { LabelColourOptions } from "./label-form";

type Props = {
  label: Label;
  update: (prev: LabelFormState, formData: FormData) => Promise<LabelFormState>;
  remove: () => Promise<void>;
};

/**
 * One row of the board's Labels list: the label's chip, a form to rename and recolour it, and Delete label
 * (asks first). After an error the edit form keeps what was typed and picked; after a save it shows the stored values.
 */
export function LabelRow({ label, update, remove }: Props) {
  const [state, formAction, pending] = useActionState(update, {});
  const color = state.values?.color ?? label.color;
  return (
    <li className="label-row">
      <div className="label-row-head">
        <LabelChip label={label} />
        <form action={remove}>
          <ConfirmButton className="danger quiet" message={`Delete label "${label.name}"? It is removed from every task.`}>
            Delete label
          </ConfirmButton>
        </form>
      </div>
      <form action={formAction} className="label-edit">
        {state.error && <p role="alert">{state.error}</p>}
        <input
          name="name"
          aria-label={`Name for ${label.name}`}
          required
          maxLength={MAX_LABEL_LENGTH}
          defaultValue={state.values?.name ?? label.name}
        />
        {/* Keyed by its value: the form reset after each submit restores a select's mount-time default only. */}
        <select key={color} name="color" aria-label={`Colour for ${label.name}`} defaultValue={color}>
          <LabelColourOptions />
        </select>
        <button type="submit" disabled={pending}>
          Save
        </button>
      </form>
    </li>
  );
}
