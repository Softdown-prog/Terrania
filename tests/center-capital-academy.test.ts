import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { STAVES } from "../src/engine/character/Staves.ts";
import { InteriorRoom, ROOM_FURNITURE, ROOM_HEIGHT, ROOM_WIDTH, hasInterior, interiorCollision, interiorPlace } from "../src/engine/rooms/InteriorRoom.ts";
import { buyStaff, equipStaff, type ShopContext } from "../src/game/actions/shopActions.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { NO_STAVES_MESSAGE } from "../src/game/messages/classRules.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { CAPITAL_NPCS, CAPITAL_NPC_DIALOGUES, CAPITAL_NPC_LOOKS, MAGE_MASTER_ID } from "../src/npcs/center/capital/index.ts";
import { mageMasterNpc } from "../src/npcs/center/capital/mageMaster.ts";
import { NPCS, NPC_LOOKS, NPC_TALK_RANGE, nearestNpc } from "../src/npcs/catalog.ts";
import { drawInterior } from "../src/render/interior.ts";
import { CAPITAL_BUILDINGS, CAPITAL_DOORS, CAPITAL_DOOR_REACH, CAPITAL_ENTERABLE, CAPITAL_PLOTS, capitalBuildingBlocks, capitalDoorId, capitalInteriorFor, capitalPoint, CAPITAL } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { spy } from "./helpers/spyContext.ts";

/**
 * A Academia Arcana com função (ADR 0074): porta e salão na capital, a mestra na rua e a compra do Cajado da Brisa (30 Terrania Gold),
 * só para o Mago, só perto dela.
 */
const SEED = 842136, academy = CAPITAL_BUILDINGS.find(b => b.id === "academia-arcana")!, door = CAPITAL_DOORS.find(d => d.id === "capital-academia-arcana")!;
const read = (path: string): string => readFileSync(path, "utf8");
function world(opts: { heroClass?: "knight" | "mage"; level?: number; coins?: number; near?: boolean } = {}) {
  const sim = new OfflineSimulation(SEED, undefined, opts.heroClass ?? "mage");
  sim.update(0.01, { x: 0, y: 0 }, false); sim.experience = experienceForLevel(opts.level ?? 1); sim.inventory.addCoins(opts.coins ?? 0);
  if (opts.near !== false) { sim.player.x = mageMasterNpc.x; sim.player.y = mageMasterNpc.y + 10; }
  const context = (extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...extra });
  return { sim, context };
}

test("a Academia Arcana abre a porta: é um dos edifícios com função, a porta fica à frente dele e o salão tem o nome dela", () => {
  assert.ok((CAPITAL_ENTERABLE as readonly string[]).includes("academia-arcana"));
  assert.deepEqual({ ...door }, { id: "capital-academia-arcana", name: "Academia Arcana", x: academy.x, y: academy.y + CAPITAL_DOOR_REACH });
  assert.equal(capitalDoorId("academia-arcana"), "capital-academia-arcana");
  assert.deepEqual(capitalInteriorFor("capital-academia-arcana"), { id: "capital-academia-arcana", name: "Academia Arcana", variant: 0 });
  assert.equal(hasInterior("capital-academia-arcana"), true); assert.equal(interiorPlace("capital-academia-arcana"), CAPITAL.name);
  assert.equal(CAPITAL_PLOTS.find(p => p.id === "academia-arcana")!.door, "s");
  assert.equal(canMoveOnSeed(door.x, door.y, SEED), true, "a porta está na rua"); assert.equal(capitalBuildingBlocks(door.x, door.y, 7), false);
  assert.equal(nearestNpc(door.x, door.y)?.id, "capital-academia-arcana", "a porta se usa de frente");
  for (const id of ["quartel", "conselho", "ordem-cavaleiros"]) assert.equal(hasInterior(capitalDoorId(id)), false, `${id} segue como fachada`);
});

