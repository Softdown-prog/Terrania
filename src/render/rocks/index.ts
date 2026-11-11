/** Pedras do cenário (ADR 0035): o estilo por bioma e um pintor por estilo, cada um no seu arquivo. Só reexporta. */
export { ROCK_VARIANTS, type RockStyle } from "./types.ts";
export { rockStyleFor } from "./style.ts";
export { rockVariant } from "./variant.ts";
export { drawMossRock } from "./mossRock.ts";
export { drawSandstoneRock } from "./sandstoneRock.ts";
