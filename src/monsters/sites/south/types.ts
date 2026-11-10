import type { RegionalCreatureKind } from "../../catalog.ts";

/** Quem mora num tipo de lugar do Sul e com que peso é sorteado (ADR 0027). Só dados. */
export interface SiteResident {
  readonly kind: RegionalCreatureKind;
  readonly weight: number;
}
