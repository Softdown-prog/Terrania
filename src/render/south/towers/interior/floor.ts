import { ellipse, mix, rgba, shade } from "../../../draw.ts";
import { drawCaveExitStair } from "../../../caveDetails.ts";
import { drawCaveDownStair } from "../../../caveStairsDownArt.ts";
import { hash2, valueNoise } from "../../../../world/random.ts";
import { TILE_SIZE } from "../../../../world/terrain.ts";
import { CAVE_EXIT, CAVE_HEIGHT, CAVE_STAIRS_DOWN, CAVE_WIDTH, type CaveFloor } from "../../../../world/caveFloor.ts";
import { TOWER_INTERIOR_STYLES } from "./index.ts";
import { drawTowerSconce } from "./sconce.ts";
import { drawTowerWallFace } from "./wallFace.ts";
import { drawTowerWindow } from "./window.ts";

/**
 * Pinta um andar de torre inteiro (ADR 0021): piso de laje com rejunte, paredes de tijolo, frestas
 * de janela, lampiões e a luz que eles lançam no piso. Quem decide a cor é o estilo da torre
 * (`TOWER_INTERIOR_STYLES`); as escadas são as mesmas das cavernas. O resultado é cacheado por
 * `render/cave.ts` e nunca é redesenhado a cada quadro.
 */
const OUTLINE = "#142a2a";
const GLINT = "#fff6dc";

