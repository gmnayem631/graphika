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

export type ChartKind = "line";

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

/** Options for the time-series line chart. */
export interface LineOptions {
  x: string;
  y: string[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
}

export interface RenderRequest {
  chart: ChartKind;
  columns: ColumnData[];
  options: LineOptions;
  figure: FigureOptions;
}

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
