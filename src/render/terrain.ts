import {
  CHUNK_PIXELS,
  CHUNK_TILES,
  getTile,
  TILE_SIZE,
  type Ground,
  type Tile,
} from "../world/terrain.ts";
import { hash2, valueNoise } from "../world/random.ts";
import { ellipse, mix, TAU, blade } from "./draw.ts";
import { southCityGroundColors, paintSouthCityPaving } from "./southCityArt.ts";
import { VILLAGE_RESPAWN } from "../world/village.ts";
import { southCityGround, southCitySafe } from "../world/southCity.ts";
import { atlasFrame, type AtlasScale, WORLD_HALF_TILES } from "../world/atlas.ts";
import type { Biome } from "../world/biomes.ts";
import { LANDMARK_CELL_TILES, getRegionalLandmarkForCell } from "../world/regionalLandmarks.ts";
import { buildRoadMask, drawRoadStones, drawRoadVerge, drawWheelRut, planRoadTile, quantizeVariation, roadProfile, roadSprite,
  type RoadMask, type RoadPiece } from "./roads/index.ts";
import { blackLakeLayerCanvas } from "./south/terrain/blackLake/index.ts";
import { DUNES_LOOK, HARDPAN_LOOK, duneReliefCanvas } from "./south/terrain/dunes/index.ts";
import { southRuinsInArea } from "../world/southRuins.ts";
import { southTowersInArea } from "../world/towers/placement.ts";
import { caveEntrancesInArea } from "../world/caves.ts";

/** Pares (sombra, luz) por tipo de solo; a mistura segue ruído contínuo. */
const PALETTE: Record<Ground, { lo: string; hi: string }> = {
  grass: { lo: "#648a58", hi: "#86a968" },
  forest: { lo: "#456447", hi: "#5d8056" },
  path: { lo: "#a48f69", hi: "#c3af86" },
  sand: { lo: "#b4a97e", hi: "#cfc59a" },
  water: { lo: "#2c6068", hi: "#3d7e83" },
};
/** Same biome key produced by the shared engine; only color belongs to render. */
const BIOME_PALETTE: Partial<Record<Biome, { lo: string; hi: string }>> = {
  tundra: { lo: "#889d91", hi: "#b3c7c0" },
  snowfield: { lo: "#cadce2", hi: "#f0f3ec" },
  "frozen-lake": { lo: "#7db4c7", hi: "#b8d9e4" },
  "black-lake": { lo: "#121a23", hi: "#22313c" },
  dunes: { lo: "#cfac63", hi: "#eed28a" },
  ruins: { lo: "#a99577", hi: "#c7b38b" },
  oasis: { lo: "#668c60", hi: "#96ae7b" },
  beach: { lo: "#d9bd8f", hi: "#edd9b0" },
  island: { lo: "#b8b98d", hi: "#d9d4a8" },
  "open-sea": { lo: "#1d526d", hi: "#327d9b" },
  highlands: { lo: "#6a736f", hi: "#9a9b86" },
  "stone-peak": { lo: "#686d77", hi: "#a5a8aa" },
  volcanic: { lo: "#4e4d50", hi: "#78625e" },
};
const WATER_DEEP = "#265867", WATER_MID = "#337279", WATER_SHALLOW = "#4f9a96";
const PAD = 2;
const SPAN = CHUNK_TILES + PAD * 2;

