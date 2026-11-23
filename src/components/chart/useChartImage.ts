"use client";
import { useEffect, useState } from "react";

import { specColumns } from "@/lib/charts/suggest";
import type { TypedColumn } from "@/lib/data/columns";
import { getEngine } from "@/lib/engine/client";
import type { ChartSpec, FigureOptions, RenderRequest } from "@/lib/engine/protocol";

/** Build an engine request that carries only the columns the chart uses. */
export function buildRequest(spec: ChartSpec, columns: TypedColumn[], figure: FigureOptions): RenderRequest {
  const needed = new Set(specColumns(spec));
  return { ...spec, columns: columns.filter((c) => needed.has(c.name)), figure } as RenderRequest;
}

interface Rendered {
  request: RenderRequest;
  url: string | null;
  error: string | null;
}

/**
 * Render a request to an image URL with the chart engine. Pass a memoised
 * request: a new object identity triggers a new render. Stale results are
 * dropped and object URLs are released.
 */
export function useChartImage(request: RenderRequest | null, ready: boolean) {
  const [rendered, setRendered] = useState<Rendered | null>(null);

  useEffect(() => {
    if (!request || !ready) return;
    let cancelled = false;
    getEngine()
      .render(request)
      .then(({ blob }) => !cancelled && setRendered({ request, url: URL.createObjectURL(blob), error: null }))
      .catch((e: Error) => !cancelled && setRendered({ request, url: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [request, ready]);

  // Release each image URL once it's replaced or the component unmounts.
  useEffect(() => {
    const url = rendered?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [rendered]);

  const current = rendered && rendered.request === request ? rendered : null;
  return {
    url: current?.url ?? null,
    error: current?.error ?? null,
    loading: Boolean(request) && !current,
  };
}
