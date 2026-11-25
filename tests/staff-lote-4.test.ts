import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { MAGE } from "../src/engine/character/classes/index.ts";
import { STAFF_IDS, STAVES, staffUnlocked, type StaffId } from "../src/engine/character/Staves.ts";
import { WEAPONS } from "../src/engine/character/Weapons.ts";
import { ATTACK_DURATION } from "../src/engine/combat/combat.ts";
import { resolveSpellStrike, spellHitDamage, spellStrikeTargets } from "../src/engine/combat/SpellCombat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { equipStaff } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { describeStaffEffect } from "../src/game/messages/staffEffects.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";

/**
 * O Cajado Astral de Terrania (ADR 0077, lote 4, o último dos onze): acerta o alvo e até 2 monstros vizinhos **dele**, todos com o dano
 * inteiro, na superfície e na caverna; com a lista de `docs/MAGO_CAJADOS.md`.
 */
const SEED = 842136, OPEN: CollisionMap = { canMove: () => true }, STILL = { x: 0, y: 0 };
const read = (path: string): string => readFileSync(path, "utf8");
const { mana: _fresh, ...MAGE_SAVE } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
const mageAt = (level: number) => new OfflineSimulation(SEED, { ...MAGE_SAVE, experience: experienceForLevel(level) } as never);
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const hero = (): Player => { const p = new Player(); p.x = 100; p.y = 100; p.faceX = 1; p.faceY = 0; p.hp = 50; p.maxHp = 100; return p; };
const wolf = (id: string, x: number, y: number, hp = 5000): RegionalMonster => { const m = new RegionalMonster(id, "glacial-wolf", x, y); m.hp = hp; return m; };
const ids = (list: readonly Slime[]): string[] => list.map(m => m.id);
const wall = (x: number): CollisionMap => ({ canMove: (px: number) => !(px >= x && px <= x + 8) });

test("a lista aprovada: nível 100, 140 de dano, 1,6 s, 166 de mana, preparo 0,21 s, astral, e a regra de espelhar a Espada Astral", () => {
  const s = STAVES.astral, sword = WEAPONS.astral;
  assert.deepEqual([s.name, s.level, s.damage, s.interval, s.manaCost, s.windup, s.element, s.range, s.price], ["Cajado Astral de Terrania", 100, 140, 1.6, 166, 0.21, "astral", 6, undefined]);
  assert.deepEqual(s.effect, { kind: "nova", neighbors: 2, radius: 96 });
  assert.equal(s.level, sword.level); assert.equal(s.damage, sword.damage);
  assert.ok(Math.abs(s.interval - Math.round((sword.interval + 0.2) * 100) / 100) < 1e-9, "intervalo"); assert.equal(s.manaCost, Math.round(s.interval * MAGE.maxMana(s.level) / 10), "mana");
  assert.ok(Math.abs(s.windup - (sword.windup + 0.05)) < 1e-9, "preparo"); assert.ok(s.windup < ATTACK_DURATION, "o preparo cabe no golpe");
  assert.equal(staffUnlocked("astral", 100), true, "libera no nível, sem comprar"); assert.equal(staffUnlocked("astral", 99), false);
  assert.equal(STAFF_IDS.length, 11, "com o Astral os onze cajados estão no jogo"); assert.equal(new Set(Object.values(STAVES).map(x => x.visual.gem.mid)).size, 11, "cada um com a gema da sua cor");
  const doc = read("docs/MAGO_CAJADOS.md"); assert.ok(doc.includes("| 100 | Cajado Astral de Terrania |") && doc.includes("| 140 |") && doc.includes("1,6") && doc.includes("| 166 |"));
  for (const id of STAFF_IDS) assert.ok(STAVES[id].level <= 100, id);
});

