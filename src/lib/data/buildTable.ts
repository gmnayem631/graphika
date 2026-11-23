/**
 * Turn a grid of raw text cells (from a CSV or a spreadsheet) into a clean,
 * rectangular table:
 *   - skip blank rows and "preamble" lines above the table (titles, station
 *     metadata, notes) that don't have the table's shape
 *   - detect whether the first row holds column names
 *   - pad short rows, trim over-long rows (with a warning)
 *   - make column names non-empty and unique
 *   - drop columns that are completely empty
 *   - turn missing-value markers into null
 */
import { cleanCell, detectDecimalSeparator, makeMissingSet, parseNumber } from "./normalize";
import type { Cell, DecimalSeparator, Delimiter } from "./types";

export interface BuildOptions {
  decimalSeparator?: DecimalSeparator;
  hasHeader?: boolean;
  extraMissingTokens?: string[];
  /** Used only to break ties when guessing the decimal separator. */
  delimiter?: Delimiter;
}

export interface BuiltTable {
  headers: string[];
  rows: Cell[][];
  hasHeader: boolean;
  skippedLines: number;
  decimalSeparator: DecimalSeparator;
  missingCount: number;
  warnings: string[];
}

/** Number of cells up to and including the last non-empty one. */
function width(row: string[]): number {
  for (let i = row.length - 1; i >= 0; i--) if (row[i].trim() !== "") return i + 1;
  return 0;
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = 0;
  let bestCount = -1;
  for (const [v, c] of counts) if (c > bestCount || (c === bestCount && v > best)) [best, bestCount] = [v, c];
  return best;
}

const DATE_LIKE = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/;
const YEAR_LIKE = /^(1[89]|20|21)\d{2}$/;

/**
 * Decide whether `first` is a header row by comparing it with the rows below.
 * A column whose values are numbers/dates but whose first cell isn't is strong
 * evidence of a header. Year-like headers ("2019", "2020") in a wide table are
 * also recognised.
 */
export function detectHeader(first: Cell[], below: Cell[][], decimal: DecimalSeparator): boolean {
  const sample = below.slice(0, 50);
  let headerEvidence = 0;
  let dataEvidence = 0;
  for (let c = 0; c < first.length; c++) {
    const values = sample.map((r) => r[c]).filter((v): v is string => v !== null);
    if (values.length === 0) continue;
    const isNum = (v: string) => parseNumber(v, decimal) !== null;
    const numericCol = values.filter(isNum).length / values.length > 0.8;
    const dateCol = values.filter((v) => DATE_LIKE.test(v)).length / values.length > 0.8;
    const top = first[c];
    if (numericCol) {
      if (top === null) continue;
      if (!isNum(top)) headerEvidence++;
      else if (YEAR_LIKE.test(top) && !values.every((v) => YEAR_LIKE.test(v))) headerEvidence++;
      else dataEvidence++;
    } else if (dateCol) {
      if (top !== null && !DATE_LIKE.test(top)) headerEvidence++;
      else dataEvidence++;
    }
  }
  if (headerEvidence > 0) return true;
  if (dataEvidence > 0) return false;
  // All columns are text: by far most files have a header row.
  return true;
}

/** Non-empty, unique column names: "" -> "Column 3", duplicates -> "depth (2)". */
export function makeHeaders(raw: Cell[], count: number): string[] {
  const seen = new Map<string, number>();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const base = raw[i]?.trim() || `Column ${i + 1}`;
    let name = base;
    let n = seen.get(base) ?? 0;
    while (out.includes(name)) name = `${base} (${++n + 1})`;
    seen.set(base, n);
    out.push(name);
  }
  return out;
}

function listRows(rows: number[]): string {
  const shown = rows.slice(0, 5).join(", ");
  return rows.length > 5 ? `${shown} and ${rows.length - 5} more` : shown;
}

