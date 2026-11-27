// No "server-only": the label forms list these, and lib/schema.ts checks stored keys against them.

/** The colours a label can have: a stored key and the name the forms show. Each key has a `label-<key>` CSS class. */
export const LABEL_COLORS = [
  { key: "gray", name: "Gray" },
  { key: "green", name: "Green" },
  { key: "blue", name: "Blue" },
  { key: "purple", name: "Purple" },
  { key: "orange", name: "Orange" },
  { key: "red", name: "Red" },
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number]["key"];

export const DEFAULT_LABEL_COLOR: LabelColor = "gray";

export function isLabelColor(value: string): value is LabelColor {
  return LABEL_COLORS.some((color) => color.key === value);
}
