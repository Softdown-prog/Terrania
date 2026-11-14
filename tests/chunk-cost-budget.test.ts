import test from "node:test";
import assert from "node:assert/strict";
import { chunkCost } from "./helpers/chunkCost.ts";

/**
 * Orçamento de custo por chunk (ADR 0046). O mapa é desenhado um chunk (16 × 16 tiles) de cada vez, de forma síncrona,
 * no momento em que ele aparece; cada operação a mais num tile se multiplica por 256. O custo (operações de pintura e
 * degradês) é contado, não cronometrado, então o teste é exato e igual em qualquer máquina. Estourar um limite não é um
 * erro de código: é a hora de decidir se a camada nova vale o custo ou se precisa de uma versão mais barata, e só então
 * subir o limite, com o motivo no ADR.
 */
const SEED = 842136;
/** Medido em 2026-11-12, com ~20 % de folga. */
const BUDGETS: ReadonlyArray<{ name: string; cx: number; cy: number; ops: number; gradients: number }> = [
  { name: "praça da cidade (o chunk mais pesado)", cx: 0, cy: 968, ops: 10_800, gradients: 170 },
  { name: "cidade, norte", cx: 0, cy: 966, ops: 4_700, gradients: 290 },
  // A capital dos povos humanos (ADR 0057), medida em 2026-11-14, com ~20 % de folga.
  { name: "capital, praça (rosa dos ventos)", cx: -1, cy: -50, ops: 6_500, gradients: 75 },
  { name: "capital, Grande Portão do Norte", cx: -1, cy: -52, ops: 10_200, gradients: 60 },
  { name: "lago negro", cx: 5, cy: 973, ops: 2_800, gradients: 25 },
  { name: "dunas", cx: 1, cy: 977, ops: 2_700, gradients: 10 },
  { name: "ruínas", cx: 13, cy: 902, ops: 2_700, gradients: 12 },
  { name: "mata do oeste", cx: -9, cy: 0, ops: 7_000, gradients: 200 },
  { name: "vilarejo", cx: 0, cy: 0, ops: 9_200, gradients: 170 },
  { name: "norte", cx: 0, cy: 18, ops: 8_500, gradients: 150 },
];
/** Nenhum chunk do mundo pode passar disto, onde quer que esteja. */
const ANY_CHUNK = { ops: 10_800, gradients: 300 };

test("cada tipo de chunk fica dentro do seu orçamento de operações e degradês", () => {
  for (const b of BUDGETS) {
    const cost = chunkCost(b.cx, b.cy, SEED);
    assert.ok(cost.ops <= b.ops, `${b.name}: ${cost.ops} operações (limite ${b.ops})`);
    assert.ok(cost.gradients <= b.gradients, `${b.name}: ${cost.gradients} degradês (limite ${b.gradients})`);
    assert.ok(cost.ops > b.ops * 0.5, `${b.name}: ${cost.ops} operações, menos da metade do limite ${b.ops}: o limite ficou folgado demais, aperte-o`);
  }
});

test("o custo é exato: o mesmo chunk e a mesma semente custam o mesmo, e a semente muda o desenho", () => {
  assert.deepEqual(chunkCost(0, 968, SEED), chunkCost(0, 968, SEED));
  assert.notDeepEqual(chunkCost(0, 968, SEED), chunkCost(0, 968, SEED + 1));
});

test("uma varredura de chunks pelas quatro regiões e pela cidade nunca passa do teto de qualquer chunk", () => {
  let worst = { ops: 0, gradients: 0, at: "" }, count = 0;
  for (const [x0, x1, y0, y1] of [[-20, 20, -6, 6], [-20, 20, 14, 30], [10, 40, -10, 10], [-20, 20, -40, -20], [-6, 6, 960, 976], [-30, -10, 965, 975], [10, 30, 965, 980], [-4, 3, -53, -48]] as const)
    for (let cx = x0; cx <= x1; cx += 4) for (let cy = y0; cy <= y1; cy += 4) {
      const c = chunkCost(cx, cy, SEED); count++;
      if (c.ops > worst.ops) worst = { ops: c.ops, gradients: worst.gradients, at: `${cx},${cy}` };
      worst.gradients = Math.max(worst.gradients, c.gradients);
    }
  assert.ok(count > 100, "chunks varridos: " + count);
  assert.ok(worst.ops <= ANY_CHUNK.ops, `o pior chunk (${worst.at}) tem ${worst.ops} operações (limite ${ANY_CHUNK.ops})`);
  assert.ok(worst.gradients <= ANY_CHUNK.gradients, `degradês no pior chunk: ${worst.gradients} (limite ${ANY_CHUNK.gradients})`);
});

test("o piso da cidade está otimizado: um degradê de polimento só a cada três tiles e quinas sem tiras com transparência", () => {
  // Antes da otimização (ADR 0046) a praça custava 12.141 operações e 510 degradês, e levava 29 ms para ser desenhada.
  const plaza = chunkCost(0, 968, SEED), north = chunkCost(0, 966, SEED);
  assert.ok(plaza.ops < 10_000, "praça: " + plaza.ops);
  assert.ok(plaza.gradients < 170, "o degradê de polimento só existe em um de cada três tiles (antes: um por tile): " + plaza.gradients);
  assert.ok(north.ops < plaza.ops, "o chunk só de calçada (a praça) é o mais caro da cidade");
});
