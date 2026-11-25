import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { STAVES, staffUnlocked, type StaffId } from "../src/engine/character/Staves.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { applySpellEffect, BEAM_HALF_WIDTH, resolveSpellStrike, spellHitDamage, spellStrikeTargets } from "../src/engine/combat/SpellCombat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { equipStaff } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { describeStaffEffect } from "../src/game/messages/staffEffects.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";

/**
 * Os cajados do lote 3 (ADR 0076): Sol Nascente (luz; o feixe atravessa e atinge também um monstro atrás), Lua Negra (sombra; devolve 10% do
 * dano em mana) e Tempestade (raio; salta para até 2 vizinhos com 60% do dano), com a lista de `docs/MAGO_CAJADOS.md`. Valem na superfície e na caverna.
 */
const SEED = 842136, OPEN: CollisionMap = { canMove: () => true }, STILL = { x: 0, y: 0 };
const read = (path: string): string => readFileSync(path, "utf8");
const { mana: _fresh, ...MAGE_SAVE } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
const mageAt = (level: number, extra: object = {}) => new OfflineSimulation(SEED, { ...MAGE_SAVE, experience: experienceForLevel(level), ...extra } as never);
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
/** O herói em (100, 100) olhando para a direita, de vida e mana de sobra. */
const hero = (): Player => { const p = new Player(); p.x = 100; p.y = 100; p.faceX = 1; p.faceY = 0; p.hp = 50; p.maxHp = 100; return p; };
const wolf = (id: string, x: number, y: number, hp = 5000): RegionalMonster => { const m = new RegionalMonster(id, "glacial-wolf", x, y); m.hp = hp; return m; };
const ids = (list: readonly Slime[]): string[] => list.map(m => m.id);
const wall = (x: number): CollisionMap => ({ canMove: (px: number) => !(px >= x && px <= x + 8) });

test("a lista aprovada: nível, dano, intervalo, mana, preparo, efeito e elemento dos três cajados do lote 3", () => {
  const rows = [["sun", "Cajado do Sol Nascente", 70, 84, 1.45, 107, 0.19, "light", "pierce"], ["moon", "Cajado da Lua Negra", 80, 98, 1.5, 126, 0.19, "shadow", "leech"],
    ["storm", "Cajado da Tempestade", 90, 115, 1.35, 127, 0.17, "lightning", "chain"]] as const;
  for (const [id, name, level, damage, interval, mana, windup, element, effect] of rows) {
    const s = STAVES[id];
    assert.deepEqual([s.name, s.level, s.damage, s.interval, s.manaCost, s.windup, s.element, s.effect?.kind, s.range, s.price], [name, level, damage, interval, mana, windup, element, effect, 6, undefined], id);
  }
  assert.deepEqual([STAVES.sun.effect, STAVES.moon.effect, STAVES.storm.effect], [{ kind: "pierce", extra: 1 }, { kind: "leech", percent: 10 }, { kind: "chain", jumps: 2, percent: 60, radius: 96 }]);
  const doc = read("docs/MAGO_CAJADOS.md");
  for (const [, name, level, damage, interval, mana] of rows) assert.ok(doc.includes(`| ${level} | ${name} |`) && doc.includes(`| ${damage} |`) && doc.includes(`${interval}`.replace(".", ",")) && doc.includes(`| ${mana} |`), name);
});

test("a regra do documento vale para o lote 3: espelha a espada (nível e dano), intervalo + 0,2 s, mana = intervalo × mana máxima do nível ÷ 10, e o preparo é o da espada + 0,05 s", () => {
  const mirror = { sun: "obsidian", moon: "marsh", storm: "tempest" } as const;
  for (const id of ["sun", "moon", "storm"] as const) {
    const s = STAVES[id], sword = WEAPONS[mirror[id]];
    assert.equal(s.level, sword.level, id); assert.equal(s.damage, sword.damage, id);
    assert.ok(Math.abs(s.interval - Math.round((sword.interval + 0.2) * 100) / 100) < 1e-9, id + " intervalo");
    assert.equal(s.manaCost, Math.round(s.interval * MAGE.maxMana(s.level) / 10), id + " mana");
    assert.ok(Math.abs(s.windup - (sword.windup + 0.05)) < 1e-9, id + " preparo"); assert.ok(s.windup < ATTACK_DURATION, "o preparo cabe no golpe");
    assert.equal(staffUnlocked(id, s.level), true, "libera no nível, sem comprar"); assert.equal(staffUnlocked(id, s.level - 1), false);
  }
  const gems = new Set(Object.values(STAVES).map(s => s.visual.gem.mid)); assert.equal(gems.size, Object.keys(STAVES).length, "cada cajado tem a gema da sua cor");
});

