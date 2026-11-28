import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { INN_REST_PRICE } from "../src/engine/character/Inventory.ts";
import { InteriorRoom, ROOM_FURNITURE, ROOM_HEIGHT, ROOM_WIDTH, hasInterior, interiorCollision, interiorPlace } from "../src/engine/rooms/InteriorRoom.ts";
import { restAtInn, type ShopContext } from "../src/game/actions/shopActions.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { CAPITAL_INN_RESTED } from "../src/game/messages/capitalInn.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { CAPITAL_NPCS, CAPITAL_NPC_DIALOGUES, CAPITAL_NPC_LOOKS, INNKEEPER_ID } from "../src/npcs/center/capital/index.ts";
import { NPCS, NPC_LOOKS, NPC_TALK_RANGE, nearestNpc, npcDialogue } from "../src/npcs/catalog.ts";
import { drawInterior } from "../src/render/interior.ts";
import { CAPITAL_BUILDINGS, CAPITAL_DOORS, CAPITAL_DOOR_REACH, CAPITAL_ENTERABLE, CAPITAL_PLOTS, capitalBuildingBlocks, capitalDoorId, capitalGround, capitalInteriorFor, capitalPoint,
  CAPITAL } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { BUILDINGS } from "../src/world/village.ts";
import { SOUTH_BUILDINGS } from "../src/world/southCity.ts";
import { spy } from "./helpers/spyContext.ts";

/**
 * Piloto da Hospedaria dos Viajantes (ADR 0062): só entra quem tem função de jogo; a porta, o interior, a hospedeira da capital e o
 * descanso pago, que é o mesmo da Madame Víbora no Poço Negro.
 */
const SEED = 842136, inn = CAPITAL_BUILDINGS.find(b => b.id === "hospedaria")!, door = CAPITAL_DOORS[0]!, brigida = CAPITAL_NPCS[0]!;
function world(coins = 0) {
  const sim = new OfflineSimulation(SEED);
  sim.inventory.addCoins(coins);
  const context = (extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...extra });
  const goTo = (x: number, y: number) => { sim.player.x = x; sim.player.y = y; };
  return { sim, context, goTo };
}

test("só os edifícios com função abrem a porta (Hospedaria, banco, Templo, Academia Arcana e Irmandade dos Arqueiros, por enquanto): a lista é de decisão do dono, e cada porta é de um edifício construído e fica à frente dele", () => {
  assert.deepEqual([...CAPITAL_ENTERABLE], ["hospedaria", "casa-da-moeda", "templo", "academia-arcana", "arqueiros"]);
  assert.equal(CAPITAL_DOORS.length, 5);
  assert.deepEqual(CAPITAL_DOORS.map(d => d.id), ["capital-hospedaria", "capital-casa-da-moeda", "capital-templo", "capital-academia-arcana", "capital-arqueiros"]);
  assert.deepEqual({ ...door }, { id: "capital-hospedaria", name: "Hospedaria dos Viajantes", x: inn.x, y: inn.y + CAPITAL_DOOR_REACH });
  assert.equal(CAPITAL_DOOR_REACH, 29); assert.equal(capitalDoorId("hospedaria"), "capital-hospedaria");
  for (const d of CAPITAL_DOORS) assert.ok(CAPITAL_BUILDINGS.some(b => capitalDoorId(b.id) === d.id), "porta de um edifício construído");
  const ids = new Set([...BUILDINGS.map(b => b.id), ...SOUTH_BUILDINGS.map(b => b.id), ...CAPITAL_NPCS.map(n => n.id)]);
  for (const d of CAPITAL_DOORS) assert.equal(ids.has(d.id), false, "o identificador não colide com o da Vila nem do Poço Negro");
  // o terreno é a fachada pintada, e a porta cai logo à frente: na rua, livre e fora do bloqueio do edifício
  assert.equal(canMoveOnSeed(door.x, door.y, SEED), true); assert.equal(capitalBuildingBlocks(door.x, door.y, 7), false);
  assert.equal(CAPITAL_PLOTS.find(p => p.id === "hospedaria")!.door, "s");
  // os outros edifícios construídos ainda são fachada: nenhuma porta abre
  for (const b of CAPITAL_BUILDINGS.filter(b => !(CAPITAL_ENTERABLE as readonly string[]).includes(b.id))) assert.equal(hasInterior(capitalDoorId(b.id)), false, `${b.id} ainda é só fachada`);
});

