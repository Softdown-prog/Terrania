import type { Player } from "../../actors/Player.ts";
import type { OfflineSimulation } from "../../engine/OfflineSimulation.ts";

/** Tudo de que uma ação de bolsa ou loja precisa saber sobre o momento do jogo. */
export interface ShopContext {
  readonly sim: OfflineSimulation;
  /** Quem age: na caverna é o herói da caverna; na superfície, o da simulação. */
  readonly hero: Player;
  readonly inInterior: boolean;
  readonly menuOpen: boolean;
  /** O herói da caverna caiu. Só a poção rápida consulta isto. */
  readonly caveHeroDown: boolean;
}

/** `changed` indica que a bolsa mudou: quem chama salva e atualiza o HUD. A mensagem sempre vai ao jogador. */
export interface ShopResult {
  readonly message: string;
  readonly changed: boolean;
}
