import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { CHEST_OPEN_DISTANCE, CHEST_RESPAWN_DISTANCE, CHEST_RESPAWN_SECONDS, CaveChests, chestCoins, guardianOf, isChestId } from "../src/engine/rooms/CaveChests.ts";
import { respawnSecondsForId } from "../src/engine/combat/respawn.ts";
import { caveHost, runCave } from "./helpers/caveModeHost.ts";
import { MAX_WORLD_DROPS, type LootDrop } from "../src/engine/character/loot.ts";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../src/world/caves.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { caveFloorCount } from "../src/dungeons/index.ts";

/** Baús das tocas da Masmorra das Raízes (ADR 0103): abrem com o guardião caído, deixam moedas, ficam no save e voltam depois. */
const SEED = 842136;
const verdant = (): CaveEntrance[] => {
  const found: CaveEntrance[] = [];
  for (let cx = -12; cx <= 12; cx++) for (let cy = -12; cy <= 12; cy++) {
    const entrance = caveEntranceInCell(cx, cy, SEED);
    if (entrance && !entrance.tower && entrance.theme === "verdant" && !isStarterCave(entrance)) found.push(entrance);
  }
  return found;
};
const tile = (n: number): number => (n + .5) * TILE_SIZE;
const noMonsters: ReadonlyMap<string, unknown> = new Map();

test("ids: o baú `…:chest:N` pertence ao guardião `…:den:N`, e só ele é id de baú", () => {
  assert.equal(guardianOf("cave:1:2:3:floor:2:chest:1"), "cave:1:2:3:floor:2:den:1");
  assert.equal(isChestId("cave:1:2:3:floor:2:chest:1"), true);
  for (const other of ["cave:1:2:3:floor:2:den:1", "cave:1:2:3:floor:2:mob:3", "cave:1:2:3:floor:2:boss", "chest:1", "x:chest:a", "x:chest:1:coin"]) assert.equal(isChestId(other), false, other);
});

test("moedas do baú: determinísticas, de 80 % a 120 % de 10 + 8 por andar, e andar inválido vale como o 1", () => {
  for (let floor = 1; floor <= 5; floor++) for (let n = 0; n < 40; n++) {
    const id = `cave:9:1:1:floor:${floor}:chest:${n % 4}:${n}`, amount = chestCoins(id, floor), base = 10 + 8 * floor;
    assert.equal(amount, chestCoins(id, floor), "o mesmo baú dá a mesma quantia");
    assert.ok(amount >= Math.floor(base * .8) && amount <= Math.ceil(base * 1.2), `${floor}: ${amount} de ${base}`);
  }
  const mean = (floor: number): number => Array.from({ length: 60 }, (_, n) => chestCoins("a:" + n, floor)).reduce((a, b) => a + b, 0) / 60;
  assert.ok(mean(5) > mean(1) * 2, "os andares de baixo pagam bem mais");
  for (const bad of [0, -3, 1.5, NaN]) assert.equal(chestCoins("a:1", bad), chestCoins("a:1", 1));
  assert.ok(new Set(Array.from({ length: 30 }, (_, n) => chestCoins("id" + n, 3))).size > 3, "o id muda a quantia");
});

test("o baú volta em 15 minutos de jogo; as outras regras de volta não mudaram", () => {
  assert.equal(CHEST_RESPAWN_SECONDS, 900);
  assert.equal(respawnSecondsForId("cave:1:2:3:floor:2:chest:0"), 900);
  assert.equal(respawnSecondsForId("cave:1:2:3:floor:2:boss"), 1_800);
  assert.equal(respawnSecondsForId("cave:842136:0:0:floor:1:slime:3"), null);
  assert.ok((respawnSecondsForId("cave:1:2:3:floor:2:den:0", "root-beetle") ?? 0) <= 600);
});

