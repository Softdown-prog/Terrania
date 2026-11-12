import type { RuinPiece } from "../../../world/southRuins.ts";
import { ellipse, rgba, softShadow, TAU } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { CLAY, OCHRE, OUTLINE, GLINT, STAIN } from "./palette.ts";

/** Pote de barro. */
export function paintRuinPot(c: CanvasRenderingContext2D, piece: RuinPiece, idx: number): void {
  const brush = new RuinBrush(c), { volume } = brush;
  const x = piece.x, y = piece.y, big = idx % 2 === 0;
  softShadow(c, x + 2, y + 3, 8, 2.4, 0.3);
  ellipse(c, x, y - 4, big ? 5.4 : 4.6, big ? 5.6 : 4.8, volume(x - 6, x + 6, CLAY));
  c.fillStyle = CLAY.base; c.fillRect(x - 2.2, y - 11, 4.4, 4);
  ellipse(c, x, y - 11, 3.4, 1.3, CLAY.light);
  ellipse(c, x, y - 11, 2.1, 0.7, rgba("#1e1410", 0.8));
  ellipse(c, x - 1.8, y - 6, 1.2, 2, rgba(GLINT, 0.5));
  // faixa de pigmento ocre e um traço de fuligem, rachadura e lasca na boca
  c.save(); c.beginPath(); c.ellipse(x, y - 4, big ? 5.4 : 4.6, big ? 5.6 : 4.8, 0, 0, TAU); c.clip();
  c.fillStyle = rgba(OCHRE, 0.85); c.fillRect(x - 6, y - 5.6, 12, 1.6);
  c.fillStyle = rgba(CLAY.dark, 0.6); c.fillRect(x + 1.4, y - 4, 4, 8);
  brush.line([[x - 2.4, y - 8], [x - 1.2, y - 4], [x - 2.8, y - 1]], rgba(STAIN.dark, 0.8), 0.7);
  c.restore();
  ellipse(c, x + 2.6, y + 0.6, 1.8, 0.8, rgba(STAIN.mid, 0.55));
  brush.poly([[x + 2.8, y - 11], [x + 3.4, y - 11], [x + 3, y - 9.6]]); c.fillStyle = rgba(STAIN.dark, 0.7); c.fill();
  brush.drift(x + 6, y + 2, 4.5, 1.4, 0, idx);
  c.beginPath(); c.ellipse(x, y - 4, big ? 5.4 : 4.6, big ? 5.6 : 4.8, 0, 0, TAU); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  c.beginPath(); c.arc(x - 0.5, y - 4, big ? 4.6 : 3.8, Math.PI * 1.15, Math.PI * 1.45); c.strokeStyle = rgba(GLINT, 0.7); c.lineWidth = 0.9; c.stroke();
}
