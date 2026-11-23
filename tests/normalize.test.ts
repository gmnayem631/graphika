import { describe, expect, it } from "vitest";
import { cleanCell, detectDecimalSeparator, makeMissingSet, parseNumber } from "@/lib/data/normalize";

describe("parseNumber", () => {
  it.each([
    ["12", ".", 12],
    ["-3.5", ".", -3.5],
    ["+0.25", ".", 0.25],
    [".5", ".", 0.5],
    ["1,234.5", ".", 1234.5],
    ["1,234,567", ".", 1234567],
    ["1 234.5", ".", 1234.5],
    ["1.5e-3", ".", 0.0015],
    ["2E5", ".", 200000],
    ["−4.2", ".", -4.2], // Unicode minus
    ["3,14", ",", 3.14],
    ["1.234,5", ",", 1234.5],
    ["1 234,5", ",", 1234.5],
    ["1 234,5", ",", 1234.5], // no-break space thousands
    ["-0,5", ",", -0.5],
    ["1,5E-3", ",", 0.0015],
  ] as const)("%s with decimal %s -> %d", (text, dec, expected) => {
    expect(parseNumber(text, dec)).toBeCloseTo(expected, 10);
  });

  it.each([
    ["abc", "."],
    ["12 mm", "."],
    ["2024-01-05", "."],
    ["1.2.3", "."],
    ["3,14", "."], // a decimal comma is not a number when "." is the decimal mark
    ["", "."],
    ["-", "."],
    ["1,2,3", ","],
  ] as const)("%s with decimal %s -> null", (text, dec) => {
    expect(parseNumber(text, dec)).toBeNull();
  });
});

describe("detectDecimalSeparator", () => {
  it("detects decimal comma", () => {
    expect(detectDecimalSeparator(["3,14", "2,5", "10", "x"])).toBe(",");
    expect(detectDecimalSeparator(["1.234,56", "12"])).toBe(",");
    expect(detectDecimalSeparator(["0,125"])).toBe(","); // leading 0 can't be a thousands group
  });
  it("detects decimal point", () => {
    expect(detectDecimalSeparator(["3.14", "2.5", "10"])).toBe(".");
    expect(detectDecimalSeparator(["1,234.56"])).toBe(".");
    expect(detectDecimalSeparator(["0.125"])).toBe(".");
  });
  it("ignores ambiguous values and falls back on the delimiter", () => {
    expect(detectDecimalSeparator(["1.234", "5.678"])).toBe(".");
    expect(detectDecimalSeparator(["1,234"], ";")).toBe(",");
    expect(detectDecimalSeparator(["12", "15"], ";")).toBe(",");
    expect(detectDecimalSeparator(["12", "15"], ",")).toBe(".");
  });
  it("ignores dates, text and nulls", () => {
    expect(detectDecimalSeparator(["01.02.2024", "hello", null, "2,5"])).toBe(",");
  });
});

describe("cleanCell", () => {
  const missing = makeMissingSet(["-999"]);
  it("trims whitespace", () => expect(cleanCell("  5.2 ", missing)).toBe("5.2"));
  it.each(["", "  ", "NA", "n/a", "NaN", "null", "-", "#N/A", "#DIV/0!", "-999"])("%j is missing", (v) => {
    expect(cleanCell(v, missing)).toBeNull();
  });
  it("keeps real values", () => {
    expect(cleanCell("0", missing)).toBe("0");
    expect(cleanCell("Nairobi", missing)).toBe("Nairobi");
    expect(cleanCell("-9", missing)).toBe("-9");
  });
  it("handles null/undefined", () => {
    expect(cleanCell(null, missing)).toBeNull();
    expect(cleanCell(undefined, missing)).toBeNull();
  });
});
