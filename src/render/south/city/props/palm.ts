import { ellipse, rgba } from "../../../draw.ts";
import { noise } from "../../kit/index.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BRONZE, CLAY, GLINT, OUTLINE, POISON } from "../buildings/palette.ts";

/**
 * Palmeira do oásis da cidade (ADR 0050): tronco curvo com anéis de cicatriz, copa de oito folhas arqueadas (cada uma com a
 * nervura clara e as folhinhas dos dois lados, mais claras nas de cima) e um cacho de tâmaras. As folhas mais baixas caem mais.
 */
export function paintCityPalm(c: CanvasRenderingContext2D): void {
  const k = new BuildingKit(c), b = k.b;
  b.shadow(70, 70);
  // tronco: faixa curva que afina para o alto, com anéis e a luz da esquerda
  const trunk = (): void => { c.beginPath(); c.moveTo(-5, 2); c.quadraticCurveTo(-8, -28, -2, -55); c.lineTo(3, -55); c.quadraticCurveTo(-1, -28, 5, 2); c.closePath(); };
  trunk(); c.fillStyle = b.gradient(-8, 5, CLAY); c.fill();
  c.save(); trunk(); c.clip();
  for (let y = -4; y > -54; y -= 5) b.line([[-9, y], [6, y + 1.4]], rgba(CLAY.dark, 0.55), 1);
  b.line([[-5, 0], [-6, -26], [-1, -52]], rgba(GLINT, 0.4), 1);
  c.restore();
  trunk(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  // base alargada com raízes e areia
  ellipse(c, 0, 2, 9, 3, CLAY.dark); b.drift(-9, 3, 10, 2, 1); b.drift(10, 4, 9, 1.8, 2);
  // folhas: da mais baixa e caída à mais alta; ordem de pintura de trás para a frente
  const cx = 0, cy = -55;
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, reach = 34 + noise(i, 1, 291) * 10, rise = [-12, -22, -6, -26, -2, -30, 2, -20][i]!;
    const ex = cx + side * reach * (0.7 + (i % 4) * 0.1), ey = cy + 14 + rise * -0.4 + (i < 4 ? 10 : 0);
    const mx = cx + side * reach * 0.45, my = cy - 24 + (i % 3) * 4;
    const dark = i % 3 === 0;
    // nervura central
    c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx, my, ex, ey);
    c.strokeStyle = dark ? POISON.dark : POISON.base; c.lineWidth = 3.4; c.stroke();
    // folhinhas dos dois lados ao longo da nervura
    for (let t = 0.18; t < 0.98; t += 0.1) {
      const px = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * mx + t * t * ex, py = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * my + t * t * ey;
      const len = 11 * (1 - t * 0.55);
      b.line([[px, py], [px + side * len * 0.55, py - len * 0.62]], dark ? POISON.dark : POISON.base, 1.6);
      b.line([[px, py], [px + side * len * 0.55, py + len * 0.7]], dark ? POISON.dark : POISON.light, 1.6);
    }
    c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(mx, my - 1, ex, ey - 1); c.strokeStyle = rgba(POISON.light, 0.7); c.lineWidth = 0.9; c.stroke();
  }
  // duas folhas secas penduradas sob a copa (palha e marrom), e a sombra da copa no alto do tronco
  for (const [dx, tone] of [[-9, "#a39a63"], [8, "#8a7a46"]] as const) {
    c.beginPath(); c.moveTo(cx + dx * 0.4, cy + 2); c.quadraticCurveTo(cx + dx * 1.3, cy + 14, cx + dx * 1.1, cy + 24);
    c.strokeStyle = tone; c.lineWidth = 2.6; c.stroke();
    b.line([[cx + dx * 1.2, cy + 12], [cx + dx * 1.9, cy + 14]], "#6a5a30", 1);
  }
  ellipse(c, 0, cy + 6, 9, 3.4, rgba("#14301f", 0.55));
  // brilho do sol nas folhas de cima: um traço amarelado em cada uma das quatro mais altas
  for (let i = 1; i < 8; i += 2) {
    const side = i % 2 ? 1 : -1;
    b.line([[cx + side * 8, cy - 7], [cx + side * 22, cy - 12 - (i % 3)]], rgba("#e3f5a0", 0.7), 1.1);
  }
  // cacho de tâmaras logo abaixo da copa
  for (const [dx, dy] of [[-3, -49], [0, -47], [3, -49], [-1, -45], [2, -45]] as const) { ellipse(c, dx, dy, 2.2, 2.8, BRONZE.base); ellipse(c, dx - 0.6, dy - 0.8, 0.8, 1, rgba(GLINT, 0.7)); }
  b.line([[cx, cy + 2], [cx, cy + 6]], OUTLINE, 1);
  ellipse(c, cx, cy, 4.6, 3.4, POISON.dark);
  ellipse(c, cx - 1, cy - 1, 2, 1.4, rgba(GLINT, 0.45));
}
