import test from "node:test";
import assert from "node:assert/strict";
import { getTile } from "../src/world/terrain.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { NPCS, nearestNpc, npcDialogue } from "../src/world/npcs.ts";
import { aelaQuestProgress } from "../src/world/aelaQuest.ts";
import { BUILDINGS, SIGNS, villageGround, starterCaveTrail } from "../src/world/village.ts";
import { npcPositionAt } from "../src/npcs/catalog.ts";

test("praça sem água, rochas e árvores em diferentes seeds", () => {
  for (const seed of [0, 42, 842136, 4294967295])
    for (let tx = 0; tx <= 38; tx++) for (let ty = -12; ty <= 18; ty++) {
      const tile = getTile(tx, ty, seed);
      assert.equal(tile.tree, false);
      assert.equal(tile.rock, false);
      assert.notEqual(tile.ground, "water");
    }
});
test("colisão da fachada mantém porta acessível", () => {
  for (const b of BUILDINGS) {
    assert.equal(canMoveOnSeed(b.x, b.y - 20, 842136), false);
    assert.equal(canMoveOnSeed(b.x, b.y + 29, 842136), true);
    assert.equal(nearestNpc(b.x, b.y + 29)?.id, b.id);
  }
});
test("portas só podem ser acionadas diante da entrada, nunca pela parede lateral", () => {
  for (const building of BUILDINGS) {
    assert.equal(nearestNpc(building.x, building.y + 29)?.id, building.id);
    assert.notEqual(nearestNpc(building.x + 54, building.y + 29)?.id, building.id);
    assert.notEqual(nearestNpc(building.x, building.y + 60)?.id, building.id);
  }
});
test("moradores e placas respondem perto sem recompensas novas", () => {
  assert.equal(SIGNS.length, 4);
  assert.equal(BUILDINGS.length, 7);
  for (const id of ["aela", "mira", "toren", "lina"]) {
    const npc = NPCS.find(n => n.id === id);
    assert.ok(npc);
    assert.equal(canMoveOnSeed(npc.x, npc.y, 842136), true);
    assert.ok(npcDialogue(npc, 0).length > 1);
    assert.ok(npcDialogue(npc, 5).length > 1);
  }
  assert.equal(nearestNpc(SIGNS[0].x, SIGNS[0].y)?.id, SIGNS[0].id);
});

test("progresso e diálogo da Aela usam a mesma meta da missão", () => {
  const aela = NPCS.find(npc => npc.id === "aela");
  assert.ok(aela);
  for (const kills of [-1, NaN, Infinity]) {
    assert.deepEqual(aelaQuestProgress(kills), { defeated: 0, goal: 5, completed: false });
  }
  assert.deepEqual(aelaQuestProgress(4.9), { defeated: 4, goal: 5, completed: false });
  assert.match(npcDialogue(aela, 4.9)[1]!, /4 de 5 slimes/);
  for (const kills of [5, 20]) {
    assert.deepEqual(aelaQuestProgress(kills), { defeated: 5, goal: 5, completed: true });
    assert.match(npcDialogue(aela, kills)[0]!, /Você conseguiu!/);
  }
});

test("criaturas não atacam viajantes na vila e não nascem na praça", async () => {
  const { Slime, slimeSpawns } = await import("../src/actors/Slime.ts");
  const { Player } = await import("../src/actors/Player.ts");
  const hero = new Player();
  hero.x = 448; hero.y = 64;
  const slime = new Slime("test", 448, 70);
  slime.update(1, hero, { canMove: () => true });
  assert.equal(hero.hp, 100);
  for (const seed of [42, 842136])
    for (let cx = 0; cx <= 1; cx++)
      for (let cy = -1; cy <= 1; cy++)
        for (const mob of slimeSpawns(cx, cy, seed))
          assert.equal(villageGround(Math.floor(mob.x / 32), Math.floor(mob.y / 32)), null);
});

test("portão separa proteção da gruta e interiores acessíveis em todas as fachadas", async () => {
  const { InteriorRoom } = await import("../src/engine/rooms/InteriorRoom.ts");
  assert.equal(villageGround(38, 11), "path");
  assert.equal(villageGround(44, 11), null);
  assert.equal(starterCaveTrail(44, 11), true);
  for (const building of BUILDINGS) {
    const room = new InteriorRoom(building.id);
    assert.ok(room.furniture.length >= 2);
    assert.ok(room.collision.canMove(room.player.x, room.player.y));
  }
});
test("moradores patrulham, Aela e Eron continuam nos locais de missão", () => {
  const mira = NPCS.find(n => n.id === "mira")!;
  const aela = NPCS.find(n => n.id === "aela")!;
  const eron = NPCS.find(n => n.id === "stablemaster")!;
  const sign = NPCS.find(n => n.id === "square")!;
  assert.notDeepEqual(npcPositionAt(mira, 5), npcPositionAt(mira, 0));
  assert.deepEqual(npcPositionAt(aela, 5), npcPositionAt(aela, 0));
  assert.deepEqual(npcPositionAt(eron, 5), npcPositionAt(eron, 0));
  assert.deepEqual(npcPositionAt(sign, 5), npcPositionAt(sign, 0));
  const moved = npcPositionAt(mira, 5);
  assert.equal(nearestNpc(moved.x, moved.y, 5)?.id, "mira");
});
test("slimes e criaturas regionais não ferem herói nem invadem a zona protegida", async () => {
  const { RegionalMonster } = await import("../src/actors/RegionalMonster.ts");
  const { Slime } = await import("../src/actors/Slime.ts");
  const { Player } = await import("../src/actors/Player.ts");
  const hero = new Player(); hero.x = 1200; hero.y = 368;
  for (const mob of [new Slime("normal",1200,380),
    new RegionalMonster("regional","glacial-wolf",1200,380)]) {
    for(let i=0;i<120;i++)mob.update(1/60,hero,{canMove:()=>true});
    assert.equal(hero.hp,hero.maxHp);
  }
  // Um monstro perseguindo alguém dentro da vila para na fronteira leste.
  const hunter = new Slime("limite",1280,368);
  const inside = new Player(); inside.x=1200; inside.y=368;
  for(let i=0;i<120;i++)hunter.update(1/60,inside,{canMove:()=>true});
  assert.ok(hunter.x>=1248);
  assert.equal(inside.hp,inside.maxHp);
});