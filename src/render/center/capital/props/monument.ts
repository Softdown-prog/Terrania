import { ellipse, rgba, softShadow } from "../../../draw.ts";
import { GLINT, GOLD, GRANITE, LIMESTONE, OUTLINE, ROYAL, StoneBrush, type Ramp } from "../../kit/index.ts";

/** Os três degraus do estrado, de baixo para cima: raio (px) e altura de cada um, e o raio dos cinco pilares sobre ele. */
export const DAIS = [{ rx: 72, ry: 58, h: 8 }, { rx: 62, ry: 50, h: 8 }, { rx: 52, ry: 42, h: 8 }] as const;
export const PILLAR = { ring: { rx: 38, ry: 30 }, height: 60 } as const;
/** A cor da gema de cada pilar, na ordem: a do Centro (azul-real), a do Norte (gelo), a do Sul (violeta), a do Leste (mar) e a do Oeste (brasa). */
export const REGION_GEMS: readonly Ramp[] = [
  ROYAL,
  { light: "#d4f3ff", base: "#8fd3e8", dark: "#4a93ad" },
  { light: "#b78be0", base: "#8a5ab8", dark: "#53307e" },
  { light: "#7fe6df", base: "#2fb3b0", dark: "#1a6f72" },
  { light: "#ffb36b", base: "#d9822b", dark: "#8a4a14" },
];

/**
 * Monumento da Concórdia, no centro da Praça dos Povos (ADR 0057): um estrado de três degraus de calcário, cinco pilares, um
 * para cada povo, cada um com uma gema e um pendão na cor da sua região, e, no meio, um pedestal que sustenta o sol dourado da
 * capital, com os raios e o brilho. É a ideia da conciliação: cinco povos em volta de uma mesma luz. A origem é o centro do
 * estrado, no chão.
 */
