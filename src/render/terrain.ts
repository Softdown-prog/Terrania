import {
  CHUNK_PIXELS,
  CHUNK_TILES,
  getTile,
  TILE_SIZE,
  type Ground,
  type Tile,
} from "../world/terrain.ts";
import { hash2, valueNoise } from "../world/random.ts";
import { ellipse, mix, TAU } from "./draw.ts";
import { VILLAGE_RESPAWN } from "../world/village.ts";

/** Pares (sombra, luz) por tipo de solo; a mistura segue ruído contínuo. */
const PALETTE: Record<Ground, { lo: string; hi: string }> = {
  grass: { lo: "#648a58", hi: "#86a968" },
  forest: { lo: "#456447", hi: "#5d8056" },
  path: { lo: "#a48f69", hi: "#c3af86" },
  sand: { lo: "#b4a97e", hi: "#cfc59a" },
  water: { lo: "#2c6068", hi: "#3d7e83" },
};
const WATER_DEEP = "#265867", WATER_MID = "#337279", WATER_SHALLOW = "#4f9a96";
const PAD = 2;
const SPAN = CHUNK_TILES + PAD * 2;

class Grid {
  private readonly tiles: Tile[] = [];
  constructor(private readonly cx: number, private readonly cy: number, private readonly seed: number) {
    for (let y = -PAD; y < CHUNK_TILES + PAD; y++)
      for (let x = -PAD; x < CHUNK_TILES + PAD; x++)
        this.tiles.push(getTile(cx * CHUNK_TILES + x, cy * CHUNK_TILES + y, seed));
  }
  /** Coordenadas locais ao chunk, de -PAD a CHUNK_TILES+PAD-1. */
  at(x: number, y: number): Tile {
    const ix = Math.max(-PAD, Math.min(CHUNK_TILES + PAD - 1, x)) + PAD;
    const iy = Math.max(-PAD, Math.min(CHUNK_TILES + PAD - 1, y)) + PAD;
    return this.tiles[iy * SPAN + ix] as Tile;
  }
  /** Distância em tiles (1..3) até a terra mais próxima, para água. */
  shore(x: number, y: number): number {
    for (let r = 1; r <= 2; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (Math.max(Math.abs(dx), Math.abs(dy)) === r && this.at(x + dx, y + dy).ground !== "water") return r;
    return 3;
  }
  global(x: number, y: number): [number, number] {
    return [this.cx * CHUNK_TILES + x, this.cy * CHUNK_TILES + y];
  }
  get worldSeed(): number { return this.seed; }
}

function drawGround(ctx: CanvasRenderingContext2D, grid: Grid, lx: number, ly: number, x: number, y: number, seed: number): void {
  const tile = grid.at(lx, ly);
  const [tx, ty] = grid.global(lx, ly);
  const p = PALETTE[tile.ground];
  // Ruído em duas escalas: manchas largas e variação fina.
  const n = valueNoise(tx / 6, ty / 6, seed + 17) * 0.65 + valueNoise(tx / 1.8, ty / 1.8, seed + 23) * 0.35;
  let color = mix(p.lo, p.hi, n);
  if (tile.ground === "water") {
    const d = grid.shore(lx, ly);
    color = mix(d === 1 ? WATER_SHALLOW : d === 2 ? WATER_MID : WATER_DEEP, mix(p.lo, p.hi, n), 0.35);
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];

function blade(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * 0.3, y - h * 0.6, x + lean, y - h);
  ctx.stroke();
}

function drawDetails(ctx: CanvasRenderingContext2D, grid: Grid, lx: number, ly: number, x: number, y: number, seed: number): void {
  const tile = grid.at(lx, ly);
  const [tx, ty] = grid.global(lx, ly);
  const r = (i: number): number => hash2(tx * 31 + i * 7, ty * 17 + i * 3, seed + 1000 + i);
  const neighbours = DIRS.map(([dx, dy]) => grid.at(lx + dx, ly + dy).ground);

  // Salpicos de luz e terra: dão grão ao solo sem repetir padrão.
  for (let i = 0; i < 7; i++) {
    const a = r(i), b = r(i + 20);
    ctx.fillStyle = i % 2 ? "rgba(247,237,191,.1)" : "rgba(22,46,39,.1)";
    ctx.fillRect(x + 3 + a * 26, y + 3 + b * 26, 1 + a * 2.6, 1 + b * 1.4);
  }

  if (tile.ground === "water") {
    const d = grid.shore(lx, ly);
    ctx.strokeStyle = "rgba(160,222,214,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      const wx = x + 4 + r(40 + i) * 14, wy = y + 6 + r(50 + i) * 20;
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 5, wy - 2, wx + 10, wy);
      ctx.quadraticCurveTo(wx + 15, wy + 2, wx + 19, wy);
    }
    ctx.stroke();
    // Faixas escuras nas águas profundas e margem rasa clara.
    if (d >= 3) {
      ctx.fillStyle = "rgba(8,36,52,.12)";
      ctx.beginPath(); ctx.ellipse(x + 16, y + 17, 12 + r(60) * 4, 6, r(61), 0, TAU); ctx.fill();
    }
    DIRS.forEach(([dx, dy], k) => {
      if (neighbours[k] === "water") return;
      const g = dx
        ? ctx.createLinearGradient(x + (dx > 0 ? 32 : 0), 0, x + (dx > 0 ? 22 : 10), 0)
        : ctx.createLinearGradient(0, y + (dy > 0 ? 32 : 0), 0, y + (dy > 0 ? 22 : 10));
      g.addColorStop(0, "rgba(206,224,170,.52)");
      g.addColorStop(1, "rgba(206,224,170,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    });
    if (d === 1 && r(70) > 0.93) {
      // vitória-régia
      const px = x + 8 + r(71) * 16, py = y + 8 + r(72) * 16;
      ctx.fillStyle = "#4d8a4a";
      ctx.beginPath(); ctx.arc(px, py, 4.4, 0.4, TAU - 0.1); ctx.lineTo(px, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.fillRect(px - 2, py - 3, 3, 1);
      if (r(73) > 0.5) ellipse(ctx, px + 1, py - 1, 1.5, 1.3, "#f5d6df");
    }
    return;
  }

  // Margem: areia molhada ao tocar água; juncos na terra.
  neighbours.forEach((g, k) => {
    if (g !== "water") return;
    const [dx, dy] = DIRS[k] as readonly [number, number];
    const wet = dx
      ? ctx.createLinearGradient(x + (dx > 0 ? 32 : 0), 0, x + (dx > 0 ? 24 : 8), 0)
      : ctx.createLinearGradient(0, y + (dy > 0 ? 32 : 0), 0, y + (dy > 0 ? 24 : 8));
    wet.addColorStop(0, "rgba(46,74,66,.34)");
    wet.addColorStop(1, "rgba(46,74,66,0)");
    ctx.fillStyle = wet;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    if (tile.ground !== "path" && r(80 + k) > 0.55) {
      // junco com espiga
      const bx = dx ? x + (dx > 0 ? 25 : 7) : x + 6 + r(85 + k) * 20;
      const by = dy ? y + (dy > 0 ? 27 : 7) : y + 10 + r(86 + k) * 16;
      for (let i = 0; i < 4; i++) {
        const lean = (i - 1.5) * 1.8;
        blade(ctx, bx + i * 1.7, by, 11 + (i % 2) * 4, lean, i % 2 ? "#6d8a44" : "#4d7640");
      }
      ctx.fillStyle = "#6a4a32";
      ctx.fillRect(bx + 3.2, by - 15, 1.8, 5);
    }
  });

  if (tile.ground === "grass" || tile.ground === "forest") {
    const forest = tile.ground === "forest";
    const dark = forest ? "#2f4f3e" : "#3d6a45", mid = forest ? "#4a6f48" : "#5e8d4d", lite = forest ? "#86a468" : "#a9c97a";
    for (let i = 0; i < 6; i++) {
      const gx = x + 4 + r(i + 90) * 24, gy = y + 8 + r(i + 100) * 20;
      const cols = [dark, mid, lite];
      for (let k = 0; k < 3; k++) {
        blade(ctx, gx + k * 1.5 - 1.5, gy, 4 + r(i * 3 + k + 110) * 4, (k - 1) * 2.2 + (r(i + 120) - 0.5) * 2, cols[(i + k) % 3] ?? mid);
      }
    }
    if (!tile.tree && !tile.rock) {
      const rnd = r(130);
      if (!forest && rnd > 0.82) {
        // flores silvestres
        const palette = ["#f3efe0", "#f2d96a", "#e88aa0", "#a58be0", "#f09a5a"];
        const col = palette[Math.floor(r(131) * palette.length)] ?? "#f3efe0";
        for (let i = 0; i < 3; i++) {
          const fx = x + 6 + r(140 + i) * 20, fy = y + 10 + r(150 + i) * 16;
          ctx.strokeStyle = "#3f6c3f"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(fx, fy + 3); ctx.lineTo(fx, fy); ctx.stroke();
          ctx.fillStyle = col;
          for (let p = 0; p < 4; p++) {
            ctx.beginPath(); ctx.arc(fx + Math.cos(p * 1.57) * 1.5, fy + Math.sin(p * 1.57) * 1.5, 1.1, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = "#f6c94a"; ctx.fillRect(fx - 0.5, fy - 0.5, 1, 1);
        }
      } else if (!forest && rnd < 0.1) {
        ctx.fillStyle = "rgba(66,118,66,.8)";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(x + 10 + i * 5, y + 18 + Math.sin(i * 3) * 4, 2.2, 0, TAU); ctx.fill();
        }
      } else if (forest && rnd > 0.9) {
        // cogumelos
        const mx = x + 8 + r(160) * 16, my = y + 14 + r(161) * 10;
        ctx.fillStyle = "#e9e0c8"; ctx.fillRect(mx - 0.8, my, 1.6, 3);
        ellipse(ctx, mx, my, 3, 2, "#c9503f");
        ctx.fillStyle = "#f6e9d0"; ctx.fillRect(mx - 1, my - 1, 1, 1); ctx.fillRect(mx + 1, my - 0.5, 1, 1);
      } else if (forest && rnd < 0.35) {
        for (let i = 0; i < 4; i++)
          ellipse(ctx, x + 5 + r(170 + i) * 22, y + 6 + r(180 + i) * 22, 1.8, 1, i % 2 ? "rgba(176,128,62,.55)" : "rgba(196,92,48,.45)", r(190 + i) * 3);
      }
    }
  } else if (tile.ground === "path") {
    // seixos e marcas de roda
    ctx.strokeStyle = "rgba(92,72,48,.18)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y + 11 + r(200) * 3); ctx.lineTo(x + 32, y + 11 + r(201) * 3);
    ctx.moveTo(x, y + 22 + r(202) * 3); ctx.lineTo(x + 32, y + 22 + r(203) * 3); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const px = x + 3 + r(210 + i) * 26, py = y + 4 + r(220 + i) * 24, rs = 1 + r(230 + i) * 1.6;
      ellipse(ctx, px + 0.5, py + 0.8, rs, rs * 0.7, "rgba(60,44,28,.28)");
      ellipse(ctx, px, py, rs, rs * 0.75, i % 2 ? "#d9cba6" : "#9c8963");
    }
    // grama avançando sobre a trilha nas bordas
    DIRS.forEach(([dx, dy], k) => {
      const g = neighbours[k];
      if (g === "path" || g === "water" || g === "sand") return;
      for (let i = 0; i < 6; i++) {
        const t = 3 + i * 5 + r(240 + i + k * 6) * 2;
        const bx = dx ? x + (dx > 0 ? 31 : 1) : x + t, by = dy ? y + (dy > 0 ? 31 : 1) : y + t;
        blade(ctx, bx, by, 3 + r(250 + i) * 3, (dx ? -dx : (r(260 + i) - 0.5) * 3) * 2, i % 2 ? "#4f7d44" : "#78a257");
      }
      ctx.fillStyle = "rgba(60,44,28,.12)";
      ctx.fillRect(dx > 0 ? x + 29 : x, dy > 0 ? y + 29 : y, dx ? 3 : 32, dy ? 3 : 32);
    });
  } else if (tile.ground === "sand") {
    ctx.strokeStyle = "rgba(124,108,70,.2)"; ctx.lineWidth = 1;
    for (let i = 0; i < 2; i++) {
      const sx = x + 3 + r(270 + i) * 10, sy = y + 8 + r(272 + i) * 18;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 7, sy - 2.4, sx + 14, sy); ctx.stroke();
    }
    if (r(280) > 0.82) {
      ellipse(ctx, x + 8 + r(281) * 16, y + 8 + r(282) * 16, 1.8, 1.2, "#e9dfc3");
      ctx.fillStyle = "rgba(60,44,28,.2)"; ctx.fillRect(x + 12, y + 20, 2, 1);
    }
    if (r(283) > 0.9) {
      // concha
      const cx = x + 8 + r(284) * 16, cy = y + 10 + r(285) * 12;
      ellipse(ctx, cx, cy, 2.4, 1.8, "#f1e2d0"); ctx.strokeStyle = "rgba(160,110,90,.5)";
      ctx.beginPath(); ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 2, cy); ctx.stroke();
    }
  }

  if (tile.tree || tile.rock) {
    // Sombra projetada para sudeste: luz vinda de noroeste.
    ctx.save();
    ctx.translate(x + 21, y + 24);
    ctx.rotate(-0.18);
    const rx = tile.tree ? 26 : 16;
    ctx.scale(1, 0.36);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
    g.addColorStop(0, "rgba(14,36,28,.42)"); g.addColorStop(0.7, "rgba(14,36,28,.24)"); g.addColorStop(1, "rgba(14,36,28,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.restore();
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
  const grid = new Grid(cx, cy, seed);
  for (let y = -1; y <= CHUNK_TILES; y++)
    for (let x = -1; x <= CHUNK_TILES; x++)
      drawGround(ground, grid, x, y, (x + 1) * TILE_SIZE, (y + 1) * TILE_SIZE, seed);
  // Padding uses global neighboring tiles, preventing seams at chunk boundaries.
  ctx.filter = "blur(4px)";
  ctx.drawImage(padded, -TILE_SIZE, -TILE_SIZE);
  ctx.filter = "none";
  for (let y = 0; y < CHUNK_TILES; y++)
    for (let x = 0; x < CHUNK_TILES; x++)
      drawDetails(ctx, grid, x, y, x * TILE_SIZE, y * TILE_SIZE, seed);
  return canvas;
}


/** Janela de 31×31 tiles do mesmo mundo procedural, norte para cima.
 * Desenho simples e barato, independente do cache gráfico dos chunks.
 */
export function drawMiniMap(ctx: CanvasRenderingContext2D,
  centerX: number, centerY: number, seed: number): void {
  const size = 31;
  const cell = 4;
  const startX = Math.floor(centerX) - 15;
  const startY = Math.floor(centerY) - 15;
  const colors: Record<Ground, string> = {
    grass: "#789b62", forest: "#3c6647", path: "#baa780",
    sand: "#d8c894", water: "#286e87",
  };
  ctx.clearRect(0, 0, size * cell, size * cell);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const tile = getTile(startX + x, startY + y, seed);
      ctx.fillStyle = colors[tile.ground];
      ctx.fillRect(x * cell, y * cell, cell, cell);
      if (tile.tree || tile.rock) {
        ctx.fillStyle = tile.tree ? "#203d30" : "#5b574f";
        ctx.fillRect(x * cell + 1, y * cell + 1, 2, 2);
      }
    }
  // A Vila da Travessia é uma referência geográfica verdadeira, não um ponto inventado.
  const villageX = Math.floor(VILLAGE_RESPAWN.x / TILE_SIZE) - startX;
  const villageY = Math.floor(VILLAGE_RESPAWN.y / TILE_SIZE) - startY;
  if (villageX >= 0 && villageX < size && villageY >= 0 && villageY < size) {
    ctx.fillStyle = "#ffe0a1";
    ctx.fillRect(villageX * cell, villageY * cell, cell, cell);
  }
  // Centro do mapa: posição real do herói, inclusive snapshots autoritativos da sala.
  ctx.fillStyle = "#102d41";
  ctx.fillRect(58, 58, 8, 8);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(60, 60, 4, 4);
}
