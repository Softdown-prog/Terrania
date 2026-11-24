import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { STAVES } from "../src/engine/character/Staves.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { ClassicCombat } from "../src/engine/combat/ClassicCombat.ts";
import { Effects } from "../src/render/Effects.ts";
import { renderHero } from "../src/render/actors.ts";
import { attackBody, staffMount, staffTip, STAFF_LEAN } from "../src/render/heroPose.ts";
import { drawMageStaff } from "../src/render/staves.ts";
import { STAFF_GEM_REACH, STAFF_GEM_Y, STAFF_TOP_Y } from "../src/render/staves/shaft.ts";
import { paintStaffHead } from "../src/render/staves/head.ts";
import { drawSpellBolt } from "../src/render/spells/bolt.ts";
import { drawSpellBurst } from "../src/render/spells/burst.ts";
import { NO_CAST, castBody, castPhase } from "../src/render/spells/castPose.ts";
import { BOLT_LABEL_LIFE, BOLT_MAX_FLIGHT, BOLT_MIN_FLIGHT, BURST_LIFE, KILL_BURST_LIFE, SpellBolts } from "../src/render/spells/SpellBolts.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * A conjuração do Mago que se vê (ADR 0070): a pose de conjurar (a mão recua e sobe, o cajado avança para o alvo), a gema que acende, o
 * projétil que voa até o alvo e o estouro com o número do dano. Só apresentação: a simulação já aplicou o dano.
 */
const SEED = 842136, DT = 1 / 60, STILL = { x: 0, y: 0 }, STAFF = STAVES.apprentice, WINDUP = STAFF.windup, GEM = STAFF.visual.gem;
const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;
/** Se o desenho usou a cor, escrita como #rrggbb ou como rgba() (os brilhos são translúcidos). */
const usesColor = (s: ReturnType<typeof spy>, hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return s.raw.some(c => c.toLowerCase() === hex || c.replace(/\s/g, "").startsWith(`rgba(${r},${g},${b},`));
};
/** O tempo restante do golpe quando já passaram `elapsed` segundos dele. */
const left = (elapsed: number): number => ATTACK_DURATION - elapsed;

function caster(extra: Partial<Player> = {}): Player {
  const p = new Player(); p.x = 100; p.y = 100; p.faceX = 1; p.faceY = 0; p.attackStaff = "apprentice"; p.attackTime = left(WINDUP + 0.02); p.attackWindup = WINDUP;
  return Object.assign(p, extra);
}
const mobAt = (x: number, hp: number, id = "m1", y = 100) => ({ id, x, y, hp });

test("as fases da conjuração: a carga sobe no preparo, o cajado avança na saída, e fora da conjuração tudo é zero", () => {
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.deepEqual(castPhase(bad, WINDUP), NO_CAST, `tempo ${bad}`);
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.deepEqual(castPhase(0.1, bad), NO_CAST, `preparo ${bad}`);
  assert.equal(NO_CAST.active, false);
  const start = castPhase(left(0), WINDUP), mid = castPhase(left(WINDUP / 2), WINDUP), ready = castPhase(left(WINDUP), WINDUP);
  assert.deepEqual([start.charge, start.thrust, start.flash, start.active], [0, 0, 0, true], "no primeiro instante a carga é zero");
  assert.ok(mid.charge > 0.2 && mid.charge < 0.8 && mid.thrust === 0, "no meio do preparo a carga está subindo e nada avançou");
  assert.deepEqual([ready.charge, ready.thrust], [1, 0], "na saída a carga está cheia");
  let last = -1;
  for (let i = 0; i <= 20; i++) { const c = castPhase(left((WINDUP * i) / 20), WINDUP).charge; assert.ok(c >= last, "a carga só sobe no preparo"); last = c; }
  const out = castPhase(left(WINDUP + 0.02), WINDUP), later = castPhase(left(WINDUP + 0.1), WINDUP), end = castPhase(0.0001, WINDUP);
  assert.ok(out.thrust > 0 && out.flash > 0.5, "logo depois da saída o cajado avança e há clarão");
  assert.ok(later.flash < out.flash && later.charge < 1, "depois o clarão e a carga baixam");
  assert.ok(end.thrust < 0.05 && end.flash === 0 && end.charge === 0, "no fim da conjuração tudo voltou");
  assert.deepEqual(castPhase(5, WINDUP), start, "um tempo maior que a conjuração vale o início");
  let peak = 0; for (let i = 1; i < 40; i++) peak = Math.max(peak, castPhase(left(WINDUP + ((ATTACK_DURATION - WINDUP) * i) / 40), WINDUP).thrust);
  assert.ok(peak > 0.6 && peak <= 1, "o avanço chega perto do máximo no meio da saída");
});

