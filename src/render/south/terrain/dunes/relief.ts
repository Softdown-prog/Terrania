import { CHUNK_PIXELS, CHUNK_TILES, TILE_SIZE } from "../../../../world/terrain.ts";
import type { ReliefLook } from "./palette.ts";
import { SHADE_SIZE, shadeDuneRelief } from "./shade.ts";

/**
 * Camada de relevo de um chunk (ADR 0033), pronta para ser desenhada por cima do chão. Só cobre os
 * tiles do bioma (`dunesAt`, em tiles locais de -1 a `CHUNK_TILES`), com borda suave onde o bioma acaba.
 * Devolve `null` quando o chunk não tem duna nenhuma ou o ambiente não tem Canvas completo.
 */
export function duneReliefCanvas(cx: number, cy: number, seed: number, look: ReliefLook,
  dunesAt: (lx: number, ly: number) => boolean): HTMLCanvasElement | null {
  const span = CHUNK_TILES + 2;
  const mask = new Uint8ClampedArray(span * span * 4);
  let any = false;
  for (let ly = -1; ly <= CHUNK_TILES; ly++) for (let lx = -1; lx <= CHUNK_TILES; lx++) {
    const on = dunesAt(lx, ly);
    if (on) any = true;
    mask[((ly + 1) * span + (lx + 1)) * 4 + 3] = on ? 255 : 0;
  }
  if (!any) return null;
  const small = document.createElement("canvas");
  small.width = small.height = SHADE_SIZE;
  const smallCtx = small.getContext("2d");
  const maskSmall = document.createElement("canvas");
  maskSmall.width = maskSmall.height = span;
  const maskCtx = maskSmall.getContext("2d");
  const out = document.createElement("canvas");
  out.width = out.height = CHUNK_PIXELS;
  const ctx = out.getContext("2d");
  if (!smallCtx?.createImageData || !maskCtx?.createImageData || !ctx) return null;
  const image = smallCtx.createImageData(SHADE_SIZE, SHADE_SIZE);
  if (!image?.data) return null;
  image.data.set(shadeDuneRelief(cx, cy, seed, look));
  smallCtx.putImageData(image, 0, 0);
  const maskImage = maskCtx.createImageData(span, span);
  maskImage.data.set(mask);
  maskCtx.putImageData(maskImage, 0, 0);
  // Amplia o sombreamento com suavização e recorta pelo mapa de duna (também ampliado e suave).
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(maskSmall, -TILE_SIZE, -TILE_SIZE, span * TILE_SIZE, span * TILE_SIZE);
  ctx.globalCompositeOperation = "source-over";
  return out;
}
