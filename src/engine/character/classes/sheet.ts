import type { EquipmentSlot } from "../Equipment.ts";
import type { HeroClassId } from "./heroClass.ts";

/** A ficha de uma vocação: o nome e a mana, que dependem só do nível (sem relógio, sem sorteio). */
export interface HeroClassSheet {
  readonly id: HeroClassId;
  readonly name: string;
  /** Pode ser escolhido por um jogador novo? O Mago ficou jogável quando corpo, cajado, combate, animação, barra de mana e inventário ficaram prontos (ADR 0065/0072). */
  readonly playable: boolean;
  /** Luta com as espadas do Cavaleiro (as onze) e as compra com o ferreiro? O Mago luta com cajados (ADR 0072). */
  readonly usesSwords: boolean;
  /** Veste equipamento (armadura do Cavaleiro ou roupas do Mago)? As roupas do Mago entraram no ADR 0078. */
  readonly wearsArmor: boolean;
  /** Os espaços de equipamento da vocação, na ordem em que o inventário os mostra (o Cavaleiro tem os dez; o Mago, o cajado e as sete roupas). */
  readonly equipmentSlots: readonly EquipmentSlot[];
  /** Como a vocação chama cada espaço, quando difere do nome padrão (o do Cavaleiro): o Mago tem chapéu, túnica e livro de magias. */
  readonly slotLabels: Readonly<Partial<Record<EquipmentSlot, string>>>;
  /** Só o Mago usa mana; para o Cavaleiro a barra nem existe. */
  readonly usesMana: boolean;
  /** A vida máxima, em porcentagem da do Cavaleiro no mesmo nível (100 = igual). */
  readonly hpPercent: number;
  /** Mana máxima no nível dado (inteiro, sempre 0 para quem não usa mana). */
  readonly maxMana: (level: number) => number;
  /** Quanto de mana volta por segundo de jogo no nível dado. */
  readonly manaPerSecond: (level: number) => number;
}
