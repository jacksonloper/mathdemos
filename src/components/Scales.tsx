type Props = {
  /** Every value, smallest first. */
  sorted: number[];
  /** How many of them go on the left pan. The rest go on the right. */
  k: number;
  format: (v: number) => string;
};

const W = 720;
const H = 346;
const PAD = { left: 46, right: 46 };

const POST_X = W / 2;
const BEAM_Y = 74;
const BEAM_HALF = 176;
const BASE_Y = 236;
const CHAIN = 44;
const PAN_HALF = 62;

const STRIP_Y = 286;
const STRIP_H = 26;

/** As with the beam, the tilt is capped so the load stays readable. */
const MAX_TILT = 13;

export function Scales({ sorted, k, format }: Props) {
  const n = sorted.length;
  const left = k;
  const right = n - k;
  const even = n % 2 === 0;
  const level = left === right;

  // Right heavier tips clockwise, which in screen coordinates sends the right
  // end down. Counts alone decide this: a case holding a million dollars
  // weighs exactly what a case holding a penny weighs.
  const tilt = MAX_TILT * Math.tanh((2.2 * (right - left)) / n);
  const a = (tilt * Math.PI) / 180;
  const endL = { x: POST_X - BEAM_HALF * Math.cos(a), y: BEAM_Y - BEAM_HALF * Math.sin(a) };
  const endR = { x: POST_X + BEAM_HALF * Math.cos(a), y: BEAM_Y + BEAM_HALF * Math.sin(a) };

  const plotW = W - PAD.left - PAD.right;
  const stripX = (i: number) => PAD.left + (plotW * i) / n;

  // The boundary the split implies. With the pans level this is the median: the
  // midpoint of the two innermost values when n is even, and when n is odd the
  // pans cannot level at all, which is the whole reason the odd rule exists.
  const boundary =
    k > 0 && k < n ? (sorted[k - 1] + sorted[k]) / 2 : k === 0 ? sorted[0] : sorted[n - 1];

  function pan(end: { x: number; y: number }, count: number, label: string) {
    const top = end.y + CHAIN;
    const h = Math.max(2, (54 * count) / n);
    return (
      <g>
        <line className="chain" x1={end.x} x2={end.x - PAN_HALF + 8} y1={end.y} y2={top} />
        <line className="chain" x1={end.x} x2={end.x + PAN_HALF - 8} y1={end.y} y2={top} />
        <rect className={"pan-load" + (level ? " is-level" : "")}
              x={end.x - PAN_HALF + 16} y={top - h} width={2 * PAN_HALF - 32} height={h} rx={2} />
        <path className="pan"
              d={`M ${end.x - PAN_HALF} ${top} Q ${end.x} ${top + 17} ${end.x + PAN_HALF} ${top}`} />
        <text className="pan-count" x={end.x} y={top + 36} textAnchor="middle">
          {count}
        </text>
        <text className="pan-label" x={end.x} y={top + 51} textAnchor="middle">
          {label}
        </text>
      </g>
    );
  }

  return (
    <figure className="chart scales">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`A balance holding ${left} values on the left pan and ${right} on the right`}>
        <line className="post" x1={POST_X} x2={POST_X} y1={BEAM_Y} y2={BASE_Y} />
        <line className="fulcrum-base" x1={POST_X - 34} x2={POST_X + 34} y1={BASE_Y} y2={BASE_Y} />

        <line className={"beam" + (level ? " is-level" : "")}
              x1={endL.x} x2={endR.x} y1={endL.y} y2={endR.y} />
        <circle className="beam-pin" cx={POST_X} cy={BEAM_Y} r={4} />

        {pan(endL, left, "smallest")}
        {pan(endR, right, "largest")}

        {level ? (
          <text className="verdict" x={POST_X} y={26} textAnchor="middle">
            Level
          </text>
        ) : (
          <text className="tilt-hint" x={POST_X} y={26} textAnchor="middle">
            {right > left ? `${right - left} more on the right` : `${left - right} more on the left`}
          </text>
        )}

        {/* Every value in order, one tick each, coloured by the pan it is in.
            Rank order rather than value order: the median is a counting idea,
            and in rank space the divider splits exactly k from n - k. */}
        <g className="strip">
          {sorted.map((_, i) => (
            <rect key={i} x={stripX(i)} y={STRIP_Y} width={Math.max(1, plotW / n - 0.6)}
                  height={STRIP_H} className={i < k ? "is-left" : "is-right"} />
          ))}
          <line className="divider" x1={stripX(k)} x2={stripX(k)}
                y1={STRIP_Y - 7} y2={STRIP_Y + STRIP_H + 7} />
        </g>
        <text className="axis-title" x={PAD.left} y={STRIP_Y - 12}>
          every value in order, smallest to largest
        </text>
        <text className="strip-edge" x={stripX(k)} y={STRIP_Y + STRIP_H + 21} textAnchor="middle">
          {level && even ? format(boundary) : ""}
        </text>
      </svg>
    </figure>
  );
}
