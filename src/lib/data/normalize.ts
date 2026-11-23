/**
 * Cell cleaning shared by all file types: missing-value markers and number
 * formats (decimal comma vs. decimal point, thousands separators).
 */
import type { Cell, DecimalSeparator, Delimiter } from "./types";

/**
 * Values that mean "no data" in common research exports (R, Excel, pandas,
 * SPSS, field sheets). Compared case-insensitively after trimming.
 * Numeric sentinels like -999 are NOT included by default (they can be real
 * values); users can add them as extra tokens.
 */
export const DEFAULT_MISSING_TOKENS = [
  "",
  "na",
  "n/a",
  "n.a.",
  "nan",
  "null",
  "none",
  "nil",
  "missing",
  "-",
  "--",
  "—",
  ".",
  "?",
  "#n/a",
  "#na",
  "#value!",
  "#div/0!",
  "#ref!",
  "#num!",
  "#null!",
  "#name?",
];

export function makeMissingSet(extra: string[] = []): Set<string> {
  return new Set([...DEFAULT_MISSING_TOKENS, ...extra.map((t) => t.trim().toLowerCase())]);
}

/** Trim a raw value and turn missing-value markers into null. */
export function cleanCell(raw: unknown, missing: Set<string>): Cell {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return missing.has(text.toLowerCase()) ? null : text;
}

// Spaces used as thousands separators: normal, no-break, narrow no-break, thin.
const SPACE_SEPARATORS = /[\s   ]/g;

const DOT_DECIMAL = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const COMMA_DECIMAL = /^[-+]?(\d+,?\d*|,\d+)(e[-+]?\d+)?$/i;
const DOT_THOUSANDS = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/; // 1,234,567.89
const COMMA_THOUSANDS = /^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/; // 1.234.567,89

/**
 * Parse a number written with the given decimal separator.
 * Accepts thousands separators (the other symbol, or spaces), a leading sign
 * and scientific notation. Returns null if the text is not a number.
 *
 *   parseNumber("1 234,5", ",")  -> 1234.5
 *   parseNumber("1,234.5", ".")  -> 1234.5
 *   parseNumber("12 mm", ".")    -> null
 */
export function parseNumber(text: string, decimal: DecimalSeparator): number | null {
  let s = text.replace(SPACE_SEPARATORS, "");
  if (s === "" || s === "+" || s === "-") return null;
  if (s.startsWith("−")) s = "-" + s.slice(1); // Unicode minus sign

  let normalized: string;
  if (decimal === ".") {
    if (DOT_THOUSANDS.test(s)) normalized = s.replace(/,/g, "");
    else if (DOT_DECIMAL.test(s)) normalized = s;
    else return null;
  } else {
    if (COMMA_THOUSANDS.test(s)) normalized = s.replace(/\./g, "").replace(",", ".");
    else if (COMMA_DECIMAL.test(s)) normalized = s.replace(",", ".");
    else return null;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Guess whether numbers in the table use a decimal comma or a decimal point.
 *
 * Unambiguous evidence:
 *   decimal comma:  "3,14"  "1.234,5"   (not exactly 3 digits after the comma)
 *   decimal point:  "3.14"  "1,234.5"   (not exactly 3 digits after the dot)
 * "1,234" / "1.234" are ambiguous (thousands or decimals) and are ignored.
 * With no unambiguous evidence, a semicolon-delimited file suggests the
 * European convention (decimal comma); otherwise a decimal point. The user
 * can always override the guess.
 */
export function detectDecimalSeparator(cells: Iterable<Cell>, delimiter?: Delimiter): DecimalSeparator {
  let comma = 0;
  let dot = 0;
  // "1,234" / "1.234": a 1–3 digit group not starting with 0, then exactly 3 digits.
  const AMBIGUOUS_COMMA = /^[-+−]?[1-9]\d{0,2},\d{3}$/;
  const AMBIGUOUS_DOT = /^[-+−]?[1-9]\d{0,2}\.\d{3}$/;
  for (const cell of cells) {
    if (!cell) continue;
    const s = cell.replace(SPACE_SEPARATORS, "");
    if (!/^[-+−]?[\d.,]+(e[-+]?\d+)?$/i.test(s) || !/\d/.test(s)) continue;
    const hasBoth = s.includes(",") && s.includes(".");
    if (hasBoth && COMMA_THOUSANDS.test(s.replace("−", "-"))) comma++;
    else if (hasBoth && DOT_THOUSANDS.test(s.replace("−", "-"))) dot++;
    else if (AMBIGUOUS_COMMA.test(s) || AMBIGUOUS_DOT.test(s)) continue;
    else if (/^[-+−]?\d*,\d+(e[-+]?\d+)?$/i.test(s)) comma++;
    else if (/^[-+−]?\d*\.\d+(e[-+]?\d+)?$/i.test(s)) dot++;
  }
  if (comma !== dot) return comma > dot ? "," : ".";
  return delimiter === ";" ? "," : ".";
}
