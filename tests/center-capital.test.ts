import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import type { CapitalPlot } from "../src/world/center/capital/index.ts";
import { CAPITAL, CAPITAL_DISTRICTS, CAPITAL_MONUMENT, CAPITAL_PLOTS, CAPITAL_STREETS, CAPITAL_TILE, capitalBlocks, capitalGround, capitalLocal, capitalPoint,
  capitalSafe, doorApproach, inPlot, insideCapital, isCapitalStreet, isCapitalWall, nearCapital } from "../src/world/center/capital/index.ts";
import { getTile, TILE_SIZE } from "../src/world/terrain.ts";
import { getWorldRegion } from "../src/world/regions.ts";
import { protectedSurfaceTile, villageGround } from "../src/world/village.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import { slimeSpawns } from "../src/actors/Slime.ts";
import { regionalSurfaceSpawns } from "../src/actors/RegionalMonster.ts";

/**
 * Capital dos povos humanos, parte 1: a planta (ADR 0055). Muralha, portões, ruas, quatro bairros e os terrenos de cada
 * construção, mais a zona protegida e a terra limpa em volta. Arte, colisão e interiores vêm nas partes seguintes.
 */
const SEEDS = [0, 42, 842136, 4294967295];
const W = CAPITAL.maxX - CAPITAL.minX + 1, H = CAPITAL.maxY - CAPITAL.minY + 1;
const tileAt = (lx: number, ly: number, seed = 842136) => getTile(CAPITAL.centerX + lx, CAPITAL.centerY + ly, seed);
const free = (lx: number, ly: number): boolean => { const p = capitalPoint(lx, ly); return !capitalBlocks(p.x, p.y, 7); };

test("a capital tem 80 × 64 tiles, fica no centro do mundo, longe da Vila da Travessia, e o tile é o mesmo do terreno", () => {
  assert.equal(W, 80); assert.equal(H, 64);
  assert.equal(CAPITAL_TILE, TILE_SIZE);
  for (const [lx, ly] of [[0, 0], [CAPITAL.minX, CAPITAL.minY], [CAPITAL.maxX, CAPITAL.maxY], [CAPITAL.minX - CAPITAL.margin, CAPITAL.minY - CAPITAL.margin], [CAPITAL.maxX + CAPITAL.margin, CAPITAL.maxY + CAPITAL.margin]])
    assert.equal(getWorldRegion(CAPITAL.centerX + lx, CAPITAL.centerY + ly), "center", `${lx},${ly}`);
  assert.ok(Math.hypot(CAPITAL.centerX, CAPITAL.centerY) > 700, "a capital fica a uma caminhada da vila");
  assert.ok(Math.hypot(CAPITAL.centerX, CAPITAL.centerY) < 1500, "mas não é uma expedição");
  assert.equal(CAPITAL.name, "Concórdia");
  assert.deepEqual(capitalLocal(CAPITAL.centerX + 3, CAPITAL.centerY - 4), [3, -4]);
  assert.deepEqual(capitalPoint(0, 0), { x: (CAPITAL.centerX + 0.5) * 32, y: (CAPITAL.centerY + 0.5) * 32 });
  assert.equal(insideCapital(CAPITAL.minX, CAPITAL.minY), true); assert.equal(insideCapital(CAPITAL.maxX + 1, 0), false);
});

test("dentro da muralha só há rua e grama, sem árvore, pedra nem água, em qualquer semente; a rua é caminho", () => {
  for (const seed of SEEDS) for (let ly = CAPITAL.minY; ly <= CAPITAL.maxY; ly++) for (let lx = CAPITAL.minX; lx <= CAPITAL.maxX; lx++) {
    const tile = tileAt(lx, ly, seed);
    assert.ok(!tile.tree && !tile.rock, `${seed} ${lx},${ly}`);
    assert.equal(tile.ground, isCapitalStreet(lx, ly) ? "path" : "grass");
    assert.equal(tile.biome, tile.ground === "path" ? "trail" : "meadow");
  }
  assert.equal(capitalGround(Number.NaN, 0), null);
  assert.equal(capitalGround(CAPITAL.centerX + CAPITAL.maxX + 1, CAPITAL.centerY), null);
  assert.equal(capitalGround(CAPITAL.centerX, CAPITAL.centerY), "path");
});

