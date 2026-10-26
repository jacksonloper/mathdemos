// The exact sampling distribution of a grab's mean, for small grabs.
//
// A bag is a list of values, one per marble. Every marble is its own object,
// so the equally likely outcomes are the ordered grabs (with replacement,
// N^m of them) or the sets of m marbles (without, C(N, m) of them). The table
// counts, for each possible mean, how many of those outcomes give it. With
// replacement that is the bag's value counts convolved with themselves m
// times; without, it is the same convolution with each marble used at most
// once, a knapsack over the bag that counts the m-marble subsets by their sum
// without listing them. Either way the counts are whole numbers, so every
// probability is an exact fraction.

export const MAX_EXACT_M = 4;
export const MAX_OUTCOMES = 500;
const TIME_BUDGET_MS = 50;

export type ExactRow = { mean: number; ways: number; prob: number };

export type ExactResult =
  | { ok: true; rows: ExactRow[]; total: number; mean: number; sd: number }
  | { ok: false; reason: string };

/** Sums are kept as integers in units of `scale`, so 2.5 + 0.1 cannot drift. */
function decimals(v: number) {
  const s = String(v);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function choose(n: number, k: number) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return Math.round(c);
}

export function exactMeans(values: number[], m: number, replace: boolean): ExactResult {
  const N = values.length;
  if (m > MAX_EXACT_M) return { ok: false, reason: `The exact table is computed only for grabs of ${MAX_EXACT_M} or fewer.` };
  if (m < 1 || N < 1) return { ok: false, reason: "There is nothing to grab." };
  if (!replace && m > N) return { ok: false, reason: "The grab is bigger than the bag." };
  const total = replace ? N ** m : choose(N, m);
  if (!Number.isSafeInteger(total)) return { ok: false, reason: "The bag is too big to count every grab exactly." };

  const scale = 10 ** Math.min(6, Math.max(0, ...values.map(decimals)));
  const ints = values.map((v) => Math.round(v * scale));
  const start = performance.now();
  const tooSlow = () => performance.now() - start > TIME_BUDGET_MS;
  const tooMany = (d: Map<number, number>) => d.size > MAX_OUTCOMES;
  const breaker = (why: "many" | "slow"): ExactResult => ({
    ok: false,
    reason: why === "many"
      ? `This bag and grab have more than ${MAX_OUTCOMES} possible sample means, too many for a table.`
      : "This bag and grab take too long to count exactly.",
  });

  let dist: Map<number, number>;
  if (replace) {
    // The bag's value counts, convolved with themselves m times.
    const one = new Map<number, number>();
    for (const v of ints) one.set(v, (one.get(v) ?? 0) + 1);
    dist = new Map([[0, 1]]);
    for (let j = 0; j < m; j++) {
      const next = new Map<number, number>();
      for (const [s, c] of dist) for (const [v, k] of one) next.set(s + v, (next.get(s + v) ?? 0) + c * k);
      dist = next;
      if (tooMany(dist)) return breaker("many");
      if (tooSlow()) return breaker("slow");
    }
  } else {
    // layer[j] maps a sum to the number of j-marble subsets with that sum.
    // Each marble is offered once, and j runs downward so it is used once.
    const layer: Map<number, number>[] = Array.from({ length: m + 1 }, () => new Map());
    layer[0].set(0, 1);
    for (const v of ints) {
      for (let j = Math.min(m, N); j >= 1; j--) {
        for (const [s, c] of layer[j - 1]) layer[j].set(s + v, (layer[j].get(s + v) ?? 0) + c);
      }
      // Only the last layer is the table; a smaller subset can have more
      // sums than the full grab (with m = N there is just one).
      if (tooMany(layer[m])) return breaker("many");
      if (tooSlow()) return breaker("slow");
    }
    dist = layer[m];
  }

  const rows = [...dist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([s, ways]) => ({ mean: s / scale / m, ways, prob: ways / total }));
  const mu = rows.reduce((a, r) => a + r.mean * r.prob, 0);
  const sd = Math.sqrt(rows.reduce((a, r) => a + (r.mean - mu) ** 2 * r.prob, 0));
  return { ok: true, rows, total, mean: mu, sd };
}
