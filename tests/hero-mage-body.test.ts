import test from "node:test";
import assert from "node:assert/strict";
import { renderHero, type HeroVisual } from "../src/render/actors.ts";
import { MAGE_LOOK, MAGE_PAL } from "../src/render/hero/mage/index.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy, usesTone } from "./helpers/spyContext.ts";

/**
 * O corpo do herói Mago (ADR 0067): a mistura pedida pelo dono (túnica azul-violeta, manto escuro e chapéu pontudo) desenhada pelo mesmo
 * renderHero do Cavaleiro, que continua igual. Aqui: o mago é outro desenho, em todas as direções, determinístico, sem espada nem
 * equipamento de Cavaleiro, e cada peça aparece onde deve (a fivela só de frente, o capuz só de costas).
 */
const base: HeroVisual = { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0 };
const DIRS = { frente: { faceX: 0, faceY: 1 }, costas: { faceX: 0, faceY: -1 }, direita: { faceX: 1, faceY: 0 }, esquerda: { faceX: -1, faceY: 0 } } as const;
const mage = (extra: Partial<HeroVisual> = {}): HeroVisual => ({ ...base, heroClass: "mage", ...extra });
const draw = (v: HeroVisual) => (c: CanvasRenderingContext2D) => renderHero(c, v, 3, 4, 1.2);
const lum = (hex: string): number => { const n = parseInt(hex.slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
const paintOps = (v: HeroVisual): number => { const r = new Recorder(); renderHero(r.ctx, v, 3, 4, 1.2); return r.metrics().paintOps; };
const kit = { head: "trail-helm", shield: "willow-shield", chest: "quilted-vest", feet: "trail-boots", legs: "travel-trousers", backpack: "canvas-pack", neck: "river-pendant" } as const;

test("o Mago é outro desenho em todas as direções, e determinístico; sem classe ou como Cavaleiro, o desenho é o de sempre", () => {
  for (const [name, dir] of Object.entries(DIRS)) {
    const m = signature(draw(mage(dir))), k = signature(draw({ ...base, ...dir }));
    assert.notEqual(m, k, `${name}: o mago não pode ser o cavaleiro`);
    assert.equal(signature(draw(mage(dir))), m, `${name}: determinístico`);
    assert.equal(signature(draw({ ...base, ...dir, heroClass: "knight" })), k, `${name}: "knight" é o desenho do Cavaleiro`);
  }
  assert.equal(new Set(Object.values(DIRS).map(d => signature(draw(mage(d))))).size, 4, "as quatro direções são desenhos diferentes");
  assert.notEqual(signature(draw(mage({ walkTime: 0.9, vx: 70, vy: 0 }))), signature(draw(mage())), "andando muda a barra, o manto e o chapéu");
});

test("as cores do Mago têm rampa de três tons (claro, médio e escuro), cada uma mais clara que a seguinte", () => {
  for (const [name, ramp] of [["túnica", MAGE_PAL.tunic], ["manto", MAGE_PAL.cloak], ["chapéu", MAGE_PAL.hat]] as const) {
    assert.ok(lum(ramp.light) > lum(ramp.mid) && lum(ramp.mid) > lum(ramp.dark), `rampa da ${name}`);
  }
  assert.ok(lum(MAGE_PAL.cloak.dark) < 0.1, "o manto é o tom mais escuro e sombrio");
  assert.ok(lum(MAGE_PAL.tunic.mid) < lum(MAGE_PAL.silver) && lum(MAGE_PAL.gold) > lum(MAGE_PAL.goldD), "prata e ouro claros, ouro de sombra escuro");
  assert.deepEqual({ ...MAGE_LOOK.tunic }, { light: MAGE_PAL.tunic.light, mid: MAGE_PAL.tunic.mid, dark: MAGE_PAL.tunic.dark });
  assert.equal(MAGE_LOOK.sleeve, MAGE_PAL.tunic.mid); assert.equal(MAGE_LOOK.cuff, MAGE_PAL.cuff);
  assert.ok(lum(MAGE_PAL.cuff) < lum(MAGE_PAL.tunic.mid), "o punho é mais escuro que a manga, para a mão não parecer luva");
});

test("o Mago veste as três ideias juntas: túnica azul-violeta, manto escuro com prata e chapéu pontudo com ouro", () => {
  const front = spy(draw(mage()));
  for (const tone of [MAGE_PAL.tunic.mid, MAGE_PAL.tunic.dark, MAGE_PAL.cloak.mid, MAGE_PAL.cloak.dark, MAGE_PAL.hat.mid, MAGE_PAL.hat.light,
    MAGE_PAL.lining, MAGE_PAL.gold, MAGE_PAL.goldD, MAGE_PAL.silver, MAGE_PAL.gem, MAGE_PAL.cuff]) assert.equal(usesTone(front, tone), true, `usa ${tone}`);
  // nada da túnica, da capa, da faixa e da mochila do Cavaleiro
  // (o cinto, a fivela e a bolsa de couro são comuns aos dois heróis de propósito)
  assert.ok(front.raw.filter(c => c.toLowerCase() === MAGE_PAL.cuff).length >= 2, "os dois braços, o livre e o do cajado, têm o punho violeta do Mago");
  for (const knight of ["#4e7681", "#79a3a8", "#2f5d6a", "#16303a", "#8a6c45", "#715c42"]) assert.equal(usesTone(front, knight), false, `não usa ${knight} (do Cavaleiro)`);
});

test("o Mago mostra a barra da túnica com a sombra no pé, e as mesmas duas mãos do Cavaleiro (uma livre e outra na arma), de manga violeta", () => {
  for (const [name, dir] of Object.entries(DIRS)) {
    assert.equal(spy(draw(mage(dir))).raw.includes("rgba(0,0,0,0.3)"), true, `${name}: sombra no pé da barra`);
    assert.equal(spy(draw({ ...base, ...dir })).raw.includes("rgba(0,0,0,0.3)"), false, `${name}: o Cavaleiro não tem essa barra`);
    const hands = (x: ReturnType<typeof spy>): number => (x.args["ellipse"] ?? []).filter(a => a[2] === 2.4 && a[3] === 2.4).length;
    assert.equal(hands(spy(draw(mage(dir)))), hands(spy(draw({ ...base, ...dir }))), `${name}: o Mago tem uma mão livre e a outra no cajado, como o Cavaleiro na espada`);
  }
});

test("cada peça aparece onde deve: a fivela e o fecho com gema só de frente, o capuz caído só de costas, o chapéu em todas", () => {
  const front = spy(draw(mage())), back = spy(draw(mage(DIRS.costas))), side = spy(draw(mage(DIRS.direita)));
  const clasp = (x: ReturnType<typeof spy>): boolean => (x.args["ellipse"] ?? []).some(a => a[0] === 0 && a[1] === -22.6 && a[2] === 0.9);
  const buckle = (x: ReturnType<typeof spy>): boolean => (x.args["fillRect"] ?? []).some(a => a[2] === 1.6 && a[3] === 1.4);
  assert.deepEqual([clasp(front), buckle(front)], [true, true], "o fecho com gema e a fivela do chapéu, de frente");
  assert.deepEqual([clasp(side), buckle(side)], [true, true], "e de lado");
  assert.deepEqual([clasp(back), buckle(back)], [false, false], "de costas não há fecho nem fivela");
  assert.equal(usesTone(back, MAGE_PAL.gem), true, "mas o capuz de costas leva a gema bordada");
  for (const [name, s] of [["frente", front], ["costas", back], ["lado", side]] as const) {
    assert.equal(usesTone(s, MAGE_PAL.hat.mid), true, `chapéu de ${name}`); assert.equal(usesTone(s, MAGE_PAL.cloak.mid), true, `manto de ${name}`);
    assert.equal(usesTone(s, MAGE_PAL.gold), true, `ouro de ${name}`);
  }
  // o capuz caído de costas é a elipse larga sobre os ombros do manto; de frente ela não existe
  const hood = (s: typeof front): boolean => (s.args["ellipse"] ?? []).some(a => a[0] === 0 && a[1] === -25.4 && a[2] === 7.8 && a[3] === 4.3);
  assert.equal(hood(back), true, "de costas o capuz cobre os ombros"); assert.equal(hood(front), false, "de frente o capuz não aparece atrás");
});

test("o Mago não usa a espada: sem lâmina, sem rastro de golpe e sem equipamento de Cavaleiro, mesmo atacando ou equipado (o cajado dele é testado em staves.test.ts)", () => {
  const knight = spy(draw({ ...base, attackWeapon: "forge", equippedWeapon: "forge" }));
  const blade = WEAPONS.forge.visual.blade.toLowerCase();
  assert.equal(usesTone(knight, blade), true, "o Cavaleiro mostra a lâmina da espada (controle do teste)");
  for (const extra of [{}, { attackTime: 0.12, attackWeapon: "forge" as const }, { equippedWeapon: "forge" as const }, { gear: kit }]) {
    const s = spy(draw(mage(extra)));
    assert.equal(usesTone(s, blade), false, `sem lâmina (${JSON.stringify(extra)})`);
    assert.equal(usesTone(s, WEAPONS.forge.trail.first.toLowerCase()), false, "sem rastro de espada");
    for (const gear of ["#d4dfc7", "#819c90", "#91aaa5", "#b4d7cf", "#a5beab"]) assert.equal(usesTone(s, gear), false, `sem equipamento do Cavaleiro (${gear})`);
  }
  // de costas e de lado também não há lâmina, e a arma (equipada ou do golpe) não muda nada no desenho do Mago, nem o rastro do golpe
  for (const [name, dir] of Object.entries(DIRS)) {
    assert.equal(usesTone(spy(draw(mage({ ...dir, equippedWeapon: "forge" }))), blade), false, `sem lâmina de ${name}`);
    // o rastro e a espada somam operações de pintura no golpe do Cavaleiro (controle) e nunca no do Mago
    assert.ok(paintOps({ ...base, ...dir, attackTime: 0.1, attackWeapon: "forge" }) > paintOps({ ...base, ...dir, attackWeapon: "forge" }), `${name}: o Cavaleiro desenha o rastro (controle)`);
    for (const attackTime of [0.05, 0.1, 0.15, 0.2]) assert.equal(paintOps(mage({ ...dir, attackTime, attackWeapon: "forge" })), paintOps(mage({ ...dir, attackWeapon: "forge" })),
      `${name}: o Mago não desenha rastro nem espada no golpe (${attackTime})`);
  }
  assert.equal(signature(draw(mage({ gear: kit }))), signature(draw(mage())), "o equipamento do Cavaleiro não muda o Mago");
  assert.equal(signature(draw(mage({ equippedWeapon: "astral" }))), signature(draw(mage())), "nem a arma equipada");
});

test("o chapéu e o manto acompanham a cabeça e o passo; o dano tinge o Mago como tinge o Cavaleiro", () => {
  assert.notEqual(signature(draw(mage({ hurtTime: 0.2 }))), signature(draw(mage())), "o golpe recebido tinge as peças");
  assert.notEqual(signature(draw(mage({ walkTime: 0.3 }))), signature(draw(mage({ walkTime: 1.9 }))), "a barra da túnica muda com o passo");
  const still = spy(draw(mage({ vx: 0, vy: 0 }))), run = spy(draw(mage({ walkTime: 0.9, vx: 70, vy: 0, faceX: 1, faceY: 0 })));
  assert.notDeepEqual(still.args["quadraticCurveTo"], run.args["quadraticCurveTo"], "o chapéu, o manto e a barra se movem");
});
