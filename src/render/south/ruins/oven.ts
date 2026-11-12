import type { RuinPiece } from "../../../world/southRuins.ts";
import { ellipse, rgba, softShadow } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { MUDBRICK, OUTLINE, GLINT } from "./palette.ts";

/** Forno de pão de barro da muralha do povoado. */
export function paintRuinOven(c: CanvasRenderingContext2D, piece: RuinPiece, glints: Array<() => void>): void {
  const brush = new RuinBrush(c), { volume, occlusion } = brush;
  const yb = piece.y + piece.h / 2, rx = piece.w / 2;
  softShadow(c, piece.x + 6, yb + 1, rx + 8, 4, 0.34);
  const dome = (): void => { c.beginPath(); c.ellipse(piece.x, yb, rx, 17, 0, Math.PI, 0); c.lineTo(piece.x + rx, yb); c.closePath(); };
  dome(); c.fillStyle = volume(piece.x - rx, piece.x + rx, MUDBRICK); c.fill();
  c.save(); dome(); c.clip();
  for (let k = 1; k < 4; k++) { c.beginPath(); c.ellipse(piece.x, yb, rx, 17 * k / 4, 0, Math.PI, 0); c.strokeStyle = rgba(MUDBRICK.dark, 0.45); c.lineWidth = 0.9; c.stroke(); }
  occlusion(piece.x, yb, piece.w); c.restore();
  // fuligem que sobe da boca, rachadura do calor e tijolos soltos
  const soot = c.createLinearGradient(0, yb - 22, 0, yb - 8);
  soot.addColorStop(0, rgba("#2c1f14", 0)); soot.addColorStop(1, rgba("#2c1f14", 0.6));
  c.fillStyle = soot; c.fillRect(piece.x - 7, yb - 22, 10, 14);
  brush.line([[piece.x + 6, yb - 3], [piece.x + 8, yb - 9], [piece.x + 6, yb - 13], [piece.x + 9, yb - 17]], rgba("#2c1f14", 0.7), 0.9);
  ellipse(c, piece.x - 2, yb - 5, 6, 5, rgba("#1e1410", 0.92));
  ellipse(c, piece.x - 2, yb - 1.4, 5.4, 1.2, rgba("#8c8478", 0.8));
  ellipse(c, piece.x - 2, yb - 10, 6, 3, rgba("#2c1f14", 0.4));
  dome(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  brush.drift(piece.x + rx + 3, yb + 1, 8, 2.2, 3, 4);
  brush.rubble(piece.x - rx - 8, yb + 3, 5, MUDBRICK, 0.7);
  glints.push(() => { c.beginPath(); c.ellipse(piece.x, yb, rx - 2, 15, 0, Math.PI * 1.05, Math.PI * 1.35); c.strokeStyle = rgba(GLINT, 0.55); c.lineWidth = 1; c.stroke(); });
}
