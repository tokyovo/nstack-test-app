// Usage: node scripts/check-css-tokens.mjs [file]   (default app/globals.css; run by `npm run lint`)
// Colours live as tokens in the first `:root { }` block; everything else must use var(--...).
// Exits 1 listing each hex, rgb(a)() or hsl(a)() colour literal found outside that block.
import { readFileSync } from "node:fs";

const file = process.argv[2] ?? "app/globals.css";
const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;

/** Replaces each comment with spaces, keeping line breaks so line numbers stay right. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

/** [start, end) of the first `:root { ... }` block, or null. */
function rootBlock(css) {
  const match = /:root\s*\{/.exec(css);
  if (!match) return null;
  const end = css.indexOf("}", match.index);
  return end === -1 ? null : [match.index, end + 1];
}

const css = stripComments(readFileSync(file, "utf8"));
const root = rootBlock(css);
const problems = [];
for (const match of css.matchAll(COLOUR)) {
  if (root && match.index >= root[0] && match.index < root[1]) continue;
  const line = css.slice(0, match.index).split("\n").length;
  problems.push(`${file}:${line}: colour literal "${match[0]}" outside :root; use a token (var(--...))`);
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`${file}: no colour literals outside :root`);
