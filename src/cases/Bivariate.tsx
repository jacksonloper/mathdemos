import { useMemo, useState } from "react";
import { NumberCell } from "../components/NumberCell";
import { Scatter } from "../components/Scatter";
import { bivariateSets, fit, type Pair } from "../data/bivariate";

/** Four decimals, a true minus sign, and a dash where there is no number. */
function f4(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(4).replace("-", "−");
}

export function Bivariate() {
  const [preset, setPreset] = useState<number | null>(0);
  const [pairs, setPairs] = useState<Pair[]>(bivariateSets[0].pairs);
  const [labels, setLabels] = useState({ x: bivariateSets[0].xlab, y: bivariateSets[0].ylab });

  const f = useMemo(() => fit(pairs), [pairs]);

  function pickPreset(i: number) {
    const s = bivariateSets[i];
    setPreset(i);
    setPairs(s.pairs);
    setLabels({ x: s.xlab, y: s.ylab });
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
    setPairs(pairs.map((p) => ({ x: p.y, y: p.x })));
    setLabels({ x: labels.y, y: labels.x });
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

      <Scatter pairs={pairs} fit={f} xlab={labels.x} ylab={labels.y} />

      <p className="equation">
        {equation ?? (pairs.length < 2 ? "Two points make a line. Add another." : "Every x is the same, so there is no line.")}
      </p>

      <dl className="stats">
        <div><dt>Slope</dt><dd>{f ? f4(f.slope) : "—"}</dd></div>
        <div><dt>y-intercept</dt><dd>{f ? f4(f.intercept) : "—"}</dd></div>
        <div><dt>r</dt><dd>{f ? f4(f.r) : "—"}</dd></div>
        <div><dt>r²</dt><dd>{f ? f4(f.r2) : "—"}</dd></div>
      </dl>

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
        Type over any number. It takes effect when you press Enter or click
        away. Anything that is not a number turns red and is put back.
      </p>
    </section>
  );
}
