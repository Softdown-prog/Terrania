import { paintCityGate } from "./gate.ts";
import { paintCityWall } from "./wall.ts";
import { paintCityWatchtower } from "./watchtower.ts";
import { paintCityWell } from "./well.ts";

/** Uma peça da cidade com pintor próprio: o desenho, quantas variações tem e o tamanho do sprite (largura, altura, origem x e y). */
export interface CityPropArt {
  readonly paint: (c: CanvasRenderingContext2D, variant: number) => void;
  readonly variants: number;
  readonly box: readonly [number, number, number, number];
}
/** As peças da cidade que já têm pintor próprio, por tipo; as outras seguem no desenho antigo (`southCityArt.ts`). */
export const CITY_PROP_ART: Readonly<Partial<Record<string, CityPropArt>>> = {
  wall: { paint: paintCityWall, variants: 4, box: [80, 70, 40, 56] },
  gate: { paint: paintCityGate, variants: 2, box: [250, 125, 125, 100] },
  tower: { paint: paintCityWatchtower, variants: 2, box: [90, 120, 45, 100] },
  well: { paint: (c) => paintCityWell(c), variants: 1, box: [160, 140, 80, 80] },
};
export { cityPropAnimates, paintCityPropAnimation } from "./animation.ts";
export { paintCityGate, paintCityWall, paintCityWatchtower, paintCityWell };
