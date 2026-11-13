import { paintCityArena } from "./arena.ts";
import { paintCityBarrel } from "./barrel.ts";
import { paintCityBones } from "./bones.ts";
import { paintCityCorral } from "./corral.ts";
import { paintCityGate } from "./gate.ts";
import { paintCityPalm } from "./palm.ts";
import { paintCitySign } from "./sign.ts";
import { paintCityStall } from "./stall.ts";
import { paintCityTent } from "./tent.ts";
import { paintCityTorch } from "./torch.ts";
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
  tent: { paint: paintCityTent, variants: 5, box: [120, 85, 60, 68] },
  stall: { paint: (c) => paintCityStall(c), variants: 1, box: [76, 70, 38, 58] },
  torch: { paint: paintCityTorch, variants: 2, box: [40, 50, 20, 44] },
  bones: { paint: (c) => paintCityBones(c), variants: 1, box: [80, 28, 40, 18] },
  barrel: { paint: (c) => paintCityBarrel(c), variants: 1, box: [34, 40, 17, 34] },
  sign: { paint: (c) => paintCitySign(c), variants: 1, box: [50, 48, 25, 40] },
  palm: { paint: (c) => paintCityPalm(c), variants: 1, box: [130, 100, 65, 88] },
  arena: { paint: (c) => paintCityArena(c), variants: 1, box: [220, 125, 110, 55] },
  corral: { paint: (c) => paintCityCorral(c), variants: 1, box: [150, 62, 75, 34] },
};
export { cityPropAnimates, paintCityPropAnimation } from "./animation.ts";
export { paintCityArena, paintCityBarrel, paintCityBones, paintCityCorral, paintCityGate, paintCityPalm, paintCitySign, paintCityStall, paintCityTent,
  paintCityTorch, paintCityWall, paintCityWatchtower, paintCityWell };
