import type { WellWitness } from "./witness.ts";

/** As três testemunhas, em ordem fixa. */
export const WELL_WITNESSES: readonly WellWitness[] = ["south-gorrak", "south-khemet", "south-sylrael"];
/** A placa do poço: é por ela que se examina a água. */
export const WELL_SIGN_NPC = "south-well-sign";
/** Quem compara a água com a gosma do brejo. */
export const WELL_ANALYST_NPC = "south-ixtal";
/** Quem recebe o relatório e paga. */
export const WELL_REPORT_NPC = "south-gorrak";
/** Material que Ixtal usa para comparar com a água: o saque da hidra do brejo. */
export const WELL_SAMPLE_MATERIAL = "Gosma Tóxica";
/** Recompensa de Gorrak, em Terrania Gold. */
export const WELL_REWARD_COINS = 150;
