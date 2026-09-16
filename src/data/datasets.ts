// Datasets shared by the demos. Each one is small enough to print, so a number
// on screen can be checked by hand.

export type Dataset = {
  id: string;
  label: string;
  blurb: string;
  units: string;
  /** Singular form, for a class width of exactly 1. */
  unit: string;
  values: number[];
  /** Bin widths the slider may take, smallest first. */
  widths: number[];
  /** Index into `widths` the case study opens on. */
  defaultWidth: number;
  /** Where the first class starts, in data units. */
  origin: number;
  /** Decimal places to show on axis labels. */
  decimals: number;
  /** Money, so values are written $750 and $1M rather than 750 and 1000000. */
  currency?: boolean;
  /** A line about this data, shown under the chart. */
  note: string;
};

/** Deterministic PRNG, so the picture is identical on every load. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const rand = lcg(20260904);

/**
 * Scatter `count` whole-number values inside [lo, hi) so the class holds exactly
 * `count` of them. Two things matter here:
 *
 * - Positions are random rather than evenly spaced. Spreading them evenly makes
 *   every narrower binning come out artificially smooth, hiding the very thing
 *   this demo exists to show.
 * - Values are whole numbers, because the demo can show the raw data and
 *   heights measured to four decimal places would give the game away. The
 *   are measured to the nearest inch, so that is what these are.
 */
function fill(lo: number, hi: number, count: number): number[] {
  const span = Math.round(hi - lo);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(lo + Math.min(span - 1, Math.floor(rand() * span)));
  return out;
}

/** Heights of 330 adults, to the nearest inch. */
const heights = [
  [58, 60, 5], [60, 62, 12], [62, 64, 28], [64, 66, 48], [66, 68, 66],
  [68, 70, 63], [70, 72, 47], [72, 74, 32], [74, 76, 20], [76, 78, 9],
].flatMap(([lo, hi, n]) => fill(lo, hi, n));

/** Final grades of 100 students. */
const grades = [
  [60, 63, 3], [63, 66, 6], [66, 69, 9], [69, 72, 14], [72, 75, 18],
  [75, 78, 15], [78, 81, 12], [81, 84, 9], [84, 87, 7], [87, 90, 4], [90, 93, 3],
].flatMap(([lo, hi, n]) => fill(lo, hi, n));

export const datasets: Dataset[] = [
  {
    id: "heights",
    label: "Heights",
    blurb: "330 adults, in inches",
    units: "inches",
    unit: "inch",
    values: heights,
    widths: [1, 2, 3, 4, 5, 6, 8, 10, 20],
    defaultWidth: 1,
    origin: 58,
    decimals: 0,
    note:
      "At width 2 the tallest class holds 66 of the 330 people, which is 20%. Widen it and that 20% is split or swallowed.",
  },
  {
    id: "grades",
    label: "Final grades",
    blurb: "100 students",
    units: "points",
    unit: "point",
    values: grades,
    widths: [1, 2, 3, 4, 5, 6, 10, 15],
    defaultWidth: 2,
    origin: 60,
    decimals: 0,
    note:
      "Width 1 puts a class on every point, so the width can be read straight off the axis. Width 3 groups them into bands.",
  },
  {
    id: "batting",
    label: "Batting averages",
    blurb: "20 starting players, Tigers and Red Sox",
    units: "per mille",
    unit: "per mille",
    values: [
      275, 202, 297, 201, 302, 302, 319, 294, 248, 222,
      272, 237, 298, 250, 319, 296, 254, 310, 299, 228,
    ],
    widths: [5, 10, 20, 25, 40, 60],
    defaultWidth: 3,
    origin: 200,
    decimals: 0,
    note:
      "Twenty values spread over 120, so narrow widths leave most classes empty and the shape stops meaning anything. Width 25 gives five classes.",
  },
  {
    id: "temps",
    label: "Ideal temperature",
    blurb: "30 students",
    units: "°F",
    unit: "°F",
    values: [
      52, 87, 80, 79, 65, 75, 71, 65, 85, 62,
      65, 67, 72, 77, 69, 75, 60, 76, 76, 73,
      70, 65, 70, 75, 76, 82, 90, 84, 80, 78,
    ],
    widths: [1, 2, 3, 5, 10, 20],
    defaultWidth: 4,
    origin: 50,
    decimals: 0,
    note:
      "Width 10 is what a stem-and-leaf plot of these values shows. Width 5 is the split-stem version of the same plot.",
  },
  {
    id: "briefcases",
    label: "Deal or No Deal",
    blurb: "26 briefcase prizes",
    units: "dollars",
    unit: "dollar",
    currency: true,
    values: [
      0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750,
      1000, 5000, 10000, 25000, 50000, 75000, 100000,
      200000, 300000, 400000, 500000, 750000, 1000000,
    ],
    widths: [50000, 100000, 250000, 500000],
    defaultWidth: 1,
    origin: 0,
    decimals: 2,
    note:
      "Nineteen of the twenty-six cases hold under $100,000 and one holds a million. The mean prize is about $131,478 and the median is $875, so twenty of the twenty-six cases are worth less than average.",
  },
  {
    id: "cavities",
    label: "Cavities",
    blurb: "25 students",
    units: "cavities",
    unit: "cavity",
    values: [
      2, 10, 8, 4, 6, 3, 2, 1, 0, 0, 1, 5, 3,
      2, 2, 1, 1, 0, 0, 7, 9, 12, 15, 8, 0,
    ],
    widths: [1, 2, 3, 4, 5, 8],
    defaultWidth: 0,
    origin: 0,
    decimals: 0,
    note:
      "Width 1 is a dot plot: one class per whole number. Widen it and the long right tail collapses into a single bar.",
  },
];

