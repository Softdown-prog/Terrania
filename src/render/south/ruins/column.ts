import type { RuinPiece } from "../../../world/southRuins.ts";
import { ellipse, rgba, shade, softShadow } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { OCHRE, OUTLINE, GLINT, noise, type Ramp } from "./palette.ts";

/** Coluna de fuste canelado: inteira, quebrada em ponta ou reduzida a um toco. */
export function paintRuinColumn(c: CanvasRenderingContext2D, piece: RuinPiece, v: number, idx: number,
  ramp: Ramp, glints: Array<() => void>): void {
  const brush = new RuinBrush(c), { volume, line, occlusion } = brush;
  const r = piece.w / 2, yb = piece.y + piece.h / 2 - 1;
  const roll = noise(idx, v, 61);
  const state = roll < 0.28 ? "stump" : roll < 0.62 ? "broken" : "full";
  const height = state === "stump" ? 14 + noise(idx, v, 67) * 8 : state === "broken" ? 34 + noise(idx, v, 71) * 14 : 66;
  softShadow(c, piece.x + height * 0.22, yb + 1, r * 2.2 + height * 0.22, 4.5, 0.36);
  // areia no pé e entulho do que caiu (mais, quanto mais baixa a coluna)
  brush.drift(piece.x + r + 3, yb, 7 + noise(idx, v, 257) * 3, 2.2, v, idx);
  if (state !== "full") brush.rubble(piece.x + r + 5, yb + 2, 5 + noise(idx, v, 259) * 2, ramp, noise(idx, v, 261));
  // plinto
  c.fillStyle = volume(piece.x - r - 3, piece.x + r + 3, ramp);
  c.fillRect(piece.x - r - 3, yb - 6, piece.w + 6, 6);
  line([[piece.x - r - 3, yb - 6], [piece.x + r + 3, yb - 6]], rgba(ramp.light, 0.9), 1);
  // fuste com leve afinamento (curvas) e topo conforme o estado
  const topY = yb - 6 - height, lean = state === "broken" ? (noise(idx, v, 73) - 0.5) * 4 : 0;
  const shaft = (): void => {
    c.beginPath();
    c.moveTo(piece.x - r, yb - 6);
    c.quadraticCurveTo(piece.x - r + 0.8, yb - 6 - height / 2, piece.x - r + 0.6, topY);
    if (state === "broken") {
      c.lineTo(piece.x - r * 0.3 + lean, topY - 4); c.lineTo(piece.x + r * 0.2 + lean, topY + 2);
      c.lineTo(piece.x + r * 0.7, topY - 5); c.lineTo(piece.x + r - 0.6, topY);
    } else c.lineTo(piece.x + r - 0.6, topY);
    c.quadraticCurveTo(piece.x + r - 0.8, yb - 6 - height / 2, piece.x + r, yb - 6);
    c.closePath();
  };
  shaft(); c.fillStyle = volume(piece.x - r, piece.x + r, ramp); c.fill();
  c.save(); shaft(); c.clip();
  for (const dx of [-0.55, 0, 0.55]) line([[piece.x + dx * r, topY], [piece.x + dx * r, yb - 6]], rgba(ramp.dark, 0.38), 0.8);
  for (let y = yb - 14; y > topY; y -= 15 + noise(Math.floor(y), v, 79) * 6)
    line([[piece.x - r, y], [piece.x + r, y + 1]], rgba(ramp.dark, 0.5), 0.9);
  // desgaste: riscos de chuva, líquen e uma lasca escura onde o fuste perdeu pedra
  brush.streaks(piece.x - r, piece.x + r, topY, yb - 6, 251, v);
  brush.lichen(piece.x - r * 0.2, yb - 14 - noise(idx, v, 253) * 10, 3);
  c.fillStyle = rgba("#3b2a1c", 0.7); c.fillRect(piece.x + r * 0.2, yb - 22 - noise(idx, v, 255) * 8, r * 0.6, 4);
  occlusion(piece.x, yb - 6, piece.w + 6);
  c.restore();
  shaft(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  if (state === "full") {
    // capitel: laje e coxim, com o coxim mais claro à esquerda
    c.fillStyle = volume(piece.x - r - 3, piece.x + r + 3, ramp);
    c.fillRect(piece.x - r - 3, topY - 5, piece.w + 6, 5);
    ellipse(c, piece.x, topY - 5, r + 3, 2.4, shade(ramp.light, 0.1));
    c.fillStyle = rgba(OCHRE, 0.85); c.fillRect(piece.x - r - 3, topY - 3, piece.w + 6, 1.6); // pigmento que restou
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(piece.x - r - 3, topY - 5, piece.w + 6, 5);
  } else {
    ellipse(c, piece.x - 0.5 + lean, topY + 0.5, r - 1, 2.1, rgba(ramp.light, 0.65));
    ellipse(c, piece.x + 2, topY + 1, r * 0.4, 1.2, rgba("#2c1f14", 0.35));
  }
  glints.push(() => line([[piece.x - r + 1.6, yb - 10], [piece.x - r + 1.6, topY + 3]], rgba(GLINT, 0.6), 1));
}
