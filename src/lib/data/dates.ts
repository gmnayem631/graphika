/**
 * Date parsing for the formats researchers' files commonly use. Every value is
 * converted to an ISO-8601 string ("2024-03-01" or "2024-03-01T14:30:00") with
 * no time zone involved, so a date never shifts by a day.
 *
 * Supported formats (time of day optional where it makes sense):
 *   iso    2024-03-01, 2024/03/01, 2024-03-01T14:30, 2024-03-01 14:30:05, …Z / +02:00
 *   dmy    01/03/2024, 1.3.2024, 01-03-24, 01/03/2024 14:30
 *   mdy    03/01/2024, 3/1/24 2:30 PM
 *   ym     2024-03, 2024/03            (first day of the month)
 *   named  1 Mar 2024, 01-Mar-2024, March 1, 2024, Mar 2024
 */

export type DateFormatId = "iso" | "dmy" | "mdy" | "ym" | "named";

export const DATE_FORMAT_LABELS: Record<DateFormatId, string> = {
  iso: "YYYY-MM-DD",
  dmy: "DD/MM/YYYY (day first)",
  mdy: "MM/DD/YYYY (month first)",
  ym: "YYYY-MM (month)",
  named: "with month names (1 Mar 2024)",
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Two-digit years follow Excel's rule: 00–29 → 2000s, 30–99 → 1900s. */
function fullYear(y: string): number {
  const n = Number(y);
  if (y.length === 4) return n;
  return n < 30 ? 2000 + n : 1900 + n;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function iso(y: number, m: number, d: number, time?: { h: number; min: number; s: number }): string | null {
  if (y < 1 || y > 9999 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  const date = `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
  if (!time) return date;
  const { h, min, s } = time;
  if (h > 23 || min > 59 || s > 59) return null;
  return `${date}T${pad(h)}:${pad(min)}:${pad(s)}`;
}

function parseTime(h?: string, min?: string, s?: string, ampm?: string) {
  if (h === undefined || min === undefined) return undefined;
  let hour = Number(h);
  if (ampm) {
    if (hour < 1 || hour > 12) return { h: 99, min: 0, s: 0 }; // invalid
    hour = (hour % 12) + (ampm.toLowerCase() === "pm" ? 12 : 0);
  }
  return { h: hour, min: Number(min), s: Number(s ?? 0) };
}

const TIME = String.raw`(?:[T ,]+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(am|pm)?)?`;
const ISO_RE = new RegExp(String.raw`^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})${TIME}\s*(Z|[+-]\d{2}:?\d{2})?$`, "i");
const NUMERIC_DMY_RE = new RegExp(String.raw`^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})${TIME}$`, "i");
const YM_RE = /^(\d{4})[-/](\d{1,2})$/;
const NAMED_DMY_RE = /^(\d{1,2})[ \-/.]*([a-z]{3,9})\.?[ \-/.,]+(\d{4}|\d{2})$/i; // 1 Mar 2024, 01-Mar-24
const NAMED_MDY_RE = /^([a-z]{3,9})\.?[ \-]+(\d{1,2})(?:st|nd|rd|th)?,?[ \-]+(\d{4})$/i; // March 1, 2024
const NAMED_MY_RE = /^([a-z]{3,9})\.?[ \-/]+(\d{4})$/i; // Mar 2024

/** Parse one value in the given format; null if it doesn't fit or isn't a real date. */
export function parseDate(text: string, format: DateFormatId): string | null {
  const s = text.trim();
  let m: RegExpMatchArray | null;
  switch (format) {
    case "iso": {
      if (!(m = s.match(ISO_RE))) return null;
      const [, y, mo, d, h, mi, sec, ampm, zone] = m;
      if (ampm) return null;
      if (zone && h !== undefined) {
        // Convert to UTC so a column with offsets is on one clock.
        const t = Date.parse(`${y}-${pad(+mo)}-${pad(+d)}T${pad(+h)}:${mi}:${sec ?? "00"}${zone.length === 5 ? zone.slice(0, 3) + ":" + zone.slice(3) : zone}`);
        return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 19);
      }
      return iso(+y, +mo, +d, parseTime(h, mi, sec));
    }
    case "dmy":
    case "mdy": {
      if (!(m = s.match(NUMERIC_DMY_RE))) return null;
      const [, a, b, y, h, mi, sec, ampm] = m;
      const [d, mo] = format === "dmy" ? [+a, +b] : [+b, +a];
      return iso(fullYear(y), mo, d, parseTime(h, mi, sec, ampm));
    }
    case "ym": {
      if (!(m = s.match(YM_RE))) return null;
      return iso(+m[1], +m[2], 1);
    }
    case "named": {
      if ((m = s.match(NAMED_DMY_RE))) {
        const mo = MONTHS[m[2].toLowerCase()];
        return mo ? iso(fullYear(m[3]), mo, +m[1]) : null;
      }
      if ((m = s.match(NAMED_MDY_RE))) {
        const mo = MONTHS[m[1].toLowerCase()];
        return mo ? iso(+m[3], mo, +m[2]) : null;
      }
      if ((m = s.match(NAMED_MY_RE))) {
        const mo = MONTHS[m[1].toLowerCase()];
        return mo ? iso(+m[2], mo, 1) : null;
      }
      return null;
    }
  }
}

export interface DateDetection {
  format: DateFormatId;
  /** Number of values that parse in this format. */
  matched: number;
  /** True when the values read equally well as day-first and month-first. */
  ambiguousDayMonth: boolean;
}

const FORMATS: DateFormatId[] = ["iso", "dmy", "mdy", "ym", "named"];

/**
 * How regular a sequence of dates is: the number of consecutive steps equal to
 * the most common positive step. A daily series read the right way round has
 * steps of exactly one day; read the wrong way round, steps jump around.
 */
function regularity(isoDates: (string | null)[]): number {
  const t = isoDates.filter((d): d is string => d !== null).map((d) => Date.parse(d + (d.length === 10 ? "T00:00:00Z" : "Z")));
  const steps = new Map<number, number>();
  for (let i = 1; i < t.length; i++) {
    const step = t[i] - t[i - 1];
    if (step > 0) steps.set(step, (steps.get(step) ?? 0) + 1);
  }
  return Math.max(0, ...steps.values());
}

/**
 * Find the date format that fits the most values. Returns null when no format
 * fits at least one value. DD/MM vs MM/DD: a part above 12 decides it; if every
 * value is ambiguous, the reading that gives a more regular sequence wins, and
 * day-first is the default.
 */
export function detectDateFormat(values: string[]): DateDetection | null {
  const counts = FORMATS.map((f) => ({ f, n: values.filter((v) => parseDate(v, f) !== null).length }));
  const best = Math.max(...counts.map((c) => c.n));
  if (best === 0) return null;
  const top = counts.filter((c) => c.n === best).map((c) => c.f);

  if (top.includes("dmy") && top.includes("mdy")) {
    const sample = values.slice(0, 2000);
    const dmy = regularity(sample.map((v) => parseDate(v, "dmy")));
    const mdy = regularity(sample.map((v) => parseDate(v, "mdy")));
    return { format: mdy > dmy ? "mdy" : "dmy", matched: best, ambiguousDayMonth: true };
  }
  return { format: top[0], matched: best, ambiguousDayMonth: false };
}
