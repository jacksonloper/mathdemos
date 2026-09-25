import { useState } from "react";
import type { Fit, Pair } from "../data/bivariate";
import { H, PAD, W } from "./frame";

type Props = {
  pairs: Pair[];
  fit: Fit | null;
  xlab: string;
  ylab: string;
};

/** Round ticks across a range, about `target` of them. */
function ticks(lo: number, hi: number, target = 6): number[] {
  const raw = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) {
    out.push(Math.round(t * 1e9) / 1e9);
  }
  return out;
}

/** The data's range with a little room, or a unit around a single value. */
function span(vals: number[]): [number, number] {
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo === 0) {
    lo -= 1;
    hi += 1;
  }
  const pad = 0.06 * (hi - lo);
  return [lo - pad, hi + pad];
}

const fmt = (v: number) => String(Math.round(v * 1000) / 1000).replace("-", "−");

export function Scatter({ pairs, fit, xlab, ylab }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const left = PAD.left + 12;
  const empty = pairs.length === 0;
  const [xLo, xHi] = empty ? [0, 10] : span(pairs.map((p) => p.x));
  const [yLo, yHi] = empty ? [0, 10] : span(pairs.map((p) => p.y));
  const xAt = (v: number) => left + ((plotW - 12) * (v - xLo)) / (xHi - xLo);
  const yAt = (v: number) => PAD.top + plotH - (plotH * (v - yLo)) / (yHi - yLo);

  // The line runs over the data's own x range and no further. Past it the
  // line is a guess about values nobody measured.
  let line: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (fit && Number.isFinite(fit.slope)) {
    const xs = pairs.map((p) => p.x);
    const a = Math.min(...xs);
    const b = Math.max(...xs);
    line = {
      x1: xAt(a), y1: yAt(fit.intercept + fit.slope * a),
      x2: xAt(b), y2: yAt(fit.intercept + fit.slope * b),
    };
  }

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Scatter plot of ${pairs.length} points${line ? " with the least-squares line" : ""}`}>
        {ticks(yLo, yHi).map((t) => (
          <g key={"y" + t}>
            <line className="grid" x1={left} x2={left + plotW - 12} y1={yAt(t)} y2={yAt(t)} />
            <text className="ytick" x={left - 8} y={yAt(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {ticks(xLo, xHi).map((t) => (
          <g key={"x" + t}>
            <line className="grid" x1={xAt(t)} x2={xAt(t)} y1={PAD.top} y2={PAD.top + plotH} />
            <text className="xtick" x={xAt(t)} y={PAD.top + plotH + 16} textAnchor="middle">{fmt(t)}</text>
          </g>
        ))}
        <line className="axis" x1={left} x2={left + plotW - 12} y1={PAD.top + plotH} y2={PAD.top + plotH} />
        <line className="axis" x1={left} x2={left} y1={PAD.top} y2={PAD.top + plotH} />

        {line && <line className="fitline" {...line} />}

        {pairs.map((p, i) => (
          <circle key={i} className={"point" + (hover === i ? " is-hover" : "")}
                  cx={xAt(p.x)} cy={yAt(p.y)} r={5}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}

        <text className="axis-title" x={left} y={14}>{ylab}</text>
        <text className="axis-title" x={left + plotW - 12} y={H - 6} textAnchor="end">{xlab}</text>
      </svg>

      <div className="readout" aria-live="polite">
        {hover === null ? (
          <span className="readout-idle">Hover a point to read it.</span>
        ) : (
          <span>
            Row {hover + 1}: {xlab} <strong>{fmt(pairs[hover].x)}</strong>, {ylab}{" "}
            <strong>{fmt(pairs[hover].y)}</strong>
            {line && fit ? (
              <>
                . The line predicts{" "}
                <strong>{fmt(fit.intercept + fit.slope * pairs[hover].x)}</strong>, a miss of{" "}
                <strong>{fmt(pairs[hover].y - (fit.intercept + fit.slope * pairs[hover].x))}</strong>.
              </>
            ) : null}
          </span>
        )}
      </div>
    </figure>
  );
}
