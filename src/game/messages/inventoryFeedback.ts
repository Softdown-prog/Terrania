import { POTION_GEL_PRICE, POTION_HEAL, type InventoryOutcome } from "../../engine/character/Inventory.ts";
import { FORGE_SWORD_PRICE, WEAPONS } from "../../engine/character/Weapons.ts";

/**
 * Texto mostrado ao jogador para cada resultado da bolsa, da loja e do equipamento.
 * Só dados: nenhuma regra. O tipo `Record<InventoryOutcome, string>` obriga a cobrir todo resultado novo.
 */
export const INVENTORY_FEEDBACK: Record<InventoryOutcome, string> = {
  "healed": `Poção utilizada! Vida restaurada em até ${POTION_HEAL} pontos.`,
  "full-health": "Sua vida já está completa.",
  "no-potion": "Você não possui poções de cura.",
  "ate": "Refeição feita. Sua vida será recuperada gradualmente.",
  "no-food": "Esse alimento acabou na sua bolsa.",
  "eat-cooldown": "Aguarde alguns segundos antes de comer novamente.",
  "nutrition-full": "Você ainda está alimentado. Aguarde a recuperação antes de comer mais.",
  "food-traded": "Lina colocou o alimento na sua bolsa.",
  "food-stack-full": "A pilha desse alimento está cheia.",
  "unavailable": "Retorne à vila para continuar.",
  "too-far": "Aproxime-se de Lina perto da hospedaria para trocar.",
  "insufficient-gel": `Você precisa de ${POTION_GEL_PRICE} unidades de gel para a troca.`,
  "potions-full": "A pilha de poções está cheia.",
  "traded": "Lina colocou uma poção de cura na sua bolsa.",
  "purchased": `Toren colocou a ${WEAPONS.forge.name} na sua bolsa.`,
  "already-owned": "Você já possui essa espada.",
  "insufficient-sword-gel": `Você precisa de ${FORGE_SWORD_PRICE} unidades de gel para comprar a espada.`,
  "too-far-from-forge": "Aproxime-se de Toren para comprar a espada.",
  "equipped": "Espada equipada.",
  "already-equipped": "Essa espada já está equipada.",
  "level-too-low": "Seu nível ainda não permite equipar essa espada.",
  "not-owned": "Você ainda não possui essa espada.",
  "gear-equipped": "Item equipado.",
  "gear-removed": "Item guardado na bolsa.",
  "gear-unchanged": "O espaço já está assim.",
  "wrong-slot": "Este item pertence a outro espaço.",
};
