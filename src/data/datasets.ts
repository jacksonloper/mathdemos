// Datasets shared by the demos. These all also appear in the printed MTH 160X
// Module 2 packet, so a number on screen can be pointed at on paper.

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
  /** Index into `widths` the case study opens on: the packet's own binning. */
  defaultWidth: number;
  /** Where the first class starts, in data units. */
  origin: number;
  /** Decimal places to show on axis labels. */
  decimals: number;
  /** What the packet says about this data, shown under the chart. */
  packetNote: string;
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
 *   packet says "to the nearest inch", so that is what these are.
 */
function fill(lo: number, hi: number, count: number): number[] {
  const span = Math.round(hi - lo);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(lo + Math.min(span - 1, Math.floor(rand() * span)));
  return out;
}

/** Heights of 330 adults. At width 2 from 58 this is the packet's page 16. */
const heights = [
  [58, 60, 5], [60, 62, 12], [62, 64, 28], [64, 66, 48], [66, 68, 66],
  [68, 70, 63], [70, 72, 47], [72, 74, 32], [74, 76, 20], [76, 78, 9],
].flatMap(([lo, hi, n]) => fill(lo, hi, n));

/** Final grades of 100 students. At width 3 from 60 this is the packet's page 15. */
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
    packetNote:
      "MTH 160X packet p16 and p17 draw this at width 2. The tallest class holds 66 people, which is 20% of 330.",
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
    packetNote:
      "MTH 160X packet p15 draws this at width 3. ALEKS draws the same item at width 1, where reading the width off the axis takes no thought.",
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
    defaultWidth: 2,
    origin: 200,
    decimals: 0,
    packetNote:
      "MTH 160X packet p7 to p11 builds this by hand at width 20, giving six classes. With 20 values, small widths leave most classes empty.",
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
    packetNote:
      "MTH 160X packet p19 to p22 plots this as a stem-and-leaf. Width 10 is the stem-and-leaf; width 5 is the split-stem version.",
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
    packetNote:
      "MTH 160X packet p23 draws this as a dot plot, which is a histogram of width 1. Widen it and the right tail disappears into one bar.",
  },
];

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
