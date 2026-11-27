import type { Label } from "@/lib/labels";

/** A label's name on a rounded chip in the label's colour (the `label-<key>` tokens in globals.css). */
export function LabelChip({ label }: { label: Label }) {
  return <span className={`label-chip label-${label.color}`}>{label.name}</span>;
}
