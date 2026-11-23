"use client";
import { AlertTriangle, Calendar, Hash, RotateCcw, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TYPE_LABELS, type ColumnInfo, type ColumnOverride } from "@/lib/data/columns";
import { DATE_FORMAT_LABELS, type DateFormatId } from "@/lib/data/dates";
import type { ColumnType } from "@/lib/data/types";

const TYPE_ICONS: Record<ColumnType, React.ComponentType<{ className?: string }>> = {
  numeric: Hash,
  categorical: Tags,
  datetime: Calendar,
};

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

const fmt = (n: number) => (Math.abs(n) >= 1e6 || (n !== 0 && Math.abs(n) < 1e-3) ? n.toExponential(2) : n.toLocaleString(undefined, { maximumFractionDigits: 3 }));

function describe(col: ColumnInfo): string {
  const s = col.summary;
  if (s.count === 0) return "This column is empty.";
  if (col.type === "numeric" && s.min !== undefined) {
    if (s.yearLike) return `${s.min} to ${s.max} · looks like years`;
    return `${fmt(s.min as number)} to ${fmt(s.max as number)}`;
  }
  if (col.type === "datetime" && s.min !== undefined) {
    return s.min === s.max ? String(s.min) : `${s.min} → ${s.max}`;
  }
  if (col.type === "categorical") {
    if (s.allUnique) return `${s.unique.toLocaleString()} different values — every row is unique (labels or IDs)`;
    const top = (s.topCategories ?? []).map((c) => `${c.value} (${c.count})`).join(", ");
    return `${s.unique.toLocaleString()} categor${s.unique === 1 ? "y" : "ies"}: ${top}${s.unique > 5 ? ", …" : ""}`;
  }
  return "";
}

const NOT_A: Record<ColumnType, [string, string]> = {
  numeric: ["isn't a number", "aren't numbers"],
  categorical: ["isn't a category", "aren't categories"],
  datetime: ["isn't a date in this format", "aren't dates in this format"],
};

interface Props {
  columns: ColumnInfo[];
  onOverride: (name: string, override: ColumnOverride | null) => void;
}

/** One row per column: detected type (changeable), date format, and a short summary. */
export function ColumnsPanel({ columns, onOverride }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Column</th>
            <th className="px-3 py-2 font-medium">Treat as</th>
            <th className="px-3 py-2 font-medium">What&apos;s in it</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => {
            const Icon = TYPE_ICONS[col.type];
            const changed = col.type !== col.detectedType || (col.dateFormat && col.dateFormat !== col.detectedDateFormat);
            const s = col.summary;
            return (
              <tr key={col.name} className="border-t align-top">
                <td className="px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    {col.name}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Type of ${col.name}`}
                      className={selectClass}
                      value={col.type}
                      onChange={(e) => onOverride(col.name, { type: e.target.value as ColumnType })}
                    >
                      {(Object.keys(TYPE_LABELS) as ColumnType[]).map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABELS[t]}
                          {t === col.detectedType ? " (detected)" : ""}
                        </option>
                      ))}
                    </select>
                    {col.type === "datetime" && (
                      <select
                        aria-label={`Date format of ${col.name}`}
                        className={selectClass}
                        value={col.dateFormat}
                        onChange={(e) =>
                          onOverride(col.name, { type: "datetime", dateFormat: e.target.value as DateFormatId })
                        }
                      >
                        {(Object.keys(DATE_FORMAT_LABELS) as DateFormatId[]).map((f) => (
                          <option key={f} value={f}>
                            {DATE_FORMAT_LABELS[f]}
                          </option>
                        ))}
                      </select>
                    )}
                    {changed && (
                      <Button variant="ghost" size="icon-sm" title="Back to detected type" onClick={() => onOverride(col.name, null)}>
                        <RotateCcw />
                      </Button>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <p className="text-muted-foreground">{describe(col)}</p>
                  {s.missing > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {s.missing.toLocaleString()} missing value{s.missing > 1 ? "s" : ""}
                    </p>
                  )}
                  {col.ambiguousDayMonth && col.dateFormat === col.detectedDateFormat && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" />
                      These dates could be read day-first or month-first. We chose{" "}
                      {col.dateFormat === "mdy" ? "month-first" : "day-first"} — check that the date range looks right, or
                      change the format.
                    </p>
                  )}
                  {s.invalid > 0 && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="mt-px size-3.5 shrink-0" />
                      {s.invalid.toLocaleString()} value{s.invalid > 1 ? "s" : ""} {NOT_A[col.type][s.invalid > 1 ? 1 : 0]}{" "}
                      and will be left out of charts (e.g. {s.invalidExamples.map((v) => `“${v}”`).join(", ")}).
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
