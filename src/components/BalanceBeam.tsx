import type { Bin } from "../data/datasets";

type Props = {
  /** The load, drawn as bars standing on the beam. */
  bins: Bin[];
  /** Where the fulcrum sits, in data units. */
  pivot: number;
  /** The balance point. The beam is level exactly here. */
  mean: number;
  total: number;
  format: (v: number) => string;
  units: string;
};

const W = 720;
const H = 300;
const PAD = { left: 46, right: 46 };

const BEAM_TOP = 168;
const BEAM_H = 9;
const BAR_MAX = 86;
const AXIS_Y = 250;

/**
 * The beam never tips further than this. A real beam would swing to the stop,
 * which tells you nothing except which side is heavier; capping the angle keeps
 * the load readable and lets the picture say *how far* from balance you are.
 */
const MAX_TILT = 8;

export function BalanceBeam({ bins, pivot, mean, total, format, units }: Props) {
  const lo = bins.length ? bins[0].lo : 0;
  const hi = bins.length ? bins[bins.length - 1].hi : 1;
  const plotW = W - PAD.left - PAD.right;
  const xAt = (v: number) => PAD.left + (plotW * (v - lo)) / (hi - lo);
  const peak = Math.max(1, ...bins.map((b) => b.count));
  const bw = bins.length ? plotW / bins.length : plotW;

  // Torque about the fulcrum is the sum of (value - pivot) over every
  // observation, which is n * (mean - pivot). So the beam is level exactly at
  // the mean, and nowhere else. tanh saturates smoothly instead of clipping.
  const off = (mean - pivot) / ((hi - lo) / 2);
  const tilt = MAX_TILT * Math.tanh(2.6 * off);
  const level = Math.abs(mean - pivot) < (hi - lo) * 0.0025;

  const fx = xAt(pivot);
  const fy = BEAM_TOP + BEAM_H / 2;

  // Round axis ticks: five or so across the range, on a 1/2/2.5/5 step.
  const raw = (hi - lo) / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(t);

  return (
    <figure className="chart balance">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`A beam loaded with ${total} values, resting on a pivot at ${format(pivot)}`}>
        <g transform={`rotate(${tilt} ${fx} ${fy})`}>
          {bins.map((b, i) =>
            b.count > 0 ? (
              <rect
                key={i}
                className="load"
                x={PAD.left + i * bw}
                y={BEAM_TOP - (BAR_MAX * b.count) / peak}
                width={bw}
                height={(BAR_MAX * b.count) / peak}
              />
            ) : null,
          )}
          <rect className={"beam" + (level ? " is-level" : "")}
                x={PAD.left - 6} y={BEAM_TOP} width={plotW + 12} height={BEAM_H} rx={2} />
        </g>

        {/* The fulcrum does not move with the beam: the beam pivots on it. */}
        <polygon className={"fulcrum" + (level ? " is-level" : "")}
                 points={`${fx},${BEAM_TOP + BEAM_H} ${fx - 15},${BEAM_TOP + BEAM_H + 30} ${fx + 15},${BEAM_TOP + BEAM_H + 30}`} />
        <line className="fulcrum-base" x1={fx - 24} x2={fx + 24}
              y1={BEAM_TOP + BEAM_H + 30} y2={BEAM_TOP + BEAM_H + 30} />

        <line className="axis" x1={PAD.left} x2={PAD.left + plotW} y1={AXIS_Y} y2={AXIS_Y} />
        {ticks.map((t) => (
          <g key={t}>
            <line className="axis" x1={xAt(t)} x2={xAt(t)} y1={AXIS_Y} y2={AXIS_Y + 4} />
            <text className="xtick" x={xAt(t)} y={AXIS_Y + 17} textAnchor="middle">
              {format(t)}
            </text>
          </g>
        ))}
        <line className="pivot-drop" x1={fx} x2={fx} y1={BEAM_TOP + BEAM_H + 30} y2={AXIS_Y} />
        <text className="axis-title" x={PAD.left + plotW} y={H - 6} textAnchor="end">
          {units}
        </text>

        {level ? (
          <text className="verdict" x={fx} y={40} textAnchor="middle">
            Balanced
          </text>
        ) : (
          <text className="tilt-hint" x={fx} y={40} textAnchor="middle">
            {mean > pivot ? "the right side is heavier" : "the left side is heavier"}
          </text>
        )}
      </svg>
    </figure>
  );
}
