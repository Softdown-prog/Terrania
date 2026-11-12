import type { RuinPiece } from "../../../world/southRuins.ts";
import { ellipse, rgba, shade, TAU } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { GLINT, SANDSTONE, SCRUB, STAIN, OUTLINE, noise } from "./palette.ts";

/** Piso de lajes em círculo da torre caída, com juntas em anel e em raio. */
export function paintRuinTowerFloor(c: CanvasRenderingContext2D, piece: RuinPiece, v: number): void {
  const brush = new RuinBrush(c), { line, drift } = brush;
  const rx = piece.w / 2 * 0.74, ry = piece.h / 2 * 0.74;
  ellipse(c, piece.x + 2, piece.y + 2, rx + 4, ry + 3, rgba("#3a2a1c", 0.28));
  ellipse(c, piece.x, piece.y, rx + 3, ry + 2, shade(SANDSTONE.dark, 0.05));
  const lit = c.createRadialGradient(piece.x - rx * 0.35, piece.y - ry * 0.4, 2, piece.x, piece.y, rx);
  lit.addColorStop(0, SANDSTONE.light); lit.addColorStop(0.55, SANDSTONE.base); lit.addColorStop(1, SANDSTONE.dark);
  c.beginPath(); c.ellipse(piece.x, piece.y, rx, ry, 0, 0, TAU); c.fillStyle = lit; c.fill();
  c.save(); c.beginPath(); c.ellipse(piece.x, piece.y, rx, ry, 0, 0, TAU); c.clip();
  for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(piece.x, piece.y, rx * k / 3.4, ry * k / 3.4, 0, 0, TAU); c.strokeStyle = rgba(SANDSTONE.dark, 0.4); c.lineWidth = 0.9; c.stroke(); }
  for (let a = 0; a < 9; a++) line([[piece.x, piece.y], [piece.x + Math.cos(a * TAU / 9) * rx, piece.y + Math.sin(a * TAU / 9) * ry]], rgba(SANDSTONE.dark, 0.35), 0.9);
  ellipse(c, piece.x - rx * 0.4, piece.y - ry * 0.35, rx * 0.5, ry * 0.4, rgba(SANDSTONE.light, 0.25));
  for (let i = 0; i < 6; i++) drift(piece.x + (noise(i, v, 83) - 0.5) * rx * 1.6, piece.y + (noise(i, v, 89) - 0.3) * ry * 1.4, 7, 2.4, v, i);
  // lajes soltas (covas escuras), rachaduras em zigue-zague e capim nas juntas
  for (let i = 0; i < 3; i++) {
    const a = noise(i, v, 311) * TAU, d = 0.35 + noise(i, v, 313) * 0.45;
    const sx = piece.x + Math.cos(a) * rx * d, sy = piece.y + Math.sin(a) * ry * d;
    brush.poly([[sx - 5, sy - 2], [sx + 5, sy - 3], [sx + 6, sy + 2], [sx - 4, sy + 3]]);
    c.fillStyle = rgba(STAIN.dark, 0.65); c.fill();
    line([[sx - 4, sy + 3], [sx + 6, sy + 2]], rgba(SANDSTONE.light, 0.7), 0.9);
  }
  for (let i = 0; i < 2; i++) {
    const a = (0.4 + i * 3.1) * 1, sx = piece.x + Math.cos(a) * rx * 0.2, sy = piece.y + Math.sin(a) * ry * 0.2;
    line([[sx, sy], [sx + 7, sy + 4], [sx + 5, sy + 8], [sx + 14, sy + 11]], rgba(STAIN.dark, 0.7), 0.9);
  }
  for (let i = 0; i < 3; i++) {
    const a = noise(i, v, 317) * TAU, sx = piece.x + Math.cos(a) * rx * 0.62, sy = piece.y + Math.sin(a) * ry * 0.62;
    for (const dx of [-1.5, 0, 1.5]) line([[sx, sy], [sx + dx * 1.6, sy - 5 - noise(i, v, 319) * 2]], rgba(SCRUB.base, 0.9), 0.9);
  }
  c.restore();
  c.beginPath(); c.ellipse(piece.x, piece.y, rx - 2, ry - 1.5, 0, Math.PI * 1.08, Math.PI * 1.5); c.strokeStyle = rgba(GLINT, 0.7); c.lineWidth = 1; c.stroke();
  c.beginPath(); c.ellipse(piece.x, piece.y, rx + 3, ry + 2, 0, 0, TAU); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
}
