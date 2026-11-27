import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { applyCaveGathering } from "../src/engine/rooms/CaveRewards.ts";
import { CaveGathering, GATHER_DISTANCE, GATHER_MIN_SPACING, GATHER_PER_FLOOR, GATHER_RESPAWN_DISTANCE, GATHER_RESPAWN_SECONDS, gatherItem, gatherKindOf, isGatherId } from "../src/engine/rooms/CaveGathering.ts";
import { respawnSecondsForId } from "../src/engine/combat/respawn.ts";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { materialSalePrice } from "../src/engine/character/coins/market.ts";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../src/world/caves.ts";
import { CAVE_STAIRS_DOWN } from "../src/world/caveFloor.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { caveFloorCount } from "../src/dungeons/index.ts";
import { sampleCaves } from "../src/qa/QaCaves.ts";
import { caveHost, runCave } from "./helpers/caveModeHost.ts";

/** Pontos de coleta da Masmorra das Raízes (ADR 0105): tufos de cogumelo e de raiz que o herói colhe, que vão para a bolsa e brotam de novo. */
const SEED = 842136;
const verdant = (): CaveEntrance[] => {
  const found: CaveEntrance[] = [];
  for (let cx = -12; cx <= 12; cx++) for (let cy = -12; cy <= 12; cy++) {
    const entrance = caveEntranceInCell(cx, cy, SEED);
    if (entrance && !entrance.tower && entrance.theme === "verdant" && !isStarterCave(entrance)) found.push(entrance);
  }
  return found;
};
const everything = (): boolean => true;

test("ids, tipos e materiais: o ponto N é de cogumelo (0 e 2) ou de raiz (1); os materiais são os do Centro, que a bolsa aceita e as bancas compram", () => {
  assert.equal(isGatherId("cave:1:2:3:floor:2:herb:0"), true);
  for (const other of ["cave:1:2:3:floor:2:chest:0", "cave:1:2:3:floor:2:den:0", "herb:1", "x:herb:a", "x:herb:1:coin"]) assert.equal(isGatherId(other), false, other);
  assert.deepEqual([0, 1, 2].map(gatherKindOf), ["spores", "sap", "spores"]);
  assert.equal(gatherItem("spores", 1), "Esporos de Cogumelo"); assert.equal(gatherItem("spores", 5), "Esporos de Cogumelo");
  assert.equal(gatherItem("sap", 1), "Raiz Retorcida"); assert.equal(gatherItem("sap", 2), "Raiz Retorcida");
  assert.equal(gatherItem("sap", 3), "Seiva Viva"); assert.equal(gatherItem("sap", 5), "Seiva Viva");
  const bag = new Inventory();
  for (const item of ["Esporos de Cogumelo", "Raiz Retorcida", "Seiva Viva"]) { assert.equal(bag.canAddMaterial(item), true, item); assert.equal(bag.addMaterial(item), true, item); assert.ok((materialSalePrice(item) ?? 0) > 0, item + " vende"); }
  assert.equal(bag.canAddMaterial("Material Inventado"), false);
});

test("prazos: o ponto colhido volta em 5 minutos de jogo; os outros prazos não mudam", () => {
  assert.equal(GATHER_RESPAWN_SECONDS, 300);
  assert.equal(respawnSecondsForId("cave:1:2:3:floor:2:herb:1"), 300);
  assert.equal(respawnSecondsForId("cave:1:2:3:floor:2:chest:1"), 900);
  assert.equal(respawnSecondsForId("cave:1:2:3:floor:2:boss"), 1_800);
  assert.equal(respawnSecondsForId("cave:842136:0:0:floor:1:slime:3"), null);
});

test("colher: só a menos de 28 px e se a bolsa tem lugar; o que foi colhido sai uma vez, e sem lugar o ponto fica como está", () => {
  const nodes = new CaveGathering();
  nodes.place("a:herb:1", { x: 500, y: 400, kind: "sap" });
  assert.equal(GATHER_DISTANCE, 28);
  nodes.update({ x: 528, y: 400 }, 3, everything);
  assert.equal(nodes.standing.has("a:herb:1"), true, "a 28 px ainda não colhe");
  nodes.update({ x: 527, y: 400 }, 3, () => false);
  assert.equal(nodes.standing.has("a:herb:1"), true, "sem lugar na bolsa fica como está");
  assert.deepEqual(nodes.drainTaken(), []);
  const asked: string[] = [];
  nodes.update({ x: 527, y: 400 }, 3, item => { asked.push(item); return true; });
  assert.deepEqual(asked, ["Seiva Viva"], "pergunta pelo material do andar");
  assert.equal(nodes.standing.has("a:herb:1"), false);
  assert.deepEqual(nodes.drainTaken(), [{ id: "a:herb:1", item: "Seiva Viva" }]);
  assert.deepEqual(nodes.drainTaken(), [], "cada colheita só é anotada uma vez");
});

