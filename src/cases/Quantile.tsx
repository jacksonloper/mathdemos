import { useEffect, useMemo, useState } from "react";
import { TextEntry, type ParseResult } from "../components/TextEntry";
import { serializeValues } from "../data/valuesText";
import { MAX_N, normalPdf, parseList, presets, quantiles } from "../data/quantile";

// The frame. A band on the left holds the bell, opening leftward from the z
// axis; the plot proper runs from the z axis to the right edge.
const W = 760;
const H = 430;
const TOP = 26;
const AXIS_Y = H - 46;
const PLOT_H = AXIS_Y - TOP;
const AX = 150;
const RIGHT = W - 16;
/** Pixels per unit of density, so the bell's peak reaches most of the band. */
const BELL = 250;
const ZLAB_X = 42;

const CUSTOM = presets.length;
/** Something to watch before anyone has typed: twenty dart throws, in cm. */
const SAMPLE = [4, 12, 7, 3, 19, 8, 6, 25, 11, 5, 9, 2, 14, 7, 31, 10, 6, 13, 8, 4];

const SPEEDS = { slow: 1500, normal: 700, fast: 250 } as const;
type Speed = keyof typeof SPEEDS;

const minus = (s: string) => s.replace(/-/g, "−");
const f2 = (v: number) => minus(v.toFixed(2));
const f3 = (v: number) => minus(v.toFixed(3));
const f4 = (v: number) => minus(v.toFixed(4));
const fx = (v: number) => minus(String(Math.round(v * 1000) / 1000));

/** Round ticks across a range, about `target` of them. */
function ticks(lo: number, hi: number, target = 7): number[] {
  const raw = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) {
    out.push(Math.round(t * 1e9) / 1e9);
  }
  return out;
}

/**
 * The construction as a list of steps. Two to sort the data, one for the
 * curve, one per rank for its tail, one per rank for its dot, one for the
 * line. The picture at any step is a function of the step number alone, so
 * stepping back is the same drawing with less on it.
 */
type Step =
  | { kind: "data" }
  | { kind: "sort" }
  | { kind: "curve" }
  | { kind: "tail"; i: number }
  | { kind: "dot"; i: number }
  | { kind: "line" };

function buildSteps(n: number): Step[] {
  const out: Step[] = [{ kind: "data" }, { kind: "sort" }, { kind: "curve" }];
  for (let i = 1; i <= n; i++) out.push({ kind: "tail", i });
  for (let i = 1; i <= n; i++) out.push({ kind: "dot", i });
  out.push({ kind: "line" });
  return out;
}

