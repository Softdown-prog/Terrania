import { mix } from "../../draw.ts";
import { CAVE_PALETTE, type CavePalette } from "../../caveDetails.ts";
import type { CaveTheme } from "../../../world/caves.ts";

/** Azul-petróleo profundo da rocha e verde-água do brilho: o que muda em relação ao tema de origem. */
const DEEP = "#0f2236";
const MOSS = "#2c4a54";
const GLOW = "#5af0c8";

/**
 * Paleta da Gruta Luminosa (ADR 0032): parte da paleta do tema da região e puxa para o petróleo, de modo
 * que uma gruta luminosa do deserto ainda parece do deserto, mas inconfundível ao lado da comum.
 * Só dados: nenhuma peça é desenhada aqui.
 */
export function luminousPalette(theme: CaveTheme): CavePalette {
  const base = CAVE_PALETTE[theme];
  return {
    wall: mix(base.wall, DEEP, .65),
    ground: mix(base.ground, MOSS, .3),
    light: mix(base.light, "#8ee8d6", .28),
    rim: mix(base.rim, "#3f858c", .5),
    water: mix(base.water, "#1a7088", .4),
    accent: mix(base.accent, GLOW, .7),
  };
}