test("o feixe do Sol Nascente atravessa o alvo e atinge um monstro atrás dele, com o mesmo dano", () => {
  const h = hero(), target = wolf("a", 150, 100), behind = wolf("b", 190, 100);
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [target, behind], OPEN, "a")), ["a", "b"], "o alvo e o de trás, nessa ordem");
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [behind, target].values(), OPEN, "a")), ["a", "b"], "vale também para um iterador (o jogo passa os valores de um mapa)");
  resolveSpellStrike("sun", h, [target, behind], OPEN, () => {});
  assert.equal(target.hp, 5000 - spellHitDamage("sun", target)); assert.equal(behind.hp, 5000 - spellHitDamage("sun", behind), "o de trás leva o mesmo dano");
  assert.equal(5000 - behind.hp, STAVES.sun.damage - behind.defense, "o dano inteiro do cajado, menos a defesa");
  const golem = new Slime("g", 190, 100, "basalt-golem"), first = wolf("a", 150, 100); golem.hp = 5000; first.hp = 5000;
  resolveSpellStrike("sun", h, [first, golem], OPEN, () => {}); assert.equal(5000 - golem.hp, 84 - 20, "a defesa do de trás conta");
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [target], OPEN, "a")), ["a"], "sem ninguém atrás só o alvo");
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [target, behind], OPEN, null)), [], "sem alvo escolhido a magia não fere ninguém"); assert.deepEqual(ids(spellStrikeTargets("sun", h, [target, behind], OPEN, undefined)), []);
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [target, behind], OPEN, "zz")), [], "alvo que não existe");
});

test("o que o feixe NÃO atravessa: o que está à frente do alvo ou de lado, o que passa do alcance, o que está atrás de parede, quem já caiu, e só um é atravessado", () => {
  const h = hero(), target = wolf("a", 150, 100), pick = (...others: RegionalMonster[]): string[] => ids(spellStrikeTargets("sun", h, [target, ...others], OPEN, "a"));
  assert.deepEqual(pick(wolf("front", 125, 100)), ["a"], "o que está entre o herói e o alvo não é atravessado");
  assert.deepEqual(pick(wolf("side", 190, 100 + BEAM_HALF_WIDTH + 4)), ["a"], "de lado, fora da largura do feixe"); assert.deepEqual(pick(wolf("side", 190, 100 - BEAM_HALF_WIDTH - 4)), ["a"]);
  assert.deepEqual(pick(wolf("edge", 190, 100 + BEAM_HALF_WIDTH - 2)), ["a", "edge"], "dentro da largura do feixe, ainda atravessa"); assert.deepEqual(pick(wolf("edge", 190, 100 - BEAM_HALF_WIDTH + 2)), ["a", "edge"]);
  assert.deepEqual(pick(wolf("far", 100 + 6 * 32 + 8, 100)), ["a"], "além dos 6 tiles do cajado o feixe não chega"); assert.deepEqual(pick(wolf("near", 100 + 6 * 32 - 8, 100)), ["a", "near"], "logo antes do limite chega");
  assert.equal(BEAM_HALF_WIDTH, 16, "o feixe tem 16 pixels de cada lado (um monstro inteiro)"); assert.deepEqual(pick(wolf("n14", 190, 114)), ["a", "n14"], "a 14 pixels da reta é atravessado"); assert.deepEqual(pick(wolf("n18", 190, 118)), ["a"], "a 18 não");
  const dead = wolf("dead", 190, 100, 0); assert.deepEqual(pick(dead), ["a"], "quem já caiu não é atravessado");
  assert.deepEqual(pick(wolf("p", 200, 100), wolf("q", 180, 100)), ["a", "q"], "só um é atravessado, o mais perto do alvo");
  assert.deepEqual(pick(wolf("n", 190, 100), wolf("m", 190, 100)), ["a", "m"], "empate: vale o id menor (resultado sempre igual)");
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [target, wolf("w", 215, 100)], wall(180), "a")), ["a"], "parede entre o alvo e o de trás barra o feixe");
  assert.deepEqual(ids(spellStrikeTargets("sun", h, [target, wolf("w", 215, 100)], wall(130), "a")), [], "parede entre o herói e o alvo: nada é atingido");
  const diagonal = wolf("d", 100 + 70, 100 + 70), beyond = wolf("e", 100 + 100, 100 + 100), off = wolf("f", 100 + 100, 100 + 70);
  h.faceX = 1; h.faceY = 1; assert.deepEqual(ids(spellStrikeTargets("sun", h, [diagonal, beyond, off], OPEN, "d")), ["d", "e"], "a reta do feixe vale na diagonal, e quem está fora da reta fica de fora");
  const lowReach = wolf("x", 100 + 5 * 32, 100), behindLow = wolf("y", 100 + 5 * 32 + 20, 100); assert.deepEqual(ids(spellStrikeTargets("sun", hero(), [lowReach, behindLow], OPEN, "x")), ["x", "y"]);
  for (const staff of ["apprentice", "breeze", "stone", "tide", "ember", "thorn", "frost", "moon"] as const)
    assert.deepEqual(ids(spellStrikeTargets(staff, hero(), [target, wolf("b", 190, 100)], OPEN, "a")), ["a"], staff + ": as outras magias só atingem o alvo");
});

