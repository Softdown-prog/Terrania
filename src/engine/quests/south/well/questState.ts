import type { WellWitness } from "./witness.ts";

/** Estado da missão "A Água Escura" (ADR 0031): só dados serializáveis, sem regra. */
export interface WellQuestState {
  /** Quem já contou a sua versão, em ordem fixa. */
  readonly heard: readonly WellWitness[];
  /** O herói examinou a água do poço (precisa das três versões antes). */
  readonly inspected: boolean;
  /** Ixtal comparou a água com a gosma do brejo. */
  readonly analyzed: boolean;
  /** Gorrak foi informado e pagou a recompensa (uma única vez). */
  readonly reported: boolean;
}
