import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOUNT_IDS, type MountId } from "../src/actors/MountCatalog.ts";
import { IDLE_GAIT, RIDE_AMBIENT_FPS, RIDE_PHASE_STEPS, BOB, mountBob, stepRide, type MountRide } from "../src/render/creatures/shared/anatomy/gait.ts";
import { legPose } from "../src/render/creatures/shared/anatomy/limbs.ts";
import { drawQuadruped, quadrupedLegs } from "../src/render/creatures/shared/anatomy/quadruped.ts";
import { QUADRUPED_MOUNTS, mountRiderShiftX } from "../src/render/creatures/mounts/quadrupeds.ts";
import { saddleCenterX } from "../src/render/creatures/mounts/saddle.ts";
import { RIDE_PHASE_PER_WALK, resetRideMemory, rideOf, riderPose } from "../src/render/hero/ride.ts";
import { renderMount } from "../src/render/mounts.ts";
import { PALETTES } from "../src/render/creatures/mounts/geometry.ts";
import { renderSandBasiliskDetail } from "../src/render/creatures/mounts/sandBasilisk.ts";
import { renderCargoBeetleDetail } from "../src/render/creatures/mounts/cargoBeetle.ts";
import { renderHero } from "../src/render/actors.ts";
import { resetSmoothing } from "../src/render/animation.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";

/**
 * O herói montado (ADR 0092): a montaria olha para onde o herói olha, anda só quando ele anda e o lombo sobe e desce; o herói senta, leva a rédea e acompanha o lombo.
 */
