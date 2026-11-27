import type { MountView } from "../../mounts/MountStable.ts";
import type { WellQuestState } from "../south/well/questState.ts";
import type { RootsQuestState } from "../center/roots/index.ts";
import { clearingEntry } from "./clearing.ts";
import { warhorseEntry } from "./warhorse.ts";
import { rootsEntry } from "./roots.ts";
import { wellEntry } from "./well.ts";
import type { JournalEntry, JournalStatus } from "./types.ts";

export type { JournalEntry, JournalPlace, JournalStatus, JournalStep, StepState } from "./types.ts";
export { GUIDE_HERE_TILES, questGuide, type QuestGuide } from "./guide.ts";

/** Tudo o que o diário lê do jogo. */
export interface JournalSources {
  readonly trainingKills: number;
  readonly clearingRewardClaimed: boolean;
  /** A entrada da Gruta dos Slimes (treinamento), se se sabe, para o guia. */
  readonly trainingCave?: { readonly x: number; readonly y: number };
  readonly mounts: MountView;
  readonly level: number;
  readonly well: WellQuestState;
  /** A segunda missão de Aela (ADR 0104). */
  readonly roots: RootsQuestState;
  /** A entrada da Masmorra das Raízes mais perto do herói, se se sabe, para o guia da Raiz Velha. */
  readonly rootsDungeon?: { readonly x: number; readonly y: number };
}

const ORDER: Readonly<Record<JournalStatus, number>> = { active: 0, available: 1, completed: 2 };

/** Todas as missões do jogo, em andamento primeiro, depois as que dá para começar e por fim as concluídas (dentro de cada grupo, a ordem fixa do jogo). */
export function buildJournal(sources: JournalSources): readonly JournalEntry[] {
  const entries = [
    clearingEntry(sources.trainingKills, sources.clearingRewardClaimed, sources.trainingCave),
    rootsEntry(sources.roots, sources.clearingRewardClaimed, sources.rootsDungeon),
    warhorseEntry(sources.mounts, sources.level),
    wellEntry(sources.well),
  ];
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => ORDER[a.entry.status] - ORDER[b.entry.status] || a.index - b.index).map(({ entry }) => entry);
}

/** A missão que o painel da tela acompanha: a escolhida pelo jogador, se ainda está em andamento; senão a primeira em andamento; sem nenhuma, nada. */
export function trackedEntry(entries: readonly JournalEntry[], preferredId: string | null): JournalEntry | null {
  const active = entries.filter(entry => entry.status === "active");
  return active.find(entry => entry.id === preferredId) ?? active[0] ?? null;
}

/** A etapa em que o jogador está agora (a primeira marcada como atual), se houver. */
export const currentStep = (entry: JournalEntry) => entry.steps.find(step => step.state === "current") ?? null;

/** O que o painel de missão da tela mostra (ADR 0100): a missão acompanhada, só enquanto está em andamento. Sem missão em andamento, o painel aponta para o diário. */
export interface QuestPanel {
  readonly heading: string;
  readonly title: string;
  readonly progress: string;
  readonly percent: number;
}

export function questPanel(entries: readonly JournalEntry[], preferredId: string | null): QuestPanel {
  const tracked = trackedEntry(entries, preferredId);
  if (!tracked) return { heading: "MISSÕES", title: "Nenhuma missão em andamento", progress: "Veja o Diário: Mochila → Missões", percent: 0 };
  const more = entries.filter(entry => entry.status === "active").length - 1;
  return { heading: more > 0 ? `MISSÃO · +${more} EM ANDAMENTO` : "MISSÃO", title: tracked.title, progress: currentStep(tracked)?.short ?? currentStep(tracked)?.text ?? "", percent: tracked.percent };
}
