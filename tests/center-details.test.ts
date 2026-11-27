import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { drawVineSnake, CREATURE_PALETTE as SNAKE } from "../src/render/creatures/center/snakes/vineSnake.ts";
import { drawMossSlime, CREATURE_PALETTE as SLIME } from "../src/render/creatures/center/slimes/mossSlime.ts";
import { drawWalkingMushroom, CREATURE_PALETTE as MUSHROOM } from "../src/render/creatures/center/mushrooms/walkingMushroom.ts";
import { unit } from "../src/render/creatures/shared/anatomy/fur.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import type { CreatureMotion } from "../src/render/creatures/shared/creatureMotion.ts";
import type { Palette } from "../src/render/creatures/shared/southGeometry.ts";

/**
 * Etapa C3 (ADR 0093): cobra-cipó, slime de musgo e cogumelo andante com mais camadas de detalhe (escamas, gel por dentro, caule e chapéu), sem mexer no que o desenho
 * antigo já medido faz (língua, poça, boca, pés). Os testes medem a geometria das camadas novas, não a beleza.
 */
type Call = { name: string; args: number[] };
const record = (draw: (ctx: CanvasRenderingContext2D) => void): Call[] => {
  const out: Call[] = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push({ name, args: args.filter((a): a is number => typeof a === "number") }); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
};
const motion = (over: Partial<CreatureMotion> = {}): CreatureMotion => ({ seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...over });
const sig = (draw: typeof drawVineSnake, p: Palette, m: CreatureMotion, t = 1.3) => { const r = new Recorder(); return withFakeDocument(r, () => { draw(r.ctx, p, t, m); return r.metrics(); }); };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("cobra-cipó: cada segmento grosso tem a barriga em placas (um arco por baixo) e três escamas de costas; os finos da cauda não", () => {
  const list = record(c => drawVineSnake(c, SNAKE, 1.3, motion()));
  const scutes = list.filter(c => c.name === "arc" && near(c.args[3]!, Math.PI * .22) && near(c.args[4]!, Math.PI * .78));
  const backs = list.filter(c => c.name === "arc" && near(c.args[3]!, Math.PI) && near(c.args[4]!, Math.PI * 2));
  const radii = Array.from({ length: 16 }, (_, i) => 2.4 + Math.sin(Math.min(1, i / 15 * 1.15) * Math.PI * .55) * 4.2);
  assert.equal(scutes.length, radii.filter(r => r >= 3).length, `placas: ${scutes.length}, uma por segmento de raio ≥ 3`);
  assert.deepEqual(scutes.map(c => +c.args[2]!.toFixed(6)), radii.filter(r => r >= 3).map(r => +(r * .78).toFixed(6)), "o raio de cada placa é 78 % do raio do segmento");
  assert.equal(backs.length, scutes.length * 3, "três escamas de costas por segmento");
  assert.ok(scutes.every(c => c.args[2]! >= 3 * .78 - 1e-9), "o raio da placa é 78 % do raio do segmento");
  const wide = list.filter(c => c.name === "arc" && near(c.args[3]!, Math.PI * 1.1) && near(c.args[4]!, Math.PI * 1.95));
  assert.equal(wide.length, 3, "três escamas grandes na testa");
});

test("cobra-cipó: gavinhas com folha, nervura e gota nas folhas, brilho corrido nas costas, brilho nas escamas e fossetas no lábio", () => {
  const list = record(c => drawVineSnake(c, SNAKE, 1.3, motion()));
  assert.equal(list.filter(c => c.name === "bezierCurveTo" && c.args.length === 6).length >= 2, true);
  const tendrils = list.filter(c => c.name === "bezierCurveTo" && Math.abs(c.args[5]! - c.args[1]!) > 6 && c.args[1]! < c.args[5]! + 20);
  assert.ok(tendrils.length >= 2, "duas gavinhas saem das costas");
  const dew = list.filter(c => c.name === "ellipse" && near(c.args[2]!, .6) && near(c.args[3]!, .5));
  assert.ok(dew.length >= 3, `gota de orvalho nas folhas: ${dew.length}`);
  const pits = list.filter(c => c.name === "ellipse" && near(c.args[2]!, .3) && near(c.args[3]!, .3));
  assert.equal(pits.length, 4, "quatro fossetas de calor ao longo do lábio");
  const gloss = list.filter(c => c.name === "ellipse" && near(c.args[3]! * 2, c.args[2]!) && c.args[2]! > .5 && c.args[2]! < 2);
  assert.ok(gloss.length >= 10, `brilho das escamas: ${gloss.length}`);
  // a língua e o resto do que já era medido seguem iguais
  const tip = (bite: number) => Math.min(...record(c => drawVineSnake(c, SNAKE, 1.3, motion({ bite }))).filter(c => c.name === "lineTo").map(c => c.args[0]!));
  assert.ok(near(tip(0) - tip(1), 7));
  assert.ok(sig(drawVineSnake, SNAKE, motion()).signature !== sig(drawVineSnake, SNAKE, motion({ seed: .9 })).signature, "cada cobra tem o seu brilho");
});

