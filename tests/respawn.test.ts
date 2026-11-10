import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation, type OfflineSave } from "../src/engine/OfflineSimulation.ts";
import { MAX_EXPERIENCE } from "../src/engine/character/Experience.ts";
import { BOSS_RESPAWN_SECONDS, LEGACY_RESPAWN_SECONDS, MAX_RESPAWN_SECONDS, MIN_RESPAWN_SECONDS,
  respawnSecondsForId } from "../src/engine/combat/respawn.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { Slime, slimeSpawns } from "../src/actors/Slime.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";

/**
 * Tempo de volta dos monstros (ADR 0029): quanto cada um leva, quando volta, que não aparece na cara
 * do herói, que vai e volta do save, e que o que não pode voltar (treino, missão) não volta.
 */
const SEED = 842136;
const TICK = 1 / 60;
const STILL = { x: 0, y: 0 };
const saveOf = (over: Partial<OfflineSave> = {}): OfflineSave => ({ seed: SEED, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
  experience: MAX_EXPERIENCE, inventory: { gel: 0, potion: 0, questRewardClaimed: false }, ...over });
const spendTime = (sim: OfflineSimulation, seconds: number): void => { for (let i = 0; i < seconds * 10; i++) sim.advanceClock(.1); };
/** Um slime de nascimento real do mundo (id e lugar vêm do gerador do terreno). */
function realSlime(): Slime {
  for (let cy = -3; cy <= 3; cy++) for (let cx = -3; cx <= 3; cx++) {
    const found = slimeSpawns(cx, cy, SEED)[0];
    if (found) return found;
  }
  throw new Error("nenhum slime de nascimento perto do centro");
}

test("o prazo cresce com a força da espécie, entre 60 s e 10 min; o chefe leva 30 min; o treino nunca volta", () => {
  const slime = respawnSecondsForId("x", "slime")!, golem = respawnSecondsForId("x", "basalt-golem")!, mammoth = respawnSecondsForId("x", "tundra-mammoth")!;
  assert.equal(slime, 75, "slime: 60 + 10 × 1,5");
  assert.ok(slime < golem && golem < mammoth && mammoth <= MAX_RESPAWN_SECONDS, `${slime} < ${golem} < ${mammoth} ≤ ${MAX_RESPAWN_SECONDS}`);
  for (const [kind, def] of Object.entries(CREATURE_CATALOG)) {
    const seconds = respawnSecondsForId("qualquer", kind as keyof typeof CREATURE_CATALOG)!;
    assert.ok(seconds >= MIN_RESPAWN_SECONDS && seconds <= MAX_RESPAWN_SECONDS, `${kind}: ${seconds}`);
    assert.ok(def.experience > 0);
  }
  assert.equal(respawnSecondsForId("cave:1:2:floor:3:boss", "carrion-sandworm"), BOSS_RESPAWN_SECONDS);
  assert.equal(respawnSecondsForId(`cave:${SEED}:0:0:floor:1:slime:3`, "slime"), null, "slime de treino da gruta de Aela");
  assert.equal(respawnSecondsForId("sem-espécie"), LEGACY_RESPAWN_SECONDS);
});

test("derrotado só volta quando o prazo passa: antes disso continua derrotado e o que deixou no chão fica", () => {
  const sim = new OfflineSimulation(SEED, saveOf());
  sim.defeated.add("criatura-1");
  sim.noteDefeat("criatura-1", "slime");
  sim.drops.set("criatura-1", { id: "criatura-1", item: "gel", x: 10, y: 10 });
  sim.drops.set("criatura-1:coin", { id: "criatura-1:coin", item: "coin", x: 12, y: 10, amount: 5 });
  spendTime(sim, 74);
  assert.equal(sim.expireDefeats(), 0, "74 s: ainda não");
  assert.equal(sim.defeated.has("criatura-1"), true);
  assert.equal(sim.drops.size, 2);
  spendTime(sim, 2);
  assert.equal(sim.expireDefeats(), 1, "76 s: voltou");
  assert.equal(sim.defeated.has("criatura-1"), false);
  assert.equal(sim.drops.size, 0, "o gel e as moedas somem com a volta");
  assert.equal(sim.expireDefeats(), 0, "só uma vez");
});

test("o monstro do mundo volta quando o prazo passa e o herói está longe, não na cara dele", () => {
  const slime = realSlime();
  const sim = new OfflineSimulation(SEED, saveOf({ x: slime.x + 64, y: slime.y }));
  sim.update(TICK, STILL, false, null);
  assert.ok(sim.slimes.has(slime.id), "nasceu perto do herói");
  sim.slimes.delete(slime.id);
  sim.defeated.add(slime.id);
  sim.noteDefeat(slime.id, "slime");
  spendTime(sim, 200);
  for (let i = 0; i < 400; i++) sim.update(TICK, STILL, false, null);
  assert.equal(sim.slimes.has(slime.id), false, "com o herói do lado, não reaparece");
  assert.equal(sim.defeated.has(slime.id), true);
  // O herói se afasta (ainda dentro do povoamento do entorno) e então ele volta.
  sim.player.x = slime.x + 900; sim.player.y = slime.y;
  for (let i = 0; i < 700; i++) sim.update(TICK, STILL, false, null);
  assert.equal(sim.defeated.has(slime.id), false, "longe, o prazo vencido devolve o monstro");
  assert.ok(sim.slimes.has(slime.id) || Math.hypot(sim.player.x - slime.x, sim.player.y - slime.y) > 1_536,
    "e ele está de novo no mundo");
});

