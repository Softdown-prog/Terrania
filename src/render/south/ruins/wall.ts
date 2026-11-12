import type { RuinPiece } from "../../../world/southRuins.ts";
import { rgba, shade, softShadow } from "../../draw.ts";
import { RuinBrush } from "./brush.ts";
import { OUTLINE, GLINT, STAIN, noise, type Ramp } from "./palette.ts";

/** Parede de tijolo ou pedra com topo quebrado: o perfil do topo vem de `hash2`. */
export function paintRuinWall(c: CanvasRenderingContext2D, piece: RuinPiece, v: number, idx: number,
  ramp: Ramp, glints: Array<() => void>): void {
  const brush = new RuinBrush(c), { volume, poly, line, occlusion, drift } = brush;
  const hw = piece.w / 2, depth = Math.max(6, piece.h * 0.55);
  const x0 = piece.x - hw, x1 = piece.x + hw, yb = piece.y + piece.h / 2;
  const tallest = v === 2 ? 46 : v === 3 ? 34 : 38;
  const n = Math.max(2, Math.round(piece.w / 9));
  const top: Array<readonly [number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, edge = Math.min(k, 1 - k) * 2;
    const h = tallest * (0.42 + 0.58 * noise(i + idx * 9, v, 31)) * (0.7 + 0.3 * edge) + (piece.h > 20 ? 6 : 0);
    top.push([x0 + piece.w * k, yb - Math.max(10, h)]);
  }
  softShadow(c, piece.x + 9, yb + 2, piece.w * 0.62 + 10, 5, 0.34);
  // topo (face superior) atrás da face frontal
  const lift: Array<readonly [number, number]> = top.map(([x, y]) => [x + depth * 0.35, y - depth * 0.5] as const);
  poly([...top, ...[...lift].reverse()]);
  c.fillStyle = shade(ramp.light, 0.08); c.fill();
  // face frontal com volume
  poly([[x0, yb], ...top, [x1, yb]]);
  c.fillStyle = volume(x0, x1, ramp); c.fill();
  // lateral direita, mais escura
  poly([[x1, yb], top[n]!, lift[n]!, [x1 + depth * 0.35, yb - depth * 0.5]]);
  c.fillStyle = shade(ramp.dark, -0.1); c.fill();
  // material recortado na silhueta: fiadas deslocadas e tijolos de tom próprio
  c.save();
  poly([[x0, yb], ...top, [x1, yb]]); c.clip();
  const course = v === 3 ? 7 : 9;
  for (let j = 0, y = yb - course; y > yb - 56; j++, y -= course) {
    line([[x0, y], [x1, y]], rgba(ramp.dark, 0.5), 0.9);
    for (let x = x0 + (j % 2 ? 4 : 11); x < x1; x += course * 1.9) {
      line([[x, y], [x - 0.5, y + course]], rgba(ramp.dark, 0.45), 0.8);
      if (noise(Math.floor(x) + j * 7, v, 41) > 0.72)
        c.fillStyle = rgba(ramp.light, 0.22), c.fillRect(x + 1, y + 1, course * 1.6, course - 2);
    }
  }
  for (let i = 0; i < 4; i++) {
    const cx = x0 + noise(i + idx, v, 43) * piece.w, cy = yb - 6 - noise(i + idx, v, 47) * 22;
    line([[cx, cy], [cx + 2, cy - 4], [cx - 1, cy - 8]], rgba("#2c1f14", 0.6), 0.9);
  }
  // desgaste: chuva e fuligem escorrendo do topo, blocos que caíram (covas escuras) e líquen na face
  brush.streaks(x0, x1, yb - tallest - 4, yb, 221, v);
  for (let i = 0; i < 3; i++) {
    const bx = x0 + 6 + noise(i + idx, v, 223) * (piece.w - 18), by = yb - 8 - noise(i + idx, v, 227) * 22, bw = course * 1.5, bh = course - 1;
    c.fillStyle = rgba(STAIN.dark, 0.78); c.fillRect(bx, by, bw, bh);
    c.fillStyle = rgba(ramp.light, 0.55); c.fillRect(bx, by + bh, bw, 1.2);
    c.fillStyle = rgba(STAIN.mid, 0.6); c.fillRect(bx, by, bw, 1.6);
  }
  for (let i = 0; i < 2; i++) brush.lichen(x0 + 8 + noise(i + idx, v, 229) * (piece.w - 16), yb - 10 - noise(i + idx, v, 231) * 18, 3.2 + noise(i, v, 233) * 2);
  occlusion(piece.x, yb, piece.w);
  c.restore();
  // contorno único e brilho da quina esquerda
  poly([[x0, yb], ...top, [x1, yb]]); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  glints.push(() => line(top.slice(0, 3).map(([x, y]) => [x + 0.8, y + 1] as const), rgba(GLINT, 0.7), 1));
  for (let i = 0; i < 2; i++) drift(x0 + noise(i + idx, v, 53) * piece.w, yb + 1, 8 + noise(i, v, 59) * 6, 2.5, v, i + idx);
  // entulho: blocos lapidados que se soltaram do topo e ficaram aos pés da parede, do lado da sombra
  brush.rubble(x1 + 4, yb + 3, 6 + noise(idx, v, 235) * 3, ramp, noise(idx, v, 237));
  if (piece.w > 40) brush.rubble(x0 - 7 + noise(idx, v, 239) * 10, yb + 5, 5, ramp, noise(idx, v, 241));
}
