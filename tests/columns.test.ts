import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferColumns, toTypedColumns } from "@/lib/data/columns";
import { openFile, toTable } from "@/lib/data/loadFile";
import type { Cell, RawTable } from "@/lib/data/types";

function table(headers: string[], rows: Cell[][], decimal: "." | "," = "."): RawTable {
  return {
    headers,
    rows,
    missingCount: 0,
    warnings: [],
    source: { fileName: "t.csv", kind: "csv", decimalSeparator: decimal, hasHeader: true, skippedLines: 0 },
  };
}
const sample = (name: string) =>
  toTable(openFile(new Uint8Array(readFileSync(new URL(`../public/samples/${name}`, import.meta.url))), name));
const typesOf = (t: RawTable) => Object.fromEntries(inferColumns(t).map((c) => [c.name, c.type]));

describe("inferColumns", () => {
  it("detects numeric, categorical and datetime", () => {
    const t = table(
      ["date", "rain", "station"],
      [
        ["2024-01-01", "1.5", "A"],
        ["2024-01-02", null, "B"],
        ["2024-01-03", "0", "A"],
      ],
    );
    const cols = inferColumns(t);
    expect(cols.map((c) => c.type)).toEqual(["datetime", "numeric", "categorical"]);
    expect(cols[0]).toMatchObject({ dateFormat: "iso", summary: { min: "2024-01-01", max: "2024-01-03" } });
    expect(cols[1].summary).toMatchObject({ count: 2, missing: 1, invalid: 0, min: 0, max: 1.5 });
    expect(cols[2].summary.topCategories).toEqual([
      { value: "A", count: 2 },
      { value: "B", count: 1 },
    ]);
  });

  it("tolerates a few stray values (>= 90% rule) and reports them", () => {
    const values: Cell[][] = Array.from({ length: 19 }, (_, i) => [String(i)]);
    values.push(["<0.5"]);
    const [col] = inferColumns(table(["conc"], values));
    expect(col.type).toBe("numeric");
    expect(col.summary.invalid).toBe(1);
    expect(col.summary.invalidExamples).toEqual(["<0.5"]);
  });

  it("falls back to categorical below the threshold", () => {
    const [col] = inferColumns(table(["x"], [["1"], ["2"], ["three"], ["four"]]));
    expect(col.type).toBe("categorical");
  });

  it("uses the table's decimal separator", () => {
    const [col] = inferColumns(table(["v"], [["1,5"], ["2,25"]], ","));
    expect(col.type).toBe("numeric");
    expect(col.summary.max).toBe(2.25);
  });

  it("flags year-like and all-unique columns", () => {
    const cols = inferColumns(
      table(
        ["year", "id"],
        [
          ["2019", "S1"],
          ["2020", "S2"],
        ],
      ),
    );
    expect(cols[0].summary.yearLike).toBe(true);
    expect(cols[1].summary.allUnique).toBe(true);
  });

  it("treats an empty column as categorical", () => {
    expect(inferColumns(table(["x"], [[null], [null]]))[0].type).toBe("categorical");
  });

  it("applies user overrides and counts values that don't fit", () => {
    const t = table(["code"], [["1"], ["2"], ["x"]]);
    const [asNumber] = inferColumns(t, { code: { type: "numeric" } });
    expect(asNumber).toMatchObject({ detectedType: "categorical", type: "numeric", summary: { invalid: 1 } });

    const [cat] = inferColumns(table(["n"], [["1"], ["2"]]), { n: { type: "categorical" } });
    expect(cat.type).toBe("categorical");
  });

  it("lets the user switch day/month order", () => {
    const t = table(["d"], [["05/06/2024"], ["07/06/2024"]]);
    const [auto] = inferColumns(t);
    expect(auto).toMatchObject({ type: "datetime", dateFormat: "dmy", ambiguousDayMonth: true });
    const [mdy] = inferColumns(t, { d: { dateFormat: "mdy" } });
    expect(mdy.summary.min).toBe("2024-05-06");
  });
});

describe("sample datasets", () => {
  it("daily_rainfall.csv", () => {
    expect(typesOf(sample("daily_rainfall.csv"))).toEqual({
      date: "datetime",
      north_station_mm: "numeric",
      south_station_mm: "numeric",
    });
  });

  it("flood_events_by_district.csv", () => {
    const cols = inferColumns(sample("flood_events_by_district.csv"));
    expect(Object.fromEntries(cols.map((c) => [c.name, c.type]))).toEqual({
      district: "categorical",
      year: "numeric",
      flood_events: "numeric",
      people_affected: "numeric",
    });
    expect(cols[1].summary.yearLike).toBe(true);
  });

  it("temperature_crop_yield.csv", () => {
    expect(typesOf(sample("temperature_crop_yield.csv"))).toEqual({
      site_id: "categorical",
      region: "categorical",
      mean_temp_c: "numeric",
      yield_t_ha: "numeric",
      irrigated: "categorical",
    });
  });

  it("river_gauge_europe.csv: DD.MM.YYYY and decimal commas", () => {
    const t = sample("river_gauge_europe.csv");
    const cols = inferColumns(t);
    expect(cols.map((c) => c.type)).toEqual(["datetime", "numeric", "numeric", "numeric"]);
    expect(cols[0]).toMatchObject({ dateFormat: "dmy", ambiguousDayMonth: false });
    const typed = toTypedColumns(t, cols);
    expect(typed[0].values[0]).toBe("2024-01-01");
    expect(typed[1].values[0]).toBe(181.7);
  });

  it("flood_and_rainfall.xlsx: Excel dates", () => {
    const opened = openFile(
      new Uint8Array(readFileSync(new URL("../public/samples/flood_and_rainfall.xlsx", import.meta.url))),
      "x.xlsx",
    );
    const cols = inferColumns(toTable(opened, { sheetName: "Daily rainfall" }));
    expect(cols.map((c) => c.type)).toEqual(["datetime", "numeric"]);
  });
});

describe("toTypedColumns", () => {
  it("converts values and turns non-fitting ones into null", () => {
    const t = table(
      ["d", "v"],
      [
        ["2024-01-01", "1.5"],
        ["oops", "n/a?"],
        [null, null],
      ],
    );
    const typed = toTypedColumns(t, inferColumns(t, { d: { type: "datetime" }, v: { type: "numeric" } }));
    expect(typed).toEqual([
      { name: "d", type: "datetime", values: ["2024-01-01", null, null] },
      { name: "v", type: "numeric", values: [1.5, null, null] },
    ]);
  });
});
