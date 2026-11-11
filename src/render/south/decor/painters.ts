import { drawBones } from "./bones.ts";
import { drawCrackedEarth } from "./crackedEarth.ts";
import { drawDesertCactus } from "./cactus.ts";
import { drawDesertShrub } from "./desertShrub.ts";
import { drawDryGrass } from "./dryGrass.ts";
import type { DecorKind } from "../../../world/south/decor/index.ts";

/** O pintor de cada tipo de decoração do deserto (ADR 0036); todos recebem o formato 0 a 3. */
export const DECOR_PAINTERS: Readonly<Record<DecorKind, (c: CanvasRenderingContext2D, variant: number) => void>> = {
  "dry-grass": drawDryGrass,
  shrub: drawDesertShrub,
  bones: drawBones,
  cactus: drawDesertCactus,
  "cracked-earth": drawCrackedEarth,
};
