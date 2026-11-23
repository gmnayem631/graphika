"use client";
/** Page frame: header (logo, engine status, theme), intro hero and footer. */
import { BarChart3, Loader2, Lock, Ruler } from "lucide-react";

import type { EngineStatus } from "@/lib/engine/client";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";

/** Small chart-shaped mark: bars with a trend line. */
function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="fill-primary-foreground/90">
        <rect x="7" y="17" width="4" height="8" rx="1" />
        <rect x="14" y="12" width="4" height="13" rx="1" />
        <rect x="21" y="8" width="4" height="17" rx="1" />
      </g>
      <path d="M6 15 L13 10 L19 12 L26 5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary-foreground" />
    </svg>
  );
}

export function EngineStatusPill({ status }: { status: EngineStatus | null }) {
  const state = status?.state ?? "loading";
  const message = status?.state === "loading" ? status.message : "Starting the chart engine…";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        state === "failed" ? "border-destructive/40 text-destructive" : "text-muted-foreground",
      )}
      title={state === "loading" ? message : undefined}
    >
      {state === "loading" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <span className={cn("size-2 rounded-full", state === "ready" ? "bg-emerald-500" : "bg-destructive")} />
      )}
      <span className="hidden sm:inline">
        {state === "ready"
          ? "Chart engine ready"
          : state === "failed"
            ? "Chart engine failed to load"
            : message}
      </span>
      <span className="sm:hidden">{state === "ready" ? "Ready" : state === "failed" ? "Failed" : "Loading…"}</span>
    </span>
  );
}

export function SiteHeader({ status }: { status: EngineStatus | null }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Logo className="size-7" />
        <span className="text-lg font-semibold tracking-tight">Graphika</span>
        <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary md:inline-flex dark:bg-sidebar-primary/15 dark:text-sidebar-primary">
          <Lock className="size-3" /> Private — runs in your browser
        </span>
        <div className="ml-auto flex items-center gap-2">
          <EngineStatusPill status={status} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

const FEATURES = [
  { icon: Lock, title: "Private by design", text: "Your data is read on this device and never uploaded." },
  { icon: BarChart3, title: "Six chart types", text: "Time series, bars, scatter, histogram, box plot, correlations." },
  { icon: Ruler, title: "Journal-ready", text: "Exact mm sizes, 300/600 dpi, PDF · SVG · TIFF · PNG · JPG." },
];

export function Hero() {
  return (
    <section className="flex flex-col gap-6 pt-6 pb-2 sm:pt-10">
      <div className="flex flex-col gap-3">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Publication-ready figures from your data, <span className="text-primary dark:text-sidebar-primary">in minutes</span>
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground text-pretty">
          Upload a CSV or Excel file, pick a suggested chart, and download it at your journal&apos;s exact size. No coding,
          no account — free and open source.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-3 rounded-2xl border bg-card/60 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-sidebar-primary/15 dark:text-sidebar-primary">
              <f.icon className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-medium">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
        <p>Graphika — free and open source. Your data never leaves this device.</p>
        <p>Charts drawn with matplotlib, running in your browser via Pyodide.</p>
      </div>
    </footer>
  );
}
