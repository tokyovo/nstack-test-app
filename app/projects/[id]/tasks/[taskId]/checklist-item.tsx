"use client";

import { startTransition, useOptimistic, useTransition } from "react";
import type { ChecklistItem as Item } from "@/lib/checklist";

type Props = {
  item: Item;
  /** Stores the new state; the page then re-renders with it. */
  toggle: (done: boolean) => Promise<void>;
  remove: () => Promise<void>;
};

/**
 * One checklist row: the box saves as soon as it is ticked or unticked; Delete asks the browser to confirm,
 * then removes the row. Once the delete starts the row takes no more clicks, so a double click asks once and
 * sends one delete, not a second one the server must refuse.
 */
export function ChecklistItem({ item, toggle, remove }: Props) {
  const [done, setDone] = useOptimistic(item.done);
  const [removing, startRemove] = useTransition();
  const label = `Delete item "${item.text}"`;
  return (
    <li className="checklist-item">
      <label className="checkbox-row">
        <input
          type="checkbox"
          value={item.id}
          checked={done}
          disabled={removing}
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
      <button
        type="button"
        className="danger quiet"
        aria-label={label}
        disabled={removing}
        onClick={() => {
          if (window.confirm(`${label}?`)) startRemove(remove);
        }}
      >
        Delete
      </button>
    </li>
  );
}