test("baú: abre só com o herói a menos de 30 px e sem guardião vivo, uma vez, e deixa as moedas no lugar dele", () => {
  const chests = new CaveChests(), drops = new Map<string, LootDrop>(), id = "cave:1:0:0:floor:3:chest:2";
  chests.place(id, 500, 400);
  assert.equal(CHEST_OPEN_DISTANCE, 30);
  chests.update({ x: 530, y: 400 }, noMonsters, drops, 3);
  assert.equal(chests.standing.has(id), true, "a 30 px ainda não abre");
  chests.update({ x: 520, y: 400 }, new Map([[guardianOf(id), {}]]), drops, 3);
  assert.equal(chests.standing.has(id), true, "com o guardião vivo não abre");
  assert.equal(drops.size, 0);
  chests.update({ x: 529, y: 400 }, noMonsters, drops, 3);
  assert.equal(chests.standing.has(id), false, "a 29 px abre");
  const coin = drops.get(id + ":coin");
  assert.ok(coin);
  assert.equal(coin?.item, "coin"); assert.equal(coin?.x, 500); assert.equal(coin?.y, 400); assert.equal(coin?.amount, chestCoins(id, 3));
  assert.deepEqual(chests.drainOpened(), [id]);
  assert.deepEqual(chests.drainOpened(), [], "cada abertura só é anotada uma vez");
  chests.update({ x: 500, y: 400 }, noMonsters, drops, 3);
  assert.deepEqual(chests.drainOpened(), [], "aberto não abre de novo");
});

test("baú: com o chão cheio de saque o baú abre mas não deixa moeda além do teto", () => {
  const chests = new CaveChests(), drops = new Map<string, LootDrop>();
  for (let i = 0; i < MAX_WORLD_DROPS; i++) drops.set("d" + i, { id: "d" + i, item: "gel", x: 0, y: 0 });
  chests.place("a:chest:0", 10, 10);
  chests.update({ x: 10, y: 10 }, noMonsters, drops, 1);
  assert.equal(drops.size, MAX_WORLD_DROPS);
  assert.equal(chests.standing.size, 0);
});

test("baú: o save manda os já abertos ficarem de fora, e o aberto só volta cheio longe do herói e fora da lista dos abertos", () => {
  const chests = new CaveChests();
  chests.place("a:chest:0", 100, 100); chests.place("a:chest:1", 900, 100);
  chests.settle(new Set(["a:chest:0"]));
  assert.deepEqual([...chests.standing.keys()], ["a:chest:1"]);
  assert.deepEqual(chests.respawn({ x: 5_000, y: 5_000 }, new Set(["a:chest:0"])), []);
  assert.equal(chests.standing.has("a:chest:0"), false, "ainda na lista dos abertos: não volta");
  assert.deepEqual(chests.respawn({ x: 100 + CHEST_RESPAWN_DISTANCE - 1, y: 100 }, new Set()), []);
  assert.equal(chests.standing.has("a:chest:0"), false, "com o herói em cima: não volta");
  assert.deepEqual(chests.respawn({ x: 100 + CHEST_RESPAWN_DISTANCE, y: 100 }, new Set()), ["a:chest:0"]);
  assert.equal(chests.standing.has("a:chest:0"), true, "longe e liberado: volta no mesmo lugar");
  assert.deepEqual(chests.standing.get("a:chest:0"), { x: 100, y: 100 });
});

test("masmorra: cada toca tem um baú alcançável, perto do guardião e com id próprio, em todos os andares", () => {
  for (const entrance of verdant().slice(0, 25)) for (let floorIndex = 1; floorIndex <= caveFloorCount(entrance); floorIndex++) {
    const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex });
    assert.equal(room.chests.standing.size, room.floor.chambers.length, `${entrance.id} andar ${floorIndex}`);
    for (const [id, spot] of room.chests.standing) {
      assert.ok(isChestId(id) && id.startsWith(room.floor.id), id);
      assert.ok(room.collision.canMove(spot.x, spot.y), id + " em chão livre");
      const den = room.monsters.get(guardianOf(id));
      assert.ok(den, id + " tem guardião");
      const distance = Math.hypot(den!.x - spot.x, den!.y - spot.y);
      assert.ok(distance >= TILE_SIZE * 1.5 && distance <= TILE_SIZE * 2.5, `${id}: a ${Math.round(distance)} px do guardião`);
    }
  }
});