test("o corpo na conjuração: um passo curto para trás no preparo e um balanço para a frente, bem menor que o golpe de espada", () => {
  assert.deepEqual(castBody(0, WINDUP), { lunge: 0, impact: 0 }); assert.deepEqual(castBody(Number.NaN, WINDUP), { lunge: 0, impact: 0 });
  const back = castBody(left(WINDUP / 2), WINDUP), forward = castBody(left(WINDUP + 0.06), WINDUP);
  assert.ok(back.lunge < 0 && back.lunge >= -0.31 && back.impact === 0, "recua no preparo");
  assert.ok(forward.lunge > 0 && forward.lunge <= 0.41, "avança na saída");
  assert.ok(castBody(left(WINDUP + 0.01), WINDUP).impact > 0.5, "o impacto pulsa logo depois da saída");
  let sword = 0, cast = 0;
  for (let i = 1; i < 28; i++) { const t = left(i * 0.01); sword = Math.max(sword, Math.abs(attackBody(t, "starter").lunge)); cast = Math.max(cast, Math.abs(castBody(t, WINDUP).lunge)); }
  assert.ok(cast < sword * 0.6, "o balanço do mago é bem menor que o do cavaleiro");
  assert.ok(near(castBody(left(WINDUP), WINDUP).lunge, 0, 1e-6), "no instante da saída o corpo está parado (não desloca o alcance)");
});

test("a mão do Mago: parada é a pose de sempre; conjurando recua e sobe no preparo e avança para o alvo na saída", () => {
  const rest = staffMount({ faceX: 1, faceY: 0 }, 0);
  assert.deepEqual([rest.ox, rest.oy, rest.rot, rest.hand], [10.2, -14.6, STAFF_LEAN, 1]); assert.deepEqual(staffMount({ faceX: -1 }, 0.1), { ox: -10.2, oy: -14.6, rot: -STAFF_LEAN + 0.1, hand: -1, gripX: -10.2, gripY: -14.6 });
  assert.deepEqual(staffMount({ faceX: 1, faceY: 0 }, 0, NO_CAST), rest, "sem conjuração, nada muda");
  const charged = staffMount({ faceX: 1, faceY: 0 }, 0, { charge: 1, thrust: 0, flash: 0, active: true });
  assert.ok(charged.oy < rest.oy - 2, "a mão sobe no preparo"); assert.ok(charged.ox < rest.ox, "e recua"); assert.ok(charged.rot < rest.rot - 0.3, "e o cajado se inclina para trás");
  const thrust = staffMount({ faceX: 1, faceY: 0 }, 0, { charge: 0, thrust: 1, flash: 0, active: true });
  assert.ok(thrust.ox > rest.ox + 2 && thrust.rot > rest.rot + 0.9, "na saída o cajado vai para a frente, na direção do alvo");
  const push = staffMount({ faceX: 0, faceY: 1 }, 0, { charge: 0, thrust: 1, flash: 0, active: true });
  assert.ok(near(push.oy, -14.6 + 1.8) && near(push.ox, 10.2), "de frente, só avançando: a mão desce para o lado do observador"); assert.ok(near(staffMount({ faceX: 0, faceY: -1 }, 0, { charge: 0, thrust: 1, flash: 0, active: true }).oy, -14.6 - 1.8), "e de costas, sobe");
  const left_ = staffMount({ faceX: -1, faceY: 0 }, 0, { charge: 0, thrust: 1, flash: 0, active: true });
  assert.ok(left_.rot < staffMount({ faceX: -1 }, 0).rot - 0.9 && left_.ox < -10.2, "para a esquerda é o espelho");
  const down = staffMount({ faceX: 0, faceY: 1 }, 0, { charge: 1, thrust: 1, flash: 0, active: true });
  assert.ok(near(down.rot, rest.rot), "de frente ou de costas o cajado não gira de lado"); assert.ok(down.oy < rest.oy + 3 && down.oy !== rest.oy, "mas a mão sobe e avança");
  assert.ok(near(charged.gripX, charged.ox) && near(charged.gripY, charged.oy), "o braço segue a mão: a empunhadura é a origem");
  assert.ok(near(thrust.gripX, thrust.ox) && near(thrust.gripY, thrust.oy));
});

test("de onde sai a magia: a ponta do cajado é o centro da gema, e acompanha a inclinação", () => {
  assert.equal(STAFF_GEM_Y, STAFF_TOP_Y - 7.4); assert.equal(STAFF_GEM_REACH, -STAFF_GEM_Y); assert.ok(near(STAFF_GEM_REACH, 33.4));
  const upright = { ox: 5, oy: -10, rot: 0, hand: 1, gripX: 5, gripY: -10 }, tip = staffTip(upright);
  assert.ok(near(tip.x, 5) && near(tip.y, -10 - STAFF_GEM_REACH), "em pé, a gema está direto acima da mão");
  const tilted = staffTip({ ...upright, rot: Math.PI / 2 });
  assert.ok(near(tilted.x, 5 + STAFF_GEM_REACH) && near(tilted.y, -10, 1e-9), "deitado para a direita, a gema está à direita da mão");
  const back = staffTip({ ...upright, rot: -Math.PI / 2 }); assert.ok(back.x < 5 - 33);
  const gemDrawn = spy(c => paintStaffHead(c, STAFF.visual, x => x, 0));
  const centre = gemDrawn.args.moveTo?.find(a => a.length === 2 && a[1] === STAFF_GEM_Y - 4.6);
  assert.ok(centre, "a ponta de cima da gema desenhada fica 4,6 acima do centro que a magia usa");
});

