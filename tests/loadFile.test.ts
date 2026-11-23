import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { openFile, toTable } from "@/lib/data/loadFile";
import { DataFileError, type ParseOptions } from "@/lib/data/types";

const sample = (name: string) => new Uint8Array(readFileSync(new URL(`../public/samples/${name}`, import.meta.url)));
const utf8 = (s: string) => new TextEncoder().encode(s);
const load = (bytes: Uint8Array, name: string, opts: ParseOptions = {}) => toTable(openFile(bytes, name), opts);

describe("sample datasets", () => {
  it("daily_rainfall.csv", () => {
    const t = load(sample("daily_rainfall.csv"), "daily_rainfall.csv");
    expect(t.headers).toEqual(["date", "north_station_mm", "south_station_mm"]);
    expect(t.rows).toHaveLength(731);
    expect(t.source).toMatchObject({ kind: "csv", encoding: "utf-8", delimiter: ",", decimalSeparator: "." });
    expect(t.missingCount).toBeGreaterThan(0);
  });

  it("river_gauge_europe.csv (semicolon, decimal comma, Latin-1, preamble)", () => {
    const t = load(sample("river_gauge_europe.csv"), "river_gauge_europe.csv");
    expect(t.headers).toEqual(["Datum", "Wasserstand_cm", "Abfluss_m3s", "Wassertemperatur_°C"]);
    expect(t.rows).toHaveLength(366);
    expect(t.rows[0][0]).toBe("01.01.2024");
    expect(t.source).toMatchObject({
      encoding: "windows-1252",
      delimiter: ";",
      decimalSeparator: ",",
      skippedLines: 3,
      hasHeader: true,
    });
  });

  it("flood_and_rainfall.xlsx: sheets, title row and Excel dates", () => {
    const opened = openFile(sample("flood_and_rainfall.xlsx"), "flood_and_rainfall.xlsx");
    const events = toTable(opened);
    expect(events.source.sheetNames).toEqual(["Flood events", "Daily rainfall"]);
    expect(events.headers).toEqual(["district", "year", "flood_events", "people_affected"]);
    expect(events.source.skippedLines).toBe(2);
    expect(events.rows).toHaveLength(60);

    const rain = toTable(opened, { sheetName: "Daily rainfall" });
    expect(rain.headers).toEqual(["date", "rainfall_mm"]);
    expect(rain.rows[0][0]).toBe("2024-06-01");
    expect(rain.rows[89][0]).toBe("2024-08-29");
  });
});

describe("spreadsheets", () => {
  it("converts date-times and keeps numbers with a decimal point", () => {
    const ws = XLSX.utils.aoa_to_sheet([["time", "value"]]);
    // 2024-03-01 14:30 as an Excel serial number.
    XLSX.utils.sheet_add_aoa(ws, [[{ t: "n", v: 45352 + 14.5 / 24, z: "yyyy-mm-dd hh:mm" }, 1.25]], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S1");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const t = load(bytes, "x.xlsx");
    expect(t.rows[0]).toEqual(["2024-03-01T14:30:00", "1.25"]);
    expect(t.source.decimalSeparator).toBe(".");
  });

  it("reads an HTML table saved as .xls (common portal export)", () => {
    const html = "<table><tr><td>a</td><td>b</td></tr><tr><td>1</td><td>2</td></tr></table>";
    const t = load(utf8(html), "export.xls");
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.rows).toEqual([["1", "2"]]);
  });
});

describe("friendly errors", () => {
  function expectError(fn: () => unknown, code: string, pattern: RegExp) {
    let caught: unknown;
    try {
      fn();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(DataFileError);
    expect((caught as DataFileError).code).toBe(code);
    expect((caught as Error).message).toMatch(pattern);
  }

  it("empty file", () => expectError(() => openFile(new Uint8Array(), "a.csv"), "empty", /empty/));
  it("whitespace-only file", () => expectError(() => openFile(utf8("\n \n"), "a.csv"), "empty", /empty/));
  it("PDF", () => expectError(() => openFile(utf8("%PDF-1.7 ..."), "table.pdf"), "unsupported", /PDF/));
  it("image", () =>
    expectError(() => openFile(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2]), "x.png"), "unsupported", /image/));
  it("NetCDF", () => expectError(() => openFile(utf8("CDF"), "era5.nc"), "unsupported", /NetCDF/));
  it("binary junk", () =>
    expectError(() => openFile(new Uint8Array(500).map((_, i) => i % 5), "a.csv"), "unsupported", /look like/));
  it("header only", () => expectError(() => load(utf8("a,b,c\n"), "a.csv"), "no-table", /header row/));
  it("too large", () => expectError(() => openFile(new Uint8Array(51 * 1024 * 1024), "big.csv"), "too-large", /51 MB/));
});

describe("warnings", () => {
  it("suggests changing the separator when only one column is found", () => {
    const t = load(utf8("a b c\n1 2 3\n"), "a.txt");
    expect(t.warnings.join(" ")).toMatch(/Only one column/);
  });
});
