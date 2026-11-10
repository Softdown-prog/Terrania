import test from "node:test";
import assert from "node:assert/strict";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { getTile, isBlackLake, isWalkable, TILE_SIZE } from "../src/world/terrain.ts";
import { getRegionWeights, getWorldRegion } from "../src/world/regions.ts";
import { getRegionalLandmarkForCell } from "../src/world/regionalLandmarks.ts";
import { caveEntrancesInArea } from "../src/world/caves.ts";
import { RUIN_CELL_TILES, RUIN_NAMES, RUIN_PIECES, getSouthRuinForCell, southRuinBlocks,
  southRuinsInArea, type RuinVariant, type SouthRuin } from "../src/world/southRuins.ts";

/**
 * Ruínas e lago negro dos Ermos do Sul (ADR 0017). O Go não espelha estes dois sistemas,
 * então as amostras da paridade (tiles e marcos perto do centro) precisam continuar idênticas.
 */
const SEED = 842136;
const allRuins = (seed = SEED): SouthRuin[] => {
  const out: SouthRuin[] = [];
  for (let cy = 30; cy <= 90; cy += 1) for (let cx = -30; cx <= 30; cx += 1) {
    const ruin = getSouthRuinForCell(cx, cy, seed);
    if (ruin) out.push(ruin);
  }
  return out;
};

test("paridade com o Go: as amostras de tile e de marco regional não mudaram", () => {
  const tiles = [[0, 0], [1, 1], [-3, 5], [12, -8], [40, 18], [-19, -12], [200, 50]]
    .map(([x, y]) => { const t = getTile(x!, y!, SEED); return [t.ground, t.tree, t.rock]; });
  assert.deepEqual(tiles, [["path", false, false], ["grass", false, false], ["grass", false, false],
    ["water", false, false], ["water", false, false], ["forest", false, false], ["forest", false, false]]);
  const landmarks = [[0, -70], [0, -71], [0, 70], [0, 71], [70, 0], [71, 0], [-70, 0], [-71, 0]]
    .map(([cx, cy]) => { const l = getRegionalLandmarkForCell(cx!, cy!, SEED); return l ? [l.kind, l.tileX, l.tileY] : null; });
  assert.deepEqual(landmarks, [["ice-spire", 175, -17797], null, null, ["desert-obelisk", 93, 18294], null, null, null,
    ["mountain-monolith", -18128, 130]]);
});

test("lago negro: só existe no Sul, é água sem passagem e deixa cerca de 2% do Sul alagado", () => {
  let south = 0, lake = 0, outside = 0, walkableLake = 0;
  for (let ty = 9000; ty < 9400; ty += 2) for (let tx = -300; tx < 300; tx += 2) {
    const tile = getTile(tx, ty, SEED), inSouth = getWorldRegion(tx, ty) === "south";
    if (inSouth) south++;
    if (tile.biome === "black-lake") {
      lake++;
      if (!inSouth) outside++;
      if (tile.ground !== "water" || isWalkable(tx, ty, SEED)) walkableLake++;
    }
  }
  assert.equal(outside, 0, "nenhum lago negro fora do Sul");
  assert.equal(walkableLake, 0, "todo tile de lago é água e bloqueia");
  assert.ok(lake / south > 0.012 && lake / south < 0.05, "proporção do Sul alagada: " + (lake / south).toFixed(3));
});

test("lago negro: nunca na área inicial, no centro, no Norte, no Leste, no Oeste nem sobre as vias", () => {
  // janelas de 600x600 tiles em cada região; um único tile de lago negro fora do Sul reprova
  const windows: ReadonlyArray<readonly [string, number, number]> = [["centro", -300, -300], ["norte", -300, -9500],
    ["leste", 9500, -300], ["oeste", -9800, -300]];
  for (const [name, x0, y0] of windows)
    for (let ty = y0; ty < y0 + 600; ty += 3) for (let tx = x0; tx < x0 + 600; tx += 3)
      assert.notEqual(getTile(tx, ty, SEED).biome, "black-lake", `lago negro em ${name} (${tx},${ty})`);
  assert.equal(isBlackLake(5, 5, SEED, 0.2), false);
  assert.equal(isBlackLake(100, 100, SEED, 0.61), false, "só com forte influência do Sul");
  for (let ty = 6000; ty < 9000; ty += 7) assert.notEqual(getTile(0, ty, SEED).biome, "black-lake", "a via central do Sul segue seca");
});

test("ruínas: determinísticas, só no Sul, e há várias de cada modelo", () => {
  const first = allRuins(), again = allRuins();
  assert.deepEqual(first, again);
  assert.ok(first.length > 300, "ruínas encontradas: " + first.length);
  const byVariant = [0, 0, 0, 0];
  for (const ruin of first) {
    byVariant[ruin.variant]++;
    assert.equal(ruin.name, RUIN_NAMES[ruin.variant]);
    assert.ok(getRegionWeights(ruin.tileX, ruin.tileY).south >= 0.62);
    assert.equal(getWorldRegion(ruin.tileX, ruin.tileY), "south");
  }
  for (const count of byVariant) assert.ok(count > 40, "cada modelo aparece: " + byVariant.join("/"));
  assert.notDeepEqual(allRuins(SEED + 1).map(r => [r.tileX, r.tileY, r.variant]), first.map(r => [r.tileX, r.tileY, r.variant]),
    "outra semente gera outro mapa de ruínas");
});

