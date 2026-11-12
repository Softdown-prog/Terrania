import { decorShapeOf } from "../../../world/south/decor/index.ts";
import { blit, sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { DECOR_PAINTERS } from "./painters.ts";

/** Cenário `south-decor`: um tipo de decoração do deserto em um dos quatro formatos. Sem tipo, não desenha nada (e nunca cai na fogueira). */
export const paintDecorScenery: SceneryPainter = ({ ctx, prop, flip }) => {
  const kind = prop.decorKind;
  if (!kind) return;
  const shape = decorShapeOf(prop.variant);
  const s = sprite(`south-decor-${kind}-${shape}`, 56, 48, 28, 38, (c) => DECOR_PAINTERS[kind](c, shape));
  ctx.scale(flip, 1);
  if (s) blit(s, ctx); else DECOR_PAINTERS[kind](ctx, shape);
};
