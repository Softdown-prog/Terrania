import { SOUTH_BUILDINGS } from "../../../../world/southCity.ts";
import { paintBazar } from "./bazaar.ts";
import { paintFortaleza } from "./fortress.ts";
import { paintFornalha } from "./forge.ts";
import { paintHospedaria } from "./inn.ts";
import { paintCasaDeVenenos } from "./poisons.ts";
import { paintTemplo } from "./temple.ts";
import { paintCasaDeArgila } from "./homeClay.ts";
import { paintCasebreDeOssos } from "./homeBone.ts";
import { paintTendaDeCouro } from "./homeHide.ts";
import { paintBarracaSobreEstacas } from "./homeStilts.ts";
import { paintOssuario } from "./ossuary.ts";
import { paintEstabulo } from "./stable.ts";

/** Um pintor de prédio por id da cidade, todos os doze; a origem é a base do prédio. */
export const BUILDING_PAINTERS: Readonly<Record<string, (c: CanvasRenderingContext2D) => void>> = {
  "south-fortress": paintFortaleza,
  "south-forge": paintFornalha,
  "south-inn": paintHospedaria,
  "south-bazaar": paintBazar,
  "south-poisons": paintCasaDeVenenos,
  "south-temple": paintTemplo,
  "south-ossuary": paintOssuario,
  "south-stable": paintEstabulo,
  "south-home-clay": paintCasaDeArgila,
  "south-home-hide": paintTendaDeCouro,
  "south-home-bone": paintCasebreDeOssos,
  "south-home-stilts": paintBarracaSobreEstacas,
};

/** O pintor do prédio de índice `variant` (o mesmo `variant` de `SOUTH_BUILDINGS`), ou `undefined`. */
export function buildingPainterFor(variant: number): ((c: CanvasRenderingContext2D) => void) | undefined {
  const id = SOUTH_BUILDINGS.find(b => b.variant === Math.round(variant))?.id;
  return id === undefined ? undefined : BUILDING_PAINTERS[id];
}
export { buildingHasFlame, paintBuildingFlame } from "./flame.ts";
export { paintFortaleza, paintFornalha, paintHospedaria, paintBazar, paintCasaDeVenenos, paintTemplo, paintOssuario, paintEstabulo, paintCasaDeArgila,
  paintTendaDeCouro, paintCasebreDeOssos, paintBarracaSobreEstacas };