test("o raio da Tempestade salta do alvo para até 2 vizinhos, cada salto com 60% do dano", () => {
  const h = hero(), target = wolf("a", 150, 100), n1 = wolf("b", 190, 100), n2 = wolf("c", 230, 100), n3 = wolf("d", 270, 100);
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [n3, n2, n1, target], OPEN, "a")), ["a", "b", "c"], "o alvo, o primeiro vizinho e o segundo; o terceiro fica de fora");
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [n1, target].values(), OPEN, "a")), ["a", "b"], "com um só vizinho, um só salto");
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [target], OPEN, "a")), ["a"], "sem vizinhos só o alvo");
  resolveSpellStrike("storm", h, [target, n1, n2], OPEN, () => {});
  assert.equal(5000 - target.hp, 115 - target.defense, "o alvo leva o dano inteiro"); assert.equal(5000 - n1.hp, 69 - n1.defense, "o salto leva 60% (69)"); assert.equal(5000 - n2.hp, 69 - n2.defense, "o segundo salto também");
  assert.equal(spellHitDamage("storm", n1, 0), 115); assert.equal(spellHitDamage("storm", n1, 1), 69); assert.equal(spellHitDamage("storm", n1, 2), 69); assert.equal(spellHitDamage("sun", n1, 1), 84, "o feixe do sol atravessa com o dano inteiro");
  assert.equal(spellHitDamage("ember", n1, 1), 38, "as outras magias não mudam"); const golem = new Slime("g", 0, 0, "basalt-golem"); assert.equal(spellHitDamage("storm", golem, 1), 69 - 20, "a defesa vale no salto, depois dos 60%");
  const chosen = ids(spellStrikeTargets("storm", h, [wolf("far", 150, 190), wolf("near", 150, 130), target], OPEN, "a")); assert.deepEqual(chosen, ["a", "near", "far"], "o primeiro salto vai para o mais perto do alvo (a 30) e o segundo parte dele, não do alvo (o outro está a 60 do primeiro)");
});

test("o raio salta de vizinho em vizinho: raio de 3 tiles, sem parede, sem repetir, sem quem já caiu, empate pelo id", () => {
  const h = hero(), target = wolf("a", 150, 100);
  const jump = (...others: RegionalMonster[]): string[] => ids(spellStrikeTargets("storm", h, [target, ...others], OPEN, "a"));
  assert.deepEqual(jump(wolf("in", 150 + 96, 100)), ["a", "in"], "a 96 pixels (3 tiles) ainda salta"); assert.deepEqual(jump(wolf("out", 150 + 97, 100)), ["a"], "a 97 pixels não salta");
  assert.deepEqual(jump(wolf("up", 150, 100 - 96)), ["a", "up"], "o salto vale em qualquer direção, para trás também"); assert.deepEqual(jump(wolf("back", 150 - 90, 100)), ["a", "back"], "e para o lado do herói");
  assert.deepEqual(jump(wolf("dead", 190, 100, 0)), ["a"], "quem já caiu não recebe o raio");
  assert.deepEqual(jump(wolf("p", 190, 100), wolf("q", 190 + 90, 100), wolf("r", 190 + 180, 100)), ["a", "p", "q"], "o segundo salto parte do primeiro vizinho, não do alvo, e o terceiro (que seria o 3.º salto) fica de fora");
  assert.deepEqual(jump(wolf("p", 190, 100), wolf("q", 150 - 90, 100)), ["a", "p"], "o segundo salto parte do primeiro vizinho: quem está perto só do alvo (a 90) e longe do vizinho (a 130) fica de fora");
  assert.deepEqual(jump(wolf("q", 150 + 86, 100), wolf("p", 190, 100)), ["a", "p", "q"], "vai sempre para o mais perto: p (a 40) antes de q (a 86), qualquer que seja a ordem da lista");
});