export function buildTable(grid: string[][], opts: BuildOptions = {}): BuiltTable {
  const warnings: string[] = [];
  const missing = makeMissingSet(opts.extraMissingTokens);

  // Keep original 1-based line numbers for messages; drop blank rows.
  const lines = grid
    .map((cells, i) => ({ cells, line: i + 1, width: width(cells) }))
    .filter((l) => l.width > 0);
  if (lines.length === 0) return emptyTable(opts);

  // Preamble: the table starts at the first line (within the first 50) that is
  // as wide as the widest of the ~20 lines after it. Titles and notes above a
  // table are narrower ("Station: X", "Units: cm, m3/s"); a header row
  // normally names every column, so it is full width.
  let start = 0;
  const limit = Math.min(lines.length, 50);
  while (start < limit) {
    const widths = lines.slice(start, start + 20).map((l) => l.width);
    // Widest width seen at least twice, so one over-long row doesn't count.
    const repeated = widths.filter((w, i) => widths.indexOf(w) !== i);
    const target = widths.length <= 2 || repeated.length === 0 ? Math.max(...widths) : Math.max(...repeated);
    if (lines[start].width >= target) break;
    start++;
  }
  if (start >= limit) start = 0;
  const skippedLines = lines[start].line - 1;

  // Table width: the first row's, or the most common width below it if wider
  // (a header with blank trailing names). Rarer, longer rows get truncated.
  const tableWidth = Math.max(lines[start].width, mode(lines.slice(start + 1).map((l) => l.width)));

  // Clean cells.
  let missingCount = 0;
  const tooLong: number[] = [];
  const grid2: Cell[][] = lines.slice(start).map(({ cells, line, width: w }) => {
    if (w > tableWidth) tooLong.push(line);
    const row: Cell[] = [];
    for (let c = 0; c < tableWidth; c++) row.push(cleanCell(cells[c] ?? "", missing));
    return row;
  });

  const decimalSeparator =
    opts.decimalSeparator ?? detectDecimalSeparator(grid2.slice(1, 2000).flat(), opts.delimiter);
  const hasHeader = opts.hasHeader ?? detectHeader(grid2[0], grid2.slice(1), decimalSeparator);

  // Header cells are names, not data: re-read them without missing-value rules.
  const headerRaw: Cell[] = hasHeader
    ? Array.from({ length: tableWidth }, (_, c) => (lines[start].cells[c] ?? "").trim() || null)
    : [];
  let rows = hasHeader ? grid2.slice(1) : grid2;
  for (const r of rows) for (const v of r) if (v === null) missingCount++;
  let headers = makeHeaders(headerRaw, tableWidth);

  // Drop columns with no name and no data (e.g. trailing delimiters).
  const keep = headers.map((_, c) => headerRaw[c] != null || rows.some((r) => r[c] !== null));
  if (keep.includes(false)) {
    const removedMissing = rows.reduce((acc, r) => acc + r.filter((v, c) => !keep[c] && v === null).length, 0);
    missingCount -= removedMissing;
    headers = makeHeaders(
      headerRaw.filter((_, c) => keep[c]),
      keep.filter(Boolean).length,
    );
    rows = rows.map((r) => r.filter((_, c) => keep[c]));
  }

  if (skippedLines > 0) {
    warnings.push(
      `Skipped ${skippedLines} line${skippedLines > 1 ? "s" : ""} at the top that didn't look like part of the table (e.g. a title or notes).`,
    );
  }
  if (tooLong.length > 0) {
    warnings.push(
      `${tooLong.length} row${tooLong.length > 1 ? "s have" : " has"} more values than there are columns (line ${listRows(tooLong)}); the extra values were ignored. Check the delimiter setting if this looks wrong.`,
    );
  }

  return { headers, rows, hasHeader, skippedLines, decimalSeparator, missingCount, warnings };
}

function emptyTable(opts: BuildOptions): BuiltTable {
  return {
    headers: [],
    rows: [],
    hasHeader: opts.hasHeader ?? true,
    skippedLines: 0,
    decimalSeparator: opts.decimalSeparator ?? ".",
    missingCount: 0,
    warnings: [],
  };
}
