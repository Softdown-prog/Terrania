import { rockShape, type TileOpenness } from "./openness.ts";
import { rockLook } from "./look.ts";
import { shadeRock } from "./shade.ts";
import type { CavePalette } from "../caveDetails.ts";

/**
 * Camada de rocha do andar, pronta para ser ampliada por cima do canvas inteiro (ADR 0051): chão e parede com o mesmo relevo,
 * silhueta arredondada e oclusão junto das paredes. Devolve `null` quando o ambiente não tem Canvas completo (o piso então
 * fica com o preenchimento liso de base).
 */
export function caveRockCanvas(tiles: TileOpenness, seed: number, palette: CavePalette): HTMLCanvasElement | null {
  const shape = rockShape(tiles, seed);
  const canvas = document.createElement("canvas");
  canvas.width = shape.w; canvas.height = shape.h;
  const ctx = canvas.getContext("2d");
  if (!ctx?.createImageData) return null;
  const image = ctx.createImageData(shape.w, shape.h);
  if (!image?.data) return null;
  image.data.set(shadeRock(shape, seed, rockLook(palette)));
  ctx.putImageData(image, 0, 0);
  return canvas;
}
