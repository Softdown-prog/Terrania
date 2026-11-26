import { COPPER_RING } from "./copper-ring.ts";
import { TRAIL_HELM } from "./trail-helm.ts";
import { RIVER_PENDANT } from "./river-pendant.ts";
import { WILLOW_SHIELD } from "./willow-shield.ts";
import { QUILTED_VEST } from "./quilted-vest.ts";
import { CANVAS_PACK } from "./canvas-pack.ts";
import { TRAVEL_TROUSERS } from "./travel-trousers.ts";
import { REED_ARROWS } from "./reed-arrows.ts";
import { TRAIL_BOOTS } from "./trail-boots.ts";

/** O kit inicial do Cavaleiro: nove peças, uma por arquivo (regra do dono); este arquivo só as reúne. */
export const KNIGHT_GEAR = {
  "copper-ring": COPPER_RING,
  "trail-helm": TRAIL_HELM,
  "river-pendant": RIVER_PENDANT,
  "willow-shield": WILLOW_SHIELD,
  "quilted-vest": QUILTED_VEST,
  "canvas-pack": CANVAS_PACK,
  "travel-trousers": TRAVEL_TROUSERS,
  "reed-arrows": REED_ARROWS,
  "trail-boots": TRAIL_BOOTS,
} as const;
