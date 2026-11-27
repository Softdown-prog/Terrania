/** Estado da missão "A Raiz Velha" (ADR 0104): só dados serializáveis, sem regra. */
export interface RootsQuestState {
  /** Aela já contou da Raiz Velha e o herói aceitou. */
  readonly accepted: boolean;
  /** O Ent Ancião caiu depois de aceita a missão (vale mesmo que ele volte depois). */
  readonly bossDown: boolean;
  /** Aela pagou a recompensa (uma única vez). */
  readonly reported: boolean;
}
