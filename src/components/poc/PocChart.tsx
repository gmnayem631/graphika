"use client";
/**
 * TEMPORARY: renders a line chart from the typed columns, plus PDF/SVG/PNG
 * download. Replaced by the chart builder in phases 4–5.
 */
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getEngine } from "@/lib/engine/client";
import type { ColumnData, ExportFormat, RenderRequest } from "@/lib/engine/protocol";

function buildRequest(columns: ColumnData[], format: ExportFormat, dpi: number): RenderRequest | null {
  const x = columns.find((c) => c.type === "datetime") ?? columns.find((c) => c.type === "numeric");
  const y = columns.filter((c) => c !== x && c.type === "numeric").map((c) => c.name);
  if (!x || y.length === 0) return null;
  return {
    chart: "line",
    columns,
    options: { x: x.name, y, yLabel: y.length > 1 ? "Value" : y[0] },
    figure: { widthMm: 180, heightMm: 80, dpi, format, fontFamily: "sans", fontSizePt: 8 },
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PocChart({ columns, fileName, ready }: { columns: ColumnData[]; fileName: string; ready: boolean }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = buildRequest(columns, "png", 150);
  const requestKey = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!requestKey || !ready) return;
    let cancelled = false;
    getEngine()
      .render(JSON.parse(requestKey) as RenderRequest)
      .then(({ blob }) => {
        if (cancelled) return;
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [requestKey, ready]);

  if (!request) {
    return (
      <p className="text-sm text-muted-foreground">
        This early preview only draws a line chart over a date or number column. Other chart types are coming next.
      </p>
    );
  }

  async function exportAs(format: ExportFormat) {
    setBusy(true);
    try {
      const req = buildRequest(columns, format, 300)!;
      const { blob } = await getEngine().render(req);
      downloadBlob(blob, `${fileName.replace(/\.\w+$/, "")}.${format}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-lg border bg-white p-2">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Chart preview" className="w-full" />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Waiting for the chart engine…
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["pdf", "svg", "png"] as const).map((f) => (
          <Button key={f} variant="outline" disabled={!ready || busy} onClick={() => exportAs(f)}>
            <Download /> {f.toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}
