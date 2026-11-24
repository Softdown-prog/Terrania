import type { HeroClassId } from "./heroClass.ts";

/** A ficha de uma vocação: o nome e a mana, que dependem só do nível (sem relógio, sem sorteio). */
export interface HeroClassSheet {
  readonly id: HeroClassId;
  readonly name: string;
  /** Pode ser escolhido por um jogador novo? O Mago ficou jogável quando corpo, cajado, combate, animação, barra de mana e inventário ficaram prontos (ADR 0065/0072). */
  readonly playable: boolean;
  /** Luta com as espadas do Cavaleiro (as onze) e as compra com o ferreiro? O Mago luta com cajados (ADR 0072). */
  readonly usesSwords: boolean;
  /** Veste o conjunto de armadura? O Mago ainda não: as roupas mágicas dele entram com os cajados (fatia G, ADR 0072). */
  readonly wearsArmor: boolean;
  /** Só o Mago usa mana; para o Cavaleiro a barra nem existe. */
  readonly usesMana: boolean;
  /** A vida máxima, em porcentagem da do Cavaleiro no mesmo nível (100 = igual). */
  readonly hpPercent: number;
  /** Mana máxima no nível dado (inteiro, sempre 0 para quem não usa mana). */
  readonly maxMana: (level: number) => number;
  /** Quanto de mana volta por segundo de jogo no nível dado. */
  readonly manaPerSecond: (level: number) => number;
}
