import { ellipse, rgba } from "../../../draw.ts";
import { Banner, GLINT, GOLD, GRANITE, IRON, LIMESTONE, OUTLINE, ROYAL, STAIN, StoneBrush, noise } from "../../kit/index.ts";

/** Meia largura da abertura do portão (9 tiles) e a altura da parte de baixo e do topo da face, em px. */
export const GATE_HALF = 144, ARCH_SPRING = -72, FACE_TOP = -128, MERLON_H = 12;
/** A cada quantos px se repetem as ameias do portão: as mesmas da muralha, para os dois se encontrarem sem emenda. */
export const GATE_PERIOD = 16;

/** Altura (y negativo) da parte de baixo do arco em x: uma curva suave que sobe 20 px até o meio. */
export function archY(x: number): number {
  const t = (x + GATE_HALF) / (GATE_HALF * 2);
  return ARCH_SPRING - 80 * t * (1 - t);
}

/**
 * Grande Portão da capital (ADR 0056), de 9 tiles de vão: a face de alvenaria do passadiço, com o arco de aduelas (a chave de
 * cima mais larga), a grade erguida pendurada sob o arco, duas lanternas, o brasão do sol dourado sobre a chave, dois estandartes
 * e a cornija com as ameias de pedra. As duas torres do portão se encostam nas pontas e o vão fica livre. A origem é o centro
 * do vão, no chão.
 */
