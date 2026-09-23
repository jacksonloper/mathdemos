import { useState, type ReactNode } from "react";
import type { Summary } from "../data/datasets";
import { H, PAD, W } from "./frame";

type Props = {
  summary: Summary;
  /** How a position on the axis is written. */
  format: (v: number) => string;
  /** How a computed statistic is written, which needs more precision. */
  formatStat: (v: number) => string;
  units: string;
  /** The same x range the histogram uses for this dataset. */
  domain: [number, number];
};

type Part = "lo" | "boxLo" | "boxHi" | "hi" | { outlier: number };

/**
 * Round ticks across the domain. A boxplot has no classes to put ticks on.
 * No step of 2.5: on whole-number data it labels 2.5 as "3".
 */
function valueTicks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) {
    out.push(Math.round(t * 1e6) / 1e6);
  }
  return out;
}

export function Boxplot({ summary: s, format, formatStat, units, domain }: Props) {
  const [hover, setHover] = useState<Part | null>(null);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const [xLo, xHi] = domain;
  const xAt = (v: number) => PAD.left + (plotW * (v - xLo)) / (xHi - xLo);
  const inDomain = (v: number) => v >= xLo && v <= xHi;

  const cy = PAD.top + plotH * 0.55;
  const half = 40;
  const is = (p: Part) =>
    hover !== null &&
    (typeof p === "string" ? hover === p : typeof hover === "object" && hover.outlier === p.outlier);

  // Name the three lines of the box, median first. A label that would overlap
  // one already placed is dropped: the briefcase prizes put Q1 and the median a
  // pixel apart, and the stats row carries every value anyway.
  const labelW = (name: string) => name.length * 6.5;
  const labels: { v: number; name: string }[] = [];
  for (const l of [
    { v: s.median, name: "Median" },
    { v: s.q1, name: "Q1" },
    { v: s.q3, name: "Q3" },
  ]) {
    const clear = labels.every(
      (p) => Math.abs(xAt(p.v) - xAt(l.v)) >= (labelW(p.name) + labelW(l.name)) / 2 + 8,
    );
    if (clear) labels.push(l);
  }

  const hit = (part: Part) => ({
    onMouseEnter: () => setHover(part),
    onMouseLeave: () => setHover(null),
  });

  let readout: ReactNode = (
    <span className="readout-idle">Hover the box, a whisker, or an outlier to read it.</span>
  );
  if (hover === "lo") {
    readout = (
      <span>
        The left whisker runs from <strong>{formatStat(s.whiskerLo)}</strong> to{" "}
        <strong>Q1 = {formatStat(s.q1)}</strong>: about the lowest quarter of the
        values{s.outliers.some((v) => v < s.q1) ? ", apart from the outliers" : ""}.
      </span>
    );
  } else if (hover === "boxLo") {
    readout = (
      <span>
        From <strong>Q1 = {formatStat(s.q1)}</strong> to the{" "}
        <strong>median, {formatStat(s.median)}</strong>: about a quarter of the values.
      </span>
    );
  } else if (hover === "boxHi") {
    readout = (
      <span>
        From the <strong>median, {formatStat(s.median)}</strong>, to{" "}
        <strong>Q3 = {formatStat(s.q3)}</strong>: about a quarter of the values.
      </span>
    );
  } else if (hover === "hi") {
    readout = (
      <span>
        The right whisker runs from <strong>Q3 = {formatStat(s.q3)}</strong> to{" "}
        <strong>{formatStat(s.whiskerHi)}</strong>: about the highest quarter of the
        values{s.outliers.some((v) => v > s.q3) ? ", apart from the outliers" : ""}.
      </span>
    );
  } else if (hover !== null) {
    const v = hover.outlier;
    const high = v > s.upperFence;
    readout = (
      <span>
        <strong>{formatStat(v)}</strong> is an outlier. It is{" "}
        {high ? "above the upper" : "below the lower"} fence,{" "}
        {high ? "Q3 + 1.5 IQR" : "Q1 − 1.5 IQR"} ={" "}
        <strong>{formatStat(high ? s.upperFence : s.lowerFence)}</strong>.
      </span>
    );
  }

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Boxplot. Minimum ${formatStat(s.min)}, Q1 ${formatStat(s.q1)}, median ${formatStat(s.median)}, Q3 ${formatStat(s.q3)}, maximum ${formatStat(s.max)}, ${s.outliers.length} outliers.`}>

        {/* The fences are where "outlier" starts. Drawn only when they fall on
            the axis; the briefcase prizes put the lower one below zero. */}
        {[
          { v: s.lowerFence, name: "lower fence" },
          { v: s.upperFence, name: "upper fence" },
        ].map((f) =>
          inDomain(f.v) ? (
            <g key={f.name}>
              <line className="fence" x1={xAt(f.v)} x2={xAt(f.v)}
                    y1={PAD.top + 14} y2={PAD.top + plotH} />
              <text className="fence-label" x={xAt(f.v)} y={PAD.top + 6}
                    textAnchor="middle">
                {f.name}
              </text>
            </g>
          ) : null,
        )}

        {/* Whiskers first, so the box sits over their ends. */}
        <g className={"whisker" + (is("lo") ? " is-hover" : "")}>
          <line x1={xAt(s.whiskerLo)} x2={xAt(s.q1)} y1={cy} y2={cy} />
          <line x1={xAt(s.whiskerLo)} x2={xAt(s.whiskerLo)} y1={cy - 14} y2={cy + 14} />
        </g>
        <g className={"whisker" + (is("hi") ? " is-hover" : "")}>
          <line x1={xAt(s.q3)} x2={xAt(s.whiskerHi)} y1={cy} y2={cy} />
          <line x1={xAt(s.whiskerHi)} x2={xAt(s.whiskerHi)} y1={cy - 14} y2={cy + 14} />
        </g>

        {/* Two halves, so hovering one says which quarter it is. */}
        <rect className={"box-half" + (is("boxLo") ? " is-hover" : "")}
              x={xAt(s.q1)} y={cy - half} width={xAt(s.median) - xAt(s.q1)} height={2 * half} />
        <rect className={"box-half" + (is("boxHi") ? " is-hover" : "")}
              x={xAt(s.median)} y={cy - half} width={xAt(s.q3) - xAt(s.median)} height={2 * half} />
        <line className="median-line" x1={xAt(s.median)} x2={xAt(s.median)}
              y1={cy - half} y2={cy + half} />

        {s.outliers.map((v, i) => (
          <circle key={i} className={"outlier" + (is({ outlier: v }) ? " is-hover" : "")}
                  cx={xAt(v)} cy={cy} r={4.5} />
        ))}

        {labels.map((l) => (
          <text key={l.name} className="box-label" x={xAt(l.v)} y={cy - half - 10}
                textAnchor="middle">
            {l.name}
          </text>
        ))}

        {/* Hit areas, bigger than the marks and drawn last so they catch the
            pointer. Each spans the full height of the box. */}
        <g className="hit">
          <rect x={xAt(s.whiskerLo) - 6} y={cy - half} width={xAt(s.q1) - xAt(s.whiskerLo) + 6}
                height={2 * half} {...hit("lo")} />
          <rect x={xAt(s.q1)} y={cy - half} width={xAt(s.median) - xAt(s.q1)}
                height={2 * half} {...hit("boxLo")} />
          <rect x={xAt(s.median)} y={cy - half} width={xAt(s.q3) - xAt(s.median)}
                height={2 * half} {...hit("boxHi")} />
          <rect x={xAt(s.q3)} y={cy - half} width={xAt(s.whiskerHi) - xAt(s.q3) + 6}
                height={2 * half} {...hit("hi")} />
          {s.outliers.map((v, i) => (
            <circle key={i} cx={xAt(v)} cy={cy} r={10} {...hit({ outlier: v })} />
          ))}
        </g>

        <line className="axis" x1={PAD.left} x2={PAD.left + plotW}
              y1={PAD.top + plotH} y2={PAD.top + plotH} />
        {valueTicks(xLo, xHi).map((t) => (
          <text key={t} className="xtick" x={xAt(t)} y={PAD.top + plotH + 16}
                textAnchor="middle">
            {format(t)}
          </text>
        ))}
        <text className="axis-title" x={PAD.left + plotW} y={H - 6} textAnchor="end">
          {units}
        </text>
      </svg>

      <div className="readout" aria-live="polite">{readout}</div>
    </figure>
  );
}