test("o interior de uma porta: só as portas da capital que abrem têm sala, e as da Vila e do Poço Negro seguem como estavam", () => {
  assert.deepEqual(capitalInteriorFor("capital-hospedaria"), { id: "capital-hospedaria", name: "Hospedaria dos Viajantes", variant: 0 });
  for (const bad of ["hospedaria", "templo", "capital-conselho", "capital-quartel", "", "capital-"]) assert.equal(capitalInteriorFor(bad), undefined, bad);
  assert.equal(hasInterior("capital-hospedaria"), true); assert.equal(hasInterior("inn"), true, "a hospedaria da Vila"); assert.equal(hasInterior("south-inn"), true);
  assert.equal(hasInterior("hospedaria"), false); assert.equal(hasInterior("lina"), false);
  assert.equal(hasInterior(SOUTH_BUILDINGS.find(b => !b.interior)!.id), false, "um prédio do Poço Negro sem interior");
  assert.match(readFileSync("src/game/Game.ts", "utf8"), /if \(npc\.kind === "door" && hasInterior\(npc\.id\)\) \{/);
});

test("a porta se usa da frente do edifício: dentro do alcance de 25 × 28 px da porta, e o herói nunca fica mais perto que o corpo permite", () => {
  const front = { x: inn.x, y: inn.y + 7 }; // o ponto mais perto da parede que o herói alcança (raio de 7 px)
  assert.equal(canMoveOnSeed(front.x, front.y, SEED), true); assert.equal(canMoveOnSeed(front.x, front.y - 1, SEED), false, "um pixel mais perto bate na parede");
  for (const [dx, dy, hit] of [[0, 0, true], [0, 7 - CAPITAL_DOOR_REACH, true], [25, 0, true], [-25, 0, true], [26, 0, false], [-26, 0, false], [0, 28, true], [0, 29, false]] as const) {
    const near = nearestNpc(door.x + dx, door.y + dy)?.id;
    if (hit) assert.equal(near, "capital-hospedaria", `${dx},${dy}`); else assert.notEqual(near, "capital-hospedaria", `${dx},${dy}`);
  }
  assert.equal(nearestNpc(inn.x, inn.y + 7)?.kind, "door"); assert.deepEqual(NPCS.slice(-5).map(n => n.id), ["capital-hospedaria", "capital-casa-da-moeda", "capital-templo", "capital-academia-arcana", "capital-arqueiros"], "as portas da capital vêm por último");
  assert.equal(npcDialogue(NPCS.at(-5)!, 0).join(" "), "Use E perto da porta para entrar em Hospedaria dos Viajantes.");
});

test("a sala da Hospedaria: duas camas e o balcão, mobília que bloqueia, saída pela porta de baixo e paleta própria da capital", () => {
  const room = new InteriorRoom("capital-hospedaria");
  assert.equal(room.building.name, "Hospedaria dos Viajantes"); assert.equal(room.furniture, ROOM_FURNITURE["capital-hospedaria"]);
  assert.deepEqual(room.furniture.map(f => f.kind), ["bed", "bed", "table"]);
  assert.deepEqual([room.player.x, room.player.y], [ROOM_WIDTH / 2, ROOM_HEIGHT - 53], "nasce na porta, de frente para dentro");
  assert.equal(room.collision.canMove(room.player.x, room.player.y), true);
  for (const f of room.furniture) assert.equal(room.collision.canMove(f.x + f.width / 2, f.y + f.height / 2), false, `${f.kind} bloqueia`);
  assert.equal(interiorCollision(room.furniture).canMove(ROOM_WIDTH / 2, 70), true, "o corredor do meio está livre");
  assert.equal(room.reachedExit, false); room.player.y = ROOM_HEIGHT - 30; assert.equal(room.reachedExit, true, "chegar à porta de baixo é sair");
  assert.throws(() => new InteriorRoom("capital-conselho"), /Interior desconhecido/);
  assert.equal(interiorPlace("capital-hospedaria"), "Concórdia", "o painel diz o lugar certo"); assert.equal(interiorPlace("south-inn"), "Poço Negro"); assert.equal(interiorPlace("inn"), "Vila da Travessia"); assert.equal(interiorPlace("council"), "Vila da Travessia");
  assert.match(readFileSync("src/game/modes/interiorMode.ts", "utf8"), /host\.hud\.setInterior\(room\.building\.name, interiorPlace\(room\.building\.id\)\);/);
  assert.match(readFileSync("src/app/hud.service.ts", "utf8"), /setInterior\(name: string, place = 'Vila da Travessia'\)/);
  const capital = spy(c => drawInterior(c, room)), village = spy(c => drawInterior(c, new InteriorRoom("inn"))), south = spy(c => drawInterior(c, new InteriorRoom("south-inn")));
  assert.ok(capital.raw.includes("#7d8aa6") && capital.raw.includes("#8d8678"), "parede de pedra azulada e piso de lajes claras");
  for (const other of [village, south]) assert.equal(other.raw.includes("#7d8aa6"), false, "a paleta da capital é só dela");
  assert.ok(south.raw.includes("#a8683e") && village.raw.some(c => c === "#586b5c" || c === "#69645a" || c === "#765e50"), "as da Vila e do Poço Negro seguem iguais");
});

test("Dona Brígida: a hospedeira está na rua, ao lado da porta, em chão livre, com ficha, fala e a oferta do descanso", () => {
  assert.deepEqual({ id: brigida.id, kind: brigida.kind, name: brigida.name, role: brigida.role }, { id: INNKEEPER_ID, kind: "character", name: "Dona Brígida", role: "Hospedeira" });
  assert.deepEqual([brigida.x, brigida.y], [capitalPoint(-15, -1).x, capitalPoint(-15, -1).y]);
  assert.equal(canMoveOnSeed(brigida.x, brigida.y, SEED), true, "em chão livre"); assert.equal(capitalBuildingBlocks(brigida.x, brigida.y, 7), false);
  assert.equal(capitalGround(CAPITAL.centerX - 15, CAPITAL.centerY - 1), "path", "na rua");
  assert.ok(Math.hypot(brigida.x - door.x, brigida.y - door.y) <= NPC_TALK_RANGE, "de onde se vê a porta, dá para falar com ela");
  assert.equal(NPCS.some(n => n.id === INNKEEPER_ID), true); assert.strictEqual(NPC_LOOKS[INNKEEPER_ID], CAPITAL_NPC_LOOKS[INNKEEPER_ID]);
  assert.equal(NPC_LOOKS[INNKEEPER_ID]!.prop, "lantern"); assert.equal(NPCS.filter(n => n.id === INNKEEPER_ID).length, 1);
  assert.deepEqual(npcDialogue(brigida, 0), CAPITAL_NPC_DIALOGUES[INNKEEPER_ID]); assert.equal(npcDialogue(brigida, 0).length, 3);
  assert.deepEqual(npcOffer(INNKEEPER_ID), { item: "rest", price: INN_REST_PRICE }); assert.deepEqual(npcOffer("south-madame"), { item: "rest", price: INN_REST_PRICE });
  assert.equal(npcOffer("capital-conselho"), undefined);
});

test("descanso na hospedaria da capital: custa o mesmo, cura tudo e limpa os status, só ao lado de Dona Brígida, com a fala dela", () => {
  const w = world(INN_REST_PRICE);
  w.sim.player.hp = 12; w.sim.player.applyStatus("poison", 6); w.sim.player.applyStatus("burn", 4);
  const refused = { message: INVENTORY_FEEDBACK["too-far-from-inn"], changed: false };
  assert.deepEqual(restAtInn(w.context()), refused, "longe dela");
  w.goTo(brigida.x, brigida.y);
  assert.deepEqual(restAtInn(w.context({ menuOpen: false })), refused, "menu fechado"); assert.deepEqual(restAtInn(w.context({ inInterior: true })), refused, "dentro de um interior");
  assert.equal(w.sim.inventory.coins, INN_REST_PRICE, "as recusas não cobraram nada"); assert.equal(w.sim.player.hp, 12);
  w.sim.player.hp = 0; assert.deepEqual(restAtInn(w.context()), { message: INVENTORY_FEEDBACK.unavailable, changed: false }, "caído não descansa"); w.sim.player.hp = 12;
  assert.deepEqual(restAtInn(w.context()), { message: CAPITAL_INN_RESTED, changed: true });
  assert.notEqual(CAPITAL_INN_RESTED, INVENTORY_FEEDBACK.rested, "a fala é dela, não da Madame");
  assert.equal(w.sim.player.hp, w.sim.player.maxHp); assert.ok(Object.values(w.sim.player.debuffs).every(s => s === 0)); assert.equal(w.sim.inventory.coins, 0, "pagou o preço do descanso");
  // sem moedas não cura, e quem já está bem não paga nada, nem com a fala dela
  w.sim.player.hp = 20; assert.deepEqual(restAtInn(w.context()), { message: INVENTORY_FEEDBACK["insufficient-rest-coins"], changed: false }); assert.equal(w.sim.player.hp, 20);
  w.sim.inventory.addCoins(INN_REST_PRICE); w.sim.player.hp = w.sim.player.maxHp;
  assert.deepEqual(restAtInn(w.context()), { message: INVENTORY_FEEDBACK["rest-not-needed"], changed: false }); assert.equal(w.sim.inventory.coins, INN_REST_PRICE);
});

test("o descanso do Poço Negro segue com a fala da Madame Víbora, e dois hospedeiros não se confundem", () => {
  const w = world(INN_REST_PRICE * 2);
  w.sim.player.hp = 10;
  const madame = NPCS.find(n => n.id === "south-madame")!;
  w.goTo(madame.x, madame.y);
  assert.deepEqual(restAtInn(w.context()), { message: INVENTORY_FEEDBACK.rested, changed: true }, "a fala é a da Madame");
  w.sim.player.hp = 10; w.goTo(brigida.x, brigida.y);
  assert.deepEqual(restAtInn(w.context()), { message: CAPITAL_INN_RESTED, changed: true }, "e na capital, a de Dona Brígida");
  assert.equal(w.sim.inventory.coins, 0);
});
