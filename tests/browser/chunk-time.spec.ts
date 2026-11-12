import { expect, test } from "@playwright/test";
import { build } from "esbuild";

/**
 * Orçamento de TEMPO por chunk no navegador de verdade (ADR 0046). O custo exato (operações e degradês) está em
 * `tests/chunk-cost-budget.test.ts`; aqui se cronometra o desenho real, que depende da máquina. Por isso o teste usa
 * duas medidas: um teto absoluto bem folgado (pega um desastre) e a razão contra um chunk de dunas medido na mesma
 * hora (não depende da velocidade da máquina, e pega quem fica várias vezes mais pesado que o resto).
 */
const SEED = 842136, RUNS = 9;

test("desenhar um chunk de cidade, de lago ou de mata não passa dos tetos de tempo (desktop/Android)", async ({ page }) => {
  const bundle = await build({
    stdin: { contents: "import { generateChunkCanvas } from './src/render/terrain.ts'; globalThis.K = { generateChunkCanvas };", resolveDir: process.cwd(), loader: "ts" },
    bundle: true, format: "iife", write: false, logLevel: "error",
  });
  await page.setContent("<body></body>");
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const medians = await page.evaluate(({ seed, runs }) => {
    const K = (globalThis as unknown as { K: { generateChunkCanvas(cx: number, cy: number, seed: number): unknown } }).K;
    const spots: Record<string, [number, number]> = { praca: [0, 968], cidadeNorte: [0, 966], cidadeSul: [0, 970], lago: [5, 973], dunas: [1, 977], mata: [-9, 0], norte: [0, 18] };
    const out: Record<string, number> = {};
    for (const [name, [cx, cy]] of Object.entries(spots)) {
      K.generateChunkCanvas(cx, cy, seed);
      K.generateChunkCanvas(cx, cy, seed + 99);
      const times: number[] = [];
      for (let i = 0; i < runs; i++) { const t = performance.now(); K.generateChunkCanvas(cx, cy, seed + i + 1); times.push(performance.now() - t); }
      times.sort((a, b) => a - b);
      out[name] = times[Math.floor(times.length / 2)]!;
    }
    return out;
  }, { seed: SEED, runs: RUNS });
  test.info().annotations.push({ type: "medianas (ms)", description: JSON.stringify(Object.fromEntries(Object.entries(medians).map(([k, v]) => [k, +v.toFixed(1)]))) });
  for (const [name, ms] of Object.entries(medians)) expect(ms, `${name}: ${ms.toFixed(1)} ms por chunk`).toBeLessThan(120);
  const base = medians.dunas!;
  for (const name of ["praca", "cidadeNorte", "cidadeSul"] as const) expect(medians[name]! / base, `${name} contra dunas`).toBeLessThan(3.5);
  expect(medians.lago! / base, "lago contra dunas").toBeLessThan(2);
  expect(medians.mata! / base, "mata contra dunas").toBeLessThan(2);
});

/**
 * Andar pela cidade (ADR 0047): 12 s a 170 px/s, quadro a quadro. Os chunks vizinhos são preparados aos poucos, então o
 * `render` não gera chunk nenhum depois do primeiro quadro e quase nenhum quadro passa de 40 ms. Os quadros contam o
 * `render` e o `warmAhead` juntos. O limite de quadros acima de 40 ms tem folga para um ou dois picos isolados de rasterização
 * que o Chromium sem placa de vídeo faz no primeiro desenho de um chunk (não são geração e não dependem da pré-geração).
 */
test("andando pela cidade, o render não gera chunk e quase nenhum quadro passa de 40 ms (desktop/Android)", async ({ page }) => {
  const bundle = await build({
    stdin: { contents: "import { WorldRenderer } from './src/render/WorldRenderer.ts'; globalThis.K = { WorldRenderer };", resolveDir: process.cwd(), loader: "ts" },
    bundle: true, format: "iife", write: false, logLevel: "error",
  });
  await page.setContent("<body></body>");
  await page.addScriptTag({ content: bundle.outputFiles[0]!.text });
  const result = await page.evaluate(() => {
    type Renderer = { render(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, a: boolean): void;
      warmAhead(x: number, y: number, w: number, h: number, t: number): number;
      stats(): { generatedInRender: number; generatedByPrefetch: number }; getCachedCount(): number };
    const K = (globalThis as unknown as { K: { WorldRenderer: new (seed: number) => Renderer } }).K;
    const W = 1280, H = 720, canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!, world = new K.WorldRenderer(842136);
    let x = -1100, t = 0;
    const y = 15500 * 32, frames: number[] = [];
    world.render(ctx, x, y, W, H, 0, false);
    const initial = world.stats().generatedInRender;
    let maxCache = 0;
    for (let i = 0; i < 60 * 12; i++) {
      t += 1 / 60; x += 170 / 60;
      const start = performance.now();
      world.render(ctx, x, y, W, H, t, false);
      world.warmAhead(x, y, W, H, t);
      frames.push(performance.now() - start);
      ctx.getImageData(0, 0, 1, 1);
      maxCache = Math.max(maxCache, world.getCachedCount());
    }
    frames.sort((a, b) => a - b);
    return { initial, afterStart: world.stats().generatedInRender - initial, prefetched: world.stats().generatedByPrefetch, maxCache,
      p99: frames[Math.floor(frames.length * 0.99)]!, over40: frames.filter(f => f > 40).length, over20: frames.filter(f => f > 20).length };
  });
  test.info().annotations.push({ type: "caminhada", description: JSON.stringify({ ...result, p99: +result.p99.toFixed(1) }) });
  expect(result.afterStart, "chunks gerados dentro do render depois do primeiro quadro").toBe(0);
  expect(result.prefetched, "chunks preparados pela pré-geração").toBeGreaterThanOrEqual(8);
  expect(result.maxCache, "o cache nunca passa da capacidade").toBeLessThanOrEqual(24);
  expect(result.p99, "p99 do quadro (ms)").toBeLessThan(30);
  expect(result.over40, "quadros acima de 40 ms").toBeLessThanOrEqual(4);
});
