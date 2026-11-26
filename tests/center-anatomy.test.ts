import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { drawGrayWolf, GRAY_WOLF_BODY, CREATURE_PALETTE as WOLF } from "../src/render/creatures/center/wolves/grayWolf.ts";
import { drawWildBoar, WILD_BOAR_BODY, CREATURE_PALETTE as BOAR } from "../src/render/creatures/center/boars/wildBoar.ts";
import { drawGiantRat, GIANT_RAT_BODY, CREATURE_PALETTE as RAT } from "../src/render/creatures/center/rats/giantRat.ts";
import { furAlong, furFlow, unit } from "../src/render/creatures/shared/anatomy/fur.ts";
import { quadrupedLegs } from "../src/render/creatures/shared/anatomy/quadruped.ts";
import { legPose } from "../src/render/creatures/shared/anatomy/limbs.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import type { CreatureMotion } from "../src/render/creatures/shared/creatureMotion.ts";
import type { Palette } from "../src/render/creatures/shared/southGeometry.ts";

/**
 * Etapa C1 (ADR 0093): lobo, javali e rato do Centro refeitos com o kit de anatomia (pernas de dois ossos, tronco com silhueta) e com pelagem em mechas. Os testes medem
 * a geometria (pernas, mandíbula, presas, pelo), não a beleza; cada comportamento do desenho antigo (passada, golpe, ferimento) continua lido pelo mesmo `CreatureMotion`.
 */
