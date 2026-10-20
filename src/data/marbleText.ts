// Reading a census as text for the marbles demo: one token per person, a
// letter or two naming them and a number that is their value, "B3" for Bob
// with three keys. The whole class becomes a bag of labelled marbles.

export const MAX_MARBLES = 60;
export const MAX_CHARS = 2000;

export type Marble = { label: string; value: number };

export type ParsedMarbles =
  | { ok: true; marbles: Marble[] }
  | { ok: false; error: string };

export function serializeMarbles(marbles: Marble[]): string {
  return marbles.map((m) => `${m.label}${m.value}`).join(" ");
}

/** "B3", "A12", "Jo2.5": letters then a number, no space between. A bare number is a marble with no name. */
const TOKEN = /^([A-Za-z]{0,3})(\d+(?:\.\d+)?)$/;

export function parseMarbles(text: string): ParsedMarbles {
  if (text.length > MAX_CHARS) return { ok: false, error: `More than ${MAX_CHARS} characters.` };
  const parts = text.split(/[,;\s]+/).filter((s) => s !== "");
  const marbles: Marble[] = [];
  for (const p of parts) {
    const m = TOKEN.exec(p);
    if (!m) return { ok: false, error: `“${p}” is not a letter and a number, like B3.` };
    marbles.push({ label: m[1].toUpperCase(), value: Number(m[2]) });
  }
  if (marbles.length < 2) return { ok: false, error: "Type at least two people, like B3 A9." };
  if (marbles.length > MAX_MARBLES) return { ok: false, error: `More than ${MAX_MARBLES} marbles.` };
  return { ok: true, marbles };
}
