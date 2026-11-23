"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataPreview } from "@/components/upload/DataPreview";
import { DropZone } from "@/components/upload/DropZone";
import { PocChart } from "@/components/poc/PocChart";
import { getEngine, type EngineStatus } from "@/lib/engine/client";
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

      {table && (
        <Card>
          <CardHeader>
            <CardTitle>Chart (preview — full chart builder coming next)</CardTitle>
            <CardDescription>
              <EngineBadge status={engineStatus} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PocChart table={table} ready={engineStatus?.state === "ready"} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
