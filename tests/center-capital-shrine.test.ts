import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { DEFAULT_RESPAWN_POINT, RESPAWN_POINTS, RESPAWN_POINT_IDS, normalizeRespawnPoint } from "../src/engine/character/center/shrine/index.ts";
import { InteriorRoom, ROOM_FURNITURE, ROOM_HEIGHT, ROOM_WIDTH, hasInterior, interiorCollision, interiorPlace } from "../src/engine/rooms/InteriorRoom.ts";
import { chooseRespawnPoint } from "../src/game/actions/center/shrineActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { SHRINE_TOO_FAR, SHRINE_UNAVAILABLE, shrineAlready, shrineChosen } from "../src/game/messages/center/shrine.ts";
import { CAPITAL_NPCS, CAPITAL_NPC_DIALOGUES, CAPITAL_NPC_LOOKS, PRIESTESS_ID } from "../src/npcs/center/capital/index.ts";
import { NPCS, NPC_LOOKS, NPC_TALK_RANGE, nearestNpc } from "../src/npcs/catalog.ts";
import { drawInterior } from "../src/render/interior.ts";
import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_DOORS, CAPITAL_PLOTS, capitalBuildingBlocks, capitalGround, capitalInteriorFor, capitalPoint } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { VILLAGE_RESPAWN } from "../src/world/village.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";
import { spy } from "./helpers/spyContext.ts";

/**
 * O Templo da Concórdia como lugar de renascimento (ADR 0064): o herói começa renascendo na Vila; a sacerdotisa do Templo permite
 * consagrar o Templo (ou voltar à Vila); a escolha vale ao cair, vai para o save e a porta do Templo abre a nave.
 */
const SEED = 842136, temple = CAPITAL_BUILDINGS.find(b => b.id === "templo")!, door = CAPITAL_DOORS.find(d => d.id === "capital-templo")!;
const priestess = CAPITAL_NPCS.find(n => n.id === PRIESTESS_ID)!;
function world() {
  const sim = new OfflineSimulation(SEED);
  const context = (extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...extra });
  const goTo = (x: number, y: number) => { sim.player.x = x; sim.player.y = y; };
  goTo(priestess.x, priestess.y);
  return { sim, context, goTo };
}

test("os pontos de renascimento: a Vila é o padrão e o ponto do Templo fica à porta, na rua, livre e ao alcance da sacerdotisa", () => {
  assert.equal(DEFAULT_RESPAWN_POINT, "village"); assert.deepEqual([...RESPAWN_POINT_IDS], ["village", "capital-temple"]);
  assert.deepEqual({ ...RESPAWN_POINTS.village }, { id: "village", name: "Vila da Travessia", x: VILLAGE_RESPAWN.x, y: VILLAGE_RESPAWN.y });
  const t = RESPAWN_POINTS["capital-temple"], at = capitalPoint(30, -1);
  assert.deepEqual({ ...t }, { id: "capital-temple", name: "Templo da Concórdia", x: at.x, y: at.y });
  assert.equal(canMoveOnSeed(t.x, t.y, SEED), true, "em chão livre"); assert.equal(capitalBuildingBlocks(t.x, t.y, 7), false, "fora do bloqueio do edifício");
  assert.equal(capitalGround(CAPITAL.centerX + 30, CAPITAL.centerY - 1), "path", "na rua");
  assert.ok(Math.abs(t.x - temple.x) < 1, "bem à frente do Templo"); assert.ok(Math.hypot(t.x - door.x, t.y - door.y) <= NPC_TALK_RANGE, "à vista da porta");
  assert.ok(Math.hypot(t.x - priestess.x, t.y - priestess.y) <= NPC_TALK_RANGE, "ao lado da sacerdotisa");
  assert.ok(Math.hypot(t.x - RESPAWN_POINTS.village.x, t.y - RESPAWN_POINTS.village.y) > 20_000, "a capital fica muito longe da Vila: por isso a escolha é do jogador");
  for (const bad of [undefined, null, 3, "", "temple", "capital", "Village", {}, []]) assert.equal(normalizeRespawnPoint(bad), "village", String(bad));
  assert.equal(normalizeRespawnPoint("capital-temple"), "capital-temple"); assert.equal(normalizeRespawnPoint("village"), "village");
});

