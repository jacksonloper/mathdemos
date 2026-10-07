import { useState } from "react";
import { EventLine } from "../components/EventLine";

/**
 * Two events on a line. The sample space is the unit interval, so every
 * probability is a length, and the Venn diagram is one dimensional: A is a
 * stretch of the line, B is a stretch of the line, and where they overlap is
 * "A and B".
 *
 * Four sliders for four probabilities with one equation between them,
 *
 *     P(A or B) = P(A) + P(B) - P(A and B),
 *
 * so there are three degrees of freedom and moving any slider has to move
 * another. The rule: P(A) and P(B) are the sizes and are never changed by
 * another slider. P(A and B) and P(A or B) trade off against each other: move
 * one and the other follows; move a size and the overlap keeps its value if it
 * still can, else it is clamped to the nearest value that fits.
 */

/** Slider resolution. Hundredths, which is what the course writes. */
const STEP = 0.01;

type State = { a: number; b: number; both: number };

/** P(A and B) can be no larger than the smaller event, and no smaller than the
 *  amount the two events are forced to overlap when they do not fit side by
 *  side in the space. */
function bothRange(a: number, b: number) {
  return { lo: Math.max(0, a + b - 1), hi: Math.min(a, b) };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/** Round to the slider step so the readouts never show 0.30000000000000004. */
function snap(v: number) {
  return Math.round(v / STEP) * STEP;
}

function fmt(v: number) {
  return snap(v).toFixed(2);
}

export function TwoEvents() {
  const [s, setS] = useState<State>({ a: 0.5, b: 0.4, both: 0.2 });
  const { a, b, both } = s;
  const either = snap(a + b - both);
  const range = bothRange(a, b);
  const eitherRange = { lo: snap(a + b - range.hi), hi: snap(a + b - range.lo) };

  function setA(v: number) {
    const r = bothRange(v, b);
    setS({ a: v, b, both: snap(clamp(both, r.lo, r.hi)) });
  }
  function setB(v: number) {
    const r = bothRange(a, v);
    setS({ a, b: v, both: snap(clamp(both, r.lo, r.hi)) });
  }
  function setBoth(v: number) {
    setS({ a, b, both: snap(clamp(v, range.lo, range.hi)) });
  }
  function setEither(v: number) {
    // The union slider is the overlap slider read backwards.
    setBoth(a + b - v);
  }

  const disjointOk = a + b <= 1 + 1e-9;
  const independent = snap(a * b);
  const isDisjoint = both < STEP / 2;
  const isNested = Math.abs(both - Math.min(a, b)) < STEP / 2;
  const isIndependent = Math.abs(both - independent) < STEP / 2;

  const onlyA = snap(a - both);
  const onlyB = snap(b - both);
  const neither = snap(1 - either);

  return (
    <section className="case">
      <header className="case-head">
        <h1>Two events on a line</h1>
        <p>
          The whole space is a line of length 1, so a probability is a length.
          Event A is a stretch of the line and so is B. Four sliders, four
          probabilities, and one equation tying them together, so you cannot move
          one without moving another.
        </p>
      </header>

      <div className="controls controls-stack">
        <ProbSlider id="pa" label="P(A)" value={a} onChange={setA} tone="a" />
        <ProbSlider id="pb" label="P(B)" value={b} onChange={setB} tone="b" />
        <ProbSlider id="pboth" label="P(A and B)" value={both} onChange={setBoth}
                    allowed={range} tone="both" />
        <ProbSlider id="peither" label="P(A or B)" value={either} onChange={setEither}
                    allowed={eitherRange} tone="either" />
      </div>

      <div className="controls controls-tight">
        <div className="control">
          <span className="control-label">Set the overlap</span>
          <div className="segmented" role="group" aria-label="Preset overlaps">
            <button type="button" className={isDisjoint ? "is-active" : ""} aria-pressed={isDisjoint}
                    disabled={!disjointOk}
                    title={disjointOk ? undefined : "P(A) + P(B) is more than 1, so A and B have to overlap."}
                    onClick={() => setBoth(0)}>
              Disjoint
            </button>
            <button type="button" className={isIndependent ? "is-active" : ""} aria-pressed={isIndependent}
                    onClick={() => setBoth(independent)}>
              Independent
            </button>
            <button type="button" className={isNested ? "is-active" : ""} aria-pressed={isNested}
                    onClick={() => setBoth(Math.min(a, b))}>
              One inside the other
            </button>
          </div>
        </div>
      </div>

      <EventLine a={a} b={b} both={both} />

      <p className="equation" aria-live="polite">
        P(A or B) = P(A) + P(B) − P(A and B)
        <span className="equation-numbers">
          {fmt(either)} = {fmt(a)} + {fmt(b)} − {fmt(both)}
        </span>
      </p>

      <dl className="stats">
        <div><dt>A only</dt><dd>{fmt(onlyA)}</dd></div>
        <div><dt>Both</dt><dd>{fmt(both)}</dd></div>
        <div><dt>B only</dt><dd>{fmt(onlyB)}</dd></div>
        <div><dt>Neither</dt><dd>{fmt(neither)}</dd></div>
      </dl>

      <div className="panel-notes">
        <p>
          <strong>Why the subtraction.</strong> Lay A's length and B's length end
          to end and you have counted the overlap twice. Take it off once and the
          total is the length of the line that A or B covers.
        </p>
        <p>
          <strong>Why the sliders fight.</strong> The overlap cannot be longer
          than the shorter event, so P(A and B) tops out at the smaller of P(A)
          and P(B). And if P(A) + P(B) is more than 1, the two stretches cannot
          fit side by side, so some overlap is forced: at least P(A) + P(B) − 1.
          The grey bar under a slider marks the values that fit.
        </p>
        <p>
          <strong>Disjoint</strong> means no overlap, and then the subtraction
          vanishes: P(A or B) = P(A) + P(B). <strong>Independent</strong> means
          the overlap is exactly P(A) × P(B), which is what you get if B is
          spread through A at the same rate as it is spread through the whole
          line. On the line that looks like nothing special, which is the point:
          independence is a number, not a picture.
        </p>
      </div>
    </section>
  );
}

type SliderProps = {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** The values this slider can take right now. Drawn as a band on the track. */
  allowed?: { lo: number; hi: number };
  tone: "a" | "b" | "both" | "either";
};

function ProbSlider({ id, label, value, onChange, allowed, tone }: SliderProps) {
  const lo = allowed?.lo ?? 0;
  const hi = allowed?.hi ?? 1;
  return (
    <div className="control">
      <label className="control-label" htmlFor={id}>{label}</label>
      <div className="slider-row">
        <div className={`track-wrap tone-${tone}`}>
          {allowed ? (
            <span className="allowed" aria-hidden="true"
                  style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
          ) : null}
          <input id={id} type="range" min={0} max={1} step={STEP} value={value}
                 aria-valuetext={fmt(value)}
                 onChange={(e) => onChange(Number(e.target.value))} />
        </div>
        <output className="slider-value" htmlFor={id}>{fmt(value)}</output>
      </div>
    </div>
  );
}
