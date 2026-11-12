import { CHUNK_PIXELS, CHUNK_TILES } from "../../../../world/terrain.ts";
import type { LakeAt } from "./coverage.ts";
import { LAKE_SIZE, shadeBlackLake } from "./shade.ts";

/**
 * Camada do lago negro de um chunk (ADR 0039), pronta para ser desenhada por cima do chão. Devolve `null` quando não há
 * lago no chunk nem em volta (a margem de 2 tiles) ou o ambiente não tem Canvas completo. O sombreamento (a costa
 * orgânica, a profundidade, a lama e o fio de luz) vem de `shadeBlackLake`; aqui só se monta e se amplia o canvas.
 */
export function blackLakeLayerCanvas(cx: number, cy: number, seed: number, lakeAt: LakeAt): HTMLCanvasElement | null {
  let any = false;
  for (let ly = -2; ly < CHUNK_TILES + 2 && !any; ly++) for (let lx = -2; lx < CHUNK_TILES + 2; lx++) if (lakeAt(lx, ly)) { any = true; break; }
  if (!any) return null;
  const small = document.createElement("canvas");
  small.width = small.height = LAKE_SIZE;
  const smallCtx = small.getContext("2d");
  const out = document.createElement("canvas");
  out.width = out.height = CHUNK_PIXELS;
  const ctx = out.getContext("2d");
  if (!smallCtx?.createImageData || !ctx) return null;
  const image = smallCtx.createImageData(LAKE_SIZE, LAKE_SIZE);
  if (!image?.data) return null;
  image.data.set(shadeBlackLake(cx, cy, seed, lakeAt));
  smallCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, CHUNK_PIXELS, CHUNK_PIXELS);
  return out;
}
