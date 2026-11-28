import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory } from "../src/engine/character/Inventory.ts";
import { ARROWS, ARROW_IDS, ARROW_PACK, MAX_ARROWS } from "../src/engine/character/Arrows.ts";
import { STARTING_QUIVER, addArrows, arrowRoom, sanitizeQuiver, selectArrow, spendArrows, totalArrows } from "../src/engine/character/Quiver.ts";
import { arrowHitDamage } from "../src/engine/combat/ArrowCombat.ts";
import { INVENTORY_FEEDBACK } from "../src/game/messages/inventoryFeedback.ts";
import { Slime } from "../src/actors/Slime.ts";

/** As flechas do Arqueiro (ADR 0117, lote A3a): a de Ferro, a compra por pacotes, a escolha do tipo em uso e a troca automática quando o tipo acaba. */
const SEED = 842136;
const archer = (coins = 0, quiver?: unknown) => new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins, ...(quiver ? { quiver: quiver as never } : {}) }, 1, "archer");
const q = (reed: number, iron: number, equipped: "reed" | "iron" = "reed") => ({ equipped, counts: { reed, iron } });

test("a flecha de ferro: +3 de dano e 3 de ouro; a de junco: sem dano extra e 1 de ouro; o pacote é de 10", () => {
  assert.deepEqual([...ARROW_IDS], ["reed", "iron"]); assert.equal(ARROW_PACK, 10);
  assert.deepEqual(ARROWS.iron, { name: "Flecha de Ferro", bonusDamage: 3, price: 3 }); assert.equal(ARROWS.reed.price, 1);
  const target = { defense: 0 } as Slime;
  assert.equal(arrowHitDamage("hunting", "reed", target), 8); assert.equal(arrowHitDamage("hunting", "iron", target), 11, "8 do arco mais 3 da ponta de ferro");
  assert.equal(arrowHitDamage("hunting", "iron", { defense: 4 } as Slime), 7); assert.equal(arrowHitDamage("hunting", "iron", target, 50), 17, "o bônus em porcentagem vale sobre o total");
});

test("a aljava com dois tipos: o em uso passa para o que tem flechas quando acaba, e nunca fica numa pilha vazia havendo outra", () => {
  const both = q(1, 5);
  const afterOne = spendArrows(both, 1)!; assert.deepEqual([afterOne.equipped, afterOne.counts.reed, afterOne.counts.iron], ["iron", 0, 5], "o junco acabou: passa para o ferro");
  assert.equal(spendArrows(q(5, 1, "iron"), 1)!.equipped, "reed", "o ferro acabou: volta ao junco");
  assert.equal(spendArrows(q(5, 3), 1)!.equipped, "reed", "com flechas sobrando não troca");
  assert.equal(spendArrows(q(1, 0), 1)!.equipped, "reed", "sem nenhum outro tipo, fica onde está");
  assert.equal(spendArrows(q(0, 4), 1), null, "o tipo em uso vazio não atira (a aljava sempre acerta isso antes)");
  const fromEmpty = addArrows({ equipped: "reed", counts: { reed: 0, iron: 0 } }, "iron", 4);
  assert.deepEqual([fromEmpty.added, fromEmpty.quiver.equipped, fromEmpty.quiver.counts.iron], [4, "iron", 4], "sem flecha nenhuma, o tipo que entrou passa a ser o em uso");
  assert.equal(addArrows(q(3, 0), "iron", 4).quiver.equipped, "reed", "com flechas em uso, o que entra não troca");
  assert.deepEqual(sanitizeQuiver({ equipped: "reed", counts: { reed: 0, iron: 7 } }), q(0, 7, "iron"), "um save com o tipo em uso vazio e outro cheio acerta o em uso");
  assert.deepEqual(sanitizeQuiver({ equipped: "iron", counts: { reed: 3, iron: 0 } }), q(3, 0, "reed"));
  assert.deepEqual(sanitizeQuiver({ equipped: "iron", counts: { reed: 0, iron: 0 } }).equipped, "iron", "aljava vazia mantém o tipo escolhido");
  assert.equal(totalArrows(q(3, 4)), 7); assert.equal(arrowRoom(q(95, 10), "reed"), 4); assert.equal(arrowRoom(q(95, 99), "iron"), 0);
});

test("escolher a flecha em uso: só um tipo de que há flechas; o mesmo tipo é devolvido sem mudança", () => {
  const base = q(5, 5);
  assert.deepEqual(selectArrow(base, "iron"), q(5, 5, "iron")); assert.strictEqual(selectArrow(base, "reed"), base);
  assert.equal(selectArrow(q(5, 0), "iron"), null, "sem flechas desse tipo não troca"); assert.equal(selectArrow(base, "fire" as never), null);
});

