import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { BIOME_NAMES, type Biome } from "../src/world/biomes.ts";
import { SOUTH_CITY, southCityGround } from "../src/world/southCity.ts";
import { TILE_SIZE, getTile, type Tile } from "../src/world/terrain.ts";
import { DECOR_PAINTERS, DECOR_VARIANTS, decorFor, decorShape, southDecorProp, type DecorKind } from "../src/render/south/decor/index.ts";
import { WorldRenderer } from "../src/render/WorldRenderer.ts";
import { renderScenery, clearSceneryCache, type Scenery } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Decoração do deserto do Sul (ADR 0036): peças só visuais, sem colisão e fora dos dados do mundo. A colocação sai do
 * bioma e da posição; cada peça tem o seu arquivo na pasta do Sul.
 */
const SEED = 842136;
const KINDS: readonly DecorKind[] = ["dry-grass", "shrub", "bones", "cactus", "cracked-earth"];
const signature = (draw: (c: CanvasRenderingContext2D) => void): string => {
  const r = new Recorder();
  draw(r.ctx);
  return r.metrics().signature;
};

test("cada assunto da decoração está no seu arquivo, na pasta do Sul", () => {
  const files = readdirSync(new URL("../src/render/south/decor/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["bones", "cactus", "crackedEarth", "desertShrub", "dryGrass", "index", "painters", "palette", "placement", "prop", "types"]);
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
    }
    assert.ok(Math.abs(placed / total - density) < 0.012, `${biome}: densidade ${(placed / total).toFixed(3)}`);
    for (const kind of KINDS) assert.ok(Math.abs((counts[kind] ?? 0) / placed - weights[kind]) < 0.04, `${biome} ${kind}: ${((counts[kind] ?? 0) / placed).toFixed(2)}`);
  }
  assert.notDeepEqual(Array.from({ length: 200 }, (_, i) => decorFor("dunes", i, 15600, SEED)), Array.from({ length: 200 }, (_, i) => decorFor("dunes", i, 15600, SEED + 1)));
  // A semente muda ONDE há decoração, não só o que ela é.
  const where = (seed: number): string => Array.from({ length: 1500 }, (_, i) => decorFor("dunes", i, 15600, seed) ? "1" : "0").join("");
  assert.notEqual(where(SEED), where(SEED + 1));
  assert.notEqual(where(SEED), where(SEED + 2));
});

const sandTile = (over: Partial<Tile> = {}): Tile => ({ ground: "sand", biome: "dunes", tree: false, rock: false, decoration: 0.5, ...over });
/** Um tile de deserto que, sem nenhuma outra regra, teria decoração. */
function placedTile(): { tx: number; ty: number } {
  for (let tx = 0; tx < 400; tx++) if (decorFor("dunes", tx, 15700, SEED)) return { tx, ty: 15700 };
  throw new Error("sem decoração na amostra");
}

test("só vira cenário em areia livre, fora da cidade: nada em estrada, água, pedra, árvore ou muralha", () => {
  const { tx, ty } = placedTile();
  const prop = southDecorProp(sandTile(), tx, ty, SEED)!;
  assert.equal(prop.kind, "south-decor");
  assert.ok(prop.decorKind && KINDS.includes(prop.decorKind));
  assert.ok(prop.x >= tx * TILE_SIZE + 6 && prop.x < tx * TILE_SIZE + 26 && prop.y >= ty * TILE_SIZE + 12 && prop.y < ty * TILE_SIZE + 26);
  for (const over of [{ ground: "path" as const }, { ground: "water" as const }, { ground: "grass" as const }, { rock: true }, { tree: true }])
    assert.equal(southDecorProp(sandTile(over), tx, ty, SEED), null, JSON.stringify(over));
  // Dentro da cidade do Poço Negro (qualquer tile que ela define), nunca.
  let cityTiles = 0, wouldHave = 0;
  for (let y = SOUTH_CITY.centerY - 30; y <= SOUTH_CITY.centerY + 30; y++) for (let x = -40; x <= 40; x++) {
    if (southCityGround(x, y) === null) continue;
    cityTiles++;
    if (decorFor("ruins", x, y, SEED)) wouldHave++;
    assert.equal(southDecorProp(sandTile({ biome: "ruins" }), x, y, SEED), null, `cidade ${x},${y}`);
  }
  assert.ok(cityTiles > 500 && wouldHave > 10, `a regra da cidade é necessária: ${cityTiles} tiles, ${wouldHave} teriam decoração`);
});

test("a decoração não toca o mundo: não há importação dela em world, engine, actors, monsters, npcs nem dungeons", () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + "/" + e.name) : e.name.endsWith(".ts") ? [dir + "/" + e.name] : []);
  for (const dir of ["src/world", "src/engine", "src/actors", "src/monsters", "src/npcs", "src/dungeons"])
    for (const file of walk(dir)) assert.equal(/south\/decor/.test(readFileSync(file, "utf8")), false, file);
  // O tile de uma peça é igual com e sem decoração: nenhum campo novo e nada bloqueado.
  const { tx, ty } = placedTile();
  const tile = getTile(tx, ty, SEED);
  assert.deepEqual(Object.keys(tile).sort(), ["biome", "decoration", "ground", "rock", "tree"]);
});