test("espaço entre pontos, save e volta: perto demais não pode, o colhido do save fica de fora e só volta longe do herói e fora da lista dos colhidos", () => {
  const nodes = new CaveGathering();
  nodes.place("a:herb:0", { x: 100, y: 100, kind: "spores" }); nodes.place("a:herb:1", { x: 900, y: 100, kind: "sap" });
  assert.equal(GATHER_MIN_SPACING, 120);
  assert.equal(nodes.tooClose(100 + GATHER_MIN_SPACING - 1, 100), true); assert.equal(nodes.tooClose(100 + GATHER_MIN_SPACING, 100), false);
  nodes.settle(new Set(["a:herb:0"]));
  assert.deepEqual([...nodes.standing.keys()], ["a:herb:1"]);
  assert.deepEqual(nodes.respawn({ x: 5000, y: 5000 }, new Set(["a:herb:0"])), [], "ainda na lista dos colhidos: não volta");
  assert.deepEqual(nodes.respawn({ x: 100 + GATHER_RESPAWN_DISTANCE - 1, y: 100 }, new Set()), [], "com o herói em cima: não volta");
  assert.deepEqual(nodes.respawn({ x: 100 + GATHER_RESPAWN_DISTANCE, y: 100 }, new Set()), ["a:herb:0"]);
  assert.deepEqual(nodes.standing.get("a:herb:0"), { x: 100, y: 100, kind: "spores" }, "volta ao mesmo lugar");
});

test("masmorra: cada andar tem três pontos alcançáveis, afastados entre si, da entrada e da escada, e a gruta de treinamento não tem nenhum", () => {
  assert.equal(GATHER_PER_FLOOR, 3);
  for (const entrance of verdant().slice(0, 25)) for (let floorIndex = 1; floorIndex <= caveFloorCount(entrance); floorIndex++) {
    const room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex }), nodes = [...room.gathering.standing.entries()];
    assert.equal(nodes.length, GATHER_PER_FLOOR, `${entrance.id} andar ${floorIndex}`);
    nodes.forEach(([id, node], i) => {
      assert.ok(id.startsWith(room.floor.id) && isGatherId(id), id); assert.equal(id.endsWith(":herb:" + i), true); assert.equal(node.kind, gatherKindOf(i));
      assert.ok(room.collision.canMove(node.x, node.y), id + " em chão livre");
      assert.ok(Math.hypot(node.x - room.player.x, node.y - room.player.y) >= 150, id + " longe da entrada");
      if (room.floor.hasStairsDown) assert.ok(Math.hypot(node.x - (CAVE_STAIRS_DOWN.x + .5) * TILE_SIZE, node.y - (CAVE_STAIRS_DOWN.y + .5) * TILE_SIZE) >= 110, id + " longe da escada");
      for (const [other, there] of nodes) if (other !== id) assert.ok(Math.hypot(node.x - there.x, node.y - there.y) >= GATHER_MIN_SPACING, `${id} e ${other}`);
    });
  }
  assert.equal(new CaveRoom(caveEntranceInCell(0, 0, SEED)!).gathering.standing.size, 0);
});

test("só a masmorra das raízes tem pontos de coleta: as cavernas dos outros temas não têm nenhum", () => {
  for (const [theme, entrances] of sampleCaves(SEED)) {
    if (theme === "verdant") continue;
    assert.ok(entrances.length >= 1, theme);
    for (const entrance of entrances.slice(0, 3)) for (let floorIndex = 1; floorIndex <= caveFloorCount(entrance); floorIndex++)
      assert.equal(new CaveRoom(entrance, 100, 100, new Set(), { floorIndex }).gathering.standing.size, 0, `${theme} ${entrance.id} andar ${floorIndex}`);
  }
});

