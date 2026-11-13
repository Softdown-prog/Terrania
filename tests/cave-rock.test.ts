import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CaveFloor } from "../src/world/caveFloor.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import { CAVE_PALETTE } from "../src/render/caveDetails.ts";
import { rgbOf } from "../src/render/caveRock/index.ts";
import { mix } from "../src/render/draw.ts";
import { AO_REACH, LIP_WIDTH, ROCK_PER_TILE, ROCK_RAMP_STEPS, WET_LEVEL_FOR_TESTS, caveRockCanvas, distanceTo, rockHeight, rockLook, rockShape, shadeRock, stratum,
  type TileOpenness } from "./helpers/caveRockApi.ts";

/**
 * Rocha contínua das cavernas (ADR 0051): chão e parede saem de um mesmo campo de altura, a silhueta do vazio é arredondada e
 * o chão escurece junto das paredes. Tudo função pura, testada em Node sem canvas.
 */
const SEED = 842136;
const floorOf = (cx: number, cy: number): CaveFloor => new CaveFloor(caveEntranceInCell(cx, cy, SEED)!);
const CAVES = [[60, -85], [60, -81], [75, -75], [64, -76]] as const;
const tilesOf = (floor: CaveFloor): TileOpenness => ({ width: 42, height: 30, open: (x, y) => floor.at(x, y) !== 0, wet: (x, y) => floor.at(x, y) === 2 });
/** Uma grade de teste: tudo rocha, menos os tiles pedidos. */
const grid = (w: number, h: number, open: (x: number, y: number) => boolean, wet?: (x: number, y: number) => boolean): TileOpenness =>
  ({ width: w, height: h, open, ...(wet ? { wet } : {}) });
const lum = (px: Uint8ClampedArray, k: number): number => 0.2126 * px[k * 4]! + 0.7152 * px[k * 4 + 1]! + 0.0722 * px[k * 4 + 2]!;

test("a altura da rocha é estável, depende da semente, fica em 0 a 1 e muda pouco de um ponto para o vizinho", () => {
  let lo = 9, hi = -9, jump = 0;
  for (let i = 0; i < 4000; i++) {
    const x = (i % 80) * 0.37, y = Math.floor(i / 80) * 0.41, h = rockHeight(x, y, SEED);
    assert.equal(h, rockHeight(x, y, SEED));
    lo = Math.min(lo, h); hi = Math.max(hi, h);
    jump = Math.max(jump, Math.abs(rockHeight(x + 0.02, y, SEED) - h), Math.abs(rockHeight(x, y + 0.02, SEED) - h));
  }
  assert.ok(lo >= 0 && hi <= 1.01, `faixa ${lo.toFixed(2)}..${hi.toFixed(2)}`);
  assert.ok(hi - lo > 0.55, "usa boa parte da faixa");
  assert.ok(jump < 0.04, `salto de ${jump.toFixed(3)} em 0,02 tile`);
  assert.notEqual(rockHeight(3.3, 4.4, SEED), rockHeight(3.3, 4.4, SEED + 1));
});

test("a camada de rocha sedimentar sobe devagar, cai rápido e recomeça sem salto", () => {
  assert.equal(stratum(0), 0);
  assert.equal(stratum(0.78), 1);
  assert.ok(stratum(0.39) > 0.4 && stratum(0.39) < 0.6, "meio da subida");
  assert.ok(stratum(0.89) > 0.45 && stratum(0.89) < 0.55, "meio da queda");
  assert.ok(Math.abs(stratum(0.9999) - stratum(1.0001)) < 0.01, "emenda");
  assert.equal(stratum(2.5), stratum(0.5));
  assert.equal(stratum(-0.5), stratum(0.5));
});

test("a distância ao conjunto: zero dentro dele, cresce em passos e respeita o teto", () => {
  const mask = new Uint8Array(7 * 3).fill(1);
  mask[1 * 7 + 3] = 0;
  const d = distanceTo(mask, 7, 3, 0, 4);
  assert.equal(d[1 * 7 + 3], 0);
  assert.equal(d[1 * 7 + 4], 1);
  assert.equal(d[1 * 7 + 5], 2);
  assert.ok(Math.abs(d[0 * 7 + 4]! - Math.SQRT2) < 1e-6, "diagonal");
  assert.equal(d[1 * 7 + 0], 3);
  assert.equal(distanceTo(mask, 7, 3, 0, 2)[1 * 7 + 0], 2, "teto");
  assert.equal(distanceTo(new Uint8Array(4), 2, 2, 1, 5)[0], 5, "sem nenhum do conjunto, vale o teto");
});

