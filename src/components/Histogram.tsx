import { useId, useState } from "react";
import type { Bin } from "../data/datasets";
import { H, PAD, W } from "./frame";

export type Mode = "frequency" | "relative" | "density";

type Props = {
  bins: Bin[];
  /** How a value is written. Datasets differ: 68, 0.275, $750. */
  format: (v: number) => string;
  units: string;
  /** Singular form of the units, for "proportion per inch". */
  unit?: string;
  total: number;
  /**
   * What the vertical axis measures. Frequency is a count; relative is a
   * proportion; density is proportion per unit of width, so that a bar's
   * AREA is its proportion and the bars can be joined into a curve.
   */
  mode: Mode;
  /**
   * The top of the vertical axis, when it is to be held fixed across class
   * widths. Left out, the axis fits the tallest bar.
   */
  yTop?: number;
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

export function Histogram({ bins, format, units, unit, total, mode, yTop, domain }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const relative = mode !== "frequency";
  const width = bins.length ? bins[0].hi - bins[0].lo : 1;
  const heightsOf = (b: Bin) =>
    mode === "frequency" ? b.count : mode === "relative" ? b.count / total : b.count / total / width;
  const peak = yTop ?? Math.max(...bins.map(heightsOf), relative ? 0.0001 : 1);
  const ticks = ticksFor(peak, relative);
  const yMax = ticks[ticks.length - 1];

  // The frequency polygon: the top of each bar at its midpoint, joined by
  // straight lines and run down to zero at the midpoints of the empty classes
  // on either side. Each piece between two midpoints is a trapezoid with the
  // same area as the half-bars it replaces, so the polygon's total area is
  // exactly 1, like the density histogram's. No normalizing step is needed.
  const polygon = mode === "density" && bins.length
    ? [
        { x: bins[0].lo - width / 2, y: 0 },
        ...bins.map((b) => ({ x: (b.lo + b.hi) / 2, y: heightsOf(b) })),
        { x: bins[bins.length - 1].hi + width / 2, y: 0 },
      ]
    : null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const [xLo, xHi] = domain;
  const xAt = (v: number) => PAD.left + (plotW * (v - xLo)) / (xHi - xLo);

  const fmt = format;
  const fmtY = (v: number) => (mode === "frequency" ? String(v) : v >= 1 || v === 0 ? String(Math.round(v * 100) / 100) : v.toFixed(v < 0.1 ? 3 : 2));
  const yAt = (v: number) => PAD.top + plotH - (plotH * v) / yMax;

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
                className={"bar" + (hover === i ? " is-hover" : "") + (polygon ? " is-under" : "")}
                x={xAt(b.lo)}
                y={PAD.top + plotH - h}
                width={xAt(b.hi) - xAt(b.lo)}
                height={h}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
          {polygon ? (
            <>
              <polygon className="poly-fill"
                       points={polygon.map((p) => `${xAt(p.x)},${yAt(p.y)}`).join(" ")} />
              <polyline className="poly"
                        points={polygon.map((p) => `${xAt(p.x)},${yAt(p.y)}`).join(" ")} />
              {polygon.map((p, i) => (
                <circle key={i} className="poly-dot" cx={xAt(p.x)} cy={yAt(p.y)} r={2.5} />
              ))}
            </>
          ) : null}
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
          {mode === "frequency" ? "Frequency" : mode === "relative" ? "Relative frequency" : `Density: proportion per ${unit ?? "unit"}`}
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
            {mode === "density" ? (
              <>
                {" "}Bar height{" "}
                <strong>{(bins[hover].count / total / width).toFixed(3)}</strong> per unit, times
                width {format(width)}, is that proportion.
              </>
            ) : null}
          </span>
        )}
      </div>
    </figure>
  );
}