test("sem ligação com a bolsa a caverna não colhe nada (o material nunca se perde): é o que vale até o jogo dizer que há lugar", () => {
  const room = new CaveRoom(verdant()[0]!, 100, 100, new Set(), { floorIndex: 1 }), [id, node] = [...room.gathering.standing.entries()][0]!;
  room.player.x = node.x; room.player.y = node.y;
  room.update(.05, { x: 0, y: 0 });
  assert.equal(room.gathering.standing.has(id), true); assert.deepEqual(room.drainGathered(), []);
});

test("pela ligação real do jogo (`tickCave`): o herói chega ao ponto, o material entra na bolsa, o ponto fica salvo como colhido e brota de novo depois do prazo", () => {
  const h = caveHost("knight", verdant()[0]!), [id, node] = [...h.cave.gathering.standing.entries()][0]!;
  const item = gatherItem(node.kind, 1), before = h.sim.inventory.materials[item] ?? 0;
  h.cave.player.x = node.x; h.cave.player.y = node.y;
  const savesBefore = h.saves.count;
  runCave(h, .3);
  assert.ok(h.saves.count > savesBefore, "a colheita pede para salvar");
  assert.equal((h.sim.inventory.materials[item] ?? 0) - before, 1, "um material na bolsa");
  assert.equal(h.sim.defeated.has(id), true, "colhido fica na lista do save");
  assert.equal(h.cave.gathering.standing.has(id), false);
  h.cave.player.x = 21.5 * TILE_SIZE; h.cave.player.y = 24.5 * TILE_SIZE; // longe do ponto
  for (let t = 0; t < (GATHER_RESPAWN_SECONDS + 1) * 10; t++) h.sim.advanceClock(.1);
  h.cave.respawnTick(2, () => h.sim.expireDefeats());
  assert.equal(h.sim.defeated.has(id), false, "o prazo passou");
  assert.deepEqual(h.cave.gathering.standing.get(id), node, "brota no mesmo lugar");
  runCave(h, .01);
});

test("bolsa cheia: o ponto não é colhido, nada é anotado no save, e quando abre lugar o herói colhe", () => {
  const h = caveHost("knight", verdant()[0]!), [id, node] = [...h.cave.gathering.standing.entries()][0]!, item = gatherItem(node.kind, 1);
  while (h.sim.inventory.addMaterial(item)) { /* enche a pilha */ }
  const full = h.sim.inventory.materials[item];
  h.cave.player.x = node.x; h.cave.player.y = node.y;
  runCave(h, .3);
  assert.equal(h.cave.gathering.standing.has(id), true, "o ponto ficou");
  assert.equal(h.sim.defeated.has(id), false); assert.equal(h.sim.inventory.materials[item], full);
  assert.equal(h.sim.inventory.spendMaterial(item, 1), true);
  runCave(h, .3);
  assert.equal(h.cave.gathering.standing.has(id), false, "com lugar, colheu"); assert.equal(h.sim.inventory.materials[item], full);
});

test("o save guarda a colheita: um andar novo com o mesmo save nasce com o ponto colhido de fora; e a simulação não duplica", () => {
  const entrance = verdant()[0]!, sim = new OfflineSimulation(SEED), room = new CaveRoom(entrance, 100, 100, sim.defeated, { floorIndex: 2 });
  const [id, node] = [...room.gathering.standing.entries()][0]!;
  room.player.x = node.x; room.player.y = node.y; room.canGather = () => true;
  room.update(.05, { x: 0, y: 0 });
  assert.deepEqual(applyCaveGathering(sim, room), [gatherItem(node.kind, 2)]);
  assert.equal(sim.defeated.has(id), true);
  assert.deepEqual(applyCaveGathering(sim, room), [], "só é guardado uma vez");
  assert.equal(new CaveRoom(entrance, 100, 100, sim.defeated, { floorIndex: 2 }).gathering.standing.has(id), false);
});

test("a tela desenha os pontos de coleta na fila de profundidade, o jogo avisa o que foi colhido e a bolsa só recebe o que cabe", () => {
  const scene = readFileSync("src/ui/CanvasScene.ts", "utf8"), mode = readFileSync("src/game/modes/caveMode.ts", "utf8");
  assert.match(scene, /for\(const node of room\.gathering\.standing\.values\(\)\)/);
  assert.match(scene, /loot\.push\(\{y:node\.y,render:\(\)=>drawCaveHerb\(this\.ctx,node\.kind,node\.x-left,node\.y-top,time\)\}\)/);
  assert.match(mode, /cave\.canGather = item => host\.sim\.inventory\.canAddMaterial\(item\)/);
  assert.match(mode, /Você colheu: \$\{gathered\.join\(", "\)\}\./);
});
