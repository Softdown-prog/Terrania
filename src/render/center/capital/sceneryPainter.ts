import { blit, sprite, type Sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { buildingBox, capitalBuildingArtFor } from "./buildings/index.ts";
import { CAPITAL_PROP_ART } from "./props/index.ts";

/**
 * Cenário `center-capital`: a muralha, os portões, as torres e o monumento da capital (ADR 0056 e 0057) e os edifícios (ADR
 * 0058). O corpo de cada peça vai para o cache de sprites, um por variação (nos edifícios, um por edifício); não há nada
 * animado nesta parte. Sem tipo de peça, ou com um tipo ou um edifício sem pintor, não desenha nada.
 */
export const paintCapitalScenery: SceneryPainter = ({ ctx, prop }) => {
  const kind = prop.capitalKind;
  if (kind === "building") {
    const building = capitalBuildingArtFor(prop.variant);
    if (!building) return;
    const s = capitalBuildingSprite(prop.variant);
    if (s) blit(s, ctx); else building.paint(ctx);
    return;
  }
  const art = kind ? CAPITAL_PROP_ART[kind] : undefined;
  if (!kind || !art) return;
  const v = Math.abs(Math.floor(Number.isFinite(prop.variant) ? prop.variant : 0)) % art.variants, [w, h, ox, oy] = art.box;
  const s = sprite(`center-capital-${kind}-${v}`, w, h, ox, oy, (c) => art.paint(c, v));
  if (s) blit(s, ctx); else art.paint(ctx, v);
};

/** A chave do sprite do edifício de variação `variant` no cache. */
export const capitalBuildingSpriteKey = (variant: number): string => `center-capital-building-${Math.round(variant)}`;

/** O sprite do edifício de variação `variant`, pintado na primeira vez; `null` onde não há Canvas e `undefined` se o edifício não tem arte. */
export function capitalBuildingSprite(variant: number): Sprite | null | undefined {
  const building = capitalBuildingArtFor(variant);
  if (!building) return undefined;
  const [w, h, ox, oy] = buildingBox(building.size);
  return sprite(capitalBuildingSpriteKey(variant), w, h, ox, oy, building.paint);
}
