import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STAFF, STAFF_IDS, STAVES, isStaffId, staffUnlocked } from "../src/engine/character/Staves.ts";
import { APPRENTICE_STAFF } from "../src/engine/character/weapons/staves/apprentice.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { MAGE, MAGE_BASE_MANA, MAGE_FULL_RECHARGE_SECONDS } from "../src/engine/character/classes/index.ts";
import { STAFF_LEAN, staffMount, swordMount } from "../src/render/heroPose.ts";
import { renderHero, type HeroVisual } from "../src/render/actors.ts";
import { drawMageStaff } from "../src/render/staves.ts";
import { paintStaffShaft, STAFF_BASE_Y, STAFF_TOP_Y } from "../src/render/staves/shaft.ts";
import { paintStaffHead } from "../src/render/staves/head.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy, usesTone } from "./helpers/spyContext.ts";

/**
 * Os cajados do Mago (ADR 0068): a ficha do primeiro (Cajado de Aprendiz), o desenho em peças (haste e engaste), onde o cajado fica na
 * mão e o mago segurando-o em todas as direções, sem espada. Os números de combate são propostos e só passam a valer na fatia D.
 */
const v = STAVES.apprentice.visual, keep = (c: string): string => c;
const lum = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
const base: HeroVisual = { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0 };
const DIRS = { frente: { faceX: 0, faceY: 1 }, costas: { faceX: 0, faceY: -1 }, direita: { faceX: 1, faceY: 0 }, esquerda: { faceX: -1, faceY: 0 } } as const;
const mage = (extra: Partial<HeroVisual> = {}): HeroVisual => ({ ...base, heroClass: "mage", ...extra });
const draw = (hero: HeroVisual) => (c: CanvasRenderingContext2D) => renderHero(c, hero, 3, 4, 1.2);

test("o catálogo: o Aprendiz (nível 0, que o mago de qualquer nível usa) e os dez dos lotes 1 a 4", () => {
  assert.deepEqual([...STAFF_IDS], ["apprentice", "breeze", "stone", "tide", "ember", "thorn", "frost", "sun", "moon", "storm", "astral"]); assert.equal(DEFAULT_STAFF, "apprentice"); assert.strictEqual(STAVES.apprentice, APPRENTICE_STAFF);
  assert.equal(isStaffId("apprentice"), true); for (const bad of [undefined, null, 3, "", "Apprentice", "forge", {}]) assert.equal(isStaffId(bad), false, String(bad));
  assert.equal(APPRENTICE_STAFF.name, "Cajado de Aprendiz"); assert.equal(APPRENTICE_STAFF.level, 0);
  for (const level of [0, 1, 5, 100]) assert.equal(staffUnlocked("apprentice", level), true, `nível ${level}`);
  for (const bad of [-1, 0.5, Number.NaN, 1.5]) assert.equal(staffUnlocked("apprentice", bad), bad >= 0 && Number.isInteger(bad), `nível ${bad}`);
});

test("a ficha do Cajado de Aprendiz: os números propostos e a coerência com a mana do Mago e com a espada de treino", () => {
  const s = APPRENTICE_STAFF;
  assert.deepEqual({ damage: s.damage, interval: s.interval, windup: s.windup, manaCost: s.manaCost, range: s.range, element: s.element }, { damage: 8, interval: 1, windup: 0.12, manaCost: 5, range: 6, element: null });
  assert.equal(s.damage, WEAPONS.starter.damage, "o dano é o da espada de treino; o que compensa o alcance é a mana");
  assert.ok(s.interval > WEAPONS.starter.interval, "à distância e mais lento que a espada");
  assert.ok(s.windup < s.interval, "o preparo cabe dentro do intervalo");
  assert.equal(MAGE_BASE_MANA / s.manaCost, 10, "a barra de mana do nível 1 dá dez magias");
  const regen = MAGE.manaPerSecond(1), perSecond = s.manaCost / s.interval;
  assert.ok(perSecond > regen, "disparando sem parar a mana acaba (senão não haveria mana)");
  assert.ok(MAGE_BASE_MANA / (perSecond - regen) >= 15, "mas dá uns 20 s de fogo contínuo antes de ficar sem");
  assert.equal(MAGE_FULL_RECHARGE_SECONDS * regen, MAGE_BASE_MANA);
  for (const n of [s.damage, s.interval, s.windup, s.manaCost, s.range]) assert.ok(Number.isFinite(n) && n > 0);
});

test("a aparência do cajado: carvalho com rampas de três tons, três garras, gema violeta e a fita da Academia", () => {
  assert.equal(v.motif, "oak"); assert.equal(v.prongs, 3);
  for (const [name, ramp] of [["haste", v.shaft], ["gema", v.gem]] as const) assert.ok(lum(ramp.light) > lum(ramp.mid) && lum(ramp.mid) > lum(ramp.dark), `rampa da ${name}`);
  assert.ok(lum(v.ferruleLight) > lum(v.ferrule) && lum(v.collar) > lum(v.collarDark) && lum(v.wrap) > lum(v.wrapDark));
  assert.ok(lum(v.sheen) > 0.85, "o fio de luz é claro");
  assert.equal(v.ribbon, "#5b4fb0", "a fita é o forro violeta do manto do mago"); assert.ok(lum(v.ribbonDark) < lum(v.ribbon));
});

