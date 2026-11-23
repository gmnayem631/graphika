/**
 * Typed message protocol between the UI (main thread) and the chart engine
 * (Pyodide + matplotlib in a Web Worker).
 *
 * Everything here stays inside the browser: the worker never sends user data
 * anywhere. The only network traffic is the worker downloading Pyodide code.
 */

import type { ColumnType } from "@/lib/data/types";

export type { ColumnType };

/** One clean column handed to Python. Datetimes are ISO-8601 strings. */
export interface ColumnData {
  name: string;
  type: ColumnType;
  values: (number | string | null)[];
}

export type ExportFormat = "png" | "jpg" | "tiff" | "svg" | "pdf";

export const MIME_TYPES: Record<ExportFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export interface FigureOptions {
  widthMm: number;
  heightMm: number;
  /** Raster resolution; ignored for the geometry of vector formats. */
  dpi: number;
  format: ExportFormat;
  fontFamily: "sans" | "serif";
  fontSizePt: number;
}

// ---- chart specifications (one options type per chart; mirrored in public/py/graphika/charts/) ----

/** Lines over a date or number axis. Wide data: several y columns. Long data: one y split by `group`. */
export interface LineOptions {
  x: string;
  y: string[];
  group?: string;
}

export type Aggregation = "mean" | "sum" | "median" | "count";

/**
 * Bars per category of `x`. Several rows per category are combined with `agg`.
 * Several y columns, or a `group`, give grouped bars. No y: bar height = row count.
 */
export interface BarOptions {
  x: string;
  y: string[];
  group?: string;
  agg: Aggregation;
  orientation?: "auto" | "vertical" | "horizontal";
}

export interface ScatterOptions {
  x: string;
  y: string;
  group?: string;
  /** Straight-line least-squares fit with R². */
  trendline: boolean;
}

export interface HistogramOptions {
  x: string;
  group?: string;
  /** Number of bins, or "auto". */
  bins: number | "auto";
}

/** One box per y column, or one box per category of `group`. */
export interface BoxOptions {
  y: string[];
  group?: string;
  /** Overlay the individual data points ("auto": only for small samples). */
  showPoints: "auto" | boolean;
}

/** Correlation matrix of numeric columns. */
export interface HeatmapOptions {
  columns: string[];
  method: "pearson" | "spearman";
}

export type ChartSpec =
  | { chart: "line"; options: LineOptions }
  | { chart: "bar"; options: BarOptions }
  | { chart: "scatter"; options: ScatterOptions }
  | { chart: "histogram"; options: HistogramOptions }
  | { chart: "box"; options: BoxOptions }
  | { chart: "heatmap"; options: HeatmapOptions };

export type ChartKind = ChartSpec["chart"];

// ---- look & feel (independent of the chart type, so it survives switching charts) ----

export type PaletteId = "okabe-ito" | "tol-bright" | "viridis" | "grayscale";

export type LegendPosition =
  | "best"
  | "upper right"
  | "upper left"
  | "lower right"
  | "lower left"
  | "outside right"
  | "below"
  | "none";

/** Empty labels fall back to column names; units are appended as "Label (unit)". */
export interface StyleOptions {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xUnit?: string;
  yUnit?: string;
  palette: PaletteId;
  legend: LegendPosition;
  grid: boolean;
}

export const DEFAULT_STYLE: StyleOptions = { palette: "okabe-ito", legend: "best", grid: false };

export type RenderRequest = ChartSpec & {
  /** Only the columns the chart uses. */
  columns: ColumnData[];
  figure: FigureOptions;
  style?: StyleOptions;
};

// ---- messages: main thread -> worker ----
export type WorkerRequest =
  | { type: "init"; assetBase: string }
  | { type: "render"; id: number; request: RenderRequest };

// ---- messages: worker -> main thread ----
export type EngineStage = "runtime" | "packages" | "assets" | "warmup";

export type WorkerResponse =
  | { type: "progress"; stage: EngineStage; message: string }
  | { type: "ready"; loadMs: number }
  | { type: "init-error"; message: string }
  | { type: "result"; id: number; bytes: Uint8Array; renderMs: number }
  | { type: "error"; id: number; message: string };
