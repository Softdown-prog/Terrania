import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { BIOME_NAMES, type Biome } from "../src/world/biomes.ts";
import { canMoveOnSeed, canWalkOnSeed, freeSpotNear, SeedCollision } from "../src/world/collision.ts";
import { SOUTH_CITY, southCityGround } from "../src/world/southCity.ts";
import { southRuinBlocks } from "../src/world/southRuins.ts";
import { TILE_SIZE, getTile } from "../src/world/terrain.ts";
import { southTowerBlocks, southTowersInArea } from "../src/world/towers/placement.ts";
import { DECOR_FOOTPRINT, DECOR_VARIANTS, MAX_DECOR_DENSITY, decorFootprint, decorFor, decorShapeOf, mayHaveDecor,
  southDecorAt, southDecorBlocks, type DecorKind, type DecorPlacement } from "../src/world/south/decor/index.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { southCommonSpawns } from "../src/actors/RegionalMonster.ts";

/**
 * Decoração do deserto no mundo e na colisão (ADR 0037): onde fica cada peça, o que bloqueia e o que isso muda (e o
 * que não muda: a geração do mundo). Cacto e arbusto lenhoso bloqueiam; capim, ossos, terra rachada e a bola de
 * espinhos ficam livres.
 */
const SEED = 842136;
const KINDS: readonly DecorKind[] = ["dry-grass", "shrub", "bones", "cactus", "cracked-earth"];

interface Found { tx: number; ty: number; placement: DecorPlacement; shape: number; cx: number; cy: number; radius: number }
/** Peças reais do deserto, achadas por varredura, com o centro e o raio de cada uma. */
function scan(tx0: number, ty0: number, w: number, h: number): Found[] {
  const out: Found[] = [];
  for (let ty = ty0; ty < ty0 + h; ty++) for (let tx = tx0; tx < tx0 + w; tx++) {
    const placement = southDecorAt(tx, ty, SEED);
    if (!placement) continue;
    const shape = decorShapeOf(placement.variation);
    out.push({ tx, ty, placement, shape, cx: tx * TILE_SIZE + placement.x, cy: ty * TILE_SIZE + placement.y, radius: decorFootprint(placement.kind, shape) });
  }
  return out;
}
const DESERT = scan(-150, 15530, 300, 120);
const blocking = (kind?: DecorKind): Found[] => DESERT.filter(f => f.radius > 0 && (kind === undefined || f.placement.kind === kind));

