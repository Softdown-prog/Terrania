import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster, caveMonsterKinds } from "../src/actors/RegionalMonster.ts";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS } from "../src/actors/CreatureCatalog.ts";
import { CENTER_DUNGEON_KINDS, CENTER_KINDS } from "../src/monsters/catalog.ts";
import { SPECIES_BEHAVIORS } from "../src/monsters/behavior.ts";
import { CENTRAL_ROSTER } from "../src/engine/rooms/CaveCentral.ts";
import { ClassicTileWalker } from "../src/engine/movement/ClassicTileWalker.ts";
import { normalizeMaterials } from "../src/engine/character/Inventory.ts";
import { drawLivingRoot, rootLeg, ROOT_LEGS, CREATURE_PALETTE as ROOT } from "../src/render/creatures/center/roots/livingRoot.ts";
import { drawElderCaveEnt, entArm, entLeg, CREATURE_PALETTE as ENT } from "../src/render/creatures/center/ents/elderCaveEnt.ts";
import { renderRootedFeet } from "../src/render/rootedFeet.ts";
import { renderRegionalCreature } from "../src/render/regionalCreatures.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import type { CollisionMap } from "../src/world/collision.ts";
import type { CreatureMotion } from "../src/render/creatures/shared/creatureMotion.ts";
import type { Palette } from "../src/render/creatures/shared/southGeometry.ts";

/**
 * Centro, lote 4a (ADR 0094): o status "enraizado" (não anda, mas luta), a Raiz-Viva (elite que prende) e o Ent Ancião da Gruta (chefe de raízes em área), com as
 * fichas, o desenho e o efeito nos pés do herói. A masmorra que os abriga é o lote 4b.
 */
