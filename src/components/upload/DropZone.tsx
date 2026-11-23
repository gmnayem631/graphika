"use client";
import { useRef, useState } from "react";
import { FileSpreadsheet, Lock, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ACCEPTED_EXTENSIONS } from "@/lib/data/loadFile";
import { cn } from "@/lib/utils";

export const SAMPLES = [
  { file: "daily_rainfall.csv", label: "Daily rainfall (2 stations)" },
  { file: "flood_events_by_district.csv", label: "Flood events by district" },
  { file: "temperature_crop_yield.csv", label: "Temperature vs. crop yield" },
  { file: "river_gauge_europe.csv", label: "River gauge (European format)" },
  { file: "flood_and_rainfall.xlsx", label: "Excel workbook (2 sheets)" },
];

interface Props {
  onFile: (file: File) => void;
  onSample: (fileName: string) => void;
  busy?: boolean;
}

/** Drag-and-drop area with a file picker and sample datasets. */
export function DropZone({ onFile, onSample, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a data file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          dragging
            ? "scale-[1.01] border-primary bg-primary/10"
            : "border-primary/25 bg-primary/[0.03] hover:border-primary/50 hover:bg-primary/[0.06]",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:-translate-y-0.5 dark:bg-sidebar-primary/15 dark:text-sidebar-primary">
          <Upload className="size-6" />
        </div>
        <div>
          <p className="text-base font-medium">Drop a data file here, or click to choose one</p>
          <p className="text-sm text-muted-foreground">CSV, TSV or Excel (.xlsx, .xls, .ods) · up to 50 MB</p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3" /> Your file is read on this device and never uploaded anywhere.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Or try a sample dataset:</span>
        {SAMPLES.map((s) => (
          <Button key={s.file} variant="outline" size="sm" disabled={busy} onClick={() => onSample(s.file)}>
            <FileSpreadsheet /> {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
