import { ellipse, rgba } from "../../../draw.ts";
import { Banner, GLINT, GOLD, GRANITE, LIMESTONE, OUTLINE, ROYAL, SLATE, STAIN, StoneBrush, noise } from "../../kit/index.ts";

/** Raio e altura do corpo de cada torre, em px: a de canto (0) é mais alta e leva telhado; a do portão (1) leva ameias e um estandarte. */
export const TOWER = [{ r: 34, h: 104 }, { r: 33, h: 96 }] as const;
/** A altura do cone do telhado da torre de canto e o ponto onde o mastro do pendão se apoia. */
export const ROOF_HEIGHT = 58;

/**
 * Torre redonda da muralha da capital (ADR 0056), vista de cima e de frente: o corpo de calcário em fiadas curvas de 8 px (as
 * juntas acompanham a curva do cilindro), soco de granito, frestas de arqueiro, faixa de pedra e luz de noroeste. A de canto
 * (variação 0) leva o telhado cônico de ardósia com o pendão azul no alto; a do portão (variação 1), a coroa de ameias sobre
 * mísulas e um estandarte da capital pendurado na frente. A origem é o centro da borda de baixo da base.
 */
export function paintCapitalTower(c: CanvasRenderingContext2D, variant: number): void {
  const v = Number.isFinite(variant) && Math.round(variant) === 1 ? 1 : 0, { r, h } = TOWER[v], ry = r * 0.26, b = new StoneBrush(c);
  b.shadow(r * 2, h);
  const body = (): void => { c.beginPath(); c.moveTo(-r, -h); c.lineTo(-r, 0); c.ellipse(0, 0, r, ry, 0, Math.PI, 0, true); c.lineTo(r, -h); c.closePath(); };
  // corpo: luz à esquerda, a sombra mais funda à direita
  const g = c.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, LIMESTONE.light); g.addColorStop(0.3, LIMESTONE.base); g.addColorStop(0.72, LIMESTONE.dark); g.addColorStop(1, "#5d574d");
  body(); c.fillStyle = g; c.fill();
  c.save(); body(); c.clip();
  // fiadas curvas de 8 px e juntas alternadas acompanhando o cilindro
  for (let row = 0, y = -8; y > -h; row++, y -= 8) {
    c.beginPath(); c.ellipse(0, y, r, ry, 0, 0, Math.PI); c.strokeStyle = rgba(LIMESTONE.dark, 0.5); c.lineWidth = 0.9; c.stroke();
    for (let j = 0; j <= 6; j++) {
      const a = (j + (row % 2) * 0.5) * (Math.PI / 6);
      if (a <= 0.05 || a >= Math.PI - 0.05) continue;
      const x = r * Math.cos(a), ya = y + ry * Math.sin(a);
      b.line([[x, ya], [x, ya - 8]], rgba(LIMESTONE.dark, 0.42), 0.8);
    }
  }
  for (let i = 0; i < 9; i++) { // pedras de tom próprio, para o corpo não parecer carimbado
    const a = noise(i, v, 311) * Math.PI, y = -12 - noise(i, v, 313) * (h - 30);
    c.fillStyle = rgba(noise(i, v, 317) > 0.5 ? LIMESTONE.light : STAIN, 0.2); c.fillRect(r * Math.cos(a) - 7, y + ry * Math.sin(a), 14, 6);
  }
  // soco de granito, que acompanha a curva, e o musgo que sobe dele
  c.beginPath(); c.moveTo(-r, -9); c.ellipse(0, -9, r, ry, 0, Math.PI, 0, true); c.lineTo(r, 12); c.lineTo(-r, 12); c.closePath();
  c.fillStyle = b.gradient(-r, r, GRANITE); c.fill();
  b.moss(-r + 4, r - 4, -9, 14, v + 5);
  // frestas de arqueiro, com a ponta em arco, e a faixa de pedra que contorna a torre
  for (const [x, y] of v === 0 ? [[-12, -64], [12, -64], [0, -38]] as const : [[-12, -56], [12, -56], [0, -34]] as const) {
    c.fillStyle = "#0d1118"; c.beginPath(); c.moveTo(x - 2.6, y + 14); c.lineTo(x - 2.6, y + 2.6); c.arc(x, y + 2.6, 2.6, Math.PI, 0); c.lineTo(x + 2.6, y + 14); c.closePath(); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke(); b.line([[x + 1.8, y + 3], [x + 1.8, y + 13]], rgba(GLINT, 0.35), 0.7);
  }
  c.beginPath(); c.ellipse(0, -h + 26, r, ry, 0, 0, Math.PI); c.strokeStyle = LIMESTONE.light; c.lineWidth = 3.4; c.stroke();
  c.beginPath(); c.ellipse(0, -h + 28.4, r, ry, 0, 0, Math.PI); c.strokeStyle = rgba(OUTLINE, 0.45); c.lineWidth = 1; c.stroke();
  // sombra do cilindro à direita, luz na borda da esquerda e escurecimento no chão
  const side = c.createLinearGradient(r * 0.2, 0, r, 0); side.addColorStop(0, "rgba(27,31,42,0)"); side.addColorStop(1, "rgba(27,31,42,0.34)");
  c.fillStyle = side; c.fillRect(r * 0.2, -h, r * 0.8, h + ry);
  b.line([[-r + 3, -h + 4], [-r + 3, -12]], rgba(GLINT, 0.4), 1.2);
  const ao = c.createLinearGradient(0, -14, 0, ry); ao.addColorStop(0, "rgba(27,31,42,0)"); ao.addColorStop(1, "rgba(27,31,42,0.35)");
  c.fillStyle = ao; c.fillRect(-r, -14, r * 2, 14 + ry);
  c.restore();
  body(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  if (v === 0) roof(c, r, h, ry, b); else crown(c, r, h, ry, b);
  ellipse(c, 0, ry + 1, r * 0.9, 2, rgba(OUTLINE, 0.18));
}