test("parede entre os elos barra o raio: o vizinho atrás de parede não recebe, e o salto não atravessa", () => {
  const h = hero(), target = wolf("a", 150, 100);
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [target, wolf("n", 190, 100)], wall(165), "a")), ["a"], "parede entre o alvo e o vizinho");
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [target, wolf("n", 190, 100), wolf("m", 230, 100)], wall(205), "a")), ["a", "n"], "parede entre o primeiro e o segundo vizinho: só o primeiro");
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [target, wolf("n", 190, 100)], OPEN, "a")), ["a", "n"], "sem parede passa");
});

test("empate no salto: dois vizinhos à mesma distância do alvo, vale o de id menor, qualquer que seja a ordem da lista", () => {
  const h = hero(), target = wolf("a", 150, 100);
  for (const order of [["p", "q"], ["q", "p"]]) {
    const others = order.map(id => wolf(id, id === "p" ? 190 : 110, 100));
    assert.equal(ids(spellStrikeTargets("storm", h, [target, ...others], OPEN, "a"))[1], "p", "o primeiro salto vai para o id menor: " + order);
  }
});

test("a mana devolvida chega à simulação também pela caverna do jogo (ligação do modo caverna)", () => {
  const cave = read("src/game/modes/caveMode.ts");
  assert.match(cave, /spend: cost => host\.sim\.spendMana\(cost\), gain: amount => host\.sim\.gainMana\(amount\)/, "o modo caverna entrega a recarga à simulação");
  assert.match(read("src/engine/rooms/CaveRoom.ts"), /resolveSpellStrike\(staff,this\.player,hit,this\.collision,monster=>this\.defeat\(monster\.id,monster,defense\),caster\?\.gain\)/, "a caverna passa a recarga à resolução");
  assert.match(read("src/engine/OfflineSimulation.ts"), /amount=>this\.gainMana\(amount\)/, "a superfície também");
});

test("a Lua Negra devolve 10% do dano realmente causado em mana (pelo menos 1), só com o herói vivo", () => {
  const gains: number[] = [], gain = (a: number): void => { gains.push(a); };
  const h = hero(), mob = wolf("a", 150, 100);
  resolveSpellStrike("moon", h, [mob], OPEN, () => {}, gain); assert.deepEqual(gains, [Math.round((98 - mob.defense) / 10)], "10% do dano (98): 10 de mana"); assert.equal(gains[0], 10);
  gains.length = 0; const nearDead = wolf("b", 150, 100, 30); resolveSpellStrike("moon", h, [nearDead], OPEN, () => {}, gain); assert.deepEqual(gains, [3], "no golpe que derrota, 10% do que sobrava de vida (30), não do excesso");
  gains.length = 0; const tiny = wolf("c", 150, 100, 4); resolveSpellStrike("moon", h, [tiny], OPEN, () => {}, gain); assert.deepEqual(gains, [1], "mínimo de 1 de mana");
  gains.length = 0; const dead = hero(); dead.hp = 0; applySpellEffect("moon", dead, wolf("d", 150, 100), 50, OPEN, gain); assert.deepEqual(gains, [], "herói caído não ganha mana");
  applySpellEffect("moon", h, wolf("e", 150, 100), 0, OPEN, gain); assert.deepEqual(gains, [], "sem dano causado não há mana");
  assert.doesNotThrow(() => applySpellEffect("moon", h, wolf("f", 150, 100), 50, OPEN), "sem quem receba a mana nada acontece");
  applySpellEffect("moon", h, wolf("g", 150, 100), 50, OPEN, gain); assert.deepEqual(gains, [5], "10% de 50");
  for (const staff of ["apprentice", "breeze", "stone", "tide", "ember", "thorn", "frost", "sun", "storm"] as const) { gains.length = 0; applySpellEffect(staff, h, wolf("x", 150, 100), 50, OPEN, gain); assert.deepEqual(gains, [], staff + " não devolve mana"); }
  const apart = [wolf("a", 150, 100), wolf("b", 190, 100)]; gains.length = 0; resolveSpellStrike("sun", h, apart, OPEN, () => {}, gain); assert.deepEqual(gains, [], "o feixe do sol não devolve mana");
});