export function paintCapitalGate(c: CanvasRenderingContext2D, variant: number): void {
  const b = new StoneBrush(c), v = Number.isFinite(variant) && Math.round(variant) === 1 ? 1 : 0, X = GATE_HALF + 6;
  // a sombra funda da passagem no chão, sob o arco
  c.save(); c.translate(0, 6); c.scale(1, 0.11);
  const pass = c.createRadialGradient(0, 0, 14, 0, 0, GATE_HALF - 4); pass.addColorStop(0, "rgba(27,31,42,0.34)"); pass.addColorStop(1, "rgba(27,31,42,0)");
  c.fillStyle = pass; c.beginPath(); c.arc(0, 0, GATE_HALF - 4, 0, Math.PI * 2); c.fill(); c.restore();
  // a face de alvenaria acima do arco (o arco é a curva de baixo)
  const face = (): void => {
    c.beginPath(); c.moveTo(-X, FACE_TOP); c.lineTo(X, FACE_TOP); c.lineTo(X, ARCH_SPRING); c.lineTo(GATE_HALF, ARCH_SPRING);
    for (let x = GATE_HALF; x >= -GATE_HALF; x -= 12) c.lineTo(x, archY(x));
    c.lineTo(-GATE_HALF, ARCH_SPRING); c.lineTo(-X, ARCH_SPRING); c.closePath();
  };
  face(); c.fillStyle = b.gradient(-X, X, LIMESTONE); c.fill();
  c.save(); face(); c.clip();
  for (let row = 0, y = ARCH_SPRING - 4; y > FACE_TOP; row++, y -= 8) {
    b.line([[-X, y], [X, y]], rgba(LIMESTONE.dark, 0.5), 0.9);
    for (let x = -X + (row % 2) * 8; x < X; x += GATE_PERIOD) {
      b.line([[x, y], [x, y + 8]], rgba(LIMESTONE.dark, 0.42), 0.8);
      const tone = noise(row * 40 + Math.floor((x + X) / 16), v, 321);
      if (tone > 0.82) { c.fillStyle = rgba(LIMESTONE.light, 0.28); c.fillRect(x + 1, y + 1, 14, 6); }
      else if (tone < 0.14) { c.fillStyle = rgba(STAIN, 0.14); c.fillRect(x + 1, y + 1, 14, 6); }
    }
  }
  for (const x of [-96, -48, 48, 96]) b.streak(x, FACE_TOP, 22, 0.32);
  c.restore();
  // o anel do arco: aduelas que irradiam, mais claras que a parede, e a chave de cima, mais alta
  c.beginPath(); c.moveTo(-GATE_HALF, ARCH_SPRING);
  for (let x = -GATE_HALF; x <= GATE_HALF; x += 12) c.lineTo(x, archY(x));
  for (let x = GATE_HALF; x >= -GATE_HALF; x -= 12) c.lineTo(x, archY(x) - 13);
  c.closePath(); c.fillStyle = b.vertical(-112, -72, LIMESTONE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  for (let k = 1; k < 24; k++) {
    const x = -GATE_HALF + (k / 24) * GATE_HALF * 2;
    if (Math.abs(x) < 6) continue;
    b.line([[x, archY(x)], [x, archY(x) - 13]], rgba(LIMESTONE.dark, 0.6), 0.9);
  }
  c.fillStyle = b.gradient(-6, 6, LIMESTONE); c.fillRect(-6, archY(0) - 17, 12, 18);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-6, archY(0) - 17, 12, 18);
  b.glint(-6, 6, archY(0) - 17, 0.6);
  // a grade erguida: barras de ferro com a ponta em lança penduradas sob o arco, e os dois travessões
  for (let x = -128; x <= 128; x += 12) {
    const top = archY(x), tip = top + 16;
    b.line([[x, top], [x, tip]], IRON, 1.5);
    b.poly([[x - 1.8, tip], [x + 1.8, tip], [x, tip + 4]]); c.fillStyle = IRON; c.fill();
  }
  for (const dy of [5, 11]) { c.beginPath(); c.moveTo(-128, archY(-128) + dy); for (let x = -128; x <= 128; x += 12) c.lineTo(x, archY(x) + dy); c.strokeStyle = rgba(IRON, 0.9); c.lineWidth = 1.3; c.stroke(); }
  // lanternas de ferro penduradas por corrente, com o brilho quente em volta
  for (const x of [-70, 70]) {
    const top = archY(x) + 6;
    b.line([[x, archY(x) + 1], [x, top]], rgba(IRON, 0.9), 0.9);
    const glow = c.createRadialGradient(x, top + 8, 1, x, top + 8, 20); glow.addColorStop(0, "rgba(255,206,120,0.55)"); glow.addColorStop(1, "rgba(255,206,120,0)");
    c.fillStyle = glow; c.fillRect(x - 20, top - 12, 40, 40);
    c.fillStyle = "#2a2d36"; c.fillRect(x - 3.6, top, 7.2, 1.6); c.fillRect(x - 3.6, top + 11, 7.2, 1.6);
    c.fillStyle = "#ffd98a"; c.fillRect(x - 2.6, top + 1.6, 5.2, 9.4); ellipse(c, x, top + 6, 1.6, 3, "#fff1c2");
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 3.6, top, 7.2, 12.6);
  }
  // brasão sobre a chave: o sol dourado no círculo azul
  const ex = 0, ey = FACE_TOP + 17;
  ellipse(c, ex, ey, 12, 12, ROYAL.base); ellipse(c, ex - 3, ey - 3.4, 6, 5, rgba(ROYAL.light, 0.55));
  c.beginPath(); c.arc(ex, ey, 12, 0, Math.PI * 2); c.strokeStyle = GOLD.base; c.lineWidth = 1.8; c.stroke(); c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.beginPath(); c.arc(ex, ey, 13, 0, Math.PI * 2); c.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.line([[ex + Math.cos(a) * 5, ey + Math.sin(a) * 5], [ex + Math.cos(a) * 9, ey + Math.sin(a) * 9]], GOLD.base, 1.1); }
  ellipse(c, ex, ey, 4.2, 4.2, GOLD.base); ellipse(c, ex - 1.2, ey - 1.4, 1.8, 1.4, rgba(GOLD.light, 0.9));
  // estandartes pendurados da cornija, nas duas metades do portão
  const flags = new Banner(c);
  for (const x of [-104, 104]) flags.hang(x, FACE_TOP + 2, 16, 26);
  // cornija com mísulas e as ameias de pedra (as mesmas da muralha: a cada 16 px)
  for (let x = -X + 2; x < X; x += 8) { c.fillStyle = b.vertical(FACE_TOP, FACE_TOP + 5, GRANITE); c.fillRect(x, FACE_TOP, 4, 5); }
  c.fillStyle = b.gradient(-X, X, LIMESTONE); c.fillRect(-X, FACE_TOP - 5, X * 2, 5);
  b.glint(-X, X, FACE_TOP - 5, 0.6); b.line([[-X, FACE_TOP], [X, FACE_TOP]], OUTLINE, 1);
  for (let k = 0; k < 18; k++) {
    const x = -136 + k * 16, top = FACE_TOP - 5 - MERLON_H;
    c.fillStyle = b.gradient(x - 5, x + 5, LIMESTONE); c.fillRect(x - 5, top, 10, MERLON_H);
    c.fillStyle = b.vertical(top - 2.4, top, LIMESTONE); c.fillRect(x - 6, top - 2.4, 12, 2.4);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 5, top, 10, MERLON_H); c.strokeRect(x - 6, top - 2.4, 12, 2.4);
    b.line([[x - 1, top + 3], [x - 1, top + 9]], rgba(IRON, 0.7), 1.2);
  }
  b.line([[-X, FACE_TOP + 0.5], [-X, ARCH_SPRING]], rgba(GLINT, 0.3), 1);
}
