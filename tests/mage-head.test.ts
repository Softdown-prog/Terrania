import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderHero } from "../src/render/actors.ts";
import { drawMageHead } from "../src/render/hero/mage/head.ts";
import { hairFront } from "../src/render/hero/mage/body/hairFront.ts";
import { MAGE_BODY } from "../src/render/hero/mage/body/palette.ts";
import { mageWear } from "../src/render/hero/mage/index.ts";
import type { HeroDrawContext } from "../src/render/hero/context.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * O personagem do Mago, lote M1 (docs/MAGO_APARENCIA.md): cabeça e rosto próprios e cabelo solto, no lugar do rosto, do cabelo e do rabo de cavalo do
 * Cavaleiro. O Cavaleiro não muda em nada.
 */
const read = (path: string): string => readFileSync(path, "utf8");
const KNIGHT_HAIR = "#4a382b", KNIGHT_EYE = "#1f3535", KNIGHT_BAND = "#8a6c45";
const hero = (extra: Record<string, unknown> = {}) => (c: CanvasRenderingContext2D) => renderHero(c, { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: "apprentice", ...extra } as never, 3, 4, 1.2);
const knight = (extra: Record<string, unknown> = {}) => (c: CanvasRenderingContext2D) => renderHero(c, { faceX: 0, faceY: 1, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "k", ...extra } as never, 3, 4, 1.2);
const has = (draw: (c: CanvasRenderingContext2D) => void, hex: string): boolean => spy(draw).raw.some(c => c.toLowerCase() === hex.toLowerCase());
const count = (draw: (c: CanvasRenderingContext2D) => void, hex: string): number => spy(draw).raw.filter(c => c.toLowerCase() === hex.toLowerCase()).length;
const ctxOf = (extra: Partial<HeroDrawContext> = {}): HeroDrawContext => ({ tone: c => c, wf: 1, side: 0, back: false, faceX: 0, faceY: 1, mvx: 0, mvy: 1, trailX: 0, trailY: 0, walkTime: 0.3, moving: 0, liftA: 0, liftB: 0,
  headX: 0, headY: -31.5, tailSway: 0, time: 1, closed: 0, fierce: 0, shout: false, hurting: false, ...extra });

test("o Mago tem a cabeça dele (a do Cavaleiro sai de cena): sem rabo de cavalo, sem faixa, sem os olhos nem o cabelo castanho-quente do Cavaleiro", () => {
  for (const [what, face] of [["de frente", { faceX: 0, faceY: 1 }], ["de lado", { faceX: 1, faceY: 0 }], ["de costas", { faceX: 0, faceY: -1 }]] as const) {
    for (const hex of [KNIGHT_HAIR, KNIGHT_EYE, KNIGHT_BAND]) assert.equal(has(hero(face), hex), false, `${what}: o Mago não tem a cor ${hex} do Cavaleiro`);
    assert.equal(has(knight(face), KNIGHT_HAIR), true, `${what}: e o Cavaleiro tem`);
  }
  assert.ok(mageWear(undefined).look.head, "a aparência do Mago traz a cabeça"); assert.ok(mageWear({}).look.head, "mesmo sem roupa nenhuma, o Mago tem a cabeça dele");
  assert.equal(mageWear({ head: "apprentice-hat" }).look.head, drawMageHead);
  assert.equal(has(hero(), MAGE_BODY.hair.mid), true); assert.equal(has(hero(), MAGE_BODY.iris), true); assert.equal(has(hero({ gear: {} }), MAGE_BODY.iris), true, "sem o chapéu a cabeça aparece inteira");
  assert.notEqual(MAGE_BODY.hair.mid, KNIGHT_HAIR); assert.deepEqual({ ...MAGE_BODY.skin }, { light: "#f3d6b2", mid: "#e2bb91", dark: "#b98a64" }, "a pele é a mesma do Cavaleiro");
});

