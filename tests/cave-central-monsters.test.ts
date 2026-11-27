import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { RegionalMonster, rollCreatureLoot } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { AELA_SLIME_GOAL } from "../src/world/aelaQuest.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { caveEntranceInCell, isStarterCave, type CaveEntrance, type CaveTheme } from "../src/world/caves.ts";
import { sampleCaves } from "../src/qa/QaCaves.ts";
import { caveFloorCount } from "../src/dungeons/index.ts";

/**
 * O povo do Centro dentro das grutas (relato do dono: as cavernas do Centro estavam vazias). Primeiro vieram seis slimes (ADR 0083), depois as criaturas do Centro na Gruta das Raízes
 * (ADR 0087 e 0088) e, desde o ADR 0101, toda gruta verde é a Masmorra das Raízes: o povo vem da tabela de cada andar. Aqui ficam o que vale para o povo em geral: a caverna de treinamento e as
 * dos outros temas não mudam; derrubar uma criatura dá a experiência e o saque da ficha; o herói de verdade derruba cada tipo com a espada.
 */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const STARTER = `cave:${SEED}:0:0`;
/** Entradas de caverna comum de cada tema: o Centro fica perto do começo do mundo e os outros temas ficam longe (o bot de QA varre as oito direções). */
const byTheme = new Map<CaveTheme, CaveEntrance[]>(sampleCaves(SEED));
// quem mora nas grutas do Centro (o javali e o lobo só andam pela superfície)
const CENTER_KINDS = ["giant-rat", "cave-bat", "root-spider", "moss-slime", "vine-snake", "root-beetle", "walking-mushroom"] as const;
const rooms = (): CaveRoom[] => (byTheme.get("verdant") ?? []).flatMap(entrance => Array.from({ length: caveFloorCount(entrance) }, (_, i) => new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: i + 1 })));

test("a gruta de treino e as cavernas dos outros temas não mudaram", () => {
  const training = new CaveRoom(caveEntranceInCell(0, 0, SEED)!);
  assert.equal(isStarterCave(training.floor.entrance), true);
  assert.equal(training.monsters.size, AELA_SLIME_GOAL + 2, "a gruta de treino segue com os seus encontros");
  assert.ok([...training.monsters.values()].every(mob => mob.kind === "slime" && mob.id.startsWith(`${STARTER}:floor:1:slime:`)), "a gruta de treino segue só de slimes");
  for (const theme of ["glacial", "desert", "coastal", "basalt", "marsh"] as const) {
    const entrances = byTheme.get(theme) ?? [];
    assert.ok(entrances.length >= 3, `${theme}: há cavernas para conferir (antes a varredura curta não achava nenhuma e o teste não conferia nada)`);
    for (const entrance of entrances.slice(0, 3)) {
      const room = new CaveRoom(entrance);
      assert.ok(room.monsters.size > 0, `${theme}: tem monstros`);
      assert.ok([...room.monsters.values()].every(mob => mob instanceof RegionalMonster && !(CENTER_KINDS as readonly string[]).includes(mob.kind)), `${theme}: só criaturas da própria região, sem slimes nem bichos do Centro`);
    }
  }
});

test("as grutas do Centro têm povo do Centro de verdade: nada de slime comum, todos os sete tipos aparecem e cada um mora em caverna verde", () => {
  const kinds = new Set<string>();
  for (const room of rooms()) for (const mob of room.monsters.values()) {
    assert.ok(mob instanceof RegionalMonster && !(mob instanceof Slime && mob.kind === "slime"), "só criaturas regionais");
    assert.ok(CREATURE_CATALOG[mob.kind].caveThemes.includes("verdant"), mob.kind);
    kinds.add(mob.kind);
  }
  for (const kind of CENTER_KINDS) assert.ok(kinds.has(kind), kind + " aparece nas grutas do Centro");
  assert.ok(kinds.has("living-root") && kinds.has("elder-cave-ent"), "a elite e o chefe também");
});