type Chunky = { chunk(cx: number, cy: number): { props: Scenery[] } };
const propsOf = (cx: number, cy: number): Scenery[] => withDocument(
  { createElement: () => ({ width: 0, height: 0, getContext: () => new Recorder().ctx }) },
  () => (new WorldRenderer(SEED) as unknown as Chunky).chunk(cx, cy).props);

test("o renderizador de mundo põe a decoração no deserto, nunca sobre pedra e nunca na mata", () => {
  const desert = propsOf(1, 977), north = propsOf(0, 18), west = propsOf(-9, 0);
  const decor = desert.filter(p => p.kind === "south-decor");
  assert.ok(decor.length > 6 && decor.length < 60, `decorações no chunk: ${decor.length}`);
  assert.equal([...north, ...west].some(p => p.kind === "south-decor"), false, "fora do deserto não há");
  const rocks = new Set(desert.filter(p => p.kind === "rock").map(p => `${Math.floor(p.x / 32)},${Math.floor((p.y - 23) / 32)}`));
  for (const p of decor) assert.equal(rocks.has(`${Math.floor(p.x / 32)},${Math.floor(p.y / 32)}`), false, "sem decoração em tile de pedra");
  assert.ok(new Set(decor.map(p => p.decorKind)).size >= 3, "vários tipos no mesmo chunk");
});

test("cada pintor tem quatro formatos diferentes, estáveis, equilibrados e tolerantes a valores inválidos", () => {
  assert.deepEqual(Object.keys(DECOR_PAINTERS).sort(), [...KINDS].sort());
  for (const kind of KINDS) {
    const paint = DECOR_PAINTERS[kind];
    const sigs = [0, 1, 2, 3].map(v => signature(c => paint(c, v)));
    assert.equal(new Set(sigs).size, 4, `${kind}: quatro desenhos`);
    assert.deepEqual([0, 1, 2, 3].map(v => signature(c => paint(c, v))), sigs, `${kind}: estável`);
    for (const v of [0, 1, 2, 3]) { const r = new Recorder(); paint(r.ctx, v); const m = r.metrics(); assert.equal(m.saves, m.restores, `${kind} ${v}`); }
    for (const bad of [Number.NaN, -3, 99, Infinity]) {
      assert.doesNotThrow(() => paint(new Recorder().ctx, bad));
      assert.equal(signature(c => paint(c, bad)), signature(c => paint(c, decorShape(bad))), `${kind} ${bad}`);
    }
  }
  assert.deepEqual([Number.NaN, -1, 0, 2.9, 3, 99].map(v => decorShape(v)), [0, 0, 0, 2, 3, 3]);
  // Cada tipo tem o seu pintor: o mesmo formato de tipos diferentes é um desenho diferente.
  for (let shape = 0; shape < 4; shape++)
    assert.equal(new Set(KINDS.map(kind => signature(c => DECOR_PAINTERS[kind](c, shape)))).size, KINDS.length, `formato ${shape}`);
});

test("o cenário pinta cada tipo e formato num sprite próprio, uma vez só, e a variação escolhe o formato", () => {
  clearSceneryCache();
  let created = 0;
  const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
  const draw = (kind: DecorKind, variant: number): void =>
    withDocument(doc, () => renderScenery(new Recorder().ctx, { kind: "south-decor", decorKind: kind, x: 100, y: 100, variant }, 0, 0, 0));
  for (const kind of KINDS) for (let shape = 0; shape < 4; shape++) draw(kind, (shape + 0.5) / 4);
  assert.equal(created, 20, "cinco tipos × quatro formatos");
  draw("cactus", 0.3); draw("cactus", 0.37); draw("bones", 0.99);
  assert.equal(created, 20, "o mesmo tipo e formato reaproveita o sprite (0,3 e 0,37 são o formato 1)");
  clearSceneryCache();
  const noKind = withDocument(doc, () => { const before = created; renderScenery(new Recorder().ctx, { kind: "south-decor", x: 1, y: 1, variant: 0.5 }, 0, 0, 0); return created - before; });
  assert.equal(noKind, 0, "sem tipo não pinta nada");
});

test("o cenário usa o mapa de pintores e o mundo pergunta pela decoração", () => {
  const scenery = readFileSync("src/render/scenery.ts", "utf8");
  assert.match(scenery, /DECOR_PAINTERS\[kind\]\(c, shape\)/);
  assert.match(scenery, /`south-decor-\$\{kind\}-\$\{shape\}`/);
  assert.match(readFileSync("src/render/WorldRenderer.ts", "utf8"), /southDecorProp\(tile, tx, ty, this\.seed\)/);
});
