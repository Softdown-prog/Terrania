import { describeCoins } from "../../../engine/character/coins/index.ts";
import { WELL_REWARD_COINS } from "../../../engine/quests/south/well/index.ts";

/** Gorrak recebe o relatório e paga. */
export const REPORTED: readonly string[] = [
  "Gorrak: Então o brejo é só o começo, e há mão por trás disso. Vigiarei a água.",
  `Recompensa de Gorrak: ${describeCoins(WELL_REWARD_COINS)}. Missão concluída: A Água Escura.`,
];
