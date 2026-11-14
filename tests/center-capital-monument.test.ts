import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPITAL_PROP_ART, paintCapitalMonument } from "../src/render/center/capital/props/index.ts";
import { DAIS, PILLAR, REGION_GEMS } from "../src/render/center/capital/props/monument.ts";
import { GOLD, LIMESTONE, ROYAL } from "../src/render/center/kit/index.ts";
import { CAPITAL, CAPITAL_MONUMENT, CAPITAL_PROPS, capitalBlocks, capitalMonumentBlocks, capitalPoint, capitalWallBlocks } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy, type Spy } from "./helpers/spyContext.ts";

/**
 * Monumento da Concórdia (ADR 0057): o estrado de três degraus, os cinco pilares (um por povo) e o sol dourado no meio, e a
 * colisão que o acompanha: o herói não atravessa o monumento, mas anda em volta dele na praça.
 */
const arcs = (s: Spy): number[][] => s.args.arc ?? [];
const paint = (): Spy => spy(c => paintCapitalMonument(c, 0));
const T = 32;

test("o monumento tem um desenho só: a variação não muda nada e o desenho é estável", () => {
  const sig = signature(c => paintCapitalMonument(c, 0));
  for (const v of [1, 7, -3, Number.NaN]) assert.equal(signature(c => paintCapitalMonument(c, v)), sig, `variação ${v}`);
  assert.equal(signature(c => paintCapitalMonument(c, 0)), sig, "estável");
  assert.equal(CAPITAL_PROP_ART.monument!.variants, 1);
  const r = new Recorder(); paintCapitalMonument(r.ctx, 0); assert.equal(r.metrics().saves, r.metrics().restores, "save e restore em par");
});

test("o estrado tem três degraus de calcário que afinam para cima, cada um com 8 px de altura, e dois anéis incrustados na tampa", () => {
  assert.deepEqual(DAIS.map(d => [d.rx, d.ry, d.h]), [[72, 58, 8], [62, 50, 8], [52, 42, 8]]);
  const s = paint(), ellipses = s.args.ellipse ?? [];
  // cada degrau: a lateral (meia elipse embaixo e em cima) e a tampa inteira, no nível certo
  let base = 0;
  for (const d of DAIS) {
    const top = base - d.h;
    assert.ok(ellipses.some(a => a[0] === 0 && a[1] === base && a[2] === d.rx && a[3] === d.ry && a[6] === Math.PI), `lateral de ${d.rx} na base ${base}`);
    assert.ok(ellipses.some(a => a[0] === 0 && a[1] === top && a[2] === d.rx && a[3] === d.ry && a[6] === Math.PI * 2), `tampa de ${d.rx} em ${top}`);
    base = top;
  }
  const face = DAIS[2], top = base;
  for (const k of [0.84, 0.66]) assert.ok(ellipses.some(a => a[1] === top && Math.abs(a[2]! - face.rx * k) < 1e-9 && Math.abs(a[3]! - face.ry * k) < 1e-9), `anel incrustado ${k}`);
  assert.ok(s.raw.includes(GOLD.base) && s.raw.includes(ROYAL.base), "os anéis são dourado e azul-real, como no piso");
  assert.ok(s.raw.includes(LIMESTONE.light) || s.raw.includes(LIMESTONE.base), "calcário");
});

test("cinco pilares, um por povo, cada um com a sua gema e o pendão na cor da região, e o raio do estrado cobre o anel dos pilares", () => {
  assert.equal(REGION_GEMS.length, 5);
  assert.equal(new Set(REGION_GEMS.map(g => g.base)).size, 5, "cores diferentes");
  assert.equal(REGION_GEMS[0], ROYAL, "o Centro é azul-real");
  assert.ok(PILLAR.ring.rx + 8 < DAIS[2].rx && PILLAR.ring.ry + 4 < DAIS[2].ry, "os pilares ficam sobre a tampa do estrado");
  const s = paint();
  assert.equal(arcs(s).filter(a => a[2] === 5.6).length, 5, "cinco gemas");
  for (const g of REGION_GEMS) for (const tone of [g.light, g.base, g.dark]) assert.ok(s.raw.includes(tone), `gema ${g.base}: ${tone}`);
  // uma gema por pilar, em cima dele (pilar a PILLAR.height px da base) e no anel de 38 × 30 px
  const top = -24, gems = arcs(s).filter(a => a[2] === 5.6);
  const bases = gems.map(a => ({ x: a[0]!, y: a[1]! + PILLAR.height + 9 })).sort((p, q) => p.x - q.x);
  for (const b of bases) assert.ok(Math.abs(((b.x / PILLAR.ring.rx) ** 2 + ((b.y - top) / PILLAR.ring.ry) ** 2) - 1) < 1e-9, `pilar em ${b.x},${b.y} sobre o anel`);
  assert.equal(new Set(bases.map(b => b.x.toFixed(3))).size, 5);
});

test("o sol dourado fica no meio, entre os pilares de trás e os da frente, com brilho em screen, doze raios e o disco", () => {
  const s = paint(), list = arcs(s);
  const glow = list.findIndex(a => a[2] === 46), disc = list.findIndex(a => a[2] === 14);
  assert.ok(glow >= 0 && disc > glow, "brilho antes do disco");
  assert.equal(list.filter(a => a[2] === 46).length, 1); assert.equal(list.filter(a => a[2] === 14).length, 1);
  const before = list.slice(0, glow).filter(a => a[2] === 5.6), after = list.slice(disc + 1).filter(a => a[2] === 5.6);
  assert.equal(before.length, 3, "três pilares atrás do sol"); assert.equal(after.length, 2, "dois pilares na frente");
  assert.ok(Math.max(...before.map(a => a[1]!)) < Math.min(...after.map(a => a[1]!)), "os de trás ficam mais acima na tela");
  // o sol fica no eixo do monumento, em cima do pedestal de 34 px
  assert.equal(list[glow]![0], 0); assert.equal(list[disc]![0], 0);
  assert.equal(list[disc]![1], -24 - 34 - 26);
  assert.equal(s.calls.createRadialGradient, 5 + 2 + 1, "um degradê por gema, o brilho, o disco e a sombra suave do chão");
  assert.ok(s.raw.includes(GOLD.light) && s.raw.includes(GOLD.dark));
  assert.equal(s.calls.closePath, 3 + 12 + 5 + 5 + 1, "formas fechadas: 3 degraus, 12 raios, 5 fustes, 5 pendões e o pedestal");
});

