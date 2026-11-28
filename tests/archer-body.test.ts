import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderHero } from "../src/render/actors.ts";
import { ARCHER_BODY, ARCHER_LOOK, ARCHER_PAL, ARCHER_WEAR, archerWear } from "../src/render/hero/archer/index.ts";
import { drawArcherHead } from "../src/render/hero/archer/head.ts";
import { hairBack } from "../src/render/hero/archer/body/hairBack.ts";
import { hairFront } from "../src/render/hero/archer/body/hairFront.ts";
import { drawArcherQuiver } from "../src/render/hero/archer/quiver.ts";
import { drawArcherTorso } from "../src/render/hero/archer/torso.ts";
import type { HeroDrawContext } from "../src/render/hero/context.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/** O corpo do Arqueiro (ADR 0114, lote A2a): rosto anguloso, cabelo curto com faixa, gibão de couro e aljava às costas. Só apresentação; o arco na mão vem no A2b. */
const POSE = { faceX: 0, faceY: 1, walkTime: 0, attackTime: 0, attackWeapon: "starter", equippedWeapon: "starter", vx: 0, vy: 0, id: "arq", heroClass: "archer" };
const ctxOf = (extra: Partial<HeroDrawContext> = {}): HeroDrawContext => ({ tone: c => c, wf: 1, side: 0, back: false, faceX: 0, faceY: 1, mvx: 0, mvy: 1, trailX: 0, trailY: 0,
  walkTime: 0, moving: 0, liftA: 0, liftB: 0, headX: 0, headY: -31.5, tailSway: 0, time: 0, closed: 0, fierce: 0, shout: false, hurting: false, ...extra });
const hero = (extra: Record<string, unknown> = {}): string => signature(c => renderHero(c, { ...POSE, ...extra } as never, 3, 4, 1.2));
const usesColor = (s: ReturnType<typeof spy>, hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return s.raw.some(c => c.toLowerCase() === hex || c.replace(/\s/g, "").startsWith(`rgba(${r},${g},${b},`));
};

test("a aparência do Arqueiro: gibão verde-musgo, braçais, cabeça própria, aljava no lugar do manto, sem barra de túnica nem capuz", () => {
  assert.deepEqual(ARCHER_LOOK.tunic, ARCHER_PAL.jerkin); assert.equal(ARCHER_LOOK.sleeve, ARCHER_PAL.sleeve); assert.equal(ARCHER_LOOK.cuff, ARCHER_PAL.bracer);
  assert.strictEqual(ARCHER_LOOK.head, drawArcherHead); assert.strictEqual(ARCHER_LOOK.cloak, drawArcherQuiver); assert.strictEqual(ARCHER_LOOK.torso, drawArcherTorso);
  const quiet = spy(c => { ARCHER_LOOK.robe(c, ctxOf()); ARCHER_LOOK.hat(c, ctxOf()); });
  assert.deepEqual(quiet.calls, {}, "sem barra de túnica e sem capuz não se pinta nada");
  assert.equal(ARCHER_BODY.band, "#a8482a");
});

test("o que o Arqueiro veste: a mesma aparência para qualquer equipamento, sem peças de Mago", () => {
  for (const gear of [undefined, {}, { head: "mage-hat-apprentice" } as never]) assert.strictEqual(archerWear(gear), ARCHER_WEAR);
  assert.deepEqual([ARCHER_WEAR.legwear, ARCHER_WEAR.book, ARCHER_WEAR.ring, ARCHER_WEAR.pendant], [{ pants: null, boots: null, bootsLight: null }, null, null, null]);
  assert.strictEqual(ARCHER_WEAR.look, ARCHER_LOOK);
});

test("a cabeça: faixa vermelha, cabelo castanho-avermelhado e olhos verdes; de frente, de lado e de costas são desenhos diferentes", () => {
  const front = spy(c => drawArcherHead(c, ctxOf())), side = spy(c => drawArcherHead(c, ctxOf({ side: 1, faceX: 1, faceY: 0 }))), back = spy(c => drawArcherHead(c, ctxOf({ back: true, faceY: -1 })));
  for (const tone of [ARCHER_BODY.band, ARCHER_BODY.hair.mid, ARCHER_BODY.hair.dark]) assert.ok(usesColor(front, tone) && usesColor(back, tone), tone);
  assert.ok(usesColor(front, ARCHER_BODY.iris) && usesColor(front, ARCHER_BODY.skin.mid), "o rosto aparece de frente");
  assert.equal(usesColor(back, ARCHER_BODY.iris), false, "de costas não há rosto");
  assert.equal(new Set([signature(c => drawArcherHead(c, ctxOf())), signature(c => drawArcherHead(c, ctxOf({ side: 1, faceX: 1, faceY: 0 }))), signature(c => drawArcherHead(c, ctxOf({ back: true, faceY: -1 })))]).size, 3);
  assert.equal(front.calls.createLinearGradient, 1, "o cabelo de trás (com o rabinho) é pintado antes da cabeça");
  assert.ok(side.calls.ellipse! < front.calls.ellipse!, "de lado só um olho (e um lado do rosto) aparece");
});

