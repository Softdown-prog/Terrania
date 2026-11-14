import { CAPITAL, CAPITAL_TILE, capitalPoint } from "./layout.ts";
import { CAPITAL_PROPS, type CapitalProp } from "./props.ts";

/**
 * Até onde a arte de uma peça comum da capital vai além da base, em px: para os lados (o portão tem 160 de meia largura), para
 * cima (a torre tem 184 de altura) e para baixo (sombra e degraus). As peças grandes (edifícios) dizem o seu em `reach`.
 */
export const CAPITAL_PROP_REACH = { side: 235, up: 200, down: 200 } as const;

/**
 * As peças da capital que podem aparecer numa tela de `width` × `height` px centrada em (cameraX, cameraY), em pixels do mundo
 * (ADR 0058). O custo é fixo e, longe da cidade, nenhuma peça é examinada. "Longe" conta com o tamanho da tela: com uma
 * distância fixa, numa tela larga ou alta a muralha surgia de repente, já dentro da imagem.
 */
export function capitalPropsInView(cameraX: number, cameraY: number, width: number, height: number): CapitalProp[] {
  if (![cameraX, cameraY, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return [];
  const center = capitalPoint(0, 0), halfW = width / 2, halfH = height / 2;
  const spanX = (Math.max(-CAPITAL.minX, CAPITAL.maxX) + 1) * CAPITAL_TILE + CAPITAL_PROP_REACH.side, spanY = (Math.max(-CAPITAL.minY, CAPITAL.maxY) + 1) * CAPITAL_TILE + CAPITAL_PROP_REACH.up;
  if (Math.abs(cameraX - center.x) >= spanX + halfW || Math.abs(cameraY - center.y) >= spanY + halfH) return [];
  const seen: CapitalProp[] = [];
  for (const prop of CAPITAL_PROPS) {
    const side = Math.max(CAPITAL_PROP_REACH.side, prop.reach?.side ?? 0), up = Math.max(CAPITAL_PROP_REACH.up, prop.reach?.up ?? 0);
    if (prop.x > cameraX - halfW - side && prop.x < cameraX + halfW + side && prop.y > cameraY - halfH - CAPITAL_PROP_REACH.down && prop.y < cameraY + halfH + up) seen.push(prop);
  }
  return seen;
}
