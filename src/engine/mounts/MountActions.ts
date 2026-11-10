import type { OfflineSimulation } from "../OfflineSimulation.ts";
import { levelForExperience } from "../character/Experience.ts";
import { sampleMountCaptureLoot, type MountAction, type MountActionResult } from "./MountStable.ts";
import { isMountId } from "../../actors/MountCatalog.ts";

/** Resultados que alteram o que o jogador possui ou o progresso da missão e, por isso, exigem salvar. */
const PERSISTING: ReadonlySet<MountActionResult> = new Set<MountActionResult>([
  "built", "upgraded", "trained", "quest-started", "tracks-found", "halter-made", "calmed", "returned", "mounted", "dismounted", "bought",
]);

export interface MountActionOutcome {
  readonly result: MountActionResult;
  /** O progresso mudou: quem chama deve salvar. */
  readonly persist: boolean;
  /** Montar ou desmontar muda a velocidade: quem chama deve interromper passos e rotas em curso. */
  readonly stopMovement: boolean;
}

/**
 * Executa uma ação do estábulo ou da montaria sobre a simulação. Somente o motor confirma
 * a compra, o domador e o inventário; a interface pede ações e mostra o resultado.
 * Não verifica onde o herói está (caverna, interior): isso é decisão de quem orquestra.
 */
export function runMountAction(sim: OfflineSimulation, action: MountAction): MountActionOutcome {
  const { player, mounts, inventory, kills } = sim;
  const lvl = levelForExperience(sim.experience), gel = inventory.gel;
  const spend = (amount: number): boolean => inventory.spendGel(amount);
  const spendCoins = (amount: number): boolean => inventory.spendCoins(amount);
  mounts.synchronizeKills(kills);
  // Montarias do Poço Negro (ADR 0028): "buy:<id>" compra com moedas e "mount:<id>" monta a que o herói tem.
  const [verb, rawId] = action.split(":");
  if (rawId !== undefined && (verb === "buy" || verb === "mount")) {
    const result: MountActionResult = !isMountId(rawId) ? "unavailable" : verb === "buy"
      ? mounts.buy(rawId, lvl, inventory.coins, spendCoins, player.x, player.y)
      : mounts.mount(rawId, lvl, player.x, player.y);
    return { result, persist: PERSISTING.has(result), stopMovement: result === "mounted" };
  }
  let result: MountActionResult;
  switch (action) {
    case "build": case "upgrade": result = mounts.upgrade(lvl, inventory.coins, spendCoins, player.x, player.y); break;
    case "train": result = mounts.train(lvl, player.x, player.y); break;
    case "start-warhorse": result = mounts.beginWarhorse(lvl, player.x, player.y, kills); break;
    case "make-halter": result = mounts.craftHalter(gel, spend, player.x, player.y); break;
    case "inspect-tracks": result = mounts.inspectTracks(player.x, player.y); break;
    case "tame": result = mounts.tame(lvl, kills, player.x, player.y); break;
    case "return-warhorse":
      result = mounts.returnWarhorse(player.x, player.y);
      if (result === "returned") for (const item of sampleMountCaptureLoot("warhorse", sim.seed))
        inventory.addMaterial(item);
      break;
    case "mount-warhorse": result = mounts.mount("warhorse", lvl, player.x, player.y); break;
    case "dismount": result = mounts.dismount(); break;
    default: result = "unavailable"; break;
  }
  return { result, persist: PERSISTING.has(result), stopMovement: result === "mounted" || result === "dismounted" };
}
