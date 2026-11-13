import { blit, sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { buildingHasFlame, buildingPainterFor, paintBuildingFlame } from "./buildings/index.ts";
import { CITY_PROP_ART, cityPropAnimates, paintCityPropAnimation } from "./props/index.ts";

/**
 * Cenário `south-city`: as peças da cidade do Poço Negro. Prédios (ADR 0043 e 0044) e as demais peças (ADR 0049 e 0050) têm
 * pintor próprio: o corpo vai para o cache e só o que se mexe (chama, água) é pintado a cada quadro. Sem tipo de peça, ou com
 * um tipo sem pintor, não desenha nada.
 */
export const paintCityScenery: SceneryPainter = ({ ctx, prop, time }) => {
  const kind = prop.cityKind;
  if (!kind) return;
  const painter = kind === "building" ? buildingPainterFor(prop.variant) : undefined;
  if (painter) {
    const v = Math.round(prop.variant), s = sprite("south-building-" + v, 220, 190, 110, 150, painter);
    if (s) blit(s, ctx); else painter(ctx);
    if (buildingHasFlame(v)) paintBuildingFlame(ctx, v, time);
  } else if (CITY_PROP_ART[kind]) {
    // Muralha, portão, torres, poço e a feira (ADR 0049 e 0050): o corpo vai para o cache; só o fogo e a água se mexem a cada quadro.
    const art = CITY_PROP_ART[kind], v = Math.abs(Math.floor(prop.variant)) % art.variants, [w, h, ox, oy] = art.box;
    const s = sprite(`south-city-${kind}-${v}`, w, h, ox, oy, (c) => art.paint(c, v));
    if (s) blit(s, ctx); else art.paint(ctx, v);
    if (cityPropAnimates(kind)) paintCityPropAnimation(ctx, kind, v, time);
  }
};