class Grid {
  private readonly tiles: Tile[] = [];
  private readonly cx: number;
  private readonly cy: number;
  private readonly seed: number;
  private roads: RoadMask | null = null;
  constructor(cx: number, cy: number, seed: number) {
    this.cx = cx; this.cy = cy; this.seed = seed;
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
  /** Máscara de estrada do chunk e da vizinhança (ADR 0034), montada só na primeira vez que um tile de estrada pede. */
  roadMask(): RoadMask {
    this.roads ??= buildRoadMask(this.cx, this.cy, CHUNK_TILES, (tx, ty) => getTile(tx, ty, this.seed).ground === "path");
    return this.roads;
  }
  global(x: number, y: number): [number, number] {
    return [this.cx * CHUNK_TILES + x, this.cy * CHUNK_TILES + y];
  }
  get worldSeed(): number { return this.seed; }
}

function drawGround(ctx: CanvasRenderingContext2D, grid: Grid, lx: number, ly: number, x: number, y: number, seed: number): void {
  const tile = grid.at(lx, ly);
  const [tx, ty] = grid.global(lx, ly);
  const south = southCityGround(tx,ty)!==null;
  const p = south ? southCityGroundColors(tile.ground) :
    BIOME_PALETTE[tile.biome] ?? PALETTE[tile.ground];
  // Ruído em duas escalas: manchas largas e variação fina.
  const n = valueNoise(tx / 6, ty / 6, seed + 17) * 0.65 + valueNoise(tx / 1.8, ty / 1.8, seed + 23) * 0.35;
  let color = mix(p.lo, p.hi, n);
  if (tile.ground === "water") {
    const d = grid.shore(lx, ly);
    // Lago negro: sob a água fica lama (ADR 0039); a camada do lago desenha a água por cima, com a costa orgânica, e onde
    // ela recua dentro de um tile de água é a lama que aparece, nunca uma escada escura.
    color = tile.biome === "black-lake"
      ? mix("#3a2e24", "#4a3a2c", n) :
      tile.biome === "frozen-lake" || tile.biome === "open-sea" ? mix(p.lo, p.hi, n) :
      mix(d === 1 ? WATER_SHALLOW : d === 2 ? WATER_MID : WATER_DEEP, mix(p.lo, p.hi, n), 0.35);
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]];

/** Água do lago negro: ondas arroxeadas, mancha oleosa nas partes fundas e galhos afogados no raso. */
function drawBlackWater(ctx: CanvasRenderingContext2D, grid: Grid, lx: number, ly: number,
  x: number, y: number, r: (i: number) => number): void {
  const d = grid.shore(lx, ly);
  // Ondas só longe da margem: junto dela a costa é orgânica e um traço de tile passaria da água para a lama.
  if (d >= 2) {
    ctx.strokeStyle = "rgba(150,120,196,.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 2; i++) {
      const wx = x + 4 + r(40 + i) * 14, wy = y + 6 + r(50 + i) * 20;
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 5, wy - 2, wx + 10, wy);
      ctx.quadraticCurveTo(wx + 15, wy + 2, wx + 19, wy);
    }
    ctx.stroke();
  }
  if (d >= 2 && r(66) > 0.6) {
    // mancha oleosa rara, de posição e giro variados, do roxo ao verde-veneno e bem fraca
    const px = x + 6 + r(63) * 20, py = y + 6 + r(64) * 20;
    const sheen = ctx.createLinearGradient(px - 10, py - 4, px + 10, py + 4);
    sheen.addColorStop(0, "rgba(120,80,190,.12)"); sheen.addColorStop(0.55, "rgba(70,150,150,.07)");
    sheen.addColorStop(1, "rgba(120,200,90,.09)");
    ctx.fillStyle = sheen;
    ctx.beginPath(); ctx.ellipse(px, py, 7 + r(60) * 8, 2.6 + r(61) * 3, r(62) * 3, 0, TAU); ctx.fill();
  }
  if (d === 1 && r(70) > 0.9) {
    // galho afogado
    const px = x + 8 + r(71) * 16, py = y + 10 + r(72) * 12;
    ctx.strokeStyle = "#3a2f27"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 6, py - 5); ctx.moveTo(px + 3, py - 2.5); ctx.lineTo(px + 7, py + 1); ctx.stroke();
  }
}
/** Margem de terra junto ao lago negro: juncos secos e tortos (a lama molhada vem da camada do lago, ADR 0039). */
function drawBlackShore(ctx: CanvasRenderingContext2D, x: number, y: number, k: number,
  dx: number, dy: number, r: (i: number) => number): void {
  if (r(80 + k) > 0.45) {
    const bx = dx ? x + (dx > 0 ? 24 : 8) : x + 6 + r(85 + k) * 20;
    const by = dy ? y + (dy > 0 ? 26 : 8) : y + 10 + r(86 + k) * 16;
    for (let i = 0; i < 4; i++) {
      const lean = (i - 1.5) * 2.4 + (r(90 + i) - 0.5) * 3;
      blade(ctx, bx + i * 1.7, by, 9 + (i % 2) * 5, lean, i % 2 ? "#6d6544" : "#4a4332");
    }
  }
}

/**
 * Pinta uma peça de estrada no tile (x, y). Marcas de roda variam de forma contínua e vão direto; pedras e
 * bordas variam em poucos níveis e saem de sprites em cache (ADR 0034).
 */
