import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { drawRootSpider, spiderLeg, SPIDER_LEGS, CREATURE_PALETTE as SPIDER } from "../src/render/creatures/center/spiders/rootSpider.ts";
import { drawRootBeetle, beetleLeg, BEETLE_LEGS, CREATURE_PALETTE as BEETLE } from "../src/render/creatures/center/beetles/rootBeetle.ts";
import { drawCaveBat, CREATURE_PALETTE as BAT } from "../src/render/creatures/center/bats/caveBat.ts";
import { solveLeg } from "../src/render/creatures/shared/anatomy/limbs.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import type { CreatureMotion } from "../src/render/creatures/shared/creatureMotion.ts";
import type { Palette } from "../src/render/creatures/shared/southGeometry.ts";

/**
 * Etapa C2 (ADR 0093): aranha, besouro e morcego do Centro. A aranha (oito patas) e o besouro (seis) usam o kit de anatomia (pernas de dois ossos por cinemática
 * inversa, em diagonais e tripés); o morcego ganha pelo, nervuras, juntas e rosto. Os testes medem a geometria, não a beleza.
 */
type Call = { name: string; args: number[] };
const record = (draw: (ctx: CanvasRenderingContext2D) => void): Call[] => {
  const out: Call[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push({ name, args: args.filter((a): a is number => typeof a === "number") }); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
};
const motion = (over: Partial<CreatureMotion> = {}): CreatureMotion => ({ seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...over });
const sig = (draw: typeof drawRootSpider, p: Palette, m: CreatureMotion, t = 1.3) => { const r = new Recorder(); return withFakeDocument(r, () => { draw(r.ctx, p, t, m); return r.metrics(); }); };
const dist = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test("aranha: oito patas, abertas em leque (duas para a frente, duas para trás), com os ossos inteiros e o joelho alto", () => {
  assert.equal(SPIDER_LEGS.length, 4);
  assert.deepEqual(SPIDER_LEGS.map(l => Math.sign(l.reach)), [1, 1, -1, -1], "duas para cada lado do corpo");
  for (const far of [false, true]) for (let i = 0; i < 4; i++) {
    const { spec, knee, foot } = spiderLeg(i, far, 0, 0);
    assert.equal(spec.front, SPIDER_LEGS[i]!.reach > 0); assert.equal(spec.far, far); assert.equal(spec.foot, "claw");
    assert.ok(Math.abs(dist([spec.hipX, spec.hipY], knee) - spec.upper) < 1e-6, `osso de cima inteiro (${i}, ${far})`);
    assert.ok(Math.abs(dist(knee, foot) - spec.lower) < 1e-6, `osso de baixo inteiro (${i}, ${far})`);
    assert.ok(knee[1] < spec.hipY - 3, `joelho acima do quadril: ${knee[1]} < ${spec.hipY}`);
    assert.ok(Math.abs(foot[1]) < 1e-9, "parada, o pé fica no chão");
    assert.ok(Math.abs(foot[0] - (spec.hipX + SPIDER_LEGS[i]!.reach + (far ? 1.6 : 0))) < 1e-9, "no ponto de apoio");
    assert.equal(spec.hipX, SPIDER_LEGS[i]!.hipX + (far ? 2.4 : 0), "o lado distante nasce um pouco adiante");
  }
});

test("aranha: andando, as patas alternam (cada diagonal com a sua fase), o pé sobe no passo e parada a fase não conta", () => {
  const lifted = (phase: number) => [false, true].flatMap(far => [0, 1, 2, 3].map(i => spiderLeg(i, far, phase, 1).foot[1] < -.05));
  assert.ok(lifted(1.1).some(Boolean) && !lifted(1.1).every(Boolean), "algumas levantadas e outras no chão");
  const step = (i: number, far: boolean, phase: number) => spiderLeg(i, far, phase, 1).foot[0] - spiderLeg(i, far, phase, 0).foot[0];
  for (const phase of [.4, 1.3, 2.9]) for (let i = 0; i < 4; i++) {
    const expected = Math.sin(phase + (i % 2) * Math.PI + i * .5) * 3.6;
    assert.ok(Math.abs(step(i, false, phase) - expected) < 1e-9, `perna ${i}: o pé anda ${step(i, false, phase).toFixed(2)} ≈ ${expected.toFixed(2)}`);
    assert.ok(Math.abs(step(i, true, phase) + step(i, false, phase)) < 1e-9, "o lado distante anda em oposição exata");
  }
  const rise = (phase: number) => Math.max(...[0, 1, 2, 3].map(i => -spiderLeg(i, false, phase, 1).foot[1]));
  const expectedRise = (phase: number) => Math.max(...[0, 1, 2, 3].map(i => Math.max(0, Math.sin(phase + (i % 2) * Math.PI + i * .5)) * 3.2));
  for (const phase of [.3, 1.1, 2.2, 4.1]) assert.ok(Math.abs(rise(phase) - expectedRise(phase)) < 1e-9, `o pé sobe até 3,2 no passo (fase ${phase})`);
  for (let k = 0; k < 60; k++) for (const far of [false, true]) for (let i = 0; i < 4; i++) assert.ok(spiderLeg(i, far, k * .21, 1).foot[1] <= 1e-9, "o pé nunca afunda no chão");
  const first = spiderLeg(0, false, 0, 0).spec;
  assert.deepEqual([first.hipY, first.upper, first.lower, first.widthTop, first.widthKnee, first.widthAnkle], [-11, 13, 19, 3.6, 2.6, 1.6], "as medidas das patas da aranha");
  assert.equal(sig(drawRootSpider, SPIDER, motion({ moving: 0, phase: 0 })).signature, sig(drawRootSpider, SPIDER, motion({ moving: 0, phase: 2 })).signature, "parada, não marcha");
  assert.notEqual(sig(drawRootSpider, SPIDER, motion({ moving: 1, phase: 0 })).signature, sig(drawRootSpider, SPIDER, motion({ moving: 1, phase: 1.5 })).signature, "andando, mexe");
});

test("besouro: seis patas em tripés alternados (a da frente e a de trás de um lado andam com a do meio do outro) e o joelho não passa do quadril", () => {
  assert.equal(BEETLE_LEGS.length, 3);
  assert.deepEqual(BEETLE_LEGS, [{ hipX: 8, reach: 8.5 }, { hipX: 0, reach: 2 }, { hipX: -9, reach: -9.5 }], "onde nascem e para onde apoiam as patas do besouro");
  assert.deepEqual([beetleLeg(0, false, 0, 0).spec.upper, beetleLeg(0, false, 0, 0).spec.lower, beetleLeg(0, false, 0, 0).spec.hipY], [7.4, 10.2, -9], "ossos e quadril");
  const phase = Math.PI / 2;
  const up = (i: number, far: boolean) => beetleLeg(i, far, phase, 1).foot[1] < -2;
  assert.deepEqual([up(0, false), up(1, false), up(2, false), up(0, true), up(1, true), up(2, true)], [true, false, true, false, true, false], "tripé: levantam 0 e 2 de perto e 1 de longe");
  const down = beetleLeg(1, false, phase, 1).foot[1];
  assert.ok(Math.abs(down) < 1e-9, "a que apoia está no chão");
  for (const far of [false, true]) for (let i = 0; i < 3; i++) {
    const { spec, knee, foot } = beetleLeg(i, far, 0, 0);
    assert.ok(Math.abs(dist([spec.hipX, spec.hipY], knee) - spec.upper) < 1e-6 && Math.abs(dist(knee, foot) - spec.lower) < 1e-6, "ossos inteiros");
    assert.ok(knee[1] <= spec.hipY + 1, `joelho ${knee[1]} no máximo 1 abaixo do quadril ${spec.hipY}`);
    assert.ok(Math.abs(foot[1]) < 1e-9 && Math.abs(foot[0] - (spec.hipX + BEETLE_LEGS[i]!.reach)) < 1e-9, "parado, o pé está no apoio");
  }
  assert.equal(sig(drawRootBeetle, BEETLE, motion({ moving: 0, phase: 0 })).signature, sig(drawRootBeetle, BEETLE, motion({ moving: 0, phase: 2 })).signature, "parado, não marcha");
  assert.notEqual(sig(drawRootBeetle, BEETLE, motion({ moving: 1, phase: 0 })).signature, sig(drawRootBeetle, BEETLE, motion({ moving: 1, phase: 1.5 })).signature);
});

test("aranha e besouro olham para a esquerda (montados para a direita e espelhados), com as patas distantes antes do corpo e as próximas depois", () => {
  for (const [name, draw, p, farHips, nearHips, mass] of [
    ["aranha", drawRootSpider, SPIDER, SPIDER_LEGS.map(l => l.hipX + 2.4), SPIDER_LEGS.map(l => l.hipX), 3.6 * .78],
    ["besouro", drawRootBeetle, BEETLE, BEETLE_LEGS.map(l => l.hipX + 1.6), BEETLE_LEGS.map(l => l.hipX), 3.6 * .78],
  ] as const) {
    const list = record(c => draw(c, p, 1.3, motion({ moving: 1, phase: 1 })));
    assert.deepEqual(list.find(c => c.name === "scale")!.args, [-1, 1], `${name}: espelho`);
    const masses = list.filter(c => c.name === "ellipse" && Math.abs(c.args[2]! - mass) < 1e-9).map(c => c.args[0]!);
    assert.deepEqual(masses, [...farHips, ...nearHips], `${name}: a ordem das patas (distantes, depois próximas)`);
    const body = list.findIndex(c => c.name === "bezierCurveTo");
    const firstNear = list.findIndex(c => c.name === "ellipse" && Math.abs(c.args[2]! - mass) < 1e-9 && nearHips.includes(c.args[0]!) && !farHips.includes(c.args[0]!));
    assert.ok(body > 0 && firstNear > body, `${name}: o corpo vem entre as patas distantes e as próximas`);
  }
});

test("a aranha: as quelíceras abrem em tesoura 3,4 por unidade de golpe, a gota de veneno só aparece no golpe e a carapaça racha acima de 60 %", () => {
  const spider = (m: object) => record(c => drawRootSpider(c, SPIDER, 1.3, motion(m)));
  const jaws = (bite: number) => spider({ bite }).filter(c => c.name === "quadraticCurveTo" && Math.abs(c.args[0]! - 19.6) < 1e-9).map(c => c.args[3]!);
  assert.deepEqual(jaws(0).map(v => +v.toFixed(6)), [-8.6, -5.8]);
  assert.deepEqual(jaws(1).map(v => +v.toFixed(6)), [-5.2, -9.2], "a de cima desce 3,4 e a de baixo sobe 3,4");
  assert.deepEqual(jaws(7).map(v => +v.toFixed(6)), [-5.2, -9.2], "o golpe passa do limite e elas não abrem além");
  const drop = (bite: number) => spider({ bite }).filter(c => c.name === "ellipse" && Math.abs(c.args[0]! - 18.1) < 1e-9).length;
  assert.equal(drop(0), 0); assert.equal(drop(.5), 1);
  const cracks = (w: number) => spider({ wound: w }).filter(c => c.name === "stroke").length;
  assert.equal(cracks(.4), cracks(0), "até 40 % nada"); assert.ok(cracks(.5) > cracks(.4), "o abdômen racha"); assert.ok(cracks(.7) > cracks(.5), "e o cefalotórax também, acima de 60 %");
  const bigEye = (r: number) => spider({}).filter(c => c.name === "ellipse" && c.args[0] === 17.4 && Math.abs(c.args[2]! - r) < 1e-9).length;
  assert.equal(bigEye(2.4), 1, "o contorno do olho grande"); assert.equal(bigEye(1.7), 1, "e o miolo");
});

test("o besouro: as mandíbulas abrem em tesoura 4 por unidade de golpe, as antenas balançam com o tempo e o casco racha acima de 40 %", () => {
  const beetle = (m: object, t = 1.3) => record(c => drawRootBeetle(c, BEETLE, t, motion(m)));
  const tips = (bite: number) => beetle({ bite }).filter(c => c.name === "quadraticCurveTo" && c.args[0]! > 35.9 && c.args[0]! < 38.1 && c.args[3]! > -12).map(c => c.args[3]!);
  assert.equal(tips(0).length, 2);
  assert.ok(Math.abs(tips(1)[0]! - tips(0)[0]! - 3.4 * 1.2) < 1e-9 || Math.abs(tips(1)[0]! - tips(0)[0]! + 3.4 * 1.2) < 1e-9, "uma mandíbula se move 4,08");
  assert.ok(Math.abs(Math.abs(tips(1)[1]! - tips(0)[1]!) - 3.4 * 1.2) < 1e-9, "a outra também");
  assert.ok(tips(1)[0]! !== tips(1)[1]!, "abrem para lados opostos");
  const swing = (bite: number) => beetle({ bite }).filter(c => c.name === "quadraticCurveTo" && c.args[0]! > 35.9 && c.args[0]! < 38.1 && c.args[3]! > -12).map(c => c.args[1]!);
  assert.ok(Math.abs(swing(1)[0]! - swing(0)[0]! - 1.7) < 1e-9 && Math.abs(swing(1)[1]! - swing(0)[1]! + 1.7) < 1e-9, "o meio da curva da mandíbula acompanha, pela metade (a de longe desce, a de perto sobe)");
  const club = (t: number) => beetle({}, t).filter(c => c.name === "ellipse" && Math.abs(c.args[2]! - 1.7) < 1e-9 && Math.abs(c.args[3]! - .6) < 1e-9).map(c => c.args[1]!);
  assert.equal(club(1).length, 6, "duas antenas de três placas");
  assert.notDeepEqual(club(1), club(1.9), "as antenas balançam");
  const cracks = (w: number) => beetle({ wound: w }).filter(c => c.name === "stroke").length;
  assert.equal(cracks(.4), cracks(0)); assert.ok(cracks(.5) > cracks(.4), "o casco racha");
});

test("o morcego: asas com veias e juntas, corpo de pelo, focinho com folha nasal e língua só no guincho; a borda da asa e o ferimento seguem medidos", () => {
  const bat = (m: object) => record(c => drawCaveBat(c, BAT, 1.3, motion({ moving: 1, ...m })));
  assert.equal(bat({}).filter(c => c.name === "ellipse" && Math.abs(c.args[2]! - 1) < 1e-9 && Math.abs(c.args[3]! - .85) < 1e-9).length, 8, "quatro juntas por asa");
  const tongue = (bite: number) => bat({ bite }).filter(c => c.name === "ellipse" && Math.abs(c.args[2]! - 1.6) < 1e-9 && c.args[3]! < 1.2 && c.args[3]! > .7).length;
  assert.equal(tongue(0), 0); assert.equal(tongue(.3), 0, "só passa de 30 %"); assert.equal(tongue(.5), 1);
  assert.equal(bat({}).filter(c => c.name === "ellipse" && c.args[2] === 1.3 && c.args[3] === .9).length, 1, "o nariz");
  const fangs = (bite: number) => bat({ bite }).filter(c => c.name === "lineTo" && Math.abs(c.args[0]!) < 2 && c.args[1]! > -37).map(c => c.args[1]!);
  assert.equal(fangs(0).length, 4, "quatro presas: duas grandes e duas pequenas");
  assert.ok(Math.abs(Math.max(...fangs(1)) - Math.max(...fangs(0)) - 2.4) < 1e-9, "as presas descem 2,4 no guincho");
  assert.equal(sig(drawCaveBat, BAT, motion({ seed: .3 })).signature, sig(drawCaveBat, BAT, motion({ seed: .3 })).signature, "determinístico");
  assert.notEqual(sig(drawCaveBat, BAT, motion({ seed: .3 })).signature, sig(drawCaveBat, BAT, motion({ seed: .9 })).signature, "cada morcego tem o seu pelo");
});

test("os três cabem na caixa da luz comum, cada indivíduo tem a sua pelagem e as peças novas não usam sorteio nem relógio", () => {
  for (const [name, draw, p] of [["aranha", drawRootSpider, SPIDER], ["besouro", drawRootBeetle, BEETLE], ["morcego", drawCaveBat, BAT]] as const) {
    const m = sig(draw, p, motion({ moving: 1, phase: 1 }));
    assert.ok(m.width <= 128 && m.height <= 90 && m.width > 25 && m.height > 25, `${name}: ${m.width}×${m.height}`);
    assert.equal(sig(draw, p, motion({ seed: .3 })).signature, sig(draw, p, motion({ seed: .3 })).signature, `${name}: determinístico`);
  }
  assert.notEqual(sig(drawRootSpider, SPIDER, motion({ seed: .3 })).signature, sig(drawRootSpider, SPIDER, motion({ seed: .8 })).signature);
  assert.notEqual(sig(drawRootBeetle, BEETLE, motion({ seed: .3 })).signature, sig(drawRootBeetle, BEETLE, motion({ seed: .8 })).signature);
  for (const f of ["center/spiders/rootSpider", "center/beetles/rootBeetle", "center/bats/caveBat", "shared/anatomy/limbs"]) {
    const code = readFileSync(new URL(`../src/render/creatures/${f}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /Math\.random|Date\.now|performance\.now/, f); assert.doesNotMatch(code, /\bany\b\s*[,;)>\]=]|@ts-ignore/, f);
  }
  // o solucionador do kit: pé no ponto pedido (quando alcança) e sem NaN quando não alcança
  const spec = spiderLeg(0, false, 0, 0).spec, reach = solveLeg(spec, spec.hipX + 10, -3);
  assert.ok(Math.abs(reach.foot[0] - (spec.hipX + 10)) < 1e-9 && Math.abs(reach.foot[1] + 3) < 1e-9, "alcança");
  const far = solveLeg(spec, spec.hipX + 500, 0); assert.ok([...far.knee, ...far.foot].every(Number.isFinite) && dist([spec.hipX, spec.hipY], far.foot) <= spec.upper + spec.lower, "fora do alcance, grampeia");
});
