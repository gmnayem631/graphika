/**
 * Delimited text (CSV / TSV / semicolon / pipe) -> grid of raw text cells.
 * PapaParse does the actual splitting (quotes, embedded newlines, escapes);
 * we pick the delimiter.
 */
import Papa from "papaparse";
import { parseNumber } from "./normalize";
import type { Delimiter } from "./types";

export const DELIMITERS: Delimiter[] = ["\t", ",", ";", "|"];

export const DELIMITER_NAMES: Record<Delimiter, string> = {
  ",": "comma",
  ";": "semicolon",
  "\t": "tab",
  "|": "pipe",
};

/**
 * Split text into rows of fields. By default blank lines are kept (as rows of
 * empty strings) so that row indices match line numbers in messages.
 */
export function splitDelimited(
  text: string,
  delimiter: Delimiter,
  { preview = 0, skipBlank = false }: { preview?: number; skipBlank?: boolean } = {},
): string[][] {
  const result = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: skipBlank ? "greedy" : false, preview });
  // A final newline yields one trailing empty row; drop it.
  const rows = result.data;
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") rows.pop();
  return rows;
}

const DATE_OR_NUMBER = /^[\d\s.,:/+\-−eE]+$/;

/**
 * Pick the delimiter that splits the first ~100 rows most consistently into
 * more than one column. Ties (e.g. "01.01.2023;1,5" splits into two fields with
 * both ";" and ",") are broken by how many fields look like clean numbers or
 * dates, then by the order of DELIMITERS.
 */
export function detectDelimiter(text: string): Delimiter {
  const sample = text.slice(0, 64 * 1024);
  let best: { d: Delimiter; consistency: number; clean: number } | null = null;

  for (const d of DELIMITERS) {
    if (!sample.includes(d)) continue;
    const rows = splitDelimited(sample, d, { preview: 100, skipBlank: true });
    // The last sampled row may be cut off by the 64 KB slice.
    if (rows.length > 2 && sample.length < text.length) rows.pop();
    if (rows.length === 0) continue;
    const counts = rows.map((r) => r.length);
    const freq = new Map<number, number>();
    counts.forEach((c) => freq.set(c, (freq.get(c) ?? 0) + 1));
    const [modal, modalCount] = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
    if (modal < 2) continue;
    const consistency = modalCount / rows.length;
    const fields = rows.flat().filter((f) => f.trim() !== "");
    const cleanFields = fields.filter(
      (f) =>
        DATE_OR_NUMBER.test(f.trim()) &&
        (parseNumber(f.trim(), ".") !== null || parseNumber(f.trim(), ",") !== null || /\d[-/.]\d/.test(f)),
    ).length;
    const clean = fields.length ? cleanFields / fields.length : 0;

    if (
      !best ||
      consistency > best.consistency + 0.02 ||
      (Math.abs(consistency - best.consistency) <= 0.02 && clean > best.clean + 0.01)
    ) {
      best = { d, consistency, clean };
    }
  }
  return best?.d ?? ",";
}