test("a compra: um pacote de 10 pelo preço de cada flecha; com a aljava quase cheia, só o que cabe; sem moedas nada muda", () => {
  const bag = archer(100);
  assert.equal(bag.buyArrows("reed", { hp: 50 }), "arrows-bought"); assert.deepEqual([bag.quiver.counts.reed, bag.coins], [40, 90], "10 de junco por 10 de ouro");
  assert.equal(bag.buyArrows("iron", { hp: 50 }), "arrows-bought"); assert.deepEqual([bag.quiver.counts.iron, bag.coins, bag.quiver.equipped], [10, 60, "reed"], "10 de ferro por 30 de ouro; o tipo em uso não troca");
  const near = archer(100, q(95, 0)); assert.equal(near.buyArrows("reed", { hp: 50 }), "arrows-bought"); assert.deepEqual([near.quiver.counts.reed, near.coins], [99, 96], "só 4 couberam e só 4 foram cobradas");
  assert.equal(near.buyArrows("reed", { hp: 50 }), "arrows-quiver-full"); assert.equal(near.coins, 96, "cheia: nada cobrado");
  const poor = archer(9); assert.equal(poor.buyArrows("reed", { hp: 50 }), "arrows-insufficient-coins"); assert.deepEqual([poor.coins, poor.quiver.counts.reed], [9, 30], "faltou 1 de ouro: nada muda");
  const ironPoor = archer(29); assert.equal(ironPoor.buyArrows("iron", { hp: 50 }), "arrows-insufficient-coins"); assert.equal(archer(30).buyArrows("iron", { hp: 50 }), "arrows-bought", "30 de ouro bastam para o pacote de ferro");
  assert.equal(archer(100).buyArrows("reed", { hp: 0 }), "arrows-unavailable", "herói caído não compra");
  assert.equal(archer(100).buyArrows("fire" as never, { hp: 50 }), "arrows-not-archer", "tipo que não existe");
  for (const heroClass of ["knight", "mage"] as const) { const other = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, coins: 100 }, 1, heroClass); assert.equal(other.buyArrows("reed", { hp: 50 }), "arrows-not-archer", heroClass); assert.equal(other.coins, 100); assert.equal(other.equipArrow("reed"), "arrow-not-archer"); }
  const full = archer(100, q(99, 99)); assert.equal(full.buyArrows("iron", { hp: 50 }), "arrows-quiver-full");
});

test("trocar a flecha em uso pela bolsa: troca, já está, não tem; e o save guarda o tipo e as contagens", () => {
  const bag = archer(0, q(5, 5));
  assert.equal(bag.equipArrow("iron"), "arrow-equipped"); assert.equal(bag.quiver.equipped, "iron");
  assert.equal(bag.equipArrow("iron"), "arrow-already-equipped"); assert.equal(archer().equipArrow("iron"), "arrow-none");
  const back = new Inventory(bag.snapshot(), 1, "archer"); assert.deepEqual(back.quiver, q(5, 5, "iron"), "o save volta igual");
  assert.equal(back.spendArrows(1), true); assert.deepEqual(back.quiver.counts, { reed: 5, iron: 4 }, "gasta da em uso");
  for (let i = 0; i < 4; i++) back.spendArrows(1);
  assert.equal(back.quiver.equipped, "reed", "o ferro acabou: a aljava volta ao junco sozinha");
});

test("no mundo: a flecha de ferro ferre mais, e a que está em uso é a que o combate lê (pronta com flechas de qualquer tipo)", () => {
  const sim = new OfflineSimulation(SEED, undefined, "archer");
  assert.equal(sim.inventory.quiver.counts.reed, 30);
  for (let i = 0; i < 30; i++) sim.inventory.spendArrows(1);
  assert.equal(sim.combatProfile.ranged!.ready, false, "sem nenhuma flecha, não está pronto");
  assert.equal(sim.inventory.gainArrows("iron", 3), 3);
  assert.equal(sim.combatProfile.ranged!.ready, true, "com flechas de ferro está pronto, mesmo sem junco");
  assert.equal(sim.inventory.quiver.equipped, "iron");
  assert.equal(STARTING_QUIVER.counts.iron, 0);
});

test("as mensagens da compra e da troca existem (o tipo exige cobrir todo resultado) e dizem o que aconteceu", () => {
  for (const key of ["arrows-bought", "arrows-not-archer", "arrows-quiver-full", "arrows-insufficient-coins", "arrows-too-far", "arrows-unavailable", "arrow-equipped", "arrow-already-equipped", "arrow-none", "arrow-not-archer"] as const)
    assert.ok(INVENTORY_FEEDBACK[key].length > 10, key);
  assert.match(INVENTORY_FEEDBACK["arrows-insufficient-coins"], /junco/); assert.match(INVENTORY_FEEDBACK["arrows-insufficient-coins"], /ferro/);
  assert.match(INVENTORY_FEEDBACK["arrows-too-far"], /Irmandade dos Arqueiros/); assert.equal(MAX_ARROWS, 99);
});
