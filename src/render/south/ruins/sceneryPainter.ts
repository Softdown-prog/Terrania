import { blit, sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { RUIN_BACK_DEPTH, RUIN_FRONT_DEPTH } from "./depth.ts";
import { paintSouthRuin } from "./paint.ts";

/** Cenário `south-ruin`: uma camada (fundo ou frente) de uma das quatro ruínas, num sprite próprio, pintado uma vez. Sem camada, não desenha nada. */
export const paintRuinScenery: SceneryPainter = ({ ctx, prop }) => {
  const layer = prop.ruinLayer;
  if (!layer) return;
  const v = Math.max(0, Math.min(3, Math.floor(prop.variant)));
  // O desenho usa o contato da ruína como origem; cada camada é ordenada em uma altura própria.
  ctx.translate(0, layer === "back" ? RUIN_BACK_DEPTH : -RUIN_FRONT_DEPTH);
  const s = sprite("south-ruin-" + v + "-" + layer, 232, 168, 116, 112, (c) => paintSouthRuin(c, v, layer));
  if (s) blit(s, ctx); else paintSouthRuin(ctx, v, layer);
};
