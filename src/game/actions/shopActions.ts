import type { Player } from "../../actors/Player.ts";
import type { OfflineSimulation } from "../../engine/OfflineSimulation.ts";
import type { FoodId } from "../../engine/character/Food.ts";
import type { GearId, GearSlot } from "../../engine/character/Equipment.ts";
import type { WeaponId } from "../../engine/character/Weapons.ts";
import { FOODS } from "../../engine/character/Food.ts";
import { experienceProgress } from "../../engine/character/Experience.ts";
import { nearestNpc } from "../../world/npcs.ts";
import { INVENTORY_FEEDBACK } from "../messages/inventoryFeedback.ts";

/** Tudo de que uma ação de bolsa ou loja precisa saber sobre o momento do jogo. */
export interface ShopContext {
  readonly sim: OfflineSimulation;
  /** Quem age: na caverna é o herói da caverna; na superfície, o da simulação. */
  readonly hero: Player;
  readonly inInterior: boolean;
  readonly menuOpen: boolean;
  /** O herói da caverna caiu. Só a poção rápida consulta isto. */
  readonly caveHeroDown: boolean;
}

/** `changed` indica que a bolsa mudou: quem chama salva e atualiza o HUD. A mensagem sempre vai ao jogador. */
export interface ShopResult {
  readonly message: string;
  readonly changed: boolean;
}

const say = (outcome: keyof typeof INVENTORY_FEEDBACK, changed = false): ShopResult =>
  ({ message: INVENTORY_FEEDBACK[outcome], changed });
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
  const outcome = sim.inventory.tradeGelForFood(id);
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