test("slime de musgo: por dentro tem parede, núcleo escuro, cinco detritos, luz por baixo e gotas; andando, respingos ficam para trás", () => {
  const slime = (m: object, t = 1.3) => record(c => drawMossSlime(c, SLIME, t, motion(m)));
  const debris = (list: Call[]) => list.filter(c => c.name === "ellipse" && near(c.args[3]!, .5) && c.args[2]! >= 1.9 && c.args[2]! < 3);
  assert.equal(debris(slime({})).length, 5, "cinco detritos em suspensão");
  const drips = (list: Call[]) => list.filter(c => c.name === "ellipse" && near(c.args[2]!, .9) && (near(c.args[3]!, 1.6) || near(c.args[3]!, 2)));
  assert.equal(drips(slime({})).length, 2, "duas gotas pendem da beira");
  const splash = (m: object) => slime(m).filter(c => c.name === "ellipse" && c.args[0]! >= 12 && near(c.args[3]!, .8) && [1.2, 1, .8].some(r => near(c.args[2]!, r)));
  assert.equal(splash({ moving: 0 }).length, 0, "parado não respinga"); assert.equal(splash({ moving: .05 }).length, 0, "quase parado também não");
  assert.equal(splash({ moving: 1 }).length, 3, "andando, três respingos, cada um menor que o anterior");
  assert.ok(slime({}).filter(c => c.name === "createRadialGradient").length >= 2, "o núcleo tem o seu degradê, depois da poça");
  const rings = slime({}).filter(c => c.name === "ellipse" && c.args.length === 7 && c.args[0] === 0 && near(c.args[4]!, 0) && near(c.args[6]!, Math.PI * 2) && c.args[2]! > 12);
  assert.ok(rings.some(a => rings.some(b => near(a.args[2]! - b.args[2]!, 1.9) && near(a.args[3]! - b.args[3]!, 1.9) && near(a.args[1]!, b.args[1]!))), "o contorno de dentro fica 1,9 para dentro do de fora (a espessura da parede)");
  for (const t of [1, 2.4, 5.1]) {
    const core = slime({}, t).filter(c => c.name === "createRadialGradient")[2]!, cy = -14 * (1 + Math.sin(t * 2 + .3 * 5) * .05) + 1;
    assert.ok(near(core.args[1]! - 2 - cy, Math.sin(t * 1.4 + .3 * 7) * .8), `o núcleo flutua 0,8 com o tempo (${t})`);
  }
});

test("slime de musgo: franja de fibras no alto, trevos entre elas, sobrancelhas que mexem com o golpe e brilho no olho", () => {
  const slime = (m: object) => record(c => drawMossSlime(c, SLIME, 1.3, motion(m)));
  const fibres = slime({}).filter(c => c.name === "quadraticCurveTo" && c.args.length === 4 && c.args[3]! < c.args[1]! + 6);
  assert.ok(fibres.length >= 16 + 9, `fibras e lâminas de musgo: ${fibres.length}`);
  const clover = slime({}).filter(c => c.name === "ellipse" && near(c.args[2]!, 1.3) && near(c.args[3]!, .8));
  assert.equal(clover.length, 6, "dois trevos de três folhas");
  const brow = (bite: number) => slime({ bite }).filter(c => c.name === "quadraticCurveTo" && c.args.length === 4 && near(Math.abs(c.args[0]!), 6.4)).map(c => c.args[1]!);
  assert.equal(brow(0).length, 2, "duas sobrancelhas");
  assert.ok(near(brow(0)[0]! - brow(1)[0]!, 1), "no golpe a sobrancelha sobe 1 (o controle)");
  assert.equal(slime({}).filter(c => c.name === "ellipse" && near(c.args[2]!, .8) && near(c.args[3]!, .45)).length, 2, "o brilho de baixo de cada olho");
  assert.ok(sig(drawMossSlime, SLIME, motion({ moving: 1, phase: 1 })).signature !== sig(drawMossSlime, SLIME, motion({ moving: 0, phase: 1 })).signature);
});