test("tudo o que o monumento pinta cabe no sprite do cadastro (210 × 218 com a origem em 84, 148)", () => {
  const [w, h, ox, oy] = CAPITAL_PROP_ART.monument!.box;
  const s = paint();
  for (const [x, y, r] of arcs(s).filter(a => a[2] !== 96).map(a => [a[0]!, a[1]!, a[2]!] as const)) { // o de 96 é a sombra suave, um círculo que o desenho achata e o sprite recorta
   
    assert.ok(x - r >= -ox && x + r <= w - ox && y - r >= -oy && y + r <= h - oy, `círculo ${x},${y} r${r} fora do sprite`);
  }
  for (const [x, y, rx, ry] of (s.args.ellipse ?? []).map(a => [a[0]!, a[1]!, a[2]!, a[3]!] as const)) {
    assert.ok(x - rx >= -ox && x + rx <= w - ox && y - ry >= -oy && y + ry <= h - oy, `elipse ${x},${y} ${rx}×${ry} fora do sprite`);
  }
  assert.ok(oy > 100 && oy < h, "a origem fica no chão, com muita arte acima dela");
});

test("a planta tem um só monumento, no centro exato da praça, e ele bloqueia em 72 px mais o corpo do herói", () => {
  const m = CAPITAL_PROPS.filter(p => p.kind === "monument");
  assert.equal(m.length, 1); assert.equal(m[0]!.id, "monumento-da-concordia"); assert.equal(m[0]!.variant, 0);
  const c = capitalPoint(0, 0);
  assert.deepEqual([m[0]!.x, m[0]!.y], [c.x, c.y]);
  assert.equal(CAPITAL_MONUMENT.radiusTiles, 2.25);
  const R = CAPITAL_MONUMENT.radiusTiles * T;
  assert.equal(R, 72);
  for (const r of [0, 4, 7, 12]) {
    assert.equal(capitalMonumentBlocks(c.x + R + r - 0.5, c.y, r), true, `r=${r} encosta`);
    assert.equal(capitalMonumentBlocks(c.x + R + r, c.y, r), false, `r=${r} a um pixel do limite: livre`);
    assert.equal(capitalMonumentBlocks(c.x, c.y - R - r + 0.5, r), true); assert.equal(capitalMonumentBlocks(c.x - R - r + 0.5, c.y + 0, r), true);
    assert.equal(capitalMonumentBlocks(c.x + (R + r) * Math.SQRT1_2 + 1, c.y + (R + r) * Math.SQRT1_2 + 1, r), false, "na diagonal também é redondo");
    assert.equal(capitalMonumentBlocks(c.x + (R + r) * Math.SQRT1_2 - 1, c.y + (R + r) * Math.SQRT1_2 - 1, r), true);
  }
  assert.equal(capitalMonumentBlocks(c.x, c.y, 7), true, "no centro");
  assert.equal(capitalMonumentBlocks(0, 0, 7), false, "na vila");
  assert.equal(capitalMonumentBlocks(c.x + 4000, c.y, 7), false, "longe");
  assert.equal(capitalMonumentBlocks(Number.NaN, c.y, 7), true, "número inválido bloqueia, como na muralha"); assert.equal(capitalMonumentBlocks(c.x, Number.POSITIVE_INFINITY, 7), true);
  assert.equal(capitalWallBlocks(c.x, c.y, 7), false, "a muralha não inclui o monumento");
  assert.equal(capitalBlocks(c.x, c.y, 7), true, "o bloqueio da cidade inclui");
});

test("no jogo o herói não atravessa o monumento, mas anda livre em volta dele e entre ele e as ruas", () => {
  const c = capitalPoint(0, 0);
  for (const seed of [42, 842136, 7]) {
    assert.equal(canMoveOnSeed(c.x, c.y, seed), false, "no centro");
    assert.equal(canMoveOnSeed(c.x + 60, c.y, seed), false, "no estrado");
    assert.equal(canMoveOnSeed(c.x + 72 + 7 + 1, c.y, seed), true, "logo fora");
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      assert.equal(canMoveOnSeed(c.x + Math.cos(a) * 90, c.y + Math.sin(a) * 90, seed), true, `anel de 90 px livre (ângulo ${a.toFixed(1)})`);
      assert.equal(canMoveOnSeed(c.x + Math.cos(a) * 60, c.y + Math.sin(a) * 60, seed), false, `anel de 60 px bloqueado (ângulo ${a.toFixed(1)})`);
    }
    // da rua do portão norte ao centro da praça: dá para chegar a 90 px do centro andando em linha reta pelo eixo
    for (let ly = CAPITAL.minY + 1; ly <= -3; ly++) { const p = capitalPoint(0, ly); assert.equal(canMoveOnSeed(p.x, p.y, seed), true, `eixo norte ${ly}`); }
  }
  const src = readFileSync("src/world/collision.ts", "utf8");
  assert.match(src, /capitalWallBlocks\(x, y, radius\) \|\| capitalMonumentBlocks\(x, y, radius\)/);
});
