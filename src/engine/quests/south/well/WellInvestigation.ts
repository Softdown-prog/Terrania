import type { Inventory } from "../../../character/Inventory.ts";
import { MAX_COINS } from "../../../character/coins/index.ts";
import { WELL_ANALYST_NPC, WELL_REPORT_NPC, WELL_REWARD_COINS, WELL_SAMPLE_MATERIAL, WELL_SIGN_NPC,
  WELL_WITNESSES } from "./constants.ts";
import { emptyWellQuest, isWellWitness, normalizeWellQuest } from "./normalize.ts";
import type { WellQuestState } from "./questState.ts";
import type { WellTalkResult } from "./events.ts";

const none: WellTalkResult = { event: null, changed: false };

/**
 * A investigação do poço (ADR 0031). Cada conversa com um NPC da cidade chama `talk`: só muda algo quando
 * é o NPC certo na etapa certa; fora disso devolve `null` e o diálogo comum segue sozinho.
 */
export class WellInvestigation {
  private state: WellQuestState;
  constructor(saved?: unknown) { this.state = saved === undefined ? emptyWellQuest() : normalizeWellQuest(saved); }

  get view(): WellQuestState { return this.state; }
  snapshot(): WellQuestState { return this.state; }

  talk(npcId: string, inventory: Inventory): WellTalkResult {
    const s = this.state;
    if (npcId === WELL_REPORT_NPC && s.analyzed && !s.reported) return this.report(inventory);
    if (isWellWitness(npcId) && !s.heard.includes(npcId)) {
      this.state = { ...s, heard: WELL_WITNESSES.filter(id => id === npcId || s.heard.includes(id)) };
      return { event: `heard:${npcId}`, changed: true };
    }
    if (npcId === WELL_SIGN_NPC && !s.inspected) {
      if (s.heard.length < WELL_WITNESSES.length) return { event: "sign-needs-witnesses", changed: false };
      this.state = { ...s, inspected: true };
      return { event: "well-inspected", changed: true };
    }
    if (npcId === WELL_ANALYST_NPC && s.inspected && !s.analyzed) {
      if (!inventory.spendMaterial(WELL_SAMPLE_MATERIAL, 1)) return { event: "analysis-needs-sample", changed: false };
      this.state = { ...s, analyzed: true };
      return { event: "analyzed", changed: true };
    }
    return none;
  }

  /** Paga uma única vez; carteira sem espaço não marca a missão como paga. */
  private report(inventory: Inventory): WellTalkResult {
    if (MAX_COINS - inventory.coins < WELL_REWARD_COINS) return { event: "report-wallet-full", changed: false };
    inventory.addCoins(WELL_REWARD_COINS);
    this.state = { ...this.state, reported: true };
    return { event: "reported", changed: true };
  }
}