test("a gema carregando: com 0 é o desenho de antes; com carga a auréola cresce, a gema acende e as faíscas giram", () => {
  const plain = signature(c => paintStaffHead(c, STAFF.visual, x => x, 1));
  assert.equal(signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, 0)), plain, "carga 0 não muda nada");
  for (const bad of [Number.NaN, -3, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) assert.equal(signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, bad)), plain, `carga ${bad} vale 0`);
  assert.equal(signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, 9)), signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, 1)), "acima de 1 vale 1");
  const half = spy(c => paintStaffHead(c, STAFF.visual, x => x, 1, 0.5)), full = spy(c => paintStaffHead(c, STAFF.visual, x => x, 1, 1)), none = spy(c => paintStaffHead(c, STAFF.visual, x => x, 1, 0));
  assert.ok((full.calls.createRadialGradient ?? 0) > (none.calls.createRadialGradient ?? 0), "uma auréola a mais");
  assert.ok((full.calls.ellipse ?? 0) >= (none.calls.ellipse ?? 0) + 5, "o núcleo claro e as quatro faíscas");
  assert.notEqual(signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, 0.5)), signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, 1)), "mais carga, mais brilho");
  const maxR = (s: ReturnType<typeof spy>): number => Math.max(...(s.args.arc ?? [[0]]).map(a => a[2] ?? 0));
  assert.ok(maxR(full) > maxR(half) && maxR(half) > maxR(none), "a auréola cresce com a carga");
  const haloR = (s: ReturnType<typeof spy>): number => Math.max(...(s.args.createRadialGradient ?? [[0]]).map(a => a[5] ?? 0));
  assert.ok(haloR(full) > haloR(half) && haloR(half) > haloR(none), "e o brilho que a acompanha também");
  const sparks = (time: number): number[][] => (spy(c => paintStaffHead(c, STAFF.visual, x => x, time, 1)).args.ellipse ?? []).slice(-4);
  assert.notDeepEqual(sparks(1), sparks(1.2), "as quatro faíscas giram com o relógio"); assert.equal(sparks(1).length, 4, "são quatro");
  assert.deepEqual((spy(c => paintStaffHead(c, STAFF.visual, x => x, 1, 0)).args.ellipse ?? []).length + 5, (spy(c => paintStaffHead(c, STAFF.visual, x => x, 1, 1)).args.ellipse ?? []).length, "o núcleo e as faíscas são as cinco elipses a mais");
  assert.ok(usesColor(full, GEM.light) && usesColor(full, GEM.glow), "o brilho é da cor da gema do cajado");
  assert.notEqual(signature(c => paintStaffHead(c, STAFF.visual, x => x, 1, 1)), signature(c => paintStaffHead(c, STAFF.visual, x => x, 1.4, 1)), "as faíscas orbitam com o relógio");
  assert.notEqual(signature(c => drawMageStaff(c, "apprentice", 1, x => x, 1)), signature(c => drawMageStaff(c, "apprentice", 1, x => x)), "o cajado inteiro também recebe a carga");
  assert.equal(signature(c => drawMageStaff(c, "apprentice", 1)), signature(c => drawMageStaff(c, "apprentice", 1, x => x, 0)), "e sem carga é o de antes");
});

const MAGE_POSE = { faceX: 1, faceY: 0, walkTime: 0.3, vx: 0, vy: 0, id: "mago", heroClass: "mage" as const, equippedStaff: "apprentice" as const, attackWeapon: "starter" as const };
const draw = (extra: Record<string, unknown>): string => signature(c => renderHero(c, { ...MAGE_POSE, attackTime: 0, ...extra } as never, 3, 4, 1.2));

test("o herói conjurando: o Mago muda a pose, o Cavaleiro com um cajado qualquer não, e um Mago parado é o de antes", () => {
  const rest = draw({});
  assert.equal(draw({ attackStaff: "apprentice", attackTime: 0, attackWindup: WINDUP }), rest, "com a conjuração acabada, é a pose parada");
  assert.equal(draw({ attackStaff: null, attackTime: 0 }), rest);
  const early = draw({ attackStaff: "apprentice", attackTime: left(WINDUP / 2), attackWindup: WINDUP }), out = draw({ attackStaff: "apprentice", attackTime: left(WINDUP + 0.04), attackWindup: WINDUP });
  assert.notEqual(early, rest, "no preparo a pose é outra"); assert.notEqual(out, rest, "na saída também"); assert.notEqual(early, out);
  assert.equal(draw({ attackStaff: "apprentice", attackTime: left(WINDUP / 2) }), early, "sem o preparo guardado, vale o do cajado");
  const knight = (extra: Record<string, unknown>): string => signature(c => renderHero(c, { ...MAGE_POSE, heroClass: undefined, attackTime: left(0.1), attackWeapon: "forge", equippedWeapon: "forge", ...extra } as never, 3, 4, 1.2));
  assert.equal(knight({ attackStaff: "apprentice", attackWindup: WINDUP }), knight({ attackStaff: null }), "o Cavaleiro ignora a conjuração");
  const lit = spy(c => renderHero(c, { ...MAGE_POSE, attackTime: left(WINDUP), attackStaff: "apprentice", attackWindup: WINDUP } as never, 3, 4, 1.2));
  const calm = spy(c => renderHero(c, { ...MAGE_POSE, attackTime: 0 } as never, 3, 4, 1.2));
  assert.ok((lit.calls.createRadialGradient ?? 0) > (calm.calls.createRadialGradient ?? 0), "na saída a gema está acesa");
  const bodyMoved = (extra: Record<string, unknown>): number[] => (spy(c => renderHero(c, { ...MAGE_POSE, ...extra } as never, 0, 0, 1.2)).args.translate ?? []).map(a => a[0] ?? 0);
  assert.notDeepEqual(bodyMoved({ attackStaff: "apprentice", attackTime: left(WINDUP + 0.05), attackWindup: WINDUP }), bodyMoved({ attackTime: 0 }), "o corpo balança com a conjuração");
});

