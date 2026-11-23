/// <reference lib="webworker" />
/**
 * Chart engine worker: runs Python (Pyodide) + matplotlib off the main thread
 * so the UI stays responsive while the runtime loads and while charts render.
 *
 * Privacy: this worker only *downloads code* (Pyodide + wheels from the CDN,
 * our Python sources and fonts from our own origin). User data arrives via
 * postMessage and leaves only via postMessage back to the page.
 */
import type { PyodideAPI } from "pyodide";
import { CORE_PACKAGES, FONT_FILES, PYODIDE_INDEX_URL, PY_FILES } from "@/lib/engine/config";
import type { EngineStage, WorkerRequest, WorkerResponse } from "@/lib/engine/protocol";

declare const self: DedicatedWorkerGlobalScope;

const FONT_DIR = "/home/pyodide/fonts";

let ready: Promise<PyodideAPI> | null = null;

function post(msg: WorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(msg, transfer);
}

let stageStart = performance.now();
let currentStage = "";

function progress(stage: EngineStage, message: string) {
  logStageEnd();
  currentStage = stage;
  post({ type: "progress", stage, message });
}

/** Console timing per loading stage, to help diagnose slow first loads. */
function logStageEnd() {
  const now = performance.now();
  if (currentStage) console.info(`[graphika engine] ${currentStage}: ${Math.round(now - stageStart)} ms`);
  stageStart = now;
}

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (HTTP ${res.status})`);
  return res;
}

async function init(assetBase: string): Promise<PyodideAPI> {
  const t0 = performance.now();

  progress("runtime", "Downloading the Python runtime…");
  // Loaded from the CDN at runtime, not bundled.
  const { loadPyodide } = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ `${PYODIDE_INDEX_URL}pyodide.mjs`
  )) as typeof import("pyodide");
  const py = await loadPyodide({ indexURL: PYODIDE_INDEX_URL, env: { MPLBACKEND: "Agg" } });

  progress("packages", "Loading numpy, pandas and matplotlib…");
  await py.loadPackage(CORE_PACKAGES, { messageCallback: () => {}, errorCallback: () => {} });

  progress("assets", "Loading fonts and chart code…");
  py.FS.mkdirTree(FONT_DIR);
  await Promise.all([
    ...FONT_FILES.map(async (f) => {
      const buf = await (await fetchOk(`${assetBase}fonts/${f}`)).arrayBuffer();
      py.FS.writeFile(`${FONT_DIR}/${f}`, new Uint8Array(buf));
    }),
    ...PY_FILES.map(async (f) => {
      const src = await (await fetchOk(`${assetBase}py/${f}`)).text();
      const path = `/home/pyodide/${f}`;
      py.FS.mkdirTree(path.slice(0, path.lastIndexOf("/")));
      py.FS.writeFile(path, src);
    }),
  ]);

  progress("warmup", "Preparing matplotlib (first time only)…");
  await py.runPythonAsync(`
import sys
sys.path.insert(0, "/home/pyodide")
from graphika import render as _render
_render.setup(${JSON.stringify(FONT_DIR)})
`);

  logStageEnd();
  post({ type: "ready", loadMs: Math.round(performance.now() - t0) });
  return py;
}

/** Turn a Python traceback into its last, most informative line. */
function cleanError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const lines = text.trim().split("\n").filter(Boolean);
  const last = lines[lines.length - 1] ?? text;
  // Our own Python code raises ChartError with a user-facing message.
  return last.replace(/^graphika\.errors\.ChartError:\s*|^\w*Error:\s*/, "");
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;

  if (msg.type === "init") {
    if (!ready) {
      ready = init(msg.assetBase);
      ready.catch((err) => post({ type: "init-error", message: cleanError(err) }));
    }
    return;
  }

  if (msg.type === "render") {
    if (!ready) {
      post({ type: "error", id: msg.id, message: "Chart engine not initialised." });
      return;
    }
    try {
      const py = await ready;
      const t0 = performance.now();
      const renderJson = py.globals.get("_render").render_json;
      const result = renderJson(JSON.stringify(msg.request));
      const bytes = result.toJs() as Uint8Array;
      result.destroy();
      renderJson.destroy();
      post(
        {
          type: "result",
          id: msg.id,
          bytes,
          renderMs: Math.round(performance.now() - t0),
        },
        [bytes.buffer],
      );
    } catch (err) {
      post({ type: "error", id: msg.id, message: cleanError(err) });
    }
  }
};