test("a silhueta: o centro de cada tile tem o tipo do tile, fora do mapa é rocha e o vazio é arredondado", () => {
  for (const [cx, cy] of CAVES) {
    const floor = floorOf(cx, cy), shape = rockShape(tilesOf(floor), SEED);
    assert.equal(shape.w, 42 * ROCK_PER_TILE); assert.equal(shape.h, 30 * ROCK_PER_TILE);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 42; x++) {
      const i = x * ROCK_PER_TILE + ROCK_PER_TILE / 2, j = y * ROCK_PER_TILE + ROCK_PER_TILE / 2;
      // o miolo do tile (as quatro amostras centrais) tem o tipo do tile, salvo no meio de uma quina estreita
      const sample = shape.open[j * shape.w + i]!;
      if (floor.at(x, y) !== 0) {
        const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => floor.at(x + dx!, y + dy!) !== 0).length;
        if (around >= 2) assert.equal(sample, 1, `tile aberto ${x},${y}`);
      } else {
        const around = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => floor.at(x + dx!, y + dy!) === 0).length;
        if (around >= 3) assert.equal(sample, 0, `tile de rocha ${x},${y}`);
      }
    }
  }
  const lone = rockShape(grid(5, 5, (x, y) => x === 2 && y === 2), SEED);
  const at = (i: number, j: number): number => lone.open[j * lone.w + i]!;
  const c = 2 * ROCK_PER_TILE;
  assert.equal(at(c + 4, c + 4), 1, "o miolo do tile aberto");
  assert.equal(at(c, c), 0, "a quina do tile sozinho é arredondada");
  assert.equal(at(c + ROCK_PER_TILE * 2 - 1, c + ROCK_PER_TILE * 2 - 1), 0, "e a quina oposta também");
  assert.equal(at(0, 0), 0, "fora, rocha");
});

test("a borda do vazio nunca passa de cerca de um quarto de tile da borda do tile", () => {
  for (const [cx, cy] of CAVES) {
    const floor = floorOf(cx, cy), shape = rockShape(tilesOf(floor), SEED), tileOpen = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < 42 && y < 30 && floor.at(x, y) !== 0;
    const limit = ROCK_PER_TILE / 4 + 1;
    for (let j = 0; j < shape.h; j++) for (let i = 0; i < shape.w; i++) {
      const x = Math.floor(i / ROCK_PER_TILE), y = Math.floor(j / ROCK_PER_TILE), inside = tileOpen(x, y), mine = shape.open[j * shape.w + i] === 1;
      if (inside === mine) continue;
      // contradiz o tile: precisa estar a poucas amostras da borda do próprio tile
      const lx = i - x * ROCK_PER_TILE, ly = j - y * ROCK_PER_TILE;
      const toEdge = Math.min(lx, ROCK_PER_TILE - 1 - lx, ly, ROCK_PER_TILE - 1 - ly);
      assert.ok(toEdge < limit, `${cx},${cy}: amostra ${i},${j} a ${toEdge} da borda`);
    }
  }
});

test("a água cabe dentro do vazio, só aparece perto de tiles de água e uma poça de um tile vira uma lagoa redonda", () => {
  const floor = floorOf(60, -85), shape = rockShape(tilesOf(floor), SEED);
  let wet = 0;
  for (let j = 0; j < shape.h; j++) for (let i = 0; i < shape.w; i++) {
    const k = j * shape.w + i;
    if (!shape.wet[k]) continue;
    wet++;
    assert.equal(shape.open[k], 1, "água só no vazio");
    const x = Math.floor(i / ROCK_PER_TILE), y = Math.floor(j / ROCK_PER_TILE);
    const near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => floor.at(x + dx!, y + dy!) === 2);
    assert.ok(near, `água longe de qualquer tile de água em ${x},${y}`);
  }
  assert.ok(wet > 100, "há água");
  const pond = rockShape(grid(5, 5, () => true, (x, y) => x === 2 && y === 2), SEED);
  const count = pond.wet.reduce((s, v) => s + v, 0);
  assert.ok(count > ROCK_PER_TILE * ROCK_PER_TILE * 0.6 && count < ROCK_PER_TILE * ROCK_PER_TILE * 1.6, `lagoa de ${count} amostras`);
  assert.equal(pond.wet[2 * ROCK_PER_TILE * pond.w + 2 * ROCK_PER_TILE + 4], 1, "cheia no meio");
  assert.equal(rockShape(grid(5, 5, () => true), SEED).wet.reduce((s, v) => s + v, 0), 0, "sem a função de água, nada molhado");
  assert.ok(WET_LEVEL_FOR_TESTS < 0.5);
});