test("gainMana: sobe a mana do Mago sem passar do máximo, ignora valor inválido e não faz nada para o Cavaleiro", () => {
  const sim = mageAt(80, { mana: 100 }), max = sim.maxMana; assert.equal(sim.mana, 100);
  sim.gainMana(10); assert.equal(sim.mana, 110); sim.gainMana(0.5); assert.equal(sim.mana, 110.5);
  for (const bad of [0, -5, Number.NaN, Infinity, -Infinity]) { const before = sim.mana; sim.gainMana(bad); assert.equal(sim.mana, before, "valor inválido: " + bad); }
  sim.gainMana(max * 5); assert.equal(sim.mana, max, "nunca passa do máximo do nível");
  const knight = new OfflineSimulation(SEED); knight.gainMana(50); assert.equal(knight.mana, 0, "o Cavaleiro não tem mana");
});

/** Põe o Mago do nível dado na rua, em (16, 16) olhando para a direita, com os monstros dados (todos numa reta de y = 16). */
function stage(level: number, staff: StaffId, mobs: ReadonlyArray<{ id: string; x: number; hp: number }>, extra: object = {}): { sim: OfflineSimulation; mobs: Map<string, RegionalMonster> } {
  const sim = mageAt(level, extra); sim.update(0.01, STILL, false); sim.slimes.clear(); sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  if (staff !== sim.equippedStaff) assert.equal(equipStaff(context(sim), staff).changed, true);
  const made = new Map<string, RegionalMonster>(); for (const m of mobs) { const mob = new RegionalMonster(m.id, "glacial-wolf", m.x, 16); mob.hp = m.hp; sim.slimes.set(m.id, mob); made.set(m.id, mob); }
  return { sim, mobs: made };
}
const castOnce = (sim: OfflineSimulation, staff: StaffId, target: string): void => {
  assert.equal(sim.player.startCast(staff, c => sim.spendMana(c)), true, "a magia saiu");
  for (let i = 0; i < 60 && sim.player.attackTime > 0; i++) sim.update(1 / 60, STILL, false, target);
};

test("na superfície: o feixe do Sol atinge dois, o raio da Tempestade três, e os que caem contam como derrota (experiência e remoção)", () => {
  const sun = stage(70, "sun", [{ id: "a", x: 100, hp: 5000 }, { id: "b", x: 150, hp: 5000 }, { id: "c", x: 200, hp: 5000 }]);
  castOnce(sun.sim, "sun", "a");
  assert.equal(5000 - sun.mobs.get("a")!.hp, 84 - sun.mobs.get("a")!.defense, "o alvo levou o dano"); assert.equal(5000 - sun.mobs.get("b")!.hp, 84 - sun.mobs.get("b")!.defense, "o de trás também"); assert.equal(sun.mobs.get("c")!.hp, 5000, "o terceiro, não: só um é atravessado");
  const sunKill = stage(70, "sun", [{ id: "a", x: 100, hp: 10 }, { id: "b", x: 150, hp: 10 }]); const xp0 = sunKill.sim.experience;
  castOnce(sunKill.sim, "sun", "a"); assert.equal(sunKill.sim.slimes.has("a") || sunKill.sim.slimes.has("b"), false, "os dois caíram de um só feixe"); assert.ok(sunKill.sim.experience > xp0, "e a experiência veio");
  const single = stage(70, "apprentice", [{ id: "a", x: 100, hp: 8 }, { id: "b", x: 150, hp: 8 }]); const single0 = single.sim.experience; castOnce(single.sim, "apprentice", "a");
  assert.ok(single.sim.experience - single0 > 0 && single.sim.slimes.has("b"), "com o Aprendiz só o alvo cai"); assert.ok(sunKill.sim.experience - xp0 > single.sim.experience - single0, "e o feixe rende a experiência dos dois");
  const storm = stage(90, "storm", [{ id: "a", x: 100, hp: 5000 }, { id: "b", x: 140, hp: 5000 }, { id: "c", x: 180, hp: 5000 }, { id: "d", x: 220, hp: 5000 }]);
  castOnce(storm.sim, "storm", "a");
  const lost = (id: string): number => 5000 - storm.mobs.get(id)!.hp, def = (id: string): number => storm.mobs.get(id)!.defense;
  assert.equal(lost("a"), 115 - def("a")); assert.equal(lost("b"), 69 - def("b")); assert.equal(lost("c"), 69 - def("c")); assert.equal(lost("d"), 0, "o quarto não: são dois saltos");
  const chainKill = stage(90, "storm", [{ id: "a", x: 100, hp: 10 }, { id: "b", x: 140, hp: 10 }, { id: "c", x: 180, hp: 10 }]); const chain0 = chainKill.sim.experience;
  castOnce(chainKill.sim, "storm", "a"); assert.equal(chainKill.sim.slimes.size, 0, "os três caíram de um só raio"); assert.ok(chainKill.sim.experience > chain0);
});

