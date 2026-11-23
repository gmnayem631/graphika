"use client";
import { useMemo } from "react";
import { Check, Loader2 } from "lucide-react";

import { CHART_NAMES, type Suggestion } from "@/lib/charts/suggest";
import type { TypedColumn } from "@/lib/data/columns";
import type { FigureOptions } from "@/lib/engine/protocol";
import { cn } from "@/lib/utils";
import { buildRequest, useChartImage } from "./useChartImage";

/** Small but legible: the same figure code as the full chart, at thumbnail size. */
const THUMBNAIL_FIGURE: FigureOptions = {
  widthMm: 90,
  heightMm: 62,
  dpi: 110,
  format: "png",
  fontFamily: "sans",
  fontSizePt: 7,
};

function Thumbnail({ suggestion, columns, ready }: { suggestion: Suggestion; columns: TypedColumn[]; ready: boolean }) {
  const request = useMemo(() => buildRequest(suggestion.spec, columns, THUMBNAIL_FIGURE), [suggestion, columns]);
  const { url, error } = useChartImage(request, ready);
  return (
    <div className="flex aspect-[90/62] w-full items-center justify-center overflow-hidden rounded-lg border bg-white">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Preview: ${suggestion.title}`} className="h-full w-full object-contain" />
      ) : error ? (
        <p className="px-3 text-center text-xs text-destructive">{error}</p>
      ) : (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

interface Props {
  suggestions: Suggestion[];
  columns: TypedColumn[];
  ready: boolean;
  selectedId: string | null;
  onSelect: (s: Suggestion) => void;
}

export function SuggestionGallery({ suggestions, columns, ready, selectedId, onSelect }: Props) {
  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        We couldn&apos;t suggest a chart for these columns. Check the column types above — most charts need at least one
        number column, or a category column with repeated values.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {suggestions.map((s, i) => {
        const selected = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s)}
            aria-pressed={selected}
            className={cn(
              "group flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
            )}
          >
            <Thumbnail suggestion={s} columns={columns} ready={ready} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {CHART_NAMES[s.spec.chart]}
                  {i === 0 && " · best match"}
                </p>
                <p className="text-sm font-medium">{s.title}</p>
              </div>
              {selected && <Check className="size-4 shrink-0 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">{s.reason}</p>
          </button>
        );
      })}
    </div>
  );
}
