"use client";

import { unstable_rethrow, useRouter } from "next/navigation";
import { useState } from "react";
import type { ChecklistItem as Item } from "@/lib/checklist";
import { ChecklistItem } from "./checklist-item";

type Row = {
  item: Item;
  /** Each is true when the server stored the change. */
  toggle: (done: boolean) => Promise<boolean>;
  remove: () => Promise<boolean>;
};

/**
 * A task's checklist. When the server refuses a tick or a delete (e.g. the item was deleted in another
 * tab), it says so and refreshes the page; the next stored change clears the message.
 */
export function Checklist({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function save(item: Item, action: () => Promise<boolean>) {
    let saved = false;
    try {
      saved = await action();
    } catch (error) {
      unstable_rethrow(error); // a redirect (expired session) or not-found still navigates
    }
    setError(saved ? null : `Could not update "${item.text}"`);
    if (!saved) router.refresh();
  }

  return (
    <>
      {error && (
        <p role="alert" className="checklist-error">
          {error}
        </p>
      )}
      <ul aria-label="Checklist" className="checklist">
        {rows.map(({ item, toggle, remove }) => (
          <ChecklistItem
            key={item.id}
            item={item}
            toggle={(done) => save(item, () => toggle(done))}
            remove={() => save(item, remove)}
          />
        ))}
      </ul>
    </>
  );
}
