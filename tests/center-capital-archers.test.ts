import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { ARROWS, ARROW_PACK } from "../src/engine/character/Arrows.ts";
import { InteriorRoom, ROOM_FURNITURE, ROOM_HEIGHT, ROOM_WIDTH, hasInterior, interiorCollision, interiorPlace } from "../src/engine/rooms/InteriorRoom.ts";
import { buyArrows, equipArrow, type ShopContext } from "../src/game/actions/shopActions.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { ARCHER_MASTER_ID, CAPITAL_NPCS, CAPITAL_NPC_DIALOGUES, CAPITAL_NPC_LOOKS } from "../src/npcs/center/capital/index.ts";
import { archerMasterNpc } from "../src/npcs/center/capital/archerMaster.ts";
import { NPCS, NPC_LOOKS, nearestNpc } from "../src/npcs/catalog.ts";
import { drawInterior } from "../src/render/interior.ts";
import { CAPITAL_BUILDINGS, CAPITAL_DOORS, CAPITAL_DOOR_REACH, CAPITAL_ENTERABLE, CAPITAL_PLOTS, capitalBuildingBlocks, capitalDoorId, capitalInteriorFor, capitalPoint, CAPITAL } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { spy } from "./helpers/spyContext.ts";

/** A Irmandade dos Arqueiros com função (ADR 0118): porta e salão na capital, o mestre na rua e a compra das flechas, só para o Arqueiro, só perto dele. */
const SEED = 842136, lodge = CAPITAL_BUILDINGS.find(b => b.id === "arqueiros")!, door = CAPITAL_DOORS.find(d => d.id === "capital-arqueiros")!;
const read = (path: string): string => readFileSync(path, "utf8");
function world(opts: { heroClass?: "knight" | "mage" | "archer"; coins?: number; near?: boolean } = {}) {
  const sim = new OfflineSimulation(SEED, undefined, opts.heroClass ?? "archer");
  sim.update(0.01, { x: 0, y: 0 }, false); sim.inventory.addCoins(opts.coins ?? 0);
  if (opts.near !== false) { sim.player.x = archerMasterNpc.x; sim.player.y = archerMasterNpc.y + 10; }
  const context = (extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...extra });
  return { sim, context };
}

test("a Irmandade abre a porta: é um dos edifícios com função, a porta fica à frente dele e o salão tem o nome dela", () => {
  assert.ok((CAPITAL_ENTERABLE as readonly string[]).includes("arqueiros"));
  assert.deepEqual({ ...door }, { id: "capital-arqueiros", name: "Irmandade dos Arqueiros", x: lodge.x, y: lodge.y + CAPITAL_DOOR_REACH });
  assert.equal(capitalDoorId("arqueiros"), "capital-arqueiros");
  assert.deepEqual(capitalInteriorFor("capital-arqueiros"), { id: "capital-arqueiros", name: "Irmandade dos Arqueiros", variant: 0 });
  assert.equal(hasInterior("capital-arqueiros"), true); assert.equal(interiorPlace("capital-arqueiros"), CAPITAL.name);
  assert.equal(CAPITAL_PLOTS.find(p => p.id === "arqueiros")!.door, "s");
  assert.equal(nearestNpc(door.x, door.y)?.id, "capital-arqueiros", "a porta se usa de frente");
  assert.equal(canMoveOnSeed(door.x, door.y, SEED), true); assert.equal(capitalBuildingBlocks(door.x, door.y, 7), false);
  for (const id of ["quartel", "conselho", "ordem-cavaleiros"]) assert.equal(hasInterior(capitalDoorId(id)), false, `${id} segue como fachada`);
});

