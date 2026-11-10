import test from "node:test";
import assert from "node:assert/strict";
import { MOUNTS } from "../src/actors/MountCatalog.ts";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { runMountAction } from "../src/engine/mounts/MountActions.ts";
import { MountStable, STABLE_MASTER, normalizeMountSave } from "../src/engine/mounts/MountStable.ts";
import { SOUTH_MOUNT_SALES } from "../src/engine/mounts/southMountSales.ts";
import { SOUTH_STABLE } from "../src/world/mountLocations.ts";
import { NPCS } from "../src/world/npcs.ts";
import { MOUNT_MESSAGES } from "../src/game/messages/mountMessages.ts";
import { npcOffer } from "../src/game/interactions.ts";

/**
 * Montarias do deserto no cercado do Domador Rukh, no Poço Negro (ADR 0028): quem vende, por quanto,
 * o que a compra exige e onde se monta.
 */
const BEETLE = SOUTH_MOUNT_SALES.find(s => s.id === "cargo-beetle")!;
const LIZARD = SOUTH_MOUNT_SALES.find(s => s.id === "sand-basilisk")!;
const spender = (initial: number) => { const wallet = { coins: initial, calls: 0 };
  return { wallet, spend: (n: number): boolean => { wallet.calls++; if (wallet.coins < n) return false; wallet.coins -= n; return true; } }; };

test("o cercado do Rukh fica onde ele está e vende as duas montarias do Sul", () => {
  const rukh = NPCS.find(npc => npc.id === "south-rukh")!;
  assert.deepEqual(SOUTH_STABLE, { x: rukh.x, y: rukh.y });
  assert.deepEqual(SOUTH_MOUNT_SALES.map(s => s.id), ["cargo-beetle", "sand-basilisk"]);
  for (const sale of SOUTH_MOUNT_SALES) {
    assert.equal(MOUNTS[sale.id].region, "south");
    assert.ok(Number.isSafeInteger(sale.price) && sale.price >= 100);
  }
  assert.ok(LIZARD.price > BEETLE.price, "a montaria de tier 2 custa mais");
  assert.equal(MOUNTS["cargo-beetle"].tier, 1);
  assert.equal(MOUNTS["sand-basilisk"].tier, 2);
  assert.deepEqual(npcOffer("south-rukh"), { item: "desert-stable", price: 0 });
});

test("comprar exige estar no cercado, o nível e as moedas, e só leva o que o Rukh vende", () => {
  const stable = new MountStable();
  const { x, y } = SOUTH_STABLE;
  const { wallet, spend } = spender(5_000);
  assert.equal(stable.buy("cargo-beetle", 99, wallet.coins, spend, STABLE_MASTER.x, STABLE_MASTER.y), "too-far", "o estábulo da Travessia não vende");
  assert.equal(stable.buy("warhorse", 99, wallet.coins, spend, x, y), "unavailable", "o Rukh não vende o cavalo");
  assert.equal(stable.buy("cargo-beetle", 29, wallet.coins, spend, x, y), "no-level");
  assert.equal(stable.buy("sand-basilisk", 39, wallet.coins, spend, x, y), "no-level");
  assert.equal(wallet.calls, 0, "nenhuma recusa chegou a cobrar");
  const poor = spender(BEETLE.price - 1);
  assert.equal(stable.buy("cargo-beetle", 30, poor.wallet.coins, poor.spend, x, y), "no-coins");
  assert.equal(poor.wallet.coins, BEETLE.price - 1, "sem dinheiro nada muda");
  assert.equal(stable.has("cargo-beetle"), false);
  assert.equal(stable.buy("cargo-beetle", 30, wallet.coins, spend, x, y), "bought");
  assert.equal(wallet.coins, 5_000 - BEETLE.price);
  assert.equal(stable.has("cargo-beetle"), true);
  assert.equal(stable.buy("cargo-beetle", 30, wallet.coins, spend, x, y), "already-owned");
  assert.equal(wallet.coins, 5_000 - BEETLE.price, "comprar duas vezes não cobra de novo");
});

test("a montaria comprada já vem selada, e só se monta com nível, cercado e Cavalaria, em qualquer um dos dois cercados", () => {
  const { x, y } = SOUTH_STABLE;
  const { wallet, spend } = spender(5_000);
  const stable = new MountStable({ stableTier: 1, ridingTier: 1 });
  assert.equal(stable.buy("cargo-beetle", 30, wallet.coins, spend, x, y), "bought");
  assert.ok(stable.snapshot().saddled?.includes("cargo-beetle"), "já vem com a sela");
  assert.equal(stable.mount("cargo-beetle", 29, x, y), "no-level");
  assert.equal(stable.mount("cargo-beetle", 30, 0, 0), "too-far", "longe dos dois cercados");
  assert.equal(stable.mount("cargo-beetle", 30, x, y), "mounted", "monta no cercado do Rukh");
  assert.equal(stable.active, "cargo-beetle");
  assert.ok(stable.speedMultiplier() > 1.19, "o bônus de velocidade da ficha vale");
  stable.dismount();
  assert.equal(stable.mount("cargo-beetle", 30, STABLE_MASTER.x, STABLE_MASTER.y), "mounted", "e continua montando no de Eron");
  stable.dismount();
  const untrained = new MountStable();
  untrained.buy("cargo-beetle", 30, wallet.coins, spend, x, y);
  assert.equal(untrained.mount("cargo-beetle", 30, x, y), "no-training", "sem cercado e Cavalaria não monta");
  const tier2 = new MountStable({ stableTier: 1, ridingTier: 1 });
  tier2.buy("sand-basilisk", 40, wallet.coins, spend, x, y);
  assert.equal(tier2.mount("sand-basilisk", 40, x, y), "no-training", "o lagarto exige Cavalaria II");
  const ready = new MountStable({ stableTier: 2, ridingTier: 2 });
  ready.buy("sand-basilisk", 40, wallet.coins, spend, x, y);
  assert.equal(ready.mount("sand-basilisk", 40, x, y), "mounted");
});

test("pelo motor: comprar paga em moedas, salva, e as montarias vão e voltam do save", () => {
  const sim = new OfflineSimulation(842136);
  sim.experience = experienceForLevel(40);
  sim.player.x = SOUTH_STABLE.x; sim.player.y = SOUTH_STABLE.y;
  sim.inventory.addCoins(LIZARD.price);
  for (let i = 0; i < 50; i++) sim.inventory.addGel();
  assert.deepEqual(runMountAction(sim, "buy:cargo-beetle"), { result: "bought", persist: true, stopMovement: false });
  assert.equal(sim.inventory.coins, LIZARD.price - BEETLE.price);
  assert.equal(sim.inventory.gel, 50, "o gel não paga montaria");
  assert.deepEqual(runMountAction(sim, "buy:sand-basilisk"), { result: "no-coins", persist: false, stopMovement: false });
  assert.equal(runMountAction(sim, "buy:inexistente" as never).result, "unavailable");
  assert.equal(runMountAction(sim, "mount:inexistente" as never).result, "unavailable");
  const saved = JSON.parse(JSON.stringify(normalizeMountSave(sim.mounts.snapshot())));
  assert.deepEqual(saved.owned, ["cargo-beetle"]);
  assert.deepEqual(saved.saddled, ["cargo-beetle"]);
  assert.equal(new MountStable(saved).has("cargo-beetle"), true);
  assert.equal(MOUNT_MESSAGES.bought.includes("Rukh"), true);
});