test("cada assunto da colocação e da colisão está no seu arquivo, na pasta do Sul do mundo", () => {
  const files = readdirSync(new URL("../src/world/south/decor/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["blocks", "eligibility", "footprints", "index", "placement", "shape", "types"]);
  assert.equal(DECOR_VARIANTS, 4);
});

test("a colocação é determinística, só nos biomas de deserto e respeita densidade, pesos e posição no tile", () => {
  for (const biome of Object.keys(BIOME_NAMES) as Biome[])
    if (biome !== "dunes" && biome !== "ruins") for (let i = 0; i < 300; i++) assert.equal(decorFor(biome, i, i * 3, SEED), null, biome);
  for (const [biome, density, weights] of [
    ["dunes", 0.075, { "dry-grass": 0.4, shrub: 0.22, cactus: 0.22, bones: 0.1, "cracked-earth": 0.06 }],
    ["ruins", 0.09, { "cracked-earth": 0.38, "dry-grass": 0.2, bones: 0.18, shrub: 0.16, cactus: 0.08 }],
  ] as const) {
    const counts: Record<string, number> = {};
    let placed = 0, total = 0;
    for (let ty = 15500; ty < 15600; ty++) for (let tx = -200; tx < 200; tx++) {
      total++;
      const p = decorFor(biome, tx, ty, SEED);
      assert.deepEqual(decorFor(biome, tx, ty, SEED), p, "determinística");
      if (!p) continue;
      placed++;
      counts[p.kind] = (counts[p.kind] ?? 0) + 1;
      assert.ok(p.x >= 6 && p.x < 26 && p.y >= 12 && p.y < 26, `posição no tile ${p.x},${p.y}`);
      assert.ok(p.variation >= 0 && p.variation < 1);
      assert.ok(mayHaveDecor(tx, ty, SEED), "o sorteio barato nunca descarta um tile que tem peça");
    }
    assert.ok(Math.abs(placed / total - density) < 0.012, `${biome}: densidade ${(placed / total).toFixed(3)}`);
    for (const kind of KINDS) assert.ok(Math.abs((counts[kind] ?? 0) / placed - weights[kind]) < 0.04, `${biome} ${kind}: ${((counts[kind] ?? 0) / placed).toFixed(2)}`);
  }
  const where = (seed: number): string => Array.from({ length: 1500 }, (_, i) => decorFor("dunes", i, 15600, seed) ? "1" : "0").join("");
  assert.notEqual(where(SEED), where(SEED + 1), "a semente muda ONDE há decoração");
  assert.ok(MAX_DECOR_DENSITY >= 0.09, "o sorteio barato cobre a maior densidade");
  let cheap = 0;
  for (let i = 0; i < 5000; i++) if (mayHaveDecor(i, 15600, SEED)) cheap++;
  assert.ok(cheap / 5000 < 0.13, `o sorteio barato descarta quase tudo: ${cheap / 5000}`);
});

test("o formato vem da variação por uma conta só, e cada peça tem a sua base (cacto e arbusto lenhoso bloqueiam)", () => {
  assert.deepEqual([Number.NaN, -1, 0, 0.24, 0.25, 0.74, 0.75, 0.9999, 5].map(decorShapeOf), [0, 0, 0, 0, 1, 2, 3, 3, 3]);
  for (const kind of ["dry-grass", "bones", "cracked-earth"] as const) assert.deepEqual([...DECOR_FOOTPRINT[kind]], [0, 0, 0, 0], kind + " é livre");
  assert.deepEqual([0, 1, 2, 3].map(shape => decorFootprint("shrub", shape) > 0), [true, true, true, false], "a bola de espinhos rola: livre");
  for (const shape of [0, 1, 2, 3]) {
    const r = decorFootprint("cactus", shape);
    assert.ok(r >= 4 && r <= 10, `cacto ${shape}: ${r}`);
  }
  for (const bad of [Number.NaN, -3, 99]) assert.ok(Number.isFinite(decorFootprint("cactus", bad)));
});

test("a peça só existe em areia livre, fora da cidade e longe de ruínas e torres", () => {
  assert.ok(DESERT.length > 400, "peças na amostra: " + DESERT.length);
  for (const f of DESERT.slice(0, 600)) {
    const tile = getTile(f.tx, f.ty, SEED);
    assert.equal(tile.ground, "sand");
    assert.equal(tile.rock || tile.tree, false);
    assert.equal(southCityGround(f.tx, f.ty), null);
    assert.equal(southRuinBlocks(f.cx, f.cy, 14, SEED) || southTowerBlocks(f.cx, f.cy, 14, SEED), false);
    assert.ok(f.cx >= f.tx * TILE_SIZE + 6 && f.cx < f.tx * TILE_SIZE + 26);
  }
  // Cada regra é necessária: há tiles em que a colocação por bioma poria uma peça e a regra de chão a recusa.
  let city = 0, ground = 0, rocks = 0, ruins = 0;
  for (let ty = SOUTH_CITY.centerY - 30; ty <= SOUTH_CITY.centerY + 30; ty++) for (let tx = -40; tx <= 40; tx++) {
    if (southCityGround(tx, ty) !== null && decorFor("ruins", tx, ty, SEED)) { city++; assert.equal(southDecorAt(tx, ty, SEED), null, `cidade ${tx},${ty}`); }
  }
  for (let ty = 15500; ty < 15900; ty++) for (let tx = -400; tx < 400; tx++) {
    if (!mayHaveDecor(tx, ty, SEED)) continue;
    const tile = getTile(tx, ty, SEED), raw = decorFor(tile.biome, tx, ty, SEED);
    if (!raw || southDecorAt(tx, ty, SEED)) continue;
    if (tile.ground !== "sand") ground++;
    else if (tile.rock || tile.tree) rocks++;
    else if (southCityGround(tx, ty) === null) ruins++;
  }
  // (A regra de chão é uma guarda: nos biomas de deserto o chão já é sempre areia, então `ground` fica em zero.)
  assert.ok(city > 10 && rocks >= 1 && ruins >= 1, `recusas necessárias: cidade ${city}, pedra ${rocks}, ruína ou torre ${ruins}, chão ${ground}`);
});

test("a decoração não nasce no corpo de uma torre nem junto dele", () => {
  // As torres desta semente no Sul, achadas por varredura (uma a cada 224 tiles, no máximo).
  const towers = new Map<string, { tileX: number; tileY: number }>();
  for (let ty = 15500; ty < 17000; ty += 60) for (let tx = -600; tx < 600; tx += 60)
    for (const t of southTowersInArea(tx, ty, tx + 59, ty + 59, SEED)) towers.set(t.id, t);
  assert.ok(towers.size >= 3, "torres na amostra: " + towers.size);
  let refused = 0, checked = 0;
  for (const tower of towers.values())
    for (let ty = tower.tileY - 9; ty <= tower.tileY + 9; ty++) for (let tx = tower.tileX - 9; tx <= tower.tileX + 9; tx++) {
      const tile = getTile(tx, ty, SEED), raw = tile.ground === "sand" && !tile.rock && !tile.tree && southCityGround(tx, ty) === null ? decorFor(tile.biome, tx, ty, SEED) : null;
      if (!raw) continue;
      const x = tx * TILE_SIZE + raw.x, y = ty * TILE_SIZE + raw.y;
      checked++;
      if (southTowerBlocks(x, y, 14, SEED)) { refused++; assert.equal(southDecorAt(tx, ty, SEED), null, `torre ${tx},${ty}`); }
      else if (!southRuinBlocks(x, y, 14, SEED)) assert.notEqual(southDecorAt(tx, ty, SEED), null, `fora da torre ${tx},${ty}`);
    }
  assert.ok(checked > 50 && refused >= 1, `peças vistas ${checked}, recusadas pela torre ${refused}`);
});

test("o bloqueio é um círculo na base da peça: dentro bloqueia, fora liberta, e o que é livre nunca bloqueia", () => {
  const sample = blocking();
  assert.ok(sample.length > 40, "peças que bloqueiam: " + sample.length);
  for (const f of sample.slice(0, 80)) {
    assert.equal(southDecorBlocks(f.cx, f.cy, 7, SEED), true, `${f.placement.kind} ${f.shape} no centro`);
    assert.equal(southDecorBlocks(f.cx, f.cy, 0, SEED), true, "mesmo um ponto no centro");
    // Logo antes do raio (base + corpo) bloqueia; logo depois deixa passar, em quatro direções, se não há outra peça perto.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const near = f.radius + 7 - 0.5, far = f.radius + 7 + 0.5;
      assert.equal(southDecorBlocks(f.cx + dx * near, f.cy + dy * near, 7, SEED), true, `${f.placement.kind} dentro do raio (${dx},${dy})`);
      const outside = southDecorBlocks(f.cx + dx * far, f.cy + dy * far, 7, SEED);
      const neighbours = DESERT.some(o => o !== f && o.radius > 0 && Math.hypot(o.cx - (f.cx + dx * far), o.cy - (f.cy + dy * far)) < o.radius + 7);
      assert.equal(outside, neighbours, `${f.placement.kind} fora do raio (${dx},${dy})`);
    }
  }
  const free = DESERT.filter(f => f.radius === 0);
  assert.ok(free.length > 200);
  let wrong = 0;
  for (const f of free) {
    const hits = DESERT.some(o => o.radius > 0 && Math.hypot(o.cx - f.cx, o.cy - f.cy) < o.radius + 7);
    if (southDecorBlocks(f.cx, f.cy, 7, SEED) !== hits) wrong++;
  }
  assert.equal(wrong, 0, "capim, ossos, terra rachada e bola de espinhos nunca bloqueiam");
  for (const bad of [Number.NaN, Infinity]) assert.equal(southDecorBlocks(bad, 0, 7, SEED), false);
  assert.equal(southDecorBlocks(0, 0, 7, SEED), false, "a área inicial não tem decoração");
});

test("canWalkOnSeed e o SeedCollision respeitam a decoração; canMoveOnSeed, da geração do mundo, não muda", () => {
  const cactus = blocking("cactus").slice(0, 40), shrub = blocking("shrub").slice(0, 40);
  assert.ok(cactus.length > 10 && shrub.length > 5);
  const collision = new SeedCollision(SEED);
  let freeForGeneration = 0;
  for (const f of [...cactus, ...shrub]) {
    assert.equal(canWalkOnSeed(f.cx, f.cy, SEED), false, `${f.placement.kind} bloqueia o movimento`);
    assert.equal(collision.canMove(f.cx, f.cy), false);
    // A geração do mundo não enxerga a decoração: onde o terreno está livre, `canMoveOnSeed` continua verdadeiro.
    if (canMoveOnSeed(f.cx, f.cy, SEED)) freeForGeneration++;
  }
  assert.ok(freeForGeneration > 15, `pontos livres para a geração e bloqueados para o movimento: ${freeForGeneration}`);
  // Em todo o resto, as duas coisas concordam.
  let different = 0;
  for (let ty = 15540; ty < 15600; ty++) for (let tx = -100; tx < 100; tx++)
    for (const [ox, oy] of [[8, 8], [24, 24]] as const) {
      const x = tx * TILE_SIZE + ox, y = ty * TILE_SIZE + oy;
      if (canWalkOnSeed(x, y, SEED) !== canMoveOnSeed(x, y, SEED)) { different++; assert.equal(southDecorBlocks(x, y, 7, SEED), true, "só a decoração explica a diferença"); }
    }
  assert.ok(different > 0, "a decoração bloqueia pontos reais");
  const caves = readFileSync("src/world/caves.ts", "utf8");
  assert.equal(/canWalkOnSeed|south\/decor/.test(caves), false, "as entradas de caverna não dependem da decoração");
});

test("um corpo em movimento esbarra no cacto e dá a volta", () => {
  const f = blocking("cactus")[0]!;
  const collision = new SeedCollision(SEED);
  let x = f.cx - f.radius - 30, y = f.cy;
  assert.equal(collision.canMove(x, y), true);
  let stopped = false;
  for (let i = 0; i < 40; i++) { if (collision.canMove(x + 2, y)) x += 2; else { stopped = true; break; } }
  assert.equal(stopped, true, "parou na frente do cacto");
  assert.ok(x < f.cx - f.radius - 3, "parou antes da base: " + (f.cx - x));
});

test("monstros nunca nascem presos dentro de uma peça que bloqueia", () => {
  let spawns = 0;
  for (let cy = 970; cy < 1010; cy++) for (let cx = -12; cx < 12; cx++)
    for (const m of southCommonSpawns(cx, cy, SEED)) {
      spawns++;
      assert.equal(southDecorBlocks(m.x, m.y, 7, SEED), false, `${m.id} dentro de uma decoração`);
      assert.equal(canWalkOnSeed(m.x, m.y, SEED), true);
    }
  assert.ok(spawns > 50, "nascimentos na amostra: " + spawns);
  const source = readFileSync("src/actors/RegionalMonster.ts", "utf8");
  assert.equal(/canMoveOnSeed\(/.test(source), false, "a escolha do lugar usa canWalkOnSeed");
  assert.match(readFileSync("src/actors/southSiteSpawns.ts", "utf8"), /canWalkOnSeed\(/);
});

test("freeSpotNear: devolve o ponto se livre, o mais próximo se não, e nada se não há saída", () => {
  const circle = (cx: number, cy: number, r: number) => (x: number, y: number): boolean => Math.hypot(x - cx, y - cy) >= r;
  assert.deepEqual(freeSpotNear(circle(0, 0, 10), 50, 0), { x: 50, y: 0 }, "já livre");
  const spot = freeSpotNear(circle(0, 0, 14), 3, 2)!;
  assert.ok(spot && circle(0, 0, 14)(spot.x, spot.y) && Math.hypot(spot.x - 3, spot.y - 2) <= 14 + 4, JSON.stringify(spot));
  assert.deepEqual(freeSpotNear(circle(0, 0, 14), 3, 2), spot, "determinístico");
  assert.equal(freeSpotNear(() => false, 0, 0), null, "sem saída");
  assert.equal(freeSpotNear(circle(0, 0, 200), 0, 0, 64), null, "além do alcance");
  assert.equal(freeSpotNear(() => true, Number.NaN, 0), null);
  const real = blocking("cactus")[0]!, collision = new SeedCollision(SEED);
  const out = freeSpotNear((x, y) => collision.canMove(x, y), real.cx, real.cy)!;
  assert.ok(out && collision.canMove(out.x, out.y) && Math.hypot(out.x - real.cx, out.y - real.cy) <= 64);
});

test("um save antigo no meio de um cacto tira o herói dele; sobre outro obstáculo, volta ao ponto inicial como sempre", () => {
  const f = blocking("cactus")[0]!;
  const save = (x: number, y: number) => ({ seed: SEED, x, y, hp: 100, kills: 0, defeated: [] as string[] });
  const inside = new OfflineSimulation(SEED, save(f.cx, f.cy));
  assert.ok(new SeedCollision(SEED).canMove(inside.player.x, inside.player.y), "livre");
  const moved = Math.hypot(inside.player.x - f.cx, inside.player.y - f.cy);
  assert.ok(moved > 0 && moved <= 64, `deslocamento ${moved.toFixed(1)}`);
  const fresh = new OfflineSimulation(SEED);
  assert.notDeepEqual([inside.player.x, inside.player.y], [fresh.player.x, fresh.player.y], "não voltou ao início");
  // Posição já livre: nada muda.
  const ok = new OfflineSimulation(SEED, save(f.cx + f.radius + 40, f.cy));
  assert.deepEqual([ok.player.x, ok.player.y], [f.cx + f.radius + 40, f.cy]);
  // Obstáculo de terreno (um tile de pedra): como sempre, volta ao ponto inicial.
  let rockX = 0, rockY = 0;
  outer: for (let ty = 15540; ty < 15700; ty++) for (let tx = -200; tx < 200; tx++) if (getTile(tx, ty, SEED).rock) { rockX = (tx + .5) * TILE_SIZE; rockY = (ty + .5) * TILE_SIZE; break outer; }
  assert.ok(rockX !== 0);
  const rock = new OfflineSimulation(SEED, save(rockX, rockY));
  assert.deepEqual([rock.player.x, rock.player.y], [fresh.player.x, fresh.player.y]);
});

test("a decoração só é importada pela colisão do mundo e pelo desenho, nunca pelas demais regras", () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + "/" + e.name) : e.name.endsWith(".ts") ? [dir + "/" + e.name] : []);
  for (const dir of ["src/engine", "src/actors", "src/monsters", "src/npcs", "src/dungeons"])
    for (const file of walk(dir)) assert.equal(/south\/decor/.test(readFileSync(file, "utf8")), false, file);
  const importers = walk("src/world").filter(f => /south\/decor/.test(readFileSync(f, "utf8")) && !f.startsWith("src/world/south/decor/"));
  assert.deepEqual(importers, ["src/world/collision.ts"]);
  const tile = getTile(DESERT[0]!.tx, DESERT[0]!.ty, SEED);
  assert.deepEqual(Object.keys(tile).sort(), ["biome", "decoration", "ground", "rock", "tree"], "Tile não ganhou nenhum campo");
});
