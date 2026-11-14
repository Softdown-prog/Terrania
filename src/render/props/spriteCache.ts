/**
 * Cache de sprites do cenário (ADR 0048): objetos altos são pintados uma única vez em canvases fora da tela (arte 100 %
 * procedural) e carimbados a cada quadro. Isso permite sombreamento rico com gradientes sem custo por quadro. Vive aqui,
 * e não em `scenery.ts`, para que as peças de cada região usem o mesmo cache sem importar o arquivo comum.
 */
/** Resolução dos sprites em relação ao desenho (2 = o dobro de pixels, para ficar nítido em tela de alta densidade). */
export const RES = 2;
export interface Sprite { readonly canvas: HTMLCanvasElement; readonly ox: number; readonly oy: number }
const sprites = new Map<string, Sprite | null>();

/** O sprite de `key`, pintado na primeira vez com `paint` (origem em `ox, oy`); `null` onde não há Canvas (Node). */
export function sprite(key: string, w: number, h: number, ox: number, oy: number,
  paint: (c: CanvasRenderingContext2D) => void): Sprite | null {
  const hit = sprites.get(key);
  if (hit !== undefined) return hit;
  let made: Sprite | null = null;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = w * RES; canvas.height = h * RES;
    const c = canvas.getContext("2d");
    if (c) {
      c.scale(RES, RES); c.translate(ox, oy); c.lineJoin = "round";
      paint(c);
      made = { canvas, ox, oy };
    }
  }
  sprites.set(key, made);
  return made;
}
/** O sprite de `key` já foi pintado (ou já se sabe que não há Canvas)? Serve para preparar sprites grandes antes de aparecerem. */
export function hasSprite(key: string): boolean { return sprites.has(key); }
/** Carimba um sprite já pintado com a origem dele na origem atual do contexto (o sprite vem primeiro: não é um desenhador). */
export function blit(s: Sprite, ctx: CanvasRenderingContext2D): void {
  ctx.drawImage(s.canvas, -s.ox, -s.oy, s.canvas.width / RES, s.canvas.height / RES);
}
/** Libera os canvases (troca de qualidade/contexto). */
export function clearSpriteCache(): void { sprites.clear(); }
