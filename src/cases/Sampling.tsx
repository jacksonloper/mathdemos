import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The sampling distribution of the mean, built by hand.
 *
 * A bag holds n marbles numbered 0 to n − 1, every one equally likely. A
 * trial grabs m of them with replacement, one at a time, and averages them.
 * Three number lines share one scale, stacked so the eye can compare spreads:
 *
 *   the bag        every marble, flat, the population
 *   this grab      the m marbles just drawn, then a square at their mean
 *   sample means   one square per trial, kept, stacking up where they land
 *
 * Each trial clears the middle line and adds one square to the bottom one.
 * The mean of the latest grab stays marked on the middle line until the next
 * grab starts, so there is always a "this one" to point at. The lesson is in
 * the bottom line: squares crowd the population mean more tightly than
 * marbles ever do, and more tightly as m grows.
 */

const MAX_N = 50;
const MAX_M = 50;
const MAX_MEANS = 20000;

type Phase = "idle" | "drawing" | "settling";

type Trial = {
  draws: number[];
  mean: number;
};

/** The marbles a trial draws: m uniform picks from 0 to n − 1, with replacement. */
function drawSample(n: number, m: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < m; i++) out.push(Math.floor(Math.random() * n));
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], mu: number) =>
  Math.sqrt(xs.reduce((a, x) => a + (x - mu) * (x - mu), 0) / xs.length);

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