test("o sombreamento é estável, opaco, sem valores inválidos, e o chão escurece junto das paredes", () => {
  const floor = floorOf(60, -81), shape = rockShape(tilesOf(floor), SEED), look = rockLook(CAVE_PALETTE.verdant);
  const px = shadeRock(shape, SEED, look);
  assert.equal(px.length, shape.w * shape.h * 4);
  assert.deepEqual(shadeRock(shape, SEED, look), px);
  assert.notDeepEqual(shadeRock(shape, SEED + 1, look), px);
  for (let k = 0; k < shape.w * shape.h; k++) assert.equal(px[k * 4 + 3], 255);
  // brilho médio do chão seco por distância à parede: cresce com a distância até o teto da oclusão
  const toWall = distanceTo(shape.open, shape.w, shape.h, 0, AO_REACH + 4);
  const bucket = (lo: number, hi: number): number => {
    let sum = 0, n = 0;
    for (let k = 0; k < shape.w * shape.h; k++) if (shape.open[k] && !shape.wet[k] && toWall[k]! >= lo && toWall[k]! < hi) { sum += lum(px, k); n++; }
    return sum / n;
  };
  const near = bucket(0, 1.5), mid = bucket(2.5, 3.5), far = bucket(AO_REACH + 1, AO_REACH + 4);
  assert.ok(near < mid && mid < far, `oclusão ${near.toFixed(1)} < ${mid.toFixed(1)} < ${far.toFixed(1)}`);
  assert.ok(far - near > 12, "a diferença se vê");
});

test("a parede escurece com a profundidade e o filete da borda só acende onde ela olha para a luz", () => {
  const look = rockLook(CAVE_PALETTE.basalt);
  // corredor vertical aberto no meio de rocha larga: parede à esquerda (olha para leste) e à direita (olha para oeste, para a luz)
  const corridor = rockShape(grid(9, 6, x => x >= 3 && x <= 5), SEED), px = shadeRock(corridor, SEED, look);
  const row = 3 * ROCK_PER_TILE;
  const lipLeft = [] as number[], lipRight = [] as number[];
  const toOpen = distanceTo(corridor.open, corridor.w, corridor.h, 1, 8);
  for (let i = 0; i < corridor.w; i++) {
    const k = row * corridor.w + i;
    if (corridor.open[k] || toOpen[k]! >= LIP_WIDTH) continue;
    (i < 4 * ROCK_PER_TILE ? lipLeft : lipRight).push(lum(px, k));
  }
  assert.ok(lipLeft.length >= 1 && lipRight.length >= 1);
  const avg = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(avg(lipRight) > avg(lipLeft) + 3, `a borda da direita, voltada para a luz, é mais clara (${avg(lipRight).toFixed(1)} contra ${avg(lipLeft).toFixed(1)})`);
  // profundidade: no fundo da rocha a parede é mais escura que a um passo da borda
  const shallow = [] as number[], deep = [] as number[];
  const depthOf = distanceTo(corridor.open, corridor.w, corridor.h, 1, 8);
  for (let j = 0; j < corridor.h; j++) for (let i = 0; i < corridor.w; i++) {
    const k = j * corridor.w + i;
    if (corridor.open[k]) continue;
    if (depthOf[k]! >= 2.5 && depthOf[k]! < 4) shallow.push(lum(px, k));
    if (depthOf[k]! >= 8) deep.push(lum(px, k));
  }
  const wide = Array.from({ length: corridor.h - 2 * ROCK_PER_TILE }, (_, r) => { let n = 0; for (let i = 0; i < corridor.w; i++) n += corridor.open[(r + ROCK_PER_TILE) * corridor.w + i]!; return n; });
  assert.ok(Math.abs(avg(wide) - 3 * ROCK_PER_TILE) < 0.5, `corredor de 3 tiles com ${avg(wide).toFixed(2)} amostras de largura, sem engordar nem emagrecer`);
  assert.ok(avg(deep) < avg(shallow) - 2, `fundo ${avg(deep).toFixed(1)} < raso ${avg(shallow).toFixed(1)}`);
});