test("o cajado desenhado: determinístico, a gema pulsa e a fita balança com o relógio, e o tom de dano o tinge", () => {
  const staff = (time: number, tone: (c: string) => string = keep) => signature(c => drawMageStaff(c, "apprentice", time, tone));
  assert.equal(staff(1), staff(1)); assert.notEqual(staff(0), staff(1.3), "a gema pulsa e a fita balança com o tempo");
  assert.notEqual(staff(1, c => (c === v.gem.mid ? "#ff0000" : c)), staff(1), "o tom é aplicado às cores");
  const s = spy(c => drawMageStaff(c, "apprentice", 1, keep));
  for (const tone of [v.shaft.light, v.shaft.mid, v.shaft.dark, v.wrap, v.ferrule, v.collar, v.gem.light, v.gem.mid, v.gem.dark, v.ribbon, v.ribbonDark, v.sheen]) assert.equal(usesTone(s, tone), true, `usa ${tone}`);
  assert.ok((s.calls["createRadialGradient"] ?? 0) >= 2, "a auréola de luz e a gema são degradês radiais");
  const r = new Recorder(); drawMageStaff(r.ctx, "apprentice", 1); const m = r.metrics();
  assert.ok(m.height > 55 && m.height < 62, `altura ${m.height}: da ponteira ao topo da gema`); assert.ok(m.width < 22, "esguio");
  assert.equal(STAFF_BASE_Y - STAFF_TOP_Y, 40.6, "a haste tem 40,6 unidades, da ponteira às garras");
});

test("o engaste anima duas coisas separadas: a auréola pulsa (opacidade) e a fita balança (curvas); as garras seguem a ficha", () => {
  const halo = (time: number): string[] => spy(c => paintStaffHead(c, v, keep, time)).raw.filter(c => c.startsWith("rgba(157,134,255,")).sort();
  assert.deepEqual(halo(1), halo(1)); assert.notDeepEqual(halo(0), halo(1.3), "a opacidade da auréola muda com o tempo");
  const curves = (time: number) => spy(c => paintStaffHead(c, v, keep, time)).args["quadraticCurveTo"];
  assert.notDeepEqual(curves(0), curves(1.3), "a fita balança com o tempo");
  assert.notEqual(signature(c => paintStaffHead(c, { ...v, prongs: 2 }, keep, 1)), signature(c => paintStaffHead(c, v, keep, 1)), "o número de garras vem da ficha");
  assert.equal(signature(c => paintStaffHead(c, { ...v, prongs: 1 }, keep, 1)), signature(c => paintStaffHead(c, { ...v, prongs: 2 }, keep, 1)), "são sempre pelo menos duas garras");
});

test("as peças do cajado: a haste não tem gema, o engaste não tem madeira de empunhadura, e juntas são o cajado", () => {
  const shaft = spy(c => paintStaffShaft(c, v, keep)), head = spy(c => paintStaffHead(c, v, keep, 1));
  assert.equal(usesTone(shaft, v.gem.mid), false); assert.equal(usesTone(shaft, v.ribbon), false); assert.equal(usesTone(shaft, v.wrap), true);
  assert.equal(usesTone(head, v.wrap), false); assert.equal(usesTone(head, v.ferrule), false); assert.equal(usesTone(head, v.gem.mid), true); assert.equal(usesTone(head, v.ribbon), true);
  assert.notEqual(signature(c => paintStaffHead(c, v, keep, 0)), signature(c => paintStaffHead(c, v, keep, 1.3)), "só o engaste se anima");
  assert.equal(signature(c => paintStaffShaft(c, v, keep)), signature(c => paintStaffShaft(c, v, keep)), "a haste é parada");
  // a empunhadura de couro, o anel dourado e o brilho da ponteira estão realmente desenhados (não só a cor escolhida)
  const rects = shaft.args["fillRect"] ?? [], lines = shaft.args["moveTo"] ?? [];
  assert.ok(rects.some(r => r[0] === -2.1 && r[1] === -3.6 && r[2] === 4.2 && r[3] === 7.6), "empunhadura de couro enrolado");
  assert.ok(rects.some(r => r[0] === -2.2 && r[1] === STAFF_TOP_Y + 0.4 && r[2] === 4.4), "anel dourado sob as garras");
  assert.ok(lines.some(l => l[0] === -1.6 && l[1] === STAFF_BASE_Y - 2.4), "brilho na ponteira de ferro");
  const whole = new Recorder(), parts = new Recorder();
  drawMageStaff(whole.ctx, "apprentice", 1); paintStaffShaft(parts.ctx, v, keep); paintStaffHead(parts.ctx, v, keep, 1);
  assert.equal(whole.metrics().signature, parts.metrics().signature, "o cajado é a haste mais o engaste, nessa ordem");
});

