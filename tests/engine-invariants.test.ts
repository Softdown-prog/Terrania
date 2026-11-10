import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation, MAX_KILLS, normalizeKills, type OfflineSave } from "../src/engine/OfflineSimulation.ts";
import { grantExperience, experienceForLevel, MAX_EXPERIENCE } from "../src/engine/Experience.ts";
import { swordArc, swordStrikeTargets } from "../src/engine/SwordCombat.ts";
import { ClassicCombat } from "../src/engine/ClassicCombat.ts";
import { CaveRoom } from "../src/engine/CaveRoom.ts";
import { applyCaveVictories } from "../src/engine/CaveRewards.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { Player } from "../src/actors/Player.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import { loadLocalSave } from "../src/storage/localSave.ts";

/**
 * Invariantes do motor que já quebraram uma vez. Cada teste falha sem a correção
 * correspondente; a lista está em "Invariantes do motor" no AGENTS.md.
 */
const SEED = 842136;
const OPEN = { canMove: () => true };
const STILL = { x: 0, y: 0 };
const TICK = 1 / 60;

/** Um golpe completo (preparo incluído) contra o alvo, sem mover o herói. */
function swing(sim: OfflineSimulation, targetId: string | null | undefined): void {
  sim.update(TICK, STILL, true, targetId);
  for (let i = 0; i < 20 && !sim.awaitingRespawn; i++) sim.update(TICK, STILL, false, targetId);
}

test("derrota: subir de nível no abate que matou o herói não o ressuscita", () => {
  const hero = { hp: 0, maxHp: 100 };
  assert.equal(grantExperience(experienceForLevel(2) - 1, 5, hero), experienceForLevel(2) + 4);
  assert.deepEqual(hero, { hp: 0, maxHp: 110 }, "a vida máxima sobe, a vida continua em zero");
  const alive = { hp: 40, maxHp: 100 };
  grantExperience(0, experienceForLevel(2), alive);
  assert.deepEqual(alive, { hp: 50, maxHp: 110 }, "herói de pé continua ganhando a vida do nível");

  // No jogo: o Escaravelho Solar explode ao morrer e rende 175 XP (nível 1 -> 3).
  const sim = new OfflineSimulation(SEED);
  sim.update(TICK, STILL, false, null);
  sim.slimes.clear();
  // Arena de superfície externa: não contornar o bloqueio real da vila para testar explosões.
  sim.player.x = (44.5) * 32; sim.player.y = (11.5) * 32;
  sim.player.faceX = 1; sim.player.faceY = 0;
  const scarab = new RegionalMonster("teste:escaravelho", "solar-scarab", sim.player.x + 40, sim.player.y);
  scarab.hp = 1;
  sim.slimes.set(scarab.id, scarab);
  sim.player.hp = 10;
  swing(sim, scarab.id);
  assert.ok(sim.defeated.has(scarab.id), "o escaravelho precisa ter sido abatido");
  assert.equal(sim.experience, 175);
  assert.equal(sim.player.hp, 0);
  assert.equal(sim.awaitingRespawn, true, "a explosão matou o herói; só respawn() o traz de volta");
  assert.equal(sim.snapshot().awaitingRespawn, true);
  assert.equal(sim.respawn(), true);
  assert.equal(sim.player.hp, sim.player.maxHp);
});

test("derrota na caverna: vitória por dano periódico no mesmo passo não ressuscita", () => {
  const sim = new OfflineSimulation(SEED);
  const cave = { player: { hp: 0, maxHp: 100 },
    drainVictories: () => [{ kind: "solar-scarab" as const, id: "caverna:teste:mob:0" }] };
  assert.equal(applyCaveVictories(sim, cave), true);
  assert.equal(cave.player.hp, 0);
});

test("derrota por veneno, longe de qualquer criatura, pede salvamento imediato", () => {
  const sim = new OfflineSimulation(SEED);
  sim.update(TICK, STILL, false, null);
  sim.slimes.clear();
  sim.player.hp = 1;
  sim.player.applyStatus("poison", 5);
  let last = false;
  for (let i = 0; i < 120 && !sim.awaitingRespawn; i++) last = sim.update(TICK, STILL, false, null);
  assert.equal(sim.awaitingRespawn, true);
  assert.equal(last, true, "o passo em que o herói cai precisa devolver true para o jogo salvar");
  assert.equal(sim.update(TICK, STILL, false, null), false, "depois disso a simulação fica parada");
});

test("caverna: a explosão final do escaravelho desconta a defesa, como na superfície", () => {
  const entrance = caveEntranceInCell(0, 0, SEED);
  assert.ok(entrance);
  const burstDamage = (defense: number): number => {
    const cave = new CaveRoom({ ...entrance, theme: "desert" });
    cave.monsters.clear();
    const scarab = new RegionalMonster("caverna:escaravelho", "solar-scarab", cave.player.x, cave.player.y - 40);
    scarab.hp = 1;
    cave.monsters.set(scarab.id, scarab);
    cave.update(TICK, STILL, true, "starter", defense);
    for (let i = 0; i < 20; i++) cave.update(TICK, STILL, false, "starter", defense);
    assert.equal(cave.monsters.size, 0, "o escaravelho precisa ter sido abatido");
    return 100 - cave.player.hp;
  };
  assert.equal(burstDamage(0), 24);
  assert.equal(burstDamage(4), 20);
});

