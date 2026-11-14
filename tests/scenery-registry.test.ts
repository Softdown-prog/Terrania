import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SCENERY_PAINTERS, mergePainters, regionPainterFor } from "../src/render/props/registry.ts";
import { SOUTH_SCENERY_PAINTERS } from "../src/render/south/sceneryPainters.ts";
import { CENTER_SCENERY_PAINTERS } from "../src/render/center/sceneryPainters.ts";
import { blit, clearSpriteCache, sprite } from "../src/render/props/spriteCache.ts";
import { renderScenery, clearSceneryCache, type Scenery } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Cadastro de cenário por região (ADR 0048): `scenery.ts` desenha os tipos comuns; os tipos de uma região são pintados por
 * um pintor que mora na pasta dela e entra no cadastro. Uma região nova acrescenta uma linha, sem editar `scenery.ts`.
 */
const SOUTH_KINDS = ["south-city", "south-decor", "south-ruin", "south-tower"];
const CENTER_KINDS = ["center-capital"];
const COMMON_KINDS = ["tree", "rock", "arch", "sign", "fire", "house", "regional-landmark"];
const noopPainter = (): void => undefined;

test("o cadastro tem exatamente os tipos do Sul (quatro) e do Centro (um), e os tipos comuns não estão nele", () => {
  assert.deepEqual([...SCENERY_PAINTERS.keys()].sort(), [...CENTER_KINDS, ...SOUTH_KINDS]);
  assert.deepEqual(Object.keys(SOUTH_SCENERY_PAINTERS).sort(), SOUTH_KINDS);
  assert.deepEqual(Object.keys(CENTER_SCENERY_PAINTERS).sort(), CENTER_KINDS);
  for (const kind of [...SOUTH_KINDS, ...CENTER_KINDS]) assert.equal(typeof regionPainterFor(kind), "function", kind);
  for (const kind of COMMON_KINDS) assert.equal(regionPainterFor(kind), undefined, `${kind} é comum`);
  assert.equal(regionPainterFor("nada"), undefined);
  assert.equal(regionPainterFor(""), undefined);
});

test("dois pintores para o mesmo tipo são um erro; regiões diferentes se juntam", () => {
  const merged = mergePainters([{ a: noopPainter }, { b: noopPainter, c: noopPainter }]);
  assert.deepEqual([...merged.keys()], ["a", "b", "c"]);
  assert.throws(() => mergePainters([{ a: noopPainter }, { a: noopPainter }]), /Dois pintores de cenário para o tipo "a"/);
  assert.throws(() => mergePainters([SOUTH_SCENERY_PAINTERS, { "south-ruin": noopPainter }]), /south-ruin/);
  assert.equal(mergePainters([]).size, 0);
});

test("o cache de sprites pinta cada chave uma vez, carimba com a origem do sprite e se limpa", () => {
  clearSpriteCache();
  let created = 0, painted = 0;
  const recorders: Recorder[] = [];
  const doc = { createElement: () => { created++; const r = new Recorder(); recorders.push(r); return { width: 0, height: 0, getContext: () => r.ctx }; } };
  withDocument(doc, () => {
    const a = sprite("k", 40, 30, 20, 25, () => { painted++; });
    const b = sprite("k", 99, 99, 1, 1, () => { painted++; });
    assert.equal(a, b, "a mesma chave devolve o mesmo sprite");
    assert.equal(created, 1);
    assert.equal(painted, 1);
    assert.deepEqual([a!.ox, a!.oy], [20, 25]);
    const target = new Recorder();
    blit(a!, target.ctx);
    assert.equal(target.metrics().paintOps >= 1, true, "carimbou");
    sprite("outra", 10, 10, 5, 5, () => { painted++; });
    assert.equal(created, 2);
    clearSpriteCache();
    sprite("k", 40, 30, 20, 25, () => { painted++; });
    assert.equal(created, 3, "depois de limpar, pinta de novo");
  });
  assert.equal(sprite("sem-documento", 10, 10, 0, 0, () => undefined), null, "sem Canvas (Node) não há sprite");
  clearSpriteCache();
});

/** Grava as chamadas de um método do contexto (os argumentos numéricos de cada uma). */
function spyCalls(method: "translate" | "drawImage", draw: (c: CanvasRenderingContext2D) => void): number[][] {
  const out: number[][] = [], recorder = new Recorder();
  const proxy = new Proxy(recorder.ctx, {
    get(target, prop) {
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof value !== "function") return value;
      return (...a: unknown[]) => { if (prop === method) out.push(a.filter((x): x is number => typeof x === "number")); return (value as (...x: unknown[]) => unknown).apply(target, a); };
    },
    set(target, prop, value) { (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true; },
  });
  draw(proxy);
  return out;
}

