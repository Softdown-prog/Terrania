import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Player } from "../src/actors/Player.ts";
import { Effects } from "../src/render/Effects.ts";
import { ARROW_LENGTH, REED_ARROW_LOOK, drawArrowShot } from "../src/render/arrows/arrow.ts";
import { drawArrowHit } from "../src/render/arrows/hit.ts";
import { ARROW_HIT_LIFE, ARROW_KILL_HIT_LIFE, ARROW_LABEL_COLOR, ARROW_LABEL_LIFE, ARROW_MAX_FLIGHT, ARROW_MIN_FLIGHT, ArrowFlights } from "../src/render/arrows/ArrowFlights.ts";
import { SpellBolts } from "../src/render/spells/SpellBolts.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { bowReach } from "../src/engine/combat/ArrowCombat.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/** O tiro do Arqueiro que se vê (ADR 0112, lote A1c-2): a flecha sai das mãos e voa até o alvo, e o impacto mostra o número do dano. Só apresentação. */
const DT = 1 / 60;
const mobAt = (x: number, hp: number, id = "m1", y = 100) => ({ id, x, y, hp });
function shooter(extra: Partial<Player> = {}): Player {
  const p = new Player(); p.x = 100; p.y = 100; p.faceX = 1; p.faceY = 0; p.attackBow = "hunting"; p.attackTime = ATTACK_DURATION - 0.2;
  return Object.assign(p, extra);
}
const step = (a: ArrowFlights, who: Player, mobs: Array<ReturnType<typeof mobAt>>, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += DT) a.update(DT, who, mobs); };
const usesColor = (s: ReturnType<typeof spy>, hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return s.raw.some(c => c.toLowerCase() === hex || c.replace(/\s/g, "").startsWith(`rgba(${r},${g},${b},`));
};

test("a flecha desenhada: haste de junco, ponta de pedra, penas e o rastro; muda com o progresso do voo e não quebra com valores ruins", () => {
  const s = spy(c => drawArrowShot(c, 0.5));
  for (const tone of [REED_ARROW_LOOK.shaft, REED_ARROW_LOOK.shaftDark, REED_ARROW_LOOK.head, REED_ARROW_LOOK.headDark, REED_ARROW_LOOK.feather, REED_ARROW_LOOK.featherDark, REED_ARROW_LOOK.binding])
    assert.ok(usesColor(s, tone), `usa ${tone}`);
  assert.ok((s.calls.createLinearGradient ?? 0) >= 1, "o rastro de vento é um degradê"); assert.ok((s.calls.stroke ?? 0) >= 5 && (s.calls.fill ?? 0) >= 6, "haste, ponta e penas");
  assert.notEqual(signature(c => drawArrowShot(c, 0)), signature(c => drawArrowShot(c, 1)), "o rastro muda ao longo do voo");
  assert.equal(signature(c => drawArrowShot(c, 0.4)), signature(c => drawArrowShot(c, 0.4)), "sem sorteio: o mesmo quadro sai igual");
  assert.equal(signature(c => drawArrowShot(c, Number.NaN)), signature(c => drawArrowShot(c, 0)), "progresso ruim vale 0");
  assert.equal(signature(c => drawArrowShot(c, 9)), signature(c => drawArrowShot(c, 1)), "e acima de 1 vale 1");
  assert.equal(ARROW_LENGTH, 22);
});

test("o impacto: clarão de poeira, anel e lascas; o do tiro que derruba o alvo é maior; some ao fim", () => {
  const hit = spy(c => drawArrowHit(c, 0.3)), kill = spy(c => drawArrowHit(c, 0.3, true));
  assert.ok(usesColor(hit, REED_ARROW_LOOK.shaftLight) && usesColor(hit, REED_ARROW_LOOK.shaft) && usesColor(hit, REED_ARROW_LOOK.head), "cores da flecha");
  assert.ok((hit.calls.createRadialGradient ?? 0) >= 1 && (hit.calls.arc ?? 0) >= 2 && (hit.calls.ellipse ?? 0) === 12, "sombra, cinco faíscas e seis torrões");
  assert.notEqual(signature(c => drawArrowHit(c, 0.3)), signature(c => drawArrowHit(c, 0.3, true)), "o que derruba é maior");
  const radius = (s: ReturnType<typeof spy>) => Math.max(...(s.args.arc ?? []).map(a => a[2] ?? 0));
  assert.ok(radius(kill) > radius(hit), "raio maior com o alvo caído");
  assert.notEqual(signature(c => drawArrowHit(c, 0)), signature(c => drawArrowHit(c, 0.9)));
  assert.equal(signature(c => drawArrowHit(c, Number.NaN)), signature(c => drawArrowHit(c, 0)));
});

