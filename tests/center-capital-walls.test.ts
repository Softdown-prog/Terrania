import test from "node:test";
import assert from "node:assert/strict";
import { CAPITAL, CAPITAL_PLOTS, CAPITAL_PROPS, CAPITAL_TOWERS, TOWER_TILES, WALL_SEGMENT_TILES, capitalPoint, capitalWallBlocks, inPlot, isCapitalStreet,
  isCapitalTowerTile, isCapitalWall, type CapitalProp } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { WorldRenderer } from "../src/render/WorldRenderer.ts";
import { Recorder } from "./helpers/recordingContext.ts";

/**
 * Muralha, Grandes Portões e torres da capital, parte do mundo (ADR 0056): onde cada peça fica, que ela cobre a muralha sem
 * buracos nem sobreposição, as bases das torres, a colisão ligada ao jogo e a entrada das peças no desenho.
 */
const SEEDS = [42, 842136];
const T = 32, cx = CAPITAL.centerX, cy = CAPITAL.centerY;
const kinds = (k: CapitalProp["kind"]): CapitalProp[] => CAPITAL_PROPS.filter(p => p.kind === k);
const px = (lx: number, ly: number) => capitalPoint(lx, ly);
const passable = (lx: number, ly: number, seed: number): boolean => { const p = px(lx, ly); return canMoveOnSeed(p.x, p.y, seed); };

test("as peças da muralha: 64 trechos de frente (2 de meio trecho), 60 de lado, 2 portões, 8 torres, o monumento e 4 edifícios, sem repetir id", () => {
  assert.equal(CAPITAL_PROPS.length, 139);
  assert.equal(kinds("wall").length, 64); assert.equal(kinds("wall-side").length, 60); assert.equal(kinds("gate").length, 2); assert.equal(kinds("tower").length, 8); assert.equal(kinds("monument").length, 1); assert.equal(kinds("building").length, 4);
  assert.equal(new Set(CAPITAL_PROPS.map(p => p.id)).size, 139);
  assert.deepEqual(kinds("wall").filter(p => p.variant >= 4).map(p => p.id).sort(), ["muro-norte-leste-15", "muro-sul-leste-15"]);
  assert.ok(kinds("wall").every(p => p.variant >= 0 && p.variant <= 7 && Number.isInteger(p.variant)));
  assert.ok(kinds("wall-side").every(p => p.variant === 0 || p.variant === 1));
  assert.deepEqual(kinds("tower").map(p => p.variant).sort(), [0, 0, 0, 0, 1, 1, 1, 1], "quatro torres de canto e quatro de portão");
  assert.equal(WALL_SEGMENT_TILES, 2);
  for (const v of [0, 1, 2, 3]) assert.ok(kinds("wall").filter(p => p.variant === v).length >= 12, `variação ${v} aparece em vários trechos`);
});

test("os muros norte e sul ficam cobertos de ponta a ponta: trechos, torres e a boca do portão se encostam, sem buraco nem sobreposição", () => {
  for (const ly of [CAPITAL.minY, CAPITAL.maxY]) {
    const north = ly === CAPITAL.minY, base = (cy + ly + 1) * T;
    const spans: Array<[number, number, string]> = [];
    for (const p of kinds("wall").filter(p => p.y === base)) spans.push(p.variant >= 4 ? [p.x - 16, p.x + 16, p.id!] : [p.x - 32, p.x + 32, p.id!]);
    for (const g of kinds("gate").filter(p => p.y === base)) spans.push([g.x - 144, g.x + 144, g.id!]);
    for (const t of CAPITAL_TOWERS.filter(t => (north ? t.ly === CAPITAL.minY : t.ly === CAPITAL.maxY - TOWER_TILES + 1))) spans.push([(cx + t.lx) * T, (cx + t.lx + TOWER_TILES) * T, t.id]);
    spans.sort((a, b) => a[0] - b[0]);
    assert.equal(spans[0]![0], (cx + CAPITAL.minX) * T, "começa na borda esquerda da muralha");
    assert.equal(spans[spans.length - 1]![1], (cx + CAPITAL.maxX + 1) * T, "termina na borda direita");
    for (let i = 1; i < spans.length; i++) assert.equal(spans[i]![0], spans[i - 1]![1], `emenda entre ${spans[i - 1]![2]} e ${spans[i]![2]}`);
    assert.equal(spans.length, 16 + 16 + 1 + 4, "16 trechos à esquerda, 15 inteiros e meio à direita, o portão e quatro torres");
  }
});