test("ruínas: a pegada é chão livre, longe da borda do bloco desenhado e do marco regional", () => {
  for (const ruin of allRuins().slice(0, 250)) {
    const dx = ((ruin.tileX % 16) + 16) % 16, dy = ((ruin.tileY % 16) + 16) % 16;
    assert.ok(dx >= 4 && dx <= 11 && dy >= 4 && dy <= 11, "a arte cabe no bloco de 16 tiles");
    for (let y = ruin.tileY - 2; y <= ruin.tileY + 2; y++) for (let x = ruin.tileX - 4; x <= ruin.tileX + 4; x++) {
      const tile = getTile(x, y, SEED);
      assert.ok(tile.ground !== "water" && tile.ground !== "path" && !tile.tree && !tile.rock, `${ruin.id} tile ${x},${y}`);
    }
    const cx = Math.floor(ruin.tileX / RUIN_CELL_TILES), cy = Math.floor(ruin.tileY / RUIN_CELL_TILES);
    assert.equal(Math.floor(ruin.tileX / RUIN_CELL_TILES), cx);
    assert.equal(southRuinsInArea(ruin.tileX - 1, ruin.tileY - 1, ruin.tileX + 1, ruin.tileY + 1, SEED)[0]?.id, ruin.id);
    for (let ddy = -1; ddy <= 1; ddy++) for (let ddx = -1; ddx <= 1; ddx++) {
      const landmark = getRegionalLandmarkForCell(Math.floor(ruin.tileX / 256) + ddx, Math.floor(ruin.tileY / 256) + ddy, SEED);
      if (landmark) assert.ok(Math.hypot(landmark.tileX - ruin.tileX, landmark.tileY - ruin.tileY) >= 12);
    }
  }
});

test("ruínas: nenhuma entrada de caverna cai dentro da pegada de uma ruína", () => {
  for (const ruin of allRuins()) {
    const near = caveEntrancesInArea(ruin.tileX - 5, ruin.tileY - 3, ruin.tileX + 5, ruin.tileY + 3, SEED);
    assert.deepEqual(near, [], `${ruin.id} tem caverna dentro da pegada`);
  }
});

test("ruínas: peças sólidas bloqueiam, o vão e o entorno livre não, e o centro é alcançável", () => {
  const ruins = allRuins();
  for (const variant of [0, 1, 2, 3] as const satisfies readonly RuinVariant[]) {
    const ruin = ruins.find(r => r.variant === variant)!;
    const solid = RUIN_PIECES[variant].filter(piece => piece.solid);
    assert.ok(solid.length >= 4, "toda ruína tem peças sólidas");
    for (const piece of solid)
      assert.equal(canMoveOnSeed(ruin.x + piece.x, ruin.y + piece.y, SEED), false, `${RUIN_NAMES[variant]}: ${piece.kind} em ${piece.x},${piece.y}`);
    for (const piece of RUIN_PIECES[variant].filter(p => !p.solid && p.kind !== "steps"))
      assert.equal(southRuinBlocks(ruin.x + piece.x, ruin.y + piece.y, 7, SEED), false, "peça baixa não bloqueia");
    assert.equal(southRuinBlocks(ruin.x + 300, ruin.y, 7, SEED), false, "longe da ruína tudo segue livre");
    // alcançabilidade: varredura em grade de 4 px com o raio do herói, a partir de fora até o contato
    const step = 4, w = 150, h = 90, cols = Math.floor((w * 2) / step) + 1, rows = Math.floor((h * 2) / step) + 1;
    const free = (i: number, j: number): boolean => !southRuinBlocks(ruin.x - w + i * step, ruin.y - h + j * step, 7, SEED);
    const seen = new Set<number>(), queue: Array<[number, number]> = [[0, rows - 1]];
    seen.add((rows - 1) * cols);
    while (queue.length) {
      const [i, j] = queue.pop()!;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= cols || b >= rows || seen.has(b * cols + a) || !free(a, b)) continue;
        seen.add(b * cols + a); queue.push([a, b]);
      }
    }
    // Um ponto de interior por modelo: o vão entre colunas, a porta, o centro da torre e o cômodo de barro.
    const [px, py] = ({ 0: [21, 4], 1: [0, -10], 2: [0, -6], 3: [-20, -4] } as const)[variant];
    const ci = Math.round((w + px) / step), cj = Math.round((h + py) / step);
    assert.ok(free(ci, cj), `${RUIN_NAMES[variant]}: o ponto de interior ${px},${py} precisa estar livre`);
    assert.ok(seen.has(cj * cols + ci), `${RUIN_NAMES[variant]}: o interior precisa ser alcançável a pé`);
  }
  void TILE_SIZE;
});
