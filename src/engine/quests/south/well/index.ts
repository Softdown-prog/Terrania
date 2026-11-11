/** Missão "A Água Escura" (ADR 0031). Só reexporta: estado, eventos, constantes, normalização e resumo em arquivos próprios. */
export type { WellWitness } from "./witness.ts";
export type { WellQuestState } from "./questState.ts";
export type { WellEvent, WellTalkResult } from "./events.ts";
export { WELL_ANALYST_NPC, WELL_REPORT_NPC, WELL_REWARD_COINS, WELL_SAMPLE_MATERIAL, WELL_SIGN_NPC, WELL_WITNESSES } from "./constants.ts";
export { emptyWellQuest, isWellWitness, normalizeWellQuest } from "./normalize.ts";
export { wellQuestStarted, wellQuestSummary, type WellQuestSummary } from "./summary.ts";
export { WellInvestigation } from "./WellInvestigation.ts";