test("a mestra da Academia: mora na rua perto da porta, é uma NPC registrada, com aparência e falas, e não bloqueia nem some", () => {
  assert.equal(MAGE_MASTER_ID, "capital-mestra-arcana"); assert.equal(mageMasterNpc.id, MAGE_MASTER_ID);
  assert.deepEqual([mageMasterNpc.name, mageMasterNpc.role, mageMasterNpc.kind], ["Mestra Ilvana", "Mestra da Academia Arcana", "character"]);
  assert.ok(CAPITAL_NPCS.includes(mageMasterNpc)); assert.ok(NPCS.includes(mageMasterNpc)); assert.equal(new Set(NPCS.map(n => n.id)).size, NPCS.length, "ids únicos");
  assert.ok(Math.hypot(mageMasterNpc.x - door.x, mageMasterNpc.y - door.y) < 5 * 32, "perto da porta");
  assert.ok(mageMasterNpc.y > academy.y, "na rua, à frente do edifício");
  assert.equal(canMoveOnSeed(mageMasterNpc.x, mageMasterNpc.y, SEED), true, "em chão livre");
  assert.deepEqual(mageMasterNpc, { id: MAGE_MASTER_ID, kind: "character", name: "Mestra Ilvana", role: "Mestra da Academia Arcana", ...capitalPoint(32, -16) });
  assert.equal(nearestNpc(mageMasterNpc.x, mageMasterNpc.y)?.id, MAGE_MASTER_ID); assert.ok(NPC_TALK_RANGE > 0);
  assert.equal(CAPITAL_NPC_LOOKS[MAGE_MASTER_ID]!.prop, "staff"); assert.equal(NPC_LOOKS[MAGE_MASTER_ID], CAPITAL_NPC_LOOKS[MAGE_MASTER_ID]);
  const lines = CAPITAL_NPC_DIALOGUES[MAGE_MASTER_ID]!; assert.equal(lines.length, 3); assert.match(lines.join(" "), /Brisa/); assert.match(lines.join(" "), /trinta/); assert.match(lines.join(" "), /magos/);
});

test("o salão: duas estantes e a mesa de estudo, mobília que bloqueia, nasce na porta e sai por ela", () => {
  const room = new InteriorRoom("capital-academia-arcana");
  assert.equal(room.building.name, "Academia Arcana"); assert.equal(room.furniture, ROOM_FURNITURE["capital-academia-arcana"]);
  assert.deepEqual(room.furniture.map(f => f.kind), ["shelf", "shelf", "table"]);
  assert.deepEqual([room.player.x, room.player.y], [ROOM_WIDTH / 2, ROOM_HEIGHT - 53]);
  assert.equal(room.collision.canMove(room.player.x, room.player.y), true);
  for (const f of room.furniture) assert.equal(interiorCollision(room.furniture).canMove(f.x + f.width / 2, f.y + f.height / 2), false, `${f.kind} bloqueia`);
  const calls = spy(c => drawInterior(c, room, 1)); assert.ok((calls.calls.fill ?? 0) > 10, "o salão é desenhado");
  room.update(0.1, { x: 0, y: 1 }); for (let i = 0; i < 80 && !room.reachedExit; i++) room.update(0.05, { x: 0, y: 1 });
  assert.equal(room.reachedExit, true, "sai pela porta de baixo");
});

test("a oferta: a mestra só vende ao Mago, pelo preço do primeiro cajado elemental", () => {
  assert.deepEqual(npcOffer(MAGE_MASTER_ID, "mage"), { item: "academy", price: 30 }); assert.equal(STAVES.breeze.price, 30);
  assert.equal(npcOffer(MAGE_MASTER_ID, "knight"), undefined, "o Cavaleiro só conversa"); assert.equal(npcOffer(MAGE_MASTER_ID), undefined, "sem a vocação, é o Cavaleiro de sempre");
});

