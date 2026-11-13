import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CaveFloor } from "../src/world/caveFloor.ts";
import { caveEntranceInCell, type CaveTheme } from "../src/world/caves.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { COMPANION_SHARE, MOSS_SHARE, PUDDLE_SHARE } from "../src/render/caveStyles/luminous/placement.ts";
import { POOL_POINTS, blobPath, drawFairyRing, drawGlowPool, drawGlowPuddle, luminousPalette, luminousPieces, poolHalo, poolParams } from "../src/render/caveStyles/index.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * Poças da Gruta Luminosa sem repetição (ADR 0052): três tipos (tapete de musgo, poça de água e círculo de cogumelos), cada um com
 * tamanho, achatamento, giro e contorno próprios, em pontos variados do tile e, às vezes, com uma companheira ao lado.
 */
const SEED = 842136;
const THEMES: readonly CaveTheme[] = ["verdant", "glacial", "desert", "coastal", "basalt", "marsh"];
const CELLS: ReadonlyArray<readonly [number, number]> = [[64, -76], [60, -81], [76, -79], [73, -80]];
const floorOf = (c: readonly [number, number]): CaveFloor => new CaveFloor(caveEntranceInCell(c[0], c[1], SEED)!);
const seedOf = (f: CaveFloor): number => f.entrance.seed ^ Math.imul(f.entrance.tileX, 313) ^ Math.imul(f.entrance.tileY, 971);
const balanced = (draw: (c: CanvasRenderingContext2D) => void): boolean => { const r = new Recorder(); draw(r.ctx); const m = r.metrics(); return m.saves === m.restores; };
const VARIATIONS = Array.from({ length: 120 }, (_, i) => (i * 0.0083 + 0.0021) % 1);

test("os números da poça saem da variação: estáveis, em faixas certas e bem diferentes entre si", () => {
  const sizes = new Set<number>(), rotations = new Set<number>();
  for (const v of VARIATIONS) {
    const a = poolParams(v);
    assert.deepEqual(poolParams(v), a);
    assert.ok(a.size >= 0.7 && a.size <= 1.6, `tamanho ${a.size}`);
    assert.ok(a.aspect >= 0.75 && a.aspect <= 1.3);
    assert.ok(Math.abs(a.rotation) <= 0.4);
    assert.equal(a.radii.length, 9);
    assert.equal(POOL_POINTS, 9);
    for (const r of a.radii) assert.ok(r >= 0.76 && r <= 1.22);
    sizes.add(a.size); rotations.add(a.rotation);
  }
  assert.ok(sizes.size > 100 && rotations.size > 100, "cada variação dá um tamanho e um giro próprios");
  assert.deepEqual(poolParams(Number.NaN), poolParams(0.5));
  assert.deepEqual(poolParams(-4), poolParams(0));
  assert.deepEqual(poolParams(9), poolParams(1));
  assert.notDeepEqual(poolParams(0.31).radii, poolParams(0.32).radii, "contornos diferentes");
});

test("o contorno é uma curva fechada de nove pontos, cresce com o fator e fica dentro do raio esperado", () => {
  const params = poolParams(0.37);
  const s = spy(c => blobPath(params, c));
  assert.equal(s.calls.moveTo, 1); assert.equal(s.calls.quadraticCurveTo, 9); assert.equal(s.calls.closePath, 1); assert.equal(s.calls.beginPath, 1);
  const extent = (grow: number): number => Math.max(...(spy(c => blobPath(params, c, grow)).args.quadraticCurveTo ?? []).map(a => Math.hypot(a[0]!, a[1]! / 0.55)));
  assert.ok(extent(1) > 8 && extent(1) < 16);
  assert.ok(Math.abs(extent(1.1) / extent(1) - 1.1) < 0.001, "o fator escala o contorno todo");
  assert.notEqual(signature(c => blobPath(poolParams(0.1), c)), signature(c => blobPath(poolParams(0.8), c)));
});

test("a luz da poça é o mesmo círculo de 2 a 26 px e a força muda só o brilho", () => {
  const strong = spy(c => poolHalo("#5af0c8", 1, c)), soft = spy(c => poolHalo("#5af0c8", 0.5, c));
  assert.deepEqual(strong.args.createRadialGradient![0], [0, 0, 2, 0, 0, 26]);
  assert.ok(strong.raw.includes("rgba(90,240,200,0.4)") && soft.raw.includes("rgba(90,240,200,0.2)"));
  assert.ok(strong.raw.includes("rgba(90,240,200,0.13)") && soft.raw.includes("rgba(90,240,200,0.065)"));
  assert.deepEqual(strong.args.ellipse![0], [0, 0, 26, 17, 0, 0, Math.PI * 2]);
  assert.ok(balanced(c => poolHalo("#5af0c8", 1, c)));
});

