import { useMemo, useState } from "react";

/**
 * A 95% confidence interval for the mean, next to the region that holds 95%
 * of the population. The two are confused constantly, and the picture is the
 * cure: the population is broad and bimodal, so the band holding 95% of it is
 * wide; the interval for its mean is narrow, about √n times narrower, and it
 * is only about the mean.
 *
 * Each click draws a sample of n = 40 from the population, computes
 * x̄ ± 1.96 · s/√n, and says whether that interval caught the true population
 * mean μ, which this demo knows because it built the population. A running
 * tally counts the intervals so far that caught it: about 19 in 20 should.
 *
 * Four rows on one scale:
 *
 *   the population   its density curve, the central 95% shaded
 *   the sample       the 40 values just drawn, jittered so ties show
 *   the CI           a bar from x̄ − 1.96·SE to x̄ + 1.96·SE, green or red
 *   the 95% band     a bar from the 2.5th to the 97.5th population percentile
 *
 * The population is a mixture of two normals, so it is nowhere near normal
 * itself and the CI still works: n = 40 is enough for the sample mean to be
 * close to normal, which is all the formula needs.
 */

// ---------- population: a mixture of two normals ----------
const POP = [
  { w: 0.55, mu: 40, sd: 9 },
  { w: 0.45, mu: 64, sd: 10 },
];
/** μ. The mean of a mixture is the weighted mean of the parts. */
const TRUE_MEAN = POP.reduce((a, c) => a + c.w * c.mu, 0); // 50.8

const normPdf = (x: number, mu: number, sd: number) =>
  Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

/** erf, Abramowitz and Stegun 7.1.26, good to about 1e-7. */
const erf = (x: number) => {
  const s = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-ax * ax);
  return s * y;
};
const normCdf = (x: number, mu: number, sd: number) => 0.5 * (1 + erf((x - mu) / (sd * Math.SQRT2)));

const popPdf = (x: number) => POP.reduce((a, c) => a + c.w * normPdf(x, c.mu, c.sd), 0);
const popCdf = (x: number) => POP.reduce((a, c) => a + c.w * normCdf(x, c.mu, c.sd), 0);

