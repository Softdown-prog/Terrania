import { BANKER_ID, INNKEEPER_ID, MAGE_MASTER_ID, PRIESTESS_ID } from "../npcs/center/capital/index.ts";
import { BREEZE_STAFF } from "../engine/character/weapons/staves/breeze.ts";
import type { MountAction } from "../engine/mounts/MountStable.ts";
import { currentMountQuestStep, type MountQuestProgress } from "../engine/mounts/MountQuestState.ts";
import { FORGE_SWORD_PRICE } from "../engine/character/Weapons.ts";
import { DEFAULT_HERO_CLASS, heroClassSheet, type HeroClassId } from "../engine/character/classes/index.ts";
import { INN_REST_PRICE, POTION_GEL_PRICE } from "../engine/character/Inventory.ts";
import type { Npc } from "../world/npcs.ts";
import { MOUNT_INTERACT_DISTANCE, STABLE_MASTER, WILD_HOOFPRINTS, WILD_WARHORSE } from "../world/mountLocations.ts";
import type { NearbyAction, NpcOffer } from "../ui/GameUi.ts";

/**
 * Decisões puras sobre "o que o jogador pode fazer aqui": sem estado, sem HUD, sem simulação.
 * Antes viviam duplicadas em `talkToNpc` e no fim de `update`; agora há uma única fonte.
 */

/** Rótulo do botão de interação conforme o tipo de NPC próximo. */
const NPC_ACTIONS = { character: "talk", sign: "read", door: "enter" } as const;

/** Identificador do passo atual da missão de montaria, ou `null` se não há missão ativa. */
export function questStepId(quest: MountQuestProgress | null): string | null {
  return quest ? currentMountQuestStep(quest)?.id ?? null : null;
}

/** Ação de montaria que a tecla de interação dispara neste ponto, conforme o passo da missão. */
export function mountQuestAction(x: number, y: number, stepId: string | null): MountAction | null {
  const near = (point: { readonly x: number; readonly y: number }): boolean =>
    Math.hypot(x - point.x, y - point.y) <= MOUNT_INTERACT_DISTANCE;
  if (stepId === "tracks" && near(WILD_HOOFPRINTS)) return "inspect-tracks";
  if (stepId === "calm" && near(WILD_WARHORSE)) return "tame";
  if (stepId === "return" && near(STABLE_MASTER)) return "return-warhorse";
  return null;
}

export interface SurfaceNearby {
  readonly x: number;
  readonly y: number;
  readonly stepId: string | null;
  /** Há uma entrada de caverna ao alcance. */
  readonly caveEntrance: boolean;
  /** NPC mais próximo ao alcance, ou `null`. */
  readonly npc: Pick<Npc, "kind"> | null;
}

/** O que o HUD oferece na superfície; a missão de montaria tem prioridade, depois a caverna, depois o NPC. */
export function surfaceNearbyAction(near: SurfaceNearby): NearbyAction | null {
  const quest = mountQuestAction(near.x, near.y, near.stepId);
  if (quest === "inspect-tracks") return "tracks";
  if (quest === "tame") return "tame";
  if (near.caveEntrance) return "enter";
  return near.npc ? NPC_ACTIONS[near.npc.kind ?? "character"] : null;
}

/** Oferta de comércio mostrada no diálogo de cada NPC. */
/** O ferreiro só vende espada a quem luta com espada (o Mago não, ADR 0072). */
export function npcOffer(npcId: string, heroClass: HeroClassId = DEFAULT_HERO_CLASS): NpcOffer | undefined {
  if (npcId === "lina") return { item: "potion", price: POTION_GEL_PRICE };
  if (npcId === "toren") return heroClassSheet(heroClass).usesSwords ? { item: "sword", price: FORGE_SWORD_PRICE } : undefined;
  if (npcId === "south-rukh") return { item: "desert-stable", price: 0 };
  if (npcId === "south-zinha") return { item: "bazaar", price: 0 };
  if (npcId === "south-marn") return { item: "ossuary", price: 0 };
  if (npcId === "south-ixtal") return { item: "alchemy", price: 0 };
  if (npcId === "south-madame" || npcId === INNKEEPER_ID) return { item: "rest", price: INN_REST_PRICE };
  if (npcId === BANKER_ID) return { item: "bank", price: 0 };
  if (npcId === PRIESTESS_ID) return { item: "shrine", price: 0 };
  // A Academia Arcana só vende ao Mago (o preço é o do primeiro cajado elemental, ADR 0074).
  if (npcId === MAGE_MASTER_ID) return heroClassSheet(heroClass).usesSwords ? undefined : { item: "academy", price: BREEZE_STAFF.price };
  if (npcId === "stablemaster") return { item: "stable", price: 0 };
  return undefined;
}
