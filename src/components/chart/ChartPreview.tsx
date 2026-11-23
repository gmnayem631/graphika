"use client";
/**
 * The chart at its real export size (preview = export: same figure, same mm,
 * same fonts — only the pixel density differs). Re-renders shortly after the
 * user stops typing in the style panel.
 */
import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import type { TypedColumn } from "@/lib/data/columns";
import type { ChartSpec } from "@/lib/engine/protocol";
import type { ChartLook } from "./StylePanel";
import { buildRequest, figureAndStyle, useChartImage, useDebounced, type FigureSize } from "./useChartImage";

/** Enough pixels for a sharp on-screen preview (~1100 px wide), without wasting render time. */
export function previewDpi(widthMm: number): number {
  return Math.round(Math.min(220, Math.max(100, 1100 / (widthMm / 25.4))));
}

interface Props {
  spec: ChartSpec;
  columns: TypedColumn[];
  look: ChartLook;
  size: FigureSize;
  ready: boolean;
}

export function ChartPreview({ spec, columns, look, size, ready }: Props) {
  // Memoised so the debounce only restarts when the look or size really changes.
  const target = useMemo(() => ({ look, size }), [look, size]);
  const settled = useDebounced(target, 400);
  const request = useMemo(
    () =>
      buildRequest(spec, columns, ...figureAndStyle(settled.look, settled.size, previewDpi(settled.size.widthMm), "png")),
    [spec, columns, settled],
  );
  const { url, error, loading } = useChartImage(request, ready);
  const aspect = `${size.widthMm} / ${size.heightMm}`;

  return (
    <div className="relative flex justify-center rounded-lg border bg-white p-2">
      {url ? (
        // Shown no wider than its real size on a typical screen (1 mm ≈ 3.78 CSS px) × 2, so
        // a single-column figure doesn't look misleadingly huge.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Chart preview" className="w-full" style={{ maxWidth: `${size.widthMm * 3.78 * 2}px` }} />
      ) : error ? (
        <p className="p-6 text-sm text-destructive">{error}</p>
      ) : (
        <div className="flex w-full items-center justify-center text-sm text-muted-foreground" style={{ aspectRatio: aspect }}>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {ready ? "Drawing…" : "Waiting for the chart engine…"}
        </div>
      )}
      {url && loading && <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