test("a terra em volta da muralha é limpa: só campo e estrada, sem lago, areia, mata, árvore nem pedra, em várias sementes", () => {
  let checked = 0;
  for (const seed of [1, 2, 3, 7, 8, 42, 842136]) for (let ly = CAPITAL.minY - CAPITAL.margin; ly <= CAPITAL.maxY + CAPITAL.margin; ly++) for (let lx = CAPITAL.minX - CAPITAL.margin; lx <= CAPITAL.maxX + CAPITAL.margin; lx++) {
    const tile = tileAt(lx, ly, seed);
    checked++;
    assert.ok((tile.ground === "grass" || tile.ground === "path") && !tile.tree && !tile.rock, `${seed} ${lx},${ly}: ${tile.ground}`);
  }
  assert.ok(checked > 7 * 150 * 140);
  assert.equal(nearCapital(CAPITAL.centerX + CAPITAL.maxX + CAPITAL.margin, CAPITAL.centerY), true);
  assert.equal(nearCapital(CAPITAL.centerX + CAPITAL.maxX + CAPITAL.margin + 1, CAPITAL.centerY), false);
  assert.equal(nearCapital(CAPITAL.centerX, CAPITAL.centerY + CAPITAL.minY - CAPITAL.margin - 1), false);
  // longe dali o mundo segue o gerador de sempre (há lago em alguma semente)
  let water = 0;
  for (let ly = -140; ly <= 140; ly++) for (let lx = 200; lx <= 340; lx++) if (getTile(CAPITAL.centerX + lx, CAPITAL.centerY + ly, 7).ground === "water") water++;
  assert.ok(water > 100, "fora da faixa limpa o gerador continua com água");
});

test("as duas estradas da travessia, a reta e a que serpenteia, entram pelo mesmo portão, em cima e embaixo", () => {
  for (const seed of [42, 842136]) for (const side of [-1, 1]) for (let k = 1; k <= 8; k++) {
    const ly = side < 0 ? CAPITAL.minY - k : CAPITAL.maxY + k, ty = CAPITAL.centerY + ly;
    const paths: number[] = [];
    for (let lx = -16; lx <= 16; lx++) if (getTile(CAPITAL.centerX + lx, ty, seed).ground === "path") paths.push(lx);
    assert.ok(paths.length >= 5, `há estrada a ${k} tiles do portão (${paths.length} tiles)`);
    for (const lx of paths) assert.ok(Math.abs(lx) <= CAPITAL.gateHalf, `estrada fora do portão em ${lx},${ly}`);
    const winding = Math.round(Math.sin(ty / 1200) * 7) - CAPITAL.centerX;
    assert.ok(paths.includes(winding), `a estrada que serpenteia (${winding}) chega ao portão`);
    assert.ok(paths.includes(0 - CAPITAL.centerX), "e a reta também");
  }
});

test("a muralha é um anel fechado de 266 tiles, com a abertura de 9 tiles nos portões norte e sul", () => {
  let walls = 0;
  for (let ly = CAPITAL.minY - 1; ly <= CAPITAL.maxY + 1; ly++) for (let lx = CAPITAL.minX - 1; lx <= CAPITAL.maxX + 1; lx++) if (isCapitalWall(lx, ly)) walls++;
  assert.equal(walls, 2 * (W + H) - 4 - 2 * (2 * CAPITAL.gateHalf + 1));
  assert.equal(walls, 266);
  for (let lx = CAPITAL.minX; lx <= CAPITAL.maxX; lx++) for (const ly of [CAPITAL.minY, CAPITAL.maxY]) {
    assert.equal(isCapitalWall(lx, ly), Math.abs(lx) > CAPITAL.gateHalf, `portão em ${lx},${ly}`);
    if (Math.abs(lx) <= CAPITAL.gateHalf) assert.equal(isCapitalStreet(lx, ly), true, "a boca do portão é rua");
  }
  for (let ly = CAPITAL.minY; ly <= CAPITAL.maxY; ly++) { assert.equal(isCapitalWall(CAPITAL.minX, ly), true); assert.equal(isCapitalWall(CAPITAL.maxX, ly), true); }
  assert.equal(isCapitalWall(0, 0), false);
  assert.equal(CAPITAL.northGate, "Grande Portão do Norte"); assert.equal(CAPITAL.southGate, "Grande Portão do Sul");
});

