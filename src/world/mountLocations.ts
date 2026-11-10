import { southPoint } from "./southCity.ts";

/** Posições de interação fixas na Vila Inicial, sem objetos novos na colisão. */
export const STABLE_MASTER = { x: 384, y: 112 } as const;
export const WILD_WARHORSE = { x: 192, y: 160 } as const;
/** Marcas visíveis de cascos na saída oeste, antes do cavalo fugitivo. */
export const WILD_HOOFPRINTS = { x: 288, y: 144 } as const;
export const WILD_APPLES = { x: 256, y: 176 } as const;
export const MOUNT_INTERACT_DISTANCE = 56;
/** O cercado do Domador Rukh no Poço Negro (ADR 0028): onde se compram e se montam as montarias do deserto. */
export const SOUTH_STABLE = southPoint(-23, 15);
