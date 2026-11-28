import type { ArrowDefinition } from "../../Arrows.ts";

/** A Flecha de Junco (ADR 0110): a comum, barata, sem efeito. Dano extra 0: o tiro vale o dano do arco. */
export const REED_ARROW = { name: "Flecha de Junco", bonusDamage: 0 } as const satisfies ArrowDefinition;
