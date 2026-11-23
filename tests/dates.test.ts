import { describe, expect, it } from "vitest";
import { detectDateFormat, parseDate } from "@/lib/data/dates";

describe("parseDate", () => {
  it.each([
    ["2024-03-01", "iso", "2024-03-01"],
    ["2024/3/1", "iso", "2024-03-01"],
    ["2024-03-01T14:30", "iso", "2024-03-01T14:30:00"],
    ["2024-03-01 14:30:05", "iso", "2024-03-01T14:30:05"],
    ["2024-03-01T14:30:05.123", "iso", "2024-03-01T14:30:05"],
    ["2024-03-01T14:30:00Z", "iso", "2024-03-01T14:30:00"],
    ["2024-03-01T14:30:00+02:00", "iso", "2024-03-01T12:30:00"],
    ["2024-03-01T01:00:00+0300", "iso", "2024-02-29T22:00:00"],
    ["01/03/2024", "dmy", "2024-03-01"],
    ["1.3.2024", "dmy", "2024-03-01"],
    ["01-03-24", "dmy", "2024-03-01"],
    ["31.12.99", "dmy", "1999-12-31"],
    ["01/03/2024 14:30", "dmy", "2024-03-01T14:30:00"],
    ["03/01/2024", "mdy", "2024-03-01"],
    ["3/1/24 2:30 PM", "mdy", "2024-03-01T14:30:00"],
    ["3/1/24 12:15 am", "mdy", "2024-03-01T00:15:00"],
    ["2024-03", "ym", "2024-03-01"],
    ["1 Mar 2024", "named", "2024-03-01"],
    ["01-Mar-24", "named", "2024-03-01"],
    ["March 1, 2024", "named", "2024-03-01"],
    ["Sept 21st 2024", "named", "2024-09-21"],
    ["Mar 2024", "named", "2024-03-01"],
  ] as const)("%s as %s -> %s", (text, format, expected) => {
    expect(parseDate(text, format)).toBe(expected);
  });

  it.each([
    ["2024-02-30", "iso"], // no such day
    ["2023-02-29", "iso"], // not a leap year
    ["2024-13-01", "iso"],
    ["2024-03-01 25:00", "iso"],
    ["13/13/2024", "dmy"],
    ["31/04/2024", "dmy"],
    ["13/01/2024", "mdy"],
    ["1 Foo 2024", "named"],
    ["2024", "iso"],
    ["12.5", "dmy"],
    ["hello", "iso"],
  ] as const)("%s is not a valid %s date", (text, format) => {
    expect(parseDate(text, format)).toBeNull();
  });
});

describe("detectDateFormat", () => {
  it("detects ISO dates", () => {
    expect(detectDateFormat(["2024-01-01", "2024-01-02"])).toEqual({
      format: "iso",
      matched: 2,
      ambiguousDayMonth: false,
    });
  });

  it("decides day-first when a day is above 12", () => {
    const r = detectDateFormat(["01/02/2024", "13/02/2024"]);
    expect(r?.format).toBe("dmy");
    expect(r?.ambiguousDayMonth).toBe(false);
  });

  it("decides month-first when the second part is above 12", () => {
    expect(detectDateFormat(["02/01/2024", "02/13/2024"])?.format).toBe("mdy");
  });

  it("uses the regular spacing of a series to resolve ambiguity", () => {
    // Daily series 1–12 March 2024 written month-first: only month-first gives 1-day steps.
    const mdyDaily = Array.from({ length: 12 }, (_, i) => `03/${String(i + 1).padStart(2, "0")}/2024`);
    const r = detectDateFormat(mdyDaily);
    expect(r).toMatchObject({ format: "mdy", ambiguousDayMonth: true });

    const dmyDaily = Array.from({ length: 12 }, (_, i) => `${String(i + 1).padStart(2, "0")}/03/2024`);
    expect(detectDateFormat(dmyDaily)).toMatchObject({ format: "dmy", ambiguousDayMonth: true });
  });

  it("defaults to day-first when nothing decides it", () => {
    expect(detectDateFormat(["05/06/2024"])).toMatchObject({ format: "dmy", ambiguousDayMonth: true });
  });

  it("returns null for non-dates", () => {
    expect(detectDateFormat(["12", "3.5", "abc"])).toBeNull();
  });
});
