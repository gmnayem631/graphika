"use client";
/**
 * The selected chart at full size, plus downloads. Size and format controls
 * arrive with the export phase; for now: 180 × 100 mm, 300 dpi raster.
 * The preview re-renders shortly after the user stops typing in the style panel.
 */
import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TypedColumn } from "@/lib/data/columns";
import { getEngine } from "@/lib/engine/client";
import type { ChartSpec, ExportFormat, FigureOptions, StyleOptions } from "@/lib/engine/protocol";
import type { ChartLook } from "./StylePanel";
import { buildRequest, useChartImage, useDebounced } from "./useChartImage";

const SIZE = { widthMm: 180, heightMm: 100 };

/** Split the user's look into engine figure settings (fonts) and style options. */
function figureAndStyle(look: ChartLook, dpi: number, format: ExportFormat): [FigureOptions, StyleOptions] {
  const { fontFamily, fontSizePt, ...style } = look;
  return [{ ...SIZE, fontFamily, fontSizePt, dpi, format }, style];
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  spec: ChartSpec;
  columns: TypedColumn[];
  fileName: string;
  look: ChartLook;
  ready: boolean;
}

export function ChartPreview({ spec, columns, fileName, look, ready }: Props) {
  const settledLook = useDebounced(look, 400);
  const request = useMemo(
    () => buildRequest(spec, columns, ...figureAndStyle(settledLook, 150, "png")),
    [spec, columns, settledLook],
  );
  const { url, error, loading } = useChartImage(request, ready);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportAs(format: ExportFormat) {
    setExporting(format);
    setExportError(null);
    try {
      const { blob } = await getEngine().render(buildRequest(spec, columns, ...figureAndStyle(look, 300, format)));
      downloadBlob(blob, `${fileName.replace(/\.\w+$/, "")}_${spec.chart}.${format}`);
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative rounded-lg border bg-white p-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Chart preview" className="w-full" />
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : (
          <div className="flex aspect-[180/100] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            {ready ? "Drawing…" : "Waiting for the chart engine…"}
          </div>
        )}
        {url && loading && <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" />}
      </div>
      {exportError && <p className="text-sm text-destructive">{exportError}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {(["pdf", "svg", "png"] as const).map((f) => (
          <Button key={f} variant="outline" disabled={!ready || exporting !== null} onClick={() => exportAs(f)}>
            {exporting === f ? <Loader2 className="animate-spin" /> : <Download />} {f.toUpperCase()}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">180 × 100 mm · PNG at 300 dpi</span>
      </div>
    </div>
  );
}
