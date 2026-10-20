import { useEffect, useMemo, useRef, useState } from "react";
import { TextEntry, type ParseResult } from "../components/TextEntry";
import { MAX_CHARS, parseMarbles, serializeMarbles, type Marble } from "../data/marbleText";

/**
 * The sampling distribution of the mean, and of a proportion, built by hand.
 *
 * Three bags. The numbered bag holds n marbles 0 to n − 1, every one equally
 * likely, and a grab's statistic is the mean. The black-and-white bag holds
 * x black and y white marbles, each black marble counting 1 and each white
 * one 0, and the same statistic is then the proportion of black in the grab.
 * The third bag is typed in: one marble per person in the room, marked with
 * an initial and a number ("B3", Bob has three keys), so the bag is a census
 * and its mean is the true population mean; a grab from it is a simple
 * random sample, with or without replacement. Same machinery, same three
 * number lines on one scale:
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

type Mode = "mean" | "proportion" | "custom";
type Phase = "idle" | "drawing" | "settling";

type Trial = {
  draws: number[];
  labels: string[];
  mean: number;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], mu: number) =>
  Math.sqrt(xs.reduce((a, x) => a + (x - mu) * (x - mu), 0) / xs.length);

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

/** Something in the bag before anyone has typed: twenty people and their keys. */
const SAMPLE_CENSUS: Marble[] = "A3 B7 C2 D5 E4 F6 G3 H1 J8 K2 L4 M3 N5 P2 R6 S3 T4 V7 W2 Z5"
  .split(" ")
  .map((t) => ({ label: t.slice(0, 1), value: Number(t.slice(1)) }));

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

/** Stack marbles that share a value: each gets the level of how many came before it there. */
function stacked(values: number[]) {
  const seen = new Map<number, number>();
  return values.map((v) => {
    const c = seen.get(v) ?? 0;
    seen.set(v, c + 1);
    return c;
  });
}

