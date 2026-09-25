// Reading and writing the regression demo's data as text: a header line
// naming the axes, then one pair per line.
import type { Pair } from "./bivariate";

export const MAX_ROWS = 100;
export const MAX_CHARS = 4000;

export type Labels = { x: string; y: string };

export type Parsed =
  | { ok: true; pairs: Pair[]; labels: Labels }
  | { ok: false; error: string };

/** The labels on the first line, then x and y on each line after. */
export function serialize(pairs: Pair[], labels: Labels): string {
  return [`${labels.x}, ${labels.y}`, ...pairs.map((p) => `${p.x}, ${p.y}`)].join("\n");
}

/** Two numbers on a line, split on commas, semicolons, tabs or spaces. */
function twoNumbers(line: string): Pair | null {
  const parts = line.split(/[,;\t]+|\s+/).filter((s) => s !== "");
  if (parts.length !== 2) return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/**
 * Reads pasted or typed text as pairs. A line is two numbers, separated by a
 * comma, a tab, a semicolon or spaces. Blank lines are skipped. If the first
 * line is not two numbers but does split on a comma, semicolon or tab into
 * two names, it is a header and the names label the axes. Plain numbers with
 * no header label the axes x and y.
 */
export function parsePairs(text: string): Parsed {
  if (text.length > MAX_CHARS) {
    return { ok: false, error: `Too long: ${text.length} characters, and the limit is ${MAX_CHARS}.` };
  }
  const lines = text.split(/\r?\n/);
  const pairs: Pair[] = [];
  let labels: Labels = { x: "x", y: "y" };
  let first = true;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === "") continue;
    const pair = twoNumbers(raw);
    if (pair) {
      pairs.push(pair);
    } else if (first) {
      const names = raw.split(/[,;\t]/).map((s) => s.trim()).filter((s) => s !== "");
      if (names.length !== 2) {
        return { ok: false, error: `Line ${i + 1} should be two names or two numbers: “${raw}”` };
      }
      labels = { x: names[0], y: names[1] };
    } else {
      return { ok: false, error: `Line ${i + 1} is not two numbers: “${raw}”` };
    }
    first = false;
  }
  if (pairs.length > MAX_ROWS) {
    return { ok: false, error: `${pairs.length} rows, and the limit is ${MAX_ROWS}.` };
  }
  return { ok: true, pairs, labels };
}
