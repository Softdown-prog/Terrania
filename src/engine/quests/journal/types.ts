/**
 * O diário de missões (ADR 0100): o que o jogador sabe de cada missão, em dados prontos para a tela. Cada missão vira uma `JournalEntry`; o diário só lê o estado das
 * missões (nada aqui muda o jogo). As posições estão em unidades do mundo e servem ao guia de direção ("a 12 tiles a oeste").
 */
export type JournalStatus = "active" | "available" | "completed";
export type StepState = "done" | "current" | "todo";

export interface JournalPlace {
  readonly x: number;
  readonly y: number;
  /** Quem ou o que está lá, em palavras do jogador ("as marcas de cascos", "Eron"). */
  readonly label: string;
}

export interface JournalStep {
  readonly text: string;
  /** A mesma etapa em poucas palavras, para o painel da tela (que é pequeno); sem ela o painel usa o texto inteiro. */
  readonly short?: string;
  readonly state: StepState;
  /** Onde fazer esta etapa, quando se sabe (só a etapa atual mostra o guia). */
  readonly place?: JournalPlace;
}

export interface JournalEntry {
  readonly id: string;
  readonly title: string;
  /** Quem deu a missão e onde. */
  readonly giver: string;
  /** Em poucas linhas, a história e o que se quer do jogador, em linguagem simples. */
  readonly summary: string;
  readonly status: JournalStatus;
  readonly steps: readonly JournalStep[];
  /** 0 a 100, para a barra do painel. */
  readonly percent: number;
  readonly reward?: string;
}