test("comprar a Brisa: perto da mestra, fora das casas, com o menu aberto, só o Mago, e a bolsa decide o resto", () => {
  const { sim, context } = world({ coins: 100 });
  const ok = buyStaff(context(), "breeze");
  assert.deepEqual(ok, { message: INVENTORY_FEEDBACK["staff-purchased"], changed: true }); assert.equal(sim.inventory.coins, 70); assert.deepEqual(sim.inventory.staves.bought, ["breeze"]);
  assert.deepEqual(buyStaff(context(), "breeze"), { message: INVENTORY_FEEDBACK["staff-already-owned"], changed: false }); assert.equal(sim.inventory.coins, 70, "não cobra duas vezes");
  const far = world({ coins: 100, near: false }); far.sim.player.x = 16; far.sim.player.y = 16;
  assert.deepEqual(buyStaff(far.context(), "breeze"), { message: INVENTORY_FEEDBACK["staff-too-far"], changed: false }); assert.equal(far.sim.inventory.coins, 100);
  const inside = world({ coins: 100 }); assert.equal(buyStaff(inside.context({ inInterior: true }), "breeze").changed, false, "dentro de uma casa não compra"); assert.equal(inside.sim.inventory.coins, 100);
  const closed = world({ coins: 100 }); assert.equal(buyStaff(closed.context({ menuOpen: false }), "breeze").changed, false, "sem o painel aberto não compra");
  const poor = world({ coins: 29 }); assert.deepEqual(buyStaff(poor.context(), "breeze"), { message: INVENTORY_FEEDBACK["staff-insufficient-coins"], changed: false }); assert.equal(poor.sim.inventory.coins, 29);
  const knight = world({ heroClass: "knight", coins: 100 }); assert.deepEqual(buyStaff(knight.context(), "breeze"), { message: NO_STAVES_MESSAGE, changed: false }); assert.equal(knight.sim.inventory.coins, 100);
  const unsold = world({ coins: 100 }); assert.deepEqual(buyStaff(unsold.context(), "tide"), { message: INVENTORY_FEEDBACK["staff-not-for-sale"], changed: false }, "o que não é vendido não se compra");
  const dead = world({ coins: 100 }); dead.sim.player.hp = 0; assert.equal(buyStaff(dead.context(), "breeze").changed, false, "herói caído não compra"); assert.equal(dead.sim.inventory.coins, 100);
});

test("depois de comprar: a Brisa só se usa do nível 10, e o save guarda a compra", () => {
  const low = world({ coins: 100, level: 9 }); buyStaff(low.context(), "breeze");
  assert.deepEqual(equipStaff(low.context(), "breeze"), { message: INVENTORY_FEEDBACK["staff-level-too-low"], changed: false }, "comprou no nível 9, ainda não usa");
  const ready = world({ coins: 100, level: 10 }); buyStaff(ready.context(), "breeze");
  assert.equal(equipStaff(ready.context(), "breeze").changed, true); assert.equal(ready.sim.equippedStaff, "breeze");
  assert.equal(ready.sim.combatProfile.interval, STAVES.breeze.interval);
  const back = new OfflineSimulation(SEED, ready.sim.snapshot()); assert.equal(back.equippedStaff, "breeze"); assert.deepEqual(back.inventory.staves.bought, ["breeze"]);
});

test("a ligação: o jogo compra, o HUD guarda a lista à venda e a tela mostra o painel da Academia", () => {
  const game = read("src/game/Game.ts"), service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), ui = read("src/ui/GameUi.ts");
  assert.match(game, /this\.hud\.onStaffBuy\(staff => this\.shop\(context => buyStaff\(context, staff\)\)\);/);
  assert.match(game, /const offer = npcOffer\(npc\.id, this\.sim\.heroClass\);/);
  assert.match(ui, /'bank' \| 'shrine' \| 'academy' \| 'archery'; price: number/); assert.match(ui, /onStaffBuy\(callback: \(staff: StaffId\) => string\): void;/);
  assert.match(service, /buyStaff\(staff: StaffId\): void \{ this\.npcTradeFeedback\.set\(this\.staffBuyCallback\(staff\)\); \}/);
  assert.match(service, /return STAFF_IDS\.flatMap\(id => \{ const price = STAVES\[id\]\.price; return price === undefined \? \[\] : \[\{ id, def: STAVES\[id\], price, owned: bought\.includes\(id\) \}\]; \}\);/, "só os que têm preço");
  assert.match(page, /\} @else if \(offer\.item === 'academy'\) \{/);
  assert.match(page, /@for \(row of hud\.staffForSale\(\); track row\.id\)/);
  assert.match(page, /\[attr\.id\]="'buy-staff-' \+ row\.id"\s*\n\s*\[disabled\]="row\.owned \|\| hud\.coins\(\) < row\.price" \(click\)="hud\.buyStaff\(row\.id\)"/, "não compra o que já tem nem sem moedas");
  assert.match(page, /row\.owned \? "Já possui" : "Comprar por " \+ hud\.coinText\(row\.price\)/);
});
