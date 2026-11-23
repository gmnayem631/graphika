/**
 * Helpers for building a chart by hand: which columns fit each role, a
 * sensible starting setup per chart type, and a check that a setup is complete.
 */
import type { ColumnInfo } from "@/lib/data/columns";
import type { ChartKind, ChartSpec } from "@/lib/engine/protocol";
import { columnRoles, specColumns, suggestCharts } from "./suggest";

/** Columns that make sense on a line chart's x axis. */
export const isXForLine = (c: ColumnInfo) => c.type === "datetime" || c.type === "numeric";
/** Bar positions: categories, or numbers such as years. */
export const isBarCategory = (c: ColumnInfo) => c.type === "categorical" || c.type === "numeric";
export const isNumeric = (c: ColumnInfo) => c.type === "numeric";
export const isCategory = (c: ColumnInfo) => c.type === "categorical";

/**
 * A starting setup for a chart type: the matching suggestion if there is one,
 * otherwise the first columns that fit. null if the data can't make this chart.
 */
export function defaultSpec(kind: ChartKind, columns: ColumnInfo[]): ChartSpec | null {
  const suggested = suggestCharts(columns, 20).find((s) => s.spec.chart === kind);
  if (suggested) return suggested.spec;

  const { measures, categories } = columnRoles(columns);
  const numbers = columns.filter(isNumeric).map((c) => c.name);
  const m = measures.map((c) => c.name);
  const values = m.length ? m : numbers;
  switch (kind) {
    case "line": {
      const x = columns.find(isXForLine)?.name;
      const y = values.find((n) => n !== x);
      return x && y ? { chart: "line", options: { x, y: [y] } } : null;
    }
    case "bar": {
      const x = (categories[0] ?? columns.find(isCategory) ?? columns.find(isBarCategory))?.name;
      const y = values.find((n) => n !== x);
      return x ? { chart: "bar", options: { x, y: y ? [y] : [], agg: y ? "mean" : "count" } } : null;
    }
    case "scatter":
      return values.length >= 2 ? { chart: "scatter", options: { x: values[0], y: values[1], trendline: false } } : null;
    case "histogram":
      return values.length ? { chart: "histogram", options: { x: values[0], bins: "auto" } } : null;
    case "box":
      return values.length ? { chart: "box", options: { y: [values[0]], showPoints: "auto" } } : null;
    case "heatmap":
      return values.length >= 2 ? { chart: "heatmap", options: { columns: values.slice(0, 12), method: "pearson" } } : null;
  }
}

/** Why a chart type can't be drawn from these columns (shown when defaultSpec is null). */
export const NEEDS: Record<ChartKind, string> = {
  line: "A line chart needs a date or number column for the x axis and a number column for the y axis.",
  bar: "A bar chart needs a category column.",
  scatter: "A scatter plot needs two number columns.",
  histogram: "A histogram needs a number column.",
  box: "A box plot needs a number column.",
  heatmap: "A correlation matrix needs at least two number columns.",
};

/** A friendly problem description if the setup can't be drawn, else null. */
export function checkSpec(spec: ChartSpec, columns: ColumnInfo[]): string | null {
  const names = new Set(columns.map((c) => c.name));
  const missing = specColumns(spec).filter((n) => !names.has(n));
  if (missing.length) return `Column not found: ${missing.join(", ")}. Choose another column.`;
  switch (spec.chart) {
    case "line":
      if (!spec.options.y.length) return "Choose at least one column for the y axis.";
      break;
    case "box":
      if (!spec.options.y.length) return "Choose at least one number column.";
      break;
    case "heatmap":
      if (spec.options.columns.length < 2) return "Choose at least two number columns.";
      break;
  }
  return null;
}
