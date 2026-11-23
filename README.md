# Graphika

**Publication-ready graphs from your data files — free, and completely private.**

Graphika turns a CSV or Excel file into a journal-quality figure in a few clicks, with no
coding. It is made for researchers in disaster science, climate resilience and related
fields, but works for any tabular data.

- **Your data never leaves your computer.** Everything runs inside your web browser. There
  is no server, no account and no tracking.
- **Six chart types:** line (time series), bar, scatter with trendline, histogram, box plot
  and correlation matrix.
- **Chart suggestions** based on what your columns contain, each with a live preview.
- **Journal-ready output:** exact sizes in millimetres (single or double column), 300 or
  600 dpi, as PDF, SVG, TIFF, PNG or JPG, with real fonts embedded.
- **Colourblind-safe colours** by default, plus a greyscale option for print.

Under the hood the charts are drawn by [matplotlib](https://matplotlib.org), the plotting
library many scientists already use, running in your browser via
[Pyodide](https://pyodide.org).

---

## Contents

- [Quick start](#quick-start)
- [Step by step](#step-by-step)
- [Which chart should I use?](#which-chart-should-i-use)
- [Tips for publication figures](#tips-for-publication-figures)
- [Privacy: how it works](#privacy-how-it-works)
- [Troubleshooting](#troubleshooting)
- [For developers](#for-developers)
- [Credits](#credits)

---

## Quick start

1. Open Graphika in a modern browser (Chrome, Edge, Firefox or Safari).
2. Drop your data file on the page, or try one of the sample datasets.
3. Check the column types, pick one of the suggested charts, and adjust it if you like.
4. Add axis labels and units, choose a size (e.g. *Single column, 85 mm*) and click
   **Download**.

> The **first visit takes about 20–30 seconds** to load the chart engine (about 30 MB, once).
> You can upload your file and review the columns meanwhile. Later visits are faster because
> your browser keeps a copy.

---

## Step by step

The page is laid out as numbered steps. Each step appears once the previous one is done.

### 1. Your data

Drag a file onto the upload area, or click it to choose a file. Supported formats:

| Format | Notes |
|---|---|
| **CSV / TSV / TXT** | Comma, semicolon, tab or pipe separated — detected automatically. |
| **Excel** (`.xlsx`, `.xls`) and **OpenDocument** (`.ods`) | Pick the sheet if there are several. Excel dates are read correctly. |

Files up to 50 MB are supported. Graphika shows the first 20 rows and a summary such as
*“731 rows × 3 columns · UTF-8 · comma-separated · decimal point · 12 missing values”*.

Graphika handles common quirks automatically, and you can override each guess:

- **Separator and decimal mark.** European files like `01.03.2024;12,5` (semicolons and
  decimal commas) are recognised. If numbers look wrong, change *Separator* or
  *Decimal mark*.
- **Text encoding.** Files saved by older Excel versions (e.g. with `°C` or `ü`) are read
  correctly.
- **Notes above the table.** Title or station-information lines at the top of the file are
  skipped, and a note tells you how many.
- **Header row.** Untick *First row contains column names* if your file has no header.
- **Missing values.** Empty cells and the usual markers (`NA`, `N/A`, `NaN`, `-`, `#N/A`,
  `#DIV/0!`, …) are treated as missing. If your data uses a code like `-999` or `-9999`,
  type it into *Missing-value codes*. Missing values show as gaps in line charts and are
  left out of everything else.

### 2. Columns

Graphika decides whether each column is a **Number**, a **Category** (text labels such as
district names) or a **Date / time**, and shows a short summary (range, categories, number of
missing values). If a guess is wrong, change it in the *Treat as* menu.

- **Dates.** Most formats work: `2024-03-01`, `01/03/2024`, `1.3.24`, `03/01/2024 2:30 PM`,
  `2024-03`, `1 Mar 2024`, `March 1, 2024`.
- **Day or month first?** If every date could be read either way (e.g. `05/06/2024`),
  Graphika picks the reading that gives the more regular series and tells you so. Check the
  date range shown, and switch between *day first* and *month first* if needed.
- **Values that don't fit.** If a few values don't match the column type (e.g. `<0.5` in a
  number column), Graphika lists them and leaves them out of the chart.
- **Years.** Columns like `2015, 2016, …` are treated as years and used as a time axis.
- **Number codes.** Codes such as flood severity classes `1, 2, 3` are treated as numbers
  unless you switch them to *Category*.

### 3. Pick a chart

Graphika suggests charts that fit your columns, each with a small preview drawn from your
real data and a one-line explanation. The best match comes first. Click one to use it, or
click **Build my own** to start from scratch.

### 4. Your chart

Change the chart type with the buttons at the top, and choose which columns go where with the
menus. For example, choose *One line per → district* for one line per district, or tick
*Trendline* on a scatter plot. Chart types that don't fit your data are greyed out, and
hovering over one tells you what it needs.

### 5. Labels & style

- **Title and axis labels.** Leave a label empty to use the column name. Many journals prefer
  no title on the figure (it goes in the caption).
- **Units.** Added in brackets: *Rainfall* + *mm* → “Rainfall (mm)”. Special characters work:
  `°C`, `m³/s`, `km²`, `t ha⁻¹`.
- **Colours:**
  - *Okabe–Ito* (default) and *Tol bright* are readable for people with colour-vision
    deficiencies.
  - *Viridis* suits ordered groups.
  - *Greyscale* is for black-and-white print; lines also get different dash patterns.
- **Legend:** automatic, any corner, outside on the right, below the plot, or hidden.
- **Font:** sans-serif (looks like Arial) or serif (looks like Times New Roman), 6–14 pt.
  Most journals ask for 6–8 pt text at final size.
- **Grid lines:** optional light lines.

These settings stay when you switch chart type.

### 6. Size & download

**What you see is what you get.** The preview is drawn at the size you choose, with the same
fonts, so text sizes are true to print.

| Size preset | Width | Typical use |
|---|---|---|
| Single column | 85 mm | Most figures in two-column journals |
| 1.5 columns | 140 mm | Wider figures |
| Double column | 180 mm | Full page width |
| Custom | any width and height in mm | Your journal's exact requirements |

Always check your journal's author guidelines. Exact widths vary a little between publishers.

| Format | Type | When to use |
|---|---|---|
| **PDF** | vector | Best for most journals: sharp at any zoom, fonts embedded. |
| **SVG** | vector | To edit the figure further in Inkscape or Illustrator. |
| **TIFF** | raster | When a journal asks for TIFF. Choose **600 dpi** for line art. |
| **PNG** | raster | Slides, posters, the web. |
| **JPG** | raster | Small files. Text edges are slightly blurred; avoid for print. |

For raster formats, choose **300 dpi** (photos and colour figures) or **600 dpi** (line art,
which is what charts usually are). The exact pixel size is shown before you download, e.g.
*85 × 65 mm · 2,008 × 1,535 px at 600 dpi*.

---

## Which chart should I use?

| Your data | Chart | Example |
|---|---|---|
| A date or year column + numbers | **Line chart** | Daily rainfall at two stations |
| Categories + numbers | **Bar chart** (totals or averages) | Total flood events per district |
| Categories with many values each | **Box plot** (median, spread, outliers) | Crop yield by region |
| Two number columns | **Scatter plot** (+ trendline and R²) | Temperature vs. yield |
| One number column | **Histogram** | How often each rainfall amount occurs |
| Three or more number columns | **Correlation matrix** | Which variables rise and fall together |
| Only categories | **Bar chart** of counts | Number of events per hazard type |

**Bar charts and repeated categories.** When a category appears in several rows, Graphika
combines them. Counts (whole, non-negative numbers) are **added up**, and other values are
**averaged**. You can switch between *average*, *total* and *median* under *Combine rows by*.

**Trendline.** The scatter-plot trendline is an ordinary least-squares straight line through
all points; R² is shown in the legend. It describes the data and is not a statistical test.

---

## Tips for publication figures

- Pick the final size **first** (step 6), then adjust labels and font size while watching the
  preview. Text that looks fine on a big figure can be too small when shrunk to 85 mm.
- Prefer **PDF** for submission unless the journal requires TIFF.
- Put units in the axis labels, e.g. *Discharge (m³/s)*.
- Keep the default colourblind-safe colours, or use greyscale if the figure will be printed.
- Leave the title off the figure if the journal puts it in the caption.

---

## Privacy: how it works

Graphika is a static website: a set of files your browser downloads and runs. There is **no
server-side code** at all.

- Your file is read by your browser and processed in memory on your device. It is **never
  uploaded**, stored or logged anywhere.
- The chart engine (Python, matplotlib, pandas, numpy) runs inside your browser. It is
  downloaded once from the [jsDelivr](https://www.jsdelivr.com) CDN. Only program code is
  downloaded; no data is sent.
- The page enforces a browser security rule (a *Content Security Policy*) that only lets it
  talk to the website it came from, so it cannot send anything elsewhere.
- There are no cookies, no analytics and no accounts.
- **You can check this yourself:** open your browser's developer tools (F12) → *Network* tab
  and use Graphika. You will see only downloads of the site's own files and the Pyodide
  program code.

For stricter setups (e.g. an institution's intranet with no outside access), Graphika can
be hosted with the chart engine included. See
[Self-hosting the chart engine](#self-hosting-the-chart-engine).

---

## Troubleshooting

| Problem | What to do |
|---|---|
| “Waiting for the chart engine…” takes long | The first visit downloads about 30 MB; on a slow connection this can take a minute. Later visits are faster. |
| “Chart engine failed to load” | Check your internet connection (needed once, to download the engine) and reload. Some corporate networks block jsDelivr. Ask IT, or use a self-hosted copy. |
| All my data is in one column | Change the *Separator* in step 1. |
| Numbers show as categories | Check the *Decimal mark* in step 1, or look at the “values that don't fit” note in step 2. |
| Dates are wrong or swapped | In step 2, change the date format (e.g. *day first* ↔ *month first*). |
| A chart type is greyed out | Hover over it to see which kind of column it needs, then check the column types in step 2. |
| My file is rejected | Graphika explains why. For PDFs or Word tables, copy the table into Excel and save as `.xlsx` or `.csv`. NetCDF and GeoTIFF are not supported yet. |

---

## Sample datasets

Five **synthetic** (made-up) datasets are built in, so you can try Graphika without your own
data. They are in [`public/samples/`](public/samples/):

| File | Shows |
|---|---|
| `daily_rainfall.csv` | Daily rainfall at two stations over two years, with a few missing days |
| `flood_events_by_district.csv` | Flood events and people affected per (fictional) district and year |
| `temperature_crop_yield.csv` | Temperature, crop yield, region and irrigation at 120 sites |
| `river_gauge_europe.csv` | A German-style export: semicolons, decimal commas, `DD.MM.YYYY` dates, notes above the table |
| `flood_and_rainfall.xlsx` | An Excel workbook with two sheets, a title row and real Excel dates |

---

## For developers

### Requirements and commands

Node.js 20.9 or newer (developed with Node 22) and npm.

```bash
npm install
npm run dev         # development server at http://localhost:3000
npm test            # unit tests (Vitest): parsing, column types, chart suggestions
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # static site in out/
npm start           # serve out/ locally to try the production build
```

### How it fits together

```
src/
  app/                     Next.js page and layout (static export, CSP)
  components/              UI: upload, columns, chart gallery/editor/style/export
  lib/data/                File reading, parsing, cleaning, column-type detection (TypeScript, tested)
  lib/charts/              Chart suggestions and builder helpers (tested)
  lib/engine/              Typed protocol + client for the chart-engine worker
  workers/                 Web Worker that runs Pyodide (compiled separately by esbuild)
public/
  py/graphika/             Python: render.py (entry), style.py, charts/<one file per chart>.py
  fonts/                   Liberation Sans/Serif (SIL Open Font License)
  samples/                 Synthetic sample datasets (regenerate: node scripts/generate-samples.mjs)
tests/                     Vitest tests
vendor/                    SheetJS release tarball (the npm-registry "xlsx" package is outdated)
```

- **TypeScript** reads and cleans the file and works out the column types.
- **Python** gets clean columns plus a small options object and returns the finished image
  file. To add a chart type, add a module in `public/py/graphika/charts/`, its options type in
  `src/lib/engine/protocol.ts`, and a case in the chart editor.
- **The worker must be a module worker.** Pyodide doesn't support classic workers, and the
  Next.js bundler produces classic ones, so the worker is compiled by esbuild
  (`npm run build:worker`, which runs automatically before `dev` and `build`).

See [`CLAUDE.md`](CLAUDE.md) for the project's principles and conventions.

### Deploying

`npm run build` produces a plain static site in `out/` that any static host can serve:

- **Cloudflare Pages / Netlify / Vercel:** build command `npm run build`, output directory
  `out`.
- **GitHub Pages:**
  - At a user/organisation site root (`username.github.io`), publish `out/` as-is.
  - At a project URL (`username.github.io/graphika/`), first set `basePath: "/graphika"` in
    `next.config.ts`. Graphika's own files (engine, fonts, samples) are loaded relative to
    the page, so nothing else needs changing.

### Self-hosting the chart engine

By default the worker downloads Pyodide from jsDelivr (`src/lib/engine/config.ts`). To serve
it yourself:

1. Download the **full** Pyodide release matching `PYODIDE_VERSION` (currently `314.0.7`)
   from the [Pyodide releases page](https://github.com/pyodide/pyodide/releases).
2. Extract it so that `pyodide.mjs` and `pyodide-lock.json` end up in `public/pyodide/`. You
   can delete wheels you don't need: keep numpy, pandas, matplotlib, pillow and their
   dependencies.
3. Set `PYODIDE_INDEX_URL` in `src/lib/engine/config.ts` to `"/pyodide/"` (prefix your
   `basePath` if you use one) and rebuild.

The site then makes no outside requests at all. If your host supports response headers, you
can also send a `Content-Security-Policy` header with `connect-src 'self'` so the rule
covers the chart engine's worker too.

---

## Credits

Graphika is built on free, open-source software:

- [Pyodide](https://pyodide.org) (MPL 2.0): Python in the browser
- [matplotlib](https://matplotlib.org) (matplotlib licence), [pandas](https://pandas.pydata.org)
  and [NumPy](https://numpy.org) (BSD)
- [PapaParse](https://www.papaparse.com) (MIT) and [SheetJS Community Edition](https://sheetjs.com)
  (Apache 2.0): reading CSV and Excel files
- [Next.js](https://nextjs.org), [React](https://react.dev), [Tailwind CSS](https://tailwindcss.com)
  and [shadcn/ui](https://ui.shadcn.com) (MIT): the interface
- [Liberation fonts](https://github.com/liberationfonts/liberation-fonts) (SIL Open Font
  License 1.1): metric-compatible with Arial and Times New Roman
- Colour palettes: Okabe & Ito (2008), *Color Universal Design*; Paul Tol's *bright* scheme;
  viridis by Stéfan van der Walt and Nathaniel Smith.