test("na superfície: a Lua Negra devolve mana ao Mago pelo caminho real (gasta o custo e ganha 10% do dano)", () => {
  const { sim, mobs } = stage(80, "moon", [{ id: "a", x: 100, hp: 5000 }], { mana: 300 });
  const gains: number[] = [], original = sim.gainMana.bind(sim); sim.gainMana = (amount: number): void => { gains.push(amount); original(amount); };
  const before = sim.mana; castOnce(sim, "moon", "a");
  assert.deepEqual(gains, [Math.round((98 - mobs.get("a")!.defense) / 10)], "a simulação devolveu 10% do dano uma vez"); assert.equal(gains[0], 10);
  const regen = MAGE.manaPerSecond(80) * 1.1; assert.ok(sim.mana > before - 126 + 9 && sim.mana < before - 126 + 10 + regen, "a mana gasta (126) voltou em 10, mais a recarga natural do tempo da magia: " + (sim.mana - before));
  const knightGain = stage(80, "sun", [{ id: "a", x: 100, hp: 5000 }]); const spy2: number[] = []; knightGain.sim.gainMana = (a: number): void => { spy2.push(a); }; castOnce(knightGain.sim, "sun", "a"); assert.deepEqual(spy2, [], "outro cajado não devolve");
});

test("na caverna: o feixe, o raio e a mana devolvida valem igual (a caverna usa a mesma resolução)", () => {
  const entrance = caveEntranceInCell(0, 0, SEED)!;
  const open = (): { room: CaveRoom; at: (d: number) => { x: number; y: number } } => {
    const room = new CaveRoom(entrance), p = room.player; room.monsters.clear(); let dir: { dx: number; dy: number } | null = null;
    for (let a = 0; a < 16 && !dir; a++) {
      const dx = Math.cos(a * Math.PI / 8), dy = Math.sin(a * Math.PI / 8); let clear = true;
      for (let s = 1; s <= 40 && clear; s++) clear = room.collision.canMove(p.x + dx * 6 * s, p.y + dy * 6 * s);
      if (clear) dir = { dx, dy };
    }
    assert.ok(dir, "há uma reta livre de 240 pixels"); room.player.faceX = dir.dx; room.player.faceY = dir.dy;
    return { room, at: d => ({ x: p.x + dir!.dx * d, y: p.y + dir!.dy * d }) };
  };
  const cast = (room: CaveRoom, staff: StaffId, target: string, gain?: (a: number) => void): void => { for (let i = 0; i < 30; i++) room.update(1 / 60, STILL, i === 0, "starter", 0, target, { staff, spend: () => true, gain }); };
  const put = (room: CaveRoom, id: string, pos: { x: number; y: number }, hp: number): RegionalMonster => { const m = new RegionalMonster(id, "glacial-wolf", pos.x, pos.y); m.hp = hp; room.monsters.set(id, m); return m; };
  const sun = open(); const a = put(sun.room, "a", sun.at(70), 5000), b = put(sun.room, "b", sun.at(110), 5000), c = put(sun.room, "c", sun.at(150), 5000);
  cast(sun.room, "sun", "a"); assert.equal(5000 - a.hp, 84 - a.defense, "caverna: o alvo"); assert.equal(5000 - b.hp, 84 - b.defense, "caverna: o de trás"); assert.equal(c.hp, 5000, "caverna: só um é atravessado");
  const kill = open(); put(kill.room, "a", kill.at(70), 10); put(kill.room, "b", kill.at(110), 10); cast(kill.room, "sun", "a"); assert.equal(kill.room.monsters.size, 0, "caverna: os dois caíram e foram removidos");
  const storm = open(); const s1 = put(storm.room, "a", storm.at(70), 5000), s2 = put(storm.room, "b", storm.at(100), 5000), s3 = put(storm.room, "c", storm.at(130), 5000), s4 = put(storm.room, "d", storm.at(160), 5000);
  cast(storm.room, "storm", "a"); assert.equal(5000 - s1.hp, 115 - s1.defense); assert.equal(5000 - s2.hp, 69 - s2.defense, "caverna: 60% no salto"); assert.equal(5000 - s3.hp, 69 - s3.defense); assert.equal(s4.hp, 5000, "caverna: só dois saltos");
  const stormKill = open(); for (const [i, id] of ["a", "b", "c"].entries()) put(stormKill.room, id, stormKill.at(70 + i * 30), 10); cast(stormKill.room, "storm", "a"); assert.equal(stormKill.room.monsters.size, 0, "caverna: o raio derrubou os três");
  const moon = open(), gains: number[] = []; const m1 = put(moon.room, "a", moon.at(80), 5000); cast(moon.room, "moon", "a", amount => gains.push(amount));
  assert.deepEqual(gains, [Math.round((98 - m1.defense) / 10)], "caverna: 10% do dano volta em mana"); assert.equal(gains[0], 10);
  const none = open(), noGains: number[] = []; put(none.room, "a", none.at(80), 5000); cast(none.room, "frost", "a", amount => noGains.push(amount)); assert.deepEqual(noGains, [], "caverna: outro cajado não devolve");
  assert.doesNotThrow(() => { const room = open(); put(room.room, "a", room.at(80), 5000); cast(room.room, "moon", "a"); }, "caverna: sem quem receba a mana nada acontece");
});