test("o mestre da Irmandade: mora na rua perto da porta, é um NPC registrado, com aparência e falas, e não fica no caminho do Tomé", () => {
  assert.equal(ARCHER_MASTER_ID, "capital-mestre-arqueiro"); assert.equal(archerMasterNpc.id, ARCHER_MASTER_ID);
  assert.deepEqual([archerMasterNpc.name, archerMasterNpc.role, archerMasterNpc.kind], ["Mestre Orlan", "Mestre da Irmandade dos Arqueiros", "character"]);
  assert.ok(CAPITAL_NPCS.includes(archerMasterNpc)); assert.ok(NPCS.includes(archerMasterNpc)); assert.equal(new Set(NPCS.map(n => n.id)).size, NPCS.length, "ids únicos");
  assert.ok(Math.hypot(archerMasterNpc.x - door.x, archerMasterNpc.y - door.y) < 5 * 32, "perto da porta");
  assert.ok(archerMasterNpc.y > lodge.y, "na rua, à frente do edifício"); assert.equal(canMoveOnSeed(archerMasterNpc.x, archerMasterNpc.y, SEED), true, "em chão livre");
  assert.deepEqual(archerMasterNpc, { id: ARCHER_MASTER_ID, kind: "character", name: "Mestre Orlan", role: "Mestre da Irmandade dos Arqueiros", ...capitalPoint(-34, -1) });
  assert.equal(nearestNpc(archerMasterNpc.x, archerMasterNpc.y)?.id, ARCHER_MASTER_ID);
  assert.equal(NPC_LOOKS[ARCHER_MASTER_ID], CAPITAL_NPC_LOOKS[ARCHER_MASTER_ID]);
  const lines = CAPITAL_NPC_DIALOGUES[ARCHER_MASTER_ID]!; assert.equal(lines.length, 3); assert.match(lines.join(" "), /junco/); assert.match(lines.join(" "), /ferro/); assert.match(lines.join(" "), /dez/); assert.match(lines.join(" "), /arqueiros/);
  const tome = NPCS.find(n => n.name === "Tomé")!;
  assert.ok(Math.abs(tome.x - archerMasterNpc.x) - 6 * 32 > 32, "a rota do Tomé (6 tiles para cada lado) termina a mais de um tile do mestre");
});

test("o salão: duas estantes e a mesa do mestre, mobília que bloqueia, nasce na porta e sai por ela", () => {
  const room = new InteriorRoom("capital-arqueiros");
  assert.equal(room.building.name, "Irmandade dos Arqueiros"); assert.equal(room.furniture, ROOM_FURNITURE["capital-arqueiros"]);
  assert.deepEqual(room.furniture.map(f => f.kind), ["shelf", "shelf", "table"]);
  assert.deepEqual([room.player.x, room.player.y], [ROOM_WIDTH / 2, ROOM_HEIGHT - 53]); assert.equal(room.collision.canMove(room.player.x, room.player.y), true);
  for (const f of room.furniture) assert.equal(interiorCollision(room.furniture).canMove(f.x + f.width / 2, f.y + f.height / 2), false, `${f.kind} bloqueia`);
  assert.ok((spy(c => drawInterior(c, room, 1)).calls.fill ?? 0) > 10, "o salão é desenhado");
  room.update(0.1, { x: 0, y: 1 }); for (let i = 0; i < 80 && !room.reachedExit; i++) room.update(0.05, { x: 0, y: 1 });
  assert.equal(room.reachedExit, true, "sai pela porta de baixo");
});

test("a oferta: o mestre só vende ao Arqueiro, pelo preço do pacote de flechas de junco", () => {
  assert.deepEqual(npcOffer(ARCHER_MASTER_ID, "archer"), { item: "archery", price: ARROWS.reed.price * ARROW_PACK }); assert.equal(ARROWS.reed.price * ARROW_PACK, 10);
  for (const heroClass of ["knight", "mage"] as const) assert.equal(npcOffer(ARCHER_MASTER_ID, heroClass), undefined, `${heroClass} só conversa`);
  assert.equal(npcOffer(ARCHER_MASTER_ID), undefined, "sem a vocação, é o Cavaleiro de sempre");
  assert.equal(npcOffer("capital-mestra-arcana", "archer"), undefined, "a Academia não vende ao Arqueiro");
});

