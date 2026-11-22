import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { InteriorRoom, ROOM_FURNITURE, ROOM_HEIGHT, ROOM_WIDTH, hasInterior, interiorCollision, interiorPlace } from "../src/engine/rooms/InteriorRoom.ts";
import { bankDeposit, bankOnTalk, bankWithdraw } from "../src/game/actions/center/bankActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { npcOffer } from "../src/game/interactions.ts";
import { BANK_DEPOSIT_TEXT, BANK_TOO_FAR, BANK_UNAVAILABLE, BANK_WITHDRAW_TEXT, bankDeposited, bankGreeting, bankWithdrawn, interestLine } from "../src/game/messages/center/bank.ts";
import { BANKER_ID, CAPITAL_NPCS, CAPITAL_NPC_DIALOGUES, CAPITAL_NPC_LOOKS } from "../src/npcs/center/capital/index.ts";
import { NPCS, NPC_LOOKS, NPC_TALK_RANGE, nearestNpc } from "../src/npcs/catalog.ts";
import { drawInterior } from "../src/render/interior.ts";
import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_DOORS, CAPITAL_PLOTS, capitalBuildingBlocks, capitalGround, capitalInteriorFor, capitalPoint } from "../src/world/center/capital/index.ts";
import { canMoveOnSeed } from "../src/world/collision.ts";
import { describeCoins, MAX_COINS } from "../src/engine/character/coins/index.ts";
import { spy } from "./helpers/spyContext.ts";

/**
 * O banco da Casa da Moeda e dos Mercadores (ADR 0063): a porta, o interior, o banqueiro Mestre Aurélio e as operações do balcão
 * (guardar, retirar e a visita que paga os juros).
 */
const SEED = 842136, mint = CAPITAL_BUILDINGS.find(b => b.id === "casa-da-moeda")!, door = CAPITAL_DOORS.find(d => d.id === "capital-casa-da-moeda")!;
const banker = CAPITAL_NPCS.find(n => n.id === BANKER_ID)!;
/** Um mundo no instante `time` (segundos de jogo) com `coins` na carteira e `balance` no banco (juros pagos até `interestAt`). */
function world({ coins = 0, balance = 0, interestAt = 0, time = 0 } = {}) {
  const base = new OfflineSimulation(SEED).snapshot();
  const sim = new OfflineSimulation(SEED, { ...base, time, ...(balance > 0 ? { bank: { balance, interestAt } } : {}) });
  sim.inventory.addCoins(coins);
  const context = (extra: Partial<ShopContext> = {}): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false, ...extra });
  const goTo = (x: number, y: number) => { sim.player.x = x; sim.player.y = y; };
  goTo(banker.x, banker.y);
  return { sim, context, goTo };
}

test("a porta da Casa da Moeda: abre, fica 29 px à frente do edifício, na rua e livre, e o banco tem sala", () => {
  assert.deepEqual({ ...door }, { id: "capital-casa-da-moeda", name: "Casa da Moeda e dos Mercadores", x: mint.x, y: mint.y + 29 });
  assert.equal(canMoveOnSeed(door.x, door.y, SEED), true); assert.equal(capitalBuildingBlocks(door.x, door.y, 7), false);
  assert.equal(CAPITAL_PLOTS.find(p => p.id === "casa-da-moeda")!.door, "s");
  assert.deepEqual(capitalInteriorFor("capital-casa-da-moeda"), { id: "capital-casa-da-moeda", name: "Casa da Moeda e dos Mercadores", variant: 0 });
  assert.equal(hasInterior("capital-casa-da-moeda"), true); assert.equal(hasInterior("casa-da-moeda"), false);
  assert.equal(nearestNpc(door.x, door.y)?.id, "capital-casa-da-moeda", "de frente para a porta, E entra");
  assert.equal(nearestNpc(door.x + 25, door.y)?.id, "capital-casa-da-moeda"); assert.notEqual(nearestNpc(door.x + 26, door.y)?.id, "capital-casa-da-moeda");
});

test("a sala do banco: duas estantes e o balcão, mobília que bloqueia, saída de baixo e o lugar certo no painel", () => {
  const room = new InteriorRoom("capital-casa-da-moeda");
  assert.equal(room.building.name, "Casa da Moeda e dos Mercadores"); assert.equal(room.furniture, ROOM_FURNITURE["capital-casa-da-moeda"]);
  assert.deepEqual(room.furniture.map(f => f.kind), ["shelf", "shelf", "table"]);
  for (const f of room.furniture) {
    assert.ok(f.x >= 0 && f.x + f.width <= ROOM_WIDTH && f.y >= 0 && f.y + f.height <= ROOM_HEIGHT, `${f.kind} dentro da sala`);
    assert.equal(room.collision.canMove(f.x + f.width / 2, f.y + f.height / 2), false, `${f.kind} bloqueia`);
  }
  assert.equal(room.collision.canMove(room.player.x, room.player.y), true, "nasce na porta, em chão livre");
  assert.equal(interiorCollision(room.furniture).canMove(ROOM_WIDTH / 2, 70), true, "o corredor de trás do balcão está livre");
  assert.equal(room.reachedExit, false); room.player.y = ROOM_HEIGHT - 30; assert.equal(room.reachedExit, true);
  assert.equal(interiorPlace("capital-casa-da-moeda"), "Concórdia");
  assert.equal(spy(c => drawInterior(c, room)).raw.includes("#7d8aa6"), true, "a paleta da capital");
});

