import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation, type OfflineSave } from "../src/engine/OfflineSimulation.ts";
import { CaveRoom } from "../src/engine/CaveRoom.ts";
import { resolveSwordStrike, swordHitDamage } from "../src/engine/SwordCombat.ts";
import { MAX_EXPERIENCE } from "../src/engine/Experience.ts";
import type { WeaponId } from "../src/engine/Weapons.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { Player } from "../src/actors/Player.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";

/**
 * Golpe resolvido por `resolveSwordStrike`: o mesmo laço serve à superfície e à caverna.
 * Estes testes existem porque cada lugar já teve a sua cópia e as duas divergiram
 * (defesa ignorada na caverna, arco astral inalcançável com alvo escolhido).
 */
const SEED = 842136;
const OPEN = { canMove: () => true };
const STILL = { x: 0, y: 0 };
const TICK = 1 / 60;
const hero = (): Player => { const p = new Player(); p.x = 0; p.y = 0; p.faceX = 1; p.faceY = 0; return p; };
const poolOf = <T extends Slime>(...mobs: T[]): Map<string, T> => new Map(mobs.map(m => [m.id, m]));

test("resolveSwordStrike: aplica o dano da lâmina e só avisa quem morreu", () => {
  const h = hero();
  const weak = new Slime("fraco", 20, 0), tough = new RegionalMonster("duro", "basalt-golem", 30, 0);
  weak.hp = 1;
  tough.hp = 10_000;
  const fallen: string[] = [];
  resolveSwordStrike("bronze", h, [weak, tough], poolOf<Slime>(weak, tough), OPEN, mob => fallen.push(mob.id));
  assert.deepEqual(fallen, ["fraco"]);
  const expected = swordHitDamage("bronze", tough);
  assert.ok(expected > 1 && expected < 26, "a defesa da criatura reduz o dano da lâmina");
  assert.equal(tough.hp, 10_000 - expected, "a sobrevivente recebe exatamente o dano calculado com a defesa");
});

test("resolveSwordStrike: criatura já derrotada é ignorada e ninguém é avisado duas vezes", () => {
  const h = hero();
  const dead = new Slime("morto", 20, 0);
  dead.hp = 0;
  const fallen: string[] = [];
  resolveSwordStrike("forge", h, [dead], poolOf(dead), OPEN, mob => fallen.push(mob.id));
  assert.deepEqual(fallen, [], "não há golpe nem aviso contra quem já caiu");
});

test("resolveSwordStrike: o raio da lâmina de tempestade avisa a vítima secundária antes da principal", () => {
  const h = hero();
  const primary = new Slime("principal", 30, 0), neighbour = new Slime("vizinha", 45, 10);
  primary.hp = 1;
  neighbour.hp = 1;
  const fallen: string[] = [];
  resolveSwordStrike("tempest", h, [primary], poolOf<Slime>(primary, neighbour), OPEN, mob => fallen.push(mob.id));
  assert.deepEqual(fallen, ["vizinha", "principal"],
    "a ordem importa: quem chama credita XP e saque nesta sequência");
});

test("resolveSwordStrike: a vizinha só leva o raio se estiver no conjunto do cenário", () => {
  const h = hero();
  const primary = new Slime("principal", 30, 0), outsider = new Slime("fora", 45, 10);
  primary.hp = 1;
  const fallen: string[] = [];
  resolveSwordStrike("tempest", h, [primary], poolOf(primary), OPEN, mob => fallen.push(mob.id));
  assert.deepEqual(fallen, ["principal"]);
  assert.equal(outsider.hp, 2, "quem não está no conjunto nunca é atingido");
});

/** Um golpe completo na superfície, com `n` criaturas à frente e a lâmina pedida. */
function surfaceOutcome(weapon: WeaponId, targetId: string | undefined, ids: readonly string[]): string[] {
  const save: OfflineSave = { seed: SEED, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
    experience: MAX_EXPERIENCE, inventory: { gel: 0, potion: 0, questRewardClaimed: false,
      loadout: { forged: false, equipped: weapon } } };
  const sim = new OfflineSimulation(SEED, save);
  sim.update(TICK, STILL, false, null);
  sim.slimes.clear();
  const { x, y } = sim.player;
  const spots = [[30, 0], [45, 12], [45, -12]] as const;
  ids.forEach((id, i) => {
    const mob = new RegionalMonster(id, "solar-scarab", x + spots[i]![0], y + spots[i]![1]);
    mob.hp = 1;
    sim.slimes.set(id, mob);
  });
  sim.player.faceX = 1;
  sim.player.faceY = 0;
  sim.update(TICK, STILL, true, targetId);
  for (let i = 0; i < 20 && !sim.awaitingRespawn; i++) sim.update(TICK, STILL, false, targetId);
  return [...sim.defeated].sort();
}

function caveOutcome(weapon: WeaponId, targetId: string | undefined, ids: readonly string[]): string[] {
  const entrance = caveEntranceInCell(0, 0, SEED);
  assert.ok(entrance);
  const cave = new CaveRoom({ ...entrance, theme: "desert" }, 100_000, 100_000);
  cave.monsters.clear();
  const { x, y } = cave.player;
  const spots = [[30, 0], [45, 12], [45, -12]] as const;
  ids.forEach((id, i) => {
    const mob = new RegionalMonster(id, "solar-scarab", x + spots[i]![0], y + spots[i]![1]);
    mob.hp = 1;
    cave.monsters.set(id, mob);
  });
  cave.player.faceX = 1;
  cave.player.faceY = 0;
  cave.update(TICK, STILL, true, weapon, 0, targetId);
  for (let i = 0; i < 20; i++) cave.update(TICK, STILL, false, weapon, 0, targetId);
  return cave.drainVictories().map(v => v.id).sort();
}

test("superfície e caverna abatem exatamente as mesmas criaturas com a mesma lâmina", () => {
  const ids = ["a", "b", "c"];
  for (const [weapon, target] of [["astral", undefined], ["astral", "a"], ["astral", "b"],
    ["forge", undefined], ["starter", "a"], ["tempest", "a"]] as const) {
    assert.deepEqual(caveOutcome(weapon, target, ids), surfaceOutcome(weapon, target, ids),
      `a lâmina ${weapon} com alvo ${String(target)} deve render o mesmo abate nos dois cenários`);
  }
  assert.deepEqual(surfaceOutcome("astral", "a", ids), ["a", "b", "c"], "o arco astral alcança as três");
  assert.deepEqual(surfaceOutcome("starter", "b", ids), ["b"], "uma lâmina comum fere só o alvo");
});
