import { useId, useState } from "react";
import type { Bin } from "../data/datasets";
import { H, PAD, W } from "./frame";

type Props = {
  bins: Bin[];
  /** How a value is written. Datasets differ: 68, 0.275, $750. */
  format: (v: number) => string;
  units: string;
  total: number;
  /** Show proportions on the vertical axis instead of counts. */
  relative: boolean;
  /**
   * The x range to draw on. Fixed for a dataset across every class width, so
   * a value keeps its place on the screen while the binning changes around it.
   */
  domain: [number, number];
};


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

export function Histogram({ bins, format, units, total, relative, domain }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const heightsOf = (b: Bin) => (relative ? b.count / total : b.count);
  const peak = Math.max(...bins.map(heightsOf), relative ? 0.0001 : 1);
  const ticks = ticksFor(peak, relative);
  const yMax = ticks[ticks.length - 1];

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const [xLo, xHi] = domain;
  const xAt = (v: number) => PAD.left + (plotW * (v - xLo)) / (xHi - xLo);

  const fmt = format;
  const fmtY = (v: number) => (relative ? v.toFixed(2) : String(v));

  // Thin x labels so they never collide: show every k-th class edge.
  const every = Math.max(1, Math.ceil((bins.length + 1) / 14));

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
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
          {/* Placed by value, not by index, so the bars sit where the numbers
              say and the whole picture does not restretch when the width
              slider moves. */}
          {bins.map((b, i) => {
            const h = (plotH * heightsOf(b)) / yMax;
            return (
              <rect
                key={i}
                className={"bar" + (hover === i ? " is-hover" : "")}
                x={xAt(b.lo)}
                y={PAD.top + plotH - h}
                width={xAt(b.hi) - xAt(b.lo)}
                height={h}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>

        <line className="axis" x1={PAD.left} x2={PAD.left + plotW}
              y1={PAD.top + plotH} y2={PAD.top + plotH} />

        {/* The ticks are the class edges, which is what the labels along the
            bottom of a histogram are. They move as the classes change; the
            scale they sit on does not. */}
        {bins.map((b, i) =>
          i % every === 0 ? (
            <text key={i} className="xtick" x={xAt(b.lo)}
                  y={PAD.top + plotH + 16} textAnchor="middle">
              {fmt(b.lo)}
            </text>
          ) : null,
        )}
        {bins.length % every === 0 ? (
          <text className="xtick" x={xAt(bins[bins.length - 1].hi)}
                y={PAD.top + plotH + 16} textAnchor="middle">
            {fmt(bins[bins.length - 1].hi)}
          </text>
        ) : null}

        <text className="axis-title" x={PAD.left - 38} y={14}>
          {relative ? "Relative frequency" : "Frequency"}
        </text>
        <text className="axis-title" x={PAD.left + plotW} y={H - 6} textAnchor="end">
          {units}
        </text>

      </svg>

      <div className="readout" aria-live="polite">
        {hover === null ? (
          <span className="readout-idle">Hover a bar to read its class.</span>
        ) : (
          <span>
            <strong>{bins[hover].count}</strong>{" "}
            {bins[hover].count === 1 ? "value is" : "values are"}{" "}
            <strong>
              at least {fmt(bins[hover].lo)} and less than {fmt(bins[hover].hi)}
            </strong>
            , which is{" "}
            <strong>{((100 * bins[hover].count) / total).toFixed(1)}%</strong> of {total}.
          </span>
        )}
      </div>
    </figure>
  );
}
