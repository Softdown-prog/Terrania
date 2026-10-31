import {
  CHUNK_PIXELS,
  CHUNK_TILES,
  getTile,
  TILE_SIZE,
  type Ground,
  type Tile,
} from "../world/terrain.ts";
import { hash2, valueNoise } from "../world/random.ts";

const colors: Record<Ground, string> = {
  grass: "#739364",
  forest: "#506f50",
  path: "#af9b74",
  sand: "#b7ae84",
  water: "#326a70",
};
function drawGround(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  x: number,
  y: number,
  tx: number,
  ty: number,
  seed: number,
): void {
  ctx.fillStyle = colors[tile.ground];
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // Large patches give the ground continuity; tiny seeded marks supply texture.
  const shade = valueNoise(tx / 5, ty / 5, seed + 17);
  ctx.fillStyle = shade < 0.5 ? "rgba(13,40,30,.10)" : "rgba(235,224,161,.09)";
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  // The padded ground pass is softened before crisp plants and stones are added.
  if (tile.ground === "water") {
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      if (getTile(tx + dx, ty + dy, seed).ground === "water") continue;
      ctx.fillStyle = "#9aaf89";
      ctx.globalAlpha = 0.35;
      ctx.fillRect(
        x + (dx > 0 ? 29 : 0),
        y + (dy > 0 ? 29 : 0),
        dx ? 3 : 32,
        dy ? 3 : 32,
      );
      ctx.globalAlpha = 1;
    }
  }
}
function drawDetails(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  x: number,
  y: number,
  tx: number,
  ty: number,
  seed: number,
): void {
  const rnd = hash2(tx, ty, seed + 313);
  for (let i = 0; i < 9; i++) {
    const a = hash2(tx * 13 + i, ty * 11, seed + 321);
    const b = hash2(tx * 11, ty * 13 + i, seed + 322);
    ctx.fillStyle = i % 2 ? "#f7edbf19" : "#162e2717";
    ctx.fillRect(x + a * 30, y + b * 30, 1 + a * 3, 1 + b);
  }
  if (tile.ground === "water") {
    ctx.strokeStyle = "#7ab7b13b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 10 + rnd * 8);
    ctx.lineTo(x + 15, y + 10 + rnd * 8);
    ctx.moveTo(x + 18, y + 26);
    ctx.lineTo(x + 26, y + 26);
    ctx.stroke();
    return;
  }
  if (tile.ground === "grass" || tile.ground === "forest") {
    for (let i = 0; i < 3; i++) {
      const gx = x + 4 + hash2(tx + i * 43, ty, seed) * 24;
      const gy = y + 6 + hash2(tx, ty + i * 11, seed) * 22;
      ctx.strokeStyle = i % 2 ? "#b4c18380" : "#3b624c88";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - 2, gy);
      ctx.lineTo(gx - 3, gy - 3);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx, gy - 5);
      ctx.lineTo(gx + 1, gy - 6);
      ctx.moveTo(gx + 2, gy);
      ctx.lineTo(gx + 4, gy - 3);
      ctx.stroke();
    }
    if (!tile.tree && rnd > 0.88) {
      ctx.fillStyle = rnd > 0.96 ? "#e4d7a6" : "#a3bca7";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(
          x + 8 + i * 6,
          y + 14 + Math.sin(i * 3) * 5,
          1.4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
  if (tile.tree || tile.rock) {
    ctx.fillStyle = "#16382c30";
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 23, tile.tree ? 22 : 14, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
/** Static terrain is rasterized once per chunk. No downloaded image assets. */
export function generateChunkCanvas(
  cx: number,
  cy: number,
  seed: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CHUNK_PIXELS;
  canvas.height = CHUNK_PIXELS;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível.");
  const padded = document.createElement("canvas");
  padded.width = padded.height = CHUNK_PIXELS + TILE_SIZE * 2;
  const ground = padded.getContext("2d");
  if (!ground) throw new Error("Canvas 2D indisponível.");
  for (let y = -1; y <= CHUNK_TILES; y++)
    for (let x = -1; x <= CHUNK_TILES; x++) {
      const tx = cx * CHUNK_TILES + x,
        ty = cy * CHUNK_TILES + y;
      drawGround(
        ground,
        getTile(tx, ty, seed),
        (x + 1) * TILE_SIZE,
        (y + 1) * TILE_SIZE,
        tx,
        ty,
        seed,
      );
    }
  // Padding uses global neighboring tiles, preventing seams at chunk boundaries.
  ctx.filter = "blur(4px)";
  ctx.drawImage(padded, -TILE_SIZE, -TILE_SIZE);
  ctx.filter = "none";
  for (let y = 0; y < CHUNK_TILES; y++)
    for (let x = 0; x < CHUNK_TILES; x++) {
      const tx = cx * CHUNK_TILES + x,
        ty = cy * CHUNK_TILES + y;
      drawDetails(
        ctx,
        getTile(tx, ty, seed),
        x * TILE_SIZE,
        y * TILE_SIZE,
        tx,
        ty,
        seed,
      );
    }
  return canvas;
}
