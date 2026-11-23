import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkSpec, defaultSpec } from "@/lib/charts/builder";
import { inferColumns } from "@/lib/data/columns";
import { openFile, toTable } from "@/lib/data/loadFile";
import type { ChartKind } from "@/lib/engine/protocol";

const sample = (name: string) =>
  inferColumns(toTable(openFile(new Uint8Array(readFileSync(new URL(`../public/samples/${name}`, import.meta.url))), name)));

const ALL: ChartKind[] = ["line", "bar", "scatter", "histogram", "box", "heatmap"];

describe("defaultSpec", () => {
  it("can start every chart type for the crop dataset", () => {
    const cols = sample("temperature_crop_yield.csv");
    for (const kind of ALL) {
      const spec = defaultSpec(kind, cols);
      expect(spec?.chart).toBe(kind);
      expect(checkSpec(spec!, cols)).toBeNull();
    }
  });

  it("reuses the suggestion for a chart type when there is one", () => {
    expect(defaultSpec("line", sample("flood_events_by_district.csv"))).toEqual({
      chart: "line",
      options: { x: "year", y: ["flood_events"], group: "district" },
    });
  });

  it("falls back to the first fitting columns", () => {
    const spec = defaultSpec("bar", sample("flood_events_by_district.csv"));
    expect(spec?.options).toMatchObject({ x: "district" });
    expect(defaultSpec("heatmap", sample("daily_rainfall.csv"))).toEqual({
      chart: "heatmap",
      options: { columns: ["north_station_mm", "south_station_mm"], method: "pearson" },
    });
  });

  it("uses numbers as bar positions when there are no categories", () => {
    expect(defaultSpec("bar", sample("daily_rainfall.csv"))?.options).toMatchObject({ x: "north_station_mm" });
  });

  it("returns null when the data can't make the chart", () => {
    const textOnly = inferColumns({
      headers: ["a"],
      rows: [["x"], ["y"]],
      missingCount: 0,
      warnings: [],
      source: { fileName: "t", kind: "csv", decimalSeparator: ".", hasHeader: true, skippedLines: 0 },
    });
    expect(defaultSpec("scatter", textOnly)).toBeNull();
    expect(defaultSpec("histogram", textOnly)).toBeNull();
  });
});

describe("checkSpec", () => {
  const cols = sample("daily_rainfall.csv");
  it("accepts a complete setup", () => {
    expect(checkSpec({ chart: "line", options: { x: "date", y: ["north_station_mm"] } }, cols)).toBeNull();
  });
  it("reports missing columns and empty selections", () => {
    expect(checkSpec({ chart: "line", options: { x: "date", y: ["gone"] } }, cols)).toMatch(/not found: gone/);
    expect(checkSpec({ chart: "line", options: { x: "date", y: [] } }, cols)).toMatch(/at least one/);
    expect(checkSpec({ chart: "heatmap", options: { columns: ["north_station_mm"], method: "pearson" } }, cols)).toMatch(
      /two/,
    );
  });
});