const TAU = Math.PI * 2;
const ride = (over: Partial<MountRide> = {}): MountRide => ({ phase: 0, moving: 1, facing: 1, ...over });
const calls = (draw: (ctx: CanvasRenderingContext2D) => void): Array<{ name: string; args: number[] }> => {
  const out: Array<{ name: string; args: number[] }> = [];
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { out.push({ name, args: args.filter((a): a is number => typeof a === "number") }); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return out;
};
const signature = (id: MountId, r?: MountRide, t = 1) => { const rec = new Recorder(); return withFakeDocument(rec, () => { renderMount(rec.ctx, id, 0, 0, t, r); return rec.metrics().signature; }); };
const hero = (extra: object, ridden?: MountRide) => calls(c => renderHero(c, { faceX: 0, faceY: 1, walkTime: 0, attackTime: 0, vx: 0, vy: 0, id: "h", equippedWeapon: "starter", ...extra, ride: ridden }, 0, 0, 1));
const boots = (list: ReturnType<typeof hero>) => list.filter(c => c.name === "ellipse" && c.args[2] === 4.4 && c.args[3] === 2.5).map(c => [c.args[0]!, c.args[1]!]);
const hands = (list: ReturnType<typeof hero>) => list.filter(c => c.name === "ellipse" && c.args[2] === 2.4 && c.args[3] === 2.4).map(c => [c.args[0]!, c.args[1]!]);
const shadow = (list: ReturnType<typeof hero>) => list.filter(c => c.name === "createRadialGradient" && c.args[0] === 0 && c.args[1] === 0 && c.args[3] === 0 && c.args[4] === 0).length;

test("a passada montada vai em 12 posições por volta e o movimento em décimos; entradas ruins viram zero, sem NaN", () => {
  assert.equal(RIDE_PHASE_STEPS, 12);
  assert.deepEqual(stepRide(ride({ phase: .1, moving: .44 })), { phase: 0, moving: .4, facing: 1 });
  const s = stepRide(ride({ phase: TAU / 12 * 5.4, moving: .96, facing: -1 }));
  assert.ok(Math.abs(s.phase - TAU / 12 * 5) < 1e-9 && s.moving === 1 && s.facing === -1);
  assert.equal(stepRide(ride({ phase: TAU * 3 + TAU / 12 })).phase, stepRide(ride({ phase: TAU / 12 })).phase, "voltas inteiras não mudam a posição");
  assert.ok(stepRide(ride({ phase: TAU - .01 })).phase === 0, "a última posição fecha a volta em vez de chegar a 2π");
  assert.equal(stepRide(ride({ phase: -TAU / 12 })).phase, TAU / 12 * 11, "fase negativa dá a volta");
  const bad = stepRide({ phase: Number.NaN, moving: Number.POSITIVE_INFINITY, facing: 1 });
  assert.deepEqual([bad.phase, bad.moving], [0, 0]);
  assert.equal(stepRide(ride({ moving: 7 })).moving, 1); assert.equal(stepRide(ride({ moving: -3 })).moving, 0);
  assert.equal(stepRide({ phase: 0, moving: 1, facing: 0 as 1 }).facing, 1);
  assert.deepEqual(stepRide(stepRide(ride({ phase: 2.2, moving: .37 }))), stepRide(ride({ phase: 2.2, moving: .37 })), "arredondar de novo não muda nada");
});

test("o lombo sobe no meio do apoio, desce na troca, e fica parado quando a montaria para", () => {
  assert.equal(BOB, 1.1);
  assert.equal(mountBob({ phase: Math.PI / 2, moving: 1 }), -1.1);
  assert.equal(mountBob({ phase: 3 * Math.PI / 2, moving: 1 }), -1.1, "o outro apoio sobe igual");
  assert.equal(mountBob({ phase: 0, moving: 1 }), -0);
  assert.equal(mountBob({ phase: Math.PI / 2, moving: 0 }), -0, "parada, o lombo não balança");
  assert.ok(Math.abs(mountBob({ phase: Math.PI / 2, moving: .5 }) + .55) < 1e-9);
  assert.equal(mountBob({ phase: Number.NaN, moving: 1 }), -0);
  assert.deepEqual(IDLE_GAIT, { phase: 0, moving: 0 });
});

test("parada, a montaria não marcha no lugar: as patas ficam na pose de apoio, sem balanço nem altura; andando, balançam", () => {
  for (const id of Object.keys(QUADRUPED_MOUNTS) as Array<keyof typeof QUADRUPED_MOUNTS>) {
    const body = QUADRUPED_MOUNTS[id].body;
    for (const { spec, phase } of quadrupedLegs(body, 1.7, 0)) {
      assert.equal(spec.stride, 0, `${id}: balanço`); assert.equal(spec.lift, 0, `${id}: altura`);
      const foot = legPose(spec, phase).foot;
      assert.ok(Math.abs(foot[0] - spec.hipX) < 1e-9, `${id}: o pé fica embaixo do quadril`);
    }
    for (const { spec } of quadrupedLegs(body, 1.7, 1)) { assert.equal(spec.stride, body.stride); assert.equal(spec.lift, body.lift); }
    assert.equal(quadrupedLegs(body, 1.7, .5)[0]!.spec.stride, body.stride * .5, `${id}: meio movimento, meio balanço`);
  }
  for (const id of MOUNT_IDS) {
    const idleA = signature(id, ride({ moving: 0, phase: 0 })), idleB = signature(id, ride({ moving: 0, phase: Math.PI }));
    assert.equal(idleA, idleB, `${id}: parada, a fase não muda o desenho`);
    if (id !== "tidal-hippocampus") assert.notEqual(signature(id, ride({ moving: 1, phase: 0 })), signature(id, ride({ moving: 1, phase: Math.PI / 2 })), `${id}: andando, a passada anda`);
    assert.notEqual(signature(id, ride({ moving: 1, phase: Math.PI / 2 })), idleA, `${id}: andando difere de parada`);
  }
});

test("a montaria olha para onde o herói olha: o lado esquerdo espelha só o desenho (a luz e a sombra não viram)", () => {
  for (const id of MOUNT_IDS) {
    const right = calls(c => renderMount(c, id, 0, 0, 1, ride({ facing: 1 }))), left = calls(c => renderMount(c, id, 0, 0, 1, ride({ facing: -1 })));
    assert.equal(right.filter(c => c.name === "scale" && c.args[0] === -1).length, 0, `${id}: à direita não espelha`);
    assert.equal(left.filter(c => c.name === "scale" && c.args[0] === -1 && c.args[1] === 1).length, 1, `${id}: à esquerda espelha uma vez`);
    assert.equal(left.length, right.length + 1, `${id}: o resto do desenho é o mesmo`);
    // a sombra no chão é desenhada antes e fora do espelho
    assert.ok(left.findIndex(c => c.name === "createRadialGradient") < left.findIndex(c => c.name === "scale" && c.args[0] === -1), `${id}: a sombra não espelha`);
  }
  assert.notEqual(signature("warhorse", ride({ facing: -1 })), signature("warhorse", ride({ facing: 1 })));
});

test("sem `ride` a montaria anda com o relógio como sempre (cavalo selvagem e o que segue o herói)", () => {
  for (const id of MOUNT_IDS) {
    assert.equal(signature(id, undefined, 1.2), signature(id, undefined, 1.2));
    if (id !== "tidal-hippocampus") assert.notEqual(signature(id, undefined, 1.2), signature(id, undefined, 1.5), id);
    assert.equal(calls(c => renderMount(c, id, 0, 0, 1.2)).filter(c => c.name === "scale" && c.args[0] === -1).length, 0, `${id}: sem espelho`);
  }
});

test("a montaria montada entra em quadros: a mesma posição, lado e movimento voltam do cache e o resto refaz", () => {
  assert.equal(RIDE_AMBIENT_FPS, 6);
  const src = readFileSync(new URL("../src/render/mounts.ts", import.meta.url), "utf8");
  assert.match(src, /mount\|\$\{id\}\|r\|\$\{Math\.round\(stepped\.phase\/\(Math\.PI\*2\)\*RIDE_PHASE_STEPS\)\}\|\$\{stepped\.moving\}\|\$\{stepped\.facing\}\|\$\{Math\.round\(t\*RIDE_AMBIENT_FPS\)\}/, "a chave tem a posição, o movimento, o lado e o quadro de enfeite");
  assert.match(src, /group:`mount\|\$\{id\}`/);
});

test("rideOf: a fase vem da distância andada, o movimento acompanha a velocidade e o lado não volta para a direita ao subir ou descer", () => {
  resetRideMemory(); resetSmoothing();
  const still = rideOf({ faceX: 1, walkTime: 0, vx: 0, vy: 0 }, "a", 10);
  assert.deepEqual(still, { phase: 0, moving: 0, facing: 1 });
  const left = rideOf({ faceX: -1, walkTime: 2, vx: -90, vy: 0 }, "a", 10.02);
  assert.equal(left.facing, -1); assert.ok(Math.abs(left.phase - 2 * RIDE_PHASE_PER_WALK) < 1e-12); assert.equal(RIDE_PHASE_PER_WALK, .9);
  assert.ok(left.moving > 0 && left.moving < 1, "o movimento sobe aos poucos, não de uma vez");
  assert.equal(rideOf({ faceX: 0, walkTime: 2, vx: 0, vy: 90 }, "a", 10.04).facing, -1, "subindo ou descendo, mantém o lado em que olhava");
  assert.equal(rideOf({ faceX: .2, walkTime: 2, vx: 0, vy: 90 }, "a", 10.06).facing, -1, "um olhar quase de frente não vira a montaria");
  assert.equal(rideOf({ faceX: .5, walkTime: 2, vx: 50, vy: 0 }, "a", 10.08).facing, 1, "só um olhar claro para a direita vira");
  assert.equal(rideOf({ faceX: 0, walkTime: 0, vx: 0, vy: 0 }, "outro", 10).facing, 1, "cada herói começa olhando para a direita");
  let m = 0; for (let k = 0; k < 120; k++) m = rideOf({ faceX: 1, walkTime: k, vx: 120, vy: 0 }, "b", 20 + k / 60).moving;
  assert.ok(m > .98, "andando de verdade, chega a 1");
  for (let k = 0; k < 120; k++) m = rideOf({ faceX: 1, walkTime: 0, vx: 0, vy: 0 }, "b", 22 + k / 60).moving;
  assert.ok(m < .02, "parou, volta a 0");
  const bad = rideOf({ faceX: Number.NaN, walkTime: Number.NaN, vx: Number.NaN, vy: undefined }, "c", 1);
  assert.deepEqual([bad.phase, bad.moving, bad.facing], [0, 0, 1]);
});

test("riderPose: sobe com o lombo, inclina para a frente só andando, a mão e a canela oscilam", () => {
  const still = riderPose(ride({ moving: 0 }));
  assert.deepEqual([still.bob, still.lean, still.hand, still.leg], [-0, 0, 0, 0]);
  // fase π/4 cai na posição 2 de 12 (60°) e o corpo usa essa mesma posição que a montaria desenha
  const run = riderPose(ride({ phase: Math.PI / 4 })), s60 = Math.sin(Math.PI / 3);
  assert.ok(Math.abs(run.bob + 1.1 * s60) < 1e-12, `corpo ${run.bob}`);
  assert.equal(run.bob, mountBob(stepRide(ride({ phase: Math.PI / 4 }))), "o corpo sobe o mesmo que a montaria");
  assert.equal(run.lean, .05);
  const wave = Math.sin(2 * Math.PI / 3);
  assert.ok(Math.abs(run.hand - wave * .5) < 1e-12, `mão ${run.hand}`);
  assert.ok(Math.abs(run.leg - wave * .6) < 1e-12, `canela ${run.leg}`);
  assert.equal(riderPose(ride({ moving: .5 })).lean, .025, "inclina na proporção do movimento");
  assert.deepEqual(riderPose(ride({ phase: 1.0 })), riderPose(stepRide(ride({ phase: 1.0 }))), "usa os mesmos degraus da montaria");
});

test("o herói montado está sentado na sela: coxa para a frente, canela pendurada com a bota no estribo, mão na rédea e sem sombra própria; a pé nada disso muda", () => {
  const near = (a: readonly number[], b: readonly number[], msg: string) => assert.ok(a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) < 1e-9), `${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
  const seated = (facing: 1 | -1, over: object = {}) => hero(over, ride({ phase: 0, moving: 1, facing }));
  for (const f of [1, -1] as const) {
    const list = seated(f), feet = boots(list);
    assert.equal(feet.length, 1, "uma só bota: a outra perna fica atrás do corpo da montaria");
    near(feet[0]!, [7.8 * f, 4.8], `bota à frente da montaria (${f})`);
    // a coxa sai do assento (quadril em y −7,5) para o joelho à frente, e a canela desce dele até o tornozelo
    const thigh = list.filter(c => c.name === "moveTo" && c.args[0] === 0 && c.args[1] === -7.5);
    assert.equal(thigh.length, 1, "a coxa nasce no assento");
    near(list[list.indexOf(thigh[0]!) + 1]!.args, [7 * f, -5], "e vai ao joelho, à frente");
    const shin = list.find(c => c.name === "moveTo" && c.args[0] === 7 * f && c.args[1] === -5)!;
    near(list[list.indexOf(shin) + 1]!.args, [6.2 * f, 3.2], "a canela desce do joelho até o tornozelo, onde a bota entra");
    // quem monta senta para o lado da montaria, não para onde olha
    assert.equal(hero({ faceX: -f, faceY: 0 }, ride({ phase: 0, moving: 1, facing: f })).filter(c => c.name === "moveTo" && c.args[0] === 0 && c.args[1] === -7.5).length, 1);
    near(boots(hero({ faceX: -f, faceY: 0 }, ride({ phase: 0, moving: 1, facing: f })))[0]!, [7.8 * f, 4.8], "e a bota continua à frente da montaria");
    // as mãos vão para a frente, na altura da rédea
    const reins = hands(list);
    assert.ok(reins.length >= 1, "há mão na rédea");
    for (const h of reins) { assert.ok(Math.abs(h[1]! + 15.2) < 1e-9, `altura da rédea ${h[1]}`); assert.ok(Math.abs(h[0]! - (3.2 * f + 4.4 * Math.sign(h[0]! - 3.2 * f))) < 1e-9, `mão à frente: ${h[0]}`); }
    assert.ok(reins.every(h => Math.abs(h[0]! - 3.2 * f) <= 4.4 + 1e-9), "as mãos ficam deslocadas para a frente, para onde a montaria olha");
  }
  const walkTimes = [0, 1, 2, 3].map(w => JSON.stringify(boots(hero({ walkTime: w, vx: 70 }, ride({ phase: 0, moving: 1 })))));
  assert.equal(new Set(walkTimes).size, 1, "o ciclo de passos do herói a pé não mexe na perna dele montado");
  assert.equal(boots(hero({ walkTime: 1, vx: 70, vy: 0 })).length, 2, "a pé, as duas pernas aparecem");
  assert.equal(shadow(seated(1)), 0, "a sombra é a da montaria"); assert.equal(shadow(hero({})), 1, "a pé, o herói tem a própria sombra");
  assert.ok(Math.abs(hands(hero({}, ride({ phase: Math.PI / 4, moving: 1 })))[0]![1]! + 15.2 - riderPose(ride({ phase: Math.PI / 4 })).hand) < 1e-9, "a mão sobe e desce com a montaria");
  const leg = riderPose(ride({ phase: Math.PI / 4 })).leg, moving = hero({}, ride({ phase: Math.PI / 4, moving: 1 }));
  const kneeY = moving.find(c => c.name === "lineTo" && c.args[0] === 7 && Math.abs(c.args[1]! - (-5 + leg * .5)) < 1e-9);
  assert.ok(leg !== 0 && kneeY, "o joelho sobe e desce metade do que a canela");
  const bootY = (phase: number) => boots(hero({}, ride({ phase, moving: 1 })))[0]![1]!;
  assert.ok(Math.abs(bootY(Math.PI / 4) - (4.8 + riderPose(ride({ phase: Math.PI / 4 })).leg)) < 1e-9, "a canela acompanha a passada");
});

test("o herói sobe e desce com o lombo da montaria e o golpe quase não o tira da sela", () => {
  const bob = (phase: number) => hero({ vx: 70 }, ride({ phase, moving: 1 })).filter(c => c.name === "translate" && c.args[0] === 0 && Math.abs(c.args[1]!) <= 1.1 + 1e-9 && c.args[1]! < 0).map(c => c.args[1]);
  assert.ok(bob(Math.PI / 2).includes(-1.1), "no apoio o corpo está no alto");
  assert.ok(!bob(0).includes(-1.1));
  // golpe: a pé o corpo avança; montado, avança 30 %
  const lunge = (ridden?: MountRide) => { const t = hero({ attackTime: .12, faceX: 1, faceY: 0, attackWeapon: "starter" }, ridden).find(c => c.name === "translate")!; return Math.abs(t.args[0]!); };
  assert.ok(lunge(undefined) > 0.5, "a pé o golpe avança o corpo");
  assert.ok(Math.abs(lunge(ride({ moving: 0 })) - lunge(undefined) * .3) < 1e-9, "montado, avança 30 %");
});

test("o cavaleiro senta no centro da sela de cada montaria, e o lado da sela espelha com ela", () => {
  const expected: Record<MountId, number> = { warhorse: -2, "mountain-goat": -1.5, "imperial-elk": -2, "silver-unicorn": -2, "fire-lion": -2, "cavern-bear": -2, "dark-griffin": -2, "sand-basilisk": -2.5, "cargo-beetle": 0, "tidal-hippocampus": 0 };
  assert.deepEqual(MOUNT_IDS.map(id => mountRiderShiftX(id)), MOUNT_IDS.map(id => expected[id]));
  for (const id of Object.keys(QUADRUPED_MOUNTS) as Array<keyof typeof QUADRUPED_MOUNTS>) assert.equal(mountRiderShiftX(id), saddleCenterX(QUADRUPED_MOUNTS[id].body.torso), id);
  const scene = readFileSync(new URL("../src/ui/CanvasScene.ts", import.meta.url), "utf8");
  assert.match(scene, /rideOf\(player, "player", time\)/); assert.match(scene, /renderMount\(ctx,mount,player\.x-left,player\.y-top,time,ride\)/);
  assert.match(scene, /player\.x-left\+\(mount&&ride\?mountRiderShiftX\(mount\)\*ride\.facing:0\)/, "o herói senta do lado certo quando a montaria olha para a esquerda");
});

test("as pernas e o corpo seguem a fase dada (e não o relógio): o tronco sobe e desce, as patas se mexem, e os enfeites vão junto", () => {
  const key = (list: ReturnType<typeof calls>) => list.map(c => c.name + c.args.join(",")).join("|");
  const bob = (list: ReturnType<typeof calls>, y: number) => list.filter(c => c.name === "translate" && c.args[0] === 0 && c.args[1] === y).length;
  for (const id of Object.keys(QUADRUPED_MOUNTS) as Array<keyof typeof QUADRUPED_MOUNTS>) {
    const body = QUADRUPED_MOUNTS[id].body, p = PALETTES[id];
    const at = (phase: number, moving: number, time = 1) => calls(c => drawQuadruped(c, p, body, time, undefined, { phase, moving }));
    assert.notEqual(key(at(Math.PI / 2, 1)), key(at(3 * Math.PI / 2, 1)), `${id}: o mesmo balanço do lombo, mas as patas em outra posição`);
    assert.equal(key(at(Math.PI / 2, 1, 1)), key(at(Math.PI / 2, 1, 7)), `${id}: com a fase dada, o relógio não conta`);
    assert.equal(bob(at(Math.PI / 2, 1), -1.1), 1, `${id}: o tronco sobe 1,1`);
    assert.equal(bob(at(Math.PI / 2, 0), -1.1), 0, `${id}: parado não sobe`);
    // a montaria inteira: tronco, enfeites da frente e sela sobem juntos
    const whole = calls(c => renderMount(c, id, 0, 0, 1, ride({ phase: Math.PI / 2, moving: 1 })));
    assert.equal(bob(whole, -1.1), 2, `${id}: o tronco e os enfeites com a sela sobem`);
    assert.equal(bob(calls(c => renderMount(c, id, 0, 0, 1, ride({ phase: Math.PI / 2, moving: 0 }))), -1.1), 0);
  }
  for (const [name, draw] of [["lagarto", renderSandBasiliskDetail], ["besouro", renderCargoBeetleDetail]] as const) {
    const at = (phase: number, moving: number) => key(calls(c => draw(c, 1, { phase, moving })));
    assert.notEqual(at(Math.PI / 2, 1), at(3 * Math.PI / 2, 1), `${name}: as patas seguem a fase`);
    assert.equal(at(Math.PI / 2, 0), at(3 * Math.PI / 2, 0), `${name}: parado, a fase não conta`);
    assert.notEqual(at(0, 1), key(calls(c => draw(c, 1))), `${name}: sem fase anda com o relógio, que é outra passada`);
  }
  assert.equal(bob(calls(c => renderMount(c, "sand-basilisk", 0, 0, 1, ride({ phase: Math.PI / 2, moving: 1 }))), -1.1), 1, "o lagarto sobe por inteiro");
});

test("rideOf com passo de velocidade meio a meio dá meio movimento, e o herói usa os mesmos degraus que a montaria", () => {
  resetRideMemory(); resetSmoothing();
  assert.equal(rideOf({ faceX: 1, walkTime: 0, vx: 35, vy: 0 }, "meio", 5).moving, .5, "metade da velocidade de caminhada, metade do movimento (curva suave)");
  assert.equal(rideOf({ faceX: 1, walkTime: 0, vx: 70, vy: 0 }, "cheio", 5).moving, 1);
  const a = hero({ vx: 70 }, ride({ phase: .01, moving: .96 })), b = hero({ vx: 70 }, ride({ phase: 0, moving: 1 }));
  assert.deepEqual(a, b, "o herói arredonda a fase e o movimento como a montaria");
  assert.ok(hero({ vx: 70 }, ride({ phase: Math.PI / 2 + .05, moving: 1 })).some(c => c.name === "translate" && c.args[1] === -1.1), "e sobe exatamente o que a montaria sobe");
});
