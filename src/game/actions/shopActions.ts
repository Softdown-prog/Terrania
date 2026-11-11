import type { OfflineSimulation } from "../../engine/OfflineSimulation.ts";
import type { FoodId } from "../../engine/character/Food.ts";
import type { GearId, GearSlot } from "../../engine/character/Equipment.ts";
import type { WeaponId } from "../../engine/character/Weapons.ts";
import { FOODS } from "../../engine/character/Food.ts";
import { experienceProgress } from "../../engine/character/Experience.ts";
import { nearestNpc } from "../../world/npcs.ts";
import { MARKET_NPC, describeCoins, type MarketId } from "../../engine/character/coins/index.ts";
import { INVENTORY_FEEDBACK } from "../messages/inventoryFeedback.ts";
import { say } from "./say.ts";
import type { ShopContext, ShopResult } from "./shopContext.ts";
export type { ShopContext, ShopResult } from "./shopContext.ts";

const nearMadame = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === "south-madame";
const nearLina = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === "lina";

export function usePotion({ sim, hero, caveHeroDown }: ShopContext): ShopResult {
  if (sim.awaitingRespawn || caveHeroDown) return say("unavailable");
  if (!sim.inventory.usePotion(hero)) return say(hero.hp >= hero.maxHp ? "full-health" : "no-potion");
  return say("healed", true);
}

export function tradeGelForPotion({ sim, inInterior, menuOpen }: ShopContext): ShopResult {
  if (inInterior || !menuOpen) return say("too-far");
  if (sim.player.hp <= 0) return say("unavailable");
  if (!nearLina(sim)) return say("too-far");
  const result = sim.inventory.tradeGelForPotion();
  return say(result, result === "traded");
}

/** Descanso pago na Hospedaria Sombra do Escorpião (Poço Negro): só ao lado de Madame Víbora, com o diálogo aberto. */
export function restAtInn({ sim, hero, inInterior, menuOpen }: ShopContext): ShopResult {
  if (inInterior || !menuOpen || !nearMadame(sim)) return say("too-far-from-inn");
  if (sim.awaitingRespawn || hero.hp <= 0) return say("unavailable");
  const result = sim.inventory.restAtInn(hero);
  return say(result, result === "rested");
}

/**
 * Venda de material ao Bazar das Raridades (Zinha) ou ao Ossuário (Marn), no Poço Negro (ADR 0026).
 * Só com o diálogo aberto, fora de interior e ao lado do comprador certo; `quantity` maior que o
 * que o herói tem vende tudo o que ele tem.
 */
export function sellMaterial({ sim, inInterior, menuOpen }: ShopContext, market: MarketId, material: string, quantity: number): ShopResult {
  if (inInterior || !menuOpen || nearestNpc(sim.player.x, sim.player.y)?.id !== MARKET_NPC[market])
    return { message: market === "bazaar" ? "Aproxime-se de Zinha, no Bazar das Raridades, para vender." :
      "Aproxime-se do Coletor Marn, no Ossuário, para vender.", changed: false };
  if (sim.awaitingRespawn) return say("unavailable");
  const sale = sim.inventory.sellMaterial(market, material, quantity);
  return sale.result === "sold"
    ? { message: `Vendeu ${sale.sold} × ${material} por ${describeCoins(sale.coins)}.`, changed: true }
    : say(sale.result);
}

export function eatFood({ sim, hero }: ShopContext, id: FoodId): ShopResult {
  if (sim.awaitingRespawn) return say("unavailable");
  const outcome = sim.inventory.useFood(id, hero);
  return outcome === "ate"
    ? { message: `${FOODS[id].name}: ${INVENTORY_FEEDBACK.ate}`, changed: true }
    : say(outcome);
}

export function buyFood({ sim, inInterior, menuOpen }: ShopContext, id: FoodId): ShopResult {
  if (inInterior || !menuOpen) return say("too-far");
  if (sim.awaitingRespawn) return say("unavailable");
  if (!nearLina(sim)) return say("too-far");
  const outcome = sim.inventory.buyFood(id);
  return outcome === "food-traded"
    ? { message: `Lina entregou ${FOODS[id].name}.`, changed: true }
    : say(outcome);
}

export function buySword({ sim, inInterior, menuOpen }: ShopContext): ShopResult {
  if (inInterior || !menuOpen) return say("too-far-from-forge");
  const result = sim.inventory.buyForgeSword(sim.player);
  return say(result, result === "purchased");
}

export function equipWeapon({ sim }: ShopContext, weapon: WeaponId): ShopResult {
  if (sim.awaitingRespawn) return say("unavailable");
  const result = sim.inventory.equipWeapon(weapon, experienceProgress(sim.experience).level);
  return say(result, result === "equipped");
}

export function equipGear({ sim }: ShopContext, slot: GearSlot, item: GearId | null): ShopResult {
  if (sim.awaitingRespawn) return say("unavailable");
  const result = sim.inventory.equipGear(slot, item);
  return say(result, result === "gear-equipped" || result === "gear-removed");
}