test("sai uma flecha quando a vida do alvo cai durante o tiro; ver o monstro pela primeira vez, vida sem queda, cura, sem tiro ou espada não disparam", () => {
  const a = new ArrowFlights(), who = shooter();
  a.update(DT, who, [mobAt(250, 20)]); assert.equal(a.flying, 0, "primeira vez");
  a.update(DT, who, [mobAt(250, 20)]); assert.equal(a.flying, 0, "sem queda");
  a.update(DT, who, [mobAt(250, 12)]); assert.equal(a.flying, 1, "a vida caiu durante o tiro");
  a.update(DT, who, [mobAt(250, 12)]); assert.equal(a.flying, 1, "sem nova queda não sai outra");
  const sword = new ArrowFlights(), knight = shooter({ attackBow: null }); sword.update(DT, knight, [mobAt(250, 20)]); sword.update(DT, knight, [mobAt(250, 12)]); assert.equal(sword.flying, 0, "espada ou magia não");
  const idle = new ArrowFlights(), still = shooter({ attackTime: 0 }); idle.update(DT, still, [mobAt(250, 20)]); idle.update(DT, still, [mobAt(250, 12)]); assert.equal(idle.flying, 0, "fora do tiro não");
  const heal = new ArrowFlights(); heal.update(DT, who, [mobAt(250, 5)]); heal.update(DT, who, [mobAt(250, 9)]); assert.equal(heal.flying, 0, "cura não dispara");
  const two = new ArrowFlights(); two.update(DT, who, [mobAt(250, 20, "a"), mobAt(300, 20, "b")]); two.update(DT, who, [mobAt(250, 10, "a"), mobAt(300, 10, "b")]); assert.equal(two.flying, 2, "uma flecha por alvo atingido");
  const bad = new ArrowFlights(); bad.update(DT, who, [mobAt(Number.NaN, 20)]); bad.update(DT, who, [mobAt(Number.NaN, 5)]); assert.equal(bad.flying, 0, "posição quebrada não deixa flecha voando");
  const wall = new ArrowFlights(); wall.update(DT, who, Array.from({ length: 13 }, (_, i) => mobAt(200 + i, 20, "m" + i))); wall.update(DT, who, Array.from({ length: 13 }, (_, i) => mobAt(200 + i, 10, "m" + i))); assert.equal(wall.flying, 12, "no máximo 12 flechas ao mesmo tempo");
});

test("o alvo que cai (some da lista) dentro do alcance e com vida até o dano do arco também recebe a flecha; longe, ou com mais vida, não", () => {
  const who = shooter(), reach = bowReach("hunting");
  const kill = new ArrowFlights(); kill.update(DT, who, [mobAt(250, 8)]); kill.update(DT, who, []); assert.equal(kill.flying, 1, "tinha 8, o tiro dá 8: caiu");
  const far = new ArrowFlights(); far.update(DT, who, [mobAt(100 + reach + 40, 8)]); far.update(DT, who, []); assert.equal(far.flying, 0, "sumiu longe do alcance");
  const edge = new ArrowFlights(); edge.update(DT, who, [mobAt(100 + reach + 8, 8)]); edge.update(DT, who, []); assert.equal(edge.flying, 1, "no limite do alcance (8 px de folga) ainda vale");
  const tough = new ArrowFlights(); tough.update(DT, who, [mobAt(250, 9)]); tough.update(DT, who, []); assert.equal(tough.flying, 0, "tinha 9: não foi o tiro que o derrubou");
});

