import type { HeroClassId } from "./heroClass.ts";

/** A ficha de uma vocação: o nome e a mana, que dependem só do nível (sem relógio, sem sorteio). */
export interface HeroClassSheet {
  readonly id: HeroClassId;
  readonly name: string;
  /** Só o Mago usa mana; para o Cavaleiro a barra nem existe. */
  readonly usesMana: boolean;
  /** Mana máxima no nível dado (inteiro, sempre 0 para quem não usa mana). */
  readonly maxMana: (level: number) => number;
  /** Quanto de mana volta por segundo de jogo no nível dado. */
  readonly manaPerSecond: (level: number) => number;
}