test("o carimbo usa a origem do sprite, e a ruína recua o fundo e avança a frente na ordenação", () => {
  clearSpriteCache();
  withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => new Recorder().ctx }) }, () => {
    const s = sprite("origem", 40, 30, 20, 25, () => undefined)!;
    const stamps = spyCalls("drawImage", c => blit(s, c));
    assert.deepEqual(stamps.map(a => a.slice(0, 2)), [[-20, -25]], "a origem do sprite fica na origem do contexto");
  });
  const ruinTranslates = (layer: "back" | "front"): number[][] => {
    clearSceneryCache();
    return withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => new Recorder().ctx }) },
      () => spyCalls("translate", c => renderScenery(c, { kind: "south-ruin", ruinLayer: layer, variant: 2, x: 0, y: 0 }, 5, 7, 0)));
  };
  assert.deepEqual(ruinTranslates("back"), [[5, 7], [0, 30]], "o fundo é empurrado 30 px para trás");
  assert.deepEqual(ruinTranslates("front"), [[5, 7], [0, -6]], "a frente é puxada 6 px para a frente");
  clearSpriteCache();
});

test("cada pintor regional desenha o seu tipo e nunca cai na fogueira quando falta o campo do tipo", () => {
  const draw = (prop: Scenery): { calls: number; created: number } => {
    clearSceneryCache();
    let created = 0;
    const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
    const target = new Recorder();
    withDocument(doc, () => renderScenery(target.ctx, prop, 0, 0, 0.3));
    return { calls: target.metrics().paintOps, created };
  };
  const ruin = draw({ kind: "south-ruin", ruinLayer: "back", variant: 1, x: 10, y: 10 });
  assert.equal(ruin.created, 1, "uma ruína: um sprite");
  assert.ok(ruin.calls >= 1);
  assert.equal(draw({ kind: "south-tower", towerId: "miragem", variant: 0, x: 0, y: 0 }).created, 1);
  assert.equal(draw({ kind: "south-decor", decorKind: "cactus", variant: 0.3, x: 0, y: 0 }).created, 1);
  assert.equal(draw({ kind: "south-city", cityKind: "building", variant: 0, x: 0, y: 0 }).created, 1);
  assert.equal(draw({ kind: "center-capital", capitalKind: "gate", variant: 0, x: 0, y: 0 }).created, 1, "a muralha da capital: um sprite");
  for (const kind of [...SOUTH_KINDS, ...CENTER_KINDS]) {
    const missing = draw({ kind, variant: 0.5, x: 3, y: 4 } as Scenery);
    assert.deepEqual(missing, { calls: 0, created: 0 }, `${kind} sem o campo do tipo não desenha nada (e a fogueira antiga não aparece)`);
  }
  assert.ok(draw({ kind: "fire", variant: 0, x: 0, y: 0 }).calls >= 10, "a fogueira comum continua sendo desenhada pelo scenery.ts");
});

test("os tipos comuns continuam no scenery.ts e os regionais saíram dele", () => {
  const source = readFileSync("src/render/scenery.ts", "utf8");
  for (const kind of COMMON_KINDS.filter(k => k !== "fire")) assert.match(source, new RegExp(`prop\\.kind === "${kind}"`), kind);
  for (const kind of [...SOUTH_KINDS, ...CENTER_KINDS]) assert.equal(source.includes(`prop.kind === "${kind}"`), false, `${kind} saiu do scenery.ts`);
  assert.equal(/(south\/(ruins|towers|city|decor)|center\/capital)\//.test(source), false, "scenery.ts não importa as peças de região cadastradas");
  assert.match(source, /regionPainterFor\(prop\.kind\)/);
  assert.match(source, /regional\(\{ ctx, prop, time, flip \}\)/);
  assert.ok(source.split("\n").length < 400, "scenery.ts encolheu: " + source.split("\n").length + " linhas");
});

test("o cadastro só conhece regiões: ele importa apenas dos pintores de região e cada pintor mora na pasta da sua peça", () => {
  const registry = readFileSync("src/render/props/registry.ts", "utf8");
  assert.deepEqual([...registry.matchAll(/from "(\.[^"]+)"/g)].map(m => m[1]).sort(), ["../center/sceneryPainters.ts", "../south/sceneryPainters.ts", "./types.ts"]);
  const south = readFileSync("src/render/south/sceneryPainters.ts", "utf8");
  assert.deepEqual([...south.matchAll(/from "\.\/(\w+)\/sceneryPainter\.ts"/g)].map(m => m[1]).sort(), ["city", "decor", "ruins", "towers"]);
  const center = readFileSync("src/render/center/sceneryPainters.ts", "utf8");
  assert.deepEqual([...center.matchAll(/from "\.\/(\w+)\/sceneryPainter\.ts"/g)].map(m => m[1]).sort(), ["capital"]);
  assert.match(registry, /const REGION_PAINTERS: readonly RegionPainters\[\] = \[SOUTH_SCENERY_PAINTERS, CENTER_SCENERY_PAINTERS\];/);
});
