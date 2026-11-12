import { SOUTH_BUILDINGS } from "../../../../world/southCity.ts";
import { paintBazar } from "./bazaar.ts";
import { paintFortaleza } from "./fortress.ts";
import { paintFornalha } from "./forge.ts";
import { paintHospedaria } from "./inn.ts";
import { paintCasaDeVenenos } from "./poisons.ts";
import { paintTemplo } from "./temple.ts";

/** Um pintor de prédio por id da cidade; a origem é a base do prédio. Os que ainda não têm pintor próprio usam o desenho antigo. */
export const BUILDING_PAINTERS: Readonly<Record<string, (c: CanvasRenderingContext2D) => void>> = {
  "south-fortress": paintFortaleza,
  "south-forge": paintFornalha,
  "south-inn": paintHospedaria,
  "south-bazaar": paintBazar,
  "south-poisons": paintCasaDeVenenos,
  "south-temple": paintTemplo,
};

/** O pintor do prédio de índice `variant` (o mesmo `variant` de `SOUTH_BUILDINGS`), ou `undefined`. */
export function buildingPainterFor(variant: number): ((c: CanvasRenderingContext2D) => void) | undefined {
  const id = SOUTH_BUILDINGS.find(b => b.variant === Math.round(variant))?.id;
  return id === undefined ? undefined : BUILDING_PAINTERS[id];
}
export { buildingHasFlame, paintBuildingFlame } from "./flame.ts";
export { paintFortaleza, paintFornalha, paintHospedaria, paintBazar, paintCasaDeVenenos, paintTemplo };
