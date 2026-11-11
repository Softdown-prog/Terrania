import { generateChunkCanvas } from "../../src/render/terrain.ts";
import { Recorder } from "./recordingContext.ts";

/** Instala um `document` falso durante `run` e o restaura depois (para o pintor de terreno criar canvases em Node). */
export function withDocument<T>(doc: object, run: () => T): T {
  const g = globalThis as Record<string, unknown>, previous = g.document;
  g.document = doc;
  try { return run(); } finally { if (previous === undefined) delete g.document; else g.document = previous; }
}

/** Uma chamada de `drawImage`: os argumentos depois da imagem e o estado de opacidade e composição naquele instante. */
export interface RecordedDraw { image: unknown; args: unknown[]; alpha: unknown; composite: unknown }

/**
 * Roda `generateChunkCanvas` inteiro num Canvas gravador e devolve o que foi desenhado: os `drawImage` com a
 * opacidade usada, as mudanças de opacidade e composição, os `putImageData` (primeiros 64 bytes) e as
 * chamadas de `transform` (as peças de estrada giram o eixo na vertical).
 */
export function paintChunk(cx: number, cy: number, seed: number): { draws: RecordedDraw[]; sets: string[]; puts: number[][]; transforms: number[][] } {
  const recorder = new Recorder(), inner = recorder.ctx;
  const draws: RecordedDraw[] = [], sets: string[] = [], puts: number[][] = [], transforms: number[][] = [];
  const state: Record<string, unknown> = { globalAlpha: 1, globalCompositeOperation: "source-over" };
  const spy = new Proxy(inner, {
    get(target, prop) {
      if (prop === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      if (prop === "putImageData") return (image: { data: Uint8ClampedArray }) => { puts.push([...image.data.slice(0, 64)]); };
      if (prop === "transform") return (...args: number[]) => { transforms.push(args); (target as unknown as Record<string, (...x: number[]) => void>).transform!(...args); };
      if (prop === "drawImage") return (...args: unknown[]) => { draws.push({ image: args[0], args: args.slice(1), alpha: state.globalAlpha, composite: state.globalCompositeOperation }); };
      if (prop === "globalAlpha" || prop === "globalCompositeOperation") return state[prop];
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) {
      if (prop === "globalAlpha" || prop === "globalCompositeOperation") { state[prop] = value; sets.push(`${String(prop)}=${String(value)}`); return true; }
      (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true;
    },
  });
  withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => spy }) }, () => generateChunkCanvas(cx, cy, seed));
  return { draws, sets, puts, transforms };
}
