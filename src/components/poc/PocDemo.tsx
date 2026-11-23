"use client";
/**
 * Phase-1 proof of concept: upload a CSV, render a matplotlib line chart in
 * Pyodide, download it as PDF. Replaced by the real wizard in later phases.
 */
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { Download, FileUp, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getEngine, type EngineStatus } from "@/lib/engine/client";
import type { ColumnData, ExportFormat, RenderRequest } from "@/lib/engine/protocol";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** Deliberately naive parsing — the real parser arrives in phase 2. */
function toColumns(text: string): ColumnData[] {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const [header, ...rows] = parsed.data;
  if (!header || rows.length === 0) throw new Error("The file looks empty.");
  return header.map((name, i) => {
    const raw = rows.map((r) => (r[i] ?? "").trim());
    const filled = raw.filter((v) => v !== "");
    if (filled.length && filled.every((v) => ISO_DATE.test(v))) {
      return { name, type: "datetime", values: raw.map((v) => v || null) };
    }
    if (filled.length && filled.every((v) => !Number.isNaN(Number(v)))) {
      return { name, type: "numeric", values: raw.map((v) => (v === "" ? null : Number(v))) };
    }
    return { name, type: "categorical", values: raw.map((v) => v || null) };
  });
}

function buildRequest(columns: ColumnData[], format: ExportFormat, dpi: number): RenderRequest {
  const x = columns.find((c) => c.type === "datetime") ?? columns[0];
  const y = columns.filter((c) => c !== x && c.type === "numeric").map((c) => c.name);
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

export function PocDemo() {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [columns, setColumns] = useState<ColumnData[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start loading Pyodide immediately, in the background.
  useEffect(() => getEngine().onStatus(setStatus), []);

  const ready = status?.state === "ready";

  // Re-render the preview whenever data arrives and the engine is ready.
  useEffect(() => {
    if (!columns || !ready) return;
    let cancelled = false;
    getEngine()
      .render(buildRequest(columns, "png", 150))
      .then(({ blob, renderMs }) => {
        if (cancelled) return;
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setRenderMs(renderMs);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [columns, ready]);

  function loadText(text: string, name: string) {
    try {
      setColumns(toColumns(text));
      setFileName(name);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onFile(file: File) {
    loadText(await file.text(), file.name);
  }

  async function loadSample() {
    const res = await fetch("samples/daily_rainfall.csv");
    loadText(await res.text(), "daily_rainfall.csv");
  }

  async function exportAs(format: ExportFormat) {
    if (!columns) return;
    setBusy(true);
    try {
      const { blob } = await getEngine().render(buildRequest(columns, format, 300));
      downloadBlob(blob, `${fileName.replace(/\.\w+$/, "") || "figure"}.${format}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Chart engine</CardTitle>
          <CardDescription>
            {!status || status.state === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                {status?.message ?? "Starting…"} The first visit downloads about 30 MB; later visits are cached.
              </span>
            ) : status.state === "ready" ? (
              <>Ready (loaded in {(status.loadMs / 1000).toFixed(1)} s).</>
            ) : (
              <span className="text-destructive">Could not start: {status.message}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <Button onClick={() => inputRef.current?.click()}>
            <FileUp /> Upload CSV
          </Button>
          <Button variant="outline" onClick={loadSample}>
            Use sample: daily rainfall
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {columns && (
        <Card>
          <CardHeader>
            <CardTitle>{fileName}</CardTitle>
            <CardDescription>
              {columns.map((c) => `${c.name} (${c.type})`).join(" · ")}
              {renderMs !== null && ` — rendered in ${renderMs} ms`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border bg-white p-2">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Chart preview" className="w-full" />
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
