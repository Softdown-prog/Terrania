import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { CaveFloor } from "../src/world/caveFloor.ts";
import { caveEntranceInCell, type CaveEntrance, type CaveTheme } from "../src/world/caves.ts";
import { LUMINOUS_SHARE, caveStyleFor } from "../src/world/caveStyle/index.ts";
import { CAVE_PALETTE } from "../src/render/caveDetails.ts";
import { MUSHROOM_SHARE, cavePaletteFor, drawGlowMushroom, drawGlowPool, luminousPalette, luminousPieces } from "../src/render/caveStyles/index.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { drawCaveView } from "../src/render/cave.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import { ASSETS } from "./helpers/artAssets.ts";

/**
 * Gruta Luminosa (ADR 0032): um segundo interior visual das cavernas, sorteado por entrada. É só aparência:
 * a planta (travada em tests/cave-floor.test.ts), a colisão e os monstros não dependem dela.
 */
const SEED = 842136;
const THEMES: readonly CaveTheme[] = ["verdant", "glacial", "desert", "coastal", "basalt", "marsh"];
const entrances = (): CaveEntrance[] => {
  const out: CaveEntrance[] = [];
  for (let cy = -60; cy <= 60; cy++) for (let cx = -60; cx <= 60; cx++) {
    const entrance = caveEntranceInCell(cx, cy, SEED);
    if (entrance) out.push(entrance);
  }
  return out;
};
/** Uma gruta comum e uma luminosa de cada tema, nesta semente (achadas por varredura e conferidas abaixo). */
const CELLS: Record<CaveTheme, { plain: readonly [number, number]; luminous: readonly [number, number] }> = {
  verdant: { plain: [71, -80], luminous: [73, -80] }, glacial: { plain: [-124, -130], luminous: [-129, -130] },
  desert: { plain: [1, 70], luminous: [-2, 69] }, coastal: { plain: [128, -128], luminous: [129, -129] },
  basalt: { plain: [-128, -125], luminous: [-130, -127] }, marsh: { plain: [99, 94], luminous: [95, 94] },
};
const cell = (theme: CaveTheme, style: "plain" | "luminous"): CaveEntrance =>
  caveEntranceInCell(CELLS[theme][style][0], CELLS[theme][style][1], SEED)!;
const record = (draw: (ctx: CanvasRenderingContext2D) => void) => {
  const recorder = new Recorder();
  withFakeDocument(recorder, () => draw(recorder.ctx));
  return recorder.metrics();
};

test("a escolha do estilo é determinística e atinge a fração combinada das cavernas comuns", () => {
  const all = entrances().filter(e => !e.tower);
  assert.ok(all.length > 1000, "amostra: " + all.length);
  const luminous = all.filter(e => caveStyleFor(e) === "luminous").length;
  assert.ok(Math.abs(luminous / all.length - LUMINOUS_SHARE) < 0.04, `fração ${luminous / all.length}`);
  for (const entrance of all.slice(0, 200)) assert.equal(caveStyleFor(entrance), caveStyleFor({ ...entrance }));
  assert.notDeepEqual(all.map(e => caveStyleFor(e)), all.map(e => caveStyleFor({ ...e, seed: e.seed + 1 })), "outra semente muda o sorteio");
});

test("a gruta de treino e as torres nunca viram Gruta Luminosa", () => {
  const starter = caveEntranceInCell(0, 0, SEED)!;
  assert.equal(starter.id, `cave:${SEED}:0:0`);
  assert.equal(caveStyleFor(starter), "plain");
  for (let tileX = 0; tileX < 400; tileX++)
    assert.equal(caveStyleFor({ ...starter, id: "tower-door:" + tileX, tower: "vigia-caida", tileX, tileY: tileX * 3 }), "plain");
  // O mesmo vale para a gruta de treino em outra semente.
  assert.equal(caveStyleFor({ id: "cave:7:0:0", seed: 7, tileX: 44, tileY: 11 }), "plain");
});

