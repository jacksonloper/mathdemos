import type { SplitBin } from "../data/datasets";

type Props = {
  /** The load, drawn as bars standing on the beam. */
  bins: SplitBin[];
  /** Where the fulcrum sits, in data units. Also the colour split. */
  split: number;
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

export function BalanceBeam({ bins, split, mean, total, format, units }: Props) {
  const lo = bins.length ? bins[0].lo : 0;
  const hi = bins.length ? bins[bins.length - 1].hi : 1;
  const plotW = W - PAD.left - PAD.right;
  const xAt = (v: number) => PAD.left + (plotW * (v - lo)) / (hi - lo);
  const peak = Math.max(1, ...bins.map((b) => b.count));
  const hAt = (c: number) => (BAR_MAX * c) / peak;

  // Torque about the fulcrum is the sum of (value - split) over every
  // observation, which is n * (mean - split). So the beam is level exactly at
  // the mean, and nowhere else. A value sitting on the pivot contributes zero,
  // which is why it is drawn there rather than on a side. tanh saturates
  // smoothly instead of clipping.
  const off = (mean - split) / ((hi - lo) / 2);
  const tilt = MAX_TILT * Math.tanh(2.6 * off);
  const level = Math.abs(mean - split) < (hi - lo) * 1e-6;

  const fx = xAt(split);
  const fy = BEAM_TOP + BEAM_H / 2;
  const hintX = Math.min(Math.max(fx, PAD.left + 70), W - PAD.right - 70);

  // Round axis ticks: five or so across the range, on a 1/2/2.5/5 step.
  const raw = (hi - lo) / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(t);

  return (
    <figure className="chart balance">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`A beam loaded with ${total} values, resting on a pivot at ${format(split)}`}>
        <g transform={`rotate(${tilt} ${fx} ${fy})`}>
          {/* Each class is stacked by COUNT: the part below the cut, the part
              standing on the pivot, the part above. Most classes are wholly one
              colour and read as a plain bar. Splitting by count rather than by
              where the pivot line crosses the class keeps these colours equal
              to the bars the pans and the pivot receive. */}
          {bins.map((b, i) => {
            if (b.count === 0) return null;
            const x0 = xAt(b.lo);
            const w = xAt(b.hi) - x0;
            const hb = hAt(b.left);
            const hm = hAt(b.mid);
            const ha = hAt(b.right);
            return (
              <g key={i}>
                {b.left > 0 ? (
                  <rect className="load is-below" x={x0} y={BEAM_TOP - hb} width={w} height={hb} />
                ) : null}
                {b.mid > 0 ? (
                  <rect className="load is-mid" x={x0} y={BEAM_TOP - hb - hm} width={w} height={hm} />
                ) : null}
                {b.right > 0 ? (
                  <rect className="load is-above" x={x0} y={BEAM_TOP - hb - hm - ha} width={w} height={ha} />
                ) : null}
              </g>
            );
          })}
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
        {/* The figure names itself, so the prose explaining both machines can
            sit below them both and the two pictures stay close enough together
            to watch at once. Inside the viewBox this costs no page height. */}
        <text className="fig-label" x={PAD.left} y={18}>
          The beam weighs distance
        </text>

        {/* Kept clear of both edges: the pivot can sit hard against either one. */}
        {level ? (
          <text className="verdict" x={hintX} y={40} textAnchor="middle">
            Balanced
          </text>
        ) : (
          <text className="tilt-hint" x={hintX} y={40} textAnchor="middle">
            {mean > split ? "the right side pulls harder" : "the left side pulls harder"}
          </text>
        )}
      </svg>
    </figure>
  );
}
