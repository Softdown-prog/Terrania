import type { RuinPiece } from "../../../world/southRuins.ts";
import { rgba, TAU } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { GLINT, SANDSTONE, SCRUB, STAIN, OUTLINE, noise } from "./palette.ts";

/** Dois degraus largos (colunata e templo): piso mais claro, espelho mais escuro, juntas e quinas. */
export function paintRuinSteps(c: CanvasRenderingContext2D, piece: RuinPiece, v: number): void {
  const brush = new RuinBrush(c), { volume, line, occlusion } = brush;
  for (let k = 0; k < 2; k++) {
    const w = piece.w - k * 18, y = piece.y - k * 6 + 3, x0 = piece.x - w / 2;
    c.fillStyle = volume(x0, x0 + w, SANDSTONE); c.fillRect(x0, y, w, 6);
    c.fillStyle = rgba(SANDSTONE.light, 0.9); c.fillRect(x0, y - 4, w, 4);
    for (let x = x0 + 10; x < x0 + w - 4; x += 22 + noise(Math.floor(x), v, 103) * 8) line([[x, y - 4], [x, y + 6]], rgba(SANDSTONE.dark, 0.5), 0.9);
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(x0, y - 4, w, 10);
    occlusion(piece.x, y + 6, w);
    // lajes lascadas: a quina da frente perdeu um pedaço e a rachadura corre pelo espelho
    brush.poly([[x0, y - 4], [x0 + 7, y - 4], [x0 + 3, y + 2], [x0, y + 1]]);
    c.fillStyle = rgba(STAIN.dark, 0.7); c.fill();
    brush.poly([[x0 + w, y - 4], [x0 + w - 9, y - 4], [x0 + w - 5, y + 3], [x0 + w, y + 4]]);
    c.fillStyle = rgba(STAIN.mid, 0.75); c.fill();
    line([[x0 + w * 0.4, y - 4], [x0 + w * 0.4 + 2, y + 1], [x0 + w * 0.4 - 1, y + 5]], rgba(STAIN.dark, 0.8), 0.9);
    // capim seco que nasce na junta e areia soprada sobre o piso
    for (let t = 0; t < 3; t++) {
      const gx = x0 + 14 + noise(t + k * 3, v, 301) * (w - 28);
      for (const d of [-1.6, 0, 1.6]) line([[gx, y - 3], [gx + d * 1.6, y - 8 - noise(t, v, 303) * 3]], rgba(SCRUB.dry, 0.9), 0.9);
    }
    brush.drift(x0 + w * (0.25 + 0.4 * k), y - 2, 9, 2.1, v, k + 5);
    line([[x0 + 2, y - 3], [x0 + w * 0.3, y - 3]], rgba(GLINT, 0.65), 1);
    c.beginPath(); c.ellipse(x0 + w * 0.8, y + 1, 3, 1.2, 0, 0, TAU); c.fillStyle = rgba(STAIN.mid, 0.6); c.fill();
  }
}
