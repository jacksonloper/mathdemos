import { useRef, useState } from "react";
import { MAX_CHARS, parseValues, serializeValues } from "../data/valuesText";

type Props = {
  value: number[];
  onCommit: (values: number[]) => void;
};

/**
 * A list of numbers in one box, for typing or pasting. The same rule as the
 * paired-data box: nothing changes until it is confirmed with ✓ or by leaving
 * the box; while an edit is pending the box is amber; if the text does not
 * parse it is red, names the offending token, and snaps back on the way out.
 */
export function ValuesText({ value, onCommit }: Props) {
  const committed = serializeValues(value);
  const [text, setText] = useState(committed);
  const [seen, setSeen] = useState(committed);
  const discard = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);

  if (seen !== committed) {
    setSeen(committed);
    setText(committed);
  }

  const parsed = parseValues(text);
  const dirty = text !== committed;

  function commit() {
    const keep = !discard.current && parsed.ok;
    discard.current = false;
    if (!keep) {
      setText(committed);
      return;
    }
    if (parsed.ok) {
      setText(serializeValues(parsed.values));
      onCommit(parsed.values);
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

  const n = parsed.ok ? parsed.values.length : null;

  return (
    <div className="pairs-text values-text">
      <label className="control-label" htmlFor="values-list">
        Your values, separated by spaces, commas or line breaks
      </label>
      <textarea
        id="values-list"
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
                    title={parsed.ok ? "Confirm" : "Fix the red text first"} disabled={!parsed.ok}
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
            ? `${n} ${n === 1 ? "value" : "values"} · ${text.length} of ${MAX_CHARS} characters`
            : parsed.error}
        </span>
      </div>
    </div>
  );
}