test("os três tipos: estáveis, equilibrados, diferentes entre si e entre variações, com a luz na força de cada um", () => {
  const kinds = [["musgo", drawGlowPool, "rgba"], ["água", drawGlowPuddle, ""], ["círculo", drawFairyRing, ""]] as const;
  for (const theme of THEMES) {
    const accent = luminousPalette(theme).accent, rgb = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16)).join(",");
    const sigs = new Set<string>();
    for (const [name, draw] of kinds) {
      const sig = signature(c => draw(c, theme, 0, 0, 0.4));
      assert.equal(signature(c => draw(c, theme, 0, 0, 0.4)), sig, `${theme} ${name}: estável`);
      assert.notEqual(signature(c => draw(c, theme, 0, 0, 0.9)), sig, `${theme} ${name}: a variação muda o desenho`);
      assert.ok(balanced(c => draw(c, theme, 3, 4, 0.4)));
      sigs.add(sig);
      const s = spy(c => draw(c, theme, 0, 0, 0.4));
      assert.equal(s.args.createRadialGradient!.filter(a => a.join() === "0,0,2,0,0,26").length, 1, `${theme} ${name}: a luz da poça, uma vez`);
      assert.ok(s.args.translate!.some(a => a[0] === 0 && a[1] === 0));
    }
    assert.equal(sigs.size, 3, theme + ": os tipos se distinguem");
    const strength = (draw: typeof drawGlowPool): boolean => spy(c => draw(c, theme, 0, 0, 0.4)).raw.includes(`rgba(${rgb},0.4)`);
    assert.ok(strength(drawGlowPool) && !strength(drawGlowPuddle) && !strength(drawFairyRing), theme + ": só o musgo tem a luz inteira");
    assert.ok(spy(c => drawGlowPuddle(c, theme, 0, 0, 0.4)).raw.includes(`rgba(${rgb},0.22)`), theme + ": a água, com 55% da luz");
    assert.ok(spy(c => drawFairyRing(c, theme, 0, 0, 0.4)).raw.includes(`rgba(${rgb},0.28)`), theme + ": o círculo, com 70% da luz");
  }
  for (const bad of [Number.NaN, -3, 7, Infinity]) for (const [, draw] of kinds) assert.doesNotThrow(() => signature(c => draw(c, "marsh", 0, 0, bad)));
});

test("o tapete de musgo tem o tamanho da variação (a escala) e mais tufos nos grandes", () => {
  const scaleOf = (v: number): number => spy(c => drawGlowPool(c, "verdant", 0, 0, v)).args.scale![0]![0]!;
  for (const v of [0.1, 0.4, 0.77]) assert.equal(scaleOf(v), poolParams(v).size);
  const sizes = new Set(VARIATIONS.map(scaleOf));
  assert.ok(sizes.size > 100);
  const tufts = (v: number): number => (spy(c => drawGlowPool(c, "verdant", 0, 0, v)).args.quadraticCurveTo ?? []).filter(a => a[3] === -5.5 || Math.abs(a[3]! - a[1]! + 2.5) < 0.001).length;
  const small = VARIATIONS.find(v => poolParams(v).size < 0.8)!, big = VARIATIONS.find(v => poolParams(v).size > 1.5)!;
  assert.ok(tufts(big) > tufts(small), `tufos ${tufts(small)} nos pequenos e ${tufts(big)} nos grandes`);
});

test("a poça de água: margem molhada, três ondas, risco de reflexo, três seixos e brilhos recortados na água", () => {
  const s = spy(c => drawGlowPuddle(c, "glacial", 0, 0, 0.5));
  assert.equal(s.calls.clip, 1, "ondas só dentro da água");
  assert.equal((s.args.ellipse ?? []).filter(a => a.length === 7 && a[0] === 1 && a[1] === -0.5).length, 3, "três ondas");
  for (const r of [1.9, 1.5, 1.2]) assert.ok((s.args.ellipse ?? []).some(a => a[2] === r && Math.abs(a[3]! - r * 0.65) < 1e-9), `seixo de raio ${r}`);
  assert.ok(s.raw.includes("rgba(255,246,220,0.6)"), "risco de reflexo");
  assert.equal(s.calls.createRadialGradient, 3, "a sombra, a luz e o degradê da água");
});

