/**
 * Main-thread client for the chart engine worker.
 *
 * Usage:
 *   const engine = getEngine();           // starts loading Pyodide in the background
 *   engine.onStatus(s => …);              // progress for the loading UI
 *   const blob = await engine.render(req);
 */
import { MIME_TYPES, type EngineStage, type RenderRequest, type WorkerRequest, type WorkerResponse } from "./protocol";

export type EngineStatus =
  | { state: "loading"; stage: EngineStage; message: string }
  | { state: "ready"; loadMs: number }
  | { state: "failed"; message: string };

export interface RenderResult {
  blob: Blob;
  renderMs: number;
}

type Pending = { resolve: (r: RenderResult) => void; reject: (e: Error) => void; mime: string };

class EngineClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Set<(s: EngineStatus) => void>();
  status: EngineStatus = { state: "loading", stage: "runtime", message: "Starting the chart engine…" };

  constructor() {
    // A real *module* worker, compiled separately by esbuild (npm run build:worker)
    // and served as a static file. Pyodide no longer supports classic workers,
    // and Turbopack-bundled workers are classic, so we bypass the bundler here.
    this.worker = new Worker(new URL("engine/pyodide.worker.js", document.baseURI), { type: "module" });
    this.worker.onmessage = (ev: MessageEvent<WorkerResponse>) => this.handle(ev.data);
    this.worker.onerror = (ev) => this.setStatus({ state: "failed", message: ev.message || "The chart engine crashed." });
    // Our own static assets (fonts, Python sources) live next to the page.
    const assetBase = new URL("./", document.baseURI).href;
    this.send({ type: "init", assetBase });
  }

  private send(msg: WorkerRequest) {
    this.worker.postMessage(msg);
  }

  private setStatus(s: EngineStatus) {
    this.status = s;
    this.listeners.forEach((l) => l(s));
  }

  private handle(msg: WorkerResponse) {
    switch (msg.type) {
      case "progress":
        this.setStatus({ state: "loading", stage: msg.stage, message: msg.message });
        break;
      case "ready":
        this.setStatus({ state: "ready", loadMs: msg.loadMs });
        break;
      case "init-error":
        this.setStatus({ state: "failed", message: msg.message });
        this.pending.forEach((p) => p.reject(new Error(msg.message)));
        this.pending.clear();
        break;
      case "result": {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p?.resolve({ blob: new Blob([msg.bytes as BlobPart], { type: p.mime }), renderMs: msg.renderMs });
        break;
      }
      case "error": {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p?.reject(new Error(msg.message));
        break;
      }
    }
  }

  /** Subscribe to loading status; returns an unsubscribe function. */
  onStatus(listener: (s: EngineStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  render(request: RenderRequest): Promise<RenderResult> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, mime: MIME_TYPES[request.figure.format] });
      this.send({ type: "render", id, request });
    });
  }
}

let engine: EngineClient | null = null;

/** Lazily create the single shared engine (browser only). */
export function getEngine(): EngineClient {
  if (!engine) engine = new EngineClient();
  return engine;
}