export function Sampling() {
  const [mode, setMode] = useState<Mode>("mean");
  const [n, setN] = useState(33);
  const [black, setBlack] = useState(20);
  const [white, setWhite] = useState(30);
  const [census, setCensus] = useState<Marble[]>(SAMPLE_CENSUS);
  // A grab from the typed bag is an SRS, so by default no one is drawn twice.
  const [replace, setReplace] = useState(false);
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

  const custom = mode === "custom";
  const noRepeats = custom && !replace;
  // Without replacement a grab cannot be bigger than the bag.
  const mEff = noRepeats ? Math.min(m, census.length) : m;

  // Population facts. Marbles 0 to n − 1 are a discrete uniform: mean
  // (n − 1)/2, variance (n² − 1)/12. Black-and-white marbles are 1s and 0s:
  // mean p, variance p(1 − p). The typed bag is whatever was typed, and its
  // mean and SD are the population's, since everyone was counted.
  const total = black + white;
  const p = total > 0 ? black / total : 0;
  const censusValues = useMemo(() => census.map((c) => c.value), [census]);
  const censusMu = mean(censusValues);
  const mu = mode === "mean" ? (n - 1) / 2 : mode === "proportion" ? p : censusMu;
  const sigma = mode === "mean" ? Math.sqrt((n * n - 1) / 12)
    : mode === "proportion" ? Math.sqrt(p * (1 - p))
    : sd(censusValues, censusMu);
  const se = sigma / Math.sqrt(mEff);
  // Drawing without replacement from a small bag pulls the means in a little
  // more than σ ÷ √m says: the finite population correction.
  const fpc = noRepeats && census.length > 1 ? Math.sqrt((census.length - mEff) / (census.length - 1)) : 1;
  const lo = custom ? Math.min(0, ...censusValues) : 0;
  const hi = mode === "mean" ? Math.max(1, n - 1) : mode === "proportion" ? 1 : Math.max(lo + 1, ...censusValues);

  function drawSample(): { draws: number[]; labels: string[] } {
    const draws: number[] = [];
    const labels: string[] = [];
    if (mode === "mean") {
      for (let i = 0; i < m; i++) draws.push(Math.floor(Math.random() * n));
    } else if (mode === "proportion") {
      for (let i = 0; i < m; i++) draws.push(Math.random() < p ? 1 : 0);
    } else if (replace) {
      for (let i = 0; i < m; i++) {
        const c = census[Math.floor(Math.random() * census.length)];
        draws.push(c.value);
        labels.push(c.label);
      }
    } else {
      // A partial Fisher–Yates shuffle: the first mEff of a random order.
      const idx = census.map((_, i) => i);
      for (let i = 0; i < mEff; i++) {
        const j = i + Math.floor(Math.random() * (idx.length - i));
        [idx[i], idx[j]] = [idx[j], idx[i]];
        draws.push(census[idx[i]].value);
        labels.push(census[idx[i]].label);
      }
    }
    return { draws, labels };
  }

  function clearTimers() {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }
  function later(ms: number, f: () => void) {
    timers.current.push(window.setTimeout(f, ms));
  }

  function reset(patch: Partial<{ mode: Mode; n: number; black: number; white: number; m: number; census: Marble[]; replace: boolean }> = {}) {
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
    if (patch.census !== undefined) setCensus(patch.census);
    if (patch.replace !== undefined) setReplace(patch.replace);
  }

  /**
   * One trial, animated: the marbles land one by one on the middle line; the
   * mean square appears above them and holds, with its value, long enough to
   * be read; then it drops to the bottom line and is kept. `fast` is for runs
   * of ten, where each marble still arrives on its own but quickly, so a run
   * reads as ten separate grabs and not a batch.
   */
  function runTrial(fast: boolean) {
    const { draws, labels } = drawSample();
    const t: Trial = { draws, labels, mean: mean(draws) };
    setTrial(t);
    setShown(0);
    setPhase("drawing");
    const k = draws.length;
    const perMarble = reduced ? 0 : fast ? Math.min(60, 600 / k) : Math.min(140, 1400 / k);
    const settle = reduced ? 0 : fast ? 420 : 1100;
    for (let i = 1; i <= k; i++) later(perMarble * i, () => setShown(i));
    later(perMarble * k + 40, () => setPhase("settling"));
    later(perMarble * k + 40 + settle, () => {
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
      const { draws, labels } = drawSample();
      last = { draws, labels, mean: mean(draws) };
      fresh.push(last.mean);
    }
    setMeans((prev) => [...prev, ...fresh].slice(-MAX_MEANS));
    setTrial(last);
    setShown(mEff);
    setPhase("idle");
  }

  // A queue of trials runs one after another, never overlapping.
  useEffect(() => {
    if (phase === "idle" && queue > 0) runTrial(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, queue]);

  useEffect(() => () => clearTimers(), []);

  const busy = phase !== "idle" || queue > 0;

  // Geometry. One x scale for all three lines. The typed bag's marbles carry
  // labels, so they are bigger, and its rows are taller to hold the stacks.
  const W = 720;
  const PAD = { left: 40, right: 40 };
  const plotW = W - PAD.left - PAD.right;
  const xAt = (v: number) => PAD.left + (plotW * (v - lo)) / (hi - lo);
  const marbleR = mode === "mean" ? Math.max(3.5, Math.min(7, plotW / n / 2.6))
    : mode === "proportion" ? 3.5
    : Math.max(7, Math.min(10, plotW / (hi - lo + 1) / 2.4));
  const bagLevels = useMemo(() => (custom ? stacked(censusValues) : []), [custom, censusValues]);
  const bagStack = custom ? 1 + Math.max(0, ...bagLevels) : 1;
  const step = 2 * marbleR + 1;
  const rowBag = custom
    ? { y: 30 + Math.max(40, bagStack * step + 4), h: Math.max(40, bagStack * step + 4) }
    : { y: 54, h: 30 };
  const sampleH = custom ? Math.max(68, Math.min(mEff, 6) * step + 4) : 68;
  const rowSample = { y: rowBag.y + 44 + sampleH, h: sampleH };
  const rowMeans = { y: rowSample.y + 40 + 120, h: 120 };
  const H = rowMeans.y + 46;

  // Ticks: whole numbers for the numbered bag and the typed one, tenths for
  // a proportion.
  const ticks: { v: number; label: string }[] = [];
  if (mode === "proportion") {
    for (let t = 0; t <= 10; t++) ticks.push({ v: t / 10, label: (t / 10).toFixed(1) });
  } else {
    const top = mode === "mean" ? n - 1 : hi;
    const span = top - lo;
    const tstep = span <= 12 ? 1 : span <= 30 ? 5 : span <= 80 ? 10 : 20;
    for (let t = Math.ceil(lo); t <= top; t += tstep) ticks.push({ v: t, label: String(t) });
    if (ticks.length === 0 || ticks[ticks.length - 1].v !== top) ticks.push({ v: top, label: String(top) });
  }

  // Marbles. On a numbered line they stack where they repeat; on the 0 to 1
  // line they pile up at 0 and at 1.
  const sampleMarbles = useMemo(() => {
    const draws = trial?.draws ?? [];
    const labels = trial?.labels ?? [];
    if (mode !== "proportion") {
      const levels = stacked(draws);
      return draws.map((v, i) => ({ v, dx: 0, level: levels[i], black: true, label: labels[i] ?? "" }));
    }
    // Keep each marble's order of arrival, but place it in its pile.
    const zeros = pile(draws.filter((v) => v === 0).length, 8, marbleR);
    const ones = pile(draws.filter((v) => v === 1).length, 8, marbleR);
    let i0 = 0;
    let i1 = 0;
    return draws.map((v) => {
      const spot = v === 1 ? ones[i1++] : zeros[i0++];
      return { v, dx: spot.dx, level: spot.level, black: v === 1, label: "" };
    });
  }, [trial, mode, marbleR]);

  // Squares on the bottom line stack in bins. A mean of m marbles is always
  // a multiple of 1/m (when the marbles are whole numbers), so the bins are
  // built on that grid: each one holds the same number of possible means, k
  // of them, with k chosen so a bin is at least 7 px wide. Binning by pixel
  // would stripe the picture.
  const pxPerStep = plotW / (hi - lo) / mEff;
  const k = Math.max(1, Math.ceil(7 / pxPerStep));
  const binW = Math.max(2, k * pxPerStep - 1);
  const bins = useMemo(() => {
    const cols = new Map<number, number>();
    for (const v of means) {
      const j = Math.round((v - lo) * mEff);
      const idx = Math.floor(j / k);
      cols.set(idx, (cols.get(idx) ?? 0) + 1);
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [means, hi, lo, mEff, k]);
  const binX = (idx: number) => xAt(lo + (idx * k + (k - 1) / 2) / mEff);
  const maxStack = Math.max(1, ...bins.values());
  const sq = Math.min(6, binW, (rowMeans.h - 6) / maxStack);
  const asBars = means.length > 2000 || sq < 1.5;

  const mbar = means.length ? mean(means) : NaN;
  const msd = means.length > 1 ? sd(means, mbar) : NaN;

  const meanX = trial ? xAt(trial.mean) : 0;
  const markerTop = rowSample.y - rowSample.h - 2;
  const stat = mode === "proportion" ? "proportion" : "mean";
  const bagPiles = mode === "proportion"
    ? { white: pile(white, 13, 3), black: pile(black, 13, 3) }
    : null;
  const labelSize = Math.max(6, Math.min(8.5, marbleR * 0.85));

  const parseCensus = (text: string): ParseResult<Marble[]> => {
    const r = parseMarbles(text);
    if (!r.ok) return r;
    return { ok: true, value: r.marbles, summary: `${r.marbles.length} people · ${text.length} of ${MAX_CHARS} characters` };
  };

  const grabWord = noRepeats ? "sample" : "grab";

  return (
    <section className="case">
      <header className="case-head">
        <h1>
          {mode === "mean" ? "Grab marbles, take the mean, repeat"
            : mode === "proportion" ? "Grab marbles, take the proportion, repeat"
            : "Sample the room, take the mean, repeat"}
        </h1>
        <p>
          {mode === "mean"
            ? "A bag of numbered marbles. Grab some with replacement and average them: that average is one number read off a random grab. Do it again and it changes. The bottom line collects every average you get, and it is where the sampling distribution lives."
            : mode === "proportion"
            ? "A bag of black and white marbles. Grab some with replacement and count the black ones as a fraction of the grab: that fraction is one number read off a random grab. Do it again and it changes. The bottom line collects every fraction you get."
            : "One marble per person in the room, marked with an initial and a number. Everyone was counted, so this bag is a census and its mean is the true population mean. A grab is a simple random sample; its mean is one number read off one sample, and the bottom line collects what every sample would have said."}
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
            <button type="button" className={custom ? "is-active" : ""} aria-pressed={custom}
                    onClick={() => reset({ mode: "custom" })}>My data</button>
          </div>
        </div>
      </div>

      {custom && (
        <TextEntry<Marble[]>
          id="census-list"
          className="values-text"
          label="The census: an initial and a number for each person, like B3 for Bob with 3 keys"
          committed={serializeMarbles(census)}
          parse={parseCensus}
          onCommit={(marbles) => reset({ census: marbles })}
        />
      )}

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
        ) : mode === "proportion" ? (
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
        ) : (
          <div className="control">
            <span className="control-label">Drawing</span>
            <div className="segmented" role="group" aria-label="With or without replacement">
              <button type="button" className={!replace ? "is-active" : ""} aria-pressed={!replace}
                      onClick={() => reset({ replace: false })}>No one twice (an SRS)</button>
              <button type="button" className={replace ? "is-active" : ""} aria-pressed={replace}
                      onClick={() => reset({ replace: true })}>With replacement</button>
            </div>
          </div>
        )}
        <div className="control">
          <label className="control-label" htmlFor="grab">{noRepeats ? "Sample size" : "Grab size"}</label>
          <div className="slider-row">
            <input id="grab" type="range" min={1} max={noRepeats ? census.length : MAX_M} step={1} value={mEff}
                   onChange={(e) => reset({ m: Number(e.target.value) })} />
            <output className="slider-value">
              {noRepeats ? `m = ${mEff} of ${census.length} people` : `m = ${mEff} per grab`}
            </output>
          </div>
        </div>
      </div>

      <div className="controls controls-tight">
        <div className="control">
          <span className="control-label">Run it</span>
          <div className="segmented" role="group" aria-label="Run trials">
            <button type="button" onClick={() => { if (!busy) runTrial(false); }} disabled={busy}>One {grabWord}</button>
            <button type="button" onClick={() => { if (!busy) setQueue(10); }} disabled={busy}>Ten {grabWord}s</button>
            <button type="button" onClick={() => { if (!busy) runMany(1000); }} disabled={busy}>1000 {grabWord}s, no animation</button>
            <button type="button" onClick={() => reset()} disabled={means.length === 0 && !busy}>Start over</button>
          </div>
        </div>
        <div className="control">
          <span className="control-label">&nbsp;</span>
          <span className="readout sampling-readout" aria-live="polite">
            {phase === "drawing" ? `Drawing… ${shown} of ${mEff}`
              : trial ? `This ${grabWord}'s ${stat}: ${fmt(trial.mean)}. ${means.length} kept.`
              : `No ${grabWord}s yet.`}
          </span>
        </div>
      </div>

      <figure className="chart sampling">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label={`Three number lines: the bag, this ${grabWord} of ${mEff}, and ${means.length} sample ${stat}s.`}>
          {/* The population value, one dashed line through all three rows. */}
          <line className="mu-line" x1={xAt(mu)} x2={xAt(mu)} y1={rowBag.y - rowBag.h} y2={rowMeans.y + 22} />
          <text className="row-label mu-label" x={xAt(mu)} y={rowMeans.y + 34} textAnchor="middle">
            {mode === "proportion" ? `p = ${fmt(p)}` : `μ = ${fmt(mu, 2)}`}
          </text>

          {/* Row 1: the bag. */}
          <text className="row-label" x={PAD.left} y={rowBag.y - rowBag.h - 6}>
            {mode === "mean" ? "The bag: every marble, equally likely"
              : mode === "proportion" ? `The bag: ${black} black (each a 1) and ${white} white (each a 0)`
              : `The census: ${census.length} people, one marble each, everyone counted`}
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowBag.y} y2={rowBag.y} />
          {mode === "mean"
            ? Array.from({ length: n }, (_, v) => (
                <circle key={v} className="marble bag-marble" cx={xAt(v)} cy={rowBag.y - marbleR - 1} r={marbleR} />
              ))
            : mode === "proportion"
            ? [
                ...bagPiles!.white.map((s, i) => (
                  <circle key={`w${i}`} className="marble bag-marble white" cx={xAt(0) + s.dx} cy={rowBag.y - 4 - s.level * 7} r={3} />
                )),
                ...bagPiles!.black.map((s, i) => (
                  <circle key={`b${i}`} className="marble bag-marble black" cx={xAt(1) + s.dx} cy={rowBag.y - 4 - s.level * 7} r={3} />
                )),
              ]
            : census.map((c, i) => {
                const cy = rowBag.y - marbleR - 1 - bagLevels[i] * step;
                return (
                  <g key={i}>
                    <circle className="marble bag-marble" cx={xAt(c.value)} cy={cy} r={marbleR} />
                    <text className="marble-label" x={xAt(c.value)} y={cy} dy="0.35em" textAnchor="middle" fontSize={labelSize}>
                      {c.label}{c.value}
                    </text>
                  </g>
                );
              })}

          {/* Row 2: this grab. */}
          <text className="row-label" x={PAD.left} y={rowSample.y - rowSample.h - 6}>
            {noRepeats
              ? `This sample: ${mEff} ${mEff === 1 ? "person" : "people"}, no one twice`
              : `This grab: ${mEff} marble${mEff === 1 ? "" : "s"}, with replacement`}
          </text>
          <line className="axis" x1={PAD.left} x2={W - PAD.right} y1={rowSample.y} y2={rowSample.y} />
          {sampleMarbles.slice(0, shown).map((s, i) => {
            const cx = xAt(s.v) + s.dx;
            const cy = rowSample.y - marbleR - 1 - s.level * step;
            return (
              <g key={i} className={`drawn-group`}>
                <circle className={`marble drawn ${mode === "proportion" ? (s.black ? "black" : "white") : ""}`}
                        cx={cx} cy={cy} r={marbleR} />
                {custom && (
                  <text className="marble-label on-drawn" x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize={labelSize}>
                    {s.label}{s.v}
                  </text>
                )}
              </g>
            );
          })}

          {/* The statistic of this grab: a filled square that holds, then falls;
              and a hollow one that stays parked until the next grab begins. */}
          {trial && shown === trial.draws.length && phase === "settling" ? (
            <g className="mean-square is-dropping"
               style={{ "--drop": `${rowMeans.y - rowSample.y}px`, "--hold": reduced ? "0ms" : queue > 0 ? "180ms" : "520ms" } as React.CSSProperties}>
              <rect x={meanX - 5} y={markerTop} width={10} height={10} />
            </g>
          ) : null}
          {trial && shown === trial.draws.length && phase !== "drawing" ? (
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
            Sample {stat}s: one square per {grabWord}, kept
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
        ) : mode === "proportion" ? (
          <>
            <div><dt>p, black in the bag</dt><dd>{fmt(p)}</dd></div>
            <div><dt>m·p and m·(1 − p)</dt><dd>{fmt(m * p, 1)} · {fmt(m * (1 - p), 1)}</dd></div>
          </>
        ) : (
          <>
            <div><dt>Census: mean μ</dt><dd>{fmt(mu, 2)}</dd></div>
            <div><dt>Census: SD σ</dt><dd>{fmt(sigma, 2)}</dd></div>
          </>
        )}
        <div><dt>{stat}s so far</dt><dd>{means.length}</dd></div>
        <div><dt>Mean of the {stat}s</dt><dd>{fmt(mbar)}</dd></div>
        <div><dt>SD of the {stat}s</dt><dd>{fmt(msd)}</dd></div>
        <div><dt>{mode === "proportion" ? "√(p(1 − p) ÷ m)" : "σ ÷ √m"}</dt><dd>{fmt(se)}</dd></div>
        {noRepeats && (
          <div><dt>… × √((N − m)/(N − 1)), no repeats</dt><dd>{fmt(se * fpc)}</dd></div>
        )}
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
        ) : mode === "proportion" ? (
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
        ) : (
          <>
            <p>
              <strong>A census against a sample.</strong> The top line is
              everyone, so its mean μ is not an estimate of anything: it is the
              answer. A real survey never has this line. It has one grab from the
              middle line and has to live with that grab's mean, which is one of
              the squares below, somewhere near μ and almost never on it.
            </p>
            <p>
              <strong>How near is σ ÷ √m.</strong> After enough samples the SD of
              the means settles next to that number. Drawing no one twice pulls
              the squares in a little more, by the factor √((N − m)/(N − 1)) for a room of N, and
              a sample as big as the room has only one possible mean: μ itself.
              Switch to drawing with replacement and the correction goes away.
            </p>
            <p>
              <strong>Read the labels.</strong> Each marble on the middle line is
              a person, and a grab is a list of names before it is a number.
              The same person can show up in one sample and not the next; that
              is the whole reason the mean moves.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
