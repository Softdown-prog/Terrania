import type { RuinPiece } from "../../../world/southRuins.ts";
import { rgba, softShadow } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { CLOTH, OUTLINE, GLINT, type Ramp } from "./palette.ts";

/** Pilar do vão da porta. O do lado esquerdo sustenta o que sobrou do arco; o do direito, um estandarte rasgado. */
export function paintRuinPillar(c: CanvasRenderingContext2D, piece: RuinPiece, idx: number,
  ramp: Ramp, glints: Array<() => void>): void {
  const brush = new RuinBrush(c), { volume, poly, line, occlusion } = brush;
  const hw = piece.w / 2, yb = piece.y + piece.h / 2, height = 60 + (idx % 2) * 4;
  softShadow(c, piece.x + 8, yb + 1, 16, 4.5, 0.36);
  brush.drift(piece.x + hw + 4, yb, 8, 2.2, 1, idx);
  brush.rubble(piece.x - hw - 7, yb + 2, 5, ramp, (idx % 3) / 3);
  c.fillStyle = volume(piece.x - hw, piece.x + hw, ramp);
  c.fillRect(piece.x - hw, yb - height, piece.w, height);
  c.save(); c.beginPath(); c.rect(piece.x - hw, yb - height, piece.w, height); c.clip();
  for (let y = yb - 8; y > yb - height; y -= 8) line([[piece.x - hw, y], [piece.x + hw, y]], rgba(ramp.dark, 0.5), 0.9);
  brush.streaks(piece.x - hw, piece.x + hw, yb - height, yb, 271, 1 + (idx % 2));
  brush.lichen(piece.x - 1, yb - 20 - (idx % 2) * 9, 3.2);
  c.fillStyle = rgba("#3b2a1c", 0.7); c.fillRect(piece.x - hw + 2, yb - height + 12 + (idx % 3) * 6, hw, 3.6);
  occlusion(piece.x, yb, piece.w);
  c.restore();
  c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.strokeRect(piece.x - hw, yb - height, piece.w, height);
  glints.push(() => line([[piece.x - hw + 1.4, yb - 4], [piece.x - hw + 1.4, yb - height + 2]], rgba(GLINT, 0.6), 1));
  if (piece.x < 0) {
    // arco quebrado: faixa curva entre dois raios, só a metade esquerda sobreviveu
    const cx = 0, cy = yb - height + 1, outer = 36, inner = 24;
    c.beginPath(); c.arc(cx, cy, outer, Math.PI, Math.PI * 1.66); c.arc(cx, cy, inner, Math.PI * 1.66, Math.PI, true); c.closePath();
    c.fillStyle = volume(-outer, 6, ramp); c.fill();
    // fiadas radiais do arco, recortadas na faixa
    c.save(); c.clip();
    for (let a = Math.PI + 0.12; a < Math.PI * 1.66; a += 0.2)
      line([[cx + Math.cos(a) * inner, cy + Math.sin(a) * inner], [cx + Math.cos(a) * outer, cy + Math.sin(a) * outer]], rgba(ramp.dark, 0.55), 0.9);
    c.restore();
    c.beginPath(); c.arc(cx, cy, outer, Math.PI, Math.PI * 1.66); c.arc(cx, cy, inner, Math.PI * 1.66, Math.PI, true); c.closePath();
    c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    glints.push(() => { c.beginPath(); c.arc(cx, cy, outer - 1.2, Math.PI * 1.04, Math.PI * 1.4); c.strokeStyle = rgba(GLINT, 0.6); c.lineWidth = 1; c.stroke(); });
  } else {
    // pano de estandarte rasgado preso ao pilar direito, em vinho desbotado com bainha dourada
    const bx = piece.x - hw + 1, by = yb - height + 8;
    poly([[bx, by], [bx - 11, by + 1], [bx - 12, by + 22], [bx - 8, by + 19], [bx - 5, by + 27], [bx - 2, by + 21], [bx, by + 30]]);
    c.fillStyle = volume(bx - 12, bx, CLOTH); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    line([[bx - 11, by + 3], [bx - 1, by + 3]], rgba("#d9a24a", 0.9), 1.2);
    line([[bx - 7, by + 4], [bx - 8, by + 18]], rgba(CLOTH.dark, 0.7), 0.9);
  }
}
