// Reading typed or pasted numbers for the class-width demo, and building a
// dataset around them: the class widths a typed list may take, and how its
// values are written.
import { binValues, type Dataset } from "./datasets";

export const MAX_VALUES = 500;
export const MAX_CHARS = 4000;

export type ParsedValues =
  | { ok: true; values: number[] }
  | { ok: false; error: string };

/** The values in the order they were typed, one space apart. */
export function serializeValues(values: number[]): string {
  return values.join(" ");
}

/**
 * Reads text as a list of numbers separated by spaces, commas, semicolons or
 * line breaks. Two values is the least that makes a histogram worth drawing.
 */
export function parseValues(text: string): ParsedValues {
  if (text.length > MAX_CHARS) return { ok: false, error: `More than ${MAX_CHARS} characters.` };
  const parts = text.split(/[,;\s]+/).filter((s) => s !== "");
  const values: number[] = [];
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isFinite(v)) return { ok: false, error: `“${p}” is not a number.` };
    values.push(v);
  }
  if (values.length < 2) return { ok: false, error: "Type at least two numbers." };
  if (values.length > MAX_VALUES) return { ok: false, error: `More than ${MAX_VALUES} values.` };
  return { ok: true, values };
}

/** 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 at every power of ten: the round numbers a class width should be. */
const MANTISSAS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];

function round10(v: number): number {
  return Number(v.toPrecision(10));
}

/** The round numbers at or above `lo`, ascending, as a generator. */
function* niceFrom(lo: number): Generator<number> {
  let k = Math.floor(Math.log10(lo));
  for (;;) {
    for (const m of MANTISSAS) {
      const w = round10(m * Math.pow(10, k));
      if (w >= lo * (1 - 1e-9)) yield w;
    }
    k++;
  }
}

/**
 * The class widths the slider offers for a typed list: round numbers from
 * about a twentieth of the range (twenty-odd classes) up to the first width
 * that puts everything in one class, thinned to eleven or fewer so the slider
 * has stops rather than a continuum. Classes start at multiples of the width,
 * so a width of 5 gives 0 to 5, 5 to 10, which is what a class would write.
 */
export function niceWidths(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (!(range > 0)) {
    // Every value the same: one class of a sensible width around it.
    const w = Math.abs(min) >= 1 ? round10(Math.pow(10, Math.floor(Math.log10(Math.abs(min))))) : 1;
    return [w];
  }
  const all: number[] = [];
  for (const w of niceFrom(range / 20)) {
    all.push(w);
    if (binValues(values, w, 0).length === 1 || all.length >= 60) break;
  }
  const keep = 11;
  if (all.length <= keep) return all;
  const picked = new Set<number>();
  for (let i = 0; i < keep; i++) picked.add(Math.round((i * (all.length - 1)) / (keep - 1)));
  return [...picked].sort((a, b) => a - b).map((i) => all[i]);
}

/** Decimal places needed to write every number in the list exactly, up to a cap. */
function decimalsOf(nums: number[], cap: number): number {
  let d = 0;
  for (const v of nums) {
    const s = String(round10(v));
    const dot = s.indexOf(".");
    if (dot >= 0) d = Math.max(d, s.length - dot - 1);
  }
  return Math.min(d, cap);
}

/** A dataset wrapped around a typed list, so the demo treats it like the built-in ones. */
export function customDataset(values: number[], units: string): Dataset {
  const widths = niceWidths(values);
  const u = units.trim() || "units";
  return {
    id: "custom",
    label: "Your data",
    blurb: "typed in below",
    units: u,
    unit: u,
    values,
    widths,
    // Open in the middle of the ladder: enough classes to show a shape,
    // few enough that each holds something.
    defaultWidth: Math.floor((widths.length - 1) / 2),
    origin: 0,
    decimals: decimalsOf([...values, ...widths], 3),
    note:
      "The widths run from one class that holds everything down to twenty-odd, in round numbers; classes start at multiples of the width. Change the numbers above and the ladder is rebuilt.",
  };
}