/** Telhado cônico de ardósia da torre de canto: beiral, fiadas de telha em arcos que fecham, nervuras, bola dourada e pendão. */
function roof(c: CanvasRenderingContext2D, r: number, h: number, ry: number, b: StoneBrush): void {
  const er = r + 6, ery = ry + 2, apex = -h - ROOF_HEIGHT;
  // beiral: o aro do telhado, mais largo que o corpo, com a sombra que ele lança na parede
  const shade = c.createLinearGradient(0, -h, 0, -h + 12); shade.addColorStop(0, "rgba(27,31,42,0.45)"); shade.addColorStop(1, "rgba(27,31,42,0)");
  c.fillStyle = shade; c.fillRect(-r, -h, r * 2, 12);
  const cone = (): void => { c.beginPath(); c.moveTo(-er, -h); c.lineTo(0, apex); c.lineTo(er, -h); c.ellipse(0, -h, er, ery, 0, 0, Math.PI); c.closePath(); };
  const g = c.createLinearGradient(-er, 0, er, 0);
  g.addColorStop(0, SLATE.light); g.addColorStop(0.4, SLATE.base); g.addColorStop(1, SLATE.dark);
  cone(); c.fillStyle = g; c.fill();
  c.save(); cone(); c.clip();
  for (let k = 1; k <= 7; k++) { // fiadas de telha: arcos que encolhem rumo ao pico
    const t = k / 8, y = -h - ROOF_HEIGHT * t, rr = er * (1 - t);
    c.beginPath(); c.ellipse(0, y + ery * (1 - t) * 0.9, rr, ery * (1 - t), 0, 0, Math.PI); c.strokeStyle = rgba(SLATE.dark, 0.6); c.lineWidth = 0.9; c.stroke();
  }
  for (let j = 1; j < 9; j++) { // nervuras do pico até o beiral
    const a = (j / 9) * Math.PI;
    b.line([[0, apex], [er * Math.cos(a), -h + ery * Math.sin(a)]], rgba(SLATE.dark, 0.35), 0.8);
  }
  const edge = c.createLinearGradient(er * 0.1, 0, er, 0); edge.addColorStop(0, "rgba(27,31,42,0)"); edge.addColorStop(1, "rgba(27,31,42,0.38)");
  c.fillStyle = edge; c.fillRect(er * 0.1, apex, er, ROOF_HEIGHT + ery + 2);
  b.line([[-er * 0.3, apex + 12], [-er * 0.72, -h - 4]], rgba(GLINT, 0.4), 1.2);
  c.restore();
  cone(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  // pendão: mastro, bola dourada e a flâmula azul com o contorno dourado
  b.line([[0, apex], [0, apex - 16]], "#5a3a24", 1.5);
  ellipse(c, 0, apex - 1, 3, 3, GOLD.base); ellipse(c, -0.8, apex - 2, 1.1, 1.1, rgba(GOLD.light, 0.9));
  c.beginPath(); c.moveTo(0.8, apex - 16); c.quadraticCurveTo(11, apex - 15, 19, apex - 12); c.quadraticCurveTo(11, apex - 10.5, 0.8, apex - 7); c.closePath();
  c.fillStyle = b.gradient(0, 19, ROYAL); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 0.9; c.stroke();
}

/** Coroa da torre do portão: ameias de trás, o topo, o aro com as mísulas e as ameias da frente; o estandarte pende da frente. */
function crown(c: CanvasRenderingContext2D, r: number, h: number, ry: number, b: StoneBrush): void {
  const cr = r + 3, cry = ry + 2;
  const merlon = (x: number, y: number, back: boolean): void => {
    c.fillStyle = b.gradient(x - 4, x + 4, LIMESTONE); c.fillRect(x - 3.5, y - 10, 7, 10);
    c.fillStyle = back ? LIMESTONE.base : LIMESTONE.light; c.fillRect(x - 4.5, y - 12, 9, 2.4);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 3.5, y - 10, 7, 10); c.strokeRect(x - 4.5, y - 12, 9, 2.4);
  };
  for (let j = 1; j < 8; j++) { const a = Math.PI + (j / 8) * Math.PI; merlon(cr * Math.cos(a), -h + cry * Math.sin(a), true); }
  // o topo da torre, escuro dentro das ameias
  c.beginPath(); c.ellipse(0, -h, cr, cry, 0, 0, Math.PI * 2);
  c.fillStyle = b.vertical(-h - cry, -h + cry, GRANITE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  // aro de pedra sobre mísulas: a coroa que avança um pouco do corpo
  c.beginPath(); c.ellipse(0, -h + 4, cr, cry, 0, 0, Math.PI); c.strokeStyle = LIMESTONE.base; c.lineWidth = 6; c.stroke();
  c.beginPath(); c.ellipse(0, -h + 1.4, cr, cry, 0, 0, Math.PI); c.strokeStyle = LIMESTONE.light; c.lineWidth = 2.2; c.stroke();
  for (let j = 1; j < 14; j++) {
    const a = (j / 14) * Math.PI, x = cr * Math.cos(a), y = -h + 7 + cry * Math.sin(a);
    c.fillStyle = b.vertical(y - 2, y + 4, GRANITE); c.fillRect(x - 1.6, y - 2, 3.2, 6);
  }
  for (let j = 0; j < 9; j++) { const a = (0.07 + (j / 8) * 0.86) * Math.PI; merlon(cr * Math.cos(a), -h + cry * Math.sin(a) + 1, false); }
  new Banner(c).hang(0, -h + 14, 20, 46);
}
