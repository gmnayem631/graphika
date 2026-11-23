/**
 * Entry point for reading a user's data file — entirely in the browser.
 *
 *   const opened = openFile(bytes, "rain.csv");   // detects type & encoding, may throw DataFileError
 *   const table  = toTable(opened, { hasHeader: false });  // cheap to re-run when options change
 */
import { buildTable } from "./buildTable";
import { decodeText, looksBinary, sniffSignature } from "./decode";
import { DELIMITER_NAMES, detectDelimiter, splitDelimited } from "./parseDelimited";
import { readWorkbook, type Workbook } from "./parseXlsx";
import { DataFileError, type FileKind, type ParseOptions, type RawTable } from "./types";

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".tab", ".txt", ".dat", ".xlsx", ".xlsm", ".xls", ".ods"];

const SPREADSHEET_EXT = /\.(xlsx|xlsm|xlsb|xls|ods)$/i;

export interface OpenedFile {
  fileName: string;
  kind: FileKind;
  /** Delimited files. */
  text?: string;
  encoding?: string;
  /** Spreadsheets. */
  workbook?: Workbook;
}

function unsupported(message: string): never {
  throw new DataFileError("unsupported", message);
}

export function openFile(bytes: Uint8Array, fileName: string): OpenedFile {
  if (bytes.length === 0) throw new DataFileError("empty", "This file is empty.");
  if (bytes.length > MAX_FILE_BYTES) {
    throw new DataFileError(
      "too-large",
      `This file is ${(bytes.length / 1024 / 1024).toFixed(0)} MB. Graphika works with files up to ${MAX_FILE_BYTES / 1024 / 1024} MB — try removing columns or rows you don't need to plot.`,
    );
  }

  const lower = fileName.toLowerCase();
  if (/\.(nc|nc4|netcdf|tif|tiff|geotiff|grib2?|hdf5?|h5)$/.test(lower)) {
    unsupported("NetCDF, GeoTIFF and other gridded formats aren't supported yet. Please export the data as CSV or Excel.");
  }
  if (/\.(docx?|pptx?|odt)$/.test(lower)) {
    unsupported("This is a document, not a data table. Copy the table into Excel and save it as .xlsx or .csv.");
  }

  const signature = sniffSignature(bytes);
  switch (signature) {
    case "pdf":
      unsupported("This is a PDF. Graphika needs the data itself: copy the table into Excel and save it as .xlsx or .csv.");
    case "png":
    case "jpeg":
    case "gif":
      unsupported("This is an image, not a data file. Please upload a CSV, TSV or Excel file.");
    case "gzip":
      unsupported("This file is compressed (.gz). Please unzip it first and upload the file inside.");
    case "zip":
    case "ole":
      if (/\.zip$/.test(lower)) unsupported("This is a ZIP archive. Please unzip it and upload the data file inside.");
      return { fileName, kind: "xlsx", workbook: readWorkbook(bytes) };
  }

  // Some portals export HTML or XML tables named ".xls"; SheetJS reads those.
  if (SPREADSHEET_EXT.test(lower)) {
    try {
      return { fileName, kind: "xlsx", workbook: readWorkbook(bytes) };
    } catch {
      // Not a workbook after all: fall through and try it as text.
    }
  }

  if (looksBinary(bytes)) {
    unsupported("This doesn't look like a text or spreadsheet file. Please upload a CSV, TSV or Excel file.");
  }
  const { text, encoding } = decodeText(bytes);
  if (text.trim() === "") throw new DataFileError("empty", "This file is empty.");
  return { fileName, kind: "csv", text, encoding };
}

export function toTable(file: OpenedFile, options: ParseOptions = {}): RawTable {
  let grid: string[][];
  const base = { fileName: file.fileName, kind: file.kind };
  let source: Omit<RawTable["source"], "decimalSeparator" | "hasHeader" | "skippedLines">;
  const warnings: string[] = [];

  if (file.workbook) {
    const sheetNames = file.workbook.sheetNames;
    const sheetName = options.sheetName && sheetNames.includes(options.sheetName) ? options.sheetName : sheetNames[0];
    grid = file.workbook.sheet(sheetName);
    source = { ...base, sheetName, sheetNames };
  } else {
    const text = file.text ?? "";
    const delimiter = options.delimiter ?? detectDelimiter(text);
    grid = splitDelimited(text, delimiter);
    source = { ...base, encoding: file.encoding, delimiter };
  }

  const built = buildTable(grid, {
    decimalSeparator: options.decimalSeparator ?? (file.workbook ? "." : undefined),
    hasHeader: options.hasHeader,
    extraMissingTokens: options.extraMissingTokens,
    delimiter: source.delimiter,
  });

  if (built.headers.length === 0) {
    const where = source.sheetName ? `The sheet “${source.sheetName}” is empty.` : "We couldn't find a table in this file.";
    throw new DataFileError("no-table", where);
  }
  if (built.rows.length === 0) {
    throw new DataFileError(
      "no-table",
      built.hasHeader
        ? "Only a header row was found — there are no data rows below it."
        : "We couldn't find any data rows in this file.",
    );
  }
  if (built.headers.length === 1 && source.delimiter) {
    warnings.push(
      `Only one column was found using ${DELIMITER_NAMES[source.delimiter]} as the separator. If your file has several columns, choose a different separator.`,
    );
  }

  return {
    headers: built.headers,
    rows: built.rows,
    missingCount: built.missingCount,
    warnings: [...built.warnings, ...warnings],
    source: {
      ...source,
      decimalSeparator: built.decimalSeparator,
      hasHeader: built.hasHeader,
      skippedLines: built.skippedLines,
    },
  };
}

/** Browser convenience: read a File object. */
export async function readFile(file: File): Promise<OpenedFile> {
  return openFile(new Uint8Array(await file.arrayBuffer()), file.name);
}
