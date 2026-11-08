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
/** Cardinal shoreline bits: north 1, east 2, south 4, west 8.
 * Samples global tile coordinates so a river edge continues across chunks.
 * Visual-only: no changes to walkability or water collision.
 */
export function waterShoreMask(tx: number, ty: number, seed: number): number {
  if (getTile(tx, ty, seed).ground !== "water") return 0;
  return (getTile(tx, ty - 1, seed).ground !== "water" ? 1 : 0)
    | (getTile(tx + 1, ty, seed).ground !== "water" ? 2 : 0)
    | (getTile(tx, ty + 1, seed).ground !== "water" ? 4 : 0)
    | (getTile(tx - 1, ty, seed).ground !== "water" ? 8 : 0);
}
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
    const shore = waterShoreMask(tx, ty, seed);
    if (shore) {
      // Two translucent depths and an irregular foam trace stay inside the
      // water tile. The padded blur blends land and water beneath this pass.
      ctx.fillStyle = "#8bbba64a";
      if (shore & 1) ctx.fillRect(x, y, TILE_SIZE, 6);
      if (shore & 2) ctx.fillRect(x + TILE_SIZE - 6, y, 6, TILE_SIZE);
      if (shore & 4) ctx.fillRect(x, y + TILE_SIZE - 6, TILE_SIZE, 6);
      if (shore & 8) ctx.fillRect(x, y, 6, TILE_SIZE);
      ctx.fillStyle = "#d6e9b35c";
      if (shore & 1) ctx.fillRect(x, y, TILE_SIZE, 2);
      if (shore & 2) ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
      if (shore & 4) ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
      if (shore & 8) ctx.fillRect(x, y, 2, TILE_SIZE);

      const bend = (hash2(tx, ty, seed + 873) - 0.5) * 3;
      ctx.strokeStyle = "#e6ebc875";
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (shore & 1) {
        ctx.moveTo(x + 2, y + 3);
        ctx.quadraticCurveTo(x + 16, y + 3 + bend, x + 30, y + 3);
      }
      if (shore & 2) {
        ctx.moveTo(x + 29, y + 2);
        ctx.quadraticCurveTo(x + 29 - bend, y + 16, x + 29, y + 30);
      }
      if (shore & 4) {
        ctx.moveTo(x + 2, y + 29);
        ctx.quadraticCurveTo(x + 16, y + 29 - bend, x + 30, y + 29);
      }
      if (shore & 8) {
        ctx.moveTo(x + 3, y + 2);
        ctx.quadraticCurveTo(x + 3 + bend, y + 16, x + 3, y + 30);
      }
      ctx.stroke();
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
  if (tile.ground === "path" || tile.ground === "sand") {
    // Sparse, deterministic gravel adds scale to open ground without
    // introducing sprites or any per-frame noise calculation.
    const path = tile.ground === "path";
    for (let i = 0; i < (path ? 4 : 2); i++) {
      const px = x + 3 + hash2(tx * 7 + i, ty, seed + 415) * 26;
      const py = y + 3 + hash2(tx, ty * 11 + i, seed + 416) * 26;
      ctx.fillStyle = i % 2
        ? (path ? "#e1d4ac7d" : "#ddd4ad72")
        : (path ? "#6f68524f" : "#817f6149");
      ctx.beginPath();
      ctx.ellipse(px, py, 1.4 + (i % 2), 0.8 + (i % 3) * 0.25, -0.3, 0, Math.PI * 2);
      ctx.fill();
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
