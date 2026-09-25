// Paired data for the regression demo, and the arithmetic on it. Each set is
// small enough to type, so every number on screen can be checked by hand.

export type Pair = { x: number; y: number };

export type BivariateSet = {
  id: string;
  label: string;
  xlab: string;
  ylab: string;
  pairs: Pair[];
  /** A line about this data, shown under the chart. */
  note: string;
};

function zip(xs: number[], ys: number[]): Pair[] {
  return xs.map((x, i) => ({ x, y: ys[i] }));
}

export const bivariateSets: BivariateSet[] = [
  {
    id: "heating",
    label: "Heating bills",
    xlab: "Floor area (sq ft)",
    ylab: "Heating bill ($)",
    pairs: zip(
      [900, 1100, 1250, 1400, 1600, 1750, 1900, 2200],
      [66, 64, 84, 77, 97, 90, 112, 113],
    ),
    note:
      "Eight houses. r is 0.9352, so floor area explains about 87% of the variation in the bill.",
  },
  {
    id: "nine",
    label: "Nine points",
    xlab: "x",
    ylab: "y",
    pairs: zip([2, 3, 4, 5, 6, 7, 8, 9, 10], [5, 7, 8, 11, 12, 14, 16, 17, 2]),
    note:
      "One point sits far off the pattern. Delete its row and r² goes from 0.11 to 0.99.",
  },
  {
    id: "books",
    label: "Coffee shops and bookstores",
    xlab: "Coffee shops",
    ylab: "Bookstores",
    pairs: zip([12, 18, 25, 31, 40, 47, 55, 63], [5, 7, 9, 13, 14, 19, 21, 25]),
    note: "Eight small cities. Swap the axes: r stays where it is and the line does not.",
  },
  {
    id: "curve",
    label: "A curve",
    xlab: "x",
    ylab: "y",
    pairs: zip(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      [25, 16, 9, 4, 1, 0, 1, 4, 9, 16, 25],
    ),
    note:
      "A perfect pattern with r = 0. The line explains none of it, because a line is the wrong shape.",
  },
];

export type Fit = {
  n: number;
  xbar: number;
  ybar: number;
  /** b in ŷ = a + bx. NaN when every x is the same. */
  slope: number;
  /** a in ŷ = a + bx. */
  intercept: number;
  /** NaN when either variable never varies. */
  r: number;
  r2: number;
  /** Every y is the same, so there is a flat line but no r. */
  yConstant: boolean;
};

/** Least squares, the same numbers a TI-84's LinReg(a+bx) prints. */
export function fit(pairs: Pair[]): Fit | null {
  const n = pairs.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (const p of pairs) {
    sx += p.x;
    sy += p.y;
  }
  const xbar = sx / n;
  const ybar = sy / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of pairs) {
    sxx += (p.x - xbar) ** 2;
    syy += (p.y - ybar) ** 2;
    sxy += (p.x - xbar) * (p.y - ybar);
  }
  const slope = sxy / sxx;
  const r = sxy / Math.sqrt(sxx * syy);
  return {
    n, xbar, ybar, slope, intercept: ybar - slope * xbar, r, r2: r * r,
    yConstant: syy === 0,
  };
}