test("o Cavaleiro não mudou: 40 poses (andando, golpeando, ferido, de cada lado, com e sem armadura) dão o mesmo desenho de antes", () => {
  const gears = [undefined, { head: "trail-helm", chest: "quilted-vest", shield: "willow-shield", feet: "trail-boots", legs: "travel-trousers", backpack: "canvas-pack", neck: "river-pendant", ring: "copper-ring" }];
  const out: string[] = [];
  for (const gear of gears) for (const [fx, fy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [0.7, 0.7]] as const) for (const attackTime of [0, 0.1]) for (const hurtTime of [0, 0.2])
    out.push(signature(c => renderHero(c, { faceX: fx, faceY: fy, walkTime: 0.7, attackTime, hurtTime, vx: 40, vy: 10, id: "k-golden", gear } as never, 3, 4, 1.3)));
  assert.equal(createHash("md5").update(out.join(",") + "\n").digest("hex"), "b78ca280c9f0d9c73f350c1d1558078a", "o resumo do desenho do Cavaleiro é o do commit anterior ao M1");
});

test("os olhos seguem a direção: dois de frente, um de lado, nenhum de costas; o rosto só aparece de frente e de lado", () => {
  assert.equal(count(hero({ faceX: 0, faceY: 1 }), MAGE_BODY.iris), 2); assert.equal(count(hero({ faceX: 1, faceY: 0 }), MAGE_BODY.iris), 1);
  assert.equal(count(hero({ faceX: -1, faceY: 0 }), MAGE_BODY.iris), 1); assert.equal(count(hero({ faceX: 0, faceY: -1 }), MAGE_BODY.iris), 0);
  assert.equal(has(hero({ faceY: -1 }), MAGE_BODY.skin.mid), true, "de costas ainda se vê a mão no cajado, mas sem rosto");
  const front = spy(hero()), back = spy(hero({ faceY: -1 }));
  assert.ok((front.calls.ellipse ?? 0) > (back.calls.ellipse ?? 0), "de frente há mais elipses (olhos, rubor) que de costas");
  assert.equal(new Set([signature(hero({ faceX: 0, faceY: 1 })), signature(hero({ faceX: 1, faceY: 0 })), signature(hero({ faceX: -1, faceY: 0 })), signature(hero({ faceX: 0, faceY: -1 }))]).size, 4);
});

test("o rosto reage: pisca, franze e abre a boca ao golpear, fecha os olhos e grita ao ser ferido", () => {
  const eyeHeights = (c: HeroDrawContext) => spy(k => drawMageHead(k, c)).args.ellipse!.filter(a => a.length >= 4 && Math.abs(a[2]! - 1.8) < 1e-9).map(a => a[3]!);
  const open = eyeHeights(ctxOf()), shut = eyeHeights(ctxOf({ closed: 0.85 }));
  assert.equal(open.length, 2); assert.ok(Math.max(...open) > 2 && Math.max(...shut) < 0.6, "pálpebra fechada deixa o olho fino");
  assert.equal(has(k => drawMageHead(k, ctxOf()), MAGE_BODY.mouthOpen), false, "parado, a boca é um traço");
  assert.equal(has(k => drawMageHead(k, ctxOf({ shout: true })), MAGE_BODY.mouthOpen), true, "golpeando, a boca abre");
  const mouth = (c: HeroDrawContext) => spy(k => drawMageHead(k, c)).args.ellipse!.filter(a => a.length >= 4 && Math.abs(a[2]! - 1.4) < 1e-9).map(a => a[3]!);
  assert.ok(mouth(ctxOf({ shout: true, hurting: true }))[0]! > mouth(ctxOf({ shout: true }))[0]!, "ferido, a boca abre mais");
  assert.notEqual(signature(k => drawMageHead(k, ctxOf())), signature(k => drawMageHead(k, ctxOf({ fierce: 0.8 }))), "ao golpear, as sobrancelhas se inclinam");
  // as duas sobrancelhas se inclinam, cada uma para o seu lado (o início e o fim de cada traço mexem)
  const changed = (name: "moveTo" | "quadraticCurveTo", index: number): number => {
    const calm = spy(k => drawMageHead(k, ctxOf())).args[name]!, angry = spy(k => drawMageHead(k, ctxOf({ fierce: 0.8 }))).args[name]!;
    return calm.filter((call, i) => Math.abs((call[index] ?? 0) - (angry[i]?.[index] ?? 0)) > 1e-9).length;
  };
  assert.equal(changed("moveTo", 1), 2, "o início das duas sobrancelhas"); assert.equal(changed("quadraticCurveTo", 3), 2, "o fim das duas sobrancelhas");
  // pela cena inteira o golpe e o dano chegam ao rosto (as cores mudam com o brilho de dano; a ligação do quadro está no teste de baixo)
  assert.notEqual(signature(hero({ hurtTime: 0.3 })), signature(hero())); assert.equal(has(hero(), MAGE_BODY.mouthOpen), false, "parado, a boca é um traço");
});