test("a empunhadura: a mesma mão da espada, o cajado pende para fora, oscila com o passo e fica na altura da cintura", () => {
  for (const [name, dir] of Object.entries(DIRS)) {
    const m = staffMount(dir), sword = swordMount({ ...dir, attackTime: 0 });
    assert.equal(m.hand, sword.hand, `${name}: a mesma mão da espada`); assert.equal(m.gripX, 10.2 * m.hand); assert.equal(m.gripY, -14.6);
    assert.equal(Math.sign(m.rot), m.hand, `${name}: pende para fora do corpo`); assert.equal(Math.abs(m.rot), STAFF_LEAN);
  }
  assert.equal(staffMount({ faceX: -1 }).hand, -1); assert.equal(staffMount({ faceX: 1 }).hand, 1); assert.equal(staffMount({ faceX: -0.2 }).hand, 1, "de frente é a mão direita");
  assert.equal(staffMount({ faceX: 1 }, 0.05).rot, STAFF_LEAN + 0.05, "o passo balança o cajado"); assert.ok(STAFF_LEAN > 0.15 && STAFF_LEAN < 0.3, "o topo sai do chapéu: pende para fora sem deitar");
});

test("o Mago empunha o cajado: as cores dele aparecem nas quatro direções, sem espada, e o cajado equipado vale", () => {
  const blade = WEAPONS.forge.visual.blade.toLowerCase();
  for (const [name, dir] of Object.entries(DIRS)) {
    const s = spy(draw(mage(dir)));
    for (const tone of [v.gem.mid, v.gem.light, v.shaft.mid, v.collar, v.ribbon]) assert.equal(usesTone(s, tone), true, `${name}: o cajado de ${tone}`);
    assert.equal(usesTone(s, blade), false, `${name}: sem espada`);
    assert.equal(signature(draw(mage({ ...dir, equippedStaff: "apprentice" }))), signature(draw(mage(dir))), `${name}: o cajado padrão é o de Aprendiz`);
    assert.notEqual(signature(draw(mage(dir))), signature(draw({ ...base, ...dir })), `${name}: o mago não é o cavaleiro`);
  }
  assert.notEqual(signature(draw(mage({ faceX: 1, faceY: 0 }))), signature(draw(mage({ faceX: -1, faceY: 0 }))), "o cajado muda de mão com o lado");
  const knight = spy(draw({ ...base, equippedWeapon: "forge" }));
  for (const tone of [v.gem.mid, v.shaft.mid, v.ribbon]) assert.equal(usesTone(knight, tone), false, "o Cavaleiro não tem nada do cajado");
});

test("o cajado do herói: a auréola pulsa com o relógio do herói, o passo balança a rotação e o dano o tinge", () => {
  const halo = (time: number): string[] => spy(c => renderHero(c, mage(), 3, 4, time)).raw.filter(c => c.startsWith("rgba(157,134,255,")).sort();
  assert.ok(halo(0.2).length >= 1 && halo(1.7).length >= 1); assert.notDeepEqual(halo(0.2), halo(1.7), "o relógio do herói chega à gema do cajado");
  const rot = (extra: Partial<HeroVisual>): number[] => (spy(draw(mage({ faceX: 1, faceY: 0, ...extra }))).args["rotate"] ?? []).map(a => a[0]!).filter(r => Math.abs(r) > 0.15 && Math.abs(r) < 0.4);
  assert.equal(rot({ walkTime: 0.9, vx: 70, vy: 0 }).length, 1, "a rotação do cajado é a única entre 0,15 e 0,4");
  assert.notDeepEqual(rot({ walkTime: 0.9, vx: 70, vy: 0 }), rot({ walkTime: 2.2, vx: 70, vy: 0 }), "o passo balança o cajado");
  const hurt = spy(draw(mage({ hurtTime: 0.2 })));
  for (const tone of [v.gem.mid, v.shaft.mid, v.ribbon]) assert.equal(usesTone(hurt, tone), false, `o golpe recebido tinge o cajado (${tone})`);
});

test("o cajado se anima com o herói: gema e fita pulsam no relógio, e o passo balança o cajado inteiro", () => {
  assert.notEqual(signature(c => renderHero(c, mage(), 3, 4, 0.2)), signature(c => renderHero(c, mage(), 3, 4, 1.7)), "o relógio faz a gema pulsar");
  assert.notEqual(signature(draw(mage({ walkTime: 0.3 }))), signature(draw(mage({ walkTime: 1.9, vx: 70, vy: 0 }))), "o passo balança o cajado");
  const still = spy(draw(mage())), walk = spy(draw(mage({ walkTime: 0.9, vx: 70, vy: 0, faceX: 1, faceY: 0 })));
  assert.notDeepEqual(still.args["rotate"], walk.args["rotate"], "a rotação do cajado muda com o passo");
});
