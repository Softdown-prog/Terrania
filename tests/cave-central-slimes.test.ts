import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { AELA_SLIME_GOAL } from "../src/world/aelaQuest.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { CENTRAL_CAVE_SLIMES, centralCaveSlimes } from "../src/engine/rooms/CaveSlimes.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { caveEntranceInCell, type CaveEntrance, type CaveTheme } from "../src/world/caves.ts";
import { sampleCaves } from "../src/qa/QaCaves.ts";

/**
 * Relato do dono: as cavernas do Centro estavam vazias (sem monstro, sem nada). Causa: o jogo povoa a caverna com as criaturas regionais do tema dela, e o tema
 * do Centro (Gruta das Raízes) não tinha nenhuma. O povo do Centro são os slimes: as cavernas comuns do Centro passam a nascer com seis slimes cada.
 */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");
const STARTER = `cave:${SEED}:0:0`;
/** Entradas de caverna comum de cada tema: o Centro fica perto do começo do mundo e os outros temas ficam longe (o bot de QA varre as oito direções). */
const byTheme = new Map<CaveTheme, CaveEntrance[]>(sampleCaves(SEED));
for (let cx = -8; cx <= 8; cx++) for (let cy = -8; cy <= 8; cy++) {
  const entrance = caveEntranceInCell(cx, cy, SEED);
  if (entrance && entrance.id !== STARTER && !entrance.tower && entrance.theme === "verdant" && !(byTheme.get("verdant") ?? []).some(item => item.id === entrance.id)) byTheme.set("verdant", [...(byTheme.get("verdant") ?? []), entrance]);
}
const central = byTheme.get("verdant") ?? [];

test("as cavernas comuns do Centro nascem com seis slimes cada, em solo transitável, longe do herói e uns dos outros", () => {
  assert.ok(central.length >= 6, "há cavernas do Centro para conferir: " + central.length);
  for (const entrance of central) {
    const room = new CaveRoom(entrance);
    assert.equal(room.monsters.size, CENTRAL_CAVE_SLIMES, entrance.id + ": seis slimes");
    assert.equal(CENTRAL_CAVE_SLIMES, 6);
    const mobs = [...room.monsters.values()];
    for (const mob of mobs) {
      assert.ok(mob instanceof Slime && !(mob instanceof RegionalMonster) && mob.kind === "slime", "é slime, não criatura regional");
      assert.ok(room.collision.canMove(mob.x, mob.y), "em solo transitável");
      assert.ok(Math.hypot(mob.x - room.player.x, mob.y - room.player.y) >= 170, "longe de quem chega");
      assert.ok(mob.id.startsWith(room.floor.id + ":slime:"), "o id leva o andar e o número: " + mob.id);
    }
    for (const [i, a] of mobs.entries()) for (const b of mobs.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 92, "uns longe dos outros");
    assert.equal(new Set(room.monsters.keys()).size, CENTRAL_CAVE_SLIMES);
  }
});

test("os slimes são sempre os mesmos para a mesma caverna e mudam de uma caverna para outra", () => {
  const spots = (entrance: CaveEntrance): string => [...new CaveRoom(entrance).monsters.values()].map(m => `${m.x},${m.y}`).join("|");
  const first = central[0]!;
  assert.equal(spots(first), spots(first), "determinístico");
  assert.equal(new Set(central.map(spots)).size, central.length, "cada caverna tem os seus pontos");
});