function paintRoadPiece(ctx: CanvasRenderingContext2D, piece: RoadPiece, x: number, y: number): void {
  if (piece.kind === "rut") { drawWheelRut(ctx, piece, x, y); return; }
  const variation = quantizeVariation(piece.variation);
  if (piece.kind === "stones") {
    const sprite = roadSprite(`stones:${piece.surface}:${variation}`, 48, 48,
      c => drawRoadStones(c, { ...piece, x: 24, y: 24, variation }, 0, 0));
    if (sprite) ctx.drawImage(sprite, Math.round(x + piece.x - 24), Math.round(y + piece.y - 24));
    else drawRoadStones(ctx, piece, x, y);
    return;
  }
  const sprite = roadSprite(`verge:${piece.edge}:${piece.side}:${variation}`, 32, 32,
    c => drawRoadVerge(c, { ...piece, variation }, 0, 0));
  if (sprite) ctx.drawImage(sprite, x, y);
  else drawRoadVerge(ctx, piece, x, y);
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

  if (southCitySafe(tx,ty) && tile.ground==="path") {
    paintSouthCityPaving(ctx,x,y,r);
    return;
  }
  if (tile.ground === "water" && tile.biome === "black-lake") {
    drawBlackWater(ctx, grid, lx, ly, x, y, r);
    return;
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
    if (grid.at(lx + dx, ly + dy).biome === "black-lake") { drawBlackShore(ctx, x, y, k, dx, dy, r); return; }
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

  if (tile.biome === "snowfield" || tile.biome === "tundra") {
    ctx.fillStyle = "rgba(252,255,255,.48)";
    for (let i = 0; i < 5; i++)
      ctx.fillRect(x + r(300 + i) * 28 + 2, y + r(310 + i) * 28 + 2, 1.4, 1.4);
  } else if (tile.biome === "stone-peak" || tile.biome === "volcanic") {
    ctx.strokeStyle = "rgba(28,34,43,.3)";
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 27); ctx.lineTo(x + 15, y + 7);
    ctx.lineTo(x + 20, y + 17); ctx.lineTo(x + 29, y + 4); ctx.stroke();
  }

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
    // Estrada (ADR 0034): marcas de roda na direção real da estrada, pedras e a transição em cada margem.
    let sandy = 0, green = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const g = grid.at(lx + dx, ly + dy).ground;
      if (g === "sand") sandy++; else if (g === "grass" || g === "forest") green++;
    }
    for (const piece of planRoadTile({ profile: roadProfile(grid.roadMask(), lx, ly), tx, ty, seed, neighbours, sandy: sandy > green }))
      paintRoadPiece(ctx, piece, x, y);
  } else if (tile.ground === "sand" && (tile.biome === "dunes" || tile.biome === "ruins")) {
    // Deserto: o relevo e as ondulações vêm da camada contínua (ADR 0033); aqui só um seixo raro, sem concha do mar.
    if (r(280) > 0.9) {
      const px = x + 8 + r(281) * 16, py = y + 8 + r(282) * 16;
      ellipse(ctx, px + 0.7, py + 0.9, 2.2, 1.2, "rgba(70,48,24,.28)");
      ellipse(ctx, px, py, 1.9, 1.3, tile.biome === "dunes" ? "#e6d3a2" : "#cdbf9e");
    }
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
  // Dunas do Sul: relevo contínuo sombreado por cima da cor lisa, sem costura entre chunks (ADR 0033).
  for (const [look, biome] of [[DUNES_LOOK, "dunes"], [HARDPAN_LOOK, "ruins"]] as const) {
    const relief = duneReliefCanvas(cx, cy, seed, look, (lx, ly) => grid.at(lx, ly).biome === biome);
    if (relief) { ctx.globalAlpha = .9; ctx.drawImage(relief, 0, 0); ctx.globalAlpha = 1; }
  }
  // Lago negro: água com profundidade, costa orgânica, lama molhada e um fio de luz na borda (ADR 0039).
  const lake = blackLakeLayerCanvas(cx, cy, seed, (lx, ly) => { const t = grid.at(lx, ly); return t.ground === "water" && t.biome === "black-lake"; });
  if (lake) ctx.drawImage(lake, 0, 0);
  for (let y = 0; y < CHUNK_TILES; y++)
    for (let x = 0; x < CHUNK_TILES; x++)
      drawDetails(ctx, grid, x, y, x * TILE_SIZE, y * TILE_SIZE, seed);
  return canvas;
}


