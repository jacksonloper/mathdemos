import { useRef, useState } from "react";

type Props = {
  value: number;
  onCommit: (v: number) => void;
  label: string;
};

/**
 * A number in a box that can be typed over.
 *
 * Typing changes nothing until the box loses focus or Enter is pressed. If
 * what was typed is a number, it replaces the value then. If it is not, the
 * box is red while it is being typed and snaps back to the old value on the
 * way out. Escape snaps back too. So the data behind the chart is always a
 * number, and a half-typed entry never reaches it.
 */
export function NumberCell({ value, onCommit, label }: Props) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);
  const discard = useRef(false);

  // The value can change from outside: a preset is picked, or the axes are
  // swapped. The box follows, adjusted during render rather than in an
  // effect so there is no frame showing the old number.
  if (seen !== value) {
    setSeen(value);
    setText(String(value));
  }

  const valid = parse(text) !== null;

  function commit() {
    const v = discard.current ? null : parse(text);
    discard.current = false;
    if (v === null) {
      setText(String(value));
    } else {
      onCommit(v);
      setText(String(v));
    }
  }

  return (
    <input
      className={"cell" + (valid ? "" : " is-invalid")}
      inputMode="decimal"
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
  );
}

/** A number, or null for anything a calculator would not accept. */
function parse(t: string): number | null {
  const s = t.trim();
  if (s === "") return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
