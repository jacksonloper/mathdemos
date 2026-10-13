import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The sampling distribution of the mean, and of a proportion, built by hand.
 *
 * Two bags. The numbered bag holds n marbles 0 to n − 1, every one equally
 * likely, and a grab's statistic is the mean. The black-and-white bag holds
 * x black and y white marbles, each black marble counting 1 and each white
 * one 0, and the same statistic is then the proportion of black in the grab.
 * Same machinery, same three number lines on one scale:
 *
 *   the bag        every marble, the population
 *   this grab      the m marbles just drawn, then a square at their mean
 *   sample means   one square per trial, kept, stacking up where they land
 *
 * Each trial clears the middle line and adds one square to the bottom one.
 * The latest grab's mean stays marked on the middle line until the next grab
 * starts. The lesson is in the bottom line: squares crowd the population
 * value more tightly than marbles ever do, and more tightly as m grows.
 */

const MAX_N = 50;
const MAX_M = 50;
const MAX_MEANS = 20000;

type Mode = "mean" | "proportion";
type Phase = "idle" | "drawing" | "settling";

type Trial = {
  draws: number[];
  mean: number;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], mu: number) =>
  Math.sqrt(xs.reduce((a, x) => a + (x - mu) * (x - mu), 0) / xs.length);

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

/** Lay `count` marbles of radius r in a compact pile centred on x, rows of
 *  `perRow`, so a stack of fifty fits in a short row. */
function pile(count: number, perRow: number, r: number) {
  const out: { dx: number; level: number }[] = [];
  for (let i = 0; i < count; i++) {
    const level = Math.floor(i / perRow);
    const inRow = Math.min(perRow, count - level * perRow);
    const col = i - level * perRow;
    out.push({ dx: (col - (inRow - 1) / 2) * (2 * r + 1), level });
  }
  return out;
}

