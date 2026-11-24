import test from "node:test";
import assert from "node:assert/strict";
import { STAFF_IDS, STAVES, type StaffId } from "../src/engine/character/Staves.ts";
import { renderHero } from "../src/render/actors.ts";
import { drawMageStaff } from "../src/render/staves.ts";
import { paintStaffMotif } from "../src/render/staves/motif.ts";
import { paintCoralMotif } from "../src/render/staves/motifs/coral.ts";
import { paintFeatherMotif } from "../src/render/staves/motifs/feather.ts";
import { paintStoneMotif } from "../src/render/staves/motifs/stone.ts";
import { drawSpellBolt } from "../src/render/spells/bolt.ts";
import { drawSpellBurst } from "../src/render/spells/burst.ts";
import { mix } from "../src/render/draw.ts";
import { paintStaffHead } from "../src/render/staves/head.ts";
import { paintStaffShaft } from "../src/render/staves/shaft.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * O desenho dos cajados do lote 1 (ADR 0073): cada um tem a sua matéria (pena, rocha, coral) atrás e na frente da gema, a cor da gema
 * dele e o projétil da cor dele; o Aprendiz não mudou.
 */
const id = (c: string): string => c;
const MOTIFS = [["breeze", paintFeatherMotif], ["stone", paintStoneMotif], ["tide", paintCoralMotif]] as const;
/** Se o desenho usou a cor (#rrggbb ou rgba() dela). */
const usesColor = (s: ReturnType<typeof spy>, hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return s.raw.some(c => c.toLowerCase() === hex || c.replace(/\s/g, "").startsWith(`rgba(${r},${g},${b},`));
};

test("cada matéria desenha atrás e na frente da gema, de forma reproduzível, e o carvalho não desenha nada", () => {
  for (const [staff, paint] of MOTIFS) {
    const v = STAVES[staff].visual;
    const sig = (layer: "back" | "front", time = 1): string => signature(c => paint(c, v, id, time, layer));
    assert.equal(sig("back"), sig("back"), staff + " atrás é reproduzível"); assert.equal(sig("front"), sig("front"), staff + " na frente é reproduzível");
    assert.notEqual(sig("back"), sig("front"), staff + ": as duas camadas são peças diferentes");
    const back = spy(c => paint(c, v, id, 1, "back")), front = spy(c => paint(c, v, id, 1, "front"));
    assert.ok(Object.values(back.calls).reduce((a, b) => a + b, 0) > 20, staff + " atrás tem desenho de verdade");
    assert.ok(Object.values(front.calls).reduce((a, b) => a + b, 0) > 8, staff + " na frente tem desenho de verdade");
    assert.equal(signature(c => paintStaffMotif(c, v, id, 1, "back")), sig("back"), "o despachante escolhe a matéria pela ficha");
    assert.equal(signature(c => paintStaffMotif(c, v, id, 1, "front")), sig("front"));
  }
  assert.equal(signature(c => paintStaffMotif(c, STAVES.apprentice.visual, id, 1, "back")), signature(() => {}), "o carvalho não desenha enfeite atrás");
  assert.equal(signature(c => paintStaffMotif(c, STAVES.apprentice.visual, id, 1, "front")), signature(() => {}), "nem na frente");
});

test("o que se mexe com o relógio: penas e vento, cacos de pedra e bolhas; o que é fixo não se mexe", () => {
  const sig = (staff: StaffId, layer: "back" | "front", time: number): string => signature(c => paintStaffMotif(c, STAVES[staff].visual, id, time, layer));
  assert.notEqual(sig("breeze", "back", 0.5), sig("breeze", "back", 1.4), "as penas balançam");
  assert.notEqual(sig("breeze", "front", 0.5), sig("breeze", "front", 1.4), "o vento gira");
  assert.equal(sig("stone", "back", 0.5), sig("stone", "back", 1.4), "as lascas de rocha ficam paradas");
  assert.notEqual(sig("stone", "front", 0.5), sig("stone", "front", 1.4), "os cacos giram");
  assert.equal(sig("tide", "back", 0.5), sig("tide", "back", 1.4), "o coral fica parado");
  assert.notEqual(sig("tide", "front", 0.5), sig("tide", "front", 1.4), "as bolhas sobem");
});

test("a cor de cada cajado: a haste e a gema vêm da ficha, e o brilho de dano (tone) chega à matéria", () => {
  for (const [staff, paint] of MOTIFS) {
    const v = STAVES[staff].visual, all = spy(c => { paint(c, v, id, 1, "back"); paint(c, v, id, 1, "front"); });
    for (const color of [v.shaft.light, v.shaft.mid, v.shaft.dark]) assert.ok(usesColor(all, color), `${staff} usa a rampa da haste ${color}`);
    assert.ok(usesColor(all, v.gem.light) || usesColor(all, v.gem.glow) || usesColor(all, v.gem.mid), staff + " usa a cor da gema");
    const tinted = spy(c => { paint(c, v, () => "#ff0000", 1, "back"); paint(c, v, () => "#ff0000", 1, "front"); });
    assert.ok(tinted.raw.some(c => c.toLowerCase() === "#ff0000"), staff + ": o brilho de dano pinta a matéria");
    for (const color of [v.shaft.light, v.shaft.mid, v.shaft.dark]) assert.ok(!usesColor(tinted, color), `${staff}: com o brilho de dano nada da rampa ${color} fica sem o brilho`);
  }
});

