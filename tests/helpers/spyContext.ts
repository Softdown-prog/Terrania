import { Recorder } from "./recordingContext.ts";

/** O que um desenho fez no canvas: cores usadas (inclusive as dos degradês), quantas vezes cada método rodou e os números de cada chamada. */
export interface Spy { raw: string[]; calls: Record<string, number>; args: Record<string, number[][]> }

/** Roda o desenho num canvas de mentira e anota cada chamada; as cores saem em texto, como foram escritas. */
export function spy(draw: (c: CanvasRenderingContext2D) => void): Spy {
  const out: Spy = { raw: [], calls: {}, args: {} }, recorder = new Recorder();
  const proxy = new Proxy(recorder.ctx, {
    get(t, p) {
      const v = (t as unknown as Record<string | symbol, unknown>)[p];
      if (typeof v !== "function") return v;
      return (...a: unknown[]) => {
        out.calls[String(p)] = (out.calls[String(p)] ?? 0) + 1;
        (out.args[String(p)] ??= []).push(a.filter((x): x is number => typeof x === "number"));
        const result = (v as (...x: unknown[]) => unknown).apply(t, a);
        if (p === "createLinearGradient" || p === "createRadialGradient") {
          const g = result as { addColorStop: (o: number, c: string) => void }, add = g.addColorStop.bind(g);
          g.addColorStop = (o, c) => { out.raw.push(c); add(o, c); };
        }
        return result;
      };
    },
    set(t, p, v) { if ((p === "fillStyle" || p === "strokeStyle") && typeof v === "string") out.raw.push(v); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
  });
  draw(proxy);
  return out;
}

/** Assinatura do desenho (ordem e valores de tudo que foi pintado): igual se, e só se, o desenho for o mesmo. */
export const signature = (draw: (c: CanvasRenderingContext2D) => void): string => { const r = new Recorder(); draw(r.ctx); return r.metrics().signature; };

/** Se a cor (hex minúsculo) foi usada no desenho. */
export const usesTone = (s: Spy, hex: string): boolean => s.raw.some(r => r.toLowerCase() === hex);
