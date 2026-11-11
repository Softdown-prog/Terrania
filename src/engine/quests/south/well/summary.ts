import { WELL_SAMPLE_MATERIAL, WELL_WITNESSES } from "./constants.ts";
import type { WellQuestState } from "./questState.ts";

/** Resumo para o painel de missão: título, progresso em texto e em porcentagem. */
export interface WellQuestSummary {
  readonly title: string;
  readonly progress: string;
  readonly percent: number;
  readonly started: boolean;
  readonly done: boolean;
}

/** Só então a missão ocupa espaço no save e no painel. */
export const wellQuestStarted = (state: WellQuestState): boolean =>
  state.heard.length > 0 || state.inspected || state.analyzed || state.reported;

export function wellQuestSummary(state: WellQuestState): WellQuestSummary {
  const total = WELL_WITNESSES.length;
  const started = wellQuestStarted(state);
  const title = "A Água Escura";
  if (state.reported) return { title, progress: "Missão concluída ✓", percent: 100, started, done: true };
  if (state.analyzed) return { title, progress: "Conte a Gorrak o que Ixtal descobriu", percent: 90, started, done: false };
  if (state.inspected) return { title, progress: `Leve ${WELL_SAMPLE_MATERIAL} do brejo a Ixtal`, percent: 65, started, done: false };
  if (state.heard.length === total) return { title, progress: "Examine o poço (placa)", percent: 50, started, done: false };
  return { title, progress: `Ouça as 3 versões: ${state.heard.length} / ${total}`,
    percent: Math.round(state.heard.length / total * 50), started, done: false };
}
