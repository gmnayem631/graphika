"use client";
/** Pick any chart type and choose which columns go where. */
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { NEEDS, defaultSpec, isBarCategory, isCategory, isNumeric, isXForLine } from "@/lib/charts/builder";
import { CHART_NAMES } from "@/lib/charts/suggest";
import type { ColumnInfo } from "@/lib/data/columns";
import type { Aggregation, ChartKind, ChartSpec } from "@/lib/engine/protocol";

const KINDS: ChartKind[] = ["line", "bar", "scatter", "histogram", "box", "heatmap"];

const selectClass =
  "h-8 min-w-40 rounded-lg border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** One column (optionally "none"). */
function ColumnSelect(props: {
  label: string;
  value: string | undefined;
  options: ColumnInfo[];
  onChange: (name: string | undefined) => void;
  optional?: boolean;
}) {
  return (
    <Field label={props.label}>
      <select
        aria-label={props.label}
        className={selectClass}
        value={props.value ?? ""}
        onChange={(e) => props.onChange(e.target.value || undefined)}
      >
        {props.optional && <option value="">— none —</option>}
        {props.options.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Several columns, as toggle chips. */
function ColumnChips(props: { label: string; values: string[]; options: ColumnInfo[]; onChange: (names: string[]) => void }) {
  const toggle = (name: string) =>
    props.onChange(
      props.values.includes(name)
        ? props.values.filter((v) => v !== name)
        : props.options.map((c) => c.name).filter((n) => n === name || props.values.includes(n)),
    );
  return (
    <Field label={props.label}>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map((c) => {
          const on = props.values.includes(c.name);
          return (
            <button
              key={c.name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.name)}
              className={
                "h-8 rounded-full border px-3 text-sm transition-colors " +
                (on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")
              }
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

interface Props {
  spec: ChartSpec;
  columns: ColumnInfo[];
  onChange: (spec: ChartSpec) => void;
}

export function ChartEditor({ spec, columns, onChange }: Props) {
  const defaults = useMemo(
    () => Object.fromEntries(KINDS.map((k) => [k, defaultSpec(k, columns)])) as Record<ChartKind, ChartSpec | null>,
    [columns],
  );
  const numeric = columns.filter(isNumeric);
  const categories = columns.filter(isCategory);

  // Typed helper: update the options of whichever chart is selected.
  const set = <S extends ChartSpec>(s: S, patch: Partial<S["options"]>) =>
    onChange({ ...s, options: { ...s.options, ...patch } } as ChartSpec);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={spec.chart === k ? "default" : "outline"}
            disabled={!defaults[k]}
            title={defaults[k] ? undefined : NEEDS[k]}
            onClick={() => spec.chart !== k && defaults[k] && onChange(defaults[k]!)}
          >
            {CHART_NAMES[k]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {spec.chart === "line" && (
          <>
            <ColumnSelect label="X axis" value={spec.options.x} options={columns.filter(isXForLine)} onChange={(x) => x && set(spec, { x })} />
            {spec.options.group ? (
              <ColumnSelect label="Y axis" value={spec.options.y[0]} options={numeric} onChange={(y) => y && set(spec, { y: [y] })} />
            ) : (
              <ColumnChips label="Y axis (one line each)" values={spec.options.y} options={numeric} onChange={(y) => set(spec, { y })} />
            )}
            <ColumnSelect
              label="One line per"
              optional
              value={spec.options.group}
              options={categories}
              onChange={(group) => set(spec, { group, y: spec.options.y.slice(0, 1) })}
            />
          </>
        )}

        {spec.chart === "bar" && (
          <>
            <ColumnSelect label="Categories" value={spec.options.x} options={columns.filter(isBarCategory)} onChange={(x) => x && set(spec, { x })} />
            <ColumnChips
              label="Values (none = count rows)"
              values={spec.options.y}
              options={numeric.filter((c) => c.name !== spec.options.x)}
              onChange={(y) => set(spec, { y: spec.options.group ? y.slice(-1) : y, agg: y.length ? (spec.options.agg === "count" ? "mean" : spec.options.agg) : "count" })}
            />
            <ColumnSelect
              label="Bars grouped by"
              optional
              value={spec.options.group}
              options={categories.filter((c) => c.name !== spec.options.x)}
              onChange={(group) => set(spec, { group, y: spec.options.y.slice(0, 1) })}
            />
            {spec.options.y.length > 0 && (
              <Field label="Combine rows by">
                <select
                  aria-label="Combine rows by"
                  className={selectClass}
                  value={spec.options.agg}
                  onChange={(e) => set(spec, { agg: e.target.value as Aggregation })}
                >
                  <option value="mean">average</option>
                  <option value="sum">total</option>
                  <option value="median">median</option>
                </select>
              </Field>
            )}
          </>
        )}

        {spec.chart === "scatter" && (
          <>
            <ColumnSelect label="X axis" value={spec.options.x} options={numeric} onChange={(x) => x && set(spec, { x })} />
            <ColumnSelect label="Y axis" value={spec.options.y} options={numeric} onChange={(y) => y && set(spec, { y })} />
            <ColumnSelect label="Colour by" optional value={spec.options.group} options={categories} onChange={(group) => set(spec, { group })} />
            <label className="flex h-8 items-center gap-2 text-sm">
              <input type="checkbox" checked={spec.options.trendline} onChange={(e) => set(spec, { trendline: e.target.checked })} />
              Trendline (straight line, R²)
            </label>
          </>
        )}

        {spec.chart === "histogram" && (
          <>
            <ColumnSelect label="Column" value={spec.options.x} options={numeric} onChange={(x) => x && set(spec, { x })} />
            <ColumnSelect label="Overlay by" optional value={spec.options.group} options={categories} onChange={(group) => set(spec, { group })} />
            <Field label="Bins">
              <select
                aria-label="Bins"
                className={selectClass}
                value={String(spec.options.bins)}
                onChange={(e) => set(spec, { bins: e.target.value === "auto" ? "auto" : Number(e.target.value) })}
              >
                {["auto", "5", "10", "20", "30", "50"].map((b) => (
                  <option key={b} value={b}>
                    {b === "auto" ? "automatic" : b}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {spec.chart === "box" && (
          <>
            {spec.options.group ? (
              <ColumnSelect label="Values" value={spec.options.y[0]} options={numeric} onChange={(y) => y && set(spec, { y: [y] })} />
            ) : (
              <ColumnChips label="Values (one box each)" values={spec.options.y} options={numeric} onChange={(y) => set(spec, { y })} />
            )}
            <ColumnSelect
              label="One box per"
              optional
              value={spec.options.group}
              options={categories}
              onChange={(group) => set(spec, { group, y: spec.options.y.slice(0, 1) })}
            />
          </>
        )}

        {spec.chart === "heatmap" && (
          <>
            <ColumnChips label="Columns" values={spec.options.columns} options={numeric} onChange={(c) => set(spec, { columns: c })} />
            <Field label="Method">
              <select
                aria-label="Method"
                className={selectClass}
                value={spec.options.method}
                onChange={(e) => set(spec, { method: e.target.value as "pearson" | "spearman" })}
              >
                <option value="pearson">Pearson (linear)</option>
                <option value="spearman">Spearman (rank)</option>
              </select>
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