test("a nova astral atinge o alvo e os 2 vizinhos mais perto DELE (medidos a partir do alvo, não um do outro), todos com o dano inteiro", () => {
  const h = hero(), target = wolf("a", 150, 100), near = wolf("p", 190, 100), mid = wolf("q", 150, 100 + 70), far = wolf("r", 150, 100 - 90);
  assert.deepEqual(ids(spellStrikeTargets("astral", h, [far, mid, near, target], OPEN, "a")), ["a", "p", "q"], "o alvo e os dois mais perto dele, do mais perto para o mais longe; o terceiro (a 90) fica de fora");
  assert.deepEqual(ids(spellStrikeTargets("astral", h, [target, near, mid].values(), OPEN, "a")), ["a", "p", "q"], "vale também para um iterador");
  assert.deepEqual(ids(spellStrikeTargets("astral", h, [target, near], OPEN, "a")), ["a", "p"], "com um vizinho só, um"); assert.deepEqual(ids(spellStrikeTargets("astral", h, [target], OPEN, "a")), ["a"], "sem vizinhos só o alvo");
  const away = wolf("w", 150, 100 + 90), side = wolf("s", 150 + 40, 100); assert.deepEqual(ids(spellStrikeTargets("astral", h, [target, side, away], OPEN, "a")), ["a", "s", "w"], "o vizinho a 90 do alvo e a 98 do outro entra (a Tempestade não chegaria nele, o salto sai do outro vizinho)");
  assert.deepEqual(ids(spellStrikeTargets("storm", h, [target, side, away], OPEN, "a")), ["a", "s"], "a Tempestade, no mesmo lugar, para no primeiro: o segundo salto é de 98 pixels");
  resolveSpellStrike("astral", h, [target, near, mid], OPEN, () => {});
  for (const mob of [target, near, mid]) assert.equal(5000 - mob.hp, 140 - mob.defense, "dano inteiro em todos: " + mob.id);
  assert.equal(spellHitDamage("astral", near, 1), 140); assert.equal(spellHitDamage("astral", near, 2), 140, "sem redução no vizinho");
  const golem = new Slime("g", 190, 100, "basalt-golem"), first = wolf("a", 150, 100); golem.hp = 5000; first.hp = 5000; resolveSpellStrike("astral", h, [first, golem], OPEN, () => {}); assert.equal(5000 - golem.hp, 140 - 20, "a defesa do vizinho conta");
});

test("o que a nova NÃO atinge: além de 3 tiles do alvo, atrás de parede, quem já caiu, e o empate vai pelo id", () => {
  const h = hero(), target = wolf("a", 150, 100), pick = (...others: RegionalMonster[]): string[] => ids(spellStrikeTargets("astral", h, [target, ...others], OPEN, "a"));
  assert.deepEqual(pick(wolf("in", 150 + 96, 100)), ["a", "in"], "a 96 pixels entra"); assert.deepEqual(pick(wolf("out", 150 + 97, 100)), ["a"], "a 97 não");
  assert.deepEqual(pick(wolf("up", 150, 100 - 96), wolf("left", 150 - 96, 100)), ["a", "left", "up"], "em qualquer direção, e o empate vai pelo id (left antes de up)"); assert.deepEqual(pick(wolf("up", 150, 100 - 96), wolf("left", 150 - 96, 100)).slice(1), ["left", "up"]);
  assert.deepEqual(pick(wolf("dead", 190, 100, 0)), ["a"], "quem já caiu fica de fora");
  assert.deepEqual(pick(wolf("e", 190, 100), wolf("d", 110, 100), wolf("c", 150, 130)).slice(1), ["c", "d"], "os mais perto primeiro (30), e entre dois a 40 vale o id menor");
  assert.deepEqual(pick(wolf("n", 150, 100 - 60), wolf("m", 150, 100 + 60)).slice(1), ["m", "n"], "empate de distância: id menor primeiro");
  assert.deepEqual(ids(spellStrikeTargets("astral", h, [target, wolf("n", 190, 100)], wall(165), "a")), ["a"], "parede entre o alvo e o vizinho");
  assert.deepEqual(ids(spellStrikeTargets("astral", h, [target, wolf("n", 190, 100)], wall(130), "a")), [], "parede entre o herói e o alvo: nada é atingido");
  assert.deepEqual(ids(spellStrikeTargets("astral", h, [target, wolf("n", 190, 100)], OPEN, null)), [], "sem alvo escolhido não fere ninguém");
  for (const staff of ["apprentice", "breeze", "stone", "tide", "ember", "thorn", "frost", "moon"] as const) assert.deepEqual(ids(spellStrikeTargets(staff, hero(), [target, wolf("n", 190, 100)], OPEN, "a")), ["a"], staff + " só atinge o alvo");
});

test("a nova não devolve mana nem cura: só acerta mais gente", () => {
  const gains: number[] = [], h = hero(), before = h.hp; resolveSpellStrike("astral", h, [wolf("a", 150, 100), wolf("b", 190, 100)], OPEN, () => {}, a => gains.push(a));
  assert.deepEqual(gains, [], "sem mana"); assert.equal(h.hp, before, "sem cura");
});

function stage(level: number, staff: StaffId, mobs: ReadonlyArray<{ id: string; x: number; hp: number }>): { sim: OfflineSimulation; mobs: Map<string, RegionalMonster> } {
  const sim = mageAt(level); sim.update(0.01, STILL, false); sim.slimes.clear(); sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
  if (staff !== sim.equippedStaff) assert.equal(equipStaff(context(sim), staff).changed, true);
  const made = new Map<string, RegionalMonster>(); for (const m of mobs) { const mob = new RegionalMonster(m.id, "glacial-wolf", m.x, 16); mob.hp = m.hp; sim.slimes.set(m.id, mob); made.set(m.id, mob); }
  return { sim, mobs: made };
}
const castOnce = (sim: OfflineSimulation, staff: StaffId, target: string): void => {
  assert.equal(sim.player.startCast(staff, c => sim.spendMana(c)), true, "a magia saiu");
  for (let i = 0; i < 60 && sim.player.attackTime > 0; i++) sim.update(1 / 60, STILL, false, target);
};

