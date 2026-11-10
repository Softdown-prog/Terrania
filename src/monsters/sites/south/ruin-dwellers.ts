import type { SiteResident } from "./types.ts";

/** Moradores das ruínas abandonadas: o Diabrete de Miragem e o Elfo Patrulheiro do Oásis, e às vezes um Goblin saqueador. */
export const RUIN_DWELLERS: readonly SiteResident[] = [
  { kind: "mirage-imp", weight: 55 },
  { kind: "oasis-elf", weight: 35 },
  { kind: "sand-goblin", weight: 10 },
];
/** Quantos moradores cada ruína tem. */
export const RUIN_RESIDENTS = 2;
