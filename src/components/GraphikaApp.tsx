"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, PencilRuler, RotateCcw, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnsPanel } from "@/components/columns/ColumnsPanel";
import { DataPreview } from "@/components/upload/DataPreview";
import { DropZone } from "@/components/upload/DropZone";
import { ChartEditor } from "@/components/chart/ChartEditor";
import { ChartPreview } from "@/components/chart/ChartPreview";
import { SuggestionGallery } from "@/components/chart/SuggestionGallery";
import { checkSpec, defaultSpec } from "@/lib/charts/builder";
import { suggestCharts } from "@/lib/charts/suggest";
import type { ChartKind, ChartSpec } from "@/lib/engine/protocol";
import { getEngine, type EngineStatus } from "@/lib/engine/client";
import { inferColumns, toTypedColumns, type ColumnOverride } from "@/lib/data/columns";
import { openFile, readFile, toTable, type OpenedFile } from "@/lib/data/loadFile";
import { DataFileError, type ParseOptions, type RawTable } from "@/lib/data/types";

function friendlyMessage(err: unknown): string {
  if (err instanceof DataFileError) return err.message;
  console.error(err);
  return "Something unexpected went wrong while reading this file. If it opens in Excel, try saving it as CSV and uploading that.";
}

function EngineBadge({ status }: { status: EngineStatus | null }) {
  if (status?.state === "ready") return <span className="text-xs text-muted-foreground">Chart engine ready</span>;
  if (status?.state === "failed")
    return <span className="text-xs text-destructive">Chart engine failed to load: {status.message}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="size-3 animate-spin" />
      {status?.message ?? "Starting the chart engine…"}
    </span>
  );
}

export function GraphikaApp() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [opened, setOpened] = useState<OpenedFile | null>(null);
  const [options, setOptions] = useState<ParseOptions>({});
  const [overrides, setOverrides] = useState<Record<string, ColumnOverride>>({});
  const [spec, setSpec] = useState<ChartSpec | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Start loading Python + matplotlib in the background straight away.
  useEffect(() => getEngine().onStatus(setEngineStatus), []);

  // Re-parse whenever the user changes an option (cheap: the file is already decoded).
  const parsed = useMemo((): { table: RawTable } | { error: string } | null => {
    if (!opened) return null;
    try {
      return { table: toTable(opened, options) };
    } catch (e) {
      return { error: friendlyMessage(e) };
    }
  }, [opened, options]);

  async function load(getFile: () => Promise<OpenedFile>) {
    setLoading(true);
    setOpenError(null);
    try {
      const file = await getFile();
      setOpened(file);
      setOptions({});
      setOverrides({});
      setSpec(null);
    } catch (e) {
      setOpened(null);
      setOpenError(friendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const loadUpload = (file: File) => load(() => readFile(file));
  const loadSample = (name: string) =>
    load(async () => {
      const res = await fetch(`samples/${name}`);
      if (!res.ok) throw new Error(`Could not load sample ${name}`);
      return openFile(new Uint8Array(await res.arrayBuffer()), name);
    });

  const error = openError ?? (parsed && "error" in parsed ? parsed.error : null);
  const table = parsed && "table" in parsed ? parsed.table : null;

  const columns = useMemo(() => (table ? inferColumns(table, overrides) : null), [table, overrides]);
  const typedColumns = useMemo(() => (table && columns ? toTypedColumns(table, columns) : null), [table, columns]);
  const suggestions = useMemo(() => (columns ? suggestCharts(columns) : []), [columns]);
  const selectedId = spec ? JSON.stringify(spec) : null;
  const problem = spec && columns ? checkSpec(spec, columns) : null;

  function buildOwn() {
    const kinds: ChartKind[] = ["line", "bar", "scatter", "histogram", "box", "heatmap"];
    const first = columns && kinds.map((k) => defaultSpec(k, columns)).find(Boolean);
    if (first) setSpec(first);
  }
  const engineReady = engineStatus?.state === "ready";

  function setOverride(name: string, override: ColumnOverride | null) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (override) next[name] = override;
      else delete next[name];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Your data</CardTitle>
          <CardDescription>{opened ? opened.fileName : <EngineBadge status={engineStatus} />}</CardDescription>
          {opened && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpened(null);
                  setOpenError(null);
                }}
              >
                <RotateCcw /> Choose another file
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!opened && <DropZone onFile={loadUpload} onSample={loadSample} busy={loading} />}
          {error && (
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>We couldn&apos;t read this file</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {opened && table && (
            <DataPreview key={opened.fileName} table={table} options={options} onOptionsChange={setOptions} />
          )}
        </CardContent>
      </Card>

      {columns && (
        <Card>
          <CardHeader>
            <CardTitle>2. Columns</CardTitle>
            <CardDescription>
              We guessed what each column contains. Change it if something looks wrong — this decides which charts
              make sense.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnsPanel columns={columns} onOverride={setOverride} />
          </CardContent>
        </Card>
      )}

      {typedColumns && (
        <Card>
          <CardHeader>
            <CardTitle>3. Pick a chart</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" onClick={buildOwn}>
                <PencilRuler /> Build my own
              </Button>
            </CardAction>
            <CardDescription>
              {engineReady ? (
                "Suggestions based on your column types. Click one to use it."
              ) : (
                <EngineBadge status={engineStatus} />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SuggestionGallery
              suggestions={suggestions}
              columns={typedColumns}
              ready={engineReady}
              selectedId={selectedId}
              onSelect={(s) => setSpec(s.spec)}
            />
          </CardContent>
        </Card>
      )}

      {spec && columns && typedColumns && table && (
        <Card>
          <CardHeader>
            <CardTitle>4. Your chart</CardTitle>
            <CardDescription>Change the chart type or which columns go where.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ChartEditor spec={spec} columns={columns} onChange={setSpec} />
            {problem ? (
              <Alert>
                <AlertTitle>Almost there</AlertTitle>
                <AlertDescription>{problem}</AlertDescription>
              </Alert>
            ) : (
              <ChartPreview spec={spec} columns={typedColumns} fileName={table.source.fileName} ready={engineReady} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
