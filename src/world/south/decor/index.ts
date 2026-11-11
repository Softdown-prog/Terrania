/**
 * Decoração do deserto do Sul no mundo (ADR 0037): tipos, colocação, formato, bases, elegibilidade e bloqueio, um
 * assunto por arquivo. Só reexporta.
 */
export { DECOR_VARIANTS, type DecorKind, type DecorPlacement } from "./types.ts";
export { MAX_DECOR_DENSITY, decorFor, mayHaveDecor } from "./placement.ts";
export { decorShapeOf } from "./shape.ts";
export { DECOR_FOOTPRINT, decorFootprint } from "./footprints.ts";
export { southDecorAt } from "./eligibility.ts";
export { southDecorBlocks } from "./blocks.ts";