export function paintCapitalMonument(c: CanvasRenderingContext2D, variant: number): void {
  void variant;
  const b = new StoneBrush(c);
  softShadow(c, 24, 10, 96, 56, 0.3);
  // os degraus do estrado: lado de calcário em cilindro (luz à esquerda), a tampa mais clara e o fio de luz
  let base = 0;
  DAIS.forEach((step, i) => {
    const top = base - step.h;
    c.fillStyle = b.gradient(-step.rx, step.rx, i === 0 ? GRANITE : LIMESTONE);
    c.beginPath(); c.ellipse(0, base, step.rx, step.ry, 0, 0, Math.PI); c.lineTo(-step.rx, top); c.ellipse(0, top, step.rx, step.ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(0, top, step.rx, step.ry, 0, 0, Math.PI * 2);
    c.fillStyle = b.gradient(-step.rx, step.rx, LIMESTONE); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.ellipse(0, top, step.rx - 1.5, step.ry - 1.5, 0, Math.PI * 1.05, Math.PI * 1.6); c.strokeStyle = rgba(GLINT, 0.55); c.lineWidth = 1.2; c.stroke();
    base = top;
  });
  // a tampa do estrado: dois anéis incrustados (dourado e azul) que repetem a rosa dos ventos do piso
  const top = base, face = DAIS[2];
  for (const [k, color] of [[0.84, GOLD.base], [0.66, ROYAL.base]] as const) { c.beginPath(); c.ellipse(0, top, face.rx * k, face.ry * k, 0, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = 2.4; c.stroke(); }
  // os cinco pilares, de trás para a frente: sombra no estrado, base, fuste, capitel, gema e o pendão da região
  const pillars = REGION_GEMS.map((gem, i) => {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    return { gem, x: Math.cos(a) * PILLAR.ring.rx, y: top + Math.sin(a) * PILLAR.ring.ry };
  }).sort((p, q) => p.y - q.y);
  const centre = { x: 0, y: top };
  let drawn = false;
  const plinth = (): void => {
    // o pedestal do sol: tambor de calcário com a faixa dourada, a cornija e o sol dourado em cima
    const h = 34, r = 15;
    c.fillStyle = b.gradient(-r, r, LIMESTONE);
    c.beginPath(); c.ellipse(0, top, r, r * 0.45, 0, 0, Math.PI); c.lineTo(-r, top - h); c.ellipse(0, top - h, r, r * 0.45, 0, Math.PI, 0, true); c.closePath(); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    c.beginPath(); c.ellipse(0, top - h * 0.55, r, r * 0.45, 0, 0, Math.PI); c.strokeStyle = GOLD.base; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.ellipse(0, top - h, r + 2.5, r * 0.45 + 1, 0, 0, Math.PI * 2); c.fillStyle = b.gradient(-r, r, LIMESTONE); c.fill(); c.strokeStyle = OUTLINE; c.stroke();
    sun(c, 0, top - h - 26, b);
  };
  for (const p of pillars) {
    if (!drawn && p.y >= centre.y - 1) { plinth(); drawn = true; }
    pillar(c, p.x, p.y, p.gem, b);
  }
  if (!drawn) plinth();
}

/** O sol dourado da capital sobre o pedestal: brilho em "screen", doze raios e o disco com o reflexo. */
function sun(c: CanvasRenderingContext2D, x: number, y: number, b: StoneBrush): void {
  c.save(); c.globalCompositeOperation = "screen";
  const glow = c.createRadialGradient(x, y, 3, x, y, 46); glow.addColorStop(0, "rgba(255,214,120,0.6)"); glow.addColorStop(1, "rgba(255,214,120,0)");
  c.fillStyle = glow; c.beginPath(); c.arc(x, y, 46, 0, Math.PI * 2); c.fill(); c.restore();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, long = i % 2 === 0;
    b.poly([[x + Math.cos(a - 0.12) * 14, y + Math.sin(a - 0.12) * 14], [x + Math.cos(a) * (long ? 31 : 24), y + Math.sin(a) * (long ? 31 : 24)], [x + Math.cos(a + 0.12) * 14, y + Math.sin(a + 0.12) * 14]]);
    c.fillStyle = long ? GOLD.light : GOLD.base; c.fill(); c.strokeStyle = GOLD.dark; c.lineWidth = 0.7; c.stroke();
  }
  const disc = c.createRadialGradient(x - 4, y - 5, 1, x, y, 15); disc.addColorStop(0, GOLD.light); disc.addColorStop(0.55, GOLD.base); disc.addColorStop(1, GOLD.dark);
  c.fillStyle = disc; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill(); c.strokeStyle = GOLD.dark; c.lineWidth = 1; c.stroke();
  ellipse(c, x - 4.5, y - 5, 4.6, 3, rgba(GLINT, 0.8));
}

/** Um pilar de calcário com a base no ponto (x, y) do estrado: sombra, base, fuste que afina, capitel, gema e pendão. */
function pillar(c: CanvasRenderingContext2D, x: number, y: number, gem: Ramp, b: StoneBrush): void {
  const h = PILLAR.height;
  ellipse(c, x + 7, y + 2, 11, 3.6, rgba(OUTLINE, 0.28));
  c.fillStyle = b.gradient(x - 8, x + 8, LIMESTONE); c.fillRect(x - 7.5, y - 5, 15, 5);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 7.5, y - 5, 15, 5);
  b.poly([[x - 5.5, y - 5], [x + 5.5, y - 5], [x + 4.2, y - h], [x - 4.2, y - h]]);
  c.fillStyle = b.gradient(x - 5.5, x + 5.5, LIMESTONE); c.fill(); c.stroke();
  for (let k = 1; k < 5; k++) b.line([[x - 5 + k * 0.4, y - 5 - k * (h - 8) / 5], [x + 5 - k * 0.4, y - 5 - k * (h - 8) / 5]], rgba(LIMESTONE.dark, 0.45), 0.8);
  b.line([[x - 4.2, y - 8], [x - 3.2, y - h + 2]], rgba(GLINT, 0.5), 1);
  c.fillStyle = b.gradient(x - 8, x + 8, LIMESTONE); c.fillRect(x - 8, y - h - 5, 16, 5); c.strokeRect(x - 8, y - h - 5, 16, 5);
  const g = c.createRadialGradient(x - 1.4, y - h - 11, 0.5, x, y - h - 9, 6.4); g.addColorStop(0, gem.light); g.addColorStop(0.6, gem.base); g.addColorStop(1, gem.dark);
  c.beginPath(); c.arc(x, y - h - 9, 5.6, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  ellipse(c, x - 1.8, y - h - 11, 1.5, 1, rgba(GLINT, 0.85));
  // o pendão da região, pendurado na frente do fuste
  b.poly([[x - 3.6, y - h + 6], [x + 3.6, y - h + 6], [x + 3.6, y - h + 22], [x, y - h + 18], [x - 3.6, y - h + 22]]);
  c.fillStyle = b.gradient(x - 3.6, x + 3.6, gem); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 0.8; c.stroke();
}
