type Props = {
  /** P(A), the length of A. A starts at 0. */
  a: number;
  /** P(B), the length of B. */
  b: number;
  /** P(A and B), the length of the overlap. Fixes where B starts. */
  both: number;
};

const W = 720;
const PAD = { left: 96, right: 60 };
const ROW_H = 26;
const ROW_GAP = 12;
const BAR_H = 16;
const TOP = 34;

/**
 * A one-dimensional Venn diagram. The sample space is the segment from 0 to 1.
 * A sits at the left, from 0 to P(A). B is placed so that it overlaps A by
 * exactly P(A and B): it runs from P(A) − P(A and B) to P(A) + P(B) − P(A and B).
 * Both ends stay inside the space whenever the overlap is a legal value, which
 * the sliders guarantee. Below the two events, the same line is coloured by
 * "A and B" and then by "A or B", so each probability is a length you can read
 * off the axis.
 */
export function EventLine({ a, b, both }: Props) {
  const plotW = W - PAD.left - PAD.right;
  const x = (p: number) => PAD.left + plotW * p;
  const bLo = a - both;
  const bHi = a + b - both;

  const rows = [
    { label: "A", from: 0, to: a, cls: "ev-a" },
    { label: "B", from: bLo, to: bHi, cls: "ev-b" },
    { label: "A and B", from: bLo, to: a, cls: "ev-both" },
    { label: "A or B", from: 0, to: bHi, cls: "ev-either" },
  ];
  const H = TOP + rows.length * (ROW_H + ROW_GAP) + 34;
  const axisY = TOP + rows.length * (ROW_H + ROW_GAP) + 4;
  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

  return (
    <figure className="chart eventline">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`Two events on the unit interval. A from 0 to ${a.toFixed(2)}, B from ${bLo.toFixed(2)} to ${bHi.toFixed(2)}.`}>
        <text className="fig-label" x={PAD.left} y={16}>The whole space has length 1</text>
        {/* Faint guide lines through every row at each tenth. */}
        {ticks.map((t) => (
          <line key={t} className="grid" x1={x(t)} x2={x(t)} y1={TOP - 6} y2={axisY} />
        ))}
        {rows.map((r, i) => {
          const y = TOP + i * (ROW_H + ROW_GAP) + (ROW_H - BAR_H) / 2;
          const len = Math.max(0, r.to - r.from);
          return (
            <g key={r.label} className={r.cls}>
              <text className="row-label" x={PAD.left - 12} y={y + BAR_H / 2 + 4}>{r.label}</text>
              {/* The full line, so an event is seen against the space it sits in. */}
              <rect className="space" x={x(0)} y={y} width={plotW} height={BAR_H} />
              {len > 0 ? (
                <rect className="event" x={x(r.from)} y={y} width={plotW * len} height={BAR_H} />
              ) : null}
              <text className="row-value" x={W - 6} y={y + BAR_H / 2 + 4}>{len.toFixed(2)}</text>
            </g>
          );
        })}
        <line className="axis" x1={x(0)} x2={x(1)} y1={axisY} y2={axisY} />
        {ticks.map((t) => (
          <g key={t}>
            <line className="axis" x1={x(t)} x2={x(t)} y1={axisY} y2={axisY + 5} />
            <text className="xtick" x={x(t)} y={axisY + 18} textAnchor="middle">{t.toFixed(1)}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
