import { useMemo, useState } from "react";
import { Histogram } from "../components/Histogram";
import { binDomain, binValues, datasets, formatValue } from "../data/datasets";

export function Binning() {
  const [dsIndex, setDsIndex] = useState(0);
  const [widthIndex, setWidthIndex] = useState(datasets[0].defaultWidth);
  const [relative, setRelative] = useState(false);

  const ds = datasets[dsIndex];
  const width = ds.widths[Math.min(widthIndex, ds.widths.length - 1)];
  const bins = useMemo(
    () => binValues(ds.values, width, ds.origin),
    [ds, width],
  );
  const domain = useMemo(() => binDomain(ds), [ds]);

  function pickDataset(i: number) {
    setDsIndex(i);
    setWidthIndex(datasets[i].defaultWidth);
  }

  // A width is a quantity in the data's own units, so money is written as
  // money: "$100k", not "100000 dollars".
  const widthLabel = ds.currency
    ? formatValue(ds, width)
    : `${width} ${width === 1 ? ds.unit : ds.units}`;

  const occupied = bins.filter((b) => b.count > 0).length;
  const sorted = useMemo(() => [...ds.values].sort((a, b) => a - b), [ds]);
  const distinct = useMemo(() => new Set(ds.values).size, [ds]);

  return (
    <section className="case">
      <header className="case-head">
        <h1>Class width changes the picture</h1>
        <p>
          The data never move. Only the width of the classes does. Drag the
          slider and watch the shape appear, sharpen, and then wash out.
        </p>
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">Data</span>
          <div className="segmented" role="group" aria-label="Choose a data set">
            {datasets.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className={i === dsIndex ? "is-active" : ""}
                aria-pressed={i === dsIndex}
                onClick={() => pickDataset(i)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <label className="control-label" htmlFor="width">
            Class width
          </label>
          <div className="slider-row">
            <input
              id="width"
              type="range"
              min={0}
              max={ds.widths.length - 1}
              step={1}
              value={Math.min(widthIndex, ds.widths.length - 1)}
              onChange={(e) => setWidthIndex(Number(e.target.value))}
            />
            <output className="slider-value">{widthLabel}</output>
          </div>
        </div>

        <div className="control">
          <span className="control-label">Vertical axis</span>
          <div className="segmented" role="group" aria-label="Choose the vertical axis">
            <button type="button" className={!relative ? "is-active" : ""}
                    aria-pressed={!relative} onClick={() => setRelative(false)}>
              Frequency
            </button>
            <button type="button" className={relative ? "is-active" : ""}
                    aria-pressed={relative} onClick={() => setRelative(true)}>
              Relative
            </button>
          </div>
        </div>
      </div>

      <p className="blurb">
        {ds.blurb} · <strong>{ds.values.length}</strong> values
      </p>

      <Histogram
        bins={bins}
        format={(v) => formatValue(ds, v)}
        units={ds.units}
        total={ds.values.length}
        relative={relative}
        domain={domain}
      />

      <dl className="stats">
        <div><dt>Classes</dt><dd>{bins.length}</dd></div>
        <div><dt>Class width</dt><dd>{widthLabel}</dd></div>
        <div><dt>Classes with data</dt><dd>{occupied}</dd></div>
        <div><dt>Tallest class</dt><dd>{Math.max(...bins.map((b) => b.count))}</dd></div>
      </dl>

      {/* Always on. The data is the point of the page, and hiding it behind a
          checkbox invites reading the bars as if they were the thing itself.
          It is a list rather than a picture on purpose: a dot plot of the
          briefcase prizes, which run from one cent to a million dollars,
          would be a smear against the left edge. */}
      <div className="raw">
        <p className="raw-head">
          All <strong>{ds.values.length}</strong> values, sorted.{" "}
          <span className="raw-sub">
            {distinct} distinct. The classes are a choice laid over these; the
            numbers themselves do not change.
          </span>
        </p>
        <p className="raw-values">
          {sorted.map((v) => formatValue(ds, v)).join("  ")}
        </p>
      </div>

      <p className="note">{ds.note}</p>

      <details className="table-view">
        <summary>Show the class table</summary>
        <table>
          <thead>
            <tr>
              <th>At least</th><th>Less than</th>
              <th>Frequency</th><th>Relative frequency</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((b, i) => (
              <tr key={i}>
                <td>{formatValue(ds, b.lo)}</td>
                <td>{formatValue(ds, b.hi)}</td>
                <td>{b.count}</td>
                <td>{(b.count / ds.values.length).toFixed(3)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={2}>Total</td>
              <td>{ds.values.length}</td>
              <td>1.000</td>
            </tr>
          </tbody>
        </table>
      </details>
    </section>
  );
}