export function paintTowerFloor(floor: CaveFloor): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CAVE_WIDTH * TILE_SIZE;
  canvas.height = CAVE_HEIGHT * TILE_SIZE;
  const ctx = canvas.getContext("2d");
  const towerId = floor.entrance.tower;
  if (!ctx || !towerId) return canvas;
  const style = TOWER_INTERIOR_STYLES[towerId];
  const seed = floor.entrance.seed ^ Math.imul(floor.entrance.tileX, 313) ^ Math.imul(floor.entrance.tileY, 971);
  const n = (x: number, y: number, salt: number): number => hash2(x, y, seed + salt);
  const open = (x: number, y: number): boolean => floor.at(x, y) !== 0;
  const lights: Array<{ x: number; y: number }> = [];
  const pieces: Array<() => void> = [];

  ctx.fillStyle = shade(style.brick.dark, -.3);
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < CAVE_HEIGHT; y++) for (let x = 0; x < CAVE_WIDTH; x++) {
    const sx = x * TILE_SIZE, sy = y * TILE_SIZE, fine = n(x, y, 37);
    const wide = valueNoise((x + .5) / 6, (y + .5) / 6, seed + 51);
    if (floor.at(x, y) === 0) {
      // Parede: tijolo escuro visto de cima, com fiadas que continuam entre os tiles.
      ctx.fillStyle = mix(style.brick.dark, style.brick.base, .08 + wide * .16);
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = rgba(style.brick.mortar, .45);
      ctx.lineWidth = 1;
      for (const row of [0, 1, 2, 3]) {
        const ry = sy + row * 8 + 4;
        ctx.beginPath(); ctx.moveTo(sx, ry); ctx.lineTo(sx + TILE_SIZE, ry); ctx.stroke();
        const jx = sx + ((row + x) % 2 ? 8 : 16) + (n(x, y * 4 + row, 61) > .6 ? 8 : 0);
        ctx.beginPath(); ctx.moveTo(jx, ry - 4); ctx.lineTo(jx, ry + 4); ctx.stroke();
      }
      if (open(x, y + 1)) {
        pieces.push(() => drawTowerWallFace(ctx, style, sx + 16, sy + 30, "south", n(x, y, 201)));
        // Janela só em parede grossa (fundo do salão), nunca na face de um pilar de 2 tiles.
        const backWall = floor.at(x, y - 1) === 0 && floor.at(x, y - 2) === 0 && x % 3 === 1;
        if (backWall && n(x, y, 131) < style.windows)
          pieces.push(() => drawTowerWindow(ctx, style, sx + 16, sy + 14, n(x, y, 139)));
        else if (x % 2 === 0 && n(x, y, 149) < style.sconces) {
          pieces.push(() => drawTowerSconce(ctx, style, sx + 16, sy + 25, n(x, y, 157)));
          lights.push({ x: sx + 16, y: sy + TILE_SIZE + 12 });
        }
        if (backWall && n(x, y, 131) < style.windows) lights.push({ x: sx + 16, y: sy + TILE_SIZE + 6 });
      }
      if (open(x + 1, y)) pieces.push(() => drawTowerWallFace(ctx, style, sx + 30, sy + 16, "east", n(x, y, 219)));
      continue;
    }

    // Piso de laje: lajes de 16 px em aparelho deslocado, com rejunte e reflexo no canto de luz.
    ctx.fillStyle = mix(style.floor.base, style.floor.light, .08 + wide * .22);
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
    for (const half of [0, 1]) {
      const row = y * 2 + half, shift = row % 2 ? 8 : 0;
      for (let i = -1; i < 3; i++) {
        const lx = sx + shift + i * 16, ly = sy + half * 16;
        if (lx + 16 <= sx || lx >= sx + TILE_SIZE) continue;
        const tone = n(x * 2 + i, row, 71);
        ctx.fillStyle = rgba(tone > .5 ? style.floor.light : style.floor.base, .1 + tone * .12);
        ctx.fillRect(Math.max(lx, sx) + 1, ly + 1, Math.min(16, sx + TILE_SIZE - lx) - 1, 15);
        ctx.fillStyle = rgba(GLINT, .09);
        ctx.fillRect(Math.max(lx, sx) + 1, ly + 1, Math.min(15, sx + TILE_SIZE - lx - 1), 1);
      }
      ctx.strokeStyle = rgba(style.floor.grout, .75);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy + half * 16 + .5); ctx.lineTo(sx + TILE_SIZE, sy + half * 16 + .5); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const gx = sx + shift + i * 16 + .5;
        if (gx < sx || gx > sx + TILE_SIZE) continue;
        ctx.beginPath(); ctx.moveTo(gx, sy + half * 16); ctx.lineTo(gx, sy + half * 16 + 16); ctx.stroke();
      }
    }
    if (fine > .86) {
      const px = sx + 5 + n(x, y, 73) * 20, py = sy + 5 + n(x, y, 79) * 20;
      ellipse(ctx, px + 1, py + 1, 4.5, 2.2, rgba(shade(style.floor.base, -.4), .2));
      ellipse(ctx, px, py, 3.2, 1.6, rgba(style.floor.light, .5));
    }
    if (fine > .95) {
      const ox = 3 + n(x, y, 91) * 10, oy = 7 + n(x, y, 95) * 12;
      ctx.strokeStyle = rgba(OUTLINE, .2); ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(sx + ox, sy + oy);
      ctx.quadraticCurveTo(sx + ox + 9, sy + oy - 2, sx + ox + 12, sy + oy + 7); ctx.stroke();
    }
    // Sombra de contato só junto à parede, não em toda emenda.
    if (!open(x, y - 1)) {
      const edge = ctx.createLinearGradient(0, sy, 0, sy + 19);
      edge.addColorStop(0, rgba(OUTLINE, .55)); edge.addColorStop(1, rgba(OUTLINE, 0));
      ctx.fillStyle = edge; ctx.fillRect(sx, sy, TILE_SIZE, 19);
    }
    if (!open(x - 1, y)) {
      const edge = ctx.createLinearGradient(sx, 0, sx + 14, 0);
      edge.addColorStop(0, rgba(OUTLINE, .3)); edge.addColorStop(1, rgba(OUTLINE, 0));
      ctx.fillStyle = edge; ctx.fillRect(sx, sy, 14, TILE_SIZE);
    }
  }

  // Luz de janela e de lampião sobre o piso, antes das peças de parede.
  for (const light of lights) {
    const pool = ctx.createRadialGradient(light.x, light.y, 2, light.x, light.y, 58);
    pool.addColorStop(0, rgba(style.glow, .3));
    pool.addColorStop(1, rgba(style.glow, 0));
    ctx.fillStyle = pool;
    ctx.fillRect(light.x - 58, light.y - 58, 116, 116);
  }
  for (const draw of pieces) draw();

  drawCaveExitStair(ctx, floor.theme, (CAVE_EXIT.x + .5) * TILE_SIZE, (CAVE_EXIT.y + .5) * TILE_SIZE);
  if (floor.hasStairsDown)
    drawCaveDownStair(ctx, floor.theme, (CAVE_STAIRS_DOWN.x + .5) * TILE_SIZE, (CAVE_STAIRS_DOWN.y + .5) * TILE_SIZE);
  return canvas;
}
