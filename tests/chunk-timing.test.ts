import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHUNK_TIME_LIMITS, TIMING_ROUNDS, lowerQuartile, measureChunkTimes, type TimingSpot } from "./helpers/chunkTiming.ts";

/**
 * A medição de tempo de chunk (ADR 0054). O teste de navegador falhava à toa: as dunas e a cidade eram medidas em momentos
 * diferentes, e a carga da máquina (que só soma tempo) caía mais sobre um do que sobre o outro, então a razão passava de 3,5
 * com o mesmo código. Aqui se simula essa carga e se confere que a medição nova fica estável e ainda pega um chunk que
 * ficou de verdade mais pesado.
 */
const SPOTS: readonly TimingSpot[] = [
  { name: "dunas", cx: 1, cy: 977 }, { name: "praca", cx: 0, cy: 968 }, { name: "cidadeSul", cx: 0, cy: 970 }, { name: "lago", cx: 5, cy: 973 },
];
/** Custo verdadeiro de cada lugar (ms): a praça e a cidade custam cerca de 2,6 vezes as dunas. */
const COST: Record<string, number> = { dunas: 10, praca: 25, cidadeSul: 26, lago: 11 };

/** Gerador pseudoaleatório com semente (só para os testes): a mesma semente dá a mesma carga. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Uma máquina carregada: o relógio é simulado, cada desenho gasta o custo do lugar vezes a lentidão do momento, e a lentidão
 * muda em fases de `phase` desenhos (de 1 a 1,9 vezes) com picos ocasionais. `extra` engorda um lugar para simular regressão.
 */
function machine(noiseSeed: number, extra: Record<string, number> = {}, phase = 4) {
  const rnd = lcg(noiseSeed), slow: number[] = [];
  let clock = 0, draws = 0;
  const bySpot = new Map(SPOTS.map(s => [`${s.cx},${s.cy}`, s.name]));
  return {
    now: () => clock,
    draw: (cx: number, cy: number): void => {
      const index = Math.floor(draws++ / phase);
      while (slow.length <= index) slow.push(1 + rnd() * 0.9);
      const name = bySpot.get(`${cx},${cy}`)!;
      const spike = rnd() < 0.15 ? 1 + rnd() * 0.8 : 1;
      clock += COST[name]! * (extra[name] ?? 1) * slow[index]! * spike;
    },
  };
}

/** O método de antes: um lugar de cada vez, mediana de 9 desenhos. */
function legacy(m: ReturnType<typeof machine>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const spot of SPOTS) {
    m.draw(spot.cx, spot.cy); m.draw(spot.cx, spot.cy);
    const times: number[] = [];
    for (let i = 0; i < 9; i++) { const t = m.now(); m.draw(spot.cx, spot.cy); times.push(m.now() - t); }
    times.sort((a, b) => a - b);
    out[spot.name] = times[4]!;
  }
  return out;
}
const modern = (m: ReturnType<typeof machine>): Record<string, number> => measureChunkTimes(SPOTS, TIMING_ROUNDS, 7, m.draw, m.now);

test("o quartil inferior pega o lado baixo da lista e trata lista vazia", () => {
  assert.equal(lowerQuartile([9, 3, 5, 7, 1, 8, 2]), 2);
  assert.equal(lowerQuartile([4]), 4);
  assert.equal(lowerQuartile([5, 1]), 1);
  assert.equal(lowerQuartile([8, 6, 4, 2]), 2);
  assert.equal(lowerQuartile([30, 10, 20, 40, 50, 60, 70, 80, 90]), 30, "9 valores: o terceiro menor");
  assert.equal(lowerQuartile([50, 40, 30, 20, 10]), 20, "5 valores: o segundo menor");
  assert.ok(Number.isNaN(lowerQuartile([])));
});

test("a medição intercala os lugares, gira a ordem a cada rodada, aquece antes e mede a quantidade certa", () => {
  const calls: Array<[number, number, number]> = [];
  let t = 0;
  const times = measureChunkTimes(SPOTS, 3, 100, (cx, cy, seed) => { calls.push([cx, cy, seed]); }, () => (t += 1));
  assert.deepEqual(calls.slice(0, 8), [1, 977, 0, 968, 0, 970, 5, 973].reduce<Array<[number, number, number]>>((out, _, i, a) => {
    if (i % 2) return out;
    out.push([a[i]!, a[i + 1]!, 100], [a[i]!, a[i + 1]!, 199]);
    return out;
  }, []), "aquece cada lugar duas vezes, com duas sementes");
  const measured = calls.slice(8);
  assert.equal(measured.length, 3 * SPOTS.length);
  assert.deepEqual(measured.slice(0, 4).map(c => c[0] + "," + c[1]), ["1,977", "0,968", "0,970", "5,973"], "rodada 1 começa nas dunas");
  assert.deepEqual(measured.slice(4, 8).map(c => c[0] + "," + c[1]), ["0,968", "0,970", "5,973", "1,977"], "rodada 2 gira a ordem");
  assert.deepEqual(measured.slice(8, 12).map(c => c[0] + "," + c[1]), ["0,970", "5,973", "1,977", "0,968"], "rodada 3 gira de novo");
  assert.deepEqual(measured.slice(0, 4).map(c => c[2]), [101, 101, 101, 101], "a semente muda a cada rodada");
  assert.deepEqual(measured.slice(8, 12).map(c => c[2]), [103, 103, 103, 103]);
  assert.deepEqual(Object.keys(times), SPOTS.map(s => s.name));
  assert.equal(TIMING_ROUNDS, 15);
});

