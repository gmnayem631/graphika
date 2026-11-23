# Graphika

Free, privacy-first web app that turns data files (CSV/TSV/XLSX) into publication-ready graphs for
researchers in disaster science, climate resilience and related fields who don't code. Hobby project.

## Non-negotiable principles
- **100% client-side.** Uploaded data never goes to any server or third party. No backend, no database,
  no external APIs, no analytics that touch user data. Never add `fetch`/`XMLHttpRequest`/beacons that
  carry user data, and never log it anywhere outside the browser.
- **Static site only.** Next.js `output: "export"` (see `next.config.ts`). No API routes, server actions,
  middleware, `next/image` optimisation or anything else that needs a server. Must deploy free to
  Cloudflare Pages / GitHub Pages / Vercel as plain files.
- **Zero cost.** Only free, open-source libraries and assets (check licences, e.g. fonts are SIL OFL).
- **Audience doesn't code.** Errors must be friendly and actionable, never stack traces or jargon.
- The only allowed external network requests are for **code** (Pyodide runtime + Python wheels from the
  pinned CDN). Keep it self-hostable (see README).

## Out of scope (for now)
User accounts, saved graphs, server-side processing, LLM / natural-language features, NetCDF/GeoTIFF.

## Architecture
- UI: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (base-ui flavour).
  Next 16 docs are bundled in `node_modules/next/dist/docs` — check them, APIs differ from older versions.
- Parsing & column typing live in **TypeScript** (`src/lib/data/`), unit-tested with Vitest.
- Charts are rendered by **matplotlib in Pyodide inside a Web Worker** (`src/workers/`). The UI must stay
  responsive while Pyodide loads/renders; show clear loading progress.
- The worker must be a **module** worker (Pyodide 314+ refuses classic workers, and Turbopack bundles
  workers as classic). So `src/workers/pyodide.worker.ts` is compiled by esbuild
  (`npm run build:worker`, run automatically by `dev`/`build`) to `public/engine/` (gitignored) and
  loaded by URL in `src/lib/engine/client.ts`. Re-run `build:worker` after editing the worker.
- Pyodide is pinned in `src/lib/engine/config.ts`. seaborn is not in the Pyodide distribution — use
  plain matplotlib.
- **Preview = export**: the preview is the same matplotlib figure that is exported, at the same size in
  mm and with the same fonts; only DPI/format differ. Use `layout="constrained"`, never
  `bbox_inches="tight"` (it changes the figure size).
- TS ↔ Python boundary (`src/lib/engine/protocol.ts`): TS sends clean columnar data
  (`{name, type, values}`, numbers / ISO date strings / null) plus a typed options object; Python
  returns bytes + MIME type. Keep it small and typed.
- Python (`public/py/graphika/`): one well-commented function per chart type taking a DataFrame and an
  options dict. Keep it small and modular.
- Fonts: bundled Liberation Sans / Serif (metric-compatible with Arial / Times New Roman).
  PDF uses TrueType (Type 42) embedding.
- Default palette is colorblind-safe (Okabe–Ito).

## Working conventions
- Build in small phases; explain what was done after each.
- Add/maintain Vitest tests for parsing, type detection and chart-suggestion logic (`tests/`).
- Sample datasets live in `public/samples/` (synthetic, labelled as such).
- Commands: `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (→ `out/`),
  `npm start` (serves `out/` locally).
