import { PRIESTESS_ID } from "../../../npcs/center/capital/index.ts";
import { nearestNpc } from "../../../world/npcs.ts";
import type { RespawnPointId } from "../../../engine/character/center/shrine/index.ts";
import { SHRINE_TOO_FAR, SHRINE_UNAVAILABLE, shrineAlready, shrineChosen } from "../../messages/center/shrine.ts";
import type { ShopContext, ShopResult } from "../shopContext.ts";

/**
 * Escolher onde renascer, com a conversa aberta e ao lado da sacerdotisa do Templo (ADR 0064). Vale para qualquer ponto conhecido:
 * consagrar o Templo ou voltar à Vila. Escolher o que já está escolhido não muda nada.
 */
export function chooseRespawnPoint({ sim, inInterior, menuOpen }: ShopContext, id: RespawnPointId): ShopResult {
  if (inInterior || !menuOpen || nearestNpc(sim.player.x, sim.player.y)?.id !== PRIESTESS_ID) return { message: SHRINE_TOO_FAR, changed: false };
  if (sim.awaitingRespawn || sim.player.hp <= 0) return { message: SHRINE_UNAVAILABLE, changed: false };
  if (sim.respawnPoint === id) return { message: shrineAlready(id), changed: false };
  sim.respawnPoint = id;
  return { message: shrineChosen(id), changed: true };
}
