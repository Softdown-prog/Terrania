import test from "node:test";
import assert from "node:assert/strict";
import { CHUNK_STEP_TILES, generateChunkCanvas, generateChunkSteps } from "../src/render/terrain.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Geração do chunk em passos (ADR 0047): cada passo é uma fatia pequena do trabalho, e o desenho final é exatamente o do
 * chunk inteiro de uma vez. Isso é o que deixa o `WorldRenderer` espalhar a geração por vários quadros.
 */
const SEED = 842136;
/** Chunks de tipos diferentes: praça da cidade, lago, dunas, mata e vilarejo. */
const SPOTS: ReadonlyArray<readonly [string, number, number]> = [["praça", 0, 968], ["lago", 5, 973], ["dunas", 1, 977], ["mata", -9, 0], ["vilarejo", 0, 0]];

/** Um Canvas gravador (com `createImageData`) para todos os canvases do chunk, e um jeito de ler o que foi gravado até agora. */
function harness(): { doc: object; recorder: Recorder } {
  const recorder = new Recorder();
  const proxy = new Proxy(recorder.ctx, {
    get(target, prop) {
      if (prop === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) { (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; },
  });
  return { doc: { createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) }, recorder };
}

test("o chunk em passos tem 22 passos: nove de chão, desfoque, relevo duas vezes, terra da cidade, lago e sete de detalhes", () => {
  const { doc } = harness();
  let yields = 0;
  withDocument(doc, () => { const steps = generateChunkSteps(0, 968, SEED); for (;;) { const n = steps.next(); if (n.done) break; yields++; } });
  assert.equal(CHUNK_STEP_TILES, 36);
  // 18 × 18 = 324 tiles de chão em lotes de 36 (9), o desfoque (1), duas camadas de relevo (2), a terra da cidade (1), o lago (1), 256 tiles de detalhe em lotes de 36 (7), mais o fim do chão (1)
  assert.equal(yields, 9 + 1 + 1 + 2 + 1 + 1 + 7);
});

test("o desenho em passos é exatamente o do chunk inteiro, em qualquer tipo de lugar", () => {
  for (const [name, cx, cy] of SPOTS) {
    // Os desenhos guardam sprites em cache na primeira vez que aparecem; aquece antes, para as duas formas partirem do mesmo estado.
    withDocument(harness().doc, () => generateChunkCanvas(cx, cy, SEED));
    const whole = harness(), sliced = harness();
    withDocument(whole.doc, () => generateChunkCanvas(cx, cy, SEED));
    withDocument(sliced.doc, () => { const steps = generateChunkSteps(cx, cy, SEED); while (!steps.next().done); });
    assert.equal(sliced.recorder.metrics().signature, whole.recorder.metrics().signature, name);
    assert.equal(sliced.recorder.metrics().paintOps, whole.recorder.metrics().paintOps, name);
  }
});

test("nenhum passo concentra o trabalho: o maior passo faz uma fração pequena das operações do chunk", () => {
  for (const [name, cx, cy] of SPOTS) {
    const { doc, recorder } = harness(), deltas: number[] = [];
    withDocument(doc, () => {
      const steps = generateChunkSteps(cx, cy, SEED);
      let before = 0;
      for (;;) {
        const n = steps.next(), now = recorder.metrics().paintOps;
        deltas.push(now - before); before = now;
        if (n.done) break;
      }
    });
    const total = deltas.reduce((a, b) => a + b, 0), biggest = Math.max(...deltas);
    assert.ok(total > 1000, `${name}: ${total} operações`);
    assert.ok(biggest <= total * 0.2, `${name}: o maior passo tem ${biggest} das ${total} operações (limite de 20 %)`);
    assert.ok(deltas.filter(d => d > 0).length >= 15, `${name}: ao menos 15 passos com trabalho`);
  }
});

test("o gerador devolve o canvas só no fim, e dois chunks diferentes não se misturam", () => {
  const { doc } = harness();
  withDocument(doc, () => {
    const steps = generateChunkSteps(0, 968, SEED), first = steps.next();
    assert.equal(first.done, false);
    assert.equal(first.value, undefined, "no meio do caminho não há canvas pronto");
    let last = first;
    while (!last.done) last = steps.next();
    assert.ok(last.value && typeof (last.value as { getContext?: unknown }).getContext === "function", "no fim, o canvas");
  });
  const a = harness(), b = harness();
  withDocument(a.doc, () => generateChunkCanvas(0, 968, SEED));
  withDocument(b.doc, () => generateChunkCanvas(1, 977, SEED));
  assert.notEqual(a.recorder.metrics().signature, b.recorder.metrics().signature);
});