test("o voo: sai das mãos do herói, dura entre os limites, e ao chegar vira impacto e número, que somem no tempo certo", () => {
  const who = shooter({ x: 100, y: 100, faceX: 1 }), a = new ArrowFlights();
  a.update(DT, who, [mobAt(300, 20)]); a.update(0, who, [mobAt(300, 12)]);
  assert.equal(a.flying, 1);
  const rec = (): { translate: number[][]; texts: string[] } => { const r = new Recorder(), seen: number[][] = [], texts: string[] = [], c = r.ctx as unknown as Record<string, unknown>; const t = c.translate as (x: number, y: number) => void; c.translate = (x: number, y: number) => { seen.push([x, y]); t.call(r.ctx, x, y); }; const ft = c.fillText as (s: string, x: number, y: number) => void; c.fillText = (s: string, x: number, y: number) => { texts.push(s); ft.call(r.ctx, s, x, y); }; a.render(r.ctx, 0, 0); return { translate: seen, texts }; };
  const first = rec().translate[0]!; assert.deepEqual([first[0], first[1]], [110, 86], "começa nas mãos: 10 px à frente e 14 acima");
  step(a, who, [mobAt(300, 12)], ARROW_MIN_FLIGHT - 0.02); assert.equal(a.flying, 1, "ainda voando antes do mínimo");
  step(a, who, [mobAt(300, 12)], ARROW_MAX_FLIGHT); assert.equal(a.flying, 0, "chegou");
  assert.deepEqual(rec().texts, ["−8"], "o número do dano");
  assert.deepEqual(rec().translate.find(([x]) => x === 300), [300, 88], "o impacto é no peito do alvo (12 px acima dos pés)");
  step(a, who, [mobAt(300, 12)], ARROW_HIT_LIFE + 0.05); assert.ok(a.active, "o número ainda aparece");
  step(a, who, [mobAt(300, 12)], ARROW_LABEL_LIFE); assert.equal(a.active, false, "e some");
  assert.equal(ARROW_HIT_LIFE < ARROW_KILL_HIT_LIFE && ARROW_KILL_HIT_LIFE < ARROW_LABEL_LIFE, true);
});

test("o tempo de voo: o mínimo para alvo colado, o máximo para alvo muito longe, e a vida do impacto maior para quem cai", () => {
  const who = shooter({ x: 100, y: 100, faceX: 1 });
  const near = new ArrowFlights(); near.update(DT, who, [mobAt(118, 20)]); near.update(0, who, [mobAt(118, 12)]);
  step(near, who, [mobAt(118, 12)], ARROW_MIN_FLIGHT - 0.02); assert.equal(near.flying, 1, "alvo colado: ainda voa perto do mínimo");
  step(near, who, [mobAt(118, 12)], 0.04); assert.equal(near.flying, 0);
  const far = new ArrowFlights(); far.update(DT, who, [mobAt(1300, 20)]); far.update(0, who, [mobAt(1300, 12)]);
  step(far, who, [mobAt(1300, 12)], ARROW_MAX_FLIGHT - 0.02); assert.equal(far.flying, 1, "alvo longe: voa até perto do máximo");
  step(far, who, [mobAt(1300, 12)], 0.04); assert.equal(far.flying, 0, "e o voo nunca passa do máximo");
  const impact = (kill: boolean): number => {
    const a = new ArrowFlights(); a.update(DT, who, [mobAt(150, 8)]); if (kill) a.update(0, who, []); else a.update(0, who, [mobAt(150, 1)]);
    step(a, who, kill ? [] : [mobAt(150, 1)], ARROW_MIN_FLIGHT + ARROW_HIT_LIFE + 0.03);
    return spy(c => a.render(c, 0, 0)).calls.arc ?? 0;
  };
  assert.equal(impact(false), 0, "o impacto comum já acabou"); assert.ok(impact(true) > 0, "o de quem caiu ainda aparece");
  const fonts = (before: number, after: number): string[] => {
    const a = new ArrowFlights(); a.update(DT, who, [mobAt(150, before)]); a.update(0, who, [mobAt(150, after)]); step(a, who, [mobAt(150, after)], ARROW_MAX_FLIGHT + 0.02);
    const r = new Recorder(), seen: string[] = [], c = r.ctx as unknown as Record<string, unknown>, ft = c.fillText as (s: string, x: number, y: number) => void;
    c.fillText = (s: string, x: number, y: number) => { seen.push(String(r.ctx.font)); ft.call(r.ctx, s, x, y); }; a.render(r.ctx, 0, 0); return seen;
  };
  assert.deepEqual(fonts(20, 12), ["800 13px system-ui"], "dano de verdade: número grande"); assert.deepEqual(fonts(20, 19), ["bold 10px system-ui"], "dano 1: número pequeno");
});