test("as ruas: dentro da muralha, sem repetir nome nem id, com a praça no centro e as avenidas cruzando a planta", () => {
  assert.equal(new Set(CAPITAL_STREETS.map(s => s.id)).size, CAPITAL_STREETS.length);
  assert.equal(new Set(CAPITAL_STREETS.map(s => s.name)).size, CAPITAL_STREETS.length);
  for (const { rect: r, id } of CAPITAL_STREETS) assert.ok(r.x0 <= r.x1 && r.y0 <= r.y1 && r.x0 >= CAPITAL.minX && r.x1 <= CAPITAL.maxX && r.y0 >= CAPITAL.minY && r.y1 <= CAPITAL.maxY, id);
  for (let i = -11; i <= 11; i++) { assert.equal(isCapitalStreet(i, 0), true); assert.equal(isCapitalStreet(0, i), true); }
  assert.equal(isCapitalStreet(11, 11), true); assert.equal(isCapitalStreet(12, 12), false);
  for (let ly = CAPITAL.minY; ly <= CAPITAL.maxY; ly++) assert.equal(isCapitalStreet(0, ly), true, "a Grande Avenida vai de portão a portão");
  for (let lx = -38; lx <= 37; lx++) assert.equal(isCapitalStreet(lx, 0), true, "a Avenida dos Povos atravessa a cidade");
  assert.equal(isCapitalStreet(-39, 0), false, "e para antes da muralha");
  assert.equal(isCapitalStreet(100, 0), false);
});

