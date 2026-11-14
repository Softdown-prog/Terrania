import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_TILE, capitalPoint } from "../../../world/center/capital/index.ts";
import { hasSprite } from "../../props/spriteCache.ts";
import { capitalBuildingSprite, capitalBuildingSpriteKey } from "./sceneryPainter.ts";

/** A que distância da muralha (em tiles) os sprites dos edifícios começam a ser preparados: bem antes de a cidade entrar na tela (meia tela de 1280 × 720 dá 20 × 11 tiles). */
export const CAPITAL_WARM_MARGIN = 28;

/**
 * Prepara os sprites dos edifícios da capital antes de aparecerem (ADR 0058): cada chamada pinta no máximo um, e só com a
 * câmera perto da cidade. Um edifício é um sprite grande; sem isto, dois que entram na tela juntos seriam pintados no mesmo
 * quadro. Devolve se pintou algum. Quem não passou por aqui (câmera que nasce dentro da cidade) é pintado na hora, como antes.
 */
export function warmCapitalSprites(cameraX: number, cameraY: number): boolean {
  if (!Number.isFinite(cameraX) || !Number.isFinite(cameraY)) return false;
  const center = capitalPoint(0, 0);
  if (Math.abs(cameraX - center.x) >= (CAPITAL.maxX + CAPITAL_WARM_MARGIN) * CAPITAL_TILE || Math.abs(cameraY - center.y) >= (CAPITAL.maxY + CAPITAL_WARM_MARGIN) * CAPITAL_TILE) return false;
  for (let i = 0; i < CAPITAL_BUILDINGS.length; i++) {
    if (hasSprite(capitalBuildingSpriteKey(i))) continue;
    capitalBuildingSprite(i);
    return true;
  }
  return false;
}