test("na superfície: a nova atinge o alvo e os 2 mais perto, os que caem contam como derrota (experiência e remoção)", () => {
  const live = stage(100, "astral", [{ id: "a", x: 100, hp: 5000 }, { id: "b", x: 140, hp: 5000 }, { id: "c", x: 180, hp: 5000 }, { id: "d", x: 220, hp: 5000 }]); castOnce(live.sim, "astral", "a");
  const lost = (id: string): number => 5000 - live.mobs.get(id)!.hp, def = (id: string): number => live.mobs.get(id)!.defense;
  assert.equal(lost("a"), 140 - def("a")); assert.equal(lost("b"), 140 - def("b")); assert.equal(lost("c"), 140 - def("c"), "o segundo vizinho (a 80 do alvo) também, com o dano inteiro"); assert.equal(lost("d"), 0, "o quarto (a 120) não");
  const kill = stage(100, "astral", [{ id: "a", x: 100, hp: 10 }, { id: "b", x: 140, hp: 10 }, { id: "c", x: 180, hp: 10 }, { id: "d", x: 220, hp: 10 }]);
  castOnce(kill.sim, "astral", "a"); assert.deepEqual([...kill.sim.slimes.keys()], ["d"], "os três caíram de uma só magia e foram removidos; o quarto ficou");
  assert.deepEqual(["a", "b", "c"].map(id => kill.sim.defeated.has(id)), [true, true, true], "e os três contam como derrotados (o nível 100 é o máximo, então a experiência já não sobe)"); assert.equal(kill.sim.defeated.has("d"), false);
  const one = stage(100, "apprentice", [{ id: "a", x: 100, hp: 8 }, { id: "b", x: 140, hp: 8 }]); castOnce(one.sim, "apprentice", "a"); assert.deepEqual([...one.sim.defeated], ["a"], "com o Aprendiz só o alvo cai");
});

test("na caverna: a nova atinge o alvo e os 2 mais perto com o dano inteiro e os que caem são removidos", () => {
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
  const cast = (room: CaveRoom, target: string): void => { for (let i = 0; i < 30; i++) room.update(1 / 60, STILL, i === 0, "starter", 0, target, { staff: "astral", spend: () => true }); };
  const put = (room: CaveRoom, id: string, pos: { x: number; y: number }, hp: number): RegionalMonster => { const m = new RegionalMonster(id, "glacial-wolf", pos.x, pos.y); m.hp = hp; room.monsters.set(id, m); return m; };
  const live = open(); const a = put(live.room, "a", live.at(70), 5000), b = put(live.room, "b", live.at(110), 5000), c = put(live.room, "c", live.at(150), 5000), d = put(live.room, "d", live.at(190), 5000);
  cast(live.room, "a"); for (const [mob, name] of [[a, "alvo"], [b, "primeiro"], [c, "segundo"]] as const) assert.equal(5000 - mob.hp, 140 - mob.defense, "caverna: " + name); assert.equal(d.hp, 5000, "caverna: só dois vizinhos");
  const kill = open(); for (const [i, id] of ["a", "b", "c"].entries()) put(kill.room, id, kill.at(70 + i * 40), 10); cast(kill.room, "a"); assert.equal(kill.room.monsters.size, 0, "caverna: os três caíram e foram removidos");
});

test("o Astral libera sozinho no nível 100, a troca respeita o nível e o save guarda", () => {
  const sim = mageAt(100); assert.equal(equipStaff(context(sim), "astral").changed, true); assert.equal(sim.equippedStaff, "astral"); assert.equal(sim.combatProfile.interval, 1.6); assert.equal(sim.combatProfile.ranged?.reach, 6 * 32);
  assert.equal(new OfflineSimulation(SEED, sim.snapshot()).equippedStaff, "astral", "o cajado fica no save");
  const low = mageAt(99); assert.equal(equipStaff(context(low), "astral").changed, false, "no nível 99 ainda não"); assert.equal(low.equippedStaff, "apprentice");
  for (const staff of STAFF_IDS) if (staff !== "breeze") assert.equal(equipStaff(context(sim), staff).changed, true, "o mago nível 100 usa " + staff);
});

test("o texto do efeito e o ícone do Astral, e o documento marca o lote 4 como feito", () => {
  assert.equal(describeStaffEffect(STAVES.astral.effect), "acerta o alvo e até 2 monstros vizinhos dele, todos com o dano inteiro");
  assert.equal(describeStaffEffect({ kind: "nova", neighbors: 1, radius: 96 }), "acerta o alvo e até 1 monstros vizinhos dele, todos com o dano inteiro");
  const icons = read("src/app/item-icon.component.ts"); assert.ok(icons.includes("'staff-astral'") && icons.includes("@case ('staff-astral')"), "o ícone do Astral");
});