test("derrubar um slime da gruta de treino conta como abate e dá experiência; o gel e as moedas ficam no chão da caverna", () => {
  const sim = new OfflineSimulation(SEED), room = new CaveRoom(caveEntranceInCell(0, 0, SEED)!);
  const mob = [...room.monsters.values()].find(m => m.kind === "slime")!, xp = sim.experience;
  const source = { drainVictories: () => [{ kind: "slime" as const, id: mob.id }], player: room.player };
  assert.equal(applyCaveVictories(sim, source), true);
  assert.ok(sim.experience > xp, "ganhou experiência"); assert.equal(sim.inventory.gel, 0, "o gel e as moedas ficam no chão da caverna, não vão direto para a bolsa"); assert.equal(sim.kills, 1);
  assert.equal(sim.defeated.has(mob.id), true);
});

/** Uma criatura do tipo dado, numa das grutas do Centro varridas (e a sala dela). */
const findMob = (kind: string) => { for (const room of rooms()) { const mob = [...room.monsters.values()].find(m => m.kind === kind); if (mob) return { room, mob }; } throw new Error("sem " + kind); };

test("derrubar uma criatura do Centro dá a experiência da ficha, conta como abate e o saque da ficha cai na bolsa", () => {
  for (const kind of CENTER_KINDS) {
    const sim = new OfflineSimulation(SEED), { room, mob } = findMob(kind);
    const xp = sim.experience, id = mob.id;
    assert.equal(applyCaveVictories(sim, { drainVictories: () => [{ kind, id }], player: room.player }), true);
    assert.equal(sim.experience - xp, CREATURE_CATALOG[kind].experience, kind + ": a experiência é a da ficha");
    // `kills` é o contador de slimes (usado também pela missão de montaria): bicho do Centro que não é slime não mexe nele
    assert.equal(sim.kills, 0, kind + ": não conta como slime"); assert.equal(sim.defeated.has(id), true);
    // o saque da ficha (a mesma rolagem determinística pelo id) vai para a bolsa, e só ele
    const expected: Record<string, number> = {};
    for (const item of rollCreatureLoot(kind, id)) expected[item] = (expected[item] ?? 0) + 1;
    assert.deepEqual(sim.inventory.materials, expected, kind + ": o saque é o da ficha");
  }
  // com mais de um id a rolagem tem de render algo: a ficha não é só enfeite (rato: 55% e 30%)
  let dropped = 0;
  for (let i = 0; i < 40; i++) dropped += rollCreatureLoot("giant-rat", "cave:1:2:floor:1:mob:" + i).length;
  assert.ok(dropped > 10 && dropped < 50, "o rato gigante deixa material: " + dropped);
});

test("o herói de verdade derruba cada um dos sete tipos comuns das grutas do Centro com a espada", () => {
  for (const kind of CENTER_KINDS) {
    const { room, mob } = findMob(kind);
    mob.x = room.player.x + 18; mob.y = room.player.y;
    for (const other of [...room.monsters.values()]) if (other !== mob) room.monsters.delete(other.id);
    for (let i = 0; i < 800 && room.monsters.has(mob.id); i++) room.update(0.05, { x: 0, y: 0 }, true, "starter", 0, mob.id);
    assert.equal(room.monsters.has(mob.id), false, kind + " caiu");
    assert.deepEqual(room.drainVictories(), [{ kind: kind as never, id: mob.id }]);
  }
});

test("a ligação: a gruta comum do Centro e o sorteio central acabaram (o povo vem da tabela de cada andar da masmorra)", () => {
  const cave = read("src/engine/rooms/CaveRoom.ts");
  assert.doesNotMatch(cave, /centralCaveMonsters|CaveCentral/);
  assert.match(cave, /const kinds=plan \? plan\.monsters : caveMonsterKinds\(entrance\.theme\);/, "sem tabela de andar, vale o povo regional do tema");
});
