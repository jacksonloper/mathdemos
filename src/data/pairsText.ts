// Reading and writing the regression demo's data as text, one pair per line.
import type { Pair } from "./bivariate";

export const MAX_ROWS = 100;
export const MAX_CHARS = 4000;

  onCommit: (pairs: Pair[], labels: { x: string; y: string } | null) => void;
};

export type Parsed =
  | { ok: true; pairs: Pair[]; labels: { x: string; y: string } | null }
  | { ok: false; error: string };

/** One pair per line, x then y. */
export function serialize(pairs: Pair[]): string {
  return pairs.map((p) => `${p.x}, ${p.y}`).join("\n");
}

/**
 * Reads pasted or typed text as pairs. A line is two numbers, separated by a
 * comma, a tab, a semicolon or spaces. Blank lines are skipped. If the first
 * line is two words rather than two numbers, it is a header, and the words
 * become the axis labels.
 */
export function parsePairs(text: string): Parsed {
  if (text.length > MAX_CHARS) {
    return { ok: false, error: `Too long: ${text.length} characters, and the limit is ${MAX_CHARS}.` };
  }
  const lines = text.split(/\r?\n/);
  const pairs: Pair[] = [];
  let labels: { x: string; y: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (raw === "") continue;
    const parts = raw.split(/[,;\t]+|\s+/).filter((s) => s !== "");
    if (parts.length !== 2) {
      return { ok: false, error: `Line ${i + 1} has ${parts.length} ${parts.length === 1 ? "entry" : "entries"}, not two: “${raw}”` };
    }
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push({ x, y });
    } else if (pairs.length === 0 && labels === null && !Number.isFinite(x) && !Number.isFinite(y)) {
      labels = { x: parts[0], y: parts[1] };
    } else {
      return { ok: false, error: `Line ${i + 1} is not two numbers: “${raw}”` };
    }
  }
  if (pairs.length > MAX_ROWS) {
    return { ok: false, error: `${pairs.length} rows, and the limit is ${MAX_ROWS}.` };
  }
  return { ok: true, pairs, labels };
}

