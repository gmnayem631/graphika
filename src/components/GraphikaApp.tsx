"use client";
import { useEffect, useMemo, useState } from "react";
import { PencilRuler, RotateCcw, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ColumnsPanel } from "@/components/columns/ColumnsPanel";
import { Hero, SiteFooter, SiteHeader } from "@/components/layout/Site";
import { StepCard } from "@/components/layout/StepCard";
import { DataPreview } from "@/components/upload/DataPreview";
import { DropZone } from "@/components/upload/DropZone";
import { ChartEditor } from "@/components/chart/ChartEditor";
import { ChartPreview } from "@/components/chart/ChartPreview";
import {
  DEFAULT_EXPORT,
  ExportPanel,
  type ExportSettings,
} from "@/components/chart/ExportPanel";
import {
  DEFAULT_LOOK,
  StylePanel,
  type ChartLook,
} from "@/components/chart/StylePanel";
import { SuggestionGallery } from "@/components/chart/SuggestionGallery";
import { checkSpec, defaultSpec } from "@/lib/charts/builder";
import { suggestCharts } from "@/lib/charts/suggest";
import type { ChartKind, ChartSpec } from "@/lib/engine/protocol";
import { getEngine, type EngineStatus } from "@/lib/engine/client";
import {
  inferColumns,
  toTypedColumns,
  type ColumnOverride,
} from "@/lib/data/columns";
import {
  openFile,
  readFile,
  toTable,
  type OpenedFile,
} from "@/lib/data/loadFile";
import {
  DataFileError,
  type ParseOptions,
  type RawTable,
} from "@/lib/data/types";

function friendlyMessage(err: unknown): string {
  if (err instanceof DataFileError) return err.message;
  console.error(err);
  return "Something unexpected went wrong while reading this file. If it opens in Excel, try saving it as CSV and uploading that.";
}

export function GraphikaApp() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [opened, setOpened] = useState<OpenedFile | null>(null);
  const [options, setOptions] = useState<ParseOptions>({});
  const [overrides, setOverrides] = useState<Record<string, ColumnOverride>>(
    {},
  );
  const [spec, setSpec] = useState<ChartSpec | null>(null);
  const [look, setLook] = useState<ChartLook>(DEFAULT_LOOK);
  const [exportSettings, setExportSettings] =
    useState<ExportSettings>(DEFAULT_EXPORT);
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
      setLook((l) => ({
        ...DEFAULT_LOOK,
        palette: l.palette,
        fontFamily: l.fontFamily,
        fontSizePt: l.fontSizePt,
      }));
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

  const error =
    openError ?? (parsed && "error" in parsed ? parsed.error : null);
  const table = parsed && "table" in parsed ? parsed.table : null;

  const columns = useMemo(
    () => (table ? inferColumns(table, overrides) : null),
    [table, overrides],
  );
  const typedColumns = useMemo(
    () => (table && columns ? toTypedColumns(table, columns) : null),
    [table, columns],
  );
  const suggestions = useMemo(
    () => (columns ? suggestCharts(columns) : []),
    [columns],
  );
  const selectedId = spec ? JSON.stringify(spec) : null;
  const clampMm = (mm: number) => Math.min(500, Math.max(20, mm));
  const previewSize = useMemo(
    () => ({
      widthMm: clampMm(exportSettings.widthMm),
      heightMm: clampMm(exportSettings.heightMm),
    }),
    [exportSettings.widthMm, exportSettings.heightMm],
  );
  const problem = spec && columns ? checkSpec(spec, columns) : null;

  function buildOwn() {
    const kinds: ChartKind[] = [
      "line",
      "bar",
      "scatter",
      "histogram",
      "box",
      "heatmap",
    ];
    const first =
      columns && kinds.map((k) => defaultSpec(k, columns)).find(Boolean);
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

  const resetFile = () => {
    setOpened(null);
    setOpenError(null);
  };

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-primary/6 via-background to-background">
      <SiteHeader status={engineStatus} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-16 sm:px-6">
        {!opened ? <Hero /> : <div className="h-2" />}

        <StepCard
          step={1}
          title="Your data"
          description={
            opened
              ? opened.fileName
              : "CSV, TSV or Excel. Try a sample if you just want to look around."
          }
          action={
            opened && (
              <Button variant="ghost" size="sm" onClick={resetFile}>
                <RotateCcw /> Choose another file
              </Button>
            )
          }
        >
          {!opened && (
            <DropZone
              onFile={loadUpload}
              onSample={loadSample}
              busy={loading}
            />
          )}
          {error && (
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>We couldn&apos;t read this file</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {opened && table && (
            <DataPreview
              key={opened.fileName}
              table={table}
              options={options}
              onOptionsChange={setOptions}
            />
          )}
        </StepCard>

        {columns && (
          <StepCard
            step={2}
            title="Columns"
            description="We guessed what each column contains. Change it if something looks wrong — this decides which charts make sense."
          >
            <ColumnsPanel columns={columns} onOverride={setOverride} />
          </StepCard>
        )}

        {typedColumns && (
          <StepCard
            step={3}
            title="Pick a chart"
            description={
              engineReady
                ? "Suggestions based on your columns. Click one to start from it."
                : "Suggestions appear as soon as the chart engine has loaded (first visit only takes a while)."
            }
            action={
              <Button variant="outline" size="sm" onClick={buildOwn}>
                <PencilRuler /> Build my own
              </Button>
            }
          >
            <SuggestionGallery
              suggestions={suggestions}
              columns={typedColumns}
              ready={engineReady}
              selectedId={selectedId}
              onSelect={(s) => setSpec(s.spec)}
            />
          </StepCard>
        )}

        {spec && columns && typedColumns && table && (
          <StepCard
            step={4}
            title="Your chart"
            description="Change the chart type or which columns go where."
            contentClassName="gap-6"
          >
            <ChartEditor spec={spec} columns={columns} onChange={setSpec} />
            {problem ? (
              <Alert>
                <AlertTitle>Almost there</AlertTitle>
                <AlertDescription>{problem}</AlertDescription>
              </Alert>
            ) : (
              <ChartPreview
                spec={spec}
                columns={typedColumns}
                look={look}
                size={previewSize}
                ready={engineReady}
              />
            )}
          </StepCard>
        )}

        {spec && !problem && (
          <StepCard
            step={5}
            title="Labels & style"
            description="Leave a label empty to use the column name. These settings stay when you switch chart type."
          >
            <StylePanel
              look={look}
              onChange={setLook}
              axes={spec.chart !== "heatmap"}
            />
          </StepCard>
        )}

        {spec && !problem && typedColumns && table && (
          <StepCard
            step={6}
            title="Size & download"
            description="The file is created on your device — nothing is uploaded."
          >
            <ExportPanel
              settings={exportSettings}
              onChange={setExportSettings}
              spec={spec}
              columns={typedColumns}
              look={look}
              fileName={table.source.fileName}
              ready={engineReady}
            />
          </StepCard>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