test("os muros oeste e leste ficam cobertos de ponta a ponta: trechos de 2 tiles e as torres dos cantos se encostam", () => {
  for (const lx of [CAPITAL.minX, CAPITAL.maxX]) {
    const x = px(lx, 0).x, spans: Array<[number, number, string]> = [];
    for (const p of kinds("wall-side").filter(p => p.x === x)) spans.push([p.y - 64, p.y, p.id!]);
    for (const t of CAPITAL_TOWERS.filter(t => t.kind === "corner" && (lx === CAPITAL.minX ? t.lx === CAPITAL.minX : t.lx === CAPITAL.maxX - 1)))
      spans.push([(cy + t.ly) * T, (cy + t.ly + TOWER_TILES) * T, t.id]);
    spans.sort((a, b) => a[0] - b[0]);
    assert.equal(spans[0]![0], (cy + CAPITAL.minY) * T); assert.equal(spans[spans.length - 1]![1], (cy + CAPITAL.maxY + 1) * T);
    for (let i = 1; i < spans.length; i++) assert.equal(spans[i]![0], spans[i - 1]![1], `emenda entre ${spans[i - 1]![2]} e ${spans[i]![2]}`);
    assert.equal(spans.length, 30 + 2);
  }
});

test("os portões ficam no meio do vão de 9 tiles, com as torres coladas nos dois lados", () => {
  for (const g of kinds("gate")) {
    assert.equal(g.x, px(0, 0).x);
    const ly = g.id === "portao-norte" ? CAPITAL.minY : CAPITAL.maxY;
    assert.equal(g.y, (cy + ly + 1) * T, "no pé do muro");
  }
  const gateTowers = CAPITAL_TOWERS.filter(t => t.kind === "gate").map(t => t.lx).sort((a, b) => a - b);
  assert.deepEqual(gateTowers, [-6, -6, 5, 5]);
  for (const t of CAPITAL_TOWERS.filter(t => t.kind === "gate")) {
    const edge = t.lx < 0 ? t.lx + TOWER_TILES : t.lx;
    assert.equal(Math.abs(edge - 0.5), CAPITAL.gateHalf + 0.5 + 0, `a torre ${t.id} encosta no vão`);
  }
  assert.deepEqual(CAPITAL_TOWERS.filter(t => t.kind === "corner").map(t => [t.lx, t.ly]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!),
    [[-40, -32], [-40, 30], [38, -32], [38, 30]]);
});

test("cada torre fica no meio da sua base de 2 × 2 tiles, com o pé na borda de baixo, e a variação segue o tipo", () => {
  const towers = kinds("tower");
  for (const t of CAPITAL_TOWERS) {
    const prop = towers.find(p => p.id === t.id)!;
    assert.equal(prop.x, (cx + t.lx + 1) * T, `${t.id}: no meio da base`);
    assert.equal(prop.y, (cy + t.ly + 2) * T, `${t.id}: o pé na borda de baixo da base`);
    assert.equal(prop.variant, t.kind === "corner" ? 0 : 1, `${t.id}: a torre de canto é a variação 0 e a do portão é a 1`);
  }
});

test("as bases das 8 torres: 32 tiles diferentes, dentro da muralha, fora das ruas e dos terrenos, e só elas contam como torre", () => {
  const tiles = new Set<string>();
  for (const t of CAPITAL_TOWERS) for (let dy = 0; dy < TOWER_TILES; dy++) for (let dx = 0; dx < TOWER_TILES; dx++) {
    const lx = t.lx + dx, ly = t.ly + dy;
    tiles.add(`${lx},${ly}`);
    assert.equal(isCapitalTowerTile(lx, ly), true);
    assert.equal(isCapitalStreet(lx, ly), false, `torre em cima da rua ${lx},${ly}`);
    assert.equal(CAPITAL_PLOTS.some(p => inPlot(p, lx, ly)), false, `torre dentro de um terreno ${lx},${ly}`);
    assert.ok(lx >= CAPITAL.minX && lx <= CAPITAL.maxX && ly >= CAPITAL.minY && ly <= CAPITAL.maxY);
  }
  assert.equal(tiles.size, 32);
  let count = 0;
  for (let ly = CAPITAL.minY - 2; ly <= CAPITAL.maxY + 2; ly++) for (let lx = CAPITAL.minX - 2; lx <= CAPITAL.maxX + 2; lx++) if (isCapitalTowerTile(lx, ly)) count++;
  assert.equal(count, 32);
});

test("a colisão do jogo: toda a muralha e as torres bloqueiam o herói, e os portões, as ruas e o lado de fora ficam livres", () => {
  for (const seed of SEEDS) {
    let wall = 0, tower = 0;
    for (let ly = CAPITAL.minY; ly <= CAPITAL.maxY; ly++) for (let lx = CAPITAL.minX; lx <= CAPITAL.maxX; lx++) {
      if (isCapitalWall(lx, ly)) { wall++; assert.equal(passable(lx, ly, seed), false, `muralha livre em ${lx},${ly} (${seed})`); }
      else if (isCapitalTowerTile(lx, ly)) { tower++; assert.equal(passable(lx, ly, seed), false, `torre livre em ${lx},${ly}`); }
    }
    assert.equal(wall, 266);
    assert.equal(tower, 4 * 1 + 4 * 2, "tiles de torre fora da muralha: 1 em cada torre de canto e 2 em cada torre de portão");
    for (const ly of [CAPITAL.minY, CAPITAL.maxY]) for (let lx = -4; lx <= 4; lx++) assert.equal(passable(lx, ly, seed), true, `portão fechado em ${lx},${ly}`);
    for (const [lx, ly] of [[8, 0], [-20, 0], [0, -20], [0, 20], [-30, -16], [30, 16], [0, CAPITAL.minY - 3], [0, CAPITAL.maxY + 3], [CAPITAL.minX - 3, 0], [CAPITAL.maxX + 3, 0]] as const)
      assert.equal(passable(lx, ly, seed), true, `deveria estar livre: ${lx},${ly}`);
  }
});

