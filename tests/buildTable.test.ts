import { describe, expect, it } from "vitest";
import { buildTable, detectHeader, makeHeaders } from "@/lib/data/buildTable";

const g = (text: string, d = ",") =>
  text
    .trim()
    .split("\n")
    .map((l) => l.split(d));

describe("buildTable", () => {
  it("builds a simple table and counts missing values", () => {
    const t = buildTable(g("date,rain\n2024-01-01,1.5\n2024-01-02,NA\n2024-01-03,"));
    expect(t.headers).toEqual(["date", "rain"]);
    expect(t.rows).toEqual([
      ["2024-01-01", "1.5"],
      ["2024-01-02", null],
      ["2024-01-03", null],
    ]);
    expect(t.missingCount).toBe(2);
    expect(t.hasHeader).toBe(true);
    expect(t.warnings).toEqual([]);
  });

  it("skips a metadata preamble above the table", () => {
    const t = buildTable(g("Station: Pegel X\nUnits: cm, m3/s\n\ndate,level,flow\n2024-01-01,1,2\n2024-01-02,3,4"));
    expect(t.headers).toEqual(["date", "level", "flow"]);
    expect(t.rows).toHaveLength(2);
    expect(t.skippedLines).toBe(3);
    expect(t.warnings[0]).toMatch(/Skipped 3 lines/);
  });

  it("pads short rows and warns about long ones", () => {
    const t = buildTable(g("a,b,c\n1,2,3\n4,5\n6,7,8,9\n10,11,12"));
    expect(t.rows[1]).toEqual(["4", "5", null]);
    expect(t.rows[2]).toEqual(["6", "7", "8"]);
    expect(t.warnings.join(" ")).toMatch(/1 row has more values .*line 4/);
  });

  it("drops empty trailing columns (trailing delimiters)", () => {
    const t = buildTable(g("a,b,\n1,2,\n3,4,"));
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(t.missingCount).toBe(0);
  });

  it("keeps a named column even if it is entirely empty", () => {
    const t = buildTable(g("a,b\n1,\n3,"));
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.missingCount).toBe(2);
  });

  it("detects a file without a header row", () => {
    const t = buildTable(g("2024-01-01,1.5\n2024-01-02,2\n2024-01-03,0"));
    expect(t.hasHeader).toBe(false);
    expect(t.headers).toEqual(["Column 1", "Column 2"]);
    expect(t.rows).toHaveLength(3);
  });

  it("respects an explicit header choice", () => {
    const t = buildTable(g("x,y\n1,2"), { hasHeader: false });
    expect(t.headers).toEqual(["Column 1", "Column 2"]);
    expect(t.rows[0]).toEqual(["x", "y"]);
  });

  it("does not treat header names like 'NA' as missing", () => {
    const t = buildTable(g("NA,value\n1,2\n3,4"));
    expect(t.headers).toEqual(["NA", "value"]);
  });

  it("applies extra missing tokens such as -999", () => {
    const t = buildTable(g("x\n1\n-999\n3"), { extraMissingTokens: ["-999"] });
    expect(t.rows.map((r) => r[0])).toEqual(["1", null, "3"]);
  });

  it("detects the decimal separator", () => {
    expect(buildTable(g("a;b\n1,5;2\n3,25;4", ";")).decimalSeparator).toBe(",");
    expect(buildTable(g("a,b\n1.5,2\n3.25,4")).decimalSeparator).toBe(".");
  });
});

describe("detectHeader", () => {
  it("recognises year-like column names in a wide table", () => {
    const rows = [
      ["Delta East", "4", "7"],
      ["Hill Valley", "2", "3"],
    ];
    expect(detectHeader(["district", "2019", "2020"], rows, ".")).toBe(true);
  });
  it("treats an all-text table as having a header", () => {
    expect(detectHeader(["a", "b"], [["x", "y"]], ".")).toBe(true);
  });
  it("sees a numeric first row as data", () => {
    expect(detectHeader(["1", "2"], [["3", "4"]], ".")).toBe(false);
  });
});

describe("makeHeaders", () => {
  it("fills blanks and de-duplicates", () => {
    expect(makeHeaders(["depth", null, "depth", "depth", ""], 5)).toEqual([
      "depth",
      "Column 2",
      "depth (2)",
      "depth (3)",
      "Column 5",
    ]);
  });
});
