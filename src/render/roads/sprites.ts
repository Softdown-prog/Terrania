/** Quantos sprites de estrada ficam guardados no máximo (cada um tem poucas dezenas de pixels de lado). */
export const ROAD_SPRITE_LIMIT = 512;
/** Níveis em que a variação de uma peça é arredondada para poder reutilizar o sprite. */
export const VARIATION_LEVELS = 24;

const cache = new Map<string, HTMLCanvasElement>();

/** Variação 0..1 arredondada ao meio de um dos `VARIATION_LEVELS` níveis (sempre válida). */
export function quantizeVariation(value: number): number {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
  return (Math.min(VARIATION_LEVELS - 1, Math.floor(v * VARIATION_LEVELS)) + 0.5) / VARIATION_LEVELS;
}

/**
 * Sprite de uma peça estática de estrada (ADR 0034), pintado uma vez por chave e reaproveitado em todos os
 * tiles que pedem a mesma peça: pedras e bordas só variam em poucos níveis, então não precisam de gradientes
 * novos a cada tile. Guarda no máximo `ROAD_SPRITE_LIMIT` (descarta o mais antigo). Devolve `null` quando o
 * ambiente não tem Canvas, e quem chama desenha a peça direto.
 */
export function roadSprite(key: string, width: number, height: number,
  paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement | null {
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paint(ctx);
  cache.set(key, canvas);
  if (cache.size > ROAD_SPRITE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  return canvas;
}

/** Esvazia o cache (para os testes e para trocar de mundo). */
export function clearRoadSprites(): void { cache.clear(); }
export function roadSpriteCount(): number { return cache.size; }
/** As chaves guardadas, na ordem de criação (para testes e depuração). */
export function roadSpriteKeys(): string[] { return [...cache.keys()]; }
