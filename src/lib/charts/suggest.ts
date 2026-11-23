/**
 * Rule-based chart suggestions from column types — no AI, fully explainable.
 *
 * Columns are sorted into roles:
 *   dates      datetime columns
 *   years      whole numbers 1800–2100 (a time axis, not a measurement)
 *   measures   other numeric columns
 *   categories categorical columns with 2–30 distinct values (bar positions;
 *              more than 30 is usually an ID or free text)
 *   groups     categories with ≤ 8 repeating values (small enough for colours/legends)
 * and each rule below proposes a chart for one combination of roles. The
 * suggestions are ranked by how typical the chart is for that data shape.
 */
import type { ColumnInfo } from "@/lib/data/columns";
import type { Aggregation, ChartKind, ChartSpec } from "@/lib/engine/protocol";

export interface Suggestion {
  /** Stable identifier (the spec itself), so selections survive re-renders. */
  id: string;
  spec: ChartSpec;
  title: string;
  /** One line explaining why this chart fits the data. */
  reason: string;
  score: number;
}

export const CHART_NAMES: Record<ChartKind, string> = {
  line: "Line chart",
  bar: "Bar chart",
  scatter: "Scatter plot",
  histogram: "Histogram",
  box: "Box plot",
  heatmap: "Correlation matrix",
};

const MAX_CATEGORIES = 30;
const MAX_GROUPS = 8;
const MAX_LINES = 4;
const MAX_HEATMAP_COLUMNS = 12;

export interface ColumnRoles {
  dates: ColumnInfo[];
  years: ColumnInfo[];
  measures: ColumnInfo[];
  categories: ColumnInfo[];
  groups: ColumnInfo[];
}

export function columnRoles(columns: ColumnInfo[]): ColumnRoles {
  const usable = columns.filter((c) => c.summary.count > 0);
  const numeric = usable.filter((c) => c.type === "numeric");
  const categories = usable.filter(
    (c) => c.type === "categorical" && c.summary.unique >= 2 && c.summary.unique <= MAX_CATEGORIES,
  );
  return {
    dates: usable.filter((c) => c.type === "datetime"),
    years: numeric.filter((c) => c.summary.yearLike),
    measures: numeric.filter((c) => !c.summary.yearLike),
    categories,
    groups: categories.filter((c) => c.summary.unique <= MAX_GROUPS && !c.summary.allUnique),
  };
}

/** Counts (whole, non-negative numbers) are summed per category; anything else averaged. */
function defaultAggregation(measure: ColumnInfo): Aggregation {
  return measure.summary.integer && (measure.summary.min as number) >= 0 ? "sum" : "mean";
}

/** A time column with repeated values means "long" data: one row per (time, group). */
function hasRepeats(col: ColumnInfo): boolean {
  return col.summary.unique < col.summary.count;
}

