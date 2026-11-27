import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { RegionalMonster, rollCreatureLoot } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { AELA_SLIME_GOAL } from "../src/world/aelaQuest.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { CENTRAL_CAVE_MONSTERS, CENTRAL_ROSTER, centralCaveKind, centralCaveMonsters } from "../src/engine/rooms/CaveCentral.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { caveEntranceInCell, type CaveEntrance, type CaveTheme } from "../src/world/caves.ts";
import { sampleCaves } from "../src/qa/QaCaves.ts";
import { dungeonFor } from "../src/dungeons/index.ts";

/**
 * Relato do dono: as cavernas do Centro estavam vazias (sem monstro, sem nada). Primeiro vieram seis slimes (ADR 0083); com o lote 1 do bestiário do Centro
 * (ADR 0087 e 0088) a Gruta das Raízes passou a ter o povo de verdade: slimes, rato gigante, morcego de caverna, aranha das raízes, slime de musgo, cobra-cipó e besouro de raiz, cada um no seu arquivo.
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
// as cavernas do Centro que são a Gruta das Raízes comum: uma parte delas é a Masmorra das Raízes (ADR 0094), com povo e andares próprios
const central = (byTheme.get("verdant") ?? []).filter(entrance => dungeonFor(entrance) === null);
// quem mora na caverna do Centro (o javali e o lobo só andam pela superfície)
const CENTER_KINDS: readonly string[] = ["giant-rat", "cave-bat", "root-spider", "moss-slime", "vine-snake", "root-beetle", "walking-mushroom"];
const ALL_KINDS = ["slime", ...CENTER_KINDS];

test("as cavernas comuns do Centro nascem com seis criaturas cada, em solo transitável, longe do herói e uns dos outros", () => {
  assert.ok(central.length >= 6, "há cavernas do Centro para conferir: " + central.length);
  assert.equal(CENTRAL_CAVE_MONSTERS, 6);
  for (const entrance of central) {
    const room = new CaveRoom(entrance);
    assert.equal(room.monsters.size, CENTRAL_CAVE_MONSTERS, entrance.id + ": seis criaturas");
    const mobs = [...room.monsters.values()];
    for (const mob of mobs) {
      assert.ok(room.collision.canMove(mob.x, mob.y), "em solo transitável");
      assert.ok(Math.hypot(mob.x - room.player.x, mob.y - room.player.y) >= 170, "longe de quem chega");
      // o slime não é criatura regional; as outras são, e o id leva o tipo (`:slime:` ou `:mob:`)
      if (mob.kind === "slime") { assert.ok(mob instanceof Slime && !(mob instanceof RegionalMonster)); assert.ok(mob.id.startsWith(room.floor.id + ":slime:"), mob.id); }
      else { assert.ok(mob instanceof RegionalMonster && CENTER_KINDS.includes(mob.kind)); assert.ok(mob.id.startsWith(room.floor.id + ":mob:"), mob.id); assert.ok(CREATURE_CATALOG[mob.kind].caveThemes.includes("verdant")); }
    }
    for (const [i, a] of mobs.entries()) for (const b of mobs.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 92, "uns longe dos outros");
    assert.equal(new Set(room.monsters.keys()).size, CENTRAL_CAVE_MONSTERS);
  }
});

test("a mistura: a fila tem doze lugares; cada caverna usa seis seguidos (ao menos um slime e quatro tipos), numa ordem que muda de uma caverna para outra", () => {
  assert.equal(CENTRAL_ROSTER.length, 12);
  const tally = (list: readonly string[]) => JSON.stringify(ALL_KINDS.map(k => [k, list.filter(x => x === k).length]));
  assert.equal(tally(CENTRAL_ROSTER), JSON.stringify([["slime", 3], ["giant-rat", 1], ["cave-bat", 2], ["root-spider", 1], ["moss-slime", 2], ["vine-snake", 1], ["root-beetle", 1], ["walking-mushroom", 1]]));
  // toda janela de seis seguidos, em qualquer ponto de partida, tem slime e variedade
  for (let turn = 0; turn < 12; turn++) {
    const window = Array.from({ length: 6 }, (_, i) => CENTRAL_ROSTER[(turn + i) % 12]!);
    assert.ok(window.includes("slime"), "janela " + turn + " sem slime"); assert.ok(new Set(window).size >= 4, "janela " + turn + " com pouca variedade: " + window.join(","));
  }
  for (const entrance of central) {
    const kinds = [...new CaveRoom(entrance).monsters.values()].map(m => m.kind);
    assert.equal(kinds.length, CENTRAL_CAVE_MONSTERS, entrance.id);
    assert.ok(kinds.includes("slime") && new Set(kinds).size >= 4 && kinds.every(k => ALL_KINDS.includes(k)), entrance.id + ": " + kinds.join(","));
  }
  const order = (entrance: CaveEntrance): string => [...new CaveRoom(entrance).monsters.values()].map(m => m.kind).join(",");
  assert.ok(new Set(central.map(order)).size > 1, "a fila gira por entrada: nem toda gruta tem a mesma ordem");
  // o povo todo aparece no Centro: nenhum dos oito tipos some da mistura
  const seen = new Set(central.flatMap(entrance => [...new CaveRoom(entrance).monsters.values()].map(m => m.kind)));
  assert.deepEqual([...seen].sort(), [...ALL_KINDS].sort(), "os oito tipos aparecem nas cavernas do Centro varridas");
  // a função pura: determinística, e a fila inteira passa pelos pontos
  for (let salt = 0; salt < 60; salt++) {
    const six = Array.from({ length: 6 }, (_, i) => centralCaveKind(salt, i));
    assert.deepEqual(six, Array.from({ length: 6 }, (_, i) => centralCaveKind(salt, i)));
    assert.ok(six.includes("slime"));
  }
  assert.ok(new Set(Array.from({ length: 60 }, (_, salt) => centralCaveKind(salt, 0))).size >= 5, "o ponto de partida varia com a caverna");
});

test("as criaturas são sempre as mesmas para a mesma caverna e mudam de uma caverna para outra", () => {
  const spots = (entrance: CaveEntrance): string => [...new CaveRoom(entrance).monsters.values()].map(m => `${m.kind}@${m.x},${m.y}`).join("|");
  const first = central[0]!;
  assert.equal(spots(first), spots(first), "determinístico");
  assert.equal(new Set(central.map(spots)).size, central.length, "cada caverna tem os seus pontos");
});

test("quem já caiu não volta (o save), e os outros continuam", () => {
  const entrance = central[0]!, full = new CaveRoom(entrance), ids = [...full.monsters.keys()];
  const room = new CaveRoom(entrance, 100, 100, new Set([ids[0]!, ids[1]!]));
  assert.equal(room.monsters.size, CENTRAL_CAVE_MONSTERS - 2); assert.equal(room.monsters.has(ids[0]!), false); assert.equal(room.monsters.has(ids[2]!), true);
  assert.equal(new CaveRoom(entrance, 100, 100, new Set(ids)).monsters.size, 0, "todos derrotados: caverna limpa");
  const hero = { x: full.player.x, y: full.player.y }, blocked = { canMove: () => false };
  assert.equal(centralCaveMonsters(entrance, "f", blocked, hero, new Set()).length, 0, "tudo parede: ninguém em parede");
  // o sorteio só alcança as linhas 4 a 21; se o único chão fica mais embaixo, a garantia varre as câmaras e acha pelo menos três pontos
  const lowFloor = { canMove: (_x: number, y: number) => y >= 22 * 32 }, far = { x: -9999, y: -9999 };
  const guaranteed = centralCaveMonsters(entrance, "f", lowFloor, far, new Set());
  assert.equal(guaranteed.length, 3, "a garantia põe três criaturas mesmo quando o sorteio cai só em parede");
  assert.ok(guaranteed.every(mob => mob.y >= 22 * 32) && new Set(guaranteed.map(mob => mob.id)).size === 3);
  // só chão que o herói alcança: sem alcance nenhum não nasce ninguém; com alcance só da metade da direita, só nasce lá
  const open = { canMove: () => true }, middle = 21 * 32;
  assert.equal(centralCaveMonsters(entrance, "f", open, far, new Set(), () => false).length, 0, "nenhum ponto alcançável: ninguém");
  const rightHalf = centralCaveMonsters(entrance, "f", open, far, new Set(), x => x >= middle);
  assert.ok(rightHalf.length > 0 && rightHalf.every(mob => mob.x >= middle), "só nascem onde o herói alcança");
});

test("a caverna de treino e as cavernas dos outros temas não mudaram", () => {
  const training = new CaveRoom(caveEntranceInCell(0, 0, SEED)!);
  assert.equal(training.monsters.size, AELA_SLIME_GOAL + 2, "a gruta de treino segue com os seus encontros");
  assert.ok([...training.monsters.values()].every(mob => mob.kind === "slime" && mob.id.startsWith(`${STARTER}:floor:1:slime:`)), "a gruta de treino segue só de slimes");
  for (const theme of ["glacial", "desert", "coastal", "basalt", "marsh"] as const) {
    const entrances = byTheme.get(theme) ?? [];
    assert.ok(entrances.length >= 3, `${theme}: há cavernas para conferir (antes a varredura curta não achava nenhuma e o teste não conferia nada)`);
    for (const entrance of entrances.slice(0, 3)) {
      const room = new CaveRoom(entrance);
      assert.ok(room.monsters.size > 0, `${theme}: tem monstros`);
      assert.ok([...room.monsters.values()].every(mob => mob instanceof RegionalMonster && !CENTER_KINDS.includes(mob.kind)), `${theme}: só criaturas da própria região, sem slimes nem bichos do Centro`);
    }
  }
});

test("derrubar um slime da caverna do Centro conta como abate e dá experiência; o gel e as moedas ficam no chão da caverna", () => {
  const sim = new OfflineSimulation(SEED), entrance = central[0]!, room = new CaveRoom(entrance);
  const mob = [...room.monsters.values()].find(m => m.kind === "slime")!, xp = sim.experience;
  const source = { drainVictories: () => [{ kind: "slime" as const, id: mob.id }], player: room.player };
  assert.equal(applyCaveVictories(sim, source), true);
  assert.ok(sim.experience > xp, "ganhou experiência"); assert.equal(sim.inventory.gel, 0, "o gel e as moedas ficam no chão da caverna, não vão direto para a bolsa"); assert.equal(sim.kills, 1);
  assert.equal(sim.defeated.has(mob.id), true);
});

/** Uma criatura do tipo dado, numa das cavernas do Centro varridas (e a sala dela). */
const findMob = (kind: string) => { for (const entrance of central) { const room = new CaveRoom(entrance), mob = [...room.monsters.values()].find(m => m.kind === kind); if (mob) return { room, mob }; } throw new Error("sem " + kind + " nas cavernas varridas"); };