test("Mestre Aurélio: o banqueiro está na rua, ao lado da porta, em chão livre, com ficha, fala e a oferta do banco", () => {
  assert.deepEqual({ id: banker.id, kind: banker.kind, name: banker.name, role: banker.role }, { id: BANKER_ID, kind: "character", name: "Mestre Aurélio", role: "Banqueiro" });
  assert.deepEqual([banker.x, banker.y], [capitalPoint(19, -1).x, capitalPoint(19, -1).y]);
  assert.equal(canMoveOnSeed(banker.x, banker.y, SEED), true, "em chão livre"); assert.equal(capitalBuildingBlocks(banker.x, banker.y, 7), false);
  assert.equal(capitalGround(CAPITAL.centerX + 19, CAPITAL.centerY - 1), "path", "na rua");
  assert.ok(Math.hypot(banker.x - door.x, banker.y - door.y) <= NPC_TALK_RANGE, "de onde se vê a porta, dá para falar com ele");
  assert.equal(NPCS.filter(n => n.id === BANKER_ID).length, 1); assert.strictEqual(NPC_LOOKS[BANKER_ID], CAPITAL_NPC_LOOKS[BANKER_ID]);
  assert.equal(NPC_LOOKS[BANKER_ID]!.prop, "scales", "a balança do banqueiro");
  assert.equal(CAPITAL_NPC_DIALOGUES[BANKER_ID]!.length, 3); assert.match(CAPITAL_NPC_DIALOGUES[BANKER_ID]!.join(" "), /meio por cento a cada dez minutos/);
  assert.deepEqual(npcOffer(BANKER_ID), { item: "bank", price: 0 });
  assert.equal(nearestNpc(banker.x, banker.y)?.id, BANKER_ID, "no ponto dele, é ele quem responde ao E");
});

test("guardar e retirar: só com a conversa aberta, ao lado do banqueiro, fora de interior e com o herói de pé; o recusado não mexe em nada", () => {
  const w = world({ coins: 500 });
  const refused = { message: BANK_TOO_FAR, changed: false };
  w.goTo(banker.x + 400, banker.y); assert.deepEqual(bankDeposit(w.context(), 100), refused, "longe dele"); assert.deepEqual(bankWithdraw(w.context(), 100), refused);
  w.goTo(banker.x, banker.y);
  assert.deepEqual(bankDeposit(w.context({ menuOpen: false }), 100), refused, "conversa fechada"); assert.deepEqual(bankDeposit(w.context({ inInterior: true }), 100), refused, "dentro de um interior");
  w.sim.player.hp = 0; assert.deepEqual(bankDeposit(w.context(), 100), { message: BANK_UNAVAILABLE, changed: false }, "caído"); w.sim.player.hp = 50;
  assert.deepEqual([w.sim.inventory.coins, w.sim.bank.balance], [500, 0], "as recusas não mexeram em nada");
  const madame = NPCS.find(n => n.id === "south-madame")!; w.goTo(madame.x, madame.y);
  assert.deepEqual(bankDeposit(w.context(), 100), refused, "outro NPC não é banqueiro");
});

test("guardar: devolve a fala com o saldo, muda a bolsa e o banco, e \"tudo\" guarda tudo", () => {
  const w = world({ coins: 1_250 });
  assert.deepEqual(bankDeposit(w.context(), 100), { message: bankDeposited(100, 100), changed: true });
  assert.equal(bankDeposited(100, 100), `Mestre Aurélio guardou ${describeCoins(100)}. Saldo na conta: ${describeCoins(100)}.`);
  assert.deepEqual([w.sim.inventory.coins, w.sim.bank.balance], [1_150, 100]);
  assert.deepEqual(bankDeposit(w.context(), "all"), { message: bankDeposited(1_150, 1_250), changed: true });
  assert.deepEqual([w.sim.inventory.coins, w.sim.bank.balance], [0, 1_250]);
  assert.deepEqual(bankDeposit(w.context(), "all"), { message: BANK_DEPOSIT_TEXT["nothing-to-deposit"], changed: false }, "sem moedas, nada muda e não salva");
  assert.deepEqual(bankDeposit(w.context(), 100), { message: BANK_DEPOSIT_TEXT["nothing-to-deposit"], changed: false });
  const full = world({ coins: 5, balance: MAX_COINS });
  assert.deepEqual(bankDeposit(full.context(), 5), { message: BANK_DEPOSIT_TEXT["bank-full"], changed: false });
});

