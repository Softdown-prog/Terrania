import type { Inventory } from "../../../character/Inventory.ts";
import { MAX_COINS } from "../../../character/coins/index.ts";
import type { RootsTalkResult } from "./events.ts";
import { ROOTS_BOSS_KIND, ROOTS_NPC, ROOTS_REWARD_COINS } from "./constants.ts";
import { emptyRootsQuest, normalizeRootsQuest } from "./normalize.ts";
import type { RootsQuestState } from "./questState.ts";

const none: RootsTalkResult = { event: null, changed: false };

/**
 * "A Raiz Velha" (ADR 0104): depois da clareira, Aela pede que o herói vença o Ent Ancião no fundo de uma Masmorra das Raízes. Falar com ela aceita; o abate do
 * Ent depois de aceita fica guardado (o chefe volta em 30 minutos, a missão não perde o abate); falar com ela de novo paga uma única vez.
 */
export class RootsQuest {
  private state: RootsQuestState;
  constructor(saved?: unknown) { this.state = saved === undefined ? emptyRootsQuest() : normalizeRootsQuest(saved); }

  get view(): RootsQuestState { return this.state; }
  snapshot(): RootsQuestState { return this.state; }

  /** `clearingDone`: a recompensa da clareira já foi recebida (a missão só aparece para quem terminou a primeira). */
  talk(npcId: string, inventory: Inventory, clearingDone: boolean): RootsTalkResult {
    if (npcId !== ROOTS_NPC || !clearingDone) return none;
    const s = this.state;
    if (s.reported) return none;
    if (!s.accepted) {
      this.state = { ...s, accepted: true };
      return { event: "accepted", changed: true };
    }
    if (!s.bossDown) return { event: "reminder", changed: false };
    // Paga uma única vez; carteira sem espaço não marca a missão como paga.
    if (MAX_COINS - inventory.coins < ROOTS_REWARD_COINS) return { event: "report-wallet-full", changed: false };
    inventory.addCoins(ROOTS_REWARD_COINS);
    this.state = { ...s, reported: true };
    return { event: "reported", changed: true };
  }

  /** O herói derrotou uma criatura na caverna (`bossFloor`: é o chefe do último andar). Devolve `true` se a missão mudou. */
  noteDefeat(kind: string, isBoss: boolean): boolean {
    const s = this.state;
    if (!s.accepted || s.bossDown || !isBoss || kind !== ROOTS_BOSS_KIND) return false;
    this.state = { ...s, bossDown: true };
    return true;
  }
}