test("a água é mais azul que o chão, com filete claro na margem", () => {
  const look = rockLook(CAVE_PALETTE.glacial);
  const shape = rockShape(grid(11, 7, () => true, x => x >= 4 && x <= 6), SEED), px = shadeRock(shape, SEED, look);
  const j = 3 * ROCK_PER_TILE, mid = 5 * ROCK_PER_TILE + 4, dry = 1 * ROCK_PER_TILE + 4, k = (i: number): number => (j * shape.w + i) * 4;
  assert.equal(shape.wet[j * shape.w + mid], 1); assert.equal(shape.wet[j * shape.w + dry], 0);
  const gap = (i: number, ramp: ReadonlyArray<readonly [number, number, number]>): number =>
    Math.min(...ramp.map(c => Math.hypot(c[0] - px[k(i)]!, c[1] - px[k(i) + 1]!, c[2] - px[k(i) + 2]!)));
  assert.ok(gap(mid, look.water) < gap(mid, look.floor), "a água usa a rampa da água");
  assert.ok(gap(dry, look.floor) < gap(dry, look.water), "o chão seco usa a rampa do chão");
  const edge = (() => { for (let i = 4 * ROCK_PER_TILE - 6; i < 5 * ROCK_PER_TILE; i++) if (shape.wet[j * shape.w + i] && !shape.wet[j * shape.w + i - 1]) return i; return -1; })();
  assert.ok(edge > 0, "margem encontrada");
  assert.ok(lum(px, j * shape.w + edge) - lum(px, j * shape.w + edge + 6) > 25, "o filete da margem é bem mais claro que a água um pouco adiante");
});

test("a rampa tem 64 passos de cor, do escuro ao claro, para chão, parede e água", () => {
  for (const theme of Object.keys(CAVE_PALETTE) as Array<keyof typeof CAVE_PALETTE>) {
    const look = rockLook(CAVE_PALETTE[theme]);
    for (const ramp of [look.floor, look.wall, look.water]) {
      assert.equal(ramp.length, ROCK_RAMP_STEPS);
      const l = (c: readonly [number, number, number]): number => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      assert.ok(l(ramp[0]!) < l(ramp[ROCK_RAMP_STEPS - 1]!) - 15, theme);
    }
  }
});

test("o meio de cada rampa é a cor da paleta: água na da água, parede na da parede, chão perto da do chão", () => {
  const near = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  for (const theme of Object.keys(CAVE_PALETTE) as Array<keyof typeof CAVE_PALETTE>) {
    const p = CAVE_PALETTE[theme], look = rockLook(p), mid = ROCK_RAMP_STEPS / 2;
    assert.ok(near(look.water[mid]!, rgbOf(p.water)) < 8, theme + ": água");
    assert.ok(near(look.wall[mid]!, rgbOf(p.wall)) < 8, theme + ": parede");
    assert.ok(near(look.floor[mid]!, rgbOf(mix(p.ground, p.light, 0.2))) < 8, theme + ": chão");
    assert.deepEqual(look.rim, rgbOf(p.rim));
  }
});

test("a camada vira um canvas do tamanho da silhueta; sem Canvas completo devolve null", () => {
  const floor = floorOf(60, -85);
  const written: { w: number; h: number; data: Uint8ClampedArray | null } = { w: 0, h: 0, data: null };
  const g = globalThis as Record<string, unknown>, previous = g.document;
  g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({
    createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (image: { width: number; height: number; data: Uint8ClampedArray }) => { written.w = image.width; written.h = image.height; written.data = image.data; },
  }) }) };
  try {
    const canvas = caveRockCanvas(tilesOf(floor), SEED, CAVE_PALETTE.verdant);
    assert.ok(canvas); assert.equal(canvas.width, 336); assert.equal(canvas.height, 240);
    assert.equal(written.w, 336); assert.equal(written.h, 240);
    assert.deepEqual(written.data, shadeRock(rockShape(tilesOf(floor), SEED), SEED, rockLook(CAVE_PALETTE.verdant)));
    g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }) };
    assert.equal(caveRockCanvas(tilesOf(floor), SEED, CAVE_PALETTE.verdant), null);
    g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => null }) };
    assert.equal(caveRockCanvas(tilesOf(floor), SEED, CAVE_PALETTE.verdant), null);
  } finally { if (previous === undefined) delete g.document; else g.document = previous; }
});

test("cada peça está no seu arquivo e o piso da caverna usa a rocha contínua no lugar do preenchimento por tile", () => {
  const files = readdirSync(new URL("../src/render/caveRock/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["field", "index", "layer", "look", "openness", "shade"]);
  const src = readFileSync("src/render/cave.ts", "utf8");
  assert.match(src, /caveRockCanvas\(\{ width: CAVE_WIDTH, height: CAVE_HEIGHT, open: isOpen, wet: \(x, y\) => floor\.at\(x, y\) === 2 \}, seed, p\)/);
  assert.match(src, /if \(!rock\) \{\s*ctx\.fillStyle = mix\(p\.wall, p\.ground/);
  assert.match(src, /if \(tile === 2 && rock\) continue;/);
  for (const bad of ["Math.random", "Date.now", "performance.now", "new Date("]) for (const f of files)
    assert.equal(readFileSync(`src/render/caveRock/${f}.ts`, "utf8").includes(bad), false, `${f}: ${bad}`);
});