test("de fora só se entra pelos portões: com os dois fechados a praça é inalcançável; com um aberto, é alcançável", () => {
  const seed = 842136, x0 = CAPITAL.minX - 3, x1 = CAPITAL.maxX + 3, y0 = CAPITAL.minY - 3, y1 = CAPITAL.maxY + 3;
  const reach = (from: readonly [number, number], shut: (lx: number, ly: number) => boolean): Set<string> => {
    const seen = new Set<string>([from.join()]), queue: Array<readonly [number, number]> = [from];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, ny = y + dy;
        if (nx < x0 || nx > x1 || ny < y0 || ny > y1 || seen.has(`${nx},${ny}`) || shut(nx, ny) || !passable(nx, ny, seed)) continue;
        seen.add(`${nx},${ny}`); queue.push([nx, ny]);
      }
    }
    return seen;
  };
  const gate = (lx: number, ly: number): boolean => Math.abs(lx) <= CAPITAL.gateHalf && (ly === CAPITAL.minY || ly === CAPITAL.maxY);
  assert.equal(reach([CAPITAL.minX - 2, 0], gate).has("8,0"), false, "portões fechados");
  assert.equal(reach([0, CAPITAL.minY - 2], gate).has("8,0"), false, "de dentro do portão norte, também fechado");
  const north = (lx: number, ly: number): boolean => Math.abs(lx) <= CAPITAL.gateHalf && ly === CAPITAL.maxY;
  const viaNorth = reach([CAPITAL.minX - 2, 0], north);
  assert.equal(viaNorth.has("8,0"), true, "com o portão norte aberto a praça é alcançável, dando a volta por fora");
  assert.equal(viaNorth.has(`0,${CAPITAL.maxY - 1}`), true, "e a rua logo dentro do portão sul também");
  assert.equal(viaNorth.has(`0,${CAPITAL.maxY}`), false, "mas a boca do portão sul está fechada neste teste");
});

test("o monumento bloqueia o jogo (tem arte); os terrenos ainda sem edifício não (seriam parede invisível); a planta já os conhece", () => {
  for (const seed of SEEDS) {
    const conselho = CAPITAL_PLOTS.find(p => p.id === "templo")!;
    assert.equal(passable(conselho.x + 3, conselho.y + 3, seed), true, "o terreno do Templo ainda é livre no jogo");
    assert.equal(passable(0, 0, seed), false, "mas o centro da praça, onde está o monumento, bloqueia");
    assert.equal(passable(3, 0, seed), true, "e a praça em volta do monumento é livre");
  }
  const c = px(CAPITAL_PLOTS.find(p => p.id === "templo")!.x + 3, CAPITAL_PLOTS.find(p => p.id === "templo")!.y + 3);
  assert.equal(capitalWallBlocks(c.x, c.y, 7), false, "a muralha não inclui os edifícios");
});

test("o desenho recebe as peças da capital perto dela e nenhuma longe, e cada uma com o tipo e a variação certos", () => {
  const recorder = new Recorder();
  (globalThis as Record<string, unknown>).document = { createElement: () => ({ width: 0, height: 0, getContext: () => recorder.ctx }) };
  const world = new WorldRenderer(842136);
  const gate = px(0, CAPITAL.minY), near = world.objects(gate.x, gate.y + 150, 1280, 720).filter(o => o.kind === "center-capital");
  assert.ok(near.length > 8 && near.length < 40, `${near.length} peças na tela do portão norte`);
  for (const o of near) {
    assert.ok(["wall", "wall-side", "gate", "tower", "monument", "building"].includes(o.capitalKind!), String(o.capitalKind));
    const src = CAPITAL_PROPS.find(p => p.x === o.x && p.y === o.y && p.kind === o.capitalKind)!;
    assert.ok(src, "toda peça entregue vem da lista"); assert.equal(o.variant, src.variant);
  }
  assert.ok(near.some(o => o.capitalKind === "gate") && near.some(o => o.capitalKind === "tower") && near.some(o => o.capitalKind === "wall"));
  const inside = world.objects(gate.x + 20 * T, gate.y + 20 * T, 1280, 720).filter(o => o.kind === "center-capital");
  assert.ok(inside.length > 5, "com a câmera 20 tiles para dentro, longe do centro da capital, as peças continuam entrando");
  assert.equal(world.objects(0, 0, 1280, 720).filter(o => o.kind === "center-capital").length, 0, "na vila não há peça da capital");
  assert.equal(world.objects(cx * T + 4000, cy * T, 1280, 720).filter(o => o.kind === "center-capital").length, 0, "longe, também não");
  const all = world.objects(px(0, 0).x, px(0, 0).y, 3200, 2400).filter(o => o.kind === "center-capital");
  assert.equal(all.length, 139, "com a cidade toda na tela, entram as 139 peças");
});