test("o círculo de cogumelos tem de 8 a 11 cogumelos, de tamanhos diferentes, e a quantidade muda com a variação", () => {
  const stems = (v: number): number[][] => (spy(c => drawFairyRing(c, "verdant", 0, 0, v)).args.fillRect ?? []);
  const counts = new Set(VARIATIONS.map(v => stems(v).length));
  for (const n of counts) assert.ok(n >= 8 && n <= 11, `${n} cogumelos`);
  assert.ok(counts.size >= 3, "a quantidade varia");
  const widths = new Set(stems(0.5).map(a => a[2]));
  assert.ok(widths.size >= 6, "tamanhos variados");
  const ys = stems(0.5).map(a => a[1]! + a[3]!);
  assert.deepEqual(ys, [...ys].sort((a, b) => a - b), "de trás para a frente");
});

test("a colocação: três tipos nas fatias certas, em qualquer ponto do tile, só em chão cercado de chão e com companheiras", () => {
  let moss = 0, puddle = 0, ring = 0, companions = 0, centeredX = 0, centeredY = 0, total = 0;
  const offsets = new Set<number>(), variations = new Set<number>();
  for (const cell of CELLS) {
    const floor = floorOf(cell), pieces = luminousPieces(floor, seedOf(floor));
    assert.deepEqual(luminousPieces(floor, seedOf(floor)), pieces);
    const ground = pieces.filter(p => p.kind !== "mushroom");
    for (const p of ground) {
      const tx = Math.floor(p.x / TILE_SIZE), ty = Math.floor(p.y / TILE_SIZE);
      assert.equal(floor.at(tx, ty), 1, "em chão aberto");
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) assert.notEqual(floor.at(tx + dx!, ty + dy!), 0, `cercado de chão em ${tx},${ty}`);
      assert.ok(p.x - tx * TILE_SIZE >= 6 && p.x - tx * TILE_SIZE <= 26 && p.y - ty * TILE_SIZE >= 8 && p.y - ty * TILE_SIZE <= 26, "dentro do miolo do tile");
      total++; if (p.x === tx * TILE_SIZE + 16) centeredX++; if (p.y === ty * TILE_SIZE + 17) centeredY++;
      offsets.add(Math.round(p.x - tx * TILE_SIZE)); variations.add(p.variation);
      if (p.kind === "pool") moss++; else if (p.kind === "puddle") puddle++; else ring++;
    }
    const byTile = new Map<string, number>();
    for (const p of ground) { const key = `${Math.floor(p.x / TILE_SIZE)},${Math.floor(p.y / TILE_SIZE)}`; byTile.set(key, (byTile.get(key) ?? 0) + 1); }
    companions += [...byTile.values()].filter(n => n === 2).length;
  }
  const mainTotal = total - companions;
  assert.ok(total > 60, `${total} peças de chão`);
  assert.ok(moss > 0 && puddle > 0 && ring > 0);
  assert.ok(Math.abs((puddle) / mainTotal - (PUDDLE_SHARE - MOSS_SHARE)) < 0.12, `água ${(puddle / mainTotal).toFixed(2)}`);
  assert.ok(Math.abs(ring / mainTotal - (1 - PUDDLE_SHARE)) < 0.1, `círculos ${(ring / mainTotal).toFixed(2)}`);
  assert.ok(companions > 0 && companions / mainTotal < COMPANION_SHARE * 2.2, `companheiras ${companions}`);
  assert.ok(centeredX === 0 && centeredY === 0, "nenhuma peça no centro do tile, em x nem em y");
  assert.ok(offsets.size >= 14, "pontos variados no tile");
  assert.ok(variations.size > total * 0.85, "variações quase todas diferentes");
});

test("o piso pinta cada tipo com o seu desenhista", () => {
  const src = readFileSync("src/render/cave.ts", "utf8");
  assert.match(src, /piece\.kind === "pool"\) drawGlowPool\(ctx, floor\.theme, piece\.x, piece\.y, piece\.variation\)/);
  assert.match(src, /piece\.kind === "puddle"\) drawGlowPuddle\(ctx, floor\.theme, piece\.x, piece\.y, piece\.variation\)/);
  assert.match(src, /piece\.kind === "ring"\) drawFairyRing\(ctx, floor\.theme, piece\.x, piece\.y, piece\.variation\)/);
});