test("sem carga, o tempo medido é o custo de cada lugar", () => {
  let clock = 0;
  const times = measureChunkTimes(SPOTS, TIMING_ROUNDS, 7, (cx, cy) => { clock += COST[SPOTS.find(s => s.cx === cx && s.cy === cy)!.name]!; }, () => clock);
  assert.deepEqual(times, COST);
});

test("com carga na máquina, o método antigo falha à toa e o novo fica estável, em 300 máquinas diferentes", () => {
  const trueRatio = COST.cidadeSul! / COST.dunas!;
  let legacyOver = 0, modernMax = 0, modernMin = 99;
  for (let seed = 1; seed <= 300; seed++) {
    const old = legacy(machine(seed)), now = modern(machine(seed));
    if (Math.max(old.praca! / old.dunas!, old.cidadeSul! / old.dunas!) > 3.5) legacyOver++;
    const ratio = Math.max(now.praca! / now.dunas!, now.cidadeSul! / now.dunas!);
    modernMax = Math.max(modernMax, ratio); modernMin = Math.min(modernMin, now.cidadeSul! / now.dunas!);
    assert.ok(now.lago! / now.dunas! < CHUNK_TIME_LIMITS.lake, `lago na máquina ${seed}`);
    assert.ok(now.cidadeSul! < CHUNK_TIME_LIMITS.absoluteMs);
  }
  assert.ok(legacyOver >= 15, `o método antigo passaria de 3,5 em ${legacyOver} de 300 máquinas (é a falha à toa de antes)`);
  assert.ok(modernMax < CHUNK_TIME_LIMITS.city, `o novo fica abaixo de ${CHUNK_TIME_LIMITS.city} (pior caso ${modernMax.toFixed(2)})`);
  assert.ok(modernMax < trueRatio * 1.5 && modernMin > trueRatio * 0.7, `e perto do custo verdadeiro ${trueRatio.toFixed(2)} (de ${modernMin.toFixed(2)} a ${modernMax.toFixed(2)})`);
});

test("um chunk que ficou de verdade mais pesado continua sendo pego, mesmo com a carga", () => {
  for (const factor of [2, 3]) {
    let caught = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const times = modern(machine(seed, { cidadeSul: factor }));
      if (times.cidadeSul! / times.dunas! >= CHUNK_TIME_LIMITS.city) caught++;
    }
    assert.ok(caught >= (factor === 2 ? 95 : 100), `custo ${factor}x pego em ${caught} de 100 máquinas`);
  }
  let lakeCaught = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const times = modern(machine(seed, { lago: 2.5 }));
    if (times.lago! / times.dunas! >= CHUNK_TIME_LIMITS.lake) lakeCaught++;
  }
  assert.ok(lakeCaught >= 95, `lago 2,5x mais pesado pego em ${lakeCaught} de 100`);
});

test("os limites: teto de 120 ms, cidade 4,5x e lago e mata 2x; o teste de navegador usa a medição e os limites", () => {
  assert.deepEqual(CHUNK_TIME_LIMITS, { absoluteMs: 120, city: 4.5, lake: 2, forest: 2 });
  const spec = readFileSync("tests/browser/chunk-time.spec.ts", "utf8");
  assert.match(spec, /K\.measureChunkTimes\(spots, K\.TIMING_ROUNDS, seed, K\.generateChunkCanvas, \(\) => performance\.now\(\)\)/);
  assert.match(spec, /toBeLessThan\(CHUNK_TIME_LIMITS\.absoluteMs\)/);
  assert.match(spec, /toBeLessThan\(CHUNK_TIME_LIMITS\.city\)/);
  assert.match(spec, /medians\.lago! \/ base, "lago contra dunas"\)\.toBeLessThan\(CHUNK_TIME_LIMITS\.lake\)/);
  assert.match(spec, /medians\.mata! \/ base, "mata contra dunas"\)\.toBeLessThan\(CHUNK_TIME_LIMITS\.forest\)/);
  assert.equal(spec.includes("3.5"), false, "o limite antigo saiu do teste");
});
