"use client";
/** Title, axis labels and units, colours, legend, fonts and grid. */
import { DEFAULT_STYLE, type LegendPosition, type PaletteId, type StyleOptions } from "@/lib/engine/protocol";
import { cn } from "@/lib/utils";

/** Everything the user can style: StyleOptions plus the figure's font settings. */
export interface ChartLook extends StyleOptions {
  fontFamily: "sans" | "serif";
  fontSizePt: number;
}

export const DEFAULT_LOOK: ChartLook = { ...DEFAULT_STYLE, fontFamily: "sans", fontSizePt: 8 };

/** Swatches mirror PALETTES in public/py/graphika/style.py. */
const PALETTES: { id: PaletteId; name: string; colors: string[] }[] = [
  { id: "okabe-ito", name: "Okabe–Ito (colourblind-safe)", colors: ["#0072B2", "#D55E00", "#009E73", "#E69F00", "#CC79A7", "#56B4E9"] },
  { id: "tol-bright", name: "Tol bright (colourblind-safe)", colors: ["#4477AA", "#EE6677", "#228833", "#CCBB44", "#66CCEE", "#AA3377"] },
  { id: "viridis", name: "Viridis (ordered groups)", colors: ["#440154", "#3B528B", "#21918C", "#5EC962", "#ADDC30"] },
  { id: "grayscale", name: "Greyscale (black & white print)", colors: ["#000000", "#666666", "#AAAAAA", "#333333", "#888888"] },
];

const LEGEND_POSITIONS: { id: LegendPosition; name: string }[] = [
  { id: "best", name: "Automatic" },
  { id: "upper right", name: "Top right" },
  { id: "upper left", name: "Top left" },
  { id: "lower right", name: "Bottom right" },
  { id: "lower left", name: "Bottom left" },
  { id: "outside right", name: "Outside, right" },
  { id: "below", name: "Below the plot" },
  { id: "none", name: "Hidden" },
];

const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3 focus-visible:ring-ring/30";

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1 text-xs font-medium text-muted-foreground", className)}>
      {label}
      {children}
    </label>
  );
}

interface Props {
  look: ChartLook;
  onChange: (look: ChartLook) => void;
  /** Hide axis fields for charts without axis labels (the correlation matrix). */
  axes: boolean;
}

export function StylePanel({ look, onChange, axes }: Props) {
  const set = (patch: Partial<ChartLook>) => onChange({ ...look, ...patch });
  const text = (key: "title" | "xLabel" | "yLabel" | "xUnit" | "yUnit", label: string, placeholder: string, className?: string) => (
    <Field label={label} className={className}>
      <input
        className={inputClass}
        value={look[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        {text("title", "Title", "No title (journals usually put it in the caption)", "sm:col-span-2")}
        {axes && (
          <>
            {text("xLabel", "X-axis label", "column name")}
            {text("xUnit", "X-axis unit", "e.g. °C, mm, km²")}
            {text("yLabel", "Y-axis label", "column name")}
            {text("yUnit", "Y-axis unit", "e.g. m³/s, t ha⁻¹")}
          </>
        )}
      </div>

      <Field label="Colours">
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              aria-label={p.name}
              aria-pressed={look.palette === p.id}
              onClick={() => set({ palette: p.id })}
              className={cn(
                "flex h-8 items-center gap-0.5 rounded-lg border px-2",
                look.palette === p.id ? "border-primary ring-1 ring-primary" : "hover:bg-muted",
              )}
            >
              {p.colors.map((c) => (
                <span key={c} className="size-3.5 rounded-sm" style={{ background: c }} />
              ))}
            </button>
          ))}
        </div>
        <span className="font-normal">{PALETTES.find((p) => p.id === look.palette)?.name}</span>
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <Field label="Legend">
          <select
            className={inputClass}
            value={look.legend}
            onChange={(e) => set({ legend: e.target.value as LegendPosition })}
          >
            {LEGEND_POSITIONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Font">
          <select
            className={inputClass}
            value={look.fontFamily}
            onChange={(e) => set({ fontFamily: e.target.value as "sans" | "serif" })}
          >
            <option value="sans">Sans-serif (like Arial)</option>
            <option value="serif">Serif (like Times New Roman)</option>
          </select>
        </Field>
        <Field label="Font size">
          <select
            className={inputClass}
            value={look.fontSizePt}
            onChange={(e) => set({ fontSizePt: Number(e.target.value) })}
          >
            {[6, 7, 8, 9, 10, 11, 12, 14].map((pt) => (
              <option key={pt} value={pt}>
                {pt} pt
              </option>
            ))}
          </select>
        </Field>
        {axes && (
          <label className="flex h-8 items-center gap-2 text-sm">
            <input type="checkbox" checked={look.grid} onChange={(e) => set({ grid: e.target.checked })} />
            Light grid lines
          </label>
        )}
      </div>
    </div>
  );
}
