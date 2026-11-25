/** Task statuses in board order, and their column names. Safe to import from client components. */
export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const COLUMN_NAMES: Record<Status, string> = { todo: "To do", in_progress: "In progress", done: "Done" };

export function isStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

/** The status one column to the left (-1) or right (+1), or null past either end. */
export function neighborStatus(status: Status, step: -1 | 1): Status | null {
  return STATUSES[STATUSES.indexOf(status) + step] ?? null;
}
