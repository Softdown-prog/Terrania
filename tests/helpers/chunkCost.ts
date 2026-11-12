import { generateChunkCanvas } from "../../src/render/terrain.ts";
import { Recorder } from "./recordingContext.ts";
import { withDocument } from "./paintChunk.ts";

/** Custo determinístico de pintar um chunk: quantas operações de pintura, degradês e curvas o desenho faz (não depende da máquina). */
export interface ChunkCost { readonly ops: number; readonly gradients: number; readonly curves: number }

/** Pinta o chunk (cx, cy) inteiro num Canvas gravador e conta o que foi desenhado, em todos os canvases do chunk. */
export function chunkCost(cx: number, cy: number, seed: number): ChunkCost {
  const recorder = new Recorder();
  const proxy = new Proxy(recorder.ctx, {
    get(target, prop) {
      if (prop === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) { (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; },
  });
  withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) }, () => generateChunkCanvas(cx, cy, seed));
  const m = recorder.metrics();
  return { ops: m.paintOps, gradients: m.gradients, curves: m.curves };
}