test("o cabelo: o de trás tem o rabinho preso que balança, o da frente tem a franja, a faixa e o nó; de costas as peças mudam", () => {
  const behind = (extra: Partial<HeroDrawContext> = {}): string => signature(c => hairBack(ctxOf(extra), c)), ahead = (extra: Partial<HeroDrawContext> = {}): string => signature(c => hairFront(ctxOf(extra), c));
  assert.notEqual(behind({ tailSway: 2 }), behind(), "o rabinho balança"); assert.notEqual(ahead({ tailSway: 2 }), ahead(), "a ponta do nó também");
  assert.notEqual(behind({ back: true }), behind()); assert.notEqual(ahead({ back: true }), ahead());
  assert.notEqual(behind({ side: 1 }), behind(), "de lado o rabinho vai para trás da cabeça");
  const bandBack = spy(c => hairFront(ctxOf({ back: true }), c)); assert.ok(usesColor(bandBack, ARCHER_BODY.band) && usesColor(bandBack, ARCHER_PAL.feather), "de costas a faixa e a pena aparecem");
});

test("o rosto reage: pisca, franze e grita como os dos outros heróis", () => {
  const base = signature(c => drawArcherHead(c, ctxOf()));
  for (const extra of [{ closed: 1 }, { fierce: 0.8 }, { shout: true }, { shout: true, hurting: true }, { faceX: 1 }, { faceY: 0 }]) assert.notEqual(signature(c => drawArcherHead(c, ctxOf(extra))), base, JSON.stringify(extra));
  assert.notEqual(signature(c => drawArcherHead(c, ctxOf({ tailSway: 2 }))), base, "o rabinho preso balança com o passo");
});

test("a aljava: de frente só a boca com as penas aparece acima do ombro; de costas ela inteira cruza as costas; balança com o passo", () => {
  const front = spy(c => drawArcherQuiver(c, ctxOf())), back = spy(c => drawArcherQuiver(c, ctxOf({ back: true })));
  for (const tone of [ARCHER_PAL.leather.mid, ARCHER_PAL.feather, ARCHER_PAL.shaft]) assert.ok(usesColor(front, tone), tone);
  assert.notEqual(signature(c => drawArcherQuiver(c, ctxOf())), signature(c => drawArcherQuiver(c, ctxOf({ back: true }))), "de costas tem a segunda argola");
  assert.notEqual(signature(c => drawArcherQuiver(c, ctxOf({ moving: 1, walkTime: 1 }))), signature(c => drawArcherQuiver(c, ctxOf())), "balança andando");
  assert.ok(back.calls.ellipse! > front.calls.ellipse!);
  const wide = signature(c => drawArcherQuiver(c, ctxOf({ wf: 0.8 }))); assert.notEqual(wide, signature(c => drawArcherQuiver(c, ctxOf())), "acompanha a largura do corpo de perfil");
});

test("o tronco: cordões da gola, correia da aljava e cinto com a fivela; de costas, a costura da coluna e o remendo", () => {
  const front = spy(c => drawArcherTorso(c, ctxOf())), back = spy(c => drawArcherTorso(c, ctxOf({ back: true })));
  for (const tone of [ARCHER_PAL.strap, ARCHER_PAL.buckle, ARCHER_PAL.lace]) assert.ok(usesColor(front, tone), tone);
  assert.ok(usesColor(front, ARCHER_PAL.leather.mid), "a bolsinha de couro no quadril, só de frente");
  assert.notEqual(signature(c => drawArcherTorso(c, ctxOf())), signature(c => drawArcherTorso(c, ctxOf({ back: true }))));
  assert.ok(front.calls.fill! > back.calls.fill!, "a gola em V e a bolsinha só de frente");
  assert.ok(front.calls.createLinearGradient! >= 2 && back.calls.createLinearGradient! >= 2, "correia e cinto têm degradê");
});

test("o herói Arqueiro inteiro: é outro desenho que o do Cavaleiro e o do Mago, usa as cores dele, e não segura espada nem cajado (segura o arco)", () => {
  const archer = hero(), knight = hero({ heroClass: undefined }), mage = hero({ heroClass: "mage" });
  assert.equal(new Set([archer, knight, mage]).size, 3);
  const s = spy(c => renderHero(c, { ...POSE } as never, 3, 4, 1.2));
  for (const tone of [ARCHER_PAL.jerkin.mid, ARCHER_BODY.band, ARCHER_PAL.leather.mid]) assert.ok(usesColor(s, tone), tone);
  assert.equal(hero({ equippedWeapon: "forge", attackWeapon: "forge" }), archer, "a espada equipada não aparece na mão dele");
  assert.equal(hero({ equippedStaff: "storm" }), archer, "nem o cajado");
  assert.equal(hero({ attackBow: null, attackTime: 0 }), archer, "parado, o arco de repouso é sempre o mesmo");
  assert.equal(new Set([[0, 1], [1, 0], [0, -1], [-1, 0]].map(([fx, fy]) => hero({ faceX: fx!, faceY: fy! }))).size, 4, "as quatro direções são diferentes");
  assert.notEqual(hero({ hurtTime: 0.2 }), archer, "o dano pisca como nos outros"); assert.notEqual(hero({ walkTime: 1, vx: 60 }), archer, "o andar muda o desenho");
  assert.doesNotThrow(() => hero({ attackTime: 0.2, attackBow: "hunting" }));
});

test("a fiação: o desenho do herói usa a aparência do Arqueiro e, com ela, o arco na mão (ADR 0116)", () => {
  const actors = readFileSync("src/render/actors.ts", "utf8");
  assert.match(actors, /import \{ archerWear \} from "\.\/hero\/archer\/index\.ts";/);
  assert.match(actors, /const wear = player\.heroClass === "mage" \? mageWear\(player\.gear\) : player\.heroClass === "archer" \? archerWear\(player\.gear\) : null;/);
  assert.match(actors, /const bowman = player\.heroClass === "archer";/);
  assert.match(actors, /const bow = bowman \? bowMount\(player, staffSway, cast\) : null;/);
});