test("o estilo é só aparência: planta e população não o conhecem, e o teste das plantas cobre grutas luminosas", () => {
  for (const file of ["src/world/caveFloor.ts", "src/engine/rooms/CaveRoom.ts", "src/dungeons/index.ts"])
    assert.equal(/caveStyle/.test(readFileSync(file, "utf8")), false, file + " não pode depender do estilo");
  // As impressões digitais de tests/cave-floor.test.ts só valem como guarda se incluírem grutas luminosas.
  const baseline = readFileSync("tests/cave-floor.test.ts", "utf8");
  const cells = [...baseline.matchAll(/\[(-?\d+), (-?\d+), "(\w+)", "[0-9a-f]{8}"\]/g)];
  assert.equal(cells.length, 12);
  const luminous = cells.filter(([, cx, cy]) => caveStyleFor(caveEntranceInCell(Number(cx), Number(cy), SEED)!) === "luminous");
  assert.ok(luminous.length >= 3, "grutas luminosas entre as travadas: " + luminous.length);
  for (const [, cx, cy] of luminous) {
    const entrance = caveEntranceInCell(Number(cx), Number(cy), SEED)!;
    assert.deepEqual([...new CaveFloor(entrance).cells], [...new CaveFloor({ ...entrance }).cells]);
  }
});

test("a paleta luminosa é própria de cada tema, mais azulada e escura na rocha, e a comum fica igual", () => {
  const lum = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11; };
  const seen = new Set<string>();
  for (const theme of THEMES) {
    const plain = CAVE_PALETTE[theme], glow = luminousPalette(theme);
    assert.equal(cavePaletteFor(theme, "plain"), plain, "a comum é a paleta de sempre, por identidade");
    assert.equal(cavePaletteFor(theme, "luminous"), cavePaletteFor(theme, "luminous"), "memorizada");
    assert.deepEqual(cavePaletteFor(theme, "luminous"), glow);
    assert.notDeepEqual(glow, plain);
    assert.ok(lum(glow.wall) < lum(plain.wall), theme + ": rocha mais escura");
    const accent = parseInt(glow.accent.slice(1), 16);
    assert.ok(((accent >> 8) & 255) > ((accent >> 16) & 255), theme + ": o brilho puxa para o verde-água");
    assert.notEqual(glow.wall, glow.ground, theme + ": rocha e piso distinguíveis");
    seen.add(JSON.stringify(glow));
  }
  assert.equal(seen.size, THEMES.length, "um brilho por tema (herda a cor da região)");
});