const OPEN: CollisionMap = { canMove: () => true };
const open = { canMove: () => true, speedAt: () => 1 };
const motion = (over: Partial<CreatureMotion> = {}): CreatureMotion => ({ seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...over });
type Call = { name: string; args: number[] };
const record = (draw: (ctx: CanvasRenderingContext2D) => void): Call[] => {
  const out: Call[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push({ name, args: args.filter((a): a is number => typeof a === "number") }); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
};
const sig = (draw: typeof drawLivingRoot, p: Palette, m: CreatureMotion, t = 1.3) => { const r = new Recorder(); return withFakeDocument(r, () => { draw(r.ctx, p, t, m); return r.metrics(); }); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const HIP_Y_FOR_TEST = 9; // a altura do quadril das raízes (HIP_Y = −9), em módulo
const dist = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test("enraizado: o herói não anda enquanto dura (2 s), mas ainda ataca; depois anda; o descanso e a troca de cenário tratam o status", () => {
  const hero = new Player(); hero.x = 200; hero.y = 200;
  hero.applyStatus("root", 2);
  assert.equal(hero.debuffs.root, 2); assert.equal(hero.movementMultiplier, 0);
  for (let i = 0; i < 108; i++) hero.update(1 / 60, { x: 1, y: 0 }, OPEN); // 1,8 s
  assert.equal(hero.x, 200, "enraizado, não sai do lugar");
  assert.equal(hero.startAttack("starter"), true, "mas ainda luta (o atordoado não luta)");
  const stunned = new Player(); stunned.applyStatus("stun", 1); assert.equal(stunned.startAttack("starter"), false);
  const free = new Player(); free.x = 200; free.y = 200; free.applyStatus("root", 2);
  for (let i = 0; i < 150; i++) free.update(1 / 60, { x: 1, y: 0 }, OPEN);
  assert.ok(free.x > 215, "passados os 2 s, anda: " + free.x);
  hero.cleanse(); assert.equal(hero.debuffs.root, 0); assert.equal(hero.movementMultiplier, 1);
  const a = new Player(), b = new Player(); a.applyStatus("root", 1.5); b.syncAdventureStateFrom(a); assert.equal(b.debuffs.root, 1.5, "atravessa a porta da caverna");
  const capped = new Player(); capped.applyStatus("root", 99); assert.equal(capped.debuffs.root, 12, "no máximo 12 s");
  for (const bad of [Number.NaN, -1, 0, Number.POSITIVE_INFINITY]) { const p = new Player(); p.applyStatus("root", bad); assert.equal(p.debuffs.root, 0, String(bad) + ": número inválido não enraíza"); }
  const slowRoot = new Player(); slowRoot.applyStatus("slow", 5); assert.equal(slowRoot.movementMultiplier, .58); slowRoot.applyStatus("root", 1); assert.equal(slowRoot.movementMultiplier, 0, "a raiz vale mais que a lentidão");
  const walker = new ClassicTileWalker(), tile = new Player(); tile.applyStatus("root", 2);
  for (let i = 0; i < 60; i++) walker.advance(1 / 60, { x: 1, y: 0 }, tile, OPEN);
  assert.deepEqual([tile.x, tile.y], [16, 16], "no modo por casas também fica preso");
});

test("fichas: Raiz-Viva (elite) e Ent Ancião (chefe) com os números do documento; moram só na caverna verde e na masmorra", () => {
  const sheet = (k: typeof CENTER_DUNGEON_KINDS[number]) => { const d = CREATURE_CATALOG[k]; return [d.name, d.maxHp, d.contactDamage, d.experience, d.special, d.status, d.statusSeconds, d.region, [...d.caveThemes], [...d.biomes]]; };
  assert.deepEqual(sheet("living-root"), ["Raiz-Viva", 220, 18, 120, "roots", "root", 2, "center", ["verdant"], []]);
  assert.deepEqual(sheet("elder-cave-ent"), ["Ent Ancião da Gruta", 650, 28, 450, "root-quake", "root", 2.5, "center", ["verdant"], []]);
  const pace = (k: typeof CENTER_DUNGEON_KINDS[number]) => { const d = CREATURE_CATALOG[k]; return [d.speed, d.range, d.interval]; };
  assert.deepEqual(pace("living-root"), [36, 30, 2.6]); assert.deepEqual(pace("elder-cave-ent"), [20, 90, 3.4]);
  assert.deepEqual(CREATURE_CATALOG["living-root"].loot, [{ item: "Seiva Viva", chance: .6 }, { item: "Raiz Retorcida", chance: .4 }]);
  assert.deepEqual(CREATURE_CATALOG["elder-cave-ent"].loot, [{ item: "Coração de Madeira", chance: .7 }, { item: "Madeira Antiga", chance: .9 }, { item: "Seiva Viva", chance: .5 }]);
  assert.deepEqual([...CENTER_DUNGEON_KINDS], ["living-root", "elder-cave-ent"]);
  assert.equal(CENTER_KINDS.length, 9, "os nove do começo do jogo não mudam");
  for (const kind of CENTER_DUNGEON_KINDS) {
    assert.ok(REGIONAL_CREATURE_KINDS.includes(kind), kind + " é espécie regional"); assert.ok(caveMonsterKinds("verdant").includes(kind));
    assert.ok(!(CENTRAL_ROSTER as readonly string[]).includes(kind), kind + " não entra na mistura da Gruta das Raízes");
    for (const { item } of CREATURE_CATALOG[kind].loot) assert.deepEqual(normalizeMaterials({ [item]: 2 }), { [item]: 2 }, item + ": a bolsa aceita");
    assert.ok(!caveMonsterKinds("desert").includes(kind) && !caveMonsterKinds("marsh").includes(kind));
  }
  assert.ok(CREATURE_CATALOG["elder-cave-ent"].maxHp > CREATURE_CATALOG["living-root"].maxHp * 2.9 && CREATURE_CATALOG["living-root"].maxHp >= 2 * CREATURE_CATALOG["wild-boar"].maxHp, "chefe > elite > o resto do Centro");
  const behavior = (k: typeof CENTER_DUNGEON_KINDS[number]) => { const b = SPECIES_BEHAVIORS[k]; return [b.gait, b.pursuit, b.cadence, b.weave]; };
  assert.deepEqual(behavior("living-root"), ["crawl", "direct", .42, 0]); assert.deepEqual(behavior("elder-cave-ent"), ["lumber", "direct", .44, 0]);
  assert.equal(SPECIES_BEHAVIORS["living-root"].retreatAt, undefined, "a raiz não foge"); assert.equal(SPECIES_BEHAVIORS["elder-cave-ent"].retreatAt, undefined, "nem o chefe");
});

test("a pancada da Raiz-Viva enraíza por 2 s; a do Ent, 2,5 s (e o pisão de perto ainda atordoa 0,6 s); as raízes de longe prendem sem atordoar e doem menos", () => {
  const hit = (kind: "living-root" | "elder-cave-ent", away: number) => {
    const hero = new Player(); hero.x = 400; hero.y = 400;
    const mob = new RegionalMonster("golpe-" + kind, kind, 400 + away, 400);
    for (let i = 0; i < 400 && hero.hp === hero.maxHp; i++) mob.update(1 / 60, hero, open, 0, false);
    return { hurt: hero.maxHp - hero.hp, root: hero.debuffs.root, stun: hero.debuffs.stun, slow: hero.debuffs.slow };
  };
  assert.deepEqual(hit("living-root", 20), { hurt: 18, root: 2, stun: 0, slow: 0 });
  assert.deepEqual(hit("elder-cave-ent", 20), { hurt: 28, root: 2.5, stun: .6, slow: 0 });
  assert.deepEqual(hit("elder-cave-ent", 80), { hurt: 21, root: 2.5, stun: 0, slow: 0 });
  // o pisão atordoa até 54 de distância no instante da pancada (o Ent avança uns 8 durante o preparo): 50 antes → ~42 na pancada; 66 antes → ~58
  assert.deepEqual(hit("elder-cave-ent", 50), { hurt: 21, root: 2.5, stun: .6, slow: 0 }, "perto o bastante: as raízes e o pisão");
  assert.deepEqual(hit("elder-cave-ent", 66), { hurt: 21, root: 2.5, stun: 0, slow: 0 }, "um pouco mais longe: só as raízes");
  // fora do alcance (90) o Ent não acerta; a Raiz-Viva, que só agarra de perto (alcance 30), também não
  const far = new Player(); far.x = 400; far.y = 400; const ent = new RegionalMonster("longe", "elder-cave-ent", 520, 400);
  for (let i = 0; i < 20; i++) ent.update(1 / 60, far, { canMove: () => false, speedAt: () => 0 }, 0, false);
  assert.equal(far.hp, far.maxHp, "a 120 de distância, parado, ninguém é atingido");
  const spec = (kind: string) => { const d = CREATURE_CATALOG[kind as "living-root"]; return d.special; };
  assert.deepEqual([spec("living-root"), spec("elder-cave-ent")], ["roots", "root-quake"]);
});

test("Raiz-Viva: quatro raízes-perna de cada lado, de joelho alto e ossos inteiros, em passo alternado, e paradas ficam no apoio", () => {
  assert.equal(ROOT_LEGS.length, 4);
  assert.deepEqual(ROOT_LEGS, [{ hipX: 5, reach: 13 }, { hipX: 2, reach: 6 }, { hipX: -2, reach: -7 }, { hipX: -5, reach: -14 }], "duas para a frente e duas para trás");
  for (const far of [false, true]) for (let i = 0; i < 4; i++) {
    const { spec, knee, foot } = rootLeg(i, far, 0, 0);
    assert.ok(near(dist([spec.hipX, spec.hipY], knee), spec.upper) && near(dist(knee, foot), spec.lower), "ossos inteiros");
    assert.ok(near(foot[1], 0) && near(foot[0], spec.hipX + ROOT_LEGS[i]!.reach + (far ? 1.2 : 0)), "parada, o pé fica no apoio");
    assert.equal(spec.foot, "claw"); assert.equal(spec.hipX, ROOT_LEGS[i]!.hipX + (far ? 1.8 : 0));
  }
  const first = rootLeg(0, false, 0, 0).spec;
  assert.deepEqual([first.hipY, first.upper, first.lower, first.widthTop, first.widthKnee, first.widthAnkle, first.stride, first.lift], [-9, 8, 11.5, 5, 3.4, 2.2, 3.6, 3.4], "as medidas das raízes-perna");
  const step = (i: number, far: boolean, phase: number) => rootLeg(i, far, phase, 1).foot[0] - rootLeg(i, far, phase, 0).foot[0];
  // o pé chega ao ponto pedido quando alcança; no extremo da passada o alcance dos ossos o segura (e não passa dele)
  const reaches = (i: number, far: boolean, phase: number) => { const { spec } = rootLeg(i, far, phase, 1), s = Math.sin(phase + ((i + (far ? 1 : 0)) % 2) * Math.PI + i * .4); return Math.hypot(ROOT_LEGS[i]!.reach + s * 3.2 + (far ? 1.2 : 0), HIP_Y_FOR_TEST + Math.max(0, s) * 3) <= spec.upper + spec.lower - .4; };
  let checked = 0;
  for (const phase of [.4, 1.3, 2.9, 4.1]) for (let i = 0; i < 4; i++) {
    if (!reaches(i, false, phase) || !reaches(i, true, phase)) continue; checked++;
    assert.ok(near(step(i, false, phase), Math.sin(phase + (i % 2) * Math.PI + i * .4) * 3.2), `raiz ${i}: o pé anda`);
    assert.ok(near(step(i, true, phase) + step(i, false, phase), 0), "o lado distante anda em oposição");
  }
  assert.ok(checked >= 10, "a maioria das posições da passada foi conferida: " + checked);
  for (let k = 0; k < 40; k++) for (let i = 0; i < 4; i++) assert.ok(rootLeg(i, false, k * .3, 1).foot[1] <= 1e-9, "o pé nunca afunda");
  assert.equal(sig(drawLivingRoot, ROOT, motion({ moving: 0, phase: 0 })).signature, sig(drawLivingRoot, ROOT, motion({ moving: 0, phase: 2 })).signature, "parada, não marcha");
});

test("Raiz-Viva: olha para a esquerda; no golpe duas raízes chicoteiam 20 a mais, a boca abre e a seiva escorre; o ferimento racha e vaza", () => {
  const root = (m: object) => record(c => drawLivingRoot(c, ROOT, 1.3, motion(m)));
  assert.deepEqual(root({}).find(c => c.name === "scale")!.args, [-1, 1]);
  const reach = (bite: number) => root({ bite }).filter(c => c.name === "bezierCurveTo" && c.args.length === 6 && c.args[4]! > 12 && c.args[4]! < 40).map(c => c.args[4]!);
  assert.equal(reach(0).length >= 4, true);
  assert.ok(near(Math.max(...reach(1)) - Math.max(...reach(0)), 20), "a ponta da raiz que chicoteia avança 20 no golpe");
  assert.ok(near(Math.max(...reach(.5)) - Math.max(...reach(0)), 10));
  const sap = (bite: number) => root({ bite }).filter(c => c.name === "ellipse" && near(c.args[0]!, 6.6) && c.args[3]! > 1.5).length;
  assert.equal(sap(0), 0, "sem golpe não escorre seiva"); assert.ok(sap(.5) >= 1);
  const cracks = (w: number) => root({ wound: w }).filter(c => c.name === "stroke").length;
  assert.equal(cracks(.35), cracks(0), "até 35 % nada"); assert.ok(cracks(.5) > cracks(.35), "a casca racha e a seiva vaza");
  assert.notEqual(sig(drawLivingRoot, ROOT, motion({ seed: .3 })).signature, sig(drawLivingRoot, ROOT, motion({ seed: .8 })).signature, "cada raiz tem a sua casca");
});

test("Ent Ancião: pernas de raiz alternadas, o pisão ergue 5 a perna de perto, o braço de perto sobe 30 e o coração pulsa; o chão racha e raízes brotam no golpe", () => {
  const nearLeg = entLeg(false, 0, 0, 0).spec, farLeg = entLeg(true, 0, 0, 0).spec, nearArm = entArm(false, 0, 0, 0).spec, farArm = entArm(true, 0, 0, 0).spec;
  assert.deepEqual([nearLeg.hipX, farLeg.hipX, nearLeg.hipY, nearLeg.upper, nearLeg.lower, nearLeg.widthTop, nearLeg.widthKnee, nearLeg.widthAnkle, nearLeg.stride, nearLeg.lift, nearLeg.foot], [3, -6, -22, 11, 12.5, 8.4, 6.4, 5.6, 6, 6, "cloven"], "as pernas do Ent");
  assert.deepEqual([nearArm.hipX, farArm.hipX, nearArm.hipY, nearArm.upper, nearArm.lower, nearArm.widthTop, nearArm.widthKnee, nearArm.widthAnkle, nearArm.foot], [15, -15, -48, 13, 14, 7.4, 5.2, 4, "claw"], "os braços do Ent");
  assert.ok(near(entLeg(false, 0, 0, 0).foot[1], 0) && near(entLeg(true, 0, 0, 0).foot[1], 0), "parado, as duas pernas no apoio");
  assert.ok(near(entLeg(false, 0, 0, 1).foot[1] - entLeg(false, 0, 0, 0).foot[1], -5), "no golpe a perna de perto sobe 5 (o pisão)");
  assert.ok(near(entLeg(true, 0, 0, 1).foot[1], entLeg(true, 0, 0, 0).foot[1]), "a de longe não");
  const stepA = entLeg(false, 1.1, 1, 0), stepB = entLeg(true, 1.1, 1, 0);
  assert.ok(near(stepA.foot[0] - entLeg(false, 1.1, 0, 0).foot[0], Math.sin(1.1) * 6) && near(stepB.foot[0] - entLeg(true, 1.1, 0, 0).foot[0], -Math.sin(1.1) * 6), "as pernas andam em oposição");
  for (const part of [entLeg(false, .7, 1, .3), entLeg(true, .7, 1, 0), entArm(false, .7, 1, .3), entArm(true, .7, 1, 0)]) assert.ok(near(dist([part.spec.hipX, part.spec.hipY], part.knee), part.spec.upper) && near(dist(part.knee, part.foot), part.spec.lower), "ossos inteiros");
  const hand = (bite: number) => entArm(false, 0, 0, bite).foot[1];
  assert.ok(near(hand(0) - hand(1), 30), "o braço de perto sobe 30 acima da cabeça no golpe"); assert.ok(near(entArm(true, 0, 0, 1).foot[1], entArm(true, 0, 0, 0).foot[1]), "o de longe fica");
  assert.ok(near(entArm(false, 0, 0, 1).foot[0] - entArm(false, 0, 0, 0).foot[0], 6), "e avança 6");
  const ent = (m: object, t = 1.3) => record(c => drawElderCaveEnt(c, ENT, t, motion(m)));
  assert.deepEqual(ent({}).find(c => c.name === "scale")!.args, [-.88, .88], "olha para a esquerda e fica em 88 % para a coroa caber na caixa");
  const quads = (bite: number) => ent({ bite }).filter(c => c.name === "quadraticCurveTo").length;
  assert.equal(quads(.02), quads(0), "no limiar do golpe o chão ainda não racha"); assert.equal(quads(1) - quads(0), 8, "no golpe brotam quatro raízes à frente (duas curvas cada)");
  const heart = (t: number) => ent({}, t).filter(c => c.name === "ellipse" && near(c.args[0]!, 1) && near(c.args[1]!, -38) && c.args[2]! > 3 && c.args[2]! < 4.2).map(c => c.args[2]!)[0]!;
  assert.ok(near(heart(0) , 3.2 + (.75 + Math.sin(.3 * 4) * .25) * .6) && heart(1) !== heart(2), "o Coração de Madeira pulsa com o tempo");
  const cracks = (w: number) => ent({ wound: w }).filter(c => c.name === "stroke").length;
  assert.equal(cracks(.3), cracks(0)); assert.ok(cracks(.5) > cracks(.3), "o tronco racha e o coração brilha pelas frestas");
});

test("as duas aparecem pelo registro, parados não marcham, cabem na caixa da luz comum e são determinísticos", () => {
  for (const [kind, draw, p] of [["living-root", drawLivingRoot, ROOT], ["elder-cave-ent", drawElderCaveEnt, ENT]] as const) {
    const m = sig(draw, p, motion({ moving: 1, phase: 1 }));
    assert.ok(m.width <= 128 && m.height <= 90 && m.width > 25 && m.height > 25, `${kind}: ${m.width}×${m.height}`);
    assert.equal(sig(draw, p, motion()).signature, sig(draw, p, motion()).signature, `${kind}: determinístico`);
    assert.notEqual(sig(draw, p, motion({ moving: 1, phase: 0 })).signature, sig(draw, p, motion({ moving: 1, phase: 1.5 })).signature, `${kind}: andando, mexe`);
    assert.equal(sig(draw, p, motion({ moving: 0, phase: 0 })).signature, sig(draw, p, motion({ moving: 0, phase: 2 })).signature, `${kind}: parado, não marcha`);
    const r = new Recorder(); withFakeDocument(r, () => renderRegionalCreature(r.ctx, { kind, hp: CREATURE_CATALOG[kind].maxHp, id: "x" }, 0, 0, 1));
    assert.ok(r.metrics().paintOps > 100, `${kind}: o registro desenha o corpo`);
  }
  for (const f of ["center/roots/livingRoot", "center/ents/elderCaveEnt"]) {
    const code = readFileSync(new URL(`../src/render/creatures/${f}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /Math\.random|Date\.now|performance\.now/, f); assert.doesNotMatch(code, /\bany\b\s*[,;)>\]=]|@ts-ignore/, f);
  }
});

test("as raízes nos pés: nascem aos poucos, ficam inteiras no meio e murcham no fim; sem efeito ou com número inválido, nada é desenhado; a cena e a caverna as desenham", () => {
  const alpha = (seconds: number): number[] => { const out: number[] = []; const stub = new Proxy({}, { get: (_t, n: string) => () => (n.startsWith("create") ? { addColorStop() {} } : undefined), set: (_t, n: string, v: unknown) => { if (n === "globalAlpha") out.push(v as number); return true; } }); renderRootedFeet(stub as unknown as CanvasRenderingContext2D, 0, 0, 1, seconds); return out; };
  assert.ok(near(alpha(2.6)[0]!, .25), "começando: um quarto"); assert.ok(near(alpha(2.2)[0]!, 1), "no meio: inteiras");
  assert.ok(near(alpha(.2)[0]!, .48), "murchando"); assert.ok(near(alpha(.1)[0]!, .24));
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.deepEqual(alpha(bad), [], `seconds ${bad}`);
  assert.deepEqual(record(c => renderRootedFeet(c, 0, 0, Number.NaN, 2)), [], "tempo inválido não desenha");
  assert.ok(record(c => renderRootedFeet(c, 0, 0, 1, 2)).filter(c => c.name === "bezierCurveTo").length === 15, "cinco raízes, cada uma de dois traços e um brilho");
  const sway = (t: number) => record(c => renderRootedFeet(c, 0, 0, t, 2)).filter(c => c.name === "bezierCurveTo").map(c => c.args[4]!);
  assert.notDeepEqual(sway(1), sway(1.7), "balançam com o tempo");
  const scene = readFileSync(new URL("../src/ui/CanvasScene.ts", import.meta.url), "utf8"), cave = readFileSync(new URL("../src/render/cave.ts", import.meta.url), "utf8");
  assert.match(scene, /\(player\.debuffs\?\.root \?\? 0\)>0\)renderRootedFeet\(ctx,player\.x-left,player\.y-top,time,player\.debuffs!\.root!\)/);
  assert.match(cave, /if\(player\.debuffs\.root>0\)renderRootedFeet\(ctx,player\.x-left,player\.y-top,time,player\.debuffs\.root\)/);
});
