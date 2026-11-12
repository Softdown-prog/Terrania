import { blit, sprite } from "../../props/spriteCache.ts";
import type { SceneryPainter } from "../../props/types.ts";
import { TOWER_PAINTERS } from "./index.ts";

/** Cenário `south-tower`: a torre pedida pelo id, num sprite próprio, pintado uma vez. Sem id, não desenha nada. */
export const paintTowerScenery: SceneryPainter = ({ ctx, prop }) => {
  const id = prop.towerId;
  if (!id) return;
  const s = sprite("south-tower-" + id, 200, 262, 100, 232, (c) => TOWER_PAINTERS[id](c));
  if (s) blit(s, ctx); else TOWER_PAINTERS[id](ctx);
};
