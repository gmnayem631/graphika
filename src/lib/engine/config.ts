/**
 * Where the chart engine loads its code from.
 *
 * Pyodide (the Python runtime) and its wheels come from the jsDelivr CDN.
 * Only code is downloaded — user data is never sent anywhere.
 *
 * To self-host for stricter privacy: copy the Pyodide "full" distribution for
 * this version into `public/pyodide/` and set PYODIDE_INDEX_URL to "/pyodide/"
 * (see README).
 */
export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/** Packages loaded at startup (bundled in the Pyodide distribution). */
export const CORE_PACKAGES = ["numpy", "pandas", "matplotlib", "pillow"];

/** Python sources served from /public/py, copied into the Pyodide filesystem. */
export const PY_FILES = [
  "graphika/__init__.py",
  "graphika/errors.py",
  "graphika/render.py",
  "graphika/style.py",
  "graphika/charts/__init__.py",
  "graphika/charts/_common.py",
  "graphika/charts/line.py",
  "graphika/charts/bar.py",
  "graphika/charts/scatter.py",
  "graphika/charts/histogram.py",
  "graphika/charts/box.py",
  "graphika/charts/heatmap.py",
];

/** Liberation fonts (SIL OFL): metric-compatible with Arial / Times New Roman. */
export const FONT_FILES = [
  "LiberationSans-Regular.ttf",
  "LiberationSans-Bold.ttf",
  "LiberationSans-Italic.ttf",
  "LiberationSans-BoldItalic.ttf",
  "LiberationSerif-Regular.ttf",
  "LiberationSerif-Bold.ttf",
  "LiberationSerif-Italic.ttf",
  "LiberationSerif-BoldItalic.ttf",
];
