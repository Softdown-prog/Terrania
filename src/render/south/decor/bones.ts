import { hash2 } from "../../../world/random.ts";
import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";
import { DECOR_GLINT, DECOR_OUTLINE, DECOR_SAND, decorShape } from "./palette.ts";

const BONE = { light: "#efe3c6", mid: "#d6c8a2", shade: "#a8997a" } as const;

/** Um osso longo com as duas pontas arredondadas, de (x0, y0) a (x1, y1), com volume e sombra. */
function longBone(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number): void {
  const nx = -(y1 - y0), ny = x1 - x0, len = Math.hypot(nx, ny) || 1, ux = (nx / len) * w, uy = (ny / len) * w;
  c.lineCap = "round";
  c.strokeStyle = rgba(DECOR_OUTLINE, 0.55);
  c.lineWidth = w * 2 + 1.6;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = BONE.mid;
  c.lineWidth = w * 2;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = BONE.light;
  c.lineWidth = w * 0.8;
  c.beginPath(); c.moveTo(x0 - ux * 0.45, y0 - uy * 0.45); c.lineTo(x1 - ux * 0.45, y1 - uy * 0.45); c.stroke();
  for (const [x, y] of [[x0, y0], [x1, y1]] as const) {
    ellipse(c, x + 0.4, y + 0.4, w * 1.2, w * 1.05, rgba(DECOR_OUTLINE, 0.55));
    ellipse(c, x, y, w * 1.15, w * 1, BONE.mid);
    ellipse(c, x - w * 0.3, y - w * 0.3, w * 0.5, w * 0.35, rgba(DECOR_GLINT, 0.75));
  }
}

/**
 * Ossos branqueados pelo sol (ADR 0036), meio cobertos de areia: formato 0, caveira de animal com chifre; 1, caixa
 * de costelas; 2, dois ossos longos cruzados; 3, fileira de vértebras. Marfim em três tons, rachaduras e contorno.
 */
