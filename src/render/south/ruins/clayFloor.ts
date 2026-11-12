import type { RuinPiece } from "../../../world/southRuins.ts";
import { rgba } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { CLAY, GLINT, OUTLINE, SANDSTONE, STAIN, noise } from "./palette.ts";

/** Piso de barro batido da muralha do povoado, em trapézio, com juntas e areia por cima. */
export function paintRuinClayFloor(c: CanvasRenderingContext2D, piece: RuinPiece, v: number): void {
  const { poly, line, drift } = new RuinBrush(c);
  const x0 = piece.x - piece.w / 2 + 6, x1 = piece.x + piece.w / 2 - 6, y0 = piece.y - piece.h / 2 + 4, y1 = piece.y + piece.h / 2 - 2;
  poly([[x0 + 8, y0], [x1 - 6, y0], [x1, y1], [x0, y1]]);
  const shadeFloor = c.createLinearGradient(x0, y0, x1, y1);
  shadeFloor.addColorStop(0, rgba(CLAY.light, 0.62)); shadeFloor.addColorStop(0.6, rgba(CLAY.base, 0.5)); shadeFloor.addColorStop(1, rgba(CLAY.dark, 0.5));
  c.fillStyle = shadeFloor; c.fill();
  c.save(); poly([[x0 + 8, y0], [x1 - 6, y0], [x1, y1], [x0, y1]]); c.clip();
  for (let k = 1; k < 4; k++) line([[x0 + 8 - k * 2, y0 + (y1 - y0) * k / 4], [x1 - 6 + k * 1.5, y0 + (y1 - y0) * k / 4]], rgba(CLAY.dark, 0.35), 0.9);
  for (let k = 1; k < 9; k++) line([[x0 + 8 + (x1 - x0 - 14) * k / 9, y0], [x0 + (x1 - x0) * k / 9, y1]], rgba(CLAY.dark, 0.28), 0.9);
  for (let i = 0; i < 9; i++) drift(x0 + noise(i, v, 97) * (x1 - x0), y0 + noise(i, v, 101) * (y1 - y0), 12 + noise(i, v, 99) * 8, 3, v, i);
  // barro rachado: três fendas que se ramificam e uma mancha escura de fogo antigo
  for (let i = 0; i < 3; i++) {
    const sx = x0 + 14 + noise(i, v, 331) * (x1 - x0 - 28), sy = y0 + 4 + noise(i, v, 333) * (y1 - y0 - 12);
    line([[sx, sy], [sx + 6, sy + 4], [sx + 4, sy + 10], [sx + 11, sy + 14]], rgba(STAIN.dark, 0.7), 0.9);
    line([[sx + 6, sy + 4], [sx + 13, sy + 3]], rgba(STAIN.dark, 0.6), 0.8);
  }
  c.beginPath(); c.ellipse(x0 + 52, y0 + 12, 8, 3, 0, 0, Math.PI * 2); c.fillStyle = rgba(STAIN.dark, 0.35); c.fill();
  for (let i = 0; i < 4; i++) {
    const sx = x0 + 10 + noise(i, v, 337) * (x1 - x0 - 20), sy = y0 + 6 + noise(i, v, 339) * (y1 - y0 - 12);
    c.fillStyle = rgba(SANDSTONE.light, 0.8); c.fillRect(sx, sy, 3, 1.6);
  }
  c.restore();
  poly([[x0 + 8, y0], [x1 - 6, y0], [x1, y1], [x0, y1]]);
  c.strokeStyle = rgba(OUTLINE, 0.75); c.lineWidth = 1; c.stroke();
  line([[x0 + 9, y0 + 1], [x1 - 7, y0 + 1]], rgba(GLINT, 0.7), 1);
}