test("cada peça da Gruta Luminosa tem o seu arquivo e está registrada no contrato de arte", () => {
  const files = readdirSync(new URL("../src/render/caveStyles/luminous/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["fairyRing", "glowPool", "glowPuddle", "index", "mushroom", "palette", "placement", "poolHalo", "poolShape"], "cada assunto no seu arquivo");
  for (const theme of THEMES) {
    for (const [id, fn] of [["cogumelos luminosos ", "drawGlowMushroom"], ["poça de musgo luminoso ", "drawGlowPool"], ["poça de água luminosa ", "drawGlowPuddle"], ["círculo de cogumelos ", "drawFairyRing"]] as const) {
      const asset = ASSETS.find(a => a.id === id + theme);
      assert.equal(asset?.tier, "prop", id + theme);
      assert.equal(asset.fn, fn);
    }
  }
});

test("os cogumelos e a poça brilham em screen, equilibram o contexto e são estáveis", () => {
  for (const theme of THEMES) for (const draw of [drawGlowMushroom, drawGlowPool]) {
    const first = record(ctx => draw(ctx, theme, 0, 0, .4));
    assert.equal(first.saves, first.restores);
    assert.equal(record(ctx => draw(ctx, theme, 0, 0, .4)).signature, first.signature);
    assert.notEqual(record(ctx => draw(ctx, theme, 0, 0, .9)).signature, first.signature, "a variação muda o desenho");
    assert.ok(first.gradients >= 2, "halo e volume");
  }
  for (const bad of [Number.NaN, -3, 7, Infinity])
    assert.doesNotThrow(() => record(ctx => { drawGlowMushroom(ctx, "marsh", 0, 0, bad); drawGlowPool(ctx, "marsh", 0, 0, bad); }));
});

test("a cena de uma caverna luminosa difere da comum, e as duas continuam determinísticas", () => {
  for (const theme of THEMES) {
    const pick = (style: "plain" | "luminous"): CaveEntrance => cell(theme, style);
    assert.equal(pick("plain").theme, theme);
    assert.equal(caveStyleFor(pick("plain")), "plain");
    assert.equal(caveStyleFor(pick("luminous")), "luminous");
    const view = (entrance: CaveEntrance) => {
      const room = new CaveRoom(entrance);
      return record(ctx => drawCaveView(ctx, room, room.player.x - 160, room.player.y - 140, 320, 280, 1));
    };
    const plain = view(pick("plain")), luminous = view(pick("luminous"));
    assert.equal(view(pick("plain")).signature, plain.signature, theme + ": comum estável");
    assert.equal(view(pick("luminous")).signature, luminous.signature, theme + ": luminosa estável");
    assert.equal(luminous.saves, luminous.restores, theme + ": save/restore");
    assert.ok(luminous.gradients > plain.gradients, theme + ": o brilho acrescenta gradientes (halos)");
  }
});

const seedOf = (floor: CaveFloor): number =>
  floor.entrance.seed ^ Math.imul(floor.entrance.tileX, 313) ^ Math.imul(floor.entrance.tileY, 971);

test("a colocação é determinística, fica no chão aberto e dos cogumelos só junto às paredes", () => {
  for (const theme of THEMES) {
    const floor = new CaveFloor(cell(theme, "luminous"));
    const pieces = luminousPieces(floor, seedOf(floor));
    assert.deepEqual(luminousPieces(floor, seedOf(floor)), pieces, theme + ": determinística");
    assert.notDeepEqual(luminousPieces(floor, seedOf(floor) + 1), pieces, theme + ": outra semente muda");
    const pools = pieces.filter(p => p.kind !== "mushroom"), mushrooms = pieces.filter(p => p.kind === "mushroom");
    assert.ok(pools.length > 20 && mushrooms.length > 20, `${theme}: ${pools.length} poças, ${mushrooms.length} cogumelos`);
    for (const piece of pieces) {
      const tx = Math.floor(piece.x / TILE_SIZE), ty = Math.floor((piece.y - (piece.kind === "mushroom" ? 3 : 0)) / TILE_SIZE);
      assert.equal(floor.at(tx, ty), 1, `${theme}: ${piece.kind} em chão aberto (${tx},${ty})`);
      assert.ok(piece.variation >= 0 && piece.variation <= 1);
      if (piece.kind === "mushroom")
        assert.ok(floor.at(tx, ty + 1) !== 1 || floor.at(tx - 1, ty) !== 1 || floor.at(tx + 1, ty) !== 1, theme + ": junto à parede");
    }
    assert.deepEqual(pieces.map(p => [p.y, p.x]), [...pieces].map(p => [p.y, p.x]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!), "de trás para frente");
    assert.ok(mushrooms.length / Math.max(1, pieces.length) > .1 && MUSHROOM_SHARE > 0 && MUSHROOM_SHARE < 1);
  }
});

test("o piso de uma gruta luminosa desenha exatamente as peças da lista, e a comum nenhuma", () => {
  /** Grava a pintura do andar e conta os halos de cogumelos e de poças. */
  const halos = (entrance: CaveEntrance): { mushrooms: number; pools: number; formations: number } => {
    const recorder = new Recorder(), inner = recorder.ctx, calls: number[][] = [];
    const linear: number[][] = [];
    const spy = new Proxy(inner, { get(target, prop) {
      if (prop === "createLinearGradient") return (...a: number[]) => { linear.push(a); return (target as unknown as Record<string, (...x: number[]) => object>).createLinearGradient!(...a); };
      if (prop === "createRadialGradient") return (...a: number[]) => { calls.push(a); return (target as unknown as Record<string, (...x: number[]) => object>).createRadialGradient!(...a); };
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    }, set(target, prop, value) { (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; } });
    Object.defineProperty(recorder, "ctx", { value: spy });
    const room = new CaveRoom(entrance);
    withFakeDocument(recorder, () => drawCaveView(spy, room, 0, 0, 200, 200, 1));
    // Halo do cogumelo: centro (0,-11), raio de 1 a 30. Luz da poça: centro (0,0), raio de 2 a 26.
    return { mushrooms: calls.filter(a => a[1] === -11 && a[2] === 1 && a[5] === 30).length,
      pools: calls.filter(a => a[1] === 0 && a[2] === 2 && a[5] === 26).length,
      // Volume da formação comum (pedra, raiz ou cristal): gradiente linear de (-11,-18) a (10,3).
      formations: linear.filter(a => a[0] === -11 && a[1] === -18 && a[2] === 10 && a[3] === 3).length };
  };
  for (const theme of THEMES) {
    const entrance = cell(theme, "luminous"), floor = new CaveFloor(entrance);
    const pieces = luminousPieces(floor, seedOf(floor));
    assert.deepEqual(halos(entrance), { mushrooms: pieces.filter(p => p.kind === "mushroom").length,
      pools: pieces.filter(p => p.kind !== "mushroom").length, formations: 0 },
    theme + ": uma peça pintada por item da lista, e nenhuma formação comum");
    const plain = halos(cell(theme, "plain"));
    assert.deepEqual([plain.mushrooms, plain.pools], [0, 0], theme + ": a comum não pinta nada luminoso");
    assert.ok(plain.formations > 10, theme + ": a comum continua com as suas formações (" + plain.formations + ")");
  }
});