export function drawBones(c: CanvasRenderingContext2D, variant: number): void {
  const v = decorShape(variant);
  const h = (i: number): number => hash2(i, v, 227);
  softShadow(c, 2, 1.4, 17, 4.2, 0.3);
  ellipse(c, 0, 0.7, 14, 3.2, rgba(DECOR_SAND.drift, 0.72));
  if (v === 0) {
    // Crânio: elipse com volume, órbitas escuras, focinho e um chifre curvo.
    const skull = c.createLinearGradient(-8, -12, 6, 1);
    skull.addColorStop(0, BONE.light); skull.addColorStop(0.6, BONE.mid); skull.addColorStop(1, BONE.shade);
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.6); c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(-3, -9); c.quadraticCurveTo(-8, -17, -14, -15); c.stroke();
    c.strokeStyle = BONE.mid; c.lineWidth = 2.1;
    c.beginPath(); c.moveTo(-3, -9); c.quadraticCurveTo(-8, -17, -14, -15); c.stroke();
    c.beginPath(); c.ellipse(0, -6, 9, 6.4, -0.1, 0, Math.PI * 2); c.fillStyle = skull; c.fill();
    c.beginPath(); c.moveTo(6, -4); c.quadraticCurveTo(14, -3, 15, 0); c.quadraticCurveTo(10, 2, 5, 1); c.closePath(); c.fillStyle = BONE.mid; c.fill();
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.6); c.lineWidth = 1;
    c.beginPath(); c.ellipse(0, -6, 9, 6.4, -0.1, 0, Math.PI * 2); c.stroke();
    ellipse(c, -2.2, -6.4, 2.1, 2.6, "#2b1a0e"); ellipse(c, 3.4, -6, 1.8, 2.3, "#2b1a0e");
    ellipse(c, 13, -1.6, 0.9, 0.7, "#2b1a0e");
    c.strokeStyle = rgba(shade(BONE.shade, -0.3), 0.6); c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(-1, -11.5); c.lineTo(0.4, -8); c.lineTo(-0.8, -6.5); c.stroke();
    ellipse(c, -4.2, -10.2, 2.4, 0.9, rgba(DECOR_GLINT, 0.7));
  } else if (v === 1) {
    // Costelas: arcos que saem da coluna, cada um com contorno, osso e fio de luz.
    longBone(c, -14, -1.5, 14, -1.5, 1.3);
    for (let i = 0; i < 6; i++) {
      const x = -11 + i * 4.4, rise = 7 + Math.sin(i * 0.9) * 2.5 - Math.abs(i - 2.5) * 0.7;
      c.lineCap = "round";
      c.strokeStyle = rgba(DECOR_OUTLINE, 0.55); c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x, -1.5); c.quadraticCurveTo(x + 3, -rise * 1.5, x + 6.5, -rise * 0.2); c.stroke();
      c.strokeStyle = BONE.mid; c.lineWidth = 1.55;
      c.beginPath(); c.moveTo(x, -1.5); c.quadraticCurveTo(x + 3, -rise * 1.5, x + 6.5, -rise * 0.2); c.stroke();
      c.strokeStyle = rgba(BONE.light, 0.9); c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(x + 0.4, -2.2); c.quadraticCurveTo(x + 2.6, -rise * 1.45, x + 5.4, -rise * 0.5); c.stroke();
    }
    ellipse(c, 11.5, 0.6, 5, 1.7, rgba(DECOR_SAND.drift, 0.85));
  } else if (v === 2) {
    longBone(c, -13, -2, 12, -9.5 - h(1) * 1.5, 1.7);
    longBone(c, -11, -10, 13, -1.5, 1.5);
    ellipse(c, -2, -2.5, 8, 2, rgba(DECOR_SAND.drift, 0.8));
  } else {
    // Vértebras: discos de osso em fila ao longo de uma curva, cada um com furo e sombra.
    for (let i = 0; i < 7; i++) {
      const x = -14 + i * 4.6, y = -3.5 - Math.sin(i * 0.55) * 3.2, s = 2.7 - Math.abs(i - 3) * 0.2;
      ellipse(c, x + 0.5, y + 0.9, s + 0.3, s * 0.75, rgba(DECOR_OUTLINE, 0.5));
      ellipse(c, x, y, s, s * 0.78, mix(BONE.mid, BONE.light, 0.35 - i * 0.03));
      ellipse(c, x, y - 0.2, s * 0.38, s * 0.28, shade(BONE.shade, -0.35));
      ellipse(c, x - s * 0.4, y - s * 0.3, s * 0.4, s * 0.22, rgba(DECOR_GLINT, 0.7));
    }
    ellipse(c, 10, -1.2, 6, 1.8, rgba(DECOR_SAND.drift, 0.85));
    // Fio da medula ligando as vértebras, escuro e fino.
    c.strokeStyle = rgba(DECOR_OUTLINE, 0.55); c.lineWidth = 0.8; c.lineCap = "round";
    c.beginPath(); c.moveTo(-14, -3.5);
    for (let i = 1; i < 7; i++) c.quadraticCurveTo(-14 + i * 4.6 - 2.3, -3.5 - Math.sin((i - 0.5) * 0.55) * 3.2 + 1.2, -14 + i * 4.6, -3.5 - Math.sin(i * 0.55) * 3.2);
    c.stroke();
    c.strokeStyle = rgba(BONE.light, 0.8); c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(-14, -4.6); c.quadraticCurveTo(0, -9, 14.5, -6.2); c.stroke();
  }
  // Rachaduras finas e lascas soltas, em todos os formatos: o osso branqueado racha ao sol.
  c.strokeStyle = rgba("#8a7a58", 0.7); c.lineWidth = 0.55; c.lineCap = "round";
  c.beginPath();
  for (let i = 0; i < 2; i++) {
    const cx = -8 + h(70 + i) * 16, cy = -3 - h(72 + i) * 4;
    c.moveTo(cx, cy); c.lineTo(cx + 1.6, cy + 1.1); c.lineTo(cx + 1.1, cy + 2.4);
  }
  c.stroke();
  for (let i = 0; i < 3; i++) {
    const x = -12 + h(80 + i) * 24, y = 0.4 + h(84 + i) * 1.6;
    ellipse(c, x + 0.3, y + 0.4, 1.3, 0.7, rgba("#7a6a4a", 0.5));
    ellipse(c, x, y, 1.1, 0.65, i % 2 ? "#f7efd8" : "#cdbf9e");
  }
  for (let i = 0; i < 5; i++) ellipse(c, -15 + h(40 + i) * 30, 1 + h(46 + i) * 2.4, 0.9, 0.55, i % 2 ? rgba(DECOR_SAND.light, 0.85) : rgba(DECOR_SAND.shade, 0.55));
}
