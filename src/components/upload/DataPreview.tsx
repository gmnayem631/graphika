"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DELIMITER_NAMES } from "@/lib/data/parseDelimited";
import type { DecimalSeparator, Delimiter, ParseOptions, RawTable } from "@/lib/data/types";

const PREVIEW_ROWS = 20;

const ENCODING_NAMES: Record<string, string> = {
  "utf-8": "UTF-8",
  "utf-16le": "UTF-16",
  "utf-16be": "UTF-16 (big-endian)",
  "windows-1252": "Western European (Windows-1252)",
};

interface Props {
  table: RawTable;
  options: ParseOptions;
  onOptionsChange: (options: ParseOptions) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

/** Summary of what was detected, adjustable parsing options, and a table preview. */
export function DataPreview({ table, options, onOptionsChange }: Props) {
  const { source } = table;
  const set = (patch: Partial<ParseOptions>) => onOptionsChange({ ...options, ...patch });
  const [missingText, setMissingText] = useState((options.extraMissingTokens ?? []).join(", "));
  const totalCells = table.rows.length * table.headers.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {table.rows.length.toLocaleString()} rows × {table.headers.length} columns
        {source.kind === "csv" && source.encoding && <> · {ENCODING_NAMES[source.encoding] ?? source.encoding}</>}
        {source.delimiter && <> · {DELIMITER_NAMES[source.delimiter]}-separated</>}
        {source.kind === "csv" && <> · decimal {source.decimalSeparator === "," ? "comma" : "point"}</>}
        {" · "}
        {table.missingCount > 0
          ? `${table.missingCount.toLocaleString()} missing value${table.missingCount > 1 ? "s" : ""} (${((100 * table.missingCount) / totalCells).toFixed(1)}%)`
          : "no missing values"}
      </p>

      <div className="flex flex-wrap items-end gap-4">
        {source.sheetNames && source.sheetNames.length > 1 && (
          <Field label="Sheet">
            <select className={selectClass} value={source.sheetName} onChange={(e) => set({ sheetName: e.target.value })}>
              {source.sheetNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
        )}
        {source.kind === "csv" && (
          <>
            <Field label="Separator">
              <select
                className={selectClass}
                value={source.delimiter}
                onChange={(e) => set({ delimiter: e.target.value as Delimiter })}
              >
                {(Object.keys(DELIMITER_NAMES) as Delimiter[]).map((d) => (
                  <option key={d} value={d}>
                    {DELIMITER_NAMES[d]} ({d === "\t" ? "tab" : d})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Decimal mark">
              <select
                className={selectClass}
                value={source.decimalSeparator}
                onChange={(e) => set({ decimalSeparator: e.target.value as DecimalSeparator })}
              >
                <option value=".">point (3.14)</option>
                <option value=",">comma (3,14)</option>
              </select>
            </Field>
          </>
        )}
        <Field label="Missing-value codes (besides blanks, NA, -, …)">
          <input
            className={selectClass + " w-56"}
            placeholder="e.g. -999, -9999"
            value={missingText}
            onChange={(e) => setMissingText(e.target.value)}
            onBlur={() =>
              set({
                extraMissingTokens: missingText
                  .split(/[,;]/)
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input type="checkbox" checked={source.hasHeader} onChange={(e) => set({ hasHeader: e.target.checked })} />
          First row contains column names
        </label>
      </div>

      {table.warnings.length > 0 && (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Please check</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {table.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-h-[28rem] overflow-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="px-3 py-2 text-right font-normal text-muted-foreground">#</th>
              {table.headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {table.rows.slice(0, PREVIEW_ROWS).map((row, r) => (
              <tr key={r} className="border-t">
                <td className="px-3 py-1.5 text-right text-muted-foreground">{r + 1}</td>
                {row.map((cell, c) => (
                  <td key={c} className="max-w-64 truncate px-3 py-1.5 whitespace-nowrap">
                    {cell === null ? <span className="text-muted-foreground/60" title="missing">—</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.rows.length > PREVIEW_ROWS && (
        <p className="text-xs text-muted-foreground">
          Showing the first {PREVIEW_ROWS} of {table.rows.length.toLocaleString()} rows. “—” marks a missing value.
        </p>
      )}
    </div>
  );
}