test("espada astral: com alvo escolhido o arco ainda alcança três criaturas", () => {
  assert.deepEqual(swordArc("astral"), { reach: 72, cone: -0.5, targets: 3 });
  assert.deepEqual(swordArc("forge"), { reach: 52, cone: -0.1, targets: 1 });
  const hero = { x: 0, y: 0, faceX: 1, faceY: 0 };
  const near = new Slime("perto", 20, 0), mid = new Slime("meio", 40, 10), far = new Slime("longe", 60, -10);
  const fourth = new Slime("quarto", 65, 12), behind = new Slime("atras", -40, 0);
  const mobs = [far, behind, fourth, near, mid];
  const ids = (list: Slime[]): string[] => list.map(mob => mob.id);
  assert.deepEqual(ids(swordStrikeTargets("astral", hero, mobs, OPEN, "longe")), ["longe", "perto", "meio"],
    "o alvo escolhido vem primeiro e os dois mais próximos completam o arco");
  assert.deepEqual(ids(swordStrikeTargets("astral", hero, mobs, OPEN)), ["perto", "meio", "longe"]);
  assert.deepEqual(ids(swordStrikeTargets("forge", hero, mobs, OPEN, "meio")), ["meio"]);
  assert.deepEqual(swordStrikeTargets("astral", hero, mobs, OPEN, null), [], "golpe sem alvo não fere");
  assert.deepEqual(swordStrikeTargets("astral", hero, mobs, OPEN, "atras"), [],
    "alvo fora do arco cancela o golpe em vez de ferir os vizinhos");
  const wall = { canMove: (x: number) => x < 30 };
  assert.deepEqual(ids(swordStrikeTargets("astral", hero, mobs, wall, "perto")), ["perto"],
    "o arco não atravessa paredes");

  const save: OfflineSave = { seed: SEED, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
    experience: MAX_EXPERIENCE, inventory: { gel: 0, potion: 0, questRewardClaimed: false,
      loadout: { forged: false, equipped: "astral" } } };
  const sim = new OfflineSimulation(SEED, save);
  assert.equal(sim.inventory.loadout.equipped, "astral");
  sim.update(TICK, STILL, false, null);
  sim.slimes.clear();
  const { x, y } = sim.player;
  for (const [id, dx, dy] of [["a", 30, 0], ["b", 45, 12], ["c", 45, -12]] as const)
    sim.slimes.set(id, new Slime(id, x + dx, y + dy));
  sim.player.faceX = 1; sim.player.faceY = 0;
  swing(sim, "a");
  assert.deepEqual([...sim.defeated].sort(), ["a", "b", "c"]);
  assert.equal(sim.kills, 3);
});

test("alvo clássico: atordoamento não gasta a recarga nem o golpe", () => {
  const hero = new Player();
  const mobs = new Map([["a", new Slime("a", hero.x + 20, hero.y)]]);
  const combat = new ClassicCombat();
  assert.equal(combat.select("a", mobs), true);
  hero.applyStatus("stun", 0.5);
  assert.equal(hero.stunned, true);
  assert.equal(combat.tick(TICK, hero, mobs, OPEN), false);
  assert.equal(combat.cooldown, 0, "nenhum intervalo de arma foi consumido");
  assert.equal(combat.strikeTargetId, null);
  for (let i = 0; i < 31; i++) hero.update(TICK, STILL, OPEN, true);
  assert.equal(hero.stunned, false);
  assert.equal(combat.tick(TICK, hero, mobs, OPEN), true, "o golpe sai assim que o atordoamento acaba");
  assert.equal(hero.startAttack(), true);
});

test("save: abates e vida inválidos são normalizados antes de virar estado do jogo", () => {
  assert.equal(normalizeKills(2.9), 2);
  assert.equal(normalizeKills(-3), 0);
  assert.equal(normalizeKills(1e300), MAX_KILLS);
  for (const bad of [NaN, Infinity, "7", null, undefined]) assert.equal(normalizeKills(bad), 0);

  const tampered = { seed: SEED, x: 16, y: 16, hp: NaN, kills: 2.5,
    defeated: ["1,1,0", 7, null] } as unknown as OfflineSave;
  const sim = new OfflineSimulation(SEED, tampered);
  assert.equal(sim.player.hp, sim.player.maxHp, "vida não numérica nunca vira herói imortal");
  assert.equal(sim.kills, 2);
  assert.deepEqual([...sim.defeated], ["1,1,0"]);
  assert.ok(Number.isSafeInteger(sim.snapshot().kills));

  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: () => JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 6.7, defeated: [] }),
    setItem: () => undefined,
  } });
  try {
    assert.equal(loadLocalSave()?.kills, 6, "a missão de montaria exige contagem inteira");
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
