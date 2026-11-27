/** Missão "A Raiz Velha" (ADR 0104). Só reexporta: estado, eventos, constantes, normalização e regras em arquivos próprios. */
export type { RootsQuestState } from "./questState.ts";
export type { RootsEvent, RootsTalkResult } from "./events.ts";
export { ROOTS_BOSS_KIND, ROOTS_NPC, ROOTS_REWARD_COINS } from "./constants.ts";
export { emptyRootsQuest, normalizeRootsQuest, rootsQuestStarted } from "./normalize.ts";
export { RootsQuest } from "./RootsQuest.ts";
