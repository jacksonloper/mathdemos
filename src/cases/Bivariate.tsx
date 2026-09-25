import { useMemo, useState } from "react";
import { NumberCell } from "../components/NumberCell";
import { Scatter } from "../components/Scatter";
import { bivariateSets, fit, type Pair } from "../data/bivariate";

/** Four decimals, a true minus sign, and a dash where there is no number. */
function f4(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(4).replace("-", "−");
}

/** A round x near the middle of the data, to ask a prediction about. */
function defaultAskX(pairs: Pair[]): number {
  if (pairs.length === 0) return 0;
  const xs = pairs.map((p) => p.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  const step = niceStep((Math.max(...xs) - Math.min(...xs)) / 10);
  return Math.round(mid / step) * step;
}

/** A round difference in x, about a tenth of the data's range. */
function defaultDiff(pairs: Pair[]): number {
  if (pairs.length < 2) return 1;
  const xs = pairs.map((p) => p.x);
  return niceStep((Math.max(...xs) - Math.min(...xs)) / 10);
}

function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
}

export function Bivariate() {
  const [preset, setPreset] = useState<number | null>(0);
  const [pairs, setPairs] = useState<Pair[]>(bivariateSets[0].pairs);
  const [labels, setLabels] = useState({ x: bivariateSets[0].xlab, y: bivariateSets[0].ylab });
  // The two questions the line gets asked: predict at one x, and how much y
  // differs when x differs by some amount.
  const [askX, setAskX] = useState(() => defaultAskX(bivariateSets[0].pairs));
  const [diff, setDiff] = useState(() => defaultDiff(bivariateSets[0].pairs));

  const f = useMemo(() => fit(pairs), [pairs]);
  const hasLine = f !== null && Number.isFinite(f.slope);
  const predicted = hasLine ? f.intercept + f.slope * askX : NaN;
  const xs = pairs.map((p) => p.x);
  const outside = pairs.length > 0 && (askX < Math.min(...xs) || askX > Math.max(...xs));

  function pickPreset(i: number) {
    const s = bivariateSets[i];
    setPreset(i);
    setPairs(s.pairs);
    setLabels({ x: s.xlab, y: s.ylab });
    setAskX(defaultAskX(s.pairs));
    setDiff(defaultDiff(s.pairs));
  }

  // Every edit is a new array, and the preset button goes dark: the data is
  // now the user's, not the example's.
  function edit(next: Pair[]) {
    setPairs(next);
    setPreset(null);
  }

  function setCell(i: number, key: "x" | "y", v: number) {
    edit(pairs.map((p, j) => (j === i ? { ...p, [key]: v } : p)));
  }

  function swap() {
    const next = pairs.map((p) => ({ x: p.y, y: p.x }));
    setPairs(next);
    setLabels({ x: labels.y, y: labels.x });
    setAskX(defaultAskX(next));
    setDiff(defaultDiff(next));
  }

  function addRow() {
    // A new row at the mean point, so it does not move the line until it is
    // typed over.
    const p = f ? { x: Math.round(f.xbar), y: Math.round(f.ybar) } : { x: 0, y: 0 };
    edit([...pairs, p]);
  }

  const equation = f && Number.isFinite(f.slope)
    ? `ŷ = ${f4(f.intercept)} + ${f4(f.slope)}x`.replace("+ −", "− ")
    : null;

  return (
    <section className="case">
      <header className="case-head">
        <h1>The line of best fit</h1>
        <p>
          Pick a data set or type your own. The line, its slope and intercept,
          and r follow every edit. Swap the axes and watch which of them change.
        </p>
      </header>

      <div className="controls">
        <div className="control">
          <span className="control-label">Data</span>
          <div className="segmented" role="group" aria-label="Choose a data set">
            {bivariateSets.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={i === preset ? "is-active" : ""}
                aria-pressed={i === preset}
                onClick={() => pickPreset(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="control-label">Axes</span>
          <button type="button" className="ghost" onClick={swap}>
            Swap x and y
          </button>
        </div>
      </div>

      <p className="blurb">
        <strong>{pairs.length}</strong> {pairs.length === 1 ? "pair" : "pairs"}
        {preset !== null ? ` · ${bivariateSets[preset].label}` : " · your data"}
      </p>

      <Scatter pairs={pairs} fit={f} xlab={labels.x} ylab={labels.y}
               predict={hasLine ? { x: askX, y: predicted } : null} />

      <p className="equation">
        {equation ?? (pairs.length < 2 ? "Two points make a line. Add another." : "Every x is the same, so there is no line.")}
      </p>

      <dl className="stats">
        <div><dt>Slope</dt><dd>{f ? f4(f.slope) : "—"}</dd></div>
        <div><dt>y-intercept</dt><dd>{f ? f4(f.intercept) : "—"}</dd></div>
        <div><dt>r</dt><dd>{f ? f4(f.r) : "—"}</dd></div>
        <div><dt>r²</dt><dd>{f ? f4(f.r2) : "—"}</dd></div>
      </dl>

      {/* Predict: the whole equation. Differ: the slope alone. */}
      <div className="use">
        <p>
          Predict {labels.y} when {labels.x} is{" "}
          <NumberCell value={askX} label="x to predict at" onCommit={setAskX} />
          {hasLine ? (
            <>
              : <strong>ŷ = {f4(predicted)}</strong>
              {outside ? (
                <span className="warn"> That x is outside the data, so this is extrapolation.</span>
              ) : null}
            </>
          ) : null}
        </p>
        <p>
          If two values of {labels.x} differ by{" "}
          <NumberCell value={diff} label="difference in x" onCommit={setDiff} />
          {hasLine ? (
            <>
              , the predicted {labels.y} values differ by slope × difference ={" "}
              <strong>{f4(f.slope * diff)}</strong>
            </>
          ) : null}
        </p>
      </div>

      {/* A flat line has a slope, 0, but no r: the proportion of variation
          in y that the line explains is 0/0 when y has no variation. */}
      {f && f.yConstant && Number.isFinite(f.slope) ? (
        <p className="note">
          r and r² are undefined. The proportion of the variation in y that the
          line explains has no meaning here, because only one outcome
          ({f4(f.ybar).replace(/\.?0+$/, "")}) is observed across the whole
          data set, so there is no variation to explain.
        </p>
      ) : null}

      <p className="note">
        {preset !== null
          ? bivariateSets[preset].note
          : "Edited. Pick a data set to start over."}
      </p>

      {/* The data is always on the page and always editable. A preset only
          fills these boxes in; after that they are the user's. */}
      <table className="pairs">
        <thead>
          <tr>
            <th>#</th>
            <th>{labels.x} (x)</th>
            <th>{labels.y} (y)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((p, i) => (
            <tr key={i}>
              <td className="pairs-index">{i + 1}</td>
              <td>
                <NumberCell value={p.x} label={`x for row ${i + 1}`}
                            onCommit={(v) => setCell(i, "x", v)} />
              </td>
              <td>
                <NumberCell value={p.y} label={`y for row ${i + 1}`}
                            onCommit={(v) => setCell(i, "y", v)} />
              </td>
              <td>
                <button type="button" className="row-del" aria-label={`Delete row ${i + 1}`}
                        onClick={() => edit(pairs.filter((_, j) => j !== i))}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="ghost add-row" onClick={addRow}>
        Add a row
      </button>
      <p className="hint">
        Type over any number, then press Enter, tap ✓, or tap away. Until then
        the box is amber and the chart has not changed. Anything that is not a
        number turns red and is put back.
      </p>
    </section>
  );
}
