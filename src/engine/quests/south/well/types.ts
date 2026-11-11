/**
 * Missão "A Água Escura" (ADR 0031): investigar por que o Poço Negro escureceu. O estado é só dados
 * serializáveis; a regra está em `WellInvestigation.ts` e os textos em `src/game/messages/wellQuestLines.ts`.
 */
export type WellWitness = "south-gorrak" | "south-khemet" | "south-sylrael";

export interface WellQuestState {
  /** Quem já contou a sua versão, na ordem em que foi ouvido. */
  readonly heard: readonly WellWitness[];
  /** O herói examinou a água do poço (precisa das três versões antes). */
  readonly inspected: boolean;
  /** Ixtal comparou a água com a gosma do brejo. */
  readonly analyzed: boolean;
  /** Gorrak foi informado e pagou a recompensa (uma única vez). */
  readonly reported: boolean;
}

/** O que a conversa mudou (ou explicou); o jogo traduz cada evento em falas. */
export type WellEvent =
  | `heard:${WellWitness}`
  | "sign-needs-witnesses" | "well-inspected"
  | "analysis-needs-sample" | "analyzed"
  | "reported" | "report-wallet-full";

export interface WellTalkResult {
  readonly event: WellEvent | null;
  /** A bolsa ou o estado mudou: quem chama salva e atualiza o HUD. */
  readonly changed: boolean;
}

/** Resumo para o painel de missão: título, progresso em texto e em porcentagem. */
export interface WellQuestSummary {
  readonly title: string;
  readonly progress: string;
  readonly percent: number;
  readonly started: boolean;
  readonly done: boolean;
}
