"use client";
/** Figure size (journal presets or custom mm), resolution, format, and the download button. */
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TypedColumn } from "@/lib/data/columns";
import { getEngine } from "@/lib/engine/client";
import type { ChartSpec, ExportFormat } from "@/lib/engine/protocol";
import { cn } from "@/lib/utils";
import type { ChartLook } from "./StylePanel";
import { buildRequest, figureAndStyle } from "./useChartImage";

export interface ExportSettings {
  preset: PresetId;
  widthMm: number;
  heightMm: number;
  dpi: number;
  format: ExportFormat;
}

type PresetId = "single" | "onehalf" | "double" | "custom";

/** Typical journal figure widths (Elsevier, Springer Nature, AGU, Wiley are all close to these). */
const PRESETS: { id: Exclude<PresetId, "custom">; name: string; widthMm: number; heightMm: number }[] = [
  { id: "single", name: "Single column", widthMm: 85, heightMm: 65 },
  { id: "onehalf", name: "1.5 columns", widthMm: 140, heightMm: 90 },
  { id: "double", name: "Double column", widthMm: 180, heightMm: 100 },
];

export const DEFAULT_EXPORT: ExportSettings = { preset: "double", widthMm: 180, heightMm: 100, dpi: 300, format: "pdf" };

const FORMATS: { id: ExportFormat; name: string; vector: boolean; note: string }[] = [
  { id: "pdf", name: "PDF", vector: true, note: "Vector — sharp at any zoom. Best for most journals." },
  { id: "svg", name: "SVG", vector: true, note: "Vector — editable in Inkscape or Illustrator." },
  { id: "tiff", name: "TIFF", vector: false, note: "Raster — some journals require TIFF." },
  { id: "png", name: "PNG", vector: false, note: "Raster — good for slides, posters and the web." },
  { id: "jpg", name: "JPG", vector: false, note: "Raster — small files; slight blur around text." },
];

const MIN_MM = 20;
const MAX_MM = 500;

const inputClass =
  "h-8 w-20 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border px-3 text-sm transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
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
  settings: ExportSettings;
  onChange: (s: ExportSettings) => void;
  spec: ChartSpec;
  columns: TypedColumn[];
  look: ChartLook;
  fileName: string;
  ready: boolean;
}

export function ExportPanel({ settings, onChange, spec, columns, look, fileName, ready }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ExportSettings>) => onChange({ ...settings, ...patch });
  const format = FORMATS.find((f) => f.id === settings.format)!;
  const px = (mm: number) => Math.round((mm / 25.4) * settings.dpi);

  // Keep typed sizes within sensible limits.
  const sizeInput = (key: "widthMm" | "heightMm", label: string) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <input
        type="number"
        min={MIN_MM}
        max={MAX_MM}
        className={inputClass}
        value={settings[key]}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v > 0) set({ [key]: v, preset: key === "widthMm" ? "custom" : settings.preset });
        }}
        onBlur={() => set({ [key]: Math.min(MAX_MM, Math.max(MIN_MM, settings[key])) })}
      />
    </label>
  );

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const size = { widthMm: settings.widthMm, heightMm: settings.heightMm };
      const { blob } = await getEngine().render(
        buildRequest(spec, columns, ...figureAndStyle(look, size, settings.dpi, settings.format)),
      );
      const base = fileName.replace(/\.\w+$/, "");
      downloadBlob(blob, `${base}_${spec.chart}_${settings.widthMm}x${settings.heightMm}mm.${settings.format}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Size</span>
        <div className="flex flex-wrap items-end gap-2">
          {PRESETS.map((p) => (
            <Choice
              key={p.id}
              on={settings.preset === p.id}
              onClick={() => set({ preset: p.id, widthMm: p.widthMm, heightMm: p.heightMm })}
            >
              {p.name} ({p.widthMm} mm)
            </Choice>
          ))}
          <Choice on={settings.preset === "custom"} onClick={() => set({ preset: "custom" })}>
            Custom
          </Choice>
        </div>
        <div className="flex items-end gap-3">
          {sizeInput("widthMm", "Width (mm)")}
          <span className="pb-1.5 text-muted-foreground">×</span>
          {sizeInput("heightMm", "Height (mm)")}
        </div>
        <p className="text-xs text-muted-foreground">
          Check your journal&apos;s author guidelines for exact widths. The preview above is drawn at this size, so text
          sizes are true to print.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Format</span>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <Choice key={f.id} on={settings.format === f.id} onClick={() => set({ format: f.id })}>
              {f.name}
            </Choice>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{format.note}</p>
      </div>

      {!format.vector && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Resolution</span>
          <div className="flex flex-wrap gap-2">
            {[300, 600].map((d) => (
              <Choice key={d} on={settings.dpi === d} onClick={() => set({ dpi: d })}>
                {d} dpi
              </Choice>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            300 dpi suits photos and colour figures; many journals ask for 600 dpi for line art.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!ready || busy} onClick={download}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />} Download {format.name}
        </Button>
        <span className="text-sm text-muted-foreground">
          {settings.widthMm} × {settings.heightMm} mm
          {format.vector
            ? " · vector"
            : ` · ${px(settings.widthMm).toLocaleString()} × ${px(settings.heightMm).toLocaleString()} px at ${settings.dpi} dpi`}
        </span>
      </div>
    </div>
  );
}
