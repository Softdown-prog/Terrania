import {
  CHUNK_PIXELS,
  CHUNK_TILES,
  TILE_SIZE,
  chunkOf,
  getTile,
} from "../world/terrain.ts";
import { LANDMARKS } from "../world/landmarks.ts";
import { generateChunkCanvas } from "./terrain.ts";
import type { Scenery } from "./scenery.ts";
interface ChunkVisual {
  canvas: HTMLCanvasElement;
  props: Scenery[];
  water: Array<{ x: number; y: number; phase: number }>;
}
/** Bounded LRU: ground is cached; tall objects are sorted with actors each frame. */
export class WorldRenderer {
  private readonly cache = new Map<string, ChunkVisual>();
  constructor(public readonly seed: number) {}
  private chunk(cx: number, cy: number): ChunkVisual {
    const key = cx + "," + cy;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    const props: Scenery[] = [],
      water: ChunkVisual["water"] = [];
    for (let y = 0; y < CHUNK_TILES; y++)
      for (let x = 0; x < CHUNK_TILES; x++) {
        const tx = cx * CHUNK_TILES + x,
          ty = cy * CHUNK_TILES + y,
          tile = getTile(tx, ty, this.seed);
        if (tile.tree || tile.rock)
          props.push({
            kind: tile.tree ? "tree" : "rock",
            x: tx * TILE_SIZE + 16,
            y: ty * TILE_SIZE + 23,
            variant: tile.decoration,
          });
        if (tile.ground === "water")
          water.push({
            x: tx * TILE_SIZE + 8,
            y: ty * TILE_SIZE + 13,
            phase: tile.decoration * 6,
          });
      }
    const result = {
      canvas: generateChunkCanvas(cx, cy, this.seed),
      props,
      water,
    };
    this.cache.set(key, result);
    if (this.cache.size > 24) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return result;
  }
  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    width: number,
    height: number,
    time = 0,
    animated = true,
  ): void {
    const left = cameraX - width / 2,
      top = cameraY - height / 2;
    for (let cy = chunkOf(top); cy <= chunkOf(top + height); cy++)
      for (let cx = chunkOf(left); cx <= chunkOf(left + width); cx++) {
        const chunk = this.chunk(cx, cy);
        ctx.drawImage(
          chunk.canvas,
          Math.floor(cx * CHUNK_PIXELS - left),
          Math.floor(cy * CHUNK_PIXELS - top),
        );
        if (animated) {
          ctx.strokeStyle = "#c8e1bf45";
          ctx.lineWidth = 0.8;
          for (const spot of chunk.water) {
            const wave = Math.sin(time * 1.5 + spot.phase);
            if (wave < 0.4) continue;
            ctx.globalAlpha = (wave - 0.4) * 0.7;
            ctx.beginPath();
            ctx.moveTo(spot.x - left, spot.y - top + wave * 2);
            ctx.lineTo(spot.x - left + 7 + wave * 4, spot.y - top + wave * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
      }
  }
  objects(
    cameraX: number,
    cameraY: number,
    width: number,
    height: number,
  ): Scenery[] {
    const left = cameraX - width / 2 - 45,
      top = cameraY - height / 2 - 10;
    const right = left + width + 90,
      bottom = top + height + 110;
    const result: Scenery[] = [];
    for (let cy = chunkOf(top); cy <= chunkOf(bottom); cy++)
      for (let cx = chunkOf(left); cx <= chunkOf(right); cx++) {
        for (const prop of this.chunk(cx, cy).props)
          if (
            prop.x > left &&
            prop.x < right &&
            prop.y > top &&
            prop.y < bottom
          )
            result.push(prop);
      }
    for (const prop of LANDMARKS)
      if (
        prop.x > left - 40 &&
        prop.x < right + 40 &&
        prop.y > top &&
        prop.y < bottom
      )
        result.push(prop);
    return result;
  }
  clear(): void {
    this.cache.clear();
  }
  getCachedCount(): number {
    return this.cache.size;
  }
}