test("o projétil e o estouro: determinísticos, da cor da gema, e crescem como esperado", () => {
  const bolt = (p: number, t = 1): string => signature(c => drawSpellBolt(c, "apprentice", p, t));
  assert.equal(bolt(0.5), bolt(0.5)); assert.notEqual(bolt(0.1), bolt(0.9), "a cauda se estica no começo do voo");
  assert.equal(bolt(Number.NaN), bolt(0), "progresso inválido vale 0"); assert.equal(bolt(9), bolt(1), "acima de 1 vale 1"); assert.equal(bolt(-4), bolt(0));
  assert.notEqual(bolt(0.5, 1), bolt(0.5, 1.013), "a cabeça treme com o relógio");
  const b = spy(c => drawSpellBolt(c, "apprentice", 0.5, 1));
  for (const tone of [GEM.light, GEM.mid, GEM.dark, GEM.glow, "#ffffff"]) assert.ok(usesColor(b, tone), "usa " + tone);
  assert.ok((b.args.moveTo ?? []).some(a => a[0] === 0 && a[1] === -6) && (b.args.lineTo ?? []).some(a => a[0] === 0 && a[1] === 6), "o brilho em cruz tem o braço vertical");
  const tailEnd = (p: number): number => Math.min(...(spy(c => drawSpellBolt(c, "apprentice", p, 1)).args.quadraticCurveTo ?? [[0, 0, 0, 0]]).map(a => a[2] ?? 0));
  assert.ok(tailEnd(0.5) < tailEnd(0) && tailEnd(1) <= tailEnd(0.5), "a cauda cresce com o voo e para de crescer");
  const burst = (p: number, kill = false): string => signature(c => drawSpellBurst(c, "apprentice", p, kill));
  assert.equal(burst(0.3), burst(0.3)); assert.notEqual(burst(0.1), burst(0.8)); assert.notEqual(burst(0.3), burst(0.3, true), "o abate tem estouro maior");
  assert.equal(burst(Number.NaN), burst(0)); assert.equal(burst(5), burst(1)); assert.equal(burst(-2), burst(0));
  const ring = (p: number, kill: boolean): number => Math.max(...(spy(c => drawSpellBurst(c, "apprentice", p, kill)).args.arc ?? [[0]]).map(a => a[2] ?? 0));
  assert.ok(ring(0.8, false) > ring(0.1, false), "o anel se abre com o tempo"); assert.ok(ring(0.8, true) > ring(0.8, false) * 1.3, "e abre mais no abate");
  const arcs = (p: number, kill: boolean): number[] => (spy(c => drawSpellBurst(c, "apprentice", p, kill)).args.arc ?? []).map(a => a[2] ?? 0);
  const [young, old] = [arcs(0.1, false), arcs(0.8, false)];
  assert.equal(young.length, old.length); assert.ok(young.every((r, i) => old[i]! > r), "cada círculo do estouro (clarão, sombra, anel, brasa) se abre com o tempo");
  const flashR = (kill: boolean): number => (spy(c => drawSpellBurst(c, "apprentice", 0.5, kill)).args.createRadialGradient ?? [[0]])[0]![5] ?? 0;
  assert.ok(flashR(true) > flashR(false) * 1.4, "o clarão do abate é maior");
  const rays = (kill: boolean): number => (spy(c => drawSpellBurst(c, "apprentice", 0.3, kill)).args.lineTo ?? []).length;
  assert.equal(rays(false), 6); assert.equal(rays(true), 8, "o abate tem oito raios, o comum seis");
  const s = spy(c => drawSpellBurst(c, "apprentice", 0.2));
  for (const tone of [GEM.light, GEM.glow, "#ffffff"]) assert.ok(usesColor(s, tone), "o estouro usa " + tone);
});

function labels(spells: SpellBolts, flying = false): string[] {
  const r = new Recorder(), seen: string[] = [];
  const proxy = new Proxy(r.ctx, { get(t, p) { const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (...a: unknown[]) => { if (p === "fillText") seen.push(String(a[0])); return (v as (...x: unknown[]) => unknown).apply(t, a); } : v; },
    set(t, p, v) { (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; } });
  spells.render(proxy, 0, 0); void flying; return seen;
}
const step = (spells: SpellBolts, who: Player, mobs: Array<ReturnType<typeof mobAt>>, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += DT) spells.update(DT, who, mobs); };

