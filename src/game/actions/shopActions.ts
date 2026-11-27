import type { OfflineSimulation } from "../../engine/OfflineSimulation.ts";
import type { FoodId } from "../../engine/character/Food.ts";
import type { GearId, GearSlot } from "../../engine/character/Equipment.ts";
import type { WeaponId } from "../../engine/character/Weapons.ts";
import { FOODS } from "../../engine/character/Food.ts";
import { experienceProgress } from "../../engine/character/Experience.ts";
import { HEAL_GLOW_SECONDS } from "../../actors/Player.ts";
import { nearestNpc } from "../../world/npcs.ts";
import { INNKEEPER_ID, MAGE_MASTER_ID } from "../../npcs/center/capital/index.ts";
import { MARKET_NPC, describeCoins, type MarketId } from "../../engine/character/coins/index.ts";
import { INVENTORY_FEEDBACK, ateManaMessage } from "../messages/inventoryFeedback.ts";
import { CAPITAL_INN_RESTED } from "../messages/capitalInn.ts";
import { heroClassSheet } from "../../engine/character/classes/index.ts";
import { NO_STAVES_MESSAGE, NO_SWORDS_MESSAGE } from "../messages/classRules.ts";
import type { StaffId } from "../../engine/character/Staves.ts";
import { say } from "./say.ts";
import type { ShopContext, ShopResult } from "./shopContext.ts";
export type { ShopContext, ShopResult } from "./shopContext.ts";

const nearMadame = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === "south-madame";
const nearBrigida = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === INNKEEPER_ID;
const nearMageMaster = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === MAGE_MASTER_ID;
const nearLina = (sim: OfflineSimulation): boolean => nearestNpc(sim.player.x, sim.player.y)?.id === "lina";

export function usePotion({ sim, hero, caveHeroDown, effectsEnabled = true }: ShopContext): ShopResult {
  if (sim.awaitingRespawn || caveHeroDown) return say("unavailable");
  if (!sim.inventory.usePotion(hero)) return say(hero.hp >= hero.maxHp ? "full-health" : "no-potion");
  if (effectsEnabled) hero.healGlow = HEAL_GLOW_SECONDS; // o herói brilha ao se curar (ADR 0098)
  return say("healed", true);
}

export function tradeGelForPotion({ sim, inInterior, menuOpen }: ShopContext): ShopResult {
  if (inInterior || !menuOpen) return say("too-far");
  if (sim.player.hp <= 0) return say("unavailable");
  if (!nearLina(sim)) return say("too-far");
  const result = sim.inventory.tradeGelForPotion();
  return say(result, result === "traded");
}

/**
 * Descanso pago, com o diálogo aberto e ao lado de quem o vende: Madame Víbora, na Hospedaria Sombra do Escorpião (Poço Negro), ou
 * Dona Brígida, na Hospedaria dos Viajantes (capital, ADR 0062). O preço e o efeito são os mesmos; só a fala muda.
 */
export function restAtInn({ sim, hero, inInterior, menuOpen }: ShopContext): ShopResult {
  const capital = nearBrigida(sim);
  if (inInterior || !menuOpen || !(capital || nearMadame(sim))) return say("too-far-from-inn");
  if (sim.awaitingRespawn || hero.hp <= 0) return say("unavailable");
  const result = sim.inventory.restAtInn(hero);
  const rested = result === "rested";
  return capital && rested ? { message: CAPITAL_INN_RESTED, changed: true } : say(result, rested);
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

export function eatFood({ sim }: ShopContext, id: FoodId): ShopResult {
  if (sim.awaitingRespawn) return say("unavailable");
  const { outcome, mana } = sim.eatFood(id);
  if (outcome !== "ate") return say(outcome);
  // Quem usa mana também recupera mana na hora; o texto diz quanto (ADR 0085).
  return { message: `${FOODS[id].name}: ${mana > 0 ? ateManaMessage(mana) : INVENTORY_FEEDBACK.ate}`, changed: true };
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
  if (!heroClassSheet(sim.heroClass).usesSwords) return { message: NO_SWORDS_MESSAGE, changed: false };
  if (inInterior || !menuOpen) return say("too-far-from-forge");
  const result = sim.inventory.buyForgeSword(sim.player);
  return say(result, result === "purchased");
}

export function equipWeapon({ sim }: ShopContext, weapon: WeaponId): ShopResult {
  if (!heroClassSheet(sim.heroClass).usesSwords) return { message: NO_SWORDS_MESSAGE, changed: false };
  if (sim.awaitingRespawn) return say("unavailable");
  const result = sim.inventory.equipWeapon(weapon, experienceProgress(sim.experience).level);
  return say(result, result === "equipped");
}

/** Compra um cajado da mestra da Academia Arcana (ADR 0074): só o Mago, fora das casas, com o menu aberto e perto dela; o preço e a posse são da bolsa. */
export function buyStaff({ sim, inInterior, menuOpen }: ShopContext, staff: StaffId): ShopResult {
  if (heroClassSheet(sim.heroClass).usesSwords) return { message: NO_STAVES_MESSAGE, changed: false };
  if (inInterior || !menuOpen || !nearMageMaster(sim)) return say("staff-too-far");
  const result = sim.inventory.buyStaff(staff, sim.player);
  return say(result, result === "staff-purchased");
}

/** Troca o cajado em mãos (ADR 0073): só o Mago usa cajado; precisa do nível dele e, se é vendido, de tê-lo comprado. */
export function equipStaff({ sim }: ShopContext, staff: StaffId): ShopResult {
  if (heroClassSheet(sim.heroClass).usesSwords) return { message: NO_STAVES_MESSAGE, changed: false };
  if (sim.awaitingRespawn) return say("unavailable");
  const result = sim.inventory.equipStaff(staff, experienceProgress(sim.experience).level);
  return say(result, result === "staff-equipped");
}

export function equipGear({ sim }: ShopContext, slot: GearSlot, item: GearId | null): ShopResult {
  if (sim.awaitingRespawn) return say("unavailable");
  const result = sim.inventory.equipGear(slot, item, experienceProgress(sim.experience).level);
  return say(result, result === "gear-equipped" || result === "gear-removed");
}