export function Sampling() {
  const [n, setN] = useState(33);
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
  // (n − 1)/2, variance (n² − 1)/12.
  const mu = (n - 1) / 2;
  const sigma = Math.sqrt((n * n - 1) / 12);
  const se = sigma / Math.sqrt(m);

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }
  function later(ms: number, f: () => void) {
    timers.current.push(window.setTimeout(f, ms));
  }

  function reset(n2 = n, m2 = m) {
    clearTimers();
    setQueue(0);
    setPhase("idle");
    setTrial(null);
    setShown(0);
    setMeans([]);
    setN(n2);
    setM(m2);
  }

  /**
   * One trial, animated: the marbles land one by one on the middle line; the
   * mean square appears above them and holds, with its value, long enough to
   * be read; then it drops to the bottom line and is kept. `fast` is for runs
   * of ten, where each marble still arrives on its own but quickly, so a run
   * reads as ten separate grabs and not a batch.
   */
  function runTrial(fast: boolean) {
    const draws = drawSample(n, m);
    const t: Trial = { draws, mean: mean(draws) };
    setTrial(t);
    setShown(0);
    setPhase("drawing");
    const perMarble = reduced ? 0 : fast ? Math.min(60, 600 / m) : Math.min(140, 1400 / m);
    // Hold, then drop. The CSS animation is `hold` of pause then the fall.
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
      const draws = drawSample(n, m);
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
  const xAt = (v: number) => PAD.left + (plotW * v) / Math.max(1, n - 1);
  const rowBag = { y: 54, h: 30 };
  const rowSample = { y: 158, h: 68 };
  const rowMeans = { y: 328, h: 120 };
  const H = 360;

  // Ticks: every 1, 5 or 10 depending on n.
  const step = n <= 12 ? 1 : n <= 30 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= n - 1; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] !== n - 1) ticks.push(n - 1);

  // Marbles on the middle line stack where they repeat.
  const marbleR = Math.max(3.5, Math.min(7, plotW / n / 2.6));
  const sampleStacks = useMemo(() => {
    const seen = new Map<number, number>();
    return (trial?.draws ?? []).map((v) => {
      const c = seen.get(v) ?? 0;
      seen.set(v, c + 1);
      return { v, level: c };
    });
  }, [trial]);

  // Squares on the bottom line stack in pixel bins, so the picture is a
  // dotplot of the means at the screen's own resolution. Past a couple of
  // thousand they are drawn as one bar per bin, which is the same picture.
  const bin = 7;
  const bins = useMemo(() => {
    const cols = new Map<number, number>();
    for (const v of means) {
      const k = Math.round(xAt(v) / bin);
      cols.set(k, (cols.get(k) ?? 0) + 1);
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [means, n]);
  const maxStack = Math.max(1, ...bins.values());
  const sq = Math.min(6, (rowMeans.h - 6) / maxStack);
  const asBars = means.length > 2000 || sq < 1.5;

  const mbar = means.length ? mean(means) : NaN;
  const msd = means.length > 1 ? sd(means, mbar) : NaN;

  // The latest grab's mean marker on the middle line: filled and falling
  // while settling, hollow and parked once kept.
  const meanX = trial ? xAt(trial.mean) : 0;
  const markerTop = rowSample.y - rowSample.h - 2;

  return (
    <section className="case">
      <header className="case-head">
        <h1>Grab five marbles, take the mean, repeat</h1>
        <p>
          A bag of numbered marbles. Grab some with replacement and average
          them: that average is one number read off a random grab. Do it
          again and it changes. The bottom line collects every average you
          get, and it is where the sampling distribution lives.
        </p>
      </header>

      <div className="controls controls-stack">
        <div className="control">
          <label className="control-label" htmlFor="bag">Bag size</label>
          <div className="slider-row">
            <input id="bag" type="range" min={2} max={MAX_N} step={1} value={n}
                   onChange={(e) => reset(Number(e.target.value), m)} />
            <output className="slider-value">n = {n}, numbered 0 to {n - 1}</output>
          </div>
        </div>
        <div className="control">
          <label className="control-label" htmlFor="grab">Grab size</label>
          <div className="slider-row">
            <input id="grab" type="range" min={1} max={MAX_M} step={1} value={m}
                   onChange={(e) => reset(n, Number(e.target.value))} />
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
              : trial ? `This grab's mean: ${fmt(trial.mean)}. ${means.length} kept.`
              : "No grabs yet."}
          </span>
        </div>
      </div>

      <figure className="chart sampling">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label={`Three number lines from 0 to ${n - 1}: the bag, this grab of ${m}, and ${means.length} sample means.`}>
          {/* The population mean, one dashed line through all three rows. */}
          <line className="mu-line" x1={xAt(mu)} x2={xAt(mu)} y1={rowBag.y - rowBag.h} y2={rowMeans.y + 4} />
          <text className="row-label mu-label" x={xAt(mu)} y={rowBag.y - rowBag.h - 6} textAnchor="middle">
            μ = {fmt(mu, 1)}
          </text>

          {/* Row 1: the bag. Every marble, once. */}
          <text className="row-label" x={PAD.left} y={rowBag.y - rowBag.h - 6}>The bag: every marble, equally likely</text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowBag.y} y2={rowBag.y} />
          {Array.from({ length: n }, (_, v) => (
            <circle key={v} className="marble bag-marble" cx={xAt(v)} cy={rowBag.y - marbleR - 1} r={marbleR} />
          ))}

          {/* Row 2: this grab. */}
          <text className="row-label" x={PAD.left} y={rowSample.y - rowSample.h - 6}>
            This grab: {m} marble{m === 1 ? "" : "s"}, with replacement
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowSample.y} y2={rowSample.y} />
          {sampleStacks.slice(0, shown).map((s, i) => (
            <circle key={i} className="marble drawn" cx={xAt(s.v)}
                    cy={rowSample.y - marbleR - 1 - s.level * (2 * marbleR + 1)} r={marbleR} />
          ))}

          {/* The mean of this grab. While settling: a filled square that holds
              above the marbles with its value, then falls to the bottom line.
              Once kept: a hollow square parked where it was, with the value,
              until the next grab begins. */}
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
                mean {fmt(trial.mean)}
              </text>
              <line className="mean-tick" x1={meanX} x2={meanX} y1={markerTop + 10} y2={rowSample.y} />
            </g>
          ) : null}

          {/* Row 3: every mean so far. */}
          <text className="row-label" x={PAD.left} y={rowMeans.y - rowMeans.h - 6}>
            Sample means: one square per grab, kept
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowMeans.y} y2={rowMeans.y} />
          {asBars
            ? [...bins.entries()].map(([k, c]) => (
                <rect key={k} className="kept" x={k * bin - 3} y={rowMeans.y - 1 - c * sq} width={6} height={c * sq} />
              ))
            : [...bins.entries()].flatMap(([k, c]) =>
                Array.from({ length: c }, (_, level) => (
                  <rect key={`${k}-${level}`} className="kept"
                        x={k * bin - sq / 2} y={rowMeans.y - sq - 1 - level * sq} width={sq} height={sq} />
                )))}
          {ticks.map((t) => (
            <g key={t}>
              <line className="axis" x1={xAt(t)} x2={xAt(t)} y1={rowMeans.y} y2={rowMeans.y + 5} />
              <text className="xtick" x={xAt(t)} y={rowMeans.y + 18} textAnchor="middle">{t}</text>
            </g>
          ))}
        </svg>
      </figure>

      <dl className="stats">
        <div><dt>Marbles: mean</dt><dd>{fmt(mu, 2)}</dd></div>
        <div><dt>Marbles: SD</dt><dd>{fmt(sigma, 2)}</dd></div>
        <div><dt>Means so far</dt><dd>{means.length}</dd></div>
        <div><dt>Mean of the means</dt><dd>{fmt(mbar)}</dd></div>
        <div><dt>SD of the means</dt><dd>{fmt(msd)}</dd></div>
        <div><dt>σ ÷ √m</dt><dd>{fmt(se)}</dd></div>
      </dl>

      <div className="panel-notes">
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
      </div>
    </section>
  );
}