test("derrubar uma criatura do Centro dá a experiência da ficha, conta como abate e o saque da ficha cai na bolsa", () => {
  for (const kind of CENTER_KINDS as readonly ("giant-rat" | "cave-bat" | "root-spider" | "moss-slime" | "vine-snake" | "root-beetle" | "walking-mushroom")[]) {
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

test("o herói de verdade derruba cada um dos oito tipos da caverna do Centro com a espada", () => {
  for (const kind of ALL_KINDS) {
    const { room, mob } = findMob(kind);
    mob.x = room.player.x + 18; mob.y = room.player.y;
    for (const other of [...room.monsters.values()]) if (other !== mob) room.monsters.delete(other.id);
    for (let i = 0; i < 800 && room.monsters.has(mob.id); i++) room.update(0.05, { x: 0, y: 0 }, true, "starter", 0, mob.id);
    assert.equal(room.monsters.has(mob.id), false, kind + " caiu");
    assert.deepEqual(room.drainVictories(), [{ kind: kind as never, id: mob.id }]);
  }
});

test("a ligação: a caverna comum do Centro (e só ela) chama a mistura, antes de olhar as criaturas regionais do tema", () => {
  const cave = read("src/engine/rooms/CaveRoom.ts");
  assert.match(cave, /if \(!plan && entrance\.theme === "verdant"\) \{\s*for \(const mob of centralCaveMonsters\(entrance, this\.floor\.id, this\.collision, this\.player, this\.defeated, reaches\)\) this\.monsters\.set\(mob\.id, mob\);\s*return;\s*\}/);
  assert.match(cave, /import \{ centralCaveMonsters \} from "\.\/CaveCentral\.ts";/);
  assert.ok(cave.indexOf("centralCaveMonsters(entrance") < cave.indexOf("caveMonsterKinds(entrance.theme)"), "a mistura vem antes do sorteio regional");
});
