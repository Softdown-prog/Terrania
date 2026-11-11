import { ALCHEMIST_NPC, elixirRecipe, type ElixirId } from "../../../engine/character/south/alchemy/index.ts";
import { nearestNpc } from "../../../world/npcs.ts";
import { INVENTORY_FEEDBACK } from "../../messages/inventoryFeedback.ts";
import { say } from "../say.ts";
import type { ShopContext, ShopResult } from "../shopContext.ts";

/** Preparo na Casa de Venenos (ADR 0030): só com o diálogo aberto, fora de interior e ao lado de Ixtal. */
export function craftElixir({ sim, inInterior, menuOpen }: ShopContext, id: ElixirId): ShopResult {
  if (inInterior || !menuOpen || nearestNpc(sim.player.x, sim.player.y)?.id !== ALCHEMIST_NPC) return say("too-far-from-lab");
  if (sim.awaitingRespawn) return say("unavailable");
  const outcome = sim.inventory.craftElixir(id);
  return outcome === "elixir-crafted"
    ? { message: `Ixtal preparou ${elixirRecipe(id).name}.`, changed: true }
    : say(outcome);
}

/** Beber um elixir da bolsa: vale na superfície e na caverna, como a poção. */
export function drinkElixir({ sim, hero, caveHeroDown }: ShopContext, id: ElixirId): ShopResult {
  if (sim.awaitingRespawn || caveHeroDown) return say("unavailable");
  const outcome = sim.inventory.useElixir(id, hero);
  return outcome === "elixir-used"
    ? { message: `${elixirRecipe(id).name}: ${INVENTORY_FEEDBACK["elixir-used"]}`, changed: true }
    : say(outcome);
}
