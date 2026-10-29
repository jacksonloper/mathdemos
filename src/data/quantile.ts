// The arithmetic behind the normal quantile plot: the plotting positions, the
// z that cuts off each one, and the sample mean and SD for relabelling the
// axis. Every number is small enough to check against a calculator.
import { fit, type Fit } from "./bivariate";
import { parseValues } from "./valuesText";

/** Enough for a room's measurements, few enough that every dot can be watched. */
export const MAX_N = 60;

export type Preset = { id: string; label: string; values: number[]; note: string };

export const presets: Preset[] = [
  {
    id: "scores",
    label: "Scores",
    values: [37, 43, 47, 48, 48, 48, 51, 52, 53, 53, 54, 54, 57, 58, 59],
    note: "Fifteen scores. The dots stay close to the line.",
  },
  {
    id: "skewed",
    label: "Skewed",
    values: [2, 3, 3, 4, 5, 5, 6, 9, 9, 10, 10, 16, 18, 26, 32],
    note: "Fifteen values with a long right tail. The dots bend away from the line at both ends.",
  },
];

/**
 * Blom's plotting position for rank i of n: (i − 3/8) / (n + 1/4). It is the
 * share of a normal population expected to fall below the i-th smallest of n
 * draws, and it is what a TI-84 uses for its normal probability plot.
 */
export function blom(i: number, n: number): number {
  return (i - 3 / 8) / (n + 1 / 4);
}

/**
 * The z with area p to its left under the standard normal curve. Acklam's
 * rational approximation, good to about nine digits, which is far past the
 * two decimals shown.
 */
export function normalQuantile(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** The standard normal density, for drawing the bell. */
export function normalPdf(z: number): number {
  return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
}

export type Rank = { i: number; x: number; p: number; z: number; typed: number };

export type Quantiles = {
  n: number;
  /** Sorted, with each value's rank, plotting position, z, and typed order. */
  ranks: Rank[];
  xbar: number;
  /** Sample SD, n − 1 in the denominator. 0 when every value is the same. */
  s: number;
  /** Least squares of z on x. Null when every value is the same. */
  line: Fit | null;
};

export function quantiles(values: number[]): Quantiles {
  const n = values.length;
  const order = values.map((x, typed) => ({ x, typed })).sort((a, b) => a.x - b.x || a.typed - b.typed);
  const ranks = order.map((o, k) => {
    const p = blom(k + 1, n);
    // z is kept to two decimals, the precision it is printed at, so the line
    // fitted below is the line fitted to the numbers on the screen.
    return { i: k + 1, x: o.x, p, z: Math.round(normalQuantile(p) * 100) / 100, typed: o.typed };
  });
  const xbar = values.reduce((a, b) => a + b, 0) / n;
  const ss = values.reduce((a, b) => a + (b - xbar) ** 2, 0);
  const s = n > 1 ? Math.sqrt(ss / (n - 1)) : 0;
  const line = ss > 0 ? fit(ranks.map((r) => ({ x: r.x, y: r.z }))) : null;
  return { n, ranks, xbar, s, line };
}

export type ParsedList = { ok: true; values: number[] } | { ok: false; error: string };

/** The class-width demo's reader, with a lower cap: one dot per value has to be watchable. */
export function parseList(text: string): ParsedList {
  const p = parseValues(text);
  if (!p.ok) return p;
  if (p.values.length > MAX_N) return { ok: false, error: `More than ${MAX_N} values.` };
  return p;
}
