import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CapitalCurb, CURB, CURB_WIDTH, GLOW_SHARE, INLAY, LEVELS, MORTAR, NO_EDGES, PlazaSun, SIZES, SUN_RAYS, SUN_RINGS, TONES, VERGE_WIDTH, capitalSetts, paintCapitalPaving,
  paveNoise, stoneLook } from "../src/render/center/capital/paving/index.ts";
import { CAPITAL, CAPITAL_PLAZA_FOR_TESTS, capitalPoint, isCapitalPlaza, isCapitalPlazaLocal } from "./helpers/capitalApi.ts";
import { generateChunkCanvas } from "../src/render/terrain.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";
import { spy, type Spy } from "./helpers/spyContext.ts";

/**
 * Piso da capital (ADR 0057): pedras de granito nas ruas e lajes de calcário na praça, meio-fio, a rosa dos ventos de pedra e o
 * detalhe de cada pedra. A parte pura (onde fica cada pedra) é testada sem Canvas; o desenho, contando o que ele pinta.
 */
const SEED = 842136, cx = CAPITAL.centerX, cy = CAPITAL.centerY;
const lum = (css: string): number => { const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(css) ?? /#(..)(..)(..)/.exec(css); const v = m!.slice(1).map(x => (css.startsWith("#") ? parseInt(x, 16) : Number(x))); return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!; };
const count = (s: Spy, method: string, pick: (a: number[]) => boolean = () => true): number => (s.args[method] ?? []).filter(pick).length;
const paint = (tx: number, ty: number, plaza: boolean, edges?: { n: boolean; e: boolean; s: boolean; w: boolean }): Spy =>
  spy(c => paintCapitalPaving(c, { x: 0, y: 0, tx, ty, seed: SEED, plaza, ...(edges ? { edges } : {}) }));

test("as pedras das ruas são 16 × 8 em quatro fiadas, as lajes da praça 32 × 16 em duas, cada fiada cobrindo o tile de ponta a ponta", () => {
  assert.deepEqual(SIZES, { street: { w: 16, h: 8 }, plaza: { w: 32, h: 16 } });
  for (const [plaza, rows, h] of [[false, 4, 8], [true, 2, 16]] as const) for (const [tx, ty] of [[0, 0], [-7, 13], [-1, -830], [5000, -9000]] as const) {
    const setts = capitalSetts(tx, ty, SEED, plaza);
    for (let r = 0; r < rows; r++) {
      const row = setts.filter(s => s.y === r * h).sort((a, b) => a.x - b.x);
      assert.equal(row[0]!.x, 0); assert.equal(row.reduce((n, s) => n + s.w, 0), 32, `fiada ${r} cobre o tile`);
      for (let i = 1; i < row.length; i++) assert.equal(row[i]!.x, row[i - 1]!.x + row[i - 1]!.w, "sem buraco");
      for (const s of row) assert.equal(s.h, h);
    }
    assert.ok(setts.every(s => s.y % h === 0 && s.y < 32 && s.roll >= 0 && s.roll <= 1 && s.tone >= 0 && s.tone < 4));
  }
  for (const bad of [[Number.NaN, 0], [0, 1.5], [Infinity, 0]] as const) assert.deepEqual(capitalSetts(bad[0], bad[1], SEED, false), []);
  assert.deepEqual(capitalSetts(3, 4, SEED, false), capitalSetts(3, 4, SEED, false));
  assert.notDeepEqual(capitalSetts(3, 4, SEED, false), capitalSetts(3, 4, SEED + 1, false), "a semente muda o tom das pedras");
});

test("as fiadas alternam meia pedra de uma para a outra, também de um tile para o de baixo", () => {
  for (const [plaza, w, rows] of [[false, 16, 4], [true, 32, 2]] as const) {
    const firstWidths: number[] = [];
    for (let dy = 0; dy < 3; dy++) {
      const setts = capitalSetts(10, 20 + dy, SEED, plaza);
      for (let r = 0; r < rows; r++) firstWidths.push(setts.filter(s => s.y === r * (32 / rows)).sort((a, b) => a.x - b.x)[0]!.w);
    }
    assert.deepEqual(firstWidths, firstWidths.map((_, i) => (((20 * rows + i) % 2) === 0 ? w : w / 2)), `${plaza ? "praça" : "rua"}: pedra inteira nas fiadas pares e meia nas ímpares`);
  }
});

test("a pedra que atravessa a emenda de dois tiles sai igual nos dois (mesmo tom e mesmo sorteio): sem quadriculado", () => {
  let seams = 0;
  for (const plaza of [false, true]) for (const seed of [SEED, 7]) for (let tx = -40; tx < 40; tx += 7) for (let ty = -830; ty < -800; ty += 5) {
    const a = capitalSetts(tx, ty, seed, plaza), b = capitalSetts(tx + 1, ty, seed, plaza);
    for (const s of a.filter(s => !s.right)) {
      const t = b.find(o => o.y === s.y && o.x === 0 && !o.left)!;
      assert.ok(t, "a metade do outro lado existe");
      assert.equal(t.tone, s.tone); assert.equal(t.roll, s.roll); seams++;
    }
  }
  assert.ok(seams > 300, `emendas conferidas: ${seams}`);
});

test("as cores: quatro tons por tipo, a pedra da rua é mais escura que a da praça, e as combinações vêm de um estoque que se reaproveita", () => {
  assert.equal(TONES.street.length, 4); assert.equal(TONES.plaza.length, 4); assert.equal(LEVELS, 8);
  assert.notEqual(MORTAR.street, MORTAR.plaza);
  const seen = new Set<object>();
  for (const kind of ["street", "plaza"] as const) for (let t = 0; t < 4; t++) for (let r = 0; r < 1; r += 0.013) {
    const look = stoneLook(kind, t, r); seen.add(look);
    assert.ok(lum(look.light) > lum(look.body) && lum(look.body) > lum(look.dark), `${kind} ${t}: luz, corpo e sombra`);
    assert.equal(stoneLook(kind, t, r), look, "a mesma combinação devolve o mesmo objeto");
  }
  assert.ok(seen.size <= 2 * 4 * LEVELS && seen.size > 40, `${seen.size} combinações no máximo 64`);
  const avg = (kind: "street" | "plaza"): number => TONES[kind].reduce((n, c) => n + lum(c), 0) / 4;
  assert.ok(avg("street") < avg("plaza") - 40, "granito escuro nas ruas, calcário claro na praça");
  assert.deepEqual(stoneLook("street", Number.NaN, Number.NaN), stoneLook("street", 0, 0.5));
  assert.deepEqual(stoneLook("plaza", 99, 9), stoneLook("plaza", 3, 1));
  assert.deepEqual(stoneLook("plaza", -4, -1), stoneLook("plaza", 0, 0));
});

test("o meio-fio leva três retângulos por lado, no lado certo e com 4 px; a sombra no gramado leva um por lado, com 5 px", () => {
  assert.equal(CURB_WIDTH, 4); assert.equal(VERGE_WIDTH, 5);
  assert.deepEqual(spy(c => new CapitalCurb(c).draw(0, 0, NO_EDGES)).calls, {});
  const only = (e: Partial<typeof NO_EDGES>): Spy => spy(c => new CapitalCurb(c).draw(10, 20, { ...NO_EDGES, ...e }));
  assert.deepEqual(only({ n: true }).args.fillRect, [[10, 20, 32, 4], [10, 20, 32, 1], [10, 23, 32, 1]]);
  assert.deepEqual(only({ s: true }).args.fillRect, [[10, 48, 32, 4], [10, 48, 32, 1], [10, 51, 32, 1]]);
  assert.deepEqual(only({ w: true }).args.fillRect, [[10, 20, 4, 32], [10, 20, 1, 32], [13, 20, 1, 32]]);
  assert.deepEqual(only({ e: true }).args.fillRect, [[38, 20, 4, 32], [38, 20, 1, 32], [41, 20, 1, 32]]);
  assert.equal(only({ n: true, e: true, s: true, w: true }).calls.fillRect, 12);
  const colors = only({ n: true }).raw; assert.deepEqual(colors, [CURB.body, CURB.light, CURB.dark]);
  const verge = (e: Partial<typeof NO_EDGES>): Spy => spy(c => new CapitalCurb(c).verge(10, 20, { ...NO_EDGES, ...e }));
  assert.deepEqual(verge({}).calls, {});
  assert.deepEqual(verge({ n: true }).args.fillRect, [[10, 20, 32, 5]]); assert.deepEqual(verge({ s: true }).args.fillRect, [[10, 47, 32, 5]]);
  assert.deepEqual(verge({ w: true }).args.fillRect, [[10, 20, 5, 32]]); assert.deepEqual(verge({ e: true }).args.fillRect, [[37, 20, 5, 32]]);
  assert.deepEqual(verge({ n: true }).raw, [CURB.shade]);
});

test("a rosa dos ventos: quatro anéis e oito raios; cada tile desenha só o pedaço que passa por ele, recortado no tile", () => {
  assert.deepEqual(SUN_RINGS.map(r => [r.r, r.w, r.tone]), [[96, 8, "royal"], [112, 5, "gold"], [176, 7, "gold"], [192, 3, "royal"]]);
  assert.deepEqual(SUN_RAYS, { count: 8, from: 122, to: 330, half: 11 });
  const draw = (lx: number, ly: number): Spy => spy(c => new PlazaSun(c).draw(0, 0, cx + lx, cy + ly));
  // o centro da praça e os cantos não têm anel nem raio
  assert.deepEqual(draw(0, 0).calls, {}, "no centro o monumento cobre e o tile não tem anel");
  assert.deepEqual(draw(-11, -11).calls, {}, "no canto da praça, longe de tudo");
  // um tile do anel dourado interno: dois traços (sulco e cor) recortados, com o arco no raio certo e no centro da praça
  const ring = draw(3, 0), arcs = ring.args.arc ?? [];
  assert.ok(arcs.length >= 1 && arcs.length <= 4, `anéis no tile (3,0): ${arcs.length}`);
  assert.ok(arcs.some(a => a[2] === 96) || arcs.some(a => a[2] === 112), "o anel de 96 ou o de 112 passa por aqui");
  for (const a of arcs) { assert.equal(a[0], capitalPoint(0, 0).x - (cx + 3) * 32); assert.equal(a[1], capitalPoint(0, 0).y - (cy + 0) * 32); }
  assert.equal(ring.calls.clip, ring.calls.save); assert.equal(ring.calls.save, ring.calls.restore);
  assert.ok(ring.raw.includes(INLAY.groove) && (ring.raw.includes(INLAY.royal) || ring.raw.includes(INLAY.gold)));
  // raio cardinal (dourado) a 200 px para leste e raio diagonal (azul) a 226 px
  const east = draw(6, 0), diagonal = draw(5, 5);
  assert.ok(east.raw.includes(INLAY.goldLight) && !east.raw.includes(INLAY.royalLight), "o raio cardinal é dourado");
  assert.ok(diagonal.raw.includes(INLAY.royalLight) && !diagonal.raw.includes(INLAY.goldLight), "o raio diagonal é azul");
  for (const s of [east, diagonal]) { assert.ok(s.raw.includes(INLAY.outline)); assert.equal(count(s, "lineTo"), 2); assert.equal(count(s, "moveTo"), 1 + (s.args.arc ? 0 : 0)); }
  // todo tile que a faixa do anel atravessa desenha o anel, e nenhum que fica a mais de 3 px dela
  for (const ring of SUN_RINGS) {
    const touched = new Set<string>(), c = capitalPoint(0, 0);
    for (let a = 0; a < Math.PI * 2; a += 0.002) for (const d of [-ring.w / 2 + 0.5, ring.w / 2 - 0.5]) touched.add(`${Math.floor((c.x + Math.cos(a) * (ring.r + d)) / 32)},${Math.floor((c.y + Math.sin(a) * (ring.r + d)) / 32)}`);
    for (const key of touched) { const [tx, ty] = key.split(",").map(Number); assert.ok(count(spy(k => new PlazaSun(k).draw(0, 0, tx!, ty!)), "arc", a => a[2] === ring.r) === 1, `anel de ${ring.r} some em ${key}`); }
    let drawn = 0;
    for (let ly = -12; ly <= 12; ly++) for (let lx = -12; lx <= 12; lx++) if (count(draw(lx, ly), "arc", a => a[2] === ring.r) === 1) drawn++;
    assert.ok(drawn >= touched.size && drawn <= touched.size + 12, `anel de ${ring.r}: ${drawn} tiles desenham, ${touched.size} são tocados`);
  }
});

test("o piso de um tile: a argamassa e três retângulos por pedra, mais o meio-fio nos lados que encostam no gramado", () => {
  for (const [tx, ty, plaza] of [[-1, -830, false], [-5, -820, false], [cx + 8, cy + 8, true]] as const) {
    const setts = capitalSetts(tx, ty, SEED, plaza), s = paint(tx, ty, plaza);
    const glow = s.calls.createRadialGradient ?? 0, stones = setts.reduce((n, o) => n + (o.right || o.bottom ? 3 : 2), 0);
    assert.equal(count(s, "fillRect"), 1 + stones + glow, `retângulos de ${tx},${ty}`);
    assert.deepEqual(s.args.fillRect![0], [0, 0, 32, 32], "a argamassa vem primeiro e cobre o tile");
    assert.equal(s.raw[0], plaza ? MORTAR.plaza : MORTAR.street);
    assert.equal(paint(tx, ty, plaza, { n: true, e: false, s: true, w: false }).calls.fillRect, 1 + stones + glow + 6);
    assert.deepEqual(paint(tx, ty, plaza).args.fillRect, paint(tx, ty, plaza, NO_EDGES).args.fillRect, "sem lados, sem meio-fio");
  }
  assert.equal(paint(-1, -830, false).calls.clip ?? 0, 0, "nas ruas não há anel nem raio");
});

test("as pedras têm rachadura, quina gasta e, em uma de cada três tiles, uma pedra polida com brilho em degradê", () => {
  let glows = 0, tiles = 0;
  for (let tx = cx - 3; tx <= cx + 3; tx++) for (let ty = cy - 30; ty <= cy - 12; ty++) {
    const setts = capitalSetts(tx, ty, SEED, false), s = paint(tx, ty, false);
    assert.equal(count(s, "quadraticCurveTo"), setts.filter(o => o.roll > 0.86 && o.w > 9).length, `rachaduras em ${tx},${ty}`);
    assert.equal(count(s, "arc", a => a[2] === 1.5), setts.filter(o => o.roll > 0.5 && o.roll < 0.62 && o.right && o.w > 6).length, `quinas gastas em ${tx},${ty}`);
    const g = s.calls.createRadialGradient ?? 0; assert.ok(g <= 1); glows += g; tiles++;
  }
  assert.ok(glows / tiles > 0.25 && glows / tiles < 0.43, `brilhos: ${(glows / tiles).toFixed(2)} por tile`);
  assert.equal(GLOW_SHARE, 0.34);
  for (let tx = 0; tx < 30; tx++) {
    const full = capitalSetts(tx, 5, SEED, false).filter(o => o.left && o.right && o.w >= 12);
    assert.equal((paint(tx, 5, false).calls.createRadialGradient ?? 0) === 1, paveNoise(tx, 5, SEED + 83) < GLOW_SHARE && full.length > 0, `brilho em ${tx},5 segue o sorteio`);
  }
});

test("a praça e as ruas se ligam ao desenho do terreno: o chunk da capital pinta o piso e o da vila não", () => {
  const colors = (x: number, y: number): Set<string> => {
    const s = spy(c => {
      const proxy = new Proxy(c, {
        get(t, p) { if (p === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }); const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(t) : v; },
        set(t, p, v) { (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
      });
      withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) }, () => generateChunkCanvas(x, y, SEED));
    });
    return new Set(s.raw);
  };
  const plaza = colors(-1, -50), gate = colors(-1, -52), village = colors(0, 0), far = colors(40, -60);
  for (const c of [MORTAR.plaza, INLAY.gold, INLAY.royal, INLAY.groove]) assert.ok(plaza.has(c), `a praça pinta ${c}`);
  for (const c of [MORTAR.street, CURB.body, CURB.shade]) assert.ok(gate.has(c) || plaza.has(c), `a capital pinta ${c}`);
  for (const c of [MORTAR.plaza, MORTAR.street, INLAY.gold, CURB.body, CURB.shade]) { assert.equal(village.has(c), false, `a vila não pinta ${c}`); assert.equal(far.has(c), false, `longe não pinta ${c}`); }
  const src = readFileSync("src/render/terrain.ts", "utf8");
  assert.match(src, /if \(capitalGround\(tx, ty\) === "path"\) \{/);
  assert.match(src, /paintCapitalPaving\(ctx, \{ x, y, tx, ty, seed, plaza: isCapitalPlaza\(tx, ty\), edges \}\);/);
  assert.match(src, /if \(capitalGround\(tx, ty\) === "grass"\) \{/);
  assert.match(src, /new CapitalCurb\(ctx\)\.verge\(x, y, sides\)/);
});

test("a Praça dos Povos é o quadrado de 23 × 23 tiles em volta do centro, e cada peça está no seu arquivo", () => {
  assert.equal(CAPITAL_PLAZA_FOR_TESTS.x0, -11); assert.equal(CAPITAL_PLAZA_FOR_TESTS.x1, 11);
  for (const [lx, ly, plaza] of [[0, 0, true], [11, 11, true], [-11, -11, true], [12, 0, false], [0, -12, false], [30, 30, false]] as const) {
    assert.equal(isCapitalPlazaLocal(lx, ly), plaza, `${lx},${ly}`); assert.equal(isCapitalPlaza(cx + lx, cy + ly), plaza);
  }
  assert.equal(isCapitalPlaza(Number.NaN, 0), false); assert.equal(isCapitalPlaza(0.5, 0), false);
  assert.deepEqual(readdirSync(new URL("../src/render/center/capital/paving/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort(), ["curb", "index", "palette", "paving", "setts", "sun"]);
  for (const f of ["curb", "palette", "paving", "setts", "sun"]) for (const bad of ["Math.random", "Date.now", "performance.now", "new Date(", "render/south", "world/south"])
    assert.equal(readFileSync(`src/render/center/capital/paving/${f}.ts`, "utf8").includes(bad), false, `${f}: ${bad}`);
  const r = new Recorder(); paintCapitalPaving(r.ctx, { x: 0, y: 0, tx: -1, ty: -830, seed: SEED, plaza: false }); assert.equal(r.metrics().saves, r.metrics().restores);
});
