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
