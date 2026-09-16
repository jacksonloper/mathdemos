import { useMemo, useState } from "react";
import { BalanceBeam } from "../components/BalanceBeam";
import { Scales } from "../components/Scales";
import { binValues, datasets, formatStat, formatValue, mean, median } from "../data/datasets";

/** The pivot slider gets this many stops across the data, so the mean is reachable. */
const STOPS = 600;

export function Balance() {
  const [dsIndex, setDsIndex] = useState(0);
  const ds = datasets[dsIndex];

  const stats = useMemo(() => {
    const sorted = [...ds.values].sort((a, b) => a - b);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    return { sorted, lo, hi, mu: mean(ds.values), med: median(ds.values), step: (hi - lo) / STOPS };
  }, [ds]);

  // Both controls open away from the answer, so there is something to find.
  const [pivot, setPivot] = useState(() => stats.lo + (stats.hi - stats.lo) * 0.25);
  const [k, setK] = useState(() => Math.round(ds.values.length * 0.25));

  function pickDataset(i: number) {
    const d = datasets[i];
    const s = [...d.values].sort((a, b) => a - b);
    setDsIndex(i);
    setPivot(s[0] + (s[s.length - 1] - s[0]) * 0.25);
    setK(Math.round(d.values.length * 0.25));
  }

  const bins = useMemo(
    () => binValues(ds.values, ds.widths[ds.defaultWidth], ds.origin),
    [ds],
  );
  // Axis ticks get the compact form, prose and statistics the precise one.
  const fmt = (v: number) => formatValue(ds, v);
  const stat = (v: number) => formatStat(ds, v);

  const n = ds.values.length;
  const even = n % 2 === 0;
  const beamLevel = Math.abs(stats.mu - pivot) < (stats.hi - stats.lo) * 0.0025;
  const scalesLevel = k === n - k;
  const belowMean = ds.values.filter((v) => v < stats.mu).length;

  return (
    <section className="case">
      <header className="case-head">
        <h1>Two middles, two machines</h1>
        <p>
          The mean balances distances. The median balances counts. Each one has a
          machine that finds it, and the machines do not agree.
        </p>
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">Data</span>
          <div className="segmented" role="group" aria-label="Choose a data set">
            {datasets.map((d, i) => (
              <button key={d.id} type="button" className={i === dsIndex ? "is-active" : ""}
                      aria-pressed={i === dsIndex} onClick={() => pickDataset(i)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="blurb">
        {ds.blurb} · <strong>{n}</strong> values
      </p>

      <h2 className="panel-head">The mean: slide the pivot until it balances</h2>
      <p className="panel-sub">
        Every value is a weight sitting where it falls on the line. Push the pivot
        until the beam is level.
      </p>

      <div className="controls controls-tight">
        <div className="control">
          <label className="control-label" htmlFor="pivot">Pivot</label>
          <div className="slider-row">
            <input id="pivot" type="range" min={stats.lo} max={stats.hi} step={stats.step}
                   value={pivot} onChange={(e) => setPivot(Number(e.target.value))} />
            <output className="slider-value">{stat(pivot)}</output>
          </div>
        </div>
        <div className="control">
          <span className="control-label">&nbsp;</span>
          <button type="button" className="ghost" onClick={() => setPivot(stats.mu)}>
            Let it balance
          </button>
        </div>
      </div>

      <BalanceBeam bins={bins} pivot={pivot} mean={stats.mu} total={n}
                   format={fmt} units={ds.units} />

      <p className="readout" aria-live="polite">
        {beamLevel ? (
          <span>
            Level at <strong>{stat(stats.mu)}</strong>. That is the mean. A value far
            out on the line pulls harder than a value near the pivot, so where the
            weights sit matters, not just how many there are.
          </span>
        ) : (
          <span className="readout-idle">
            The pivot is at {stat(pivot)}. The beam tips because the pulls on the two
            sides do not cancel.
          </span>
        )}
      </p>

      <h2 className="panel-head">The median: slide until the pans hold the same number</h2>
      <p className="panel-sub">
        Now every value weighs the same, whatever it is. Choose how many of them go
        on the left pan.
      </p>

      <div className="controls controls-tight">
        <div className="control">
          <label className="control-label" htmlFor="split">On the left pan</label>
          <div className="slider-row">
            <input id="split" type="range" min={0} max={n} step={1}
                   value={k} onChange={(e) => setK(Number(e.target.value))} />
            <output className="slider-value">{k} of {n}</output>
          </div>
        </div>
        <div className="control">
          <span className="control-label">&nbsp;</span>
          <button type="button" className="ghost" onClick={() => setK(Math.floor(n / 2))}>
            {even ? "Split it evenly" : "Get as close as it goes"}
          </button>
        </div>
      </div>

      <Scales sorted={stats.sorted} k={k} format={stat} />

      <p className="readout" aria-live="polite">
        {scalesLevel ? (
          <span>
            Level: <strong>{n / 2}</strong> on each side. The divider sits between{" "}
            <strong>{stat(stats.sorted[k - 1])}</strong> and{" "}
            <strong>{stat(stats.sorted[k])}</strong>, and the median is the midpoint
            of those two, <strong>{stat(stats.med)}</strong>.
          </span>
        ) : !even && Math.abs(k - (n - k)) === 1 ? (
          <span>
            This is as close as it gets. <strong>{n}</strong> is odd, so no split puts
            the same number on each side; one value is always left over. That value is
            the median, <strong>{stat(stats.med)}</strong>.
          </span>
        ) : (
          <span className="readout-idle">
            {k} on the left and {n - k} on the right. Move the divider until the counts
            match.
          </span>
        )}
      </p>

      <dl className="stats">
        <div><dt>Mean</dt><dd>{stat(stats.mu)}</dd></div>
        <div><dt>Median</dt><dd>{stat(stats.med)}</dd></div>
        <div><dt>Below the mean</dt><dd>{belowMean} of {n}</dd></div>
      </dl>

      <p className="note">{ds.note}</p>

      <p className="note">
        {stats.mu > stats.med
          ? "The pivot sits to the right of the divider. A few large values pull the beam that way without moving the count, which is what a right-skewed data set does to a mean."
          : stats.mu < stats.med
            ? "The pivot sits to the left of the divider, so the long tail is on the low side."
            : "The pivot and the divider land together, which is what a symmetric data set looks like."}
      </p>
    </section>
  );
}
