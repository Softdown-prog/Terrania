import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation, type OfflineSave } from "../src/engine/OfflineSimulation.ts";
import { MAX_EXPERIENCE } from "../src/engine/character/Experience.ts";
import { BOSS_CROWN_CHANCE, MAX_COINS, coinBreakdown, rollCoinDrop } from "../src/engine/character/coins/index.ts";
import { normalizeDrops, PICKUP_DISTANCE } from "../src/engine/character/loot.ts";
import { applyCaveVictories } from "../src/engine/rooms/CaveRewards.ts";
import { CREATURE_CATALOG } from "../src/actors/CreatureCatalog.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { coinDropTier } from "../src/render/coinDrop.ts";

/**
 * Moedas que as criaturas deixam (ADR 0024): quanto, onde caem, como se recolhem e se salvam.
 */
const SEED = 842136;
const STILL = { x: 0, y: 0 };
const TICK = 1 / 60;
const saveOf = (over: Partial<OfflineSave> = {}): OfflineSave => ({ seed: SEED, x: 16, y: 16, hp: 100, kills: 0, defeated: [],
  experience: MAX_EXPERIENCE, inventory: { gel: 0, potion: 0, questRewardClaimed: false }, ...over });

/** Derrota a criatura `mob` (hp 1) com um golpe à frente do herói e devolve a simulação. */
function defeat(mob: Slime, over: Partial<OfflineSave> = {}): OfflineSimulation {
  const sim = new OfflineSimulation(SEED, saveOf(over));
  sim.update(TICK, STILL, false, null);
  sim.slimes.clear();
  mob.x = sim.player.x + 30; mob.y = sim.player.y;
  mob.hp = 1;
  sim.slimes.set(mob.id, mob);
  sim.player.faceX = 1; sim.player.faceY = 0;
  sim.update(TICK, STILL, true, mob.id);
  for (let i = 0; i < 30 && !sim.defeated.has(mob.id); i++) sim.update(TICK, STILL, false, mob.id);
  return sim;
}

test("a quantia depende da espécie, é sempre a mesma para a mesma criatura e fica dentro das faixas", () => {
  for (const kind of ["slime", "dune-scout", "basalt-golem", "tundra-mammoth"] as const) {
    const xp = CREATURE_CATALOG[kind].experience;
    for (let i = 0; i < 200; i++) {
      const amount = rollCoinDrop(kind, "criatura-" + i);
      assert.equal(amount, rollCoinDrop(kind, "criatura-" + i), "determinística");
      assert.ok(Number.isSafeInteger(amount) && amount >= Math.max(1, Math.round(xp * .25)) && amount <= Math.round(xp * .75),
        `${kind} #${i}: ${amount}`);
    }
  }
  const strong = rollCoinDrop("basalt-golem", "x"), weak = rollCoinDrop("slime", "x");
  assert.ok(strong > weak * 4, "a criatura forte deixa bem mais que a fraca");
  assert.notEqual(new Set(Array.from({ length: 50 }, (_, i) => rollCoinDrop("dune-scout", "id" + i))).size, 1, "varia entre criaturas");
});

test("o chefe deixa um baú: pelo menos 4 vezes a experiência a mais, e raramente uma Eclipse Crown", () => {
  let crowns = 0;
  const trials = 4000;
  for (let i = 0; i < trials; i++) {
    const id = `cave:${i}:floor:3:boss`;
    const plain = rollCoinDrop("carrion-sandworm", id), boss = rollCoinDrop("carrion-sandworm", id, { boss: true });
    const xp = CREATURE_CATALOG["carrion-sandworm"].experience;
    assert.ok(boss - plain >= xp * 4 - 1, "baú de chefe: " + (boss - plain));
    if (boss >= 10_000) crowns++;
    assert.ok(boss <= MAX_COINS);
  }
  assert.ok(crowns / trials > BOSS_CROWN_CHANCE / 3 && crowns / trials < BOSS_CROWN_CHANCE * 3, "coroa rara: " + crowns);
  const chest = rollCoinDrop("carrion-sandworm", "baú-comum", { boss: true });
  assert.ok(chest < 10_000 && coinBreakdown(chest).some(c => c.id === "cripta-coin" && c.count > 0), "um baú comum já mostra Cripta Coin: " + chest);
});

test("o desenho do montinho é a maior moeda que o valor forma", () => {
  assert.equal(coinDropTier(1), "terrania-gold");
  assert.equal(coinDropTier(99), "terrania-gold");
  assert.equal(coinDropTier(100), "cripta-coin");
  assert.equal(coinDropTier(9_999), "cripta-coin");
  assert.equal(coinDropTier(10_000), "eclipse-crown");
});

test("moedas no chão vão e voltam do save e dados sujos são descartados", () => {
  const valid = [{ id: "a", item: "gel", x: 1, y: 2 }, { id: "a:coin", item: "coin", x: 3, y: 4, amount: 7 }];
  assert.deepEqual(normalizeDrops(valid), valid);
  for (const amount of [0, -1, 1.5, "7", null, undefined, NaN, MAX_COINS + 1, 2 ** 60])
    assert.deepEqual(normalizeDrops([{ id: "c", item: "coin", x: 0, y: 0, amount }]), [], "amount " + String(amount));
  assert.deepEqual(normalizeDrops([{ id: "g", item: "gem", x: 0, y: 0 }]), [], "item desconhecido");
  assert.deepEqual(normalizeDrops([{ id: "g", item: "gel", x: 0, y: 0, amount: 5 }]), [{ id: "g", item: "gel", x: 0, y: 0 }],
    "gel não carrega quantia");
  assert.equal(normalizeDrops([{ id: "d", item: "coin", x: 0, y: 0, amount: 5 }, { id: "d", item: "coin", x: 1, y: 1, amount: 9 }]).length, 1, "id repetido");
});