export function Quantile() {
  const [dsIndex, setDsIndex] = useState(0);
  const [customValues, setCustomValues] = useState<number[]>(SAMPLE);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [dataUnits, setDataUnits] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const values = dsIndex === CUSTOM ? customValues : presets[dsIndex].values;
  const q = useMemo(() => quantiles(values), [values]);
  const steps = useMemo(() => buildSteps(q.n), [q.n]);
  const last = steps.length - 1;
  const at = Math.min(step, last);
  const cur = steps[at];

  // Playing past the last step is just standing on it.
  const running = playing && at < last;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setStep((s) => Math.min(s + 1, last)), SPEEDS[speed]);
    return () => clearTimeout(t);
  }, [running, last, at, speed]);

  function restart() {
    setStep(0);
    setPicked(null);
    setPlaying(true);
  }
  function pickDataset(i: number) {
    setDsIndex(i);
    restart();
  }
  function commitValues(v: number[]) {
    setCustomValues(v);
    restart();
  }
  function go(s: number) {
    setStep(Math.max(0, Math.min(last, s)));
    setPicked(null);
    setPlaying(false);
  }
  function togglePlay() {
    if (at >= last) {
      setStep(0);
      setPicked(null);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }

  // What the step number says is on the screen.
  const showRanks = at >= 1;
  const showCurve = at >= 2;
  const tailsDone = cur.kind === "tail" ? cur.i : at > 2 ? q.n : 0;
  const dotsDone = cur.kind === "dot" ? cur.i : cur.kind === "line" ? q.n : 0;
  const showLine = cur.kind === "line";
  // The rank with the spotlight: the one being built, or the one clicked.
  const focus =
    picked !== null ? picked : cur.kind === "tail" || cur.kind === "dot" ? cur.i : null;
  const fr = focus !== null ? q.ranks[focus - 1] : null;

  // Scales. z runs a little past the outermost score; x past the data.
  const z1 = Math.abs(q.ranks[0].z);
  const zLim = Math.max(2, Math.ceil((z1 + 0.5) * 2) / 2);
  const yAt = (z: number) => AXIS_Y - (PLOT_H * (z + zLim)) / (2 * zLim);
  let xLo = Math.min(...values);
  let xHi = Math.max(...values);
  if (xHi - xLo === 0) {
    xLo -= 1;
    xHi += 1;
  }
  const xPad = 0.07 * (xHi - xLo);
  xLo -= xPad;
  xHi += xPad;
  const xAt = (v: number) => AX + ((RIGHT - AX) * (v - xLo)) / (xHi - xLo);
  const bellX = (z: number) => AX - BELL * normalPdf(z);

  // The bell, and the tail under it up to the focused z.
  const zs: number[] = [];
  for (let z = -zLim; z <= zLim + 1e-9; z += 0.05) zs.push(z);
  const bellPath = zs.map((z, k) => `${k ? "L" : "M"}${bellX(z).toFixed(1)},${yAt(z).toFixed(1)}`).join(" ");
  const tailPath = fr
    ? "M" + AX + "," + yAt(-zLim).toFixed(1) + " " +
      zs.filter((z) => z <= fr.z).map((z) => `L${bellX(z).toFixed(1)},${yAt(z).toFixed(1)}`).join(" ") +
      ` L${bellX(fr.z).toFixed(1)},${yAt(fr.z).toFixed(1)} L${AX},${yAt(fr.z).toFixed(1)} Z`
    : "";

  // Tied values stack upward from the axis, so every dot stays visible.
  const levels: number[] = [];
  q.ranks.forEach((r, k) => {
    levels.push(k > 0 && q.ranks[k - 1].x === r.x ? levels[k - 1] + 1 : 0);
  });
  const dotY = (k: number) => AXIS_Y - 6 - levels[k] * 10;
  const labelRanks = showRanks && q.n <= 30;

  // The reference line: least squares of z on x, or y = x on the relabelled axis.
  const xMin = Math.min(...values);
  const xMax = Math.max(...values);
  const zOf = (x: number) => (x - q.xbar) / q.s;
  const line = showLine && q.line
    ? dataUnits
      ? { x1: xAt(xMin), y1: yAt(zOf(xMin)), x2: xAt(xMax), y2: yAt(zOf(xMax)) }
      : {
          x1: xAt(xMin), y1: yAt(q.line.intercept + q.line.slope * xMin),
          x2: xAt(xMax), y2: yAt(q.line.intercept + q.line.slope * xMax),
        }
    : null;

  const zTicks = ticks(-zLim, zLim, 6).filter((t) => Math.abs(t) <= zLim);
  const yLabel = (z: number) => (dataUnits ? minus((q.xbar + q.s * z).toFixed(1)) : f2(z).replace(/\.00$/, ""));

  // One sentence per step, under the chart.
  function caption(): string {
    const n = q.n;
    switch (cur.kind) {
      case "data":
        return `${n} values on a number line, in the order they were typed.`;
      case "sort":
        return `Sorted. The smallest is rank 1, the largest is rank ${n}.`;
      case "curve":
        return "A standard normal curve stands along the vertical axis. Its area is 1.";
      case "tail": {
        const r = q.ranks[cur.i - 1];
        return `Rank ${cur.i} of ${n}. The left tail with area (${cur.i} − 3/8) / (${n} + 1/4) = ${f3(r.p)} ends at z = ${f2(r.z)}.`;
      }
      case "dot": {
        const r = q.ranks[cur.i - 1];
        return `Rank ${cur.i}: the value ${fx(r.x)} meets its z, ${f2(r.z)}. That is the dot.`;
      }
      case "line":
        return q.line
          ? dataUnits
            ? `All ${n} dots are placed. The axis now reads x̄ + s·z, so the line of a perfect fit is y = x.`
            : `All ${n} dots are placed. The least-squares line of z on the value: z = ${f4(q.line.intercept)} + ${f4(q.line.slope)}·x.`
          : `All ${n} dots are placed. Every value is the same, so there is no line to fit.`;
    }
  }

  const parse = (text: string): ParseResult<number[]> => {
    const p = parseList(text);
    if (!p.ok) return p;
    const n = p.values.length;
    return { ok: true, value: p.values, summary: `${n} ${n === 1 ? "value" : "values"} · up to ${MAX_N}` };
  };

  const ariaStep = `Step ${at + 1} of ${steps.length}`;

  return (
    <section className="case">
      <header className="case-head">
        <h1>Where each dot on a normal quantile plot comes from</h1>
        <p>
          Every value gets a z from the normal curve, by rank. The value goes
          across, its z goes up, and the dot sits where they meet. Watch it
          built one rank at a time.
        </p>
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">Data</span>
          <div className="segmented" role="group" aria-label="Choose a data set">
            {[...presets.map((p) => p.label), "Your data"].map((label, i) => (
              <button key={label} type="button" className={i === dsIndex ? "is-active" : ""}
                      aria-pressed={i === dsIndex} onClick={() => pickDataset(i)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="control-label">Play</span>
          <div className="segmented" role="group" aria-label="Step through the construction">
            <button type="button" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Step back">
              ◀
            </button>
            <button type="button" className={running ? "is-active" : ""} onClick={togglePlay}
                    aria-pressed={running} aria-label={running ? "Pause" : "Play"}>
              {running ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button type="button" onClick={() => go(at + 1)} disabled={at === last} aria-label="Step forward">
              ▶
            </button>
            <button type="button" onClick={() => go(last)} disabled={at === last}>
              Show all
            </button>
          </div>
        </div>

        <div className="control">
          <span className="control-label">Speed</span>
          <div className="segmented" role="group" aria-label="Choose the speed">
            {(Object.keys(SPEEDS) as Speed[]).map((s) => (
              <button key={s} type="button" className={speed === s ? "is-active" : ""}
                      aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <label className="toggle">
            <input type="checkbox" checked={dataUnits} onChange={(e) => setDataUnits(e.target.checked)} />
            Label the vertical axis in data units, x̄ + s·z
          </label>
        </div>
      </div>

      {dsIndex === CUSTOM && (
        <TextEntry
          id="quantile-values"
          className="values-text"
          label="Your values, separated by spaces, commas or line breaks"
          committed={serializeValues(customValues)}
          parse={parse}
          onCommit={commitValues}
        />
      )}

      <p className="blurb">
        {dsIndex === CUSTOM ? "typed in above" : presets[dsIndex].note} ·{" "}
        <strong>{q.n}</strong> values · {ariaStep}
      </p>

      <figure className="chart quantile">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Normal quantile plot under construction. ${ariaStep}.`}>
          {/* Grid and axes. The z axis and its labels come with the curve. */}
          {ticks(xLo, xHi).map((t) => (
            <g key={"x" + t}>
              <line className="grid" x1={xAt(t)} x2={xAt(t)} y1={TOP} y2={AXIS_Y} />
              <text className="xtick" x={xAt(t)} y={AXIS_Y + 16} textAnchor="middle">{fx(t)}</text>
            </g>
          ))}
          {showCurve && zTicks.map((t) => (
            <g key={"z" + t} className="fade-in">
              <line className="grid" x1={AX} x2={RIGHT} y1={yAt(t)} y2={yAt(t)} />
              <text className="ytick" x={ZLAB_X} y={yAt(t) + 4} textAnchor="end">{yLabel(t)}</text>
            </g>
          ))}
          <line className="axis" x1={AX} x2={RIGHT} y1={AXIS_Y} y2={AXIS_Y} />

          {showCurve && (
            <g className="fade-in">
              <line className="axis" x1={AX} x2={AX} y1={TOP} y2={AXIS_Y} />
              {fr && <path className="tail" d={tailPath} />}
              <path className="bell" d={bellPath} />
              <text className="axis-title" x={ZLAB_X} y={14} textAnchor="end">{dataUnits ? "x̄ + s·z" : "z"}</text>
            </g>
          )}

          {/* Blue ticks: one per rank once its tail has been shaded. */}
          {q.ranks.slice(0, tailsDone).map((r) => (
            <line key={"t" + r.i} className={"ztick" + (focus === r.i ? " is-focus" : "")}
                  x1={AX - 6} x2={AX + 6} y1={yAt(r.z)} y2={yAt(r.z)} />
          ))}

          {/* The focused rank's numbers, on the picture. */}
          {fr && showCurve && (
            <g className="fade-in">
              <text className="tail-label" x={AX - 10} y={Math.min(yAt(fr.z) - 8, AXIS_Y - 10)} textAnchor="end">
                area {f3(fr.p)}
              </text>
              <text className="z-label" x={AX + 10} y={yAt(fr.z) - 6}>z = {f2(fr.z)}</text>
            </g>
          )}

          {/* Guide lines for the focused rank, once its dot is placed. */}
          {fr && focus !== null && focus <= dotsDone && (
            <g className="guides">
              <line x1={xAt(fr.x)} x2={xAt(fr.x)} y1={AXIS_Y} y2={yAt(fr.z)} />
              <line x1={AX} x2={xAt(fr.x)} y1={yAt(fr.z)} y2={yAt(fr.z)} />
            </g>
          )}

          {line && <line className="fitline fade-in" {...line} />}

          {/* The data, as black dots on the axis. They are the black ticks. */}
          {q.ranks.map((r, k) => (
            <g key={"d" + r.typed} className={"datum" + (focus === r.i ? " is-focus" : "")}>
              <circle cx={xAt(r.x)} cy={dotY(k)} r={4} />
              {labelRanks && (
                <text className="rank-label fade-in" x={xAt(r.x) + 5} y={dotY(k) - 4}>{r.i}</text>
              )}
            </g>
          ))}

          {/* The plot itself, one dot per rank. Click one to light up its parts. */}
          {q.ranks.slice(0, dotsDone).map((r) => (
            <circle key={"p" + r.i} className={"qpoint" + (focus === r.i ? " is-focus" : "")}
                    cx={xAt(r.x)} cy={yAt(r.z)} r={5.5} role="button" tabIndex={0}
                    aria-label={`Rank ${r.i}: value ${fx(r.x)}, z ${f2(r.z)}`}
                    onClick={() => { setPlaying(false); setPicked(picked === r.i ? null : r.i); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlaying(false); setPicked(picked === r.i ? null : r.i); } }} />
          ))}

          <text className="axis-title" x={RIGHT} y={H - 6} textAnchor="end">value</text>
        </svg>

        <div className="readout" aria-live="polite">
          {picked !== null && fr ? (
            <span>
              Rank <strong>{fr.i}</strong> of {q.n}: value <strong>{fx(fr.x)}</strong>. Area ({fr.i} − 3/8) / ({q.n} + 1/4) ={" "}
              <strong>{f3(fr.p)}</strong>, so z = <strong>{f2(fr.z)}</strong>.
              {dataUnits ? <> On the relabelled axis that is {fx(q.xbar + q.s * fr.z)}.</> : null}
            </span>
          ) : (
            <span>{caption()}</span>
          )}
        </div>
      </figure>

      <dl className="stats">
        <div><dt>n</dt><dd>{q.n}</dd></div>
        <div><dt>Mean x̄</dt><dd>{fx(q.xbar)}</dd></div>
        <div><dt>SD s</dt><dd>{fx(q.s)}</dd></div>
        {q.line && showLine && !dataUnits && (
          <>
            <div><dt>Intercept</dt><dd>{f4(q.line.intercept)}</dd></div>
            <div><dt>Slope</dt><dd>{f4(q.line.slope)}</dd></div>
          </>
        )}
      </dl>

      {/* The list, typed order first, then sorted with ranks. The ranks here
          stand in for the labels on the picture when there are too many to read. */}
      <div className="raw">
        <p className="raw-head">
          {showRanks ? (
            <>All <strong>{q.n}</strong> values, sorted, with their ranks.</>
          ) : (
            <>All <strong>{q.n}</strong> values, as typed.</>
          )}
        </p>
        <p className="raw-values qlist">
          {(showRanks ? q.ranks : [...q.ranks].sort((a, b) => a.typed - b.typed)).map((r) => (
            <span key={r.typed} className={"qitem" + (showRanks && focus === r.i ? " is-focus" : "")}>
              {showRanks && <span className="qrank">{r.i}</span>}
              {fx(r.x)}
            </span>
          ))}
        </p>
      </div>

      <div className="panel-notes">
        <p>
          <strong>The area for rank i is (i − 3/8) / (n + 1/4).</strong> It is
          about the share of a normal population that falls below the i-th
          smallest of n draws, and it is the rule a TI-84 uses. Rank 1 of 15
          gets 0.041, the middle rank gets exactly 0.5, and the areas are
          symmetric, so the z values come in ± pairs.
        </p>
        <p>
          <strong>The data goes across and z goes up,</strong> the way a
          calculator draws it with the data axis set to X. The dots hug a line
          when each value sits about where the normal curve would put it.
          Where they bend away, the data has a longer or shorter tail than the
          curve.
        </p>
      </div>
    </section>
  );
}
