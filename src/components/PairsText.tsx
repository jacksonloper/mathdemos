import { useRef, useState } from "react";
import type { Pair } from "../data/bivariate";
import { MAX_CHARS, parsePairs, serialize, type Labels } from "../data/pairsText";

type Props = {
  value: Pair[];
  labels: Labels;
  onCommit: (pairs: Pair[], labels: Labels) => void;
};

/**
 * The whole data set in one box, for pasting. Same rule as a single number
 * box, on the whole text at once: nothing changes until it is confirmed with
 * ✓ or by leaving the box; while an edit is pending the box is amber; if the
 * text does not parse it is red, says which line is wrong, and snaps back on
 * the way out.
 */
export function PairsText({ value, labels, onCommit }: Props) {
  const committed = serialize(value, labels);
  const [text, setText] = useState(committed);
  const [seen, setSeen] = useState(committed);
  const discard = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);

  if (seen !== committed) {
    setSeen(committed);
    setText(committed);
  }

  const parsed = parsePairs(text);
  const dirty = text !== committed;

  function commit() {
    const keep = !discard.current && parsed.ok;
    discard.current = false;
    if (!keep) {
      setText(committed);
      return;
    }
    if (parsed.ok) {
      setText(serialize(parsed.pairs, parsed.labels));
      onCommit(parsed.pairs, parsed.labels);
    }
  }
  function confirm(e: React.PointerEvent) {
    e.preventDefault();
    box.current?.blur();
  }
  function cancel(e: React.PointerEvent) {
    e.preventDefault();
    discard.current = true;
    box.current?.blur();
  }

  const rows = parsed.ok ? parsed.pairs.length : null;

  return (
    <div className="pairs-text">
      <label className="control-label" htmlFor="pairs-csv">
        The axis names, then one pair per line, x first
      </label>
      <textarea
        id="pairs-csv"
        ref={box}
        className={(parsed.ok ? "" : "is-invalid") + (dirty ? " is-dirty" : "")}
        value={text}
        spellCheck={false}
        aria-invalid={!parsed.ok}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            discard.current = true;
            e.currentTarget.blur();
          }
        }}
      />
      <div className="pairs-text-foot">
        {dirty ? (
          <>
            <button type="button" className="cell-ok" aria-label="Confirm the data"
                    title={parsed.ok ? "Confirm" : "Fix the red line first"} disabled={!parsed.ok}
                    onPointerDown={confirm}>
              ✓
            </button>
            <button type="button" className="cell-no" aria-label="Discard the edit"
                    title="Put the old data back" onPointerDown={cancel}>
              ✕
            </button>
          </>
        ) : null}
        <span className={"pairs-text-status" + (parsed.ok ? "" : " err")}>
          {parsed.ok
            ? `${rows} ${rows === 1 ? "row" : "rows"} · ${text.length} of ${MAX_CHARS} characters`
            : parsed.error}
        </span>
      </div>
    </div>
  );
}