test("comprar flechas: perto do mestre, fora das casas, com o menu aberto, só o Arqueiro, e a bolsa decide o resto", () => {
  const { sim, context } = world({ coins: 100 });
  assert.deepEqual(buyArrows(context(), "reed"), { message: INVENTORY_FEEDBACK["arrows-bought"], changed: true }); assert.deepEqual([sim.inventory.coins, sim.inventory.quiver.counts.reed], [90, 40]);
  assert.equal(buyArrows(context(), "iron").changed, true); assert.deepEqual([sim.inventory.coins, sim.inventory.quiver.counts.iron], [60, 10]);
  const far = world({ coins: 100, near: false }); far.sim.player.x = 16; far.sim.player.y = 16;
  assert.deepEqual(buyArrows(far.context(), "reed"), { message: INVENTORY_FEEDBACK["arrows-too-far"], changed: false }); assert.equal(far.sim.inventory.coins, 100);
  const inside = world({ coins: 100 }); assert.equal(buyArrows(inside.context({ inInterior: true }), "reed").changed, false, "dentro de uma casa não compra"); assert.equal(inside.sim.inventory.coins, 100);
  const closed = world({ coins: 100 }); assert.equal(buyArrows(closed.context({ menuOpen: false }), "reed").changed, false, "sem o painel aberto não compra");
  const poor = world({ coins: 9 }); assert.deepEqual(buyArrows(poor.context(), "reed"), { message: INVENTORY_FEEDBACK["arrows-insufficient-coins"], changed: false }); assert.equal(poor.sim.inventory.coins, 9);
  for (const heroClass of ["knight", "mage"] as const) { const other = world({ heroClass, coins: 100 }); assert.deepEqual(buyArrows(other.context(), "reed"), { message: INVENTORY_FEEDBACK["arrows-not-archer"], changed: false }, heroClass); assert.equal(other.sim.inventory.coins, 100); }
  const farKnight = world({ heroClass: "knight", coins: 100, near: false }); assert.equal(buyArrows(farKnight.context(), "reed").message, INVENTORY_FEEDBACK["arrows-not-archer"], "longe ou perto, a resposta ao Cavaleiro é a mesma");
  const dead = world({ coins: 100 }); dead.sim.player.hp = 0; assert.equal(buyArrows(dead.context(), "reed").changed, false, "herói caído não compra"); assert.equal(dead.sim.inventory.coins, 100);
  const full = world({ coins: 500 }); for (let i = 0; i < 7; i++) buyArrows(full.context(), "reed");
  assert.equal(full.sim.inventory.quiver.counts.reed, 99); assert.deepEqual(buyArrows(full.context(), "reed"), { message: INVENTORY_FEEDBACK["arrows-quiver-full"], changed: false });
});

test("trocar a flecha em uso: só de um tipo de que há flechas, em qualquer lugar; o save guarda", () => {
  const { sim, context } = world({ coins: 100 });
  assert.deepEqual(equipArrow(context(), "iron"), { message: INVENTORY_FEEDBACK["arrow-none"], changed: false });
  buyArrows(context(), "iron");
  assert.deepEqual(equipArrow(context(), "iron"), { message: INVENTORY_FEEDBACK["arrow-equipped"], changed: true }); assert.equal(sim.inventory.quiver.equipped, "iron");
  assert.deepEqual(equipArrow(context(), "iron"), { message: INVENTORY_FEEDBACK["arrow-already-equipped"], changed: false });
  assert.equal(equipArrow(context({ inInterior: true }), "reed").changed, true, "não precisa estar perto do mestre");
  const back = new OfflineSimulation(SEED, JSON.parse(JSON.stringify(sim.snapshot()))); assert.deepEqual(back.inventory.quiver.counts, { reed: 30, iron: 10 }); assert.equal(back.inventory.quiver.equipped, "reed");
});

test("a ligação: o jogo compra e troca, o HUD guarda a lista à venda e a tela mostra o painel da Irmandade", () => {
  const game = read("src/game/Game.ts"), service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), ui = read("src/ui/GameUi.ts");
  assert.match(game, /this\.hud\.onArrowBuy\(arrow => this\.shop\(context => buyArrows\(context, arrow\)\)\);/);
  assert.match(game, /this\.hud\.onArrowEquip\(arrow => this\.shop\(context => equipArrow\(context, arrow\)\)\);/);
  assert.match(ui, /'shrine' \| 'academy' \| 'archery'; price: number/); assert.match(ui, /onArrowBuy\(callback: \(arrow: ArrowId\) => string\): void;/); assert.match(ui, /onArrowEquip\(callback: \(arrow: ArrowId\) => string\): void;/);
  assert.match(service, /buyArrows\(arrow: ArrowId\): void \{ this\.npcTradeFeedback\.set\(this\.arrowBuyCallback\(arrow\)\); \}/);
  assert.match(service, /equipArrow\(arrow: ArrowId\): void \{ this\.npcTradeFeedback\.set\(this\.arrowEquipCallback\(arrow\)\); \}/);
  assert.match(service, /const count = this\.quiver\(\)\.counts\[id\], room = MAX_ARROWS - count, pack = Math\.min\(ARROW_PACK, room\), def = ARROWS\[id\];/);
  assert.match(page, /\} @else if \(offer\.item === 'archery'\) \{/);
  assert.match(page, /\[attr\.id\]="'buy-arrows-' \+ row\.id"\s*\n\s*\[disabled\]="row\.room < 1 \|\| hud\.coins\(\) < row\.packPrice" \(click\)="hud\.buyArrows\(row\.id\)"/, "não compra com a aljava cheia nem sem moedas");
  assert.match(page, /\[attr\.id\]="'use-arrows-' \+ row\.id"\s*\n\s*\[disabled\]="row\.equipped \|\| row\.count < 1" \(click\)="hud\.equipArrow\(row\.id\)"/);
});
