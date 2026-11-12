import type { RuinPiece } from "../../../world/southRuins.ts";
import { ellipse, rgba, softShadow } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { SANDSTONE, OUTLINE, GLINT, STAIN, noise } from "./palette.ts";

/** Tambor de coluna caído: cilindro deitado, de tamanho e inclinação fixos por sorteio. */
export function paintRuinDrum(c: CanvasRenderingContext2D, piece: RuinPiece, v: number, idx: number): void {
  const brush = new RuinBrush(c), { volume, line } = brush;
  const r = piece.h / 2 - 1, yb = piece.y + 2;
  c.save(); c.translate(piece.x, yb); c.rotate((noise(idx, v, 107) - 0.5) * 0.4);
  softShadow(c, 3, r + 1, piece.w * 0.7, 3.2, 0.34);
  c.fillStyle = volume(-piece.w / 2, piece.w / 2, SANDSTONE); c.fillRect(-piece.w / 2, -r, piece.w, r * 2);
  ellipse(c, -piece.w / 2, 0, 2.6, r, SANDSTONE.light); ellipse(c, piece.w / 2, 0, 2.6, r, SANDSTONE.dark);
  ellipse(c, -piece.w / 2, 0, 1.2, r * 0.55, rgba(SANDSTONE.dark, 0.7));
  line([[-piece.w / 2, -r], [piece.w / 2, -r]], OUTLINE, 1); line([[-piece.w / 2, r], [piece.w / 2, r]], OUTLINE, 1);
  line([[-piece.w / 2 + 2, -r + 1.5], [piece.w / 2 - 3, -r + 1.5]], rgba(GLINT, 0.5), 0.9);
  // caneluras ao longo do fuste, líquen e uma lasca na borda que rolou primeiro
  for (const f of [-0.45, 0.1, 0.55]) line([[-piece.w / 2 + 3, r * f], [piece.w / 2 - 3, r * f]], rgba(SANDSTONE.dark, 0.5), 0.8);
  brush.lichen(piece.w * (0.05 + noise(idx, v, 345) * 0.2), -r * 0.2, 2.6);
  brush.poly([[piece.w / 2, -r], [piece.w / 2 - 4, -r], [piece.w / 2 - 1, -r + 3]]);
  c.fillStyle = rgba(STAIN.dark, 0.75); c.fill();
  brush.drift(piece.w * 0.45, r + 1, 6, 1.8, v, idx);
  c.restore();
}