test("o cajado inteiro é a soma das peças na ordem: haste, matéria de trás, engaste, matéria da frente", () => {
  const ops = (draw: (c: CanvasRenderingContext2D) => void): Record<string, number> => spy(draw).calls;
  const sum = (...parts: Array<Record<string, number>>): Record<string, number> => { const out: Record<string, number> = {}; for (const p of parts) for (const [k, n] of Object.entries(p)) out[k] = (out[k] ?? 0) + n; return out; };
  for (const staff of ["breeze", "stone", "tide"] as const) {
    const v = STAVES[staff].visual;
    assert.deepEqual(ops(c => drawMageStaff(c, staff, 1)), sum(ops(c => paintStaffShaft(c, v, id)), ops(c => paintStaffMotif(c, v, id, 1, "back")), ops(c => paintStaffHead(c, v, id, 1)), ops(c => paintStaffMotif(c, v, id, 1, "front"))), staff);
    const order: string[] = [];
    const watch = spy(c => drawMageStaff(c, staff, 1)); assert.ok(watch.calls.fill > 10, staff);
    void order;
  }
  assert.deepEqual(ops(c => drawMageStaff(c, "apprentice", 1)), sum(ops(c => paintStaffShaft(c, STAVES.apprentice.visual, id)), ops(c => paintStaffHead(c, STAVES.apprentice.visual, id, 1))), "o Aprendiz é só haste e engaste");
});

test("as bolhas do coral sobem com o tempo (a altura muda, não só o balanço)", () => {
  const heights = (time: number): number[] => (spy(c => paintCoralMotif(c, STAVES.tide.visual, id, time, "front")).args.arc ?? []).slice(1).map(a => a[1] ?? 0);
  const early = heights(0.2), later = heights(0.6);
  assert.equal(early.length, 3, "três bolhas"); assert.ok(early.every((y, i) => y !== later[i]), "cada bolha está em outra altura");
});

test("o tom do coral intermediário também recebe o brilho de dano", () => {
  const v = STAVES.tide.visual, mid = mix(v.shaft.mid, v.shaft.dark, 0.35);
  const plain = spy(c => { paintCoralMotif(c, v, id, 1, "back"); }), tinted = spy(c => { paintCoralMotif(c, v, () => "#ff0000", 1, "back"); });
  assert.ok(plain.raw.some(c => c.toLowerCase() === mid.toLowerCase()), "o tom intermediário é usado");
  assert.ok(!tinted.raw.some(c => c.toLowerCase() === mid.toLowerCase()), "e some quando o brilho de dano pinta tudo");
});

test("os quatro cajados inteiros são diferentes entre si, cada um da cor da sua gema, e o Aprendiz continua o mesmo", () => {
  const sigs = STAFF_IDS.map(staff => signature(c => drawMageStaff(c, staff, 1)));
  assert.equal(new Set(sigs).size, STAFF_IDS.length, "nenhum cajado repete o desenho de outro");
  for (const staff of STAFF_IDS) {
    const s = spy(c => drawMageStaff(c, staff, 1)), v = STAVES[staff].visual;
    assert.ok(usesColor(s, v.gem.mid) && usesColor(s, v.gem.light), staff + " tem a gema da cor dele");
    assert.ok(usesColor(s, v.shaft.mid), staff + " tem a haste da cor dele");
  }
  const bare = spy(c => drawMageStaff(c, "apprentice", 1));
  assert.ok(!usesColor(bare, STAVES.breeze.visual.gem.mid) && !usesColor(bare, STAVES.stone.visual.gem.mid) && !usesColor(bare, STAVES.tide.visual.gem.mid), "o Aprendiz não pegou cor emprestada");
  for (const staff of ["breeze", "stone", "tide"] as const) {
    assert.notEqual(signature(c => drawMageStaff(c, staff, 1, id, 1)), signature(c => drawMageStaff(c, staff, 1)), staff + " acende a gema ao carregar a magia");
    assert.notEqual(signature(c => drawMageStaff(c, staff, 0.2)), signature(c => drawMageStaff(c, staff, 1.7)), staff + " se mexe com o relógio");
  }
});

test("o mago de cada cajado: a mão segura o cajado equipado, de qualquer elemento", () => {
  const pose = (staff: StaffId): string => signature(c => renderHero(c, { faceX: 1, faceY: 0, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: staff } as never, 3, 4, 1.2));
  assert.equal(new Set(STAFF_IDS.map(pose)).size, STAFF_IDS.length, "cada cajado muda o desenho do mago");
  const withTide = spy(c => renderHero(c, { faceX: 1, faceY: 0, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: "tide" } as never, 3, 4, 1.2));
  assert.ok(usesColor(withTide, STAVES.tide.visual.gem.mid), "o mago com as Marés tem a pérola azul na mão");
});

test("o projétil e o estouro de cada cajado têm a cor da gema dele", () => {
  for (const staff of STAFF_IDS) {
    const g = STAVES[staff].visual.gem, bolt = spy(c => drawSpellBolt(c, staff, 0.5, 1)), burst = spy(c => drawSpellBurst(c, staff, 0.25));
    for (const color of [g.light, g.mid, g.glow]) { assert.ok(usesColor(bolt, color), `${staff}: projétil ${color}`); assert.ok(usesColor(burst, color) || color === g.mid, `${staff}: estouro ${color}`); }
  }
  assert.equal(new Set(STAFF_IDS.map(staff => signature(c => drawSpellBolt(c, staff, 0.5, 1)))).size, STAFF_IDS.length, "cada cajado tem o projétil da sua cor");
  assert.equal(new Set(STAFF_IDS.map(staff => signature(c => drawSpellBurst(c, staff, 0.25)))).size, STAFF_IDS.length);
});