test("renascer: na Vila por padrão, no Templo se consagrado, de vida cheia, e voltar à Vila volta de verdade", () => {
  const sim = new OfflineSimulation(SEED);
  assert.equal(sim.respawnPoint, "village"); assert.equal(sim.respawn(), false, "de pé não renasce");
  sim.player.hp = 0;
  assert.equal(sim.respawn(), true); assert.deepEqual([sim.player.x, sim.player.y], [VILLAGE_RESPAWN.x, VILLAGE_RESPAWN.y], "a Vila, como sempre foi");
  assert.equal(sim.player.hp, sim.player.maxHp);
  sim.respawnPoint = "capital-temple"; sim.player.x = 5_000; sim.player.y = 5_000; sim.player.hp = 0;
  assert.equal(sim.respawn(), true);
  assert.deepEqual([sim.player.x, sim.player.y], [RESPAWN_POINTS["capital-temple"].x, RESPAWN_POINTS["capital-temple"].y], "à porta do Templo, de onde quer que tenha caído");
  assert.equal(sim.player.hp, sim.player.maxHp); assert.equal(sim.awaitingRespawn, false);
  assert.equal(canMoveOnSeed(sim.player.x, sim.player.y, SEED), true, "renasce em chão livre");
  sim.respawnPoint = "village"; sim.player.hp = 0; sim.respawn();
  assert.deepEqual([sim.player.x, sim.player.y], [VILLAGE_RESPAWN.x, VILLAGE_RESPAWN.y]);
});

test("a escolha vai para o save e volta: só o que não é a Vila ocupa espaço, outro mundo não herda e lixo vira Vila", () => {
  const fresh = new OfflineSimulation(SEED);
  assert.equal("respawnPoint" in fresh.snapshot(), false, "save de quem nunca consagrou fica igual ao de antes");
  const saved = { ...fresh.snapshot(), respawnPoint: "capital-temple" as const };
  const sim = new OfflineSimulation(SEED, saved);
  assert.equal(sim.respawnPoint, "capital-temple"); assert.equal(sim.snapshot().respawnPoint, "capital-temple");
  assert.equal(new OfflineSimulation(SEED + 1, saved).respawnPoint, "village", "outro mundo não herda");
  assert.equal("respawnPoint" in new OfflineSimulation(SEED, { ...saved, respawnPoint: "village" }).snapshot(), false);
  assert.equal(new OfflineSimulation(SEED, { ...saved, respawnPoint: "lua" as never }).respawnPoint, "village");
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } } });
  try {
    saveLocal(sim.snapshot()); assert.equal(loadLocalSave()!.respawnPoint, "capital-temple", "sobrevive a fechar e abrir o jogo");
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], respawnPoint: "lua" }));
    assert.equal("respawnPoint" in loadLocalSave()!, false, "lixo vira Vila");
    store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], respawnPoint: "village" }));
    assert.equal("respawnPoint" in loadLocalSave()!, false);
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});

test("Irmã Maelis: a sacerdotisa está na rua, ao lado da porta, em chão livre, com ficha, fala e a oferta do Templo", () => {
  assert.deepEqual({ id: priestess.id, kind: priestess.kind, name: priestess.name, role: priestess.role }, { id: PRIESTESS_ID, kind: "character", name: "Irmã Maelis", role: "Sacerdotisa" });
  assert.deepEqual([priestess.x, priestess.y], [capitalPoint(32, -1).x, capitalPoint(32, -1).y]);
  assert.equal(canMoveOnSeed(priestess.x, priestess.y, SEED), true); assert.equal(capitalBuildingBlocks(priestess.x, priestess.y, 7), false);
  assert.equal(capitalGround(CAPITAL.centerX + 32, CAPITAL.centerY - 1), "path");
  assert.ok(Math.hypot(priestess.x - door.x, priestess.y - door.y) <= NPC_TALK_RANGE, "de onde se vê a porta, dá para falar com ela");
  assert.equal(NPCS.filter(n => n.id === PRIESTESS_ID).length, 1); assert.strictEqual(NPC_LOOKS[PRIESTESS_ID], CAPITAL_NPC_LOOKS[PRIESTESS_ID]);
  assert.equal(CAPITAL_NPC_DIALOGUES[PRIESTESS_ID]!.length, 3); assert.match(CAPITAL_NPC_DIALOGUES[PRIESTESS_ID]!.join(" "), /onde quer renascer/);
  assert.deepEqual(npcOffer(PRIESTESS_ID), { item: "shrine", price: 0 });
  assert.equal(nearestNpc(priestess.x, priestess.y)?.id, PRIESTESS_ID);
});

