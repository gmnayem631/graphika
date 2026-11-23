/**
 * Column type detection (numeric / categorical / datetime) and conversion of
 * the cleaned text table into typed columns for the chart engine.
 *
 * Rule: a type is chosen when at least 90% of the non-missing values fit it,
 * checking dates first, then numbers; otherwise the column is categorical.
 * Values that don't fit the chosen type are counted ("invalid") and treated as
 * missing when plotting — the UI tells the user how many.
 */
import { detectDateFormat, parseDate, type DateFormatId } from "./dates";
import { parseNumber } from "./normalize";
import type { Cell, ColumnType, DecimalSeparator, RawTable } from "./types";

export const TYPE_THRESHOLD = 0.9;

export const TYPE_LABELS: Record<ColumnType, string> = {
  numeric: "Number",
  categorical: "Category",
  datetime: "Date / time",
};

export interface ColumnSummary {
  /** Non-missing values. */
  count: number;
  missing: number;
  /** Non-missing values that don't fit the column's type. */
  invalid: number;
  /** Up to 3 examples of values that don't fit. */
  invalidExamples: string[];
  unique: number;
  /** numeric: min/max; datetime: first/last ISO date. */
  min?: number | string;
  max?: number | string;
  /** categorical: most frequent categories. */
  topCategories?: { value: string; count: number }[];
  /** All values are whole numbers between 1800 and 2100. */
  yearLike?: boolean;
  /** Every value is different (an ID / label column). */
  allUnique?: boolean;
}

export interface ColumnInfo {
  index: number;
  name: string;
  /** What we detected. */
  detectedType: ColumnType;
  detectedDateFormat?: DateFormatId;
  /** What is used (detected, unless the user changed it). */
  type: ColumnType;
  dateFormat?: DateFormatId;
  /** DD/MM vs MM/DD couldn't be decided from the values alone. */
  ambiguousDayMonth: boolean;
  summary: ColumnSummary;
}

export interface ColumnOverride {
  type?: ColumnType;
  dateFormat?: DateFormatId;
}

function columnValues(table: RawTable, index: number): Cell[] {
  return table.rows.map((r) => r[index]);
}

/** Type detection looks at up to this many values (summaries use all of them). */
const DETECTION_SAMPLE = 5000;

function detect(allValues: string[], decimal: DecimalSeparator) {
  const values = allValues.slice(0, DETECTION_SAMPLE);
  if (values.length === 0) return { type: "categorical" as const, ambiguous: false };
  const dates = detectDateFormat(values);
  if (dates && dates.matched / values.length >= TYPE_THRESHOLD) {
    return { type: "datetime" as const, dateFormat: dates.format, ambiguous: dates.ambiguousDayMonth };
  }
  const numeric = values.filter((v) => parseNumber(v, decimal) !== null).length;
  if (numeric / values.length >= TYPE_THRESHOLD) return { type: "numeric" as const, ambiguous: false };
  return { type: "categorical" as const, ambiguous: false };
}

/** Parse one cell according to a column's type. undefined = doesn't fit. */
export function convertCell(
  value: string,
  type: ColumnType,
  decimal: DecimalSeparator,
  dateFormat?: DateFormatId,
): number | string | undefined {
  if (type === "numeric") return parseNumber(value, decimal) ?? undefined;
  if (type === "datetime") return dateFormat ? (parseDate(value, dateFormat) ?? undefined) : undefined;
  return value;
}

function summarize(
  cells: Cell[],
  type: ColumnType,
  decimal: DecimalSeparator,
  dateFormat?: DateFormatId,
): ColumnSummary {
  const present = cells.filter((v): v is string => v !== null);
  const converted: (number | string)[] = [];
  const invalidExamples: string[] = [];
  let invalid = 0;
  for (const v of present) {
    const c = convertCell(v, type, decimal, dateFormat);
    if (c === undefined) {
      invalid++;
      if (invalidExamples.length < 3 && !invalidExamples.includes(v)) invalidExamples.push(v);
    } else converted.push(c);
  }
  const unique = new Set(present).size;
  const summary: ColumnSummary = {
    count: present.length,
    missing: cells.length - present.length,
    invalid,
    invalidExamples,
    unique,
    allUnique: present.length > 1 && unique === present.length,
  };

  if (type === "numeric" && converted.length) {
    const nums = converted as number[];
    let min = Infinity;
    let max = -Infinity;
    for (const n of nums) {
      if (n < min) min = n;
      if (n > max) max = n;
    }
    summary.min = min;
    summary.max = max;
    summary.yearLike = nums.every((n) => Number.isInteger(n) && n >= 1800 && n <= 2100);
  } else if (type === "datetime" && converted.length) {
    const sorted = (converted as string[]).slice().sort();
    summary.min = sorted[0];
    summary.max = sorted[sorted.length - 1];
  } else if (type === "categorical") {
    const freq = new Map<string, number>();
    for (const v of present) freq.set(v, (freq.get(v) ?? 0) + 1);
    summary.topCategories = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }));
  }
  return summary;
}

/** Detect every column's type, then apply the user's overrides (keyed by column name). */
export function inferColumns(table: RawTable, overrides: Record<string, ColumnOverride> = {}): ColumnInfo[] {
  const decimal = table.source.decimalSeparator;
  return table.headers.map((name, index) => {
    const cells = columnValues(table, index);
    const present = cells.filter((v): v is string => v !== null);
    const detected = detect(present, decimal);
    const override = overrides[name] ?? {};
    const type = override.type ?? detected.type;

    let dateFormat: DateFormatId | undefined;
    if (type === "datetime") {
      // User-chosen format, else the detected one, else the best partial fit.
      dateFormat =
        override.dateFormat ?? detected.dateFormat ?? detectDateFormat(present.slice(0, DETECTION_SAMPLE))?.format ?? "iso";
    }
    return {
      index,
      name,
      detectedType: detected.type,
      detectedDateFormat: detected.dateFormat,
      type,
      dateFormat,
      ambiguousDayMonth: type === "datetime" && detected.ambiguous,
      summary: summarize(cells, type, decimal, dateFormat),
    };
  });
}

/** Typed column ready for the chart engine. Values that don't fit become null. */
export interface TypedColumn {
  name: string;
  type: ColumnType;
  values: (number | string | null)[];
}

export function toTypedColumns(table: RawTable, columns: ColumnInfo[]): TypedColumn[] {
  const decimal = table.source.decimalSeparator;
  return columns.map((col) => ({
    name: col.name,
    type: col.type,
    values: table.rows.map((r) => {
      const v = r[col.index];
      if (v === null) return null;
      return convertCell(v, col.type, decimal, col.dateFormat) ?? null;
    }),
  }));
}