test("masmorra: baú fechado com o guardião vivo; derrubado o guardião, o herói abre, recolhe as moedas e a simulação guarda a abertura", () => {
  const entrance = verdant()[0]!, sim = new OfflineSimulation({ seed: SEED });
  const room = new CaveRoom(entrance, 100, 100, sim.defeated, { floorIndex: 3 });
  const [id, spot] = [...room.chests.standing.entries()][0]!;
  room.player.x = spot.x; room.player.y = spot.y;
  room.update(.05, { x: 0, y: 0 });
  assert.equal(room.chests.standing.has(id), true, "guardião vivo: fechado");
  room.monsters.delete(guardianOf(id));
  room.update(.05, { x: 0, y: 0 });
  assert.equal(room.chests.standing.has(id), false);
  assert.equal(room.drops.get(id + ":coin")?.amount, chestCoins(id, 3));
  assert.equal(applyCaveVictories(sim, room), true);
  assert.equal(sim.defeated.has(id), true, "aberto fica na lista do save");
  assert.equal(applyCaveVictories(sim, room), false, "e só é anotado uma vez");
  // um andar novo, com o mesmo save, nasce com o baú aberto
  assert.equal(new CaveRoom(entrance, 100, 100, sim.defeated, { floorIndex: 3 }).chests.standing.has(id), false);
});

test("masmorra: depois do prazo o baú aberto volta cheio, no mesmo lugar, e o prazo de 15 minutos conta no relógio da simulação", () => {
  const entrance = verdant()[0]!, sim = new OfflineSimulation({ seed: SEED });
  const room = new CaveRoom(entrance, 100, 100, sim.defeated, { floorIndex: 2 });
  const [id, spot] = [...room.chests.standing.entries()][0]!;
  room.monsters.delete(guardianOf(id));
  room.player.x = spot.x; room.player.y = spot.y;
  room.update(.05, { x: 0, y: 0 });
  applyCaveVictories(sim, room);
  room.player.x = tile(21); room.player.y = tile(24); // longe da toca
  room.respawnTick(2, () => sim.expireDefeats());
  assert.equal(room.chests.standing.has(id), false, "ainda dentro do prazo");
  for (let t = 0; t < (CHEST_RESPAWN_SECONDS + 1) * 10; t++) sim.advanceClock(.1); // o relógio avança no máximo 0,1 s por chamada
  room.respawnTick(2, () => sim.expireDefeats());
  assert.equal(sim.defeated.has(id), false, "o prazo passou: sai da lista dos abertos");
  assert.deepEqual(room.chests.standing.get(id), spot, "e o baú volta ao lugar de antes");
  assert.equal(room.drops.has(id + ":coin"), false, "sem moeda esquecida no chão");
});

test("só as masmorras de grutas verdes têm baús: a gruta de treinamento e as outras cavernas não", () => {
  assert.equal(new CaveRoom(caveEntranceInCell(0, 0, SEED)!).chests.standing.size, 0);
});

test("pela ligação real do jogo (`tickCave`): o herói chega ao baú com o guardião caído, as moedas entram na carteira e o baú fica salvo como aberto", () => {
  const h = caveHost("knight", verdant()[0]!);
  assert.ok(h.cave.chests.standing.size > 0, "o primeiro andar tem tocas e baús");
  const [id, spot] = [...h.cave.chests.standing.entries()][0]!;
  h.cave.monsters.delete(guardianOf(id));
  h.cave.player.x = spot.x; h.cave.player.y = spot.y;
  const before = h.sim.inventory.coins;
  runCave(h, .5);
  assert.equal(h.sim.inventory.coins - before, chestCoins(id, 1), "as moedas do baú entraram na carteira");
  assert.equal(h.sim.defeated.has(id), true, "o baú aberto está na lista do save");
  assert.equal(h.cave.chests.standing.has(id), false);
});

test("a tela da caverna desenha os baús fechados na fila de profundidade, e a ligação do jogo anota as aberturas no save", () => {
  const scene = readFileSync("src/ui/CanvasScene.ts", "utf8"), rewards = readFileSync("src/engine/rooms/CaveRewards.ts", "utf8"), mode = readFileSync("src/game/modes/caveMode.ts", "utf8");
  assert.match(scene, /for\(const spot of room\.chests\.standing\.values\(\)\)/, "só os baús fechados aparecem");
  assert.match(scene, /loot\.push\(\{y:spot\.y,render:\(\)=>drawCaveChest\(this\.ctx,spot\.x-left,spot\.y-top,time\)\}\)/, "no mesmo lugar e na mesma fila das moedas e das criaturas");
  assert.match(rewards, /cave\.drainOpenings\?\.\(\) \?\? \[\]/);
  assert.match(mode, /applyCaveVictories\(host\.sim, cave\)/);
});