test("cogumelo: terra e raízes nos pés, fibras no caule, anel de pele abaixo do chapéu, nervuras e pintas no chapéu, e os pés medidos antes seguem iguais", () => {
  const mush = (m: object) => record(c => drawWalkingMushroom(c, MUSHROOM, 1.3, motion(m)));
  const clumps = mush({}).filter(c => c.name === "ellipse" && c.args[2]! >= 2.4 && c.args[2]! < 3.9 && c.args[3]! >= 1.1 && c.args[3]! < 1.7 && c.args[1] === -.8);
  assert.equal(clumps.length, 4, "quatro torrões de terra na base");
  assert.deepEqual(clumps.map(c => c.args[0]), [-9.5, -2, 4.4, 10.4]);
  const skirt = mush({}).filter(c => c.name === "quadraticCurveTo" && near(c.args[1]!, -20.4) && near(c.args[3]!, -25.4));
  assert.equal(skirt.length, 1, "o anel de pele sai sob o chapéu");
  const ribs = mush({}).filter(c => c.name === "quadraticCurveTo" && near(c.args[1]!, -38) && near(c.args[3]!, -28.6));
  assert.equal(ribs.length, 11, "onze nervuras saem do alto do chapéu");
  const strokes = (m: object) => mush(m).filter(c => c.name === "stroke").length;
  assert.ok(strokes({}) > 60, `muita pelagem fina: ${strokes({})} traços`);
  const feet = (m: object) => mush(m).filter(c => c.name === "ellipse" && near(c.args[2]!, 5.4) && near(c.args[3]!, 3.2)).map(c => c.args[0]);
  assert.deepEqual(feet({}).sort((a, b) => a! - b!), [-6, -6, 6, 6], "parado, os pés ficam em ±6");
  assert.notEqual(sig(drawWalkingMushroom, MUSHROOM, motion({ seed: .3 })).signature, sig(drawWalkingMushroom, MUSHROOM, motion({ seed: .8 })).signature, "cada cogumelo tem as suas pintas");
  const seed = .3, sway = Math.sin(1.3 * 1.6 + seed * 5) * .5;
  const expected = Array.from({ length: 9 }, (_, k) => ({ x: (unit(seed, k * 2 + 1) - .5) * 36, y: -44 + unit(seed, k * 2 + 2) * 15, r: .8 + unit(seed, k + 30) * .7 })).filter(p => Math.abs(p.x) < 20 - Math.max(0, p.y + 33) * .9);
  const small = mush({}).filter(c => c.name === "ellipse" && near(c.args[3]!, .6));
  assert.ok(expected.length >= 4, "a semente dá ao menos quatro pintas dentro do chapéu");
  for (const p of expected) assert.ok(small.some(c => near(c.args[0]!, sway + p.x) && near(c.args[1]!, p.y) && near(c.args[2]!, p.r)), `pinta em ${p.x.toFixed(2)}, ${p.y.toFixed(2)}`);
  const eye = (rx: number, ry: number) => mush({}).filter(c => c.name === "ellipse" && near(c.args[2]!, rx) && near(c.args[3]!, ry)).length;
  assert.equal(eye(2.9, 2.6), 2, "o contorno dos dois olhos"); assert.equal(eye(2.1, 1.9), 2, "e o miolo");
});

test("as três cabem na caixa da luz comum, são determinísticas e as peças novas não usam sorteio nem relógio", () => {
  for (const [name, draw, p] of [["cobra", drawVineSnake, SNAKE], ["slime", drawMossSlime, SLIME], ["cogumelo", drawWalkingMushroom, MUSHROOM]] as const) {
    const m = sig(draw, p, motion({ moving: 1, phase: 1 }));
    assert.ok(m.width <= 128 && m.height <= 90 && m.width > 25, `${name}: ${m.width}×${m.height}`);
    assert.equal(sig(draw, p, motion()).signature, sig(draw, p, motion()).signature, `${name}: determinístico`);
  }
  for (const f of ["center/snakes/vineSnake", "center/slimes/mossSlime", "center/mushrooms/walkingMushroom"]) {
    const code = readFileSync(new URL(`../src/render/creatures/${f}.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(code, /Math\.random|Date\.now|performance\.now/, f); assert.doesNotMatch(code, /\bany\b\s*[,;)>\]=]|@ts-ignore/, f);
  }
});
