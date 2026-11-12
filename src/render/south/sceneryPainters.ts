import type { SceneryPainter } from "../props/types.ts";
import { paintCityScenery } from "./city/sceneryPainter.ts";
import { paintDecorScenery } from "./decor/sceneryPainter.ts";
import { paintRuinScenery } from "./ruins/sceneryPainter.ts";
import { paintTowerScenery } from "./towers/sceneryPainter.ts";

/** Os tipos de cenário que só existem no Sul, cada um com o pintor que mora na sua pasta (ADR 0048). */
export const SOUTH_SCENERY_PAINTERS: Readonly<Record<"south-city" | "south-ruin" | "south-tower" | "south-decor", SceneryPainter>> = {
  "south-city": paintCityScenery,
  "south-ruin": paintRuinScenery,
  "south-tower": paintTowerScenery,
  "south-decor": paintDecorScenery,
};