test("os cajados do lote 3 liberam sozinhos nos níveis 70, 80 e 90, e a troca respeita o nível", () => {
  const sim = mageAt(90);
  for (const [staff, interval] of [["sun", 1.45], ["moon", 1.5], ["storm", 1.35]] as const) {
    assert.equal(equipStaff(context(sim), staff).changed, true); assert.equal(sim.equippedStaff, staff); assert.equal(sim.combatProfile.interval, interval); assert.equal(sim.combatProfile.ranged?.reach, 6 * 32);
  }
  const low = mageAt(69); assert.equal(equipStaff(context(low), "sun").changed, false, "no nível 69 o Sol Nascente ainda não"); assert.equal(low.equippedStaff, "apprentice");
  assert.equal(equipStaff(context(mageAt(70)), "sun").changed, true); assert.equal(equipStaff(context(mageAt(79)), "moon").changed, false); assert.equal(equipStaff(context(mageAt(80)), "moon").changed, true);
  assert.equal(equipStaff(context(mageAt(89)), "storm").changed, false); assert.equal(equipStaff(context(mageAt(90)), "storm").changed, true);
  const saved = mageAt(90); equipStaff(context(saved), "storm"); assert.equal(new OfflineSimulation(SEED, saved.snapshot()).equippedStaff, "storm", "o cajado fica no save");
});

test("o texto do efeito de cada cajado do lote 3, e o documento e o ícone conhecem os três", () => {
  assert.equal(describeStaffEffect(STAVES.sun.effect), "o feixe atravessa o alvo e atinge também um monstro atrás dele");
  assert.equal(describeStaffEffect({ kind: "pierce", extra: 2 }), "o feixe atravessa o alvo e atinge também 2 monstros atrás dele");
  assert.equal(describeStaffEffect(STAVES.moon.effect), "devolve 10% do dano causado em mana");
  assert.equal(describeStaffEffect(STAVES.storm.effect), "o raio salta para até 2 monstros vizinhos, cada salto com 60% do dano");
  const icons = read("src/app/item-icon.component.ts");
  for (const id of ["sun", "moon", "storm"]) { assert.ok(new RegExp(`'staff-${id}'\\s*\\|`).test(icons) || icons.includes(`'staff-${id}'`), id + " no tipo do ícone"); assert.ok(icons.includes(`@case ('staff-${id}')`), id + " tem o desenho do ícone"); }
});