test("quem já caiu não volta (o save), e os outros continuam", () => {
  const entrance = central[0]!, full = new CaveRoom(entrance), ids = [...full.monsters.keys()];
  const room = new CaveRoom(entrance, 100, 100, new Set([ids[0]!, ids[1]!]));
  assert.equal(room.monsters.size, CENTRAL_CAVE_SLIMES - 2); assert.equal(room.monsters.has(ids[0]!), false); assert.equal(room.monsters.has(ids[2]!), true);
  assert.equal(new CaveRoom(entrance, 100, 100, new Set(ids)).monsters.size, 0, "todos derrotados: caverna limpa");
  const hero = { x: full.player.x, y: full.player.y }, blocked = { canMove: () => false };
  assert.equal(centralCaveSlimes(entrance, "f", blocked, hero, new Set()).length, 0, "tudo parede: nenhum slime em parede");
  // o sorteio só alcança as linhas 4 a 21; se o único chão fica mais embaixo, a garantia varre as câmaras e acha pelo menos três pontos
  const lowFloor = { canMove: (_x: number, y: number) => y >= 22 * 32 }, far = { x: -9999, y: -9999 };
  const guaranteed = centralCaveSlimes(entrance, "f", lowFloor, far, new Set());
  assert.equal(guaranteed.length, 3, "a garantia põe três slimes mesmo quando o sorteio cai só em parede");
  assert.ok(guaranteed.every(mob => mob.y >= 22 * 32) && new Set(guaranteed.map(mob => mob.id)).size === 3);
  // só chão que o herói alcança: sem alcance nenhum não nasce slime; com alcance só da metade da direita, só nasce lá
  const open = { canMove: () => true }, middle = 21 * 32;
  assert.equal(centralCaveSlimes(entrance, "f", open, far, new Set(), () => false).length, 0, "nenhum ponto alcançável: nenhum slime");
  const rightHalf = centralCaveSlimes(entrance, "f", open, far, new Set(), x => x >= middle);
  assert.ok(rightHalf.length > 0 && rightHalf.every(mob => mob.x >= middle), "só nascem onde o herói alcança")
});

test("a caverna de treino e as cavernas dos outros temas não mudaram", () => {
  const training = new CaveRoom(caveEntranceInCell(0, 0, SEED)!);
  assert.equal(training.monsters.size, AELA_SLIME_GOAL + 2, "a gruta de treino segue com os seus encontros");
  assert.ok([...training.monsters.values()].every(mob => mob.id.startsWith(`${STARTER}:floor:1:slime:`)));
  for (const theme of ["glacial", "desert", "coastal", "basalt", "marsh"] as const) {
    const entrances = byTheme.get(theme) ?? [];
    assert.ok(entrances.length >= 3, `${theme}: há cavernas para conferir (antes a varredura curta não achava nenhuma e o teste não conferia nada)`);
    for (const entrance of entrances.slice(0, 3)) {
      const room = new CaveRoom(entrance);
      assert.ok(room.monsters.size > 0, `${theme}: tem monstros`);
      assert.ok([...room.monsters.values()].every(mob => mob instanceof RegionalMonster), `${theme}: só criaturas regionais, sem slimes`);
    }
  }
});

test("derrubar um slime da caverna do Centro conta como abate e dá experiência; o gel e as moedas ficam no chão da caverna", () => {
  const sim = new OfflineSimulation(SEED), entrance = central[0]!, room = new CaveRoom(entrance);
  const mob = [...room.monsters.values()][0]!, xp = sim.experience;
  const source = { drainVictories: () => [{ kind: "slime" as const, id: mob.id }], player: room.player };
  assert.equal(applyCaveVictories(sim, source), true);
  assert.ok(sim.experience > xp, "ganhou experiência"); assert.equal(sim.inventory.gel, 0, "o gel e as moedas ficam no chão da caverna, não vão direto para a bolsa"); assert.equal(sim.kills, 1); assert.equal(sim.trainingKills, 0);
  assert.equal(sim.defeated.has(mob.id), true);
});

test("o herói de verdade derruba um slime da caverna do Centro com a espada", () => {
  const room = new CaveRoom(central[0]!), mob = [...room.monsters.values()][0]!;
  mob.x = room.player.x + 18; mob.y = room.player.y;
  for (const other of [...room.monsters.values()]) if (other !== mob) room.monsters.delete(other.id);
  for (let i = 0; i < 80 && room.monsters.has(mob.id); i++) room.update(0.05, { x: 0, y: 0 }, true, "starter", 0, mob.id);
  assert.equal(room.monsters.has(mob.id), false, "o slime caiu");
  assert.deepEqual(room.drainVictories(), [{ kind: "slime", id: mob.id }]);
});

test("a ligação: a caverna só povoa com slimes quando é do tema do Centro e não tem criatura regional", () => {
  const cave = read("src/engine/rooms/CaveRoom.ts");
  assert.match(cave, /if \(!kinds\.length\) \{[^}]*if \(entrance\.theme === "verdant"\) for \(const slime of centralCaveSlimes\(entrance, this\.floor\.id, this\.collision, this\.player, this\.defeated, reaches\)\) this\.monsters\.set\(slime\.id, slime\);\s*return;\s*\}/);
  assert.match(cave, /import \{ centralCaveSlimes \} from "\.\/CaveSlimes\.ts";/);
});
