"use client";

import { startTransition, useOptimistic } from "react";
import type { ChecklistItem as Item } from "@/lib/checklist";

type Props = {
  item: Item;
  /** Stores the new state; the page then re-renders with it. */
  toggle: (done: boolean) => Promise<boolean>;
  remove: () => Promise<void>;
};

/** One checklist row: the box saves as soon as it is ticked or unticked; Delete removes the row without asking. */
export function ChecklistItem({ item, toggle, remove }: Props) {
  const [done, setDone] = useOptimistic(item.done);
  return (
    <li className="checklist-item">
      <label className="checkbox-row">
        <input
          type="checkbox"
          value={item.id}
          checked={done}
          onChange={(event) => {
            const next = event.target.checked;
            startTransition(async () => {
              setDone(next);
              await toggle(next);
            });
          }}
        />{" "}
        <span>{item.text}</span>
      </label>
      <form action={remove}>
        <button type="submit" aria-label={`Delete item "${item.text}"`}>
          Delete
        </button>
      </form>
    </li>
  );
}
