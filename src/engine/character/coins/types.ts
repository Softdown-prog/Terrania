/** As moedas do jogo (ADR 0023). Cada moeda tem o seu arquivo nesta pasta e o `index.ts` só agrega. */
export type CoinId = "terrania-gold" | "cripta-coin" | "eclipse-crown";

/** Ficha de uma moeda: só dados. A aparência (ícone) vive em `app/item-icon.component.ts`, com o mesmo id. */
export interface CoinDefinition {
  readonly id: CoinId;
  readonly name: string;
  /** Quanto vale, em moedas Terrania Gold (a unidade básica). Cada moeda vale 100 da anterior. */
  readonly value: number;
  readonly description: string;
}