test("o cabelo da frente (franja e mechas) existe e balança sozinho", () => {
  const front = ctxOf(), swayed = ctxOf({ tailSway: 3 });
  assert.ok(spy(k => hairFront(front, k)).calls.fill! >= 3, "a franja e as duas mechas se pintam");
  assert.notEqual(signature(k => hairFront(swayed, k)), signature(k => hairFront(front, k)), "as mechas da frente balançam");
  assert.notEqual(signature(k => hairFront(ctxOf({ back: true }), k)), signature(k => hairFront(front, k)), "de costas é outro desenho");
  const head = (c: HeroDrawContext, hex: string): number => count(k => drawMageHead(k, c), hex);
  assert.equal(head(ctxOf(), MAGE_BODY.hair.mid), 3, "de frente: cabelo de trás, cabeça e franja"); assert.equal(head(ctxOf(), MAGE_BODY.hair.light), 3, "e os três brilhos");
  assert.equal(head(ctxOf({ back: true }), MAGE_BODY.hair.mid), 2, "de costas não há franja"); assert.equal(head(ctxOf({ back: true }), MAGE_BODY.hair.light), 3);
});

test("o cabelo é solto e balança: a inércia do passo mexe nas mechas, de frente e de costas", () => {
  for (const back of [false, true]) for (const side of [0, 1]) {
    const still = signature(k => drawMageHead(k, ctxOf({ back, side })));
    assert.notEqual(signature(k => drawMageHead(k, ctxOf({ back, side, tailSway: 3 }))), still, `mechas balançam (de costas: ${back}, de lado: ${side})`);
  }
  // de costas o cabelo cobre a nuca: a mancha de cabelo desce mais que de frente
  const bottom = (c: HeroDrawContext) => Math.max(...spy(k => drawMageHead(k, c)).args.quadraticCurveTo!.map(a => a[3]!));
  assert.ok(bottom(ctxOf({ back: true })) > bottom(ctxOf()), "de costas o cabelo cai mais");
  assert.ok(bottom(ctxOf({ back: true })) <= -31.5 + 16, "mas só até perto dos ombros");
});

test("a ligação: a cabeça do Mago entra no lugar da do Cavaleiro e antes do chapéu; o quadro do rosto vem do herói", () => {
  const actors = read("src/render/actors.ts");
  assert.match(actors, /if \(look\?\.head\) look\.head\(ctx, hc\);\s*\n\s*else \{\s*\n\s*\/\/ rabo-de-cavalo\/mecha traseira/, "o rabo de cavalo e o rosto do Cavaleiro só valem sem cabeça própria");
  assert.ok(actors.indexOf("look.head(ctx, hc)") < actors.indexOf("look?.hat(ctx, hc)"), "a cabeça vem antes do chapéu");
  assert.match(actors, /closed: Math\.max\(blink\(t, seed \* 10\), hurt > 0\.4 \? 0\.85 : 0\), fierce: player\.attackTime > 0 \? 0\.8 : 0,\s*\n\s*shout: player\.attackTime > 0 \|\| hurt > 0\.4, hurting: hurt > 0\.4/);
  assert.match(read("src/render/hero/look.ts"), /readonly head\?: \(ctx: CanvasRenderingContext2D, c: HeroDrawContext\) => void;/);
  assert.match(read("src/render/hero/mage/index.ts"), /head: drawMageHead/);
});

test("o registro de arte conhece a cabeça do Mago de frente e de lado (de costas é só cabelo, sem cores para o piso do contrato; ela é testada pelo desenho do herói)", () => {
  const assets = read("tests/helpers/artAssets.ts");
  for (const view of ["de frente", "de lado"]) assert.ok(assets.includes(`"mago: cabeça jovem ${view}"`), view);
  assert.ok(assets.includes('fn: "drawMageHead"'));
});
