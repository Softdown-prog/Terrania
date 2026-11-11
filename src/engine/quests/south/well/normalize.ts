import { WELL_WITNESSES } from "./constants.ts";
import type { WellQuestState } from "./questState.ts";
import type { WellWitness } from "./witness.ts";

export const isWellWitness = (value: unknown): value is WellWitness => WELL_WITNESSES.some(id => id === value);
export const emptyWellQuest = (): WellQuestState => ({ heard: [], inspected: false, analyzed: false, reported: false });

/** Nunca confiar no save: etapas só valem se as anteriores valem (não se inspeciona sem ouvir os três). */
export function normalizeWellQuest(value: unknown): WellQuestState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyWellQuest();
  const raw = value as Record<string, unknown>;
  const heard = Array.isArray(raw.heard) ? WELL_WITNESSES.filter(id => (raw.heard as unknown[]).includes(id)) : [];
  const inspected = raw.inspected === true && heard.length === WELL_WITNESSES.length;
  const analyzed = raw.analyzed === true && inspected;
  const reported = raw.reported === true && analyzed;
  return { heard, inspected, analyzed, reported };
}
