/** Shared types for loading a data file into a table. */

/** A cell after cleaning: trimmed text, or null when the value is missing. */
export type Cell = string | null;

export type FileKind = "csv" | "xlsx";

export type Delimiter = "," | ";" | "\t" | "|";
export type DecimalSeparator = "." | ",";

/** Where the table came from and what we detected about it. */
export interface SourceInfo {
  fileName: string;
  kind: FileKind;
  /** Text encoding (delimited files only), e.g. "utf-8", "windows-1252". */
  encoding?: string;
  delimiter?: Delimiter;
  decimalSeparator: DecimalSeparator;
  /** Spreadsheets: the sheet shown, and all sheets in the workbook. */
  sheetName?: string;
  sheetNames?: string[];
  /** Whether the first row was used as column names. */
  hasHeader: boolean;
  /** Lines skipped above the table (e.g. instrument metadata). */
  skippedLines: number;
}

/**
 * A rectangular table of cleaned text cells. Column types (numeric / date /
 * category) are inferred from this in a later step.
 */
export interface RawTable {
  headers: string[];
  /** rows[r][c]; every row has headers.length cells. */
  rows: Cell[][];
  source: SourceInfo;
  /** Number of cells that were empty or a missing-value marker (NA, -, …). */
  missingCount: number;
  /** Friendly notes about things we fixed or guessed. */
  warnings: string[];
}

/** User-adjustable parsing choices; anything left undefined is auto-detected. */
export interface ParseOptions {
  delimiter?: Delimiter;
  decimalSeparator?: DecimalSeparator;
  hasHeader?: boolean;
  sheetName?: string;
  /** Extra values to treat as missing, e.g. ["-999", "-9999"]. */
  extraMissingTokens?: string[];
}

export type DataFileErrorCode =
  | "empty"
  | "too-large"
  | "binary"
  | "unsupported"
  | "no-table"
  | "spreadsheet";

/** An error whose message is written for the user and can be shown as-is. */
export class DataFileError extends Error {
  constructor(
    readonly code: DataFileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DataFileError";
  }
}