test("a hora de volta vai e volta do save, e save antigo ganha um prazo (menos o treino)", () => {
  const sim = new OfflineSimulation(SEED, saveOf());
  sim.defeated.add("a"); sim.noteDefeat("a", "slime");
  spendTime(sim, 30);
  const snap = JSON.parse(JSON.stringify(sim.snapshot())) as OfflineSave;
  assert.equal(snap.time, 30);
  assert.deepEqual(snap.respawnAt, { a: 75 });
  const loaded = new OfflineSimulation(SEED, snap);
  assert.equal(loaded.time, 30);
  spendTime(loaded, 44);
  assert.equal(loaded.expireDefeats(), 0, "74 s no total");
  spendTime(loaded, 2);
  assert.equal(loaded.expireDefeats(), 1);
  const legacy = new OfflineSimulation(SEED, saveOf({ defeated: ["velho", `cave:${SEED}:0:0:floor:1:slime:2`] }));
  spendTime(legacy, LEGACY_RESPAWN_SECONDS - 1);
  assert.equal(legacy.expireDefeats(), 0);
  spendTime(legacy, 2);
  assert.equal(legacy.expireDefeats(), 1, "o save antigo volta; o slime de treino não");
  assert.equal(legacy.defeated.has(`cave:${SEED}:0:0:floor:1:slime:2`), true);
  assert.equal(legacy.defeated.has("velho"), false);
  for (const dirty of [NaN, -5, "9", null, Infinity])
    assert.equal(new OfflineSimulation(SEED, saveOf({ time: dirty as never })).time, 0, String(dirty));
  const forged = new OfflineSimulation(SEED, saveOf({ defeated: ["x"], respawnAt: { x: 1e12, y: -3 } as never }));
  spendTime(forged, 8_000);
  assert.equal(forged.expireDefeats(), 1, "um prazo absurdo é cortado para o teto");
});

test("na masmorra: a vitória marca a volta, o chefe leva mais e a masmorra repovoa depois", () => {
  const entrance = caveEntranceInCell(0, 125, SEED) ?? caveEntranceInCell(1, 125, SEED);
  assert.ok(entrance);
  const sim = new OfflineSimulation(SEED, saveOf());
  const mob = { kind: "dune-scorpion" as const, id: `${entrance.id}:floor:1:mob:2` };
  const boss = { kind: "carrion-sandworm" as const, id: `${entrance.id}:floor:3:boss` };
  applyCaveVictories(sim, { drainVictories: () => [mob, boss], player: { hp: 100, maxHp: 100 } });
  assert.equal(sim.defeated.has(mob.id), true);
  assert.equal(new CaveRoom(entrance, 100, 100, sim.defeated).monsters.has(mob.id), false, "derrotado não povoa");
  spendTime(sim, 300);
  assert.equal(sim.expireDefeats(), 1, "o comum já voltou; o chefe não");
  assert.equal(sim.defeated.has(boss.id), true);
  assert.equal(new CaveRoom(entrance, 100, 100, sim.defeated).monsters.has(mob.id), true, "a masmorra o repovoa");
  spendTime(sim, BOSS_RESPAWN_SECONDS);
  assert.equal(sim.expireDefeats(), 1, "e o chefe, 30 min depois");
});

test("o relógio só anda com valores válidos e o treino da gruta de Aela nunca volta", () => {
  const sim = new OfflineSimulation(SEED, saveOf());
  for (const bad of [0, -1, NaN, Infinity]) sim.advanceClock(bad);
  assert.equal(sim.time, 0);
  sim.advanceClock(5);
  assert.equal(sim.time, 0.1, "um passo grande é cortado em 0,1 s, como no resto do motor");
  const training = `cave:${SEED}:0:0:floor:1:slime:0`;
  applyCaveVictories(sim, { drainVictories: () => [{ kind: "slime", id: training }], player: { hp: 100, maxHp: 100 } });
  spendTime(sim, 5_000);
  assert.equal(sim.expireDefeats(), 0);
  assert.equal(sim.defeated.has(training), true);
  assert.equal(sim.trainingKills, 1);
});

test("matar de verdade na superfície marca a volta: slime em 75 s, criatura forte em bem mais", () => {
  for (const [mob, seconds] of [[new Slime("morto-slime", 0, 0), 75], [new RegionalMonster("morto-escaravelho", "solar-scarab", 0, 0), respawnSecondsForId("x", "solar-scarab")!]] as const) {
    const sim = new OfflineSimulation(SEED, saveOf());
    sim.update(TICK, STILL, false, null);
    sim.slimes.clear();
    mob.x = sim.player.x + 30; mob.y = sim.player.y; mob.hp = 1;
    sim.slimes.set(mob.id, mob);
    sim.player.faceX = 1; sim.player.faceY = 0;
    sim.update(TICK, STILL, true, mob.id);
    for (let i = 0; i < 30 && !sim.defeated.has(mob.id); i++) sim.update(TICK, STILL, false, mob.id);
    assert.equal(sim.defeated.has(mob.id), true, mob.id + " caiu");
    const when = sim.snapshot().respawnAt?.[mob.id];
    assert.ok(when !== undefined, "a volta foi marcada");
    assert.ok(Math.abs(when! - (sim.time + seconds)) < .5, `${mob.id}: volta em ${seconds} s (marcado ${when}, agora ${sim.time})`);
  }
});