test("o projétil sai quando a simulação aplica o dano de uma magia, e só nesse caso", () => {
  const spells = new SpellBolts(), who = caster();
  spells.update(DT, who, [mobAt(250, 20)]); assert.equal(spells.flying, 0, "ver o monstro pela primeira vez não dispara nada");
  spells.update(DT, who, [mobAt(250, 20)]); assert.equal(spells.flying, 0, "e sem queda de vida também não");
  spells.update(DT, who, [mobAt(250, 12)]); assert.equal(spells.flying, 1, "a vida caiu durante a conjuração: sai um projétil");
  spells.update(DT, who, [mobAt(250, 12)]); assert.equal(spells.flying, 1, "sem nova queda não sai outro");
  const sword = new SpellBolts(), knight = caster({ attackStaff: null }); sword.update(DT, knight, [mobAt(250, 20)]); sword.update(DT, knight, [mobAt(250, 12)]);
  assert.equal(sword.flying, 0, "golpe de espada não tem projétil");
  const idle = new SpellBolts(), still = caster({ attackTime: 0 }); idle.update(DT, still, [mobAt(250, 20)]); idle.update(DT, still, [mobAt(250, 12)]);
  assert.equal(idle.flying, 0, "dano que não vem de uma conjuração (veneno, queda) não vira projétil");
  const heal = new SpellBolts(); heal.update(DT, who, [mobAt(250, 5)]); heal.update(DT, who, [mobAt(250, 9)]); assert.equal(heal.flying, 0, "cura não dispara");
  const two = new SpellBolts(); two.update(DT, who, [mobAt(250, 20, "a"), mobAt(300, 20, "b")]); two.update(DT, who, [mobAt(250, 10, "a"), mobAt(300, 10, "b")]); assert.equal(two.flying, 2, "um projétil por alvo atingido");
});