/** A quantile of the mixture, by bisection on its CDF. */
const popQuantile = (p: number) => {
  let lo = -50;
  let hi = 150;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (popCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
const POP_LO = popQuantile(0.025);
const POP_HI = popQuantile(0.975);

// ---------- a seeded generator, so a sample can be redrawn exactly ----------
const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/** A standard normal draw, Box–Muller. */
const randn = (rng: () => number) => {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
/** n values from the mixture: pick a part by its weight, then draw from it. */
const drawSample = (n: number, seed: number) => {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = rng() < POP[0].w ? POP[0] : POP[1];
    out.push(c.mu + c.sd * randn(rng));
  }
  return out;
};

const N = 40;
/** The 97.5th percentile of the standard normal, for a 95% interval. */
const Z = 1.96;

const fmt = (v: number, d = 1) => v.toFixed(d);

export function Confidence() {
  const [seed, setSeed] = useState(1);
  const [history, setHistory] = useState({ hits: 0, total: 0 });

  const sample = useMemo(() => drawSample(N, seed), [seed]);
  const stats = useMemo(() => {
    const mean = sample.reduce((a, b) => a + b, 0) / N;
    const sd = Math.sqrt(sample.reduce((a, b) => a + (b - mean) ** 2, 0) / (N - 1));
    const se = sd / Math.sqrt(N);
    const lo = mean - Z * se;
    const hi = mean + Z * se;
    return { mean, sd, se, lo, hi, hit: lo <= TRUE_MEAN && TRUE_MEAN <= hi };
  }, [sample]);

  // The interval on screen joins the tally as the next one replaces it, so
  // the tally always reads "previous intervals" and never counts the one
  // being looked at.
  function newSample() {
    setHistory((h) => ({ hits: h.hits + (stats.hit ? 1 : 0), total: h.total + 1 }));
    setSeed((s) => s + 1);
  }
  function reset() {
    setHistory({ hits: 0, total: 0 });
    setSeed(1);
  }

  // ---------- geometry: one x scale for all four rows ----------
  const W = 720;
  const H = 400;
  const PAD = { left: 40, right: 40, top: 24, bottom: 40 };
  const xMin = 0;
  const xMax = 100;
  const xAt = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);

  const curveTop = PAD.top;
  const curveBase = 210; // baseline of the density curve
  const sampleY = 268; // the strip of sample dots
  const ciY = 318; // the confidence interval
  const bandY = 353; // the population's 95% bracket

  const pts = useMemo(() => {
    const arr: [number, number][] = [];
    let maxP = 0;
    for (let v = xMin; v <= xMax; v += 0.5) maxP = Math.max(maxP, popPdf(v));
    for (let v = xMin; v <= xMax; v += 0.5) {
      arr.push([xAt(v), curveBase - (popPdf(v) / maxP) * (curveBase - curveTop - 10)]);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const curvePath = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const areaPath = `${curvePath} L${xAt(xMax)},${curveBase} L${xAt(xMin)},${curveBase} Z`;

  // The central 95% of the population, shaded under the curve.
  const bandPts = pts.filter(([px]) => px >= xAt(POP_LO) && px <= xAt(POP_HI));
  const bandPath =
    `M${xAt(POP_LO)},${curveBase} ` +
    bandPts.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`).join(" ") +
    ` L${xAt(POP_HI)},${curveBase} Z`;

  // Vertical jitter for the sample dots, fixed per sample so nothing twitches
  // on re-render.
  const jitter = useMemo(() => {
    const rng = mulberry32(seed * 7919);
    return sample.map(() => (rng() - 0.5) * 22);
  }, [sample, seed]);

  const ciClass = stats.hit ? "ci is-hit" : "ci is-miss";
  const pct = history.total > 0 ? Math.round((100 * history.hits) / history.total) : null;

  return (
    <section className="case confidence">
      <header className="case-head">
        <h1>A confidence interval is not where the data are</h1>
        <p>
          A broad, two-humped population. Each click draws 40 of its members,
          computes the 95% confidence interval for the population mean, and
          checks it against the true mean. Below it, much wider, is the region
          that holds 95% of the <em>population</em>. One is about the mean. The
          other is about individuals.
        </p>
      </header>

      <div className="controls controls-tight">
        <div className="control">
          <span className="control-label">Run it</span>
          <div className="segmented" role="group" aria-label="Draw samples">
            <button type="button" onClick={newSample}>Draw a new sample</button>
            <button type="button" onClick={reset} disabled={history.total === 0 && seed === 1}>Start over</button>
          </div>
        </div>
        <div className="control sampling-readout-row">
          <span className="control-label">Previous intervals</span>
          <p className="readout sampling-readout" aria-live="polite">
            {history.total > 0
              ? `${history.hits} of ${history.total} caught μ (${pct}%). About 95% should, in the long run.`
              : "None yet. Each new sample files the one on screen."}
          </p>
        </div>
      </div>

      <figure className="chart confidence-chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label="Population density with its central 95% shaded, a sample of 40, the sample's 95% confidence interval for the mean, and the population's central 95% band, all on one scale">
          {/* the population */}
          <path className="pop-area" d={areaPath} />
          <path className="pop-band-area" d={bandPath} />
          <path className="pop-curve" d={curvePath} />
          <line className="axis" x1={xAt(xMin)} x2={xAt(xMax)} y1={curveBase} y2={curveBase} />
          <text className="row-label" x={PAD.left} y={curveTop + 4}>Population (two humps)</text>
          <text className="band-caption" x={xAt((POP_LO + POP_HI) / 2)} y={curveBase - 8} textAnchor="middle">
            central 95% of the population
          </text>

          {/* the true mean, through every row */}
          <line className="mu-line" x1={xAt(TRUE_MEAN)} x2={xAt(TRUE_MEAN)} y1={curveTop + 12} y2={bandY + 14} />
          <text className="mu-label" x={xAt(TRUE_MEAN) + 6} y={curveTop + 24}>
            true μ = {fmt(TRUE_MEAN)}
          </text>

          {/* the sample */}
          <text className="row-label" x={PAD.left} y={sampleY - 22}>Sample (n = {N})</text>
          <g className="dots">
            {sample.map((v, i) => (
              <circle key={i} cx={xAt(v)} cy={sampleY + jitter[i]} r={4} />
            ))}
          </g>

          {/* the confidence interval */}
          <g className={ciClass}>
            <line className="bar" x1={xAt(stats.lo)} x2={xAt(stats.hi)} y1={ciY} y2={ciY} />
            <circle className="centre" cx={xAt(stats.mean)} cy={ciY} r={6} />
            <text className="end" x={xAt(stats.lo) - 6} y={ciY + 4} textAnchor="end">{fmt(stats.lo)}</text>
            <text className="end" x={xAt(stats.hi) + 6} y={ciY + 4}>{fmt(stats.hi)}</text>
            <text className="verdict-text" x={W - PAD.right} y={ciY - 12} textAnchor="end">
              {stats.hit ? "✓ contains true μ" : "✗ misses true μ"}
            </text>
          </g>
          <text className="row-label" x={PAD.left} y={ciY - 12}>95% CI for μ: x̄ ± 1.96·s/√n</text>

          {/* the population's 95% band */}
          <g className="pop-band">
            <line className="bar" x1={xAt(POP_LO)} x2={xAt(POP_HI)} y1={bandY} y2={bandY} />
            <text className="end" x={xAt(POP_LO) - 6} y={bandY + 4} textAnchor="end">{fmt(POP_LO)}</text>
            <text className="end" x={xAt(POP_HI) + 6} y={bandY + 4}>{fmt(POP_HI)}</text>
          </g>
          <text className="row-label" x={PAD.left} y={bandY - 12}>Region holding 95% of the population (not a CI)</text>

          {/* x axis */}
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <g key={t}>
              <line className="axis" x1={xAt(t)} x2={xAt(t)} y1={H - PAD.bottom + 2} y2={H - PAD.bottom + 7} />
              <text className="xtick" x={xAt(t)} y={H - PAD.bottom + 20} textAnchor="middle">{t}</text>
            </g>
          ))}
          <line className="axis" x1={xAt(xMin)} x2={xAt(xMax)} y1={H - PAD.bottom + 2} y2={H - PAD.bottom + 2} />
        </svg>
      </figure>

      <dl className="stats">
        <div><dt><span className="sym">x̄</span></dt><dd>{fmt(stats.mean, 2)}</dd></div>
        <div><dt><span className="sym">s</span></dt><dd>{fmt(stats.sd, 2)}</dd></div>
        <div><dt>SE = <span className="sym">s</span>/√{N}</dt><dd>{fmt(stats.se, 2)}</dd></div>
        <div><dt>CI width</dt><dd>{fmt(stats.hi - stats.lo)}</dd></div>
        <div><dt>95% band width</dt><dd>{fmt(POP_HI - POP_LO)}</dd></div>
      </dl>

      <div className="panel-notes">
        <p>
          <strong>Two different 95%s.</strong> The band on the bottom row is a
          fact about the population: 95% of its members fall between {fmt(POP_LO)} and{" "}
          {fmt(POP_HI)}, and it never moves. The confidence interval is a
          statement about one number, μ, made from one sample, and it moves
          with every click. It is about {fmt(Math.sqrt(N))} times narrower, which is √n:
          averaging 40 values shrinks the spread by √40.
        </p>
        <p>
          <strong>What the 95% in a CI means.</strong> Not that 95% of the
          population is inside it. Not that there is a 95% chance μ is inside
          this one; μ is fixed, and this interval either caught it or did not.
          It means the recipe catches μ in about 95% of samples. The tally
          above is that claim, tested one sample at a time. Keep clicking and
          the misses, in red, should settle near one in twenty.
        </p>
        <p>
          <strong>The population is not normal and it does not matter.</strong>{" "}
          Two humps, nothing like a bell. The formula x̄ ± 1.96·s/√n only needs
          the <em>sample mean</em> to be close to normal, and with n = 40 it
          is. The sample itself, in the middle row, still looks like the
          population: lumpy, with a gap near the middle, and no interval
          in the world can tell you where its next member will land.
        </p>
      </div>
    </section>
  );
}