test("derrotar um slime deixa gel e moedas no chão, e andar até lá recolhe os dois", () => {
  const sim = defeat(new Slime("slime-moeda", 0, 0));
  const gel = sim.drops.get("slime-moeda"), coin = sim.drops.get("slime-moeda:coin");
  assert.equal(gel?.item, "gel");
  assert.equal(coin?.item, "coin");
  const expected = rollCoinDrop("slime", "slime-moeda");
  assert.equal(coin?.item === "coin" ? coin.amount : -1, expected, "a quantia é a da criatura");
  assert.equal(sim.inventory.coins, 0, "ainda não foi recolhida");
  sim.player.x = coin!.x; sim.player.y = coin!.y;
  assert.ok(Math.hypot(sim.player.x - coin!.x, sim.player.y - coin!.y) <= PICKUP_DISTANCE);
  sim.update(TICK, STILL, false, null);
  assert.equal(sim.inventory.coins, expected, "as moedas entraram na carteira");
  assert.equal(sim.inventory.gel, 1, "o gel também");
  assert.equal(sim.drops.size, 0, "nada sobrou no chão");
});

test("criatura regional deixa só moedas (sem gel) e longe do herói a moeda fica esperando", () => {
  const sim = defeat(new RegionalMonster("escaravelho-moeda", "solar-scarab", 0, 0));
  assert.equal(sim.drops.has("escaravelho-moeda"), false, "só slime deixa gel");
  const coin = sim.drops.get("escaravelho-moeda:coin");
  assert.equal(coin?.item, "coin");
  sim.player.x = coin!.x + 400; sim.player.y = coin!.y;
  sim.update(TICK, STILL, false, null);
  assert.equal(sim.inventory.coins, 0);
  assert.equal(sim.drops.has("escaravelho-moeda:coin"), true, "longe demais para recolher");
});

test("a moeda no chão sobrevive ao salvar e recarregar, e só se for de uma criatura já derrotada", () => {
  const sim = defeat(new Slime("slime-salva", 0, 0));
  const snapshot = JSON.parse(JSON.stringify(sim.snapshot())) as OfflineSave;
  const loaded = new OfflineSimulation(SEED, snapshot);
  assert.deepEqual(loaded.drops.get("slime-salva:coin"), sim.drops.get("slime-salva:coin"));
  assert.ok(loaded.drops.has("slime-salva"));
  const orphan = new OfflineSimulation(SEED, { ...snapshot, defeated: [] });
  assert.equal(orphan.drops.size, 0, "sem a criatura na lista de derrotadas, o item é descartado");
});

test("carteira cheia: a moeda recolhe só o que cabe e o resto continua no chão", () => {
  const sim = defeat(new Slime("slime-cheia", 0, 0), {
    inventory: { gel: 0, potion: 0, questRewardClaimed: false, coins: MAX_COINS - 1 } });
  const coin = sim.drops.get("slime-cheia:coin");
  assert.equal(coin?.item, "coin");
  const amount = coin?.item === "coin" ? coin.amount : 0;
  assert.ok(amount > 1);
  sim.player.x = coin!.x; sim.player.y = coin!.y;
  sim.update(TICK, STILL, false, null);
  assert.equal(sim.inventory.coins, MAX_COINS, "encheu a carteira");
  const left = sim.drops.get("slime-cheia:coin");
  assert.equal(left?.item === "coin" ? left.amount : -1, amount - 1, "o resto ficou no chão");
  sim.update(TICK, STILL, false, null);
  assert.equal(sim.drops.get("slime-cheia:coin")?.item === "coin", true, "carteira cheia não recolhe mais");
});

test("na masmorra o dinheiro vai direto para a bolsa e o chefe deixa o baú", () => {
  const sim = new OfflineSimulation(SEED, saveOf());
  const hero = { hp: 100, maxHp: 100 };
  const regular = { kind: "dune-scorpion" as const, id: `cave:${SEED}:1:2:floor:1:mob:3` };
  const boss = { kind: "carrion-sandworm" as const, id: `cave:${SEED}:1:2:floor:3:boss` };
  assert.equal(applyCaveVictories(sim, { drainVictories: () => [regular], player: hero }), true);
  assert.equal(sim.inventory.coins, rollCoinDrop(regular.kind, regular.id));
  const before = sim.inventory.coins;
  applyCaveVictories(sim, { drainVictories: () => [boss], player: hero });
  assert.equal(sim.inventory.coins - before, rollCoinDrop(boss.kind, boss.id, { boss: true }));
  const again = sim.inventory.coins;
  applyCaveVictories(sim, { drainVictories: () => [boss], player: hero });
  assert.equal(sim.inventory.coins, again, "cada criatura só premia uma vez");
  // os slimes de treino da gruta de Aela seguem dando só gel
  const training = new OfflineSimulation(SEED, saveOf());
  const slime = { kind: "slime" as const, id: `cave:${SEED}:0:0:floor:1:slime:0` };
  applyCaveVictories(training, { drainVictories: () => [slime], player: hero });
  assert.equal(training.inventory.coins, 0);
  assert.equal(training.inventory.gel, 1);
});