test("a porta e a nave do Templo: abre, fica à frente do edifício, e a sala tem altar e dois bancos que bloqueiam", () => {
  assert.deepEqual({ ...door }, { id: "capital-templo", name: "Templo da Concórdia", x: temple.x, y: temple.y + 29 });
  assert.equal(CAPITAL_PLOTS.find(p => p.id === "templo")!.door, "s"); assert.equal(canMoveOnSeed(door.x, door.y, SEED), true);
  assert.deepEqual(capitalInteriorFor("capital-templo"), { id: "capital-templo", name: "Templo da Concórdia", variant: 0 }); assert.equal(hasInterior("capital-templo"), true);
  const room = new InteriorRoom("capital-templo");
  assert.equal(room.furniture, ROOM_FURNITURE["capital-templo"]); assert.deepEqual(room.furniture.map(f => f.kind), ["bench", "bench", "table"]);
  for (const f of room.furniture) {
    assert.ok(f.x >= 0 && f.x + f.width <= ROOM_WIDTH && f.y >= 0 && f.y + f.height <= ROOM_HEIGHT, `${f.kind} dentro da sala`);
    assert.equal(room.collision.canMove(f.x + f.width / 2, f.y + f.height / 2), false, `${f.kind} bloqueia`);
  }
  assert.equal(room.collision.canMove(room.player.x, room.player.y), true); assert.equal(interiorCollision(room.furniture).canMove(ROOM_WIDTH / 2, 70), true);
  room.player.y = ROOM_HEIGHT - 30; assert.equal(room.reachedExit, true); assert.equal(interiorPlace("capital-templo"), "Concórdia");
  assert.equal(spy(c => drawInterior(c, room)).raw.includes("#7d8aa6"), true, "a paleta da capital");
});

test("escolher onde renascer: só com a conversa aberta, ao lado da sacerdotisa, fora de interior e de pé; o recusado não muda nada", () => {
  const w = world();
  const refused = { message: SHRINE_TOO_FAR, changed: false };
  w.goTo(priestess.x + 400, priestess.y); assert.deepEqual(chooseRespawnPoint(w.context(), "capital-temple"), refused, "longe dela");
  w.goTo(priestess.x, priestess.y);
  assert.deepEqual(chooseRespawnPoint(w.context({ menuOpen: false }), "capital-temple"), refused, "conversa fechada"); assert.deepEqual(chooseRespawnPoint(w.context({ inInterior: true }), "capital-temple"), refused, "dentro de um interior");
  w.sim.player.hp = 0; assert.deepEqual(chooseRespawnPoint(w.context(), "capital-temple"), { message: SHRINE_UNAVAILABLE, changed: false }, "caído"); w.sim.player.hp = 50;
  const banker = NPCS.find(n => n.id === "capital-banqueiro")!; w.goTo(banker.x, banker.y);
  assert.deepEqual(chooseRespawnPoint(w.context(), "capital-temple"), refused, "outra NPC não consagra");
  assert.equal(w.sim.respawnPoint, "village", "nada mudou");
});

test("consagrar o Templo, voltar à Vila e escolher o que já está escolhido, cada um com a sua fala", () => {
  const w = world();
  assert.deepEqual(chooseRespawnPoint(w.context(), "village"), { message: shrineAlready("village"), changed: false }, "já renasce na Vila");
  assert.deepEqual(chooseRespawnPoint(w.context(), "capital-temple"), { message: shrineChosen("capital-temple"), changed: true });
  assert.equal(w.sim.respawnPoint, "capital-temple");
  assert.deepEqual(chooseRespawnPoint(w.context(), "capital-temple"), { message: shrineAlready("capital-temple"), changed: false });
  assert.deepEqual(chooseRespawnPoint(w.context(), "village"), { message: shrineChosen("village"), changed: true }); assert.equal(w.sim.respawnPoint, "village");
  assert.equal(shrineAlready("capital-temple"), "O senhor já renasce em Templo da Concórdia."); assert.notEqual(shrineChosen("village"), shrineChosen("capital-temple"));
  w.sim.respawnPoint = "capital-temple"; w.sim.player.hp = 0; w.sim.respawn();
  assert.deepEqual([w.sim.player.x, w.sim.player.y], [RESPAWN_POINTS["capital-temple"].x, RESPAWN_POINTS["capital-temple"].y], "a escolha feita na conversa vale ao cair");
});

test("a fiação do Templo: o jogo liga a escolha e mostra o lugar; a tela e o aviso de derrota seguem o ponto escolhido", () => {
  const game = readFileSync("src/game/Game.ts", "utf8"), page = readFileSync("src/app/game-page.html", "utf8");
  assert.match(game, /this\.hud\.onShrineChoose\(point => this\.shop\(context => chooseRespawnPoint\(context, point\)\)\);/);
  assert.match(game, /this\.hud\.updateRespawnPoint\(this\.sim\.respawnPoint\);/);
  for (const id of ["shrine-temple", "shrine-village", "shrinePlace", "defeatPlace"]) assert.ok(page.includes(`id="${id}"`), id);
  assert.match(page, /hud\.respawnPoint\(\) === 'capital-temple' \? 'Renascer no Templo' : 'Retornar à vila'/, "o botão de derrota diz onde renasce");
  assert.match(page, /Você renasce em \{\{ hud\.respawnPoints\[hud\.respawnPoint\(\)\]\.name \}\} com a vida cheia/);
});
