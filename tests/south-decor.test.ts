import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DECOR_PAINTERS, decorShape, southDecorProp } from "../src/render/south/decor/index.ts";
import type { DecorKind } from "../src/world/south/decor/index.ts";
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
  assert.deepEqual(files, ["bones", "cactus", "crackedEarth", "desertShrub", "dryGrass", "index", "painters", "palette", "prop", "sceneryPainter"], "o desenho e o pintor de cenário; a colocação e a colisão ficam no mundo");
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
  const scenery = readFileSync("src/render/south/decor/sceneryPainter.ts", "utf8");
  assert.match(scenery, /DECOR_PAINTERS\[kind\]\(c, shape\)/);
  assert.match(scenery, /`south-decor-\$\{kind\}-\$\{shape\}`/);
  assert.match(readFileSync("src/render/WorldRenderer.ts", "utf8"), /southDecorProp\(tx, ty, this\.seed\)/);
});