/** Drop trailing zeros: 1.5 stays 1.5, 2.0 becomes 2. */
const trim = (x: number) => String(Math.round(x * 100) / 100);

/**
 * How a value is written on an axis, in a table, or in a readout.
 *
 * Money gets its own form because the briefcase data spans eight orders of
 * magnitude. Written out, its axis reads 0.00, 100000.00, 200000.00 and the
 * labels collide; written compactly it reads $0, $100k, $200k.
 */
export function formatValue(ds: Dataset, v: number): string {
  if (!ds.currency) return v.toFixed(ds.decimals);
  const a = Math.abs(v);
  if (a > 0 && a < 1) return `$${v.toFixed(2)}`;
  if (a >= 1e6) return `$${trim(v / 1e6)}M`;
  if (a >= 1e3) return `$${trim(v / 1e3)}k`;
  return `$${trim(v)}`;
}

/**
 * A computed statistic, which needs more precision than an axis label. A mean
 * of 4.08 cavities must not print as "4", and a mean prize of $131,477.54 must
 * not print as "$131.48k".
 */
export function formatStat(ds: Dataset, v: number): string {
  if (ds.currency) {
    const cents = Math.abs(v - Math.round(v)) > 1e-9;
    return `$${v.toLocaleString("en-US", {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }
  return v.toFixed(Math.max(ds.decimals, 1));
}

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sorts a copy, so the caller's array keeps its order. */
export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type Bin = { lo: number; hi: number; count: number };

export function binValues(values: number[], width: number, origin: number): Bin[] {
  if (values.length === 0 || width <= 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const start = origin + Math.floor((min - origin) / width) * width;
  const n = Math.max(1, Math.ceil((max - start) / width + 1e-9));
  const bins: Bin[] = Array.from({ length: n }, (_, i) => ({
    lo: start + i * width,
    hi: start + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    const i = Math.min(n - 1, Math.floor((v - start) / width));
    bins[i].count++;
  }
  return bins;
}

/** One class, with its values dealt to the two sides of a split. */
export type SplitBin = Bin & { left: number; right: number };

export type Split = {
  bins: SplitBin[];
  /** Strictly below the split, exactly on it, strictly above. */
  below: number;
  onEdge: number;
  above: number;
  /** What each pan ends up holding once the tied values are dealt out. */
  leftPan: number;
  rightPan: number;
  level: boolean;
};

/**
 * Cut the data at `s` and report what lands on each side.
 *
 * Values exactly equal to `s` are the interesting case. Heights are measured to
 * the nearest inch, so 33 people are recorded as exactly 68 inches; the cut
 * runs through them. They are dealt to whichever side needs them, which is what
 * makes 165 against 165 reachable at all. Without that, no cut of this data
 * splits it in half, because the tied block is wider than the gap.
 *
 * This is not a fudge: any `s` with neither side holding more than half is a
 * median of the data, and dealing the ties is what that definition means.
 */
export function splitBins(values: number[], width: number, origin: number, s: number): Split {
  const bins = binValues(values, width, origin);
  const n = bins.length;
  const empty = { bins: [], below: 0, onEdge: 0, above: 0, leftPan: 0, rightPan: 0, level: true };
  if (!n) return empty;

  const start = bins[0].lo;
  const left = new Array<number>(n).fill(0);
  const right = new Array<number>(n).fill(0);
  let below = 0;
  let onEdge = 0;
  let above = 0;
  let edgeBin = -1;

  for (const v of values) {
    const i = Math.min(n - 1, Math.floor((v - start) / width));
    if (v < s) {
      left[i]++;
      below++;
    } else if (v > s) {
      right[i]++;
      above++;
    } else {
      onEdge++;
      edgeBin = i;
    }
  }

  const a = Math.max(0, Math.min(onEdge, Math.round((above - below + onEdge) / 2)));
  if (edgeBin >= 0) {
    left[edgeBin] += a;
    right[edgeBin] += onEdge - a;
  }
  const leftPan = below + a;
  const rightPan = above + (onEdge - a);

  return {
    bins: bins.map((b, i) => ({ ...b, left: left[i], right: right[i] })),
    below,
    onEdge,
    above,
    leftPan,
    rightPan,
    level: leftPan === rightPan,
  };
}

/**
 * The split closest to the median that actually levels the pans, or when none
 * does (an odd count), the one that comes closest.
 */
export function levellingSplit(values: number[], width: number, origin: number): number {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  const cands = [...distinct];
  for (let i = 0; i < distinct.length - 1; i++) cands.push((distinct[i] + distinct[i + 1]) / 2);
  const med = median(values);
  let best = med;
  let bestKey = [Infinity, Infinity];
  for (const s of cands) {
    const sp = splitBins(values, width, origin, s);
    const key = [Math.abs(sp.leftPan - sp.rightPan), Math.abs(s - med)];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
      bestKey = key;
      best = s;
    }
  }
  return best;
}
