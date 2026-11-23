/**
 * Spreadsheet (xlsx, xls, ods) -> grid of raw text cells, using SheetJS.
 *
 * Numbers become plain strings with a decimal point. Date cells become ISO
 * strings ("2024-03-01" or "2024-03-01T14:30:00"), converted from Excel's day
 * serial numbers without involving the browser's time zone.
 */
import * as XLSX from "xlsx";
import { DataFileError } from "./types";

export interface Workbook {
  sheetNames: string[];
  sheet(name: string): string[][];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel date serial (+ number format) -> ISO string, time-zone independent. */
function excelDateToIso(serial: number, date1904: boolean): string | null {
  const p = XLSX.SSF.parse_date_code(serial, { date1904 });
  if (!p) return null;
  const date = `${String(p.y).padStart(4, "0")}-${pad(p.m)}-${pad(p.d)}`;
  if (p.H === 0 && p.M === 0 && Math.round(p.S) === 0) return date;
  return `${date}T${pad(p.H)}:${pad(p.M)}:${pad(Math.round(p.S))}`;
}

function cellText(cell: XLSX.CellObject | undefined, date1904: boolean): string {
  if (!cell || cell.v === undefined || cell.v === null) return "";
  switch (cell.t) {
    case "n": {
      const v = cell.v as number;
      if (cell.z && XLSX.SSF.is_date(cell.z)) return excelDateToIso(v, date1904) ?? String(v);
      return String(v);
    }
    case "d":
      return (cell.v as Date).toISOString().replace(/T00:00:00(\.000)?Z$/, "").replace(/\.000Z$/, "");
    case "b":
      return cell.v ? "TRUE" : "FALSE";
    case "e":
      return cell.w ?? "#N/A"; // Excel error such as #DIV/0! (treated as missing)
    default:
      return String(cell.v);
  }
}

export function readWorkbook(bytes: Uint8Array): Workbook {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, { type: "array", cellDates: false, cellNF: true, dense: false });
  } catch {
    throw new DataFileError(
      "spreadsheet",
      "This spreadsheet could not be opened. It may be damaged or password-protected. Try saving it again from Excel, or export the sheet as CSV.",
    );
  }
  if (wb.SheetNames.length === 0) throw new DataFileError("empty", "This workbook has no sheets.");
  const date1904 = Boolean(wb.Workbook?.WBProps?.date1904);

  return {
    sheetNames: wb.SheetNames,
    sheet(name: string): string[][] {
      const ws = wb.Sheets[name];
      if (!ws || !ws["!ref"]) return [];
      const range = XLSX.utils.decode_range(ws["!ref"]);
      const grid: string[][] = [];
      for (let r = range.s.r; r <= range.e.r; r++) {
        const row: string[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          row.push(cellText(ws[XLSX.utils.encode_cell({ r, c })], date1904));
        }
        grid.push(row);
      }
      return grid;
    },
  };
}