test("retirar: devolve a fala com o saldo que ficou, e \"tudo\" esvazia a conta", () => {
  const w = world({ balance: 1_250 });
  assert.deepEqual(bankWithdraw(w.context(), 1_000), { message: bankWithdrawn(1_000, 250), changed: true });
  assert.equal(bankWithdrawn(1_000, 250), `Mestre Aurélio entregou ${describeCoins(1_000)}. Saldo na conta: ${describeCoins(250)}.`);
  assert.deepEqual([w.sim.inventory.coins, w.sim.bank.balance], [1_000, 250]);
  assert.deepEqual(bankWithdraw(w.context(), "all"), { message: bankWithdrawn(250, 0), changed: true });
  assert.deepEqual([w.sim.inventory.coins, w.sim.bank.balance], [1_250, 0]);
  assert.deepEqual(bankWithdraw(w.context(), "all"), { message: BANK_WITHDRAW_TEXT["nothing-to-withdraw"], changed: false });
  const full = world({ coins: MAX_COINS, balance: 10 });
  assert.deepEqual(bankWithdraw(full.context(), 10), { message: BANK_WITHDRAW_TEXT["wallet-full"], changed: false }); assert.equal(full.sim.bank.balance, 10);
});

test("os juros chegam na operação e na conversa: pagos antes, avisados na fala, e só uma vez por período", () => {
  const w = world({ coins: 100, balance: 2_000, interestAt: 0, time: 1_200 }); // dois períodos de 0,5% sobre 2.000 = 20
  assert.deepEqual(bankDeposit(w.context(), 100), { message: interestLine(20) + bankDeposited(100, 2_120), changed: true });
  assert.equal(interestLine(20), `Juros pagos: ${describeCoins(20)}. `); assert.equal(interestLine(0), "");
  assert.equal(w.sim.bank.balance, 2_120);
  // retirar sem nada a retirar ainda paga e salva os juros devidos
  const late = world({ balance: 1_000, interestAt: 0, time: 600 });
  assert.deepEqual(bankWithdraw(late.context(), 0), { message: interestLine(5) + BANK_WITHDRAW_TEXT["nothing-to-withdraw"], changed: true }, "juros pagos mudam o save mesmo sem saque");
  assert.equal(late.sim.bank.balance, 1_005);
  // a conversa: paga os juros e devolve a linha extra; sem saldo e sem juros, nenhuma linha
  const talk = world({ balance: 1_000, interestAt: 0, time: 600 });
  assert.deepEqual(bankOnTalk(talk.sim), { line: bankGreeting(5, 1_005), changed: true });
  assert.equal(bankGreeting(5, 1_005), `Juros pagos: ${describeCoins(5)}. Saldo na conta: ${describeCoins(1_005)}.`);
  assert.deepEqual(bankOnTalk(talk.sim), { line: bankGreeting(0, 1_005), changed: false }, "falar de novo no mesmo instante não paga de novo, e só mostra o saldo");
  assert.equal(bankGreeting(0, 1_005), `Saldo na conta: ${describeCoins(1_005)}.`);
  assert.deepEqual(bankOnTalk(world().sim), { line: null, changed: false }, "quem nunca usou o banco não vê linha nenhuma");
  const broke = world({ balance: 10, interestAt: 0, time: 600 }); // 10 × 5 / 1000 = 0 de juros
  assert.deepEqual(bankOnTalk(broke.sim), { line: bankGreeting(0, 10), changed: false });
});

test("a fiação do banco: o jogo liga as ações, abre a conversa pelo banqueiro e mostra o saldo; a tela tem os botões", () => {
  const game = readFileSync("src/game/Game.ts", "utf8"), page = readFileSync("src/app/game-page.html", "utf8");
  assert.match(game, /this\.hud\.onBankDeposit\(amount => this\.shop\(context => bankDeposit\(context, amount\)\)\);/);
  assert.match(game, /this\.hud\.onBankWithdraw\(amount => this\.shop\(context => bankWithdraw\(context, amount\)\)\);/);
  assert.match(game, /const bank = npc\.id === BANKER_ID \? bankOnTalk\(this\.sim\) : null;/);
  assert.match(game, /this\.hud\.updateBank\(this\.sim\.bank\.balance\);/);
  for (const id of ["bank-deposit-all", "bank-withdraw-all", "bankProgress"]) assert.ok(page.includes(`id="${id}"`), id);
  assert.match(page, /\[attr\.id\]="'bank-deposit-' \+ step"/); assert.match(page, /\[attr\.id\]="'bank-withdraw-' \+ step"/);
});
