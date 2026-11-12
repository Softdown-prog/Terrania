import { blit, sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { paintSouthCity } from "../../southCityArt.ts";
import { buildingHasFlame, buildingPainterFor, paintBuildingFlame } from "./buildings/index.ts";

/**
 * Cenário `south-city`: as peças da cidade do Poço Negro. Prédios (ADR 0043 e 0044) têm pintor próprio: o corpo vai para o
 * cache e só a chama, quando há, é pintada a cada quadro. As outras peças (muralha, portão, poço, tendas...) seguem em
 * `southCityArt.ts`. Sem tipo de peça, não desenha nada.
 */
export const paintCityScenery: SceneryPainter = ({ ctx, prop, time }) => {
  const kind = prop.cityKind;
  if (!kind) return;
  const painter = kind === "building" ? buildingPainterFor(prop.variant) : undefined;
  if (painter) {
    const v = Math.round(prop.variant), s = sprite("south-building-" + v, 220, 190, 110, 150, painter);
    if (s) blit(s, ctx); else painter(ctx);
    if (buildingHasFlame(v)) paintBuildingFlame(ctx, v, time);
  } else paintSouthCity(ctx, { kind, x: prop.x, y: prop.y, variant: prop.variant, ...(prop.cityId ? { id: prop.cityId } : {}) }, time);
};
