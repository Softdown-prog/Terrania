import type { SiteResident } from "./types.ts";

/**
 * Moradores das margens dos lagos negros: o Sapo Batedor Venenoso é o comum, o Ent Podre do Brejo
 * aparece de vez em quando e a Hidra de Lodo só nos lagos grandes (ver `HYDRA_MIN_LAKE_TILES`).
 */
export const HYDRA_MIN_LAKE_TILES = 20;
export const LAKE_DWELLERS: readonly SiteResident[] = [
  { kind: "poison-scout-toad", weight: 70 },
  { kind: "rotten-marsh-ent", weight: 24 },
  { kind: "mire-hydra", weight: 6 },
];
