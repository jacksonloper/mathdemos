import { useMemo, useState } from "react";
import { BalanceBeam } from "../components/BalanceBeam";
import { Scales } from "../components/Scales";
import {
  datasets, formatCount, formatStat, formatValue, levellingSplit, mean, median,
  splitBins,
} from "../data/datasets";

/** Stops on the split slider. Fine enough to feel continuous. */
const STOPS = 700;

export function Balance() {
  const [dsIndex, setDsIndex] = useState(0);
  const ds = datasets[dsIndex];
  // The narrowest width this data offers, so the classes are fine enough to
  // hop one at a time rather than in great slabs.
  const width = ds.widths[0];

  const d = useMemo(() => {
    const sorted = [...ds.values].sort((a, b) => a - b);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const mu = mean(ds.values);
    // The slider sticks to the two answers and to every recorded value. Without
    // that the mean is unreachable, and so is any cut that splits a tied block.
    const magnets = [...new Set([...ds.values, mu, levellingSplit(ds.values, width, ds.origin)])]
      .sort((a, b) => a - b);
    return {
      sorted, lo, hi, mu, magnets,
      med: median(ds.values),
      even: levellingSplit(ds.values, width, ds.origin),
      step: (hi - lo) / STOPS,
    };
  }, [ds, width]);

  const [split, setSplit] = useState(() => d.lo + (d.hi - d.lo) * 0.3);

  function snap(raw: number) {
    const tol = (d.hi - d.lo) / 200;
    let best = raw;
    let gap = tol;
    for (const m of d.magnets) {
      const e = Math.abs(m - raw);
      if (e < gap) {
        gap = e;
        best = m;
      }
    }
    return best;
  }

  function pickDataset(i: number) {
    const ds2 = datasets[i];
    const s = [...ds2.values].sort((a, b) => a - b);
    setDsIndex(i);
    setSplit(s[0] + (s[s.length - 1] - s[0]) * 0.3);
  }

  const sp = useMemo(
    () => splitBins(ds.values, width, ds.origin, split),
    [ds, width, split],
  );

  const fmt = (v: number) => formatValue(ds, v);
  const stat = (v: number) => formatStat(ds, v);

  const n = ds.values.length;
  const belowMean = ds.values.filter((v) => v < d.mu).length;
  const beamLevel = Math.abs(d.mu - split) < (d.hi - d.lo) * 1e-6;
  const both = beamLevel && sp.level;

  return (
    <section className="case">
      <header className="case-head">
        <h1>Two middles, one cut</h1>
        <p>
          One slider cuts the data in one place, and two machines judge the cut.
          The beam weighs how far each value sits from it. The scales only count
          how many fall on each side. They want the cut in different places.
        </p>
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">Data</span>
          <div className="segmented" role="group" aria-label="Choose a data set">
            {datasets.map((x, i) => (
              <button key={x.id} type="button" className={i === dsIndex ? "is-active" : ""}
                      aria-pressed={i === dsIndex} onClick={() => pickDataset(i)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="controls controls-tight">
        <div className="control">
          <label className="control-label" htmlFor="split">Cut the data here</label>
          <div className="slider-row">
            <input id="split" type="range" min={d.lo} max={d.hi} step={d.step}
                   value={split} onChange={(e) => setSplit(snap(Number(e.target.value)))} />
            <output className="slider-value">{stat(split)}</output>
          </div>
        </div>
        <div className="control">
          <span className="control-label">&nbsp;</span>
          <div className="segmented" role="group" aria-label="Send the cut somewhere">
            <button type="button" onClick={() => setSplit(d.mu)}>Balance the beam</button>
            <button type="button" onClick={() => setSplit(d.even)}>Level the scales</button>
          </div>
        </div>
      </div>

      <p className="blurb">
        {ds.blurb} · <strong>{n}</strong> values ·{" "}
        <span className="key-below">below the cut</span>{" "}
        <span className="key-above">above the cut</span>
      </p>

      <h2 className="panel-head">The beam weighs distance</h2>
      <p className="panel-sub">
        Every class is a weight standing where it falls. A value far from the
        pivot pulls harder than one close to it.
      </p>

      <BalanceBeam bins={sp.bins} split={split} mean={d.mu} total={n}
                   format={fmt} units={ds.units} />

      <p className="readout" aria-live="polite">
        {beamLevel ? (
          <span>
            Level at <strong>{stat(d.mu)}</strong>. That is the mean, and it is the
            only cut that balances this beam.
          </span>
        ) : (
          <span className="readout-idle">
            The pivot is at {stat(split)}. The pulls on the two sides do not cancel.
          </span>
        )}
      </p>

      <h2 className="panel-head">The scales weigh count</h2>
      <p className="panel-sub">
        The same classes, carried onto two pans. Now every value weighs the same,
        so only how many there are matters.
      </p>

      <Scales bins={sp.bins} leftPan={sp.leftPan} rightPan={sp.rightPan}
              level={sp.level} total={n} />

      <p className="readout" aria-live="polite">
        {sp.level ? (
          <span>
            Level: <strong>{formatCount(sp.leftPan)}</strong> on each side.{" "}
            {sp.onEdge > 0 ? (
              <>
                {sp.onEdge} {sp.onEdge === 1 ? "value sits" : "values sit"} exactly on
                the cut. The median does not hand{" "}
                {sp.onEdge === 1 ? "it" : "them"} to a side, it marks where the halves
                meet
                {Number.isInteger(sp.leftPan)
                  ? ""
                  : ", so the value that has to be divided is divided"}
                .{" "}
              </>
            ) : null}
            The median is <strong>{stat(d.med)}</strong>.
          </span>
        ) : (
          <span className="readout-idle">
            {formatCount(sp.leftPan)} below and {formatCount(sp.rightPan)} above. Move
            the cut until the counts match.
          </span>
        )}
      </p>

      <dl className="stats">
        <div><dt>Mean</dt><dd>{stat(d.mu)}</dd></div>
        <div><dt>Median</dt><dd>{stat(d.med)}</dd></div>
        <div><dt>Below the mean</dt><dd>{belowMean} of {n}</dd></div>
      </dl>

      <p className="note">
        {both
          ? "This data is even enough that one cut does both. That is what a symmetric data set looks like."
          : "One slider, two machines, and you cannot satisfy both. Balance the beam and the pans go uneven. Level the pans and the beam tips. The gap between those two cuts is the gap between the mean and the median."}
      </p>

      <p className="note">{ds.note}</p>
    </section>
  );
}
