import { useMemo, useState } from "react";
import { Boxplot } from "../components/Boxplot";
import { Histogram, type Mode } from "../components/Histogram";
import { ValuesText } from "../components/ValuesText";
import {
  binDomain, binValues, datasets, fiveNumber, formatStat, formatValue, peakHeights,
} from "../data/datasets";
import { customDataset } from "../data/valuesText";

/** The "Your data" entry sits past the built-in sets in the data picker. */
const CUSTOM = datasets.length;

/** Something to look at before anyone has typed: twenty-five dart throws, in cm. */
const SAMPLE = [4, 12, 7, 3, 19, 8, 6, 25, 11, 5, 9, 2, 14, 7, 31, 10, 6, 13, 8, 4, 17, 9, 5, 22, 7];

export function Binning() {
  const [dsIndex, setDsIndex] = useState(0);
  const [widthIndex, setWidthIndex] = useState(datasets[0].defaultWidth);
  const [mode, setMode] = useState<Mode>("frequency");
  const [chart, setChart] = useState<"histogram" | "boxplot">("histogram");
  const [customValues, setCustomValues] = useState<number[]>(SAMPLE);
  const [customUnits, setCustomUnits] = useState("cm");
  const boxplot = chart === "boxplot";

  // A typed list is wrapped as a dataset of its own, so everything below
  // treats it exactly like a built-in one: its class widths are a ladder of
  // round numbers from one class to twenty-odd, rebuilt whenever it changes.
  const custom = useMemo(() => customDataset(customValues, customUnits), [customValues, customUnits]);
  const ds = dsIndex === CUSTOM ? custom : datasets[dsIndex];
  const width = ds.widths[Math.min(widthIndex, ds.widths.length - 1)];
  const bins = useMemo(
    () => binValues(ds.values, width, ds.origin),
    [ds, width],
  );
  const domain = useMemo(() => binDomain(ds), [ds]);
  // The relative and density axes are held at the dataset's tallest possible
  // bar, so the scale does not move with the slider. That is what shows the
  // difference between them: relative frequencies flatten toward zero as the
  // classes narrow, densities keep their height and settle toward a curve.
  const peaks = useMemo(() => peakHeights(ds), [ds]);
  const yTop = mode === "relative" ? peaks.relative : mode === "density" ? peaks.density : undefined;

  function pickDataset(i: number) {
    setDsIndex(i);
    setWidthIndex(i === CUSTOM ? custom.defaultWidth : datasets[i].defaultWidth);
  }
  function commitValues(values: number[]) {
    setCustomValues(values);
    setWidthIndex(customDataset(values, customUnits).defaultWidth);
  }

  // A width is a quantity in the data's own units, so money is written as
  // money: "$100k", not "100000 dollars".
  const widthLabel = ds.currency
    ? formatValue(ds, width)
    : `${width} ${width === 1 ? ds.unit : ds.units}`;

  const occupied = bins.filter((b) => b.count > 0).length;
  const sorted = useMemo(() => [...ds.values].sort((a, b) => a - b), [ds]);
  const distinct = useMemo(() => new Set(ds.values).size, [ds]);
  const summary = useMemo(() => fiveNumber(ds.values), [ds]);

  // A quartile or a fence can land on a half or a quarter, so it is written
  // exactly rather than to the axis's precision: 66.5, not 67, and 60.75, not
  // 60.8. Money keeps its dollars-and-cents form.
  const exact = (v: number) =>
    ds.currency ? formatStat(ds, v) : String(Math.round(v * 100) / 100);

  return (
    <section className="case">
      <header className="case-head">
        {boxplot ? (
          <>
            <h1>A boxplot has no classes</h1>
            <p>
              A boxplot is the five-number summary drawn to scale, so there is no
              width to choose. Its axis runs out past both fences, the lines beyond
              which a value counts as an outlier.
            </p>
          </>
        ) : (
          <>
            <h1>Class width changes the picture</h1>
            <p>
              The data never move. Only the width of the classes does. Drag the
              slider and watch the shape appear, sharpen, and then wash out.
            </p>
          </>
        )}
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">Data</span>
          <div className="segmented" role="group" aria-label="Choose a data set">
            {[...datasets, custom].map((d, i) => (
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

        {dsIndex === CUSTOM && (
          <div className="control">
            <label className="control-label" htmlFor="custom-units">Units</label>
            <input
              id="custom-units"
              className="units-input"
              type="text"
              value={customUnits}
              maxLength={16}
              spellCheck={false}
              onChange={(e) => setCustomUnits(e.target.value)}
            />
          </div>
        )}

        <div className="control">
          <span className="control-label">Chart</span>
          <div className="segmented" role="group" aria-label="Choose the chart">
            <button type="button" className={!boxplot ? "is-active" : ""}
                    aria-pressed={!boxplot} onClick={() => setChart("histogram")}>
              Histogram
            </button>
            <button type="button" className={boxplot ? "is-active" : ""}
                    aria-pressed={boxplot} onClick={() => setChart("boxplot")}>
              Boxplot
            </button>
          </div>
        </div>

        {/* Neither control means anything to a boxplot, so they go rather than
            sit there disabled. Their settings are kept for the way back. */}
        {!boxplot && (
          <>
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
              {(["frequency", "relative", "density"] as Mode[]).map((m) => (
                <button key={m} type="button" className={mode === m ? "is-active" : ""}
                        aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {m === "frequency" ? "Frequency" : m === "relative" ? "Relative" : "Density"}
                </button>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      {dsIndex === CUSTOM && (
        <ValuesText value={customValues} onCommit={commitValues} />
      )}

      <p className="blurb">
        {ds.blurb} · <strong>{ds.values.length}</strong> values
      </p>

      {boxplot ? (
        <Boxplot
          summary={summary}
          format={(v) => formatValue(ds, v)}
          formatStat={exact}
          units={ds.units}
        />
      ) : (
        <Histogram
          bins={bins}
          format={(v) => formatValue(ds, v)}
          units={ds.units}
          unit={ds.unit}
          total={ds.values.length}
          mode={mode}
          yTop={yTop}
          domain={domain}
        />
      )}

      {boxplot ? (
        <dl className="stats">
          <div><dt>Minimum</dt><dd>{exact(summary.min)}</dd></div>
          <div><dt>Q1</dt><dd>{exact(summary.q1)}</dd></div>
          <div><dt>Median</dt><dd>{exact(summary.median)}</dd></div>
          <div><dt>Q3</dt><dd>{exact(summary.q3)}</dd></div>
          <div><dt>Maximum</dt><dd>{exact(summary.max)}</dd></div>
          <div><dt>IQR</dt><dd>{exact(summary.iqr)}</dd></div>
          <div><dt>Outliers</dt><dd>{summary.outliers.length}</dd></div>
        </dl>
      ) : (
        <dl className="stats">
          <div><dt>Classes</dt><dd>{bins.length}</dd></div>
          <div><dt>Class width</dt><dd>{widthLabel}</dd></div>
          <div><dt>Classes with data</dt><dd>{occupied}</dd></div>
          <div><dt>Tallest class</dt><dd>{Math.max(...bins.map((b) => b.count))}</dd></div>
        </dl>
      )}

      {/* Always on. The data is the point of the page, and hiding it behind a
          checkbox invites reading the bars as if they were the thing itself.
          It is a list rather than a picture on purpose: a dot plot of the
          briefcase prizes, which run from one cent to a million dollars,
          would be a smear against the left edge. */}
      <div className="raw">
        <p className="raw-head">
          All <strong>{ds.values.length}</strong> values, sorted.{" "}
          <span className="raw-sub">
            {boxplot
              ? `${distinct} distinct. Every number in the boxplot comes from these, with no choice made along the way.`
              : `${distinct} distinct. The classes are a choice laid over these; the numbers themselves do not change.`}
          </span>
        </p>
        <p className="raw-values">
          {sorted.map((v) => formatValue(ds, v)).join("  ")}
        </p>
      </div>

      {/* The notes are about class widths, so they stay with the histogram. */}
      {!boxplot && <p className="note">{ds.note}</p>}
      {!boxplot && mode === "relative" && (
        <p className="note">
          <strong>The axis is pinned</strong> at the tallest bar this data can
          make at any width. Narrow the classes and every bar shrinks toward
          the floor: each one holds a smaller share. Relative frequency is a
          proportion per class, and the classes keep changing.
        </p>
      )}
      {!boxplot && mode === "density" && (
        <p className="note">
          <strong>Density is proportion per unit of width,</strong> so a bar's
          area, not its height, is its share. The axis is pinned too, and the
          bars no longer shrink as the classes narrow. The line joins the tops
          of the bars at their midpoints and runs to zero one half-class past
          each end. Every piece of it is a trapezoid with the same area as the
          bar-halves under it, so its total area is 1 without any rescaling.
          That line is what the histogram is turning into: a density curve.
        </p>
      )}

      {boxplot ? (
        <details className="table-view">
          <summary>Show the quartiles and fences</summary>
          <table>
            <tbody>
              <tr><th>Q1</th><td>median of the lower half</td><td>{exact(summary.q1)}</td></tr>
              <tr><th>Q3</th><td>median of the upper half</td><td>{exact(summary.q3)}</td></tr>
              <tr><th>IQR</th><td>Q3 − Q1</td><td>{exact(summary.iqr)}</td></tr>
              <tr><th>Lower fence</th><td>Q1 − 1.5 IQR</td><td>{exact(summary.lowerFence)}</td></tr>
              <tr><th>Upper fence</th><td>Q3 + 1.5 IQR</td><td>{exact(summary.upperFence)}</td></tr>
              <tr>
                <th>Outliers</th><td>outside the fences</td>
                <td>{summary.outliers.length ? summary.outliers.map(exact).join(", ") : "none"}</td>
              </tr>
            </tbody>
          </table>
        </details>
      ) : (
        <details className="table-view">
          <summary>Show the class table</summary>
          <table>
            <thead>
              <tr>
                <th>At least</th><th>Less than</th>
                <th>Frequency</th><th>Relative frequency</th><th>Density</th>
              </tr>
            </thead>
            <tbody>
              {bins.map((b, i) => (
                <tr key={i}>
                  <td>{formatValue(ds, b.lo)}</td>
                  <td>{formatValue(ds, b.hi)}</td>
                  <td>{b.count}</td>
                  <td>{(b.count / ds.values.length).toFixed(3)}</td>
                  <td>{(b.count / ds.values.length / width).toFixed(4)}</td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={2}>Total</td>
                <td>{ds.values.length}</td>
                <td>1.000</td>
                <td>{(1 / width).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}
