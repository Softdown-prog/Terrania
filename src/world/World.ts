import { CHUNK_PIXELS, chunkOf } from './terrain.ts';
import { canMoveOnSeed } from './collision.ts';
import { generateChunkCanvas } from '../render/terrain.ts';
/** Cache LRU limitado. O mundo é definido por seed + coordenadas, não por mapas gigantes na RAM. */
export class World {
  private readonly cache = new Map<string, HTMLCanvasElement>();
  constructor(public readonly seed: number) {}
  private chunk(cx: number, cy: number): HTMLCanvasElement {
    const key = cx + ',' + cy;
    let canvas = this.cache.get(key);
    if (canvas) { this.cache.delete(key); this.cache.set(key, canvas); return canvas; }
    canvas = generateChunkCanvas(cx, cy, this.seed);
    this.cache.set(key, canvas);
    if (this.cache.size > 24) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return canvas;
  }
  canMove(x: number, y: number): boolean { return canMoveOnSeed(x, y, this.seed); }
  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, width: number, height: number): void {
    const left = cameraX - width / 2, top = cameraY - height / 2;
    const firstX = chunkOf(left), lastX = chunkOf(left + width);
    const firstY = chunkOf(top), lastY = chunkOf(top + height);
    for (let cy = firstY; cy <= lastY; cy++) for (let cx = firstX; cx <= lastX; cx++) {
      ctx.drawImage(this.chunk(cx, cy), Math.round(cx * CHUNK_PIXELS - left), Math.round(cy * CHUNK_PIXELS - top));
    }
  }
  clear(): void { this.cache.clear(); }
  getCachedCount(): number { return this.cache.size; }
}
