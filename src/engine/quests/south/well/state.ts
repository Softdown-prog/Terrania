import type { WellQuestState, WellQuestSummary, WellWitness } from "./types.ts";

export const WELL_WITNESSES: readonly WellWitness[] = ["south-gorrak", "south-khemet", "south-sylrael"];
/** Material que Ixtal usa para comparar com a água: o saque da hidra do brejo. */
export const WELL_SAMPLE_MATERIAL = "Gosma Tóxica";
/** Recompensa de Gorrak, em Terrania Gold. */
export const WELL_REWARD_COINS = 150;

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

/** Salvo só quando saiu do zero. */
export const wellQuestStarted = (state: WellQuestState): boolean =>
  state.heard.length > 0 || state.inspected || state.analyzed || state.reported;

export function wellQuestSummary(state: WellQuestState): WellQuestSummary {
  const total = WELL_WITNESSES.length;
  const started = wellQuestStarted(state);
  if (state.reported) return { title: "A Água Escura", progress: "Missão concluída ✓", percent: 100, started, done: true };
  if (state.analyzed) return { title: "A Água Escura", progress: "Conte a Gorrak o que Ixtal descobriu", percent: 90, started, done: false };
  if (state.inspected) return { title: "A Água Escura", progress: `Leve ${WELL_SAMPLE_MATERIAL} do brejo a Ixtal`, percent: 65, started, done: false };
  if (state.heard.length === total) return { title: "A Água Escura", progress: "Examine o poço (placa)", percent: 50, started, done: false };
  return { title: "A Água Escura", progress: `Ouça as 3 versões: ${state.heard.length} / ${total}`,
    percent: Math.round(state.heard.length / total * 50), started, done: false };
}
