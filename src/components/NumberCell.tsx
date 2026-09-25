import { useRef, useState } from "react";

type Props = {
  value: number;
  onCommit: (v: number) => void;
  label: string;
};

/**
 * A number in a box that can be typed over.
 *
 * Typing changes nothing until the edit is confirmed: Enter, the ✓ beside the
 * box, or leaving the box. While an edit is pending the box has an amber
 * outline and the ✓ and ✕ are showing, so it is plain that the chart has not
 * heard it yet. If what was typed is a number, confirming replaces the value.
 * If it is not, the box is red while it is being typed and snaps back to the
 * old value on the way out. Escape and ✕ snap back too.
 *
 * The buttons exist for phones, where the numeric keyboard may have no Enter
 * and a tap elsewhere does not reliably leave the box.
 */
export function NumberCell({ value, onCommit, label }: Props) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  const discard = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  // The value can change from outside: a preset is picked, or the axes are
  // swapped. The box follows, adjusted during render rather than in an
  // effect so there is no frame showing the old number.
  if (seen !== value) {
    setSeen(value);
    setText(String(value));
  }

  const parsed = parse(text);
  const valid = parsed !== null;
  const dirty = text !== String(value);

  function commit() {
    const v = discard.current ? null : parsed;
    discard.current = false;
    if (v === null) {
      setText(String(value));
    } else {
      setText(String(v));
      // The same number again is not an edit, and must not mark the data as
      // edited.
      if (v !== value) onCommit(v);
    }
  }

  // Pressing a button would first blur the box, and blur commits. The buttons
  // keep focus where it is, set what should happen, and then blur on purpose.
  function confirm(e: React.PointerEvent) {
    e.preventDefault();
    input.current?.blur();
  }
  function cancel(e: React.PointerEvent) {
    e.preventDefault();
    discard.current = true;
    input.current?.blur();
  }

  return (
    <span className="cell-wrap">
      <input
        ref={input}
        className={"cell" + (valid ? "" : " is-invalid") + (dirty ? " is-dirty" : "")}
        inputMode="decimal"
        enterKeyHint="done"
        value={text}
        aria-label={label}
        aria-invalid={!valid}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            discard.current = true;
            e.currentTarget.blur();
          }
        }}
      />
      {dirty ? (
        <>
          <button type="button" className="cell-ok" aria-label={`Confirm ${label}`}
                  title={valid ? "Confirm" : "Not a number"} disabled={!valid}
                  onPointerDown={confirm}>
            ✓
          </button>
          <button type="button" className="cell-no" aria-label={`Discard ${label}`}
                  title="Put the old value back" onPointerDown={cancel}>
            ✕
          </button>
        </>
      ) : null}
    </span>
  );
}

/** A number, or null for anything a calculator would not accept. */
function parse(t: string): number | null {
  const s = t.trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