test("o excesso é cortado: no máximo 16 impactos e 16 números na tela ao mesmo tempo", () => {
  const who = shooter(), a = new ArrowFlights(), crowd = (hp: number) => Array.from({ length: 13 }, (_, i) => mobAt(160 + i, hp, "m" + i));
  a.update(DT, who, crowd(1000));
  for (let k = 1; k <= 6; k++) { a.update(0, who, crowd(1000 - k * 10)); step(a, who, crowd(1000 - k * 10), 0.07); }
  const seen = spy(c => a.render(c, 0, 0));
  assert.equal(seen.calls.fillText, 16, "16 números"); assert.equal((seen.calls.createRadialGradient ?? 0), 16, "16 impactos");
});

test("com os efeitos desligados só a flecha aparece; reset limpa tudo", () => {
  const who = shooter(), a = new ArrowFlights(); a.enabled = false;
  a.update(DT, who, [mobAt(150, 20)]); a.update(0, who, [mobAt(150, 12)]); step(a, who, [mobAt(150, 12)], 0.5);
  assert.equal(a.active, false, "sem impacto nem número");
  const b = new ArrowFlights(); b.update(DT, who, [mobAt(150, 20)]); b.update(0, who, [mobAt(150, 12)]); assert.equal(b.flying, 1); b.reset(); assert.equal(b.active, false);
  const c = new ArrowFlights(); c.update(DT, who, [mobAt(150, 20)]); c.reset(); c.update(DT, who, [mobAt(150, 12)]); assert.equal(c.flying, 0, "o reset esquece o monstro visto: voltar a vê-lo não é queda de vida");
});

test("a flecha anda junto com a magia: o `SpellBolts` repassa atualizar, desenhar, limpar e os efeitos ligados/desligados; a magia segue igual", () => {
  const bolts = new SpellBolts(), who = shooter();
  bolts.update(DT, who, [mobAt(250, 20)]); bolts.update(DT, who, [mobAt(250, 12)]);
  assert.equal(bolts.arrows.flying, 1); assert.equal(bolts.flying, 0, "a magia não conta a flecha"); assert.equal(bolts.active, true);
  const drawn = spy(c => bolts.render(c, 0, 0)); assert.ok((drawn.calls.rotate ?? 0) >= 1, "a flecha é desenhada pelo mesmo caminho");
  bolts.enabled = false; assert.equal(bolts.arrows.enabled, false); bolts.enabled = true; assert.equal(bolts.arrows.enabled, true); assert.equal(bolts.enabled, true);
  bolts.reset(); assert.equal(bolts.arrows.flying, 0); assert.equal(bolts.active, false);
  const mage = new SpellBolts(), caster = shooter({ attackBow: null, attackStaff: "apprentice", attackWindup: 0.12 });
  mage.update(DT, caster, [mobAt(250, 20)]); mage.update(DT, caster, [mobAt(250, 12)]);
  assert.equal(mage.flying, 1, "a magia segue saindo"); assert.equal(mage.arrows.flying, 0, "sem flecha");
  const fx = new Effects(); fx.enabled = false; assert.equal(fx.spells.arrows.enabled, false);
});

test("o impacto de espada não aparece no tiro: `Effects` trata o tiro como golpe à distância", () => {
  const src = readFileSync("src/render/Effects.ts", "utf8");
  assert.match(src, /const spell = \(player\.attackStaff !== null \|\| player\.attackBow !== null\) && player\.attackTime > 0;/);
  assert.equal(ARROW_LABEL_COLOR, "#f0d9a0");
});
