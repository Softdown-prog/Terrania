import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { BIOME_NAMES, type Biome } from "../src/world/biomes.ts";
import { CHUNK_TILES, getTile } from "../src/world/terrain.ts";
import { ROCK_VARIANTS, drawMossRock, drawSandstoneRock, rockStyleFor, rockVariant } from "../src/render/rocks/index.ts";
import { WorldRenderer } from "../src/render/WorldRenderer.ts";
import { renderScenery, clearSceneryCache, type Scenery } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Pedras com estilo por bioma (ADR 0035): arenito no deserto, musgo no resto. O estilo sai do bioma do tile
 * e o formato de uma variação própria da posição (a do tile era sempre pequena e escolhia sempre o mesmo).
 */
const SEED = 842136;
const signature = (draw: (c: CanvasRenderingContext2D) => void): string => {
  const r = new Recorder();
  draw(r.ctx);
  return r.metrics().signature;
};
/** Todas as cores usadas em preenchimentos e traços, como [r, g, b]. */
function colorsOf(draw: (c: CanvasRenderingContext2D) => void): Array<[number, number, number]> {
  const recorder = new Recorder(), seen: Array<[number, number, number]> = [];
  const note = (value: unknown): void => {
    if (typeof value !== "string") return;
    const hex = /^#([0-9a-f]{6})/i.exec(value);
    const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
    if (hex) seen.push([parseInt(hex[1]!.slice(0, 2), 16), parseInt(hex[1]!.slice(2, 4), 16), parseInt(hex[1]!.slice(4, 6), 16)]);
    else if (rgb) seen.push([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]);
  };
  const stop = (_: number, color: string): void => note(color);
  const spy = new Proxy(recorder.ctx, {
    get(t, p) {
      if (p === "createLinearGradient" || p === "createRadialGradient")
        return (...a: number[]) => { const g = (t as unknown as Record<string, (...x: number[]) => { addColorStop: (o: number, c: string) => void }>)[p as string]!(...a); const add = g.addColorStop.bind(g); g.addColorStop = (o, c) => { stop(o, c); add(o, c); }; return g; };
      const v = (t as unknown as Record<string | symbol, unknown>)[p];
      return typeof v === "function" ? (v as (...x: unknown[]) => unknown).bind(t) : v;
    },
    set(t, p, v) { if (p === "fillStyle" || p === "strokeStyle") note(v); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
  });
  draw(spy);
  return seen;
}

test("cada assunto das pedras está no seu arquivo", () => {
  const files = readdirSync(new URL("../src/render/rocks/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["index", "mossRock", "sandstoneRock", "style", "types", "variant"]);
  assert.equal(ROCK_VARIANTS, 6);
});

test("o estilo vem do bioma: arenito nos desertos e musgo em todo o resto", () => {
  for (const biome of Object.keys(BIOME_NAMES) as Biome[])
    assert.equal(rockStyleFor(biome), biome === "dunes" || biome === "ruins" ? "sandstone" : "moss", biome);
});

/** Tiles de pedra perto do deserto, onde a pedra existe de verdade. */
function rockTiles(tx0: number, ty0: number, span: number): Array<{ tx: number; ty: number; decoration: number }> {
  const out: Array<{ tx: number; ty: number; decoration: number }> = [];
  for (let ty = ty0; ty < ty0 + span; ty++) for (let tx = tx0; tx < tx0 + span; tx++) {
    const tile = getTile(tx, ty, SEED);
    if (tile.rock) out.push({ tx, ty, decoration: tile.decoration });
  }
  return out;
}

test("a variação da pedra usa os seis formatos (a do tile caía sempre no primeiro)", () => {
  const rocks = rockTiles(-300, 15500, 700);
  assert.ok(rocks.length > 300, "pedras na amostra: " + rocks.length);
  const bucket = (v: number): number => Math.min(ROCK_VARIANTS - 1, Math.max(0, Math.floor(v * ROCK_VARIANTS)));
  // O defeito de antes: o `decoration` de um tile de pedra é sempre pequeno, então o formato era sempre o 0.
  assert.deepEqual([...new Set(rocks.map(r => bucket(r.decoration)))], [0], "antes: um único formato");
  const counts = new Array<number>(ROCK_VARIANTS).fill(0);
  for (const rock of rocks) counts[bucket(rockVariant(rock.tx, rock.ty, SEED))]!++;
  for (const [shape, n] of counts.entries()) assert.ok(n / rocks.length > 0.08, `formato ${shape}: ${n} de ${rocks.length}`);
  for (const rock of rocks.slice(0, 50)) {
    const v = rockVariant(rock.tx, rock.ty, SEED);
    assert.ok(v >= 0 && v < 1);
    assert.equal(v, rockVariant(rock.tx, rock.ty, SEED));
  }
  assert.notEqual(rockVariant(10, 20, SEED), rockVariant(10, 20, SEED + 1));
});

test("a pedra de musgo é idêntica à de antes da mudança de arquivo", () => {
  // Assinaturas gravadas do `paintRock` original, de `scenery.ts`, para os seis formatos.
  const before = ["52141570", "e8ec95a3", "f3d14d06", "70aa15ce", "b4f006b2", "2b2f022d"];
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(b => signature(c => drawMossRock(c, b))), before);
});

test("a pedra de arenito: seis formatos diferentes, estáveis, equilibradas e sem nenhum verde", () => {
  const sigs = [0, 1, 2, 3, 4, 5].map(v => signature(c => drawSandstoneRock(c, v)));
  assert.equal(new Set(sigs).size, ROCK_VARIANTS, "cada formato é um desenho diferente");
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(v => signature(c => drawSandstoneRock(c, v))), sigs, "estável");
  for (const v of [0, 1, 2, 3, 4, 5]) {
    const r = new Recorder();
    drawSandstoneRock(r.ctx, v);
    const m = r.metrics();
    assert.equal(m.saves, m.restores, "formato " + v);
    for (const [red, green, blue] of colorsOf(c => drawSandstoneRock(c, v)))
      assert.ok(!(green > red + 6 && green > blue + 6), `formato ${v}: cor esverdeada ${red},${green},${blue}`);
  }
  // Conferência de que o detector enxerga verde: a pedra de musgo tem.
  assert.ok(colorsOf(c => drawMossRock(c, 0)).some(([r, g, b]) => g > r + 6 && g > b + 6), "a de musgo tem verde");
  for (const bad of [Number.NaN, -3, 99, Infinity]) {
    assert.doesNotThrow(() => drawSandstoneRock(new Recorder().ctx, bad));
    assert.equal(signature(c => drawSandstoneRock(c, bad)), signature(c => drawSandstoneRock(c, Math.max(0, Math.min(5, Number.isFinite(bad) ? bad : 0)))));
  }
});

test("a fenda nunca passa da silhueta: o desenho recorta o material antes de riscar", () => {
  for (const v of [0, 1, 2, 3, 4, 5]) {
    const r = new Recorder();
    drawSandstoneRock(r.ctx, v);
    assert.ok(r.metrics().clips >= (v === 5 ? 3 : 1), `formato ${v} usa clip()`);
  }
});

type Chunky = { chunk(cx: number, cy: number): { props: Scenery[] } };
const propsOf = (cx: number, cy: number): Scenery[] => withDocument(
  { createElement: () => ({ width: 0, height: 0, getContext: () => new Recorder().ctx }) },
  () => (new WorldRenderer(SEED) as unknown as Chunky).chunk(cx, cy).props.filter(p => p.kind === "rock"));

test("o renderizador de mundo põe o estilo e a variação certos em cada pedra", () => {
  // (1, 977): chunk de dunas, no deserto. (-9, 0): oeste, mata. Em cada um há pedras.
  const desert = propsOf(1, 977), west = propsOf(-9, 0);
  assert.ok(desert.length >= 1 && west.length >= 1, `pedras: ${desert.length}/${west.length}`);
  for (const p of desert) assert.equal(p.rockStyle, "sandstone");
  for (const p of west) assert.equal(p.rockStyle, "moss");
  const variants = new Set<number>();
  for (let cx = -3; cx < 12; cx++) for (const p of propsOf(cx, 977)) variants.add(Math.min(5, Math.floor(p.variant * 6)));
  assert.ok(variants.size >= 4, `formatos no deserto: ${[...variants]}`);
  for (const p of desert) {
    const tx = Math.floor((p.x - 16) / 32), ty = Math.floor((p.y - 23) / 32);
    assert.equal(p.variant, rockVariant(tx, ty, SEED));
  }
  assert.ok(CHUNK_TILES === 16);
});

test("o cenário pinta cada estilo e formato num sprite próprio, uma vez só", () => {
  clearSceneryCache();
  let created = 0;
  const ctxs = new Map<unknown, Recorder>();
  const doc = { createElement: () => { created++; const r = new Recorder(); const canvas = { width: 0, height: 0, getContext: () => r.ctx }; ctxs.set(canvas, r); return canvas; } };
  const draw = (style: "moss" | "sandstone" | undefined, variant: number): void =>
    withDocument(doc, () => renderScenery(new Recorder().ctx, { kind: "rock", x: 100, y: 100, variant, ...(style ? { rockStyle: style } : {}) }, 0, 0, 0));
  for (const style of ["moss", "sandstone"] as const) for (let shape = 0; shape < 6; shape++) draw(style, (shape + 0.5) / 6);
  assert.equal(created, 12, "seis formatos em cada um dos dois estilos");
  draw("sandstone", 0.5 / 6); draw("moss", 0.5 / 6); draw(undefined, 0.5 / 6);
  assert.equal(created, 12, "pedir de novo reaproveita o sprite; sem estilo é a pedra de musgo");
  const sigs = [...ctxs.values()].map(r => r.metrics().signature);
  assert.equal(new Set(sigs).size, 12, "doze desenhos diferentes");
  clearSceneryCache();
});

test("o pintor de pedra saiu de scenery.ts e o cenário usa os dois estilos", () => {
  const source = readFileSync("src/render/scenery.ts", "utf8");
  assert.equal(/function paintRock/.test(source), false);
  assert.match(source, /drawSandstoneRock\(c, b\)/);
  assert.match(source, /drawMossRock\(c, b\)/);
  assert.match(source, /`rock-\$\{style\}-\$\{b\}`/, "a chave do sprite leva o estilo");
});

test("cada formato tem o número certo de pedras: uma nos cinco primeiros e três no grupo", () => {
  /** Conta os gradientes lineares de volume e de lado de sombra (dois por pedra). */
  const volumes = (draw: (c: CanvasRenderingContext2D) => void): number => {
    const recorder = new Recorder(); let linear = 0;
    const spy = new Proxy(recorder.ctx, { get(t, p) {
      if (p === "createLinearGradient") return (...a: number[]) => { linear++; return (t as unknown as Record<string, (...x: number[]) => object>).createLinearGradient!(...a); };
      const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (v as (...x: unknown[]) => unknown).bind(t) : v; } });
    draw(spy);
    return linear;
  };
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(v => volumes(c => drawSandstoneRock(c, v)) / 2), [1, 1, 1, 1, 1, 3]);
});
