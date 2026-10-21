import { useRef, useState } from "react";

export type ParseResult<T> =
  | { ok: true; value: T; summary: string }
  | { ok: false; error: string };

type Props<T> = {
  id: string;
  label: string;
  /** The text that stands for the data as it is now. */
  committed: string;
  parse: (text: string) => ParseResult<T>;
  /** Called with the parsed data and its canonical text when an edit is confirmed. */
  onCommit: (value: T, text: string) => void;
  className?: string;
};

/**
 * A data set as one box of text, for typing or pasting. The rule, the same
 * as a single number box: nothing changes until the edit is confirmed with ✓
 * or by leaving the box; while it is pending the box is amber; if the text
 * does not parse it is red, says what is wrong, and snaps back on the way out.
 * The parser decides what the text means; this only runs the ceremony.
 */
export function TextEntry<T>({ id, label, committed, parse, onCommit, className }: Props<T>) {
  const [text, setText] = useState(committed);
  const [seen, setSeen] = useState(committed);
  const discard = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);

  if (seen !== committed) {
    setSeen(committed);
    setText(committed);
  }

  const parsed = parse(text);
  const dirty = text !== committed;

  function commit() {
    const keep = !discard.current && parsed.ok;
    discard.current = false;
    if (!keep || !parsed.ok) {
      setText(committed);
      return;
    }
    onCommit(parsed.value, text);
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

  return (
    <div className={"pairs-text " + (className ?? "")}>
      <label className="control-label" htmlFor={id}>{label}</label>
      <textarea
        id={id}
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
          {parsed.ok ? parsed.summary : parsed.error}
        </span>
      </div>
    </div>
  );
}
