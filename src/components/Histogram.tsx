import { useId, useState } from "react";
import type { Bin } from "../data/datasets";

type Props = {
  bins: Bin[];
  decimals: number;
  units: string;
  total: number;
  /** Show proportions on the vertical axis instead of counts. */
  relative: boolean;
  /** Every observation, drawn as a rug under the axis. */
  values?: number[];
};

const PAD = { top: 30, right: 14, bottom: 40, left: 46 };
const RUG_H = 38;

/** Deterministic 0..1 from an index, so the jitter does not dance on re-render. */
function jitter(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
const W = 720;
const H = 346;

/** A round number of ticks that covers `max` without crowding the axis. */
function ticksFor(max: number, relative: boolean): number[] {
  if (max <= 0) return [0];
  const target = 5;
  const raw = max / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let t = 0; t <= max + step * 1e-9; t += step) out.push(t);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return relative ? out.map((t) => Math.round(t * 1e6) / 1e6) : out;
}

export function Histogram({ bins, decimals, units, total, relative, values }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const heightsOf = (b: Bin) => (relative ? b.count / total : b.count);
  const peak = Math.max(...bins.map(heightsOf), relative ? 0.0001 : 1);
  const ticks = ticksFor(peak, relative);
  const yMax = ticks[ticks.length - 1];

  const rug = values ?? null;
  const svgH = H + (rug ? RUG_H : 0);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const xLo = bins.length ? bins[0].lo : 0;
  const xHi = bins.length ? bins[bins.length - 1].hi : 1;
  const xAt = (v: number) => PAD.left + (plotW * (v - xLo)) / (xHi - xLo);
  const bw = plotW / bins.length;

  const fmt = (v: number) => v.toFixed(decimals);
  const fmtY = (v: number) => (relative ? v.toFixed(2) : String(v));

  // Thin x labels so they never collide: show every k-th class edge.
  const every = Math.max(1, Math.ceil((bins.length + 1) / 14));

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${svgH}`} role="img"
           aria-label={`Histogram of ${bins.length} classes`}>
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {ticks.map((t) => {
          const y = PAD.top + plotH - (plotH * t) / yMax;
          return (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={PAD.left + plotW} y1={y} y2={y} />
              <text className="ytick" x={PAD.left - 8} y={y + 4} textAnchor="end">
                {fmtY(t)}
              </text>
            </g>
          );
        })}

        <g clipPath={`url(#${clipId})`}>
          {bins.map((b, i) => {
            const h = (plotH * heightsOf(b)) / yMax;
            return (
              <rect
                key={i}
                className={"bar" + (hover === i ? " is-hover" : "")}
                x={PAD.left + i * bw}
                y={PAD.top + plotH - h}
                width={bw}
                height={h}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>

        <line className="axis" x1={PAD.left} x2={PAD.left + plotW}
              y1={PAD.top + plotH} y2={PAD.top + plotH} />

        {bins.map((b, i) =>
          i % every === 0 ? (
            <text key={i} className="xtick" x={PAD.left + i * bw}
                  y={PAD.top + plotH + 16} textAnchor="middle">
              {fmt(b.lo)}
            </text>
          ) : null,
        )}
        {bins.length % every === 0 ? (
          <text className="xtick" x={PAD.left + plotW} y={PAD.top + plotH + 16}
                textAnchor="middle">
            {fmt(bins[bins.length - 1].hi)}
          </text>
        ) : null}

        <text className="axis-title" x={PAD.left - 38} y={14}>
          {relative ? "Relative frequency" : "Frequency"}
        </text>
        <text className="axis-title" x={PAD.left + plotW} y={H - 6} textAnchor="end">
          {units}
        </text>

        {rug ? (
          <g className="rug">
            <text className="axis-title" x={PAD.left - 38} y={H + 8}>
              Values
            </text>
            {/* Jittered vertically. These datasets are whole numbers with many
                repeats, so drawing one tick per value stacks them all on the
                same line and the strip reads as an evenly spaced ruler, which
                is the opposite of the truth. Spreading them lets density show. */}
            {rug.map((v, i) => (
              <circle key={i} cx={xAt(v)} cy={H + 6 + jitter(i) * (RUG_H - 16)} r={1.6} />
            ))}
          </g>
        ) : null}
      </svg>

      <div className="readout" aria-live="polite">
        {hover === null ? (
          <span className="readout-idle">Hover a bar to read its class.</span>
        ) : (
          <span>
            <strong>
              {fmt(bins[hover].lo)} to {fmt(bins[hover].hi)}
            </strong>{" "}
            holds <strong>{bins[hover].count}</strong>{" "}
            {bins[hover].count === 1 ? "value" : "values"}, which is{" "}
            <strong>{((100 * bins[hover].count) / total).toFixed(1)}%</strong> of {total}.
          </span>
        )}
      </div>
    </figure>
  );
}
