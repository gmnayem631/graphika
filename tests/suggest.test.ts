import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inferColumns } from "@/lib/data/columns";
import { openFile, toTable } from "@/lib/data/loadFile";
import type { Cell, RawTable } from "@/lib/data/types";
import { columnRoles, specColumns, suggestCharts } from "@/lib/charts/suggest";

const sampleColumns = (name: string, sheetName?: string) =>
  inferColumns(
    toTable(openFile(new Uint8Array(readFileSync(new URL(`../public/samples/${name}`, import.meta.url))), name), {
      sheetName,
    }),
  );

function columnsOf(headers: string[], rows: Cell[][]) {
  const table: RawTable = {
    headers,
    rows,
    missingCount: 0,
    warnings: [],
    source: { fileName: "t.csv", kind: "csv", decimalSeparator: ".", hasHeader: true, skippedLines: 0 },
  };
  return inferColumns(table);
}

const kinds = (cols: ReturnType<typeof sampleColumns>) => suggestCharts(cols).map((s) => s.spec.chart);

describe("columnRoles", () => {
  it("separates years, measures, categories and small groups", () => {
    const roles = columnRoles(sampleColumns("flood_events_by_district.csv"));
    expect(roles.years.map((c) => c.name)).toEqual(["year"]);
    expect(roles.measures.map((c) => c.name)).toEqual(["flood_events", "people_affected"]);
    expect(roles.categories.map((c) => c.name)).toEqual(["district"]);
    expect(roles.groups.map((c) => c.name)).toEqual(["district"]);
  });

  it("ignores ID-like and empty columns", () => {
    const roles = columnRoles(sampleColumns("temperature_crop_yield.csv"));
    expect(roles.categories.map((c) => c.name)).toEqual(["region", "irrigated"]); // not site_id
  });
});

describe("suggestCharts on the sample datasets", () => {
  it("daily rainfall: time series first, then station comparisons", () => {
    const s = suggestCharts(sampleColumns("daily_rainfall.csv"));
    expect(s[0].spec).toEqual({
      chart: "line",
      options: { x: "date", y: ["north_station_mm", "south_station_mm"] },
    });
    expect(kinds(sampleColumns("daily_rainfall.csv"))).toEqual(["line", "scatter", "histogram", "box"]);
  });

  it("flood events: one line per district over years, totals per district", () => {
    const s = suggestCharts(sampleColumns("flood_events_by_district.csv"));
    expect(s[0].spec).toEqual({
      chart: "line",
      options: { x: "year", y: ["flood_events"], group: "district" },
    });
    const bar = s.find((x) => x.spec.chart === "bar");
    expect(bar?.spec.options).toMatchObject({ x: "district", y: ["flood_events"], agg: "sum" });
    expect(bar?.title).toBe("Total flood_events by district");
    expect(s.some((x) => x.spec.chart === "box")).toBe(true);
  });

  it("temperature vs yield: bar of averages, box, scatter with trendline coloured by region", () => {
    const s = suggestCharts(sampleColumns("temperature_crop_yield.csv"));
    expect(s[0].spec).toMatchObject({ chart: "bar", options: { x: "region", y: ["mean_temp_c"], agg: "mean" } });
    const scatter = s.find((x) => x.spec.chart === "scatter");
    expect(scatter?.spec.options).toEqual({ x: "mean_temp_c", y: "yield_t_ha", group: "region", trendline: true });
    expect(s.find((x) => x.spec.chart === "box")?.spec.options).toMatchObject({ group: "region" });
  });

  it("river gauge: time series of all three measurements and a correlation matrix", () => {
    const s = suggestCharts(sampleColumns("river_gauge_europe.csv"));
    expect(s[0].spec.options).toMatchObject({ x: "Datum", y: ["Wasserstand_cm", "Abfluss_m3s", "Wassertemperatur_°C"] });
    expect(s.some((x) => x.spec.chart === "heatmap")).toBe(true);
  });

  it("Excel daily rainfall sheet: time series", () => {
    expect(suggestCharts(sampleColumns("flood_and_rainfall.xlsx", "Daily rainfall"))[0].spec.chart).toBe("line");
  });
});

describe("suggestCharts edge cases", () => {
  it("only categories: counts", () => {
    const cols = columnsOf(
      ["hazard", "severity"],
      [
        ["flood", "high"],
        ["storm", "low"],
        ["flood", "low"],
      ],
    );
    const s = suggestCharts(cols);
    expect(s[0].spec).toEqual({ chart: "bar", options: { x: "hazard", y: [], agg: "count" } });
    expect(s[1].spec.options).toMatchObject({ group: "severity" });
  });

  it("a single numeric column: histogram only", () => {
    expect(kinds(columnsOf(["v"], [["1"], ["2"], ["5"]]))).toEqual(["histogram"]);
  });

  it("one value per category: no aggregation wording and no box plot", () => {
    const s = suggestCharts(
      columnsOf(
        ["district", "population"],
        [
          ["A", "100"],
          ["B", "200"],
        ],
      ),
    );
    expect(s[0].title).toBe("population by district");
    expect(s.some((x) => x.spec.chart === "box")).toBe(false);
  });

  it("negative or fractional values are averaged, not summed", () => {
    const s = suggestCharts(
      columnsOf(
        ["site", "anomaly"],
        [
          ["A", "-0.5"],
          ["A", "0.2"],
          ["B", "1.1"],
        ],
      ),
    );
    expect(s[0].spec.options).toMatchObject({ agg: "mean" });
  });

  it("nothing usable: no suggestions", () => {
    expect(suggestCharts(columnsOf(["id"], [["a"], ["b"]]))).toEqual([]);
  });

  it("ids are unique and stable", () => {
    const a = suggestCharts(sampleColumns("temperature_crop_yield.csv"));
    const b = suggestCharts(sampleColumns("temperature_crop_yield.csv"));
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
    expect(new Set(a.map((s) => s.id)).size).toBe(a.length);
  });
});

describe("specColumns", () => {
  it("lists the columns each chart needs", () => {
    expect(specColumns({ chart: "line", options: { x: "d", y: ["a", "b"], group: "g" } })).toEqual(["d", "a", "b", "g"]);
    expect(specColumns({ chart: "scatter", options: { x: "a", y: "b", trendline: false } })).toEqual(["a", "b"]);
    expect(specColumns({ chart: "heatmap", options: { columns: ["a", "b", "c"], method: "pearson" } })).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