/** Atlas stays within the inventory's own Canvas. Terrain is drawn once
 * for each viewport; live markers can change without re-sampling 65k tiles.
 * The palette and noise are shared with the game's procedural terrain art.
 */
const atlasTextures = new WeakMap<HTMLCanvasElement, { key: string; surface: HTMLCanvasElement }>();

function paintAtlasTerrain(ctx: CanvasRenderingContext2D, seed: number,
  scale: AtlasScale, centerX: number, centerY: number, spanTiles: number): void {
  const width = ctx.canvas.width, height = ctx.canvas.height;
  const cells = 128, cellWidth = width / cells, cellHeight = height / cells;
  const startX = centerX - spanTiles / 2, startY = centerY - spanTiles / 2;
  const sampleOffsets = scale === "nearby" ? [0] : [-0.22, 0.22];
  const grounds: readonly Ground[] = ["grass", "forest", "path", "sand", "water"];

  ctx.clearRect(0, 0, width, height);
  for (let cy = 0; cy < cells; cy++) for (let cx = 0; cx < cells; cx++) {
    const tx = startX + (cx + 0.5) / cells * spanTiles;
    const ty = startY + (cy + 0.5) / cells * spanTiles;
    if (Math.abs(tx) >= WORLD_HALF_TILES || Math.abs(ty) >= WORLD_HALF_TILES) {
      // Collision safety bound is not a physical coast; don't draw water here.
      ctx.fillStyle = "#182727";
    } else {
      const tally: Record<Ground, number> = { grass: 0, forest: 0, path: 0, sand: 0, water: 0 };
      let obstacle = false;
      let chosenBiome: Biome = "meadow";
      let bestBiomeVotes = 0;
      const biomeVotes: Partial<Record<Biome, number>> = {};
      for (const oy of sampleOffsets) for (const ox of sampleOffsets) {
        const tile = getTile(
          Math.floor(tx + ox * spanTiles / cells),
          Math.floor(ty + oy * spanTiles / cells), seed,
        );
        tally[tile.ground]++;
        const votes = (biomeVotes[tile.biome] ?? 0) + 1;
        biomeVotes[tile.biome] = votes;
        if (votes > bestBiomeVotes) { bestBiomeVotes = votes; chosenBiome = tile.biome; }
        if (scale === "nearby" && (tile.tree || tile.rock)) obstacle = true;
      }
      const ground = grounds.reduce((best, candidate) =>
        tally[candidate] > tally[best] ? candidate : best, "grass" as Ground);
      const hue = valueNoise(tx / (spanTiles / 12), ty / (spanTiles / 12), seed + 17);
      const palette = BIOME_PALETTE[chosenBiome] ?? PALETTE[ground];
      ctx.fillStyle = obstacle ? "#263f32" : mix(
        palette.lo, palette.hi, 0.2 + hue * 0.7,
      );
    }
    ctx.fillRect(cx * cellWidth, cy * cellHeight, cellWidth, cellHeight);
  }

  // Soft old-map shading draws over real ground without inventing elevation.
  const patina = ctx.createRadialGradient(width / 2, height / 2, 18,
    width / 2, height / 2, width * 0.73);
  patina.addColorStop(0, "rgba(14,27,25,0)");
  patina.addColorStop(1, "rgba(10,22,21,.23)");
  ctx.fillStyle = patina;
  ctx.fillRect(0, 0, width, height);

  if (scale === "world") {
    ctx.strokeStyle = "#fff0c78a";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) {
      const px = Math.round(i * width / 3) + 0.5;
      const py = Math.round(i * height / 3) + 0.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
    }
    const abbreviations = ["NO", "N", "NE", "O", "C", "L", "SO", "S", "SE"];
    ctx.font = "bold 10px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#132822";
    for (let i = 0; i < abbreviations.length; i++)
      ctx.fillText(abbreviations[i] ?? "", (i % 3) * width / 3 + 4.5,
        Math.floor(i / 3) * height / 3 + 14.5);
    ctx.fillStyle = "#ffedc5";
    for (let i = 0; i < abbreviations.length; i++)
      ctx.fillText(abbreviations[i] ?? "", (i % 3) * width / 3 + 4,
        Math.floor(i / 3) * height / 3 + 14);
  }

  // Compass rose: same procedural Canvas primitives as character ornaments.
  const cx = width - 18, cy = 21;
  ctx.fillStyle = "#142d2cbb";
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#e4cb93";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, 12.5, 0, TAU); ctx.stroke();
  ctx.fillStyle = "#f6e3b4";
  ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 4, cy + 6);
  ctx.lineTo(cx, cy + 3); ctx.lineTo(cx - 4, cy + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7e5640";
  ctx.beginPath(); ctx.moveTo(cx, cy + 3); ctx.lineTo(cx + 4, cy + 6);
  ctx.lineTo(cx, cy - 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff6da";
  ctx.font = "bold 8px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - 15);

  // Engraved map edge and cardinal ticks.
  ctx.strokeStyle = "#dfc995a3";
  ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
  for (let i = 1; i < 8; i++) {
    const p = i * width / 8;
    ctx.beginPath();
    ctx.moveTo(p, 2); ctx.lineTo(p, 6);
    ctx.moveTo(p, height - 2); ctx.lineTo(p, height - 6);
    ctx.moveTo(2, p); ctx.lineTo(6, p);
    ctx.moveTo(width - 2, p); ctx.lineTo(width - 6, p);
    ctx.stroke();
  }
}

/** Show the actual seed's world and authoritative nearby positions; sampled
 * wide views communicate geography, not guaranteed paths between pixels.
 */
export function drawWorldAtlas(
  ctx: CanvasRenderingContext2D, scale: AtlasScale,
  tileX: number, tileY: number, seed: number, selectedSector: number,
): void {
  const { centerX, centerY, spanTiles } = atlasFrame(scale, tileX, tileY, selectedSector);
  const width = ctx.canvas.width, height = ctx.canvas.height;
  const key = [seed, scale, centerX, centerY, spanTiles, width, height].join(":");
  let texture = atlasTextures.get(ctx.canvas);
  if (!texture || texture.key !== key) {
    const surface = texture?.surface ?? document.createElement("canvas");
    surface.width = width;
    surface.height = height;
    const surfaceContext = surface.getContext("2d");
    if (!surfaceContext) return;
    paintAtlasTerrain(surfaceContext, seed, scale, centerX, centerY, spanTiles);
    texture = { key, surface };
    atlasTextures.set(ctx.canvas, texture);
  }
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(texture.surface, 0, 0);
  const startX = centerX - spanTiles / 2, startY = centerY - spanTiles / 2;
  const mark = (x: number, y: number, color: string, size: number): void => {
    const px = (x - startX) / spanTiles * width;
    const py = (y - startY) / spanTiles * height;
    if (px < 0 || px > width || py < 0 || py > height) return;
    ctx.fillStyle = "#142922";
    ctx.beginPath(); ctx.arc(px, py, size / 2 + 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#f1e6bb";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, size / 2 + 1, 0, TAU); ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
  };
  // Nearby atlas only: sampling all regional landmark cells in world view is unbounded.
  if (scale === "nearby") {
    const endX = startX + spanTiles, endY = startY + spanTiles;
    for (let cy = Math.floor(startY / LANDMARK_CELL_TILES); cy <= Math.floor(endY / LANDMARK_CELL_TILES); cy++)
      for (let cx = Math.floor(startX / LANDMARK_CELL_TILES); cx <= Math.floor(endX / LANDMARK_CELL_TILES); cx++) {
        const landmark = getRegionalLandmarkForCell(cx, cy, seed);
        if (landmark) mark(landmark.tileX, landmark.tileY, "#ffcb72", 5);
      }
    for (const cave of caveEntrancesInArea(startX,startY,endX,endY,seed))
      mark(cave.tileX,cave.tileY,"#a3f1ce",5);
    for (const ruin of southRuinsInArea(startX,startY,endX,endY,seed))
      mark(ruin.tileX,ruin.tileY,"#d98c5f",4);
    for (const tower of southTowersInArea(startX,startY,endX,endY,seed))
      mark(tower.tileX,tower.tileY,"#b985ff",5);
  }
  mark(Math.floor(VILLAGE_RESPAWN.x / TILE_SIZE),
    Math.floor(VILLAGE_RESPAWN.y / TILE_SIZE), "#ffe0a1", 5);
  // A posição do herói vence a vila quando as duas se sobrepõem.
  mark(tileX, tileY, "#ffffff", 6);
}
