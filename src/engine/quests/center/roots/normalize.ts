import type { RootsQuestState } from "./questState.ts";

export const emptyRootsQuest = (): RootsQuestState => ({ accepted: false, bossDown: false, reported: false });
/** A missão só entra no save depois de aceita. */
export const rootsQuestStarted = (state: RootsQuestState): boolean => state.accepted;

/** Nunca confiar no save: cada etapa só vale se a anterior vale (não se derrota o Ent sem ter aceitado, nem se recebe sem tê-lo derrotado). */
export function normalizeRootsQuest(value: unknown): RootsQuestState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyRootsQuest();
  const raw = value as Record<string, unknown>;
  const accepted = raw.accepted === true;
  const bossDown = raw.bossDown === true && accepted;
  const reported = raw.reported === true && bossDown;
  return { accepted, bossDown, reported };
}