function list(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function suggestCharts(columns: ColumnInfo[], max = 6): Suggestion[] {
  const { dates, years, measures, categories, groups } = columnRoles(columns);
  const out: Omit<Suggestion, "id">[] = [];
  const add = (spec: ChartSpec, title: string, reason: string, score: number) =>
    out.push({ spec, title, reason, score });

  // 1. Change over time: a date (or year) axis with measurements.
  const time = dates[0] ?? years[0];
  if (time && measures.length) {
    const timeKind = time.type === "datetime" ? "dates" : "years";
    const group = groups.find((g) => g.name !== time.name);
    if (hasRepeats(time) && group) {
      const y = measures[0].name;
      add(
        { chart: "line", options: { x: time.name, y: [y], group: group.name } },
        `${y} over ${time.name}, by ${group.name}`,
        `Each ${timeKind === "dates" ? "date" : "year"} appears once per ${group.name}: one line per ${group.name}.`,
        100,
      );
    } else {
      const ys = measures.slice(0, MAX_LINES).map((m) => m.name);
      add(
        { chart: "line", options: { x: time.name, y: ys } },
        `${list(ys)} over ${time.name}`,
        `A ${timeKind === "dates" ? "date" : "year"} column with numbers: shows change over time.`,
        100,
      );
    }
  }

  // 2. Compare categories: bar (totals/averages) and box (spreads).
  const category = categories[0];
  if (category && measures.length) {
    const m = measures[0];
    const agg = defaultAggregation(m);
    const perCategory = category.summary.count / category.summary.unique;
    const combined = perCategory > 1;
    add(
      { chart: "bar", options: { x: category.name, y: [m.name], agg } },
      combined ? `${agg === "sum" ? "Total" : "Average"} ${m.name} by ${category.name}` : `${m.name} by ${category.name}`,
      combined
        ? `Compares ${category.name}s; rows in the same ${category.name} are ${agg === "sum" ? "added up" : "averaged"}.`
        : `Compares one value per ${category.name}.`,
      85,
    );
    const second = groups.find((g) => g.name !== category.name);
    if (second && combined) {
      add(
        { chart: "bar", options: { x: category.name, y: [m.name], group: second.name, agg } },
        `${m.name} by ${category.name} and ${second.name}`,
        `Two category columns: grouped bars, one colour per ${second.name}.`,
        65,
      );
    }
    if (perCategory >= 5) {
      add(
        { chart: "box", options: { y: [m.name], group: category.name, showPoints: "auto" } },
        `Spread of ${m.name} by ${category.name}`,
        `Several values per ${category.name}: shows median, quartiles and outliers.`,
        75,
      );
    }
  }

  // 3. Relationship between two measurements.
  if (measures.length >= 2) {
    const [x, y] = measures;
    const group = groups[0];
    add(
      { chart: "scatter", options: { x: x.name, y: y.name, group: group?.name, trendline: true } },
      `${y.name} vs ${x.name}`,
      `Two number columns: shows how they relate, with a straight-line fit.`,
      time ? 60 : 80,
    );
  }

  // 4. Distribution of one measurement.
  if (measures.length) {
    const m = measures[0];
    add(
      { chart: "histogram", options: { x: m.name, bins: "auto" } },
      `Distribution of ${m.name}`,
      `Shows how often each range of ${m.name} occurs.`,
      50,
    );
  }

  // 5. Several measurements on a similar footing, without categories: compare spreads.
  if (!category && measures.length >= 2) {
    const ys = measures.slice(0, 6).map((m) => m.name);
    add(
      { chart: "box", options: { y: ys, showPoints: "auto" } },
      `Spread of ${list(ys)}`,
      `Compares the distributions of several number columns side by side.`,
      45,
    );
  }

  // 6. Many measurements: which ones move together?
  if (measures.length >= 3) {
    const cols = measures.slice(0, MAX_HEATMAP_COLUMNS).map((m) => m.name);
    add(
      { chart: "heatmap", options: { columns: cols, method: "pearson" } },
      `Correlation between ${cols.length} number columns`,
      `Shows which measurements rise and fall together.`,
      55,
    );
  }

  // 7. Only categories: count rows (only meaningful when categories repeat).
  const counted = categories.find((c) => !c.summary.allUnique);
  if (!measures.length && counted) {
    add(
      { chart: "bar", options: { x: counted.name, y: [], agg: "count" } },
      `Number of rows per ${counted.name}`,
      `No number columns: counts how often each ${counted.name} occurs.`,
      70,
    );
    const second = groups.find((g) => g.name !== counted.name);
    if (second) {
      add(
        { chart: "bar", options: { x: counted.name, y: [], group: second.name, agg: "count" } },
        `Rows per ${counted.name} and ${second.name}`,
        `Counts each combination of ${counted.name} and ${second.name}.`,
        60,
      );
    }
  }

  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => ({ ...s, id: JSON.stringify(s.spec) }));
}

/** Names of the columns a chart uses (so only those are sent to the engine). */
export function specColumns(spec: ChartSpec): string[] {
  const names: (string | undefined)[] = [];
  switch (spec.chart) {
    case "line":
    case "bar":
      names.push(spec.options.x, ...spec.options.y, spec.options.group);
      break;
    case "scatter":
      names.push(spec.options.x, spec.options.y, spec.options.group);
      break;
    case "histogram":
      names.push(spec.options.x, spec.options.group);
      break;
    case "box":
      names.push(...spec.options.y, spec.options.group);
      break;
    case "heatmap":
      names.push(...spec.options.columns);
      break;
  }
  return [...new Set(names.filter((n): n is string => Boolean(n)))];
}
