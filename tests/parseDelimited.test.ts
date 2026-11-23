import { describe, expect, it } from "vitest";
import { detectDelimiter, splitDelimited } from "@/lib/data/parseDelimited";

describe("detectDelimiter", () => {
  it.each([
    ["date,rain_mm\n2024-01-01,1.5\n2024-01-02,0\n", ","],
    ["date;rain_mm\n01.01.2024;1,5\n02.01.2024;0\n", ";"],
    ["date\train_mm\n2024-01-01\t1.5\n2024-01-02\t0\n", "\t"],
    ["date|rain_mm\n2024-01-01|1.5\n", "|"],
  ])("detects %j", (text, expected) => {
    expect(detectDelimiter(text)).toBe(expected);
  });

  it("is not fooled by decimal commas when there is no header", () => {
    expect(detectDelimiter("01.01.2024;1,5\n02.01.2024;2,25\n03.01.2024;0,5\n")).toBe(";");
  });

  it("is not fooled by commas inside quoted text", () => {
    const text = 'site,notes,value\nA,"flooded, road closed",3\nB,"dry",4\nC,"wet, muddy, slow",5\n';
    expect(detectDelimiter(text)).toBe(",");
  });

  it("tolerates a metadata preamble", () => {
    const text = "Station: X\nLat: 23.5\ndate;level\n01.01.2024;1,5\n02.01.2024;1,7\n03.01.2024;1,9\n";
    expect(detectDelimiter(text)).toBe(";");
  });

  it("defaults to comma for a single column", () => {
    expect(detectDelimiter("value\n1\n2\n")).toBe(",");
  });
});

describe("splitDelimited", () => {
  it("handles quotes and embedded newlines, keeping blank lines by default", () => {
    expect(splitDelimited('a,b\n"x\ny","z ""q"""\n\n1,2\n', ",")).toEqual([
      ["a", "b"],
      ["x\ny", 'z "q"'],
      [""],
      ["1", "2"],
    ]);
  });

  it("can skip blank lines", () => {
    expect(splitDelimited("a,b\n\n1,2\n", ",", { skipBlank: true })).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