test("o voo: sai da gema, chega ao peito do alvo no tempo certo e então estoura com o número do dano", () => {
  const who = caster();
  /** Quantos segundos o projétil leva até o alvo em `x`, medido de milésimo em milésimo. */
  const flightTo = (x: number): number => {
    const spells = new SpellBolts(); spells.update(DT, who, [mobAt(x, 20)]); spells.update(0, who, [mobAt(x, 12)]);
    assert.equal(spells.flying, 1); let t = 0;
    while (spells.flying > 0 && t < 1) { spells.update(0.001, who, [mobAt(x, 12)]); t += 0.001; }
    assert.deepEqual(labels(spells), ["−8"], "o número do dano aparece na chegada");
    return t;
  };
  const nearFlight = flightTo(132), farFlight = flightTo(292), midFlight = flightTo(212);
  assert.ok(near(nearFlight, BOLT_MIN_FLIGHT, 0.0021), "perto: o tempo mínimo");
  assert.ok(farFlight > midFlight && midFlight > nearFlight, "quanto mais longe, mais demora");
  assert.ok(farFlight <= BOLT_MAX_FLIGHT + 0.0021 && farFlight > 0.15, "longe: um instante a mais, mas nunca além do máximo");
  assert.ok(BOLT_MIN_FLIGHT < BOLT_MAX_FLIGHT);
  const farTarget = (hp: number) => [mobAt(292, hp)];
  const placed = new Recorder(), seen: number[][] = [];
  const tracer = new Proxy(placed.ctx, { get(t, p) { const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (...a: unknown[]) => { if (p === "translate") seen.push(a as number[]); return (v as (...x: unknown[]) => unknown).apply(t, a); } : v; },
    set(t, p, v) { (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; } });
  const flight = new SpellBolts(); flight.update(DT, who, farTarget(20)); flight.update(0, who, farTarget(12)); flight.render(tracer, 0, 0);
  const tip = staffTip(staffMount(who, 0, castPhase(who.attackTime, WINDUP)));
  assert.ok(near(seen[0]![0]!, who.x + tip.x) && near(seen[0]![1]!, who.y + tip.y), "começa na gema do cajado");
  flight.update(0.05, who, farTarget(12)); seen.length = 0; flight.render(tracer, 0, 0);
  assert.ok(seen[0]![0]! > who.x + tip.x + 40 && seen[0]![0]! < 292 && Math.abs(seen[0]![1]! - (100 - 12)) < Math.abs(who.y + tip.y - 88), "no meio do caminho, a caminho do peito do alvo");
  seen.length = 0; step(flight, who, farTarget(12), 0.3); flight.render(tracer, 0, 0);
  assert.equal(seen.filter(a => a.length === 2).length >= 1, true, "depois de chegar, o que se desenha é o estouro e o número");
});

test("o estouro e o número duram o tempo certo e somem; o abate dura mais; efeitos desligados mostram só o projétil", () => {
  const who = caster(), spells = new SpellBolts();
  spells.update(DT, who, [mobAt(132, 20)]); spells.update(DT, who, [mobAt(132, 12)]); step(spells, who, [mobAt(132, 12)], 0.1);
  assert.equal(spells.flying, 0); assert.equal(spells.active, true, "estouro e número ainda na tela");
  step(spells, who, [mobAt(132, 12)], BURST_LIFE + 0.05); assert.equal(labels(spells).length, 1, "o número dura mais que o estouro");
  step(spells, who, [mobAt(132, 12)], BOLT_LABEL_LIFE); assert.equal(spells.active, false, "e tudo some");
  const kill = new SpellBolts(); kill.update(DT, who, [mobAt(132, 5)]); kill.update(DT, who, []);
  assert.equal(kill.flying, 1, "o monstro sumiu com pouca vida, ao alcance: foi abatido pela magia"); step(kill, who, [], 0.1);
  assert.deepEqual(labels(kill), ["−5"], "o abate mostra a vida que ele tinha");
  step(kill, who, [], BURST_LIFE + 0.02); assert.equal(kill.active, true, "o estouro de abate ainda está na tela quando o comum já acabou"); assert.ok(KILL_BURST_LIFE > BURST_LIFE);
  const off = new SpellBolts(); off.enabled = false; off.update(DT, who, [mobAt(132, 20)]); off.update(DT, who, [mobAt(132, 12)]);
  assert.equal(off.flying, 1, "com os efeitos desligados o projétil ainda voa"); step(off, who, [mobAt(132, 12)], 0.1);
  assert.equal(off.active, false, "mas não sobra estouro nem número"); assert.deepEqual(labels(off), []);
});

test("só vira abate o que sumiu ao alcance da magia, com vida de uma magia; o que sumiu de longe ou sem estar morrendo não", () => {
  const who = caster(), run = (mob: ReturnType<typeof mobAt>): number => { const s = new SpellBolts(); s.update(DT, who, [mob]); s.update(DT, who, []); return s.flying; };
  assert.equal(run(mobAt(132, 8)), 1, "vida igual ao dano da magia");
  assert.equal(run(mobAt(132, 9)), 0, "vida maior que a magia: sumiu por outro motivo");
  assert.equal(run(mobAt(100 + 192 + 8, 3)), 1, "no limite do alcance");
  assert.equal(run(mobAt(100 + 192 + 20, 3)), 0, "além do alcance");
  const idle = caster({ attackTime: 0 }), s = new SpellBolts(); s.update(DT, idle, [mobAt(132, 3)]); s.update(DT, idle, []); assert.equal(s.flying, 0, "sem conjuração, nada");
  const sword = caster({ attackStaff: null }), w = new SpellBolts(); w.update(DT, sword, [mobAt(132, 3)]); w.update(DT, sword, []); assert.equal(w.flying, 0, "golpe de espada tem o abate dele");
  const odd = caster({ attackStaff: "apprentice" }); Object.defineProperty(odd, "strikeDamage", { value: Number.NaN }); const n = new SpellBolts(); n.update(DT, odd, [mobAt(132, 1)]); n.update(DT, odd, []);
  assert.equal(n.flying, 1, "dano inválido vale 1");
});

test("a classe aguenta o que a tela joga: limites, posições inválidas, tempo inválido e reiniciar", () => {
  const who = caster(), spells = new SpellBolts();
  const many = (hp: number) => Array.from({ length: 30 }, (_, i) => mobAt(150 + i, hp, "m" + i, 100 + i));
  spells.update(DT, who, many(20)); spells.update(DT, who, many(10)); assert.equal(spells.flying, 12, "no máximo 12 projétil ao mesmo tempo");
  step(spells, who, many(10), 0.3); assert.ok(spells.active);
  spells.update(Number.NaN, who, many(10)); spells.update(-1, who, many(10)); spells.update(Number.POSITIVE_INFINITY, who, many(10));
  const bad = new SpellBolts(); bad.update(DT, who, [mobAt(Number.NaN, 20, "x")]); bad.update(DT, who, [mobAt(Number.NaN, 10, "x")]); assert.equal(bad.flying, 0, "monstro sem posição é ignorado");
  const clock = new SpellBolts(); clock.update(DT, who, [mobAt(250, 20)]); clock.update(DT, who, [mobAt(250, 12)]);
  clock.update(Number.NaN, who, [mobAt(250, 12)]); clock.update(-5, who, [mobAt(250, 12)]); clock.update(0, who, [mobAt(250, 12)]);
  assert.equal(clock.flying, 1, "tempo inválido ou zero (jogo pausado) não faz o projétil andar");
  clock.update(100, who, [mobAt(250, 12)]); assert.equal(clock.flying, 1, "um quadro enorme avança no máximo 0,1 s: o voo não pula");
  clock.update(100, who, [mobAt(250, 12)]); assert.equal(clock.flying, 0, "e o seguinte termina o voo");
  spells.reset(); assert.equal(spells.active, false); assert.equal(spells.flying, 0);
  spells.update(DT, who, many(5)); assert.equal(spells.flying, 0, "depois de reiniciar o monstro volta a ser novo: a vida de antes não conta, sem projétil");
});

test("Effects: a magia tem o projétil dela e não o impacto de espada; o interruptor e o reinício chegam até ela", () => {
  const fx = new Effects(), who = caster();
  fx.update(DT, who, [mobAt(150, 20)]); const feedback = fx.update(DT, who, [mobAt(150, 12)]);
  assert.equal(feedback.hit, true, "a tela ainda treme com o acerto"); assert.equal(fx.spells.flying, 1);
  assert.deepEqual(labels(fx.spells), [], "o número ainda não apareceu: o projétil está voando");
  const r = new Recorder(); fx.render(r.ctx, 0, 0);
  const sword = new Effects(), knight = caster({ attackStaff: null }); sword.update(DT, knight, [mobAt(150, 20)]); sword.update(DT, knight, [mobAt(150, 12)]);
  const s = new Recorder(); sword.render(s.ctx, 0, 0);
  assert.ok(s.metrics().paintOps > 3, "o golpe de espada tem partículas e número"); assert.equal(sword.spells.flying, 0);
  const alone = new Recorder(); fx.spells.render(alone.ctx, 0, 0);
  assert.deepEqual([r.metrics().paintOps, r.metrics().strokes, r.metrics().fills], [alone.metrics().paintOps, alone.metrics().strokes, alone.metrics().fills], "na magia só se desenha o projétil: nada de partícula nem número de espada");
  const texts = (draw: (c: CanvasRenderingContext2D) => void): string[] => { const rec = new Recorder(), seen: string[] = [];
    draw(new Proxy(rec.ctx, { get(t, p) { const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (...a: unknown[]) => { if (p === "fillText") seen.push(String(a[0])); return (v as (...x: unknown[]) => unknown).apply(t, a); } : v; }, set(t, p, v) { (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; } })); return seen; };
  assert.deepEqual(texts(c => sword.render(c, 0, 0)), ["−8"], "a espada mostra o número na hora"); assert.deepEqual(texts(c => fx.render(c, 0, 0)), [], "a magia só depois de chegar");
  fx.enabled = false; assert.equal(fx.spells.enabled, false); fx.enabled = true; assert.equal(fx.spells.enabled, true);
  fx.reset(); assert.equal(fx.spells.active, false, "reiniciar o mundo limpa a magia");
  const kill = new Effects(); kill.update(DT, who, [mobAt(132, 5)]); kill.update(DT, who, []);
  assert.equal(kill.spells.flying, 1, "o abate de perto também é da magia");
  const knightKill = new Effects(); knightKill.update(DT, knight, [mobAt(132, 1)]); knightKill.update(DT, knight, []); assert.equal(knightKill.spells.flying, 0);
});

test("de verdade, no jogo: o Mago conjura contra um monstro e vê-se um projétil por magia, com o número do dano", () => {
  const sim = new OfflineSimulation(SEED, undefined, "mage"); sim.update(0.01, STILL, false); sim.slimes.clear();
  sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  const mob = new RegionalMonster("m1", "clay-troll", 16 + 150, 16); sim.slimes.set(mob.id, mob);
  const fight = new ClassicCombat(); fight.select(mob.id, sim.slimes);
  const fx = new Effects(); let launched = 0, casts = 0, last = 0;
  for (let i = 0; i < 60 * 4; i++) {
    const p = sim.combatProfile, attack = fight.tick(DT, sim.player, sim.slimes, sim.collision, p.interval, p.weapon, p.ranged);
    if (attack) casts++;
    sim.update(DT, STILL, attack, fight.strikeTargetId);
    fx.update(DT, sim.player, [...sim.slimes.values()]);
    if (fx.spells.flying > last) launched += fx.spells.flying - last; last = fx.spells.flying;
    if (sim.slimes.size === 0) break;
  }
  assert.ok(casts >= 2, "conjurou mais de uma vez"); assert.equal(launched, casts, "um projétil por magia que acertou");
  assert.equal(sim.mana < sim.maxMana, true, "e a mana foi gasta");
});

const read = (p: string): string => readFileSync(p, "utf8");
test("a ligação com as telas: a vocação chega ao desenho do herói na superfície e na caverna, e a caverna mostra a magia", () => {
  const scene = read("src/ui/CanvasScene.ts"), cave = read("src/render/cave.ts"), surface = read("src/game/modes/surfaceMode.ts"), caveMode = read("src/game/modes/caveMode.ts");
  assert.match(surface, /playerClass: \{ heroClass: host\.sim\.heroClass, equippedStaff: host\.sim\.equippedStaff \}/, "a superfície diz qual é o herói");
  assert.match(scene, /\{ \.\.\.player, gear: playerGear, equippedWeapon: playerWeapon, \.\.\.playerClass \}/, "e a cena desenha com isso");
  assert.match(scene, /drawCaveView\(this\.ctx,room,left,top,width,height,time,gear,weapon,playerClass\);\s*\n\s*spells\?\.render\(this\.ctx,left,top\);/, "a caverna desenha o herói e a magia");
  assert.match(cave, /\{\.\.\.player,gear,equippedWeapon:weapon,\.\.\.playerClass\}/);
  assert.match(caveMode, /host\.effects\.spells\.update\(paused \? 0 : dt, cave\.player, cave\.monsters\.values\(\)\);/, "a caverna alimenta a magia a cada quadro");
  assert.match(caveMode, /\{heroClass:host\.sim\.heroClass,equippedStaff:host\.sim\.equippedStaff\},host\.effects\.spells\);/);
});

/** Tudo que o desenho chamou, com os argumentos como foram (inclusive texto), e os valores atribuídos à fonte. */
function trace(draw: (c: CanvasRenderingContext2D) => void): { calls: Record<string, unknown[][]>; fonts: string[] } {
  const r = new Recorder(), calls: Record<string, unknown[][]> = {}, fonts: string[] = [];
  draw(new Proxy(r.ctx, { get(t, p) { const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (...a: unknown[]) => { (calls[String(p)] ??= []).push(a); return (v as (...x: unknown[]) => unknown).apply(t, a); } : v; },
    set(t, p, v) { if (p === "font") fonts.push(String(v)); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; } }));
  return { calls, fonts };
}
const arrive = (damage: number, kill = false, ageAfter = 0.1): SpellBolts => {
  const who = caster(), spells = new SpellBolts(), hp = 40;
  if (kill) { spells.update(DT, who, [mobAt(132, damage)]); spells.update(DT, who, []); } else { spells.update(DT, who, [mobAt(132, hp)]); spells.update(DT, who, [mobAt(132, hp - damage)]); }
  step(spells, who, kill ? [] : [mobAt(132, hp - damage)], ageAfter); return spells;
};

test("a tela do estouro: o número é grande só quando o dano passa de 1, o estouro cresce com o tempo e o de abate dura mais", () => {
  assert.deepEqual(trace(c => arrive(8).render(c, 0, 0)).fonts, ["800 13px system-ui"], "dano de 8: número grande");
  assert.deepEqual(trace(c => arrive(1).render(c, 0, 0)).fonts, ["bold 10px system-ui"], "dano de 1: número pequeno");
  const maxArc = (s: SpellBolts): number => Math.max(0, ...(trace(c => s.render(c, 0, 0)).calls.arc ?? []).map(a => a[2] as number));
  assert.ok(maxArc(arrive(8, false, 0.12)) > maxArc(arrive(8, false, 0.06)), "o estouro se abre depois que o projétil chega");
  const bursts = (s: SpellBolts): number => (trace(c => s.render(c, 0, 0)).calls.createRadialGradient ?? []).length;
  assert.ok(bursts(arrive(8, false, 0.12)) > 0, "logo depois o estouro está na tela");
  assert.equal(bursts(arrive(8, false, BURST_LIFE + 0.1)), 0, "o estouro comum já acabou (só o número ficou)");
  assert.ok(bursts(arrive(5, true, BURST_LIFE + 0.1)) > 0, "o de abate ainda está na tela");
  assert.equal(bursts(arrive(5, true, KILL_BURST_LIFE + 0.1)), 0, "e também termina");
});

test("o projétil na tela: é desenhado, gira para o alvo e segue a gema do cajado", () => {
  const who = caster(), spells = new SpellBolts(), mob = (hp: number) => [mobAt(292, hp, "m1", 60)];
  spells.update(DT, who, mob(20)); spells.update(0, who, mob(12));
  const shot = trace(c => spells.render(c, 0, 0));
  assert.ok((shot.calls.createLinearGradient ?? []).length >= 1 && (shot.calls.createRadialGradient ?? []).length >= 1, "o projétil é desenhado (cauda e auréola)");
  const tip = staffTip(staffMount(who, 0, castPhase(who.attackTime, WINDUP))), fromX = who.x + tip.x, fromY = who.y + tip.y;
  assert.ok(near(shot.calls.rotate![0]![0] as number, Math.atan2(60 - 12 - fromY, 292 - fromX)), "a ponta aponta para o peito do alvo");
  assert.equal(shot.calls.rotate!.length, 1);
});

test("o herói de verdade conjurando: a mão, o cajado e o corpo seguem a conjuração, com os números certos", () => {
  const pose = { ...MAGE_POSE, attackTime: left(WINDUP + 0.04), attackStaff: "apprentice" as const, attackWindup: WINDUP };
  const phase = castPhase(pose.attackTime, WINDUP), mount = staffMount(pose, 0, phase), rest = staffMount(pose, 0);
  const at = (p: Record<string, unknown>) => trace(c => renderHero(c, p as never, 0, 0, 1.2)).calls;
  const cast = at(pose), calm = at({ ...pose, attackTime: 0 });
  const hasPoint = (calls: Record<string, unknown[][]>, name: string, ...nums: number[]): boolean => (calls[name] ?? []).some(a => nums.every((n, i) => near(a[i] as number, n, 1e-6)));
  assert.ok(hasPoint(cast, "translate", mount.ox, mount.oy), "o cajado é posto onde a mão da conjuração está");
  assert.ok(hasPoint(cast, "rotate", mount.rot), "e inclinado como a conjuração manda");
  assert.ok(hasPoint(cast, "ellipse", mount.gripX, mount.gripY, 2.6, 2.6), "a mão que o segura está no mesmo ponto");
  assert.equal(hasPoint(cast, "translate", rest.ox, rest.oy), false, "e não onde ele ficaria parado"); assert.equal(hasPoint(cast, "rotate", rest.rot), false);
  assert.ok(hasPoint(calm, "translate", rest.ox, rest.oy), "parado, o cajado fica onde sempre ficou");
  const body = castBody(pose.attackTime, WINDUP).lunge * 3.4, sword = attackBody(pose.attackTime, "starter").lunge * 3.4;
  assert.ok(hasPoint(cast, "translate", body, 0 + 0 * sword) || (cast.translate ?? []).some(a => near(a[0] as number, body, 1e-6)), "o corpo se mexe pelo balanço do mago");
  assert.equal((cast.translate ?? []).some(a => near(a[0] as number, sword, 1e-6) && !near(sword, body, 1e-6)), false, "e não pelo do espadachim");
  assert.notEqual(body, sword);
});
