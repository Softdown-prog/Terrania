import {
  CHUNK_PIXELS,
  CHUNK_TILES,
  TILE_SIZE,
  chunkOf,
  getTile,
} from "../world/terrain.ts";
import { LANDMARKS } from "../world/landmarks.ts";
import { LANDMARK_CELL_TILES, getRegionalLandmarkForCell } from "../world/regionalLandmarks.ts";
import { BUILDINGS } from "../world/village.ts";
import { SOUTH_CITY, SOUTH_CITY_PROPS } from "../world/southCity.ts";
import { generateChunkCanvas } from "./terrain.ts";
import type { Scenery } from "./scenery.ts";
interface ChunkVisual {
  canvas: HTMLCanvasElement;
  props: Scenery[];
  water: Array<{ x: number; y: number; phase: number }>;
  /** Linhas de margem onde a água encontra terra, para a espuma animada. */
  foam: Array<{ x1: number; y1: number; x2: number; y2: number; phase: number; nx: number; ny: number }>;
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
      water: ChunkVisual["water"] = [],
      foam: ChunkVisual["foam"] = [];
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
        if (tile.ground === "water") {
          water.push({
            x: tx * TILE_SIZE + 8,
            y: ty * TILE_SIZE + 13,
            phase: tile.decoration * 6,
          });
          const x0 = tx * TILE_SIZE, y0 = ty * TILE_SIZE, p = tile.decoration * 9;
          const S = TILE_SIZE;
          if (getTile(tx, ty - 1, this.seed).ground !== "water")
            foam.push({ x1: x0, y1: y0 + 1, x2: x0 + S, y2: y0 + 1, phase: p, nx: 0, ny: -1 });
          if (getTile(tx, ty + 1, this.seed).ground !== "water")
            foam.push({ x1: x0, y1: y0 + S - 1, x2: x0 + S, y2: y0 + S - 1, phase: p + 2, nx: 0, ny: 1 });
          if (getTile(tx - 1, ty, this.seed).ground !== "water")
            foam.push({ x1: x0 + 1, y1: y0, x2: x0 + 1, y2: y0 + S, phase: p + 4, nx: -1, ny: 0 });
          if (getTile(tx + 1, ty, this.seed).ground !== "water")
            foam.push({ x1: x0 + S - 1, y1: y0, x2: x0 + S - 1, y2: y0 + S, phase: p + 6, nx: 1, ny: 0 });
        }
      }
    const regional = getRegionalLandmarkForCell(
      Math.floor(cx * CHUNK_TILES / LANDMARK_CELL_TILES),
      Math.floor(cy * CHUNK_TILES / LANDMARK_CELL_TILES), this.seed,
    );
    if (regional && Math.floor(regional.tileX / CHUNK_TILES) === cx &&
        Math.floor(regional.tileY / CHUNK_TILES) === cy)
      props.push({ kind: "regional-landmark", landmarkKind: regional.kind,
        x: regional.x, y: regional.y, variant: regional.variant });
    const result = {
      canvas: generateChunkCanvas(cx, cy, this.seed),
      props,
      water,
      foam,
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
          // Espuma que avança e recua na margem.
          ctx.lineWidth = 1.6;
          ctx.lineCap = "round";
          for (const f of chunk.foam) {
            const pulse = Math.sin(time * 1.3 + f.phase);
            const push = pulse * 1.3;
            const horizontal = f.y1 === f.y2;
            const ox = push * f.nx, oy = push * f.ny;
            ctx.strokeStyle = "rgba(236,248,238," + (0.2 + 0.22 * (pulse * 0.5 + 0.5)).toFixed(3) + ")";
            ctx.beginPath();
            const steps = 4;
            for (let i = 0; i <= steps; i++) {
              const k = i / steps;
              const wob = Math.sin(time * 2 + f.phase + i * 1.7) * 0.9;
              const px = f.x1 + (f.x2 - f.x1) * k + (horizontal ? 0 : wob) + ox - left;
              const py = f.y1 + (f.y2 - f.y1) * k + (horizontal ? wob : 0) + oy - top;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          ctx.lineCap = "butt";
          // Ondulações e cintilações sobre a água.
          ctx.strokeStyle = "#c8e1bf55";
          ctx.lineWidth = 0.9;
          for (const spot of chunk.water) {
            const wave = Math.sin(time * 1.5 + spot.phase);
            if (wave >= 0.4) {
              ctx.globalAlpha = (wave - 0.4) * 0.8;
              ctx.beginPath();
              ctx.moveTo(spot.x - left, spot.y - top + wave * 2);
              ctx.quadraticCurveTo(spot.x - left + 5, spot.y - top + wave * 2 - 1.4, spot.x - left + 9 + wave * 4, spot.y - top + wave * 2);
              ctx.stroke();
            }
            const glint = Math.sin(time * 2.3 + spot.phase * 3.1);
            if (glint > 0.93) {
              const gx = spot.x - left + 12, gy = spot.y - top + 6, s = (glint - 0.93) * 55;
              ctx.globalAlpha = Math.min(1, (glint - 0.93) * 14);
              ctx.fillStyle = "#f7ffee";
              ctx.beginPath();
              ctx.moveTo(gx, gy - s); ctx.lineTo(gx + s * 0.28, gy); ctx.lineTo(gx, gy + s); ctx.lineTo(gx - s * 0.28, gy);
              ctx.closePath(); ctx.fill();
              ctx.fillRect(gx - s, gy - 0.4, s * 2, 0.8);
            }
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
    for (const b of BUILDINGS)
      if (b.x > left - 60 && b.x < right + 60 && b.y > top - 110 && b.y < bottom + 20)
        result.push({ kind: "house", x: b.x, y: b.y, variant: b.variant });
    // O custo é fixo e o distrito não existe na câmera de outras regiões.
    const centerY=(SOUTH_CITY.centerY+.5)*TILE_SIZE;
    if (Math.abs(cameraX)<1800 && Math.abs(cameraY-centerY)<1800)
      for (const prop of SOUTH_CITY_PROPS)
        if (prop.x>left-135&&prop.x<right+135&&prop.y>top-155&&prop.y<bottom+45)
          result.push({kind:"south-city",cityKind:prop.kind,
            ...(prop.id?{cityId:prop.id}:{}),x:prop.x,y:prop.y,variant:prop.variant});
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
