import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, GRANITE, LIMESTONE, OUTLINE, ROYAL, type Point } from "../../kit/index.ts";
import { HallKit } from "./kit.ts";
import { CRIMSON, GLASS } from "./palette.ts";

/** O Salão da Ordem ocupa o terreno inteiro (12 × 11 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const KNIGHTS = { width: 384, depth: 352, rise: 40 } as const;

/**
 * Salão da Ordem dos Cavaleiros (ADR 0058), a guilda do cavaleiro: uma nave alta de pedra com a empena virada para a rua,
 * rosácea de vitral vermelho e azul, o brasão das espadas cruzadas sobre a porta em ogiva, estátuas de cavaleiros de guarda,
 * contrafortes com pináculos e duas naves laterais mais baixas, de telhado de meia-água. O vermelho é a cor da Ordem.
 */
export function paintKnightsHall(c: CanvasRenderingContext2D): void {
  const k = new HallKit(c), b = k.b, hw = KNIGHTS.width / 2, nave = 100, H = 92, low = 62, G = 62, back = -(KNIGHTS.depth + 10), v = 7;
  k.castShadow(hw, KNIGHTS.depth, low);
  // telhados: as meias-águas das naves laterais (descem para fora) e as duas águas da nave, com a cumeeira para o fundo
  k.slope([[-hw - 6, -low], [-nave, -low - 20], [-nave, back + G + 6], [-hw - 6, back + G + 26]], k.sweep(-hw - 6, -nave, "#8494b4", "#5d6d92"), "v", -1, v);
  k.slope([[nave, -low - 20], [hw + 6, -low], [hw + 6, back + G + 26], [nave, back + G + 6]], k.sweep(nave, hw + 6, "#4c5a7c", "#2f3b57"), "v", 1, v + 1);
  k.gableRoof(-nave, nave, -H, back, G, v + 2);
  k.pennant(0, -H - G + 2, 26, CRIMSON, 22);
  // naves laterais: parede de cantaria com a ponta em meia-água, janelas em ogiva e o pano vermelho da Ordem
  for (const s of [-1, 1] as const) {
    const x0 = s === -1 ? -hw : nave, x1 = s === -1 ? -nave : hw;
    b.poly(s === -1 ? [[x0, -low], [x1, -low - 20], [x1, -low]] : [[x0, -low - 20], [x1, -low], [x0, -low]]);
    c.fillStyle = s === -1 ? LIMESTONE.light : LIMESTONE.base; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    k.ashlar(x0, x1, -low, 0, v + 3 + s);
    b.line(s === -1 ? [[x0 - 6, -low], [x1, -low - 20]] : [[x0, -low - 20], [x1 + 6, -low]], OUTLINE, 4.4);
    b.line(s === -1 ? [[x0 - 6, -low], [x1, -low - 20]] : [[x0, -low - 20], [x1 + 6, -low]], LIMESTONE.light, 2.6);
    for (const x of [124, 166]) k.window(s * x, -14, 14, 32, GLASS, true);
    k.cloth(s * 145, -56, 11, 34, CRIMSON);
  }
  // nave: parede, a empena de pedra com as fiadas, a rosácea e o brasão
  k.ashlar(-nave, nave, -H, 0, v);
  const gable: Point[] = [[-nave, -H], [0, -H - G + 5], [nave, -H]];
  b.poly(gable); c.fillStyle = k.fade(-H - G, -H, GLINT, LIMESTONE.base); c.fill();
  c.save(); b.poly(gable); c.clip();
  for (let y = -H - 8; y > -H - G; y -= 8) b.line([[-nave, y], [nave, y]], rgba(LIMESTONE.dark, 0.5), 0.85);
  c.restore();
  b.poly(gable); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
  b.line([[-nave, -H], [nave, -H]], rgba(LIMESTONE.dark, 0.9), 1.4);
  // as cornijas inclinadas da empena, por cima da pedra
  b.line([[-nave - 6, -H], [0, -H - G], [nave + 6, -H]], OUTLINE, 4.6); b.line([[-nave - 6, -H], [0, -H - G], [nave + 6, -H]], LIMESTONE.light, 2.8);
  rose(k, 0, -H - 20, 17);
  for (const s of [-1, 1]) { k.window(s * 46, -24, 14, 42, GLASS, true); k.cloth(s * 78, -86, 12, 36, CRIMSON); statue(k, s * 78); k.lantern(s * 33, -42); }
  k.door(0, 0, 40, 50, undefined, true);
  crest(k, 0, -76);
  k.steps(-30, 30, 0, 2);
  // contrafortes com pináculos nas quinas da nave e das naves laterais
  for (const s of [-1, 1]) { buttress(k, s * nave, -H - 4, 0); buttress(k, s * (hw - 5), -low - 2, 0); }
  b.line([[-hw, 0], [-30, 0]], OUTLINE, 1.1); b.line([[30, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Rosácea: aro de pedra, oito gomos de vitral vermelho e azul alternados, a traceria dourada e o botão do meio. */
function rose(k: HallKit, x: number, y: number, r: number): void {
  const c = k.c;
  c.beginPath(); c.arc(x, y, r + 3.4, 0, Math.PI * 2); c.fillStyle = rgba(GLINT, 0.95); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2, ramp = i % 2 ? ROYAL : CRIMSON;
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, a0, a1); c.closePath();
    const g = c.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, ramp.light); g.addColorStop(1, ramp.dark);
    c.fillStyle = g; c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 0.9; c.stroke();
  }
  c.beginPath(); c.arc(x, y, r * 0.55, 0, Math.PI * 2); c.strokeStyle = GOLD.base; c.lineWidth = 0.9; c.stroke();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  ellipse(c, x, y, 3, 3, GOLD.base); ellipse(c, x - 0.9, y - 1, 1.1, 0.9, rgba(GOLD.light, 0.95));
  ellipse(c, x - r * 0.4, y - r * 0.45, r * 0.3, r * 0.16, rgba(GLINT, 0.3));
}

/** Brasão da Ordem: escudo vermelho de borda dourada com duas espadas cruzadas. */
function crest(k: HallKit, x: number, y: number): void {
  const c = k.c, b = k.b;
  c.beginPath(); c.moveTo(x - 9, y - 10); c.lineTo(x + 9, y - 10); c.lineTo(x + 9, y); c.quadraticCurveTo(x + 8, y + 8, x, y + 12); c.quadraticCurveTo(x - 8, y + 8, x - 9, y); c.closePath();
  c.fillStyle = k.sweep(x - 9, x + 9, CRIMSON.light, CRIMSON.dark); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 1.5; c.stroke();
  for (const s of [-1, 1]) {
    b.line([[x - s * 6, y + 6], [x + s * 6, y - 7]], "#e8ecf1", 1.7);
    b.line([[x - s * 6.6, y + 2.6], [x - s * 2.8, y + 5.4]], GOLD.base, 1.5);
  }
}

/** Estátua de cavaleiro de guarda: pedestal, o corpo de pedra com o elmo, o escudo e a espada apoiada no chão. */
function statue(k: HallKit, x: number): void {
  const c = k.c, b = k.b;
  c.fillStyle = k.fade(-12, 0, LIMESTONE.light, LIMESTONE.dark); c.fillRect(x - 9, -12, 18, 12);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 9, -12, 18, 12); c.fillStyle = rgba(GLINT, 0.9); c.fillRect(x - 10.5, -14, 21, 2.6); c.strokeRect(x - 10.5, -14, 21, 2.6);
  b.poly([[x - 6, -14], [x + 6, -14], [x + 5, -30], [x + 6.5, -34], [x - 6.5, -34], [x - 5, -30]]);
  c.fillStyle = k.sweep(x - 7, x + 7, GRANITE.light, GRANITE.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  c.beginPath(); c.arc(x, -38.5, 4.4, 0, Math.PI * 2); c.fillStyle = GRANITE.base; c.fill(); c.stroke();
  b.line([[x - 2.6, -38.5], [x + 2.6, -38.5]], OUTLINE, 1); b.line([[x, -43], [x, -47]], GRANITE.light, 1.6);
  b.line([[x, -33], [x, -15]], "#dfe3e8", 1.7); b.line([[x - 3.4, -30], [x + 3.4, -30]], GRANITE.dark, 1.5);
  c.beginPath(); c.moveTo(x - 9, -30); c.lineTo(x - 3, -30); c.lineTo(x - 3, -23); c.quadraticCurveTo(x - 6, -19, x - 9, -23); c.closePath(); c.fillStyle = GRANITE.light; c.fill(); c.stroke();
}

/** Contraforte em degraus, com o pináculo e a ponta dourada no alto. */
function buttress(k: HallKit, x: number, yTop: number, yBase: number): void {
  const c = k.c, b = k.b, h = yBase - yTop;
  for (const [w, from, to] of [[13, 0, 0.36], [10, 0.36, 0.72], [7.4, 0.72, 1]] as const) {
    c.fillStyle = k.sweep(x - w / 2, x + w / 2, rgba(GLINT, 0.95), LIMESTONE.base); c.fillRect(x - w / 2, yBase - h * to, w, h * (to - from));
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - w / 2, yBase - h * to, w, h * (to - from));
  }
  b.poly([[x - 5, yTop], [x, yTop - 17], [x + 5, yTop]]); c.fillStyle = k.sweep(x - 5, x + 5, LIMESTONE.light, LIMESTONE.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, x, yTop - 18, 2, 2, GOLD.base);
}
