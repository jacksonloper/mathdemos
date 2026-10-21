import { MAX_CHARS, parseValues, serializeValues } from "../data/valuesText";
import { TextEntry, type ParseResult } from "./TextEntry";

type Props = {
  value: number[];
  onCommit: (values: number[]) => void;
};

/** A list of numbers in one box, for the class-width demo. */
export function ValuesText({ value, onCommit }: Props) {
  const parse = (text: string): ParseResult<number[]> => {
    const p = parseValues(text);
    if (!p.ok) return p;
    const n = p.values.length;
    return { ok: true, value: p.values, summary: `${n} ${n === 1 ? "value" : "values"} · ${text.length} of ${MAX_CHARS} characters` };
  };
  return (
    <TextEntry
      id="values-list"
      className="values-text"
      label="Your values, separated by spaces, commas or line breaks"
      committed={serializeValues(value)}
      parse={parse}
      onCommit={(values) => onCommit(values)}
    />
  );
}