test("os terrenos: 21 construções, cada uma no seu bairro, sem se sobrepor nem pisar na rua, com a porta virada para uma rua", () => {
  assert.equal(CAPITAL_PLOTS.length, 21);
  assert.equal(new Set(CAPITAL_PLOTS.map(p => p.id)).size, 21);
  assert.equal(new Set(CAPITAL_PLOTS.map(p => p.name)).size, 21);
  for (const p of CAPITAL_PLOTS) {
    assert.ok(p.w >= 5 && p.h >= 5, `${p.id} pequeno demais`);
    const band = CAPITAL_DISTRICTS.find(d => d.id === p.district)!.band;
    assert.ok(p.x >= band.x0 && p.x + p.w - 1 <= band.x1 && p.y >= band.y0 && p.y + p.h - 1 <= band.y1, `${p.id} fora do bairro ${p.district}`);
    for (let ly = p.y; ly < p.y + p.h; ly++) for (let lx = p.x; lx < p.x + p.w; lx++) {
      assert.equal(isCapitalStreet(lx, ly), false, `${p.id} em cima da rua ${lx},${ly}`);
      assert.equal(isCapitalWall(lx, ly), false);
    }
    const [ax, ay] = doorApproach(p);
    assert.equal(isCapitalStreet(ax, ay), true, `a porta de ${p.id} não dá para a rua (${ax},${ay})`);
    assert.equal(inPlot(p, ax, ay), false);
  }
  for (let i = 0; i < CAPITAL_PLOTS.length; i++) for (let j = i + 1; j < CAPITAL_PLOTS.length; j++) {
    const a = CAPITAL_PLOTS[i]!, b = CAPITAL_PLOTS[j]!;
    assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} e ${b.id} se sobrepõem`);
  }
  assert.deepEqual(CAPITAL_DISTRICTS.map(d => d.id), ["cidadela", "alameda", "oficios", "bairro"]);
  for (const d of CAPITAL_DISTRICTS) assert.ok(CAPITAL_PLOTS.filter(p => p.district === d.id).length >= 4, d.id);
  const ids = new Set(CAPITAL_PLOTS.map(p => p.id));
  for (const id of ["ordem-cavaleiros", "arqueiros", "academia-arcana", "conselho", "quartel", "arquivo", "templo", "hospedaria", "estabulo", "hospital"]) assert.ok(ids.has(id), id);
  const homes = CAPITAL_PLOTS.filter(p => p.kind === "home");
  assert.equal(homes.length, 6);
  assert.equal(CAPITAL_PLOTS.filter(p => p.kind === "guild").length, 3, "uma guilda para cada herói: cavaleiro, arqueiro e mago");
});

test("do lado de fora de cada portão dá para chegar a todas as portas, passando pela praça; a muralha só se cruza pelos portões", () => {
  const key = (x: number, y: number): string => `${x},${y}`;
  const x0 = CAPITAL.minX - 2, x1 = CAPITAL.maxX + 2, y0 = CAPITAL.minY - 2, y1 = CAPITAL.maxY + 2;
  const reach = (from: readonly [number, number], blockedExtra: (x: number, y: number) => boolean = () => false): Set<string> => {
    const seen = new Set<string>([key(...from)]), queue: Array<readonly [number, number]> = [from];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || seen.has(key(nx, ny)) || !free(nx, ny) || blockedExtra(nx, ny)) continue;
        seen.add(key(nx, ny)); queue.push([nx, ny]);
      }
    }
    return seen;
  };
  const fromNorth = reach([0, CAPITAL.minY - 1]), fromSouth = reach([0, CAPITAL.maxY + 1]);
  assert.ok(fromNorth.has(key(0, CAPITAL.maxY + 1)) && fromSouth.has(key(0, CAPITAL.minY - 1)), "de portão a portão");
  for (const p of CAPITAL_PLOTS) {
    const [ax, ay] = doorApproach(p);
    assert.ok(fromNorth.has(key(ax, ay)), `${p.id} inalcançável pelo portão norte`);
    assert.ok(fromSouth.has(key(ax, ay)), `${p.id} inalcançável pelo portão sul`);
  }
  assert.ok(fromNorth.has(key(8, 0)) && fromSouth.has(key(-8, 0)), "a praça é alcançável pelos dois portões");
  // fechando os dois portões, ninguém de fora entra: a muralha é inteira
  const closed = reach([CAPITAL.minX - 1, 0], (x, y) => Math.abs(x) <= CAPITAL.gateHalf && (y === CAPITAL.minY || y === CAPITAL.maxY));
  for (const p of CAPITAL_PLOTS) assert.ok(!closed.has(key(...doorApproach(p))), `${p.id} alcançável sem passar por um portão`);
  assert.ok(!closed.has(key(0, 0)));
});

test("a muralha, as fundações e o monumento bloqueiam; os portões, as ruas e as portas ficam livres", () => {
  for (const lx of [-40, -20, -5, 5, 20, 39]) { const p = capitalPoint(lx, CAPITAL.minY); assert.equal(capitalBlocks(p.x, p.y, 7), true, `muro norte em ${lx}`); }
  for (const lx of [-4, 0, 4]) for (const ly of [CAPITAL.minY, CAPITAL.maxY]) assert.equal(free(lx, ly), true, `portão em ${lx},${ly}`);
  for (const ly of [-20, 0, 20]) { const w = capitalPoint(CAPITAL.minX, ly), e = capitalPoint(CAPITAL.maxX, ly); assert.equal(capitalBlocks(w.x, w.y, 7), true); assert.equal(capitalBlocks(e.x, e.y, 7), true); }
  for (const p of CAPITAL_PLOTS) {
    const c = capitalPoint(p.x + Math.floor(p.w / 2), p.y + Math.floor(p.h / 2));
    assert.equal(capitalBlocks(c.x, c.y, 7), true, `${p.id} sólida`);
    const [ax, ay] = doorApproach(p);
    assert.equal(free(ax, ay), true, `a frente da porta de ${p.id} livre`);
  }
  assert.equal(free(8, 0), true, "a praça é livre fora do monumento");
  assert.equal(free(0, 0), false, "o monumento bloqueia");
  const m = capitalPoint(0, 0);
  assert.equal(CAPITAL_MONUMENT.radiusTiles, 2.25);
  assert.equal(capitalBlocks(m.x + 72 + 8, m.y, 7), false, "80 px do centro: livre");
  assert.equal(capitalBlocks(m.x + 72 + 6, m.y, 7), true, "78 px do centro: o corpo encosta (72 de monumento mais 7 de corpo)");
  assert.equal(capitalBlocks(0, 0, 7), false, "longe da capital (na vila) não bloqueia");
  assert.equal(capitalBlocks(Number.NaN, 0, 7), true);
  assert.equal(capitalBlocks(m.x, m.y, Number.POSITIVE_INFINITY), true);
});

test("a zona protegida é a de dentro da muralha (sem a muralha), vale para os monstros e não tira a proteção da vila", () => {
  for (const [lx, ly, safe] of [[0, 0, true], [-39, 0, true], [38, 0, true], [CAPITAL.minX, 0, false], [CAPITAL.maxX, 0, false], [0, CAPITAL.minY, false], [0, CAPITAL.maxY, false], [0, 40, false], [60, 0, false]] as const) {
    const [tx, ty] = [CAPITAL.centerX + lx, CAPITAL.centerY + ly];
    assert.equal(capitalSafe(tx, ty), safe, `${lx},${ly}`);
    assert.equal(protectedSurfaceTile(tx, ty), safe, `protegido ${lx},${ly}`);
  }
  assert.equal(capitalSafe(Number.NaN, 0), false);
  assert.equal(protectedSurfaceTile(10, 0), villageGround(10, 0) !== null, "a vila continua protegida");
  assert.equal(protectedSurfaceTile(10, 0), true);
  let spawns = 0;
  for (const seed of [42, 842136, 7]) for (let cx = Math.floor((CAPITAL.centerX + CAPITAL.minX) / 16) - 1; cx <= Math.floor((CAPITAL.centerX + CAPITAL.maxX) / 16) + 1; cx++)
    for (let cy = Math.floor((CAPITAL.centerY + CAPITAL.minY) / 16) - 1; cy <= Math.floor((CAPITAL.centerY + CAPITAL.maxY) / 16) + 1; cy++)
      for (const mob of [...slimeSpawns(cx, cy, seed), ...regionalSurfaceSpawns(cx, cy, seed)]) {
        spawns++;
        assert.equal(capitalSafe(Math.floor(mob.x / 32), Math.floor(mob.y / 32)), false, `monstro nasceu dentro da capital (${seed}: ${mob.x},${mob.y})`);
      }
  assert.ok(spawns > 10, `há monstros em volta (${spawns}), então o teste não é vazio`);
});

test("nenhuma caverna nasce dentro da capital nem na terra limpa em volta, mesmo nas sementes em que cairia ali", () => {
  const minX = CAPITAL.centerX + CAPITAL.minX - CAPITAL.margin, maxX = CAPITAL.centerX + CAPITAL.maxX + CAPITAL.margin;
  const minY = CAPITAL.centerY + CAPITAL.minY - CAPITAL.margin, maxY = CAPITAL.centerY + CAPITAL.maxY + CAPITAL.margin;
  let elsewhere = 0;
  for (const seed of [1, 2, 3, 7, 8, 42, 842136]) for (let gx = Math.floor(minX / 96) - 2; gx <= Math.floor(maxX / 96) + 2; gx++) for (let gy = Math.floor(minY / 96) - 2; gy <= Math.floor(maxY / 96) + 2; gy++) {
    const e = caveEntranceInCell(gx, gy, seed);
    if (!e) continue;
    const inside = e.tileX >= minX && e.tileX <= maxX && e.tileY >= minY && e.tileY <= maxY;
    assert.equal(inside, false, `caverna dentro da capital: ${seed} em ${e.tileX},${e.tileY}`);
    elsewhere++;
  }
  assert.ok(elsewhere >= 3, "as cavernas continuam existindo em volta");
});

test("cada peça está no seu arquivo, na pasta da região central, e sem relógio nem sorteio solto", () => {
  const files = readdirSync(new URL("../src/world/center/capital/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["blocks", "buildings", "districts", "ground", "index", "layout", "plaza", "plots", "props", "safe", "streets", "towers", "view"]);
  for (const f of files) for (const bad of ["Math.random", "Date.now", "performance.now", "new Date("])
    assert.equal(readFileSync(`src/world/center/capital/${f}.ts`, "utf8").includes(bad), false, `${f}: ${bad}`);
  const terrain = readFileSync("src/world/terrain.ts", "utf8");
  assert.match(terrain, /const capital = capitalGround\(tx, ty\);/);
  assert.match(terrain, /const cleared = nearCapital\(tx, ty\);/);
  assert.match(readFileSync("src/world/village.ts", "utf8"), /capitalSafe\(tx,ty\)/);
  assert.match(readFileSync("src/world/caves.ts", "utf8"), /nearCapital\(tx,ty\)/);
});

test("a frente da porta é o meio do lado certo do terreno, fora dele, para qualquer lado e tamanho", () => {
  const at = (door: CapitalPlot["door"], w: number, h: number): CapitalPlot => ({ id: "t", name: "t", district: "bairro", kind: "home", x: 10, y: 20, w, h, door });
  assert.deepEqual(doorApproach(at("n", 7, 5)), [13, 19]);
  assert.deepEqual(doorApproach(at("s", 7, 5)), [13, 25]);
  assert.deepEqual(doorApproach(at("w", 7, 5)), [9, 22]);
  assert.deepEqual(doorApproach(at("e", 7, 5)), [17, 22]);
  assert.deepEqual(doorApproach(at("n", 8, 6)), [13, 19], "tamanho par: o tile do meio de cima");
  assert.deepEqual(doorApproach(at("e", 8, 6)), [18, 22]);
  assert.deepEqual(doorApproach(at("w", 8, 6)), [9, 22]);
  assert.equal(inPlot(at("n", 7, 5), 10, 20), true); assert.equal(inPlot(at("n", 7, 5), 16, 24), true);
  assert.equal(inPlot(at("n", 7, 5), 17, 24), false); assert.equal(inPlot(at("n", 7, 5), 16, 25), false); assert.equal(inPlot(at("n", 7, 5), 9, 20), false);
});
