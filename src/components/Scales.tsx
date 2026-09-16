import type { SplitBin } from "../data/datasets";

type Props = {
  /** The same classes the beam is carrying, already dealt to the two sides. */
  bins: SplitBin[];
  leftPan: number;
  rightPan: number;
  /** Still standing on the pivot, belonging to neither pan. */
  middle: number;
  level: boolean;
  total: number;
};

const W = 720;
const H = 320;

const POST_X = W / 2;
const BEAM_Y = 96;
const BEAM_HALF = 196;
const BASE_Y = 300;
// The chain has to be longer than the tallest bar, or a full pan pokes up
// through the scale beam it is hanging from.
const PAN_BAR_MAX = 64;
const CHAIN = 78;
const PAN_HALF = 118;
/** Where a value that sits exactly on the cut stands: on the pivot itself. */
const SHELF_Y = 214;

/** As with the beam, the tilt is capped so the load stays readable. */
const MAX_TILT = 13;

export function Scales({ bins, leftPan, rightPan, middle, level, total }: Props) {
  // Counts alone decide this. A briefcase holding a million dollars weighs
  // exactly what a briefcase holding a penny weighs, which is the whole
  // difference between this machine and the beam.
  const tilt = MAX_TILT * Math.tanh((2.2 * (rightPan - leftPan)) / Math.max(1, total));
  const a = (tilt * Math.PI) / 180;
  const endL = { x: POST_X - BEAM_HALF * Math.cos(a), y: BEAM_Y - BEAM_HALF * Math.sin(a) };
  const endR = { x: POST_X + BEAM_HALF * Math.cos(a), y: BEAM_Y + BEAM_HALF * Math.sin(a) };

  const peak = Math.max(1, ...bins.map((b) => b.count));
  const panW = 2 * PAN_HALF - 16;
  const bw = panW / Math.max(1, bins.length);
  const hAt = (c: number) => (PAN_BAR_MAX * c) / peak;

  const lefts = bins.filter((b) => b.left > 0);
  const rights = bins.filter((b) => b.right > 0);
  const mids = bins.filter((b) => b.mid > 0);

  /**
   * The same bars, carried over. They keep their order and their width, and
   * each group is pushed up against the cut: the left group ends where the
   * knife went in, the right group starts there. Drag the split and a bar
   * leaves one pile and joins the other.
   */
  function pan(end: { x: number; y: number }, group: SplitBin[], side: "left" | "right", count: number) {
    const top = end.y + CHAIN;
    // Centred on the pan, the way a load settles in a bowl. Edge-aligning the
    // two groups so they face each other across the post reads well when both
    // pans are full, but leaves a single bar perched on the lip.
    const x0 = end.x - (group.length * bw) / 2;
    return (
      <g>
        <line className="chain" x1={end.x} x2={end.x - PAN_HALF + 8} y1={end.y} y2={top} />
        <line className="chain" x1={end.x} x2={end.x + PAN_HALF - 8} y1={end.y} y2={top} />
        {group.map((b, i) => {
          const c = side === "left" ? b.left : b.right;
          return (
            <rect key={`${b.lo}`} className={side === "left" ? "load is-below" : "load is-above"}
                  x={x0 + i * bw} y={top - hAt(c)} width={bw} height={hAt(c)} />
          );
        })}
        <path className="pan"
              d={`M ${end.x - PAN_HALF} ${top} Q ${end.x} ${top + 18} ${end.x + PAN_HALF} ${top}`} />
        <text className="pan-count" x={end.x} y={top + 40} textAnchor="middle">
          {count}
        </text>
        <text className="pan-label" x={end.x} y={top + 55} textAnchor="middle">
          {side === "left" ? "below the cut" : "above the cut"}
        </text>
      </g>
    );
  }

  return (
    <figure className="chart scales">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`A balance holding ${leftPan} values on the left pan and ${rightPan} on the right`}>
        <line className="post" x1={POST_X} x2={POST_X} y1={BEAM_Y} y2={BASE_Y} />
        <line className="fulcrum-base" x1={POST_X - 34} x2={POST_X + 34} y1={BASE_Y} y2={BASE_Y} />

        <line className={"beam" + (level ? " is-level" : "")}
              x1={endL.x} x2={endR.x} y1={endL.y} y2={endR.y} />
        <circle className="beam-pin" cx={POST_X} cy={BEAM_Y} r={4} />

        {pan(endL, lefts, "left", leftPan)}
        {pan(endR, rights, "right", rightPan)}

        {/* The extra spot. A value sitting exactly on the cut stands here,
            on the pivot itself, where it weighs on neither side. */}
        {middle > 0 ? (
          <g>
            <line className="pivot-shelf" x1={POST_X - 30} x2={POST_X + 30}
                  y1={SHELF_Y} y2={SHELF_Y} />
            {mids.map((b) => (
              <rect key={`${b.lo}`} className="load is-mid"
                    x={POST_X - bw / 2} y={SHELF_Y - hAt(b.mid)} width={bw} height={hAt(b.mid)} />
            ))}
            {/* The column runs behind this text, so it is masked out. */}
            <rect className="label-mask" x={POST_X - 36} y={SHELF_Y + 7}
                  width={72} height={36} />
            <text className="pan-count is-mid" x={POST_X} y={SHELF_Y + 24} textAnchor="middle">
              {middle}
            </text>
            <text className="pan-label" x={POST_X} y={SHELF_Y + 39} textAnchor="middle">
              on the pivot
            </text>
          </g>
        ) : null}

        {level ? (
          <text className="verdict" x={POST_X} y={30} textAnchor="middle">
            Level
          </text>
        ) : (
          <text className="tilt-hint" x={POST_X} y={30} textAnchor="middle">
            {rightPan > leftPan
              ? `${rightPan - leftPan} more above the cut`
              : `${leftPan - rightPan} more below the cut`}
          </text>
        )}
      </svg>
    </figure>
  );
}