export function Sampling() {
  const [mode, setMode] = useState<Mode>("mean");
  const [n, setN] = useState(33);
  const [black, setBlack] = useState(20);
  const [white, setWhite] = useState(30);
  const [m, setM] = useState(5);
  const [means, setMeans] = useState<number[]>([]);
  // The grab on the middle line. `shown` is how many of its marbles have
  // landed so far, so a trial can be watched arriving one marble at a time.
  const [trial, setTrial] = useState<Trial | null>(null);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState(0);
  const timers = useRef<number[]>([]);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Population facts. Marbles 0 to n − 1 are a discrete uniform: mean
  // (n − 1)/2, variance (n² − 1)/12. Black-and-white marbles are 1s and 0s:
  // mean p, variance p(1 − p).
  const total = black + white;
  const p = total > 0 ? black / total : 0;
  const mu = mode === "mean" ? (n - 1) / 2 : p;
  const sigma = mode === "mean" ? Math.sqrt((n * n - 1) / 12) : Math.sqrt(p * (1 - p));
  const se = sigma / Math.sqrt(m);
  const lo = 0;
  const hi = mode === "mean" ? Math.max(1, n - 1) : 1;

  function drawOne(): number {
    if (mode === "mean") return Math.floor(Math.random() * n);
    return Math.random() < p ? 1 : 0;
  }
  function drawSample(): number[] {
    const out: number[] = [];
    for (let i = 0; i < m; i++) out.push(drawOne());
    return out;
  }

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }
  function later(ms: number, f: () => void) {
    timers.current.push(window.setTimeout(f, ms));
  }

  function reset(patch: Partial<{ mode: Mode; n: number; black: number; white: number; m: number }> = {}) {
    clearTimers();
    setQueue(0);
    setPhase("idle");
    setTrial(null);
    setShown(0);
    setMeans([]);
    if (patch.mode !== undefined) setMode(patch.mode);
    if (patch.n !== undefined) setN(patch.n);
    if (patch.black !== undefined) setBlack(patch.black);
    if (patch.white !== undefined) setWhite(patch.white);
    if (patch.m !== undefined) setM(patch.m);
  }

  /**
   * One trial, animated: the marbles land one by one on the middle line; the
   * mean square appears above them and holds, with its value, long enough to
   * be read; then it drops to the bottom line and is kept. `fast` is for runs
   * of ten, where each marble still arrives on its own but quickly, so a run
   * reads as ten separate grabs and not a batch.
   */
  function runTrial(fast: boolean) {
    const draws = drawSample();
    const t: Trial = { draws, mean: mean(draws) };
    setTrial(t);
    setShown(0);
    setPhase("drawing");
    const perMarble = reduced ? 0 : fast ? Math.min(60, 600 / m) : Math.min(140, 1400 / m);
    const settle = reduced ? 0 : fast ? 420 : 1100;
    for (let i = 1; i <= m; i++) later(perMarble * i, () => setShown(i));
    later(perMarble * m + 40, () => setPhase("settling"));
    later(perMarble * m + 40 + settle, () => {
      setMeans((prev) => (prev.length >= MAX_MEANS ? prev : [...prev, t.mean]));
      setPhase("idle");
      setQueue((q) => Math.max(0, q - 1));
    });
  }

  /** A thousand trials at once, no animation: the squares just update. The
   *  last grab is left on the middle line so there is still a "this one". */
  function runMany(count: number) {
    clearTimers();
    const fresh: number[] = [];
    let last: Trial | null = null;
    for (let i = 0; i < count; i++) {
      const draws = drawSample();
      last = { draws, mean: mean(draws) };
      fresh.push(last.mean);
    }
    setMeans((prev) => [...prev, ...fresh].slice(-MAX_MEANS));
    setTrial(last);
    setShown(m);
    setPhase("idle");
  }

  // A queue of trials runs one after another, never overlapping.
  useEffect(() => {
    if (phase === "idle" && queue > 0) runTrial(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, queue]);

  useEffect(() => () => clearTimers(), []);

  const busy = phase !== "idle" || queue > 0;

  // Geometry. One x scale for all three lines.
  const W = 720;
  const PAD = { left: 40, right: 40 };
  const plotW = W - PAD.left - PAD.right;
  const xAt = (v: number) => PAD.left + (plotW * (v - lo)) / (hi - lo);
  const rowBag = { y: 54, h: 30 };
  const rowSample = { y: 158, h: 68 };
  const rowMeans = { y: 328, h: 120 };
  const H = 374;

  // Ticks: whole numbers for the numbered bag, tenths for a proportion.
  const ticks: { v: number; label: string }[] = [];
  if (mode === "mean") {
    const step = n <= 12 ? 1 : n <= 30 ? 5 : 10;
    for (let t = 0; t <= n - 1; t += step) ticks.push({ v: t, label: String(t) });
    if (ticks[ticks.length - 1].v !== n - 1) ticks.push({ v: n - 1, label: String(n - 1) });
  } else {
    for (let t = 0; t <= 10; t++) ticks.push({ v: t / 10, label: (t / 10).toFixed(1) });
  }

  // Marbles. On the numbered line they stack where they repeat; on the 0 to 1
  // line they pile up at 0 and at 1.
  const marbleR = mode === "mean" ? Math.max(3.5, Math.min(7, plotW / n / 2.6)) : 3.5;
  const sampleMarbles = useMemo(() => {
    const draws = trial?.draws ?? [];
    if (mode === "mean") {
      const seen = new Map<number, number>();
      return draws.map((v) => {
        const c = seen.get(v) ?? 0;
        seen.set(v, c + 1);
        return { v, dx: 0, level: c, black: true };
      });
    }
    // Keep each marble's order of arrival, but place it in its pile.
    const zeros = pile(draws.filter((v) => v === 0).length, 8, marbleR);
    const ones = pile(draws.filter((v) => v === 1).length, 8, marbleR);
    let i0 = 0;
    let i1 = 0;
    return draws.map((v) => {
      const spot = v === 1 ? ones[i1++] : zeros[i0++];
      return { v, dx: spot.dx, level: spot.level, black: v === 1 };
    });
  }, [trial, mode, marbleR]);

  // Squares on the bottom line stack in bins. A mean of m marbles is always
  // a multiple of 1/m, so the bins are built on that grid: each one holds the
  // same number of possible means, k of them, with k chosen so a bin is at
  // least 7 px wide. Binning by pixel would stripe the picture.
  const pxPerStep = plotW / (hi - lo) / m;
  const k = Math.max(1, Math.ceil(7 / pxPerStep));
  const binW = Math.max(2, k * pxPerStep - 1);
  const bins = useMemo(() => {
    const cols = new Map<number, number>();
    for (const v of means) {
      const j = Math.round(v * m);
      const idx = Math.floor(j / k);
      cols.set(idx, (cols.get(idx) ?? 0) + 1);
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [means, hi, m, k]);
  const binX = (idx: number) => xAt((idx * k + (k - 1) / 2) / m);
  const maxStack = Math.max(1, ...bins.values());
  const sq = Math.min(6, binW, (rowMeans.h - 6) / maxStack);
  const asBars = means.length > 2000 || sq < 1.5;

  const mbar = means.length ? mean(means) : NaN;
  const msd = means.length > 1 ? sd(means, mbar) : NaN;

  const meanX = trial ? xAt(trial.mean) : 0;
  const markerTop = rowSample.y - rowSample.h - 2;
  const stat = mode === "mean" ? "mean" : "proportion";
  const bagPiles = mode === "proportion"
    ? { white: pile(white, 13, 3), black: pile(black, 13, 3) }
    : null;

  return (
    <section className="case">
      <header className="case-head">
        <h1>{mode === "mean" ? "Grab marbles, take the mean, repeat" : "Grab marbles, take the proportion, repeat"}</h1>
        <p>
          {mode === "mean"
            ? "A bag of numbered marbles. Grab some with replacement and average them: that average is one number read off a random grab. Do it again and it changes. The bottom line collects every average you get, and it is where the sampling distribution lives."
            : "A bag of black and white marbles. Grab some with replacement and count the black ones as a fraction of the grab: that fraction is one number read off a random grab. Do it again and it changes. The bottom line collects every fraction you get."}
        </p>
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">The bag</span>
          <div className="segmented" role="group" aria-label="Kind of bag">
            <button type="button" className={mode === "mean" ? "is-active" : ""} aria-pressed={mode === "mean"}
                    onClick={() => reset({ mode: "mean" })}>Numbered marbles, mean</button>
            <button type="button" className={mode === "proportion" ? "is-active" : ""} aria-pressed={mode === "proportion"}
                    onClick={() => reset({ mode: "proportion" })}>Black and white, proportion</button>
          </div>
        </div>
      </div>

      <div className="controls controls-stack">
        {mode === "mean" ? (
          <div className="control">
            <label className="control-label" htmlFor="bag">Bag size</label>
            <div className="slider-row">
              <input id="bag" type="range" min={2} max={MAX_N} step={1} value={n}
                     onChange={(e) => reset({ n: Number(e.target.value) })} />
              <output className="slider-value">n = {n}, numbered 0 to {n - 1}</output>
            </div>
          </div>
        ) : (
          <>
            <div className="control">
              <label className="control-label" htmlFor="black">Black marbles</label>
              <div className="slider-row">
                <input id="black" type="range" min={1} max={MAX_N} step={1} value={black}
                       onChange={(e) => reset({ black: Number(e.target.value) })} />
                <output className="slider-value">{black} black</output>
              </div>
            </div>
            <div className="control">
              <label className="control-label" htmlFor="white">White marbles</label>
              <div className="slider-row">
                <input id="white" type="range" min={1} max={MAX_N} step={1} value={white}
                       onChange={(e) => reset({ white: Number(e.target.value) })} />
                <output className="slider-value">{white} white, so p = {fmt(p)}</output>
              </div>
            </div>
          </>
        )}
        <div className="control">
          <label className="control-label" htmlFor="grab">Grab size</label>
          <div className="slider-row">
            <input id="grab" type="range" min={1} max={MAX_M} step={1} value={m}
                   onChange={(e) => reset({ m: Number(e.target.value) })} />
            <output className="slider-value">m = {m} per grab</output>
          </div>
        </div>
      </div>

      <div className="controls controls-tight">
        <div className="control">
          <span className="control-label">Run it</span>
          <div className="segmented" role="group" aria-label="Run trials">
            <button type="button" onClick={() => { if (!busy) runTrial(false); }} disabled={busy}>One grab</button>
            <button type="button" onClick={() => { if (!busy) setQueue(10); }} disabled={busy}>Ten grabs</button>
            <button type="button" onClick={() => { if (!busy) runMany(1000); }} disabled={busy}>1000 grabs, no animation</button>
            <button type="button" onClick={() => reset()} disabled={means.length === 0 && !busy}>Start over</button>
          </div>
        </div>
        <div className="control">
          <span className="control-label">&nbsp;</span>
          <span className="readout sampling-readout" aria-live="polite">
            {phase === "drawing" ? `Drawing… ${shown} of ${m}`
              : trial ? `This grab's ${stat}: ${fmt(trial.mean)}. ${means.length} kept.`
              : "No grabs yet."}
          </span>
        </div>
      </div>

      <figure className="chart sampling">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label={`Three number lines: the bag, this grab of ${m}, and ${means.length} sample ${stat}s.`}>
          {/* The population value, one dashed line through all three rows. */}
          <line className="mu-line" x1={xAt(mu)} x2={xAt(mu)} y1={rowBag.y - rowBag.h} y2={rowMeans.y + 22} />
          <text className="row-label mu-label" x={xAt(mu)} y={rowMeans.y + 34} textAnchor="middle">
            {mode === "mean" ? `μ = ${fmt(mu, 1)}` : `p = ${fmt(p)}`}
          </text>

          {/* Row 1: the bag. */}
          <text className="row-label" x={PAD.left} y={rowBag.y - rowBag.h - 6}>
            {mode === "mean" ? "The bag: every marble, equally likely" : `The bag: ${black} black (each a 1) and ${white} white (each a 0)`}
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowBag.y} y2={rowBag.y} />
          {mode === "mean"
            ? Array.from({ length: n }, (_, v) => (
                <circle key={v} className="marble bag-marble" cx={xAt(v)} cy={rowBag.y - marbleR - 1} r={marbleR} />
              ))
            : [
                ...bagPiles!.white.map((s, i) => (
                  <circle key={`w${i}`} className="marble bag-marble white" cx={xAt(0) + s.dx} cy={rowBag.y - 4 - s.level * 7} r={3} />
                )),
                ...bagPiles!.black.map((s, i) => (
                  <circle key={`b${i}`} className="marble bag-marble black" cx={xAt(1) + s.dx} cy={rowBag.y - 4 - s.level * 7} r={3} />
                )),
              ]}

          {/* Row 2: this grab. */}
          <text className="row-label" x={PAD.left} y={rowSample.y - rowSample.h - 6}>
            This grab: {m} marble{m === 1 ? "" : "s"}, with replacement
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowSample.y} y2={rowSample.y} />
          {sampleMarbles.slice(0, shown).map((s, i) => (
            <circle key={i} className={`marble drawn ${mode === "proportion" ? (s.black ? "black" : "white") : ""}`}
                    cx={xAt(s.v) + s.dx} cy={rowSample.y - marbleR - 1 - s.level * (2 * marbleR + 1)} r={marbleR} />
          ))}

          {/* The statistic of this grab: a filled square that holds, then falls;
              and a hollow one that stays parked until the next grab begins. */}
          {trial && shown === m && phase === "settling" ? (
            <g className="mean-square is-dropping"
               style={{ "--drop": `${rowMeans.y - rowSample.y}px`, "--hold": reduced ? "0ms" : queue > 0 ? "180ms" : "520ms" } as React.CSSProperties}>
              <rect x={meanX - 5} y={markerTop} width={10} height={10} />
            </g>
          ) : null}
          {trial && shown === m && phase !== "drawing" ? (
            <g className="mean-mark">
              <rect x={meanX - 5} y={markerTop} width={10} height={10} />
              <text className="mean-value" x={meanX + 9} y={markerTop + 9} textAnchor="start">
                {stat} {fmt(trial.mean)}
              </text>
              <line className="mean-tick" x1={meanX} x2={meanX} y1={markerTop + 10} y2={rowSample.y} />
            </g>
          ) : null}

          {/* Row 3: every statistic so far. */}
          <text className="row-label" x={PAD.left} y={rowMeans.y - rowMeans.h - 6}>
            Sample {stat}s: one square per grab, kept
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowMeans.y} y2={rowMeans.y} />
          {asBars
            ? [...bins.entries()].map(([idx, c]) => (
                <rect key={idx} className="kept" x={binX(idx) - binW / 2} y={rowMeans.y - 1 - c * sq} width={binW} height={c * sq} />
              ))
            : [...bins.entries()].flatMap(([idx, c]) =>
                Array.from({ length: c }, (_, level) => (
                  <rect key={`${idx}-${level}`} className="kept"
                        x={binX(idx) - sq / 2} y={rowMeans.y - sq - 1 - level * sq} width={sq} height={sq} />
                )))}
          {ticks.map((t) => (
            <g key={t.label}>
              <line className="axis" x1={xAt(t.v)} x2={xAt(t.v)} y1={rowMeans.y} y2={rowMeans.y + 5} />
              <text className="xtick" x={xAt(t.v)} y={rowMeans.y + 18} textAnchor="middle">{t.label}</text>
            </g>
          ))}
        </svg>
      </figure>

      <dl className="stats">
        {mode === "mean" ? (
          <>
            <div><dt>Marbles: mean</dt><dd>{fmt(mu, 2)}</dd></div>
            <div><dt>Marbles: SD</dt><dd>{fmt(sigma, 2)}</dd></div>
          </>
        ) : (
          <>
            <div><dt>p, black in the bag</dt><dd>{fmt(p)}</dd></div>
            <div><dt>m·p and m·(1 − p)</dt><dd>{fmt(m * p, 1)} · {fmt(m * (1 - p), 1)}</dd></div>
          </>
        )}
        <div><dt>{stat}s so far</dt><dd>{means.length}</dd></div>
        <div><dt>Mean of the {stat}s</dt><dd>{fmt(mbar)}</dd></div>
        <div><dt>SD of the {stat}s</dt><dd>{fmt(msd)}</dd></div>
        <div><dt>{mode === "mean" ? "σ ÷ √m" : "√(p(1 − p) ÷ m)"}</dt><dd>{fmt(se)}</dd></div>
      </dl>

      <div className="panel-notes">
        {mode === "mean" ? (
          <>
            <p>
              <strong>Two spreads on one scale.</strong> The marbles on the top
              line are as spread out as they come. The squares on the bottom line
              crowd the dashed line. One marble can land anywhere in the bag; the
              mean of {m} rarely strays far from μ.
            </p>
            <p>
              <strong>How far they stray is σ ÷ √m.</strong> After enough grabs
              the SD of the means settles next to that number. Move the grab size
              up and the squares pull in; move it down to 1 and the bottom line is
              just the bag again.
            </p>
            <p>
              <strong>And the shape.</strong> The bag is flat. The squares are
              not: with a few marbles per grab they already pile up in the
              middle, and by a few dozen they make a bell. That is the Central
              Limit Theorem, and the bag never had to be bell-shaped for it.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>A proportion is a mean.</strong> Call each black marble a 1
              and each white one a 0. The proportion of black in a grab is the
              average of those 1s and 0s, so everything that was true of sample
              means is true here, with μ = p and σ = √(p(1 − p)).
            </p>
            <p>
              <strong>So the spread is √(p(1 − p) ÷ m).</strong> After enough
              grabs the SD of the proportions settles next to that number. The
              possible values are only the multiples of 1/m: with five marbles a
              grab can be 0, 0.2, 0.4, 0.6, 0.8 or 1, and nothing between.
            </p>
            <p>
              <strong>When is it a bell?</strong> The bag has only two values, as
              far from flat as it gets, so it takes a larger grab. The rule is
              m·p and m·(1 − p) both at least 10. Slide the bag toward almost all
              white and watch the pile lean against the left wall until the grab
              is big enough to free it.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
