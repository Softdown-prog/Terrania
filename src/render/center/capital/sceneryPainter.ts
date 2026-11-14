import { blit, sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { CAPITAL_PROP_ART } from "./props/index.ts";

/**
 * Cenário `center-capital`: a muralha, os portões e as torres da capital (ADR 0056). O corpo de cada peça vai para o cache de
 * sprites, um por variação; não há nada animado nesta parte. Sem tipo de peça, ou com um tipo sem pintor, não desenha nada.
 */
export const paintCapitalScenery: SceneryPainter = ({ ctx, prop }) => {
  const kind = prop.capitalKind;
  const art = kind ? CAPITAL_PROP_ART[kind] : undefined;
  if (!kind || !art) return;
  const v = Math.abs(Math.floor(Number.isFinite(prop.variant) ? prop.variant : 0)) % art.variants, [w, h, ox, oy] = art.box;
  const s = sprite(`center-capital-${kind}-${v}`, w, h, ox, oy, (c) => art.paint(c, v));
  if (s) blit(s, ctx); else art.paint(ctx, v);
};