type Call = { name: string; args: number[] };
const record = (draw: (ctx: CanvasRenderingContext2D) => void): Call[] => {
  const out: Call[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push({ name, args: args.filter((a): a is number => typeof a === "number") }); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
};
const motion = (over: Partial<CreatureMotion> = {}): CreatureMotion => ({ seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...over });
const CREATURES = [
  ["wolf", drawGrayWolf, WOLF, GRAY_WOLF_BODY, "paw"], ["boar", drawWildBoar, BOAR, WILD_BOAR_BODY, "cloven"], ["rat", drawGiantRat, RAT, GIANT_RAT_BODY, "paw"],
] as const;
const sig = (draw: typeof drawGrayWolf, p: Palette, m: CreatureMotion, t = 1.3) => { const r = new Recorder(); return withFakeDocument(r, () => { draw(r.ctx, p, t, m); return r.metrics(); }); };

test("unit: o 'sorteio' da pelagem é estável, fica em [0, 1) e muda com a semente e a posição", () => {
  for (let i = 0; i < 200; i++) { const v = unit(.3, i); assert.ok(v >= 0 && v < 1, `${i}: ${v}`); assert.equal(v, unit(.3, i)); }
  assert.notEqual(unit(.3, 5), unit(.31, 5)); assert.notEqual(unit(.3, 5), unit(.3, 6));
  const spread = Array.from({ length: 400 }, (_, i) => unit(1.7, i)), mean = spread.reduce((a, b) => a + b, 0) / spread.length;
  assert.ok(mean > .4 && mean < .6, `distribuição ${mean}`);
});

test("furAlong: cada mecha nasce na linha, sai para o lado pedido e se inclina para trás; sem linha, nada", () => {
  const line = [[0, 0], [20, 0]] as const, o = { seed: 2, count: 10, length: 4, variation: 0, sweep: -.5, dark: "#101010", light: "#f0f0f0" };
  const up = record(c => furAlong(c, line, -1, o)), down = record(c => furAlong(c, line, 1, o));
  const tufts = up.filter(c => c.name === "moveTo");
  assert.equal(tufts.length, 10, "uma mecha por posição");
  for (const t of tufts) assert.ok(t.args[0]! >= 0 && t.args[0]! <= 20 && t.args[1] === 0, "nasce sobre a linha");
  const ends = up.filter(c => c.name === "quadraticCurveTo");
  assert.ok(ends.every(c => c.args[3]! < 0), "para cima (−1): a ponta fica acima da linha");
  assert.ok(down.filter(c => c.name === "quadraticCurveTo").every(c => c.args[3]! > 0), "para baixo (+1)");
  assert.ok(ends.every((c, i) => c.args[2]! < tufts[i]!.args[0]!), "a ponta se inclina para trás (x menor)");
  assert.ok(ends.every(c => Math.abs(c.args[3]!) <= 4 + 1e-9 && Math.abs(c.args[3]!) > 3), "sem variação, todas têm o comprimento pedido");
  // numa linha vertical (o peito), −1 sai para a frente (+x) e +1 para trás
  const chest = (out: 1 | -1) => record(c => furAlong(c, [[0, 0], [0, 20]], out, { ...o, sweep: 0 })).filter(c => c.name === "quadraticCurveTo");
  assert.ok(chest(-1).every(c => c.args[2]! > 3.9 && Math.abs(c.args[2]! - 4) < 1e-9), "−1 numa linha vertical sai para +x");
  assert.ok(chest(1).every(c => Math.abs(c.args[2]! + 4) < 1e-9), "+1 sai para −x");
  assert.deepEqual(record(c => furAlong(c, [[0, 0]], -1, o)), [], "um ponto só não é linha");
  assert.deepEqual(record(c => furAlong(c, line, -1, o)), up, "o mesmo pedido desenha o mesmo");
  assert.notDeepEqual(record(c => furAlong(c, line, -1, { ...o, seed: 3 })), up, "outra semente, outra pelagem");
  const long = record(c => furAlong(c, line, -1, { ...o, length: 8 })).filter(c => c.name === "quadraticCurveTo");
  assert.ok(Math.abs(long[0]!.args[3]!) > Math.abs(ends[0]!.args[3]!) * 1.9, "mecha mais comprida");
  const varied = record(c => furAlong(c, line, -1, { ...o, variation: .5 })).filter(c => c.name === "quadraticCurveTo").map(c => Math.abs(c.args[3]!));
  assert.ok(new Set(varied.map(v => v.toFixed(3))).size > 5, "com variação, o comprimento muda de uma mecha para outra");
});

test("furFlow: as mechas deitadas ficam dentro da caixa, na direção pedida e do tamanho pedido", () => {
  const o = { seed: 4, count: 30, length: 5, dx: -1, dy: 0, bend: 0, dark: "#101010", light: "#f0f0f0" };
  const list = record(c => furFlow(c, { x0: 0, y0: 0, x1: 40, y1: 20 }, o));
  const starts = list.filter(c => c.name === "moveTo"), curves = list.filter(c => c.name === "quadraticCurveTo");
  assert.equal(starts.length, 30);
  for (const s of starts) assert.ok(s.args[0]! >= 0 && s.args[0]! <= 40 && s.args[1]! >= 0 && s.args[1]! <= 20, "começa na caixa");
  curves.forEach((c, i) => { assert.ok(c.args[2]! < starts[i]!.args[0]!, "corre para a esquerda"); assert.ok(Math.abs(c.args[3]! - starts[i]!.args[1]!) < 1e-9, "sem curva, reto na horizontal"); const L = starts[i]!.args[0]! - c.args[2]!; assert.ok(L >= 3 - 1e-9 && L <= 7 + 1e-9, `comprimento ${L}`); });
  const bent = record(c => furFlow(c, { x0: 0, y0: 0, x1: 40, y1: 20 }, { ...o, bend: .5 })).filter(c => c.name === "quadraticCurveTo");
  assert.ok(bent.some((c, i) => Math.abs(c.args[1]! - curves[i]!.args[1]!) > .05), "com curva, o meio da mecha sai da reta");
  assert.deepEqual(record(c => furFlow(c, { x0: 0, y0: 0, x1: 40, y1: 20 }, o)), list, "determinístico");
});

test("as três criaturas são montadas olhando para a direita e espelhadas (olham para a esquerda), com quatro pernas do kit em diagonais", () => {
  for (const [name, draw, p, body, foot] of CREATURES) {
    const list = record(c => draw(c, p, 1.3, motion()));
    assert.deepEqual(list.find(c => c.name === "scale")!.args, [-1, 1], `${name}: o primeiro ajuste é o espelho`);
    assert.equal(list.filter(c => c.name === "scale" && c.args[0] === -1).length, 1, `${name}: espelha uma vez`);
    assert.equal(body.frontLeg.foot, foot); assert.equal(body.rearLeg.foot, foot);
    const legs = quadrupedLegs(body, 1.1, 1);
    assert.equal(legs.length, 4);
    assert.deepEqual(legs.map(l => l.spec.far), [true, true, false, false]);
    const find = (front: boolean, far: boolean) => legs.find(l => l.spec.front === front && l.spec.far === far)!;
    assert.equal(find(true, false).phase, find(false, true).phase, `${name}: diagonal`);
    assert.ok(Math.abs(find(true, false).phase - find(true, true).phase) - Math.PI < 1e-9);
    // o joelho dobra para o lado certo e o pé de apoio toca o chão
    for (const { spec, phase } of quadrupedLegs(body, Math.PI / 2, 1)) {
      const pose = legPose(spec, phase);
      if (Math.cos(phase) <= 0) assert.ok(pose.foot[1] <= .5 && pose.foot[1] >= -3.6, `${name}: pé de apoio a ${pose.foot[1]}`);
      assert.ok(Math.abs(Math.hypot(pose.knee[0] - spec.hipX, pose.knee[1] - spec.hipY) - spec.upper) < 1e-6, `${name}: osso de cima inteiro`);
    }
  }
});

test("parada, a criatura não marcha: as patas ficam no apoio; andando, a passada mexe nas patas e só nelas", () => {
  for (const [name, draw, p, body] of CREATURES) {
    for (const { spec, phase } of quadrupedLegs(body, 2.2, 0)) { assert.equal(spec.stride, 0); assert.equal(spec.lift, 0); assert.ok(Math.abs(legPose(spec, phase).foot[0] - spec.hipX) < 1e-9, `${name}: pé sob o quadril`); }
    assert.equal(sig(draw, p, motion({ moving: 0, phase: 0 })).signature, sig(draw, p, motion({ moving: 0, phase: 2.2 })).signature, `${name}: parado, a fase não conta`);
    assert.notEqual(sig(draw, p, motion({ moving: 1, phase: 0 })).signature, sig(draw, p, motion({ moving: 1, phase: 1.6 })).signature, `${name}: andando, a passada mexe`);
  }
});

test("o lobo: a mandíbula gira na dobradiça 0,5 rad por unidade de golpe, e as presas crescem; a língua só aparece no golpe", () => {
  const wolf = (bite: number) => record(c => drawGrayWolf(c, WOLF, 1.3, motion({ bite })));
  for (const bite of [0, .5, 1]) assert.ok(Math.abs(wolf(bite).filter(c => c.name === "rotate").at(-1)!.args[0]! - bite * .5) < 1e-12, `giro com golpe ${bite}`);
  assert.deepEqual(wolf(1).filter(c => c.name === "translate").map(c => c.args).find(a => a[0] === 28.4), [28.4, -28.2], "a dobradiça fica sob a bochecha");
  const fang = (bite: number) => wolf(bite).find(c => c.name === "lineTo" && c.args[0]! > 40.19 && c.args[0]! < 40.21)!.args[1]!;
  assert.ok(Math.abs(fang(1) - fang(0) - 1.2) < 1e-9, "a presa de cima desce 1,2 com o golpe");
  const tongue = (bite: number) => wolf(bite).filter(c => c.name === "ellipse" && c.args[2]! > 4.9 && c.args[3]! >= .9 && c.args[3]! < 2.2 && c.args[0] === 8).length;
  assert.equal(tongue(0), 0, "sem golpe não há língua"); assert.ok(tongue(.5) >= 1);
  assert.equal(wolf(7).filter(c => c.name === "rotate").at(-1)!.args[0], .5, "o golpe passa do limite e a mandíbula não gira além");
});

test("o javali: a cabeça baixa 3 no golpe e os dentes de marfim sobem 2 a mais; o rato: os dentões descem 3 no golpe", () => {
  const boar = (bite: number) => record(c => drawWildBoar(c, BOAR, 1.3, motion({ bite }))).filter(c => c.name === "quadraticCurveTo").map(c => c.args);
  const tipY = (bite: number) => boar(bite).find(a => Math.abs(a[2]! - 39) < .01 && a[3]! < -24)![3]!;
  assert.ok(Math.abs(tipY(0) - tipY(1) - 2) < 1e-9, `o primeiro dente sobe 2 com o golpe (${tipY(0)} → ${tipY(1)})`);
  const rat = (bite: number) => record(c => drawGiantRat(c, RAT, 1.3, motion({ bite }))).filter(c => c.name === "lineTo" && Math.abs(c.args[0]! - 27) < .01);
  assert.equal(rat(0).length, 1);
  assert.ok(Math.abs(rat(1)[0]!.args[1]! - rat(0)[0]!.args[1]! - 3) < 1e-9, "o dentão desce 3 com o golpe");
});

test("a vida que falta: nenhum arranhão até 35 %, e ele aparece (mais fundo) depois; o lobo ganha mais cortes acima de 60 %", () => {
  for (const [name, draw, p] of CREATURES) {
    const strokes = (wound: number) => record(c => draw(c, p, 1.3, motion({ wound }))).filter(c => c.name === "stroke").length;
    assert.equal(strokes(.35), strokes(0), `${name}: até 35 % nada muda`);
    assert.ok(strokes(.5) > strokes(0), `${name}: com ferimento aparecem arranhões`);
  }
  const wolfStrokes = (w: number) => record(c => drawGrayWolf(c, WOLF, 1.3, motion({ wound: w }))).filter(c => c.name === "stroke").length;
  assert.equal(wolfStrokes(.7) - wolfStrokes(.5), 2, "o lobo ganha mais dois cortes no pescoço");
});

test("cada indivíduo tem a sua pelagem (a semente vem do id) e o mesmo indivíduo é sempre igual", () => {
  for (const [name, draw, p] of CREATURES) {
    assert.equal(sig(draw, p, motion({ seed: .3 })).signature, sig(draw, p, motion({ seed: .3 })).signature, `${name}: determinístico`);
    assert.notEqual(sig(draw, p, motion({ seed: .3 })).signature, sig(draw, p, motion({ seed: .9 })).signature, `${name}: outro indivíduo, outra pelagem`);
  }
});

test("as criaturas cabem na caixa da luz comum e ficam do tamanho que tinham (altura e largura medidas)", () => {
  const expected: Record<string, readonly [number, number]> = { wolf: [90, 50], boar: [76, 46], rat: [62, 36] };
  for (const [name, draw, p] of CREATURES) {
    const m = sig(draw, p, motion({ moving: 1, phase: 1 }));
    assert.ok(m.width <= 128 && m.height <= 90, `${name}: ${m.width}×${m.height} cabe na caixa 128×90`);
    assert.ok(m.width >= expected[name]![0]! * .7 && m.height >= expected[name]![1]! * .7, `${name}: ${m.width}×${m.height} tem corpo`);
  }
});

test("o kit de pelagem e as criaturas não usam sorteio nem relógio", () => {
  for (const f of ["shared/anatomy/fur", "center/wolves/grayWolf", "center/boars/wildBoar", "center/rats/giantRat"]) {
    const code = readFileSync(new URL(`../src/render/creatures/${f}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /Math\.random|Date\.now|performance\.now/, f);
    assert.doesNotMatch(code, /\bany\b\s*[,;)>\]=]|@ts-ignore/, f);
  }
});

test("a ordem de desenho: pernas distantes, tronco, pernas próximas (a cabeça por último), e as medidas de cada corpo", () => {
  const specs = { wolf: [11, -14, -17.5, 8, 4], boar: [12, -15, -13.4, 6.5, 3.2], rat: [8, -11, -9.8, 5, 2.4] } as const;
  for (const [name, draw, p, body] of CREATURES) {
    assert.deepEqual([body.frontHipX, body.rearHipX, body.hipY, body.stride, body.lift], specs[name], `${name}: onde nascem as pernas e a passada`);
    const list = record(c => draw(c, p, 1.3, motion({ moving: 1, phase: 1 })));
    const torso = list.findIndex(c => c.name === "bezierCurveTo");
    const mass = (from: number, to: number) => list.slice(from, to).filter(c => c.name === "ellipse" && [body.frontLeg.widthTop, body.rearLeg.widthTop].some(w => Math.abs(c.args[2]! - w * .78) < 1e-9)).map(c => c.args[0]!).sort((a, b) => a - b);
    assert.ok(torso > 0, `${name}: há tronco`);
    assert.deepEqual(mass(0, torso), [body.rearHipX - 1.5, body.frontHipX - 1.5], `${name}: as duas pernas distantes (um pouco atrás) antes do tronco`);
    assert.deepEqual(mass(torso, list.length), [body.rearHipX, body.frontHipX], `${name}: as duas pernas próximas depois do tronco`);
  }
});
