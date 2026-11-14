import { ellipse, rgba } from "../../../draw.ts";
import { Banner, GLINT, GOLD, GRANITE, IRON, LIMESTONE, OUTLINE, ROYAL, WOOD, noise } from "../../kit/index.ts";
import { HallKit } from "./kit.ts";
import { STRAW, TERRACE } from "./palette.ts";

/** O Quartel da Guarda ocupa o terreno inteiro (18 × 11 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const BARRACKS = { width: 576, depth: 352, rise: 44 } as const;

/**
 * Quartel da Guarda (ADR 0058): uma fortaleza de calcário de teto plano. Em cima, o terraço de lajes cercado de ameias, com
 * o pátio de treino (bonecos de palha, alvos, cavalete de lanças, caixotes) e a torre de menagem no meio, com a bandeira da
 * capital; na frente, o portão de madeira e ferro com a grade erguida, frestas, escudos e duas torres redondas nos cantos.
 */
export function paintGuardBarracks(c: CanvasRenderingContext2D): void {
  const k = new HallKit(c), b = k.b, hw = BARRACKS.width / 2, H = 84, back = -(BARRACKS.depth + 14), v = 5;
  k.castShadow(hw, BARRACKS.depth, H);
  // terraço: lajes de pedra em fiadas alternadas, com lajes de tom próprio e a sombra do parapeito
  c.fillStyle = k.fade(back, -H, TERRACE.light, TERRACE.base); c.fillRect(-hw, back, hw * 2, -H - back);
  for (let y = back, r = 0; y < -H; y += 24, r++) {
    c.fillStyle = rgba(TERRACE.dark, 0.5); c.fillRect(-hw, y, hw * 2, 1);
    for (let x = -hw + (r % 2) * 16, i = 0; x < hw; x += 32, i++) {
      c.fillStyle = rgba(TERRACE.dark, 0.42); c.fillRect(x, y, 1, 24);
      const t = noise(r * 31 + i, v, 441);
      if (t > 0.86 || t < 0.1) { c.fillStyle = t > 0.86 ? rgba(GLINT, 0.2) : rgba(OUTLINE, 0.12); c.fillRect(x + 1, y + 1, 31, 23); }
    }
  }
  c.fillStyle = k.fade(back + 12, back + 30, "rgba(27,31,42,0.34)", "rgba(27,31,42,0)"); c.fillRect(-hw, back + 12, hw * 2, 18);
  c.fillStyle = k.sweep(-hw + 9, -hw + 24, "rgba(27,31,42,0.3)", "rgba(27,31,42,0)"); c.fillRect(-hw + 9, back, 15, -H - back);
  // parapeito de trás (visto por dentro) e os dos lados (vistos de cima), com as ameias
  c.fillStyle = k.fade(back, back + 12, LIMESTONE.light, LIMESTONE.base); c.fillRect(-hw, back, hw * 2, 12);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-hw, back, hw * 2, 12);
  k.crenels(-hw, hw, back, 16, 10, 9);
  for (const s of [-1, 1]) {
    const x = s === -1 ? -hw : hw - 9;
    c.fillStyle = s === -1 ? LIMESTONE.base : LIMESTONE.dark; c.fillRect(x, back + 12, 9, -H - back - 12);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x, back + 12, 9, -H - back - 12);
    for (let y = back + 18; y < -H - 12; y += 16) { c.fillStyle = s === -1 ? rgba(GLINT, 0.85) : LIMESTONE.light; c.fillRect(x - 1, y, 11, 9); c.strokeStyle = rgba(OUTLINE, 0.85); c.lineWidth = 0.8; c.strokeRect(x - 1, y, 11, 9); }
  }
  // pátio de treino no terraço
  rack(k, -214, -128); dummy(k, -168, -238); dummy(k, -224, -246); target(k, 150, -256); target(k, 204, -250);
  crate(k, 176, -122, 16); crate(k, 196, -120, 13); crate(k, 184, -136, 12); barrel(k, 222, -124); barrel(k, 236, -116);
  keep(k, v);
  // muro da frente: cantaria, cornija sobre mísulas, ameias, frestas e os escudos da Guarda
  k.ashlar(-hw, hw, -H, 0, v, LIMESTONE, 14);
  k.cornice(-hw, hw, -H);
  k.crenels(-hw, hw, -H - 6, 16);
  for (const s of [-1, 1]) {
    for (const x of [88, 128, 168, 208]) k.slit(s * x, -34, 20);
    for (const x of [108, 188]) shield(k, s * x, -52);
    new Banner(c).hang(s * 62, -76, 14, 44);
    k.lantern(s * 41, -42);
  }
  // portão: arco de pedra, folhas de madeira com ferro e as pontas da grade erguida no alto do vão
  k.door(0, 0, 56, 60);
  for (let x = -24; x <= 24; x += 6) { b.line([[x, -60 + (28 - Math.sqrt(Math.max(0, 28 * 28 - x * x)))], [x, -41]], IRON, 1.6); b.poly([[x - 1.6, -41], [x + 1.6, -41], [x, -37]]); c.fillStyle = IRON; c.fill(); }
  b.line([[-27, -45], [27, -45]], IRON, 1.6);
  k.sun(0, -74, 4.6, 8);
  // torres redondas dos cantos, com frestas e a coroa de ameias
  for (const s of [-1, 1]) {
    const x = s * (hw - 24);
    k.drum(x, -3, 27, 110);
    for (const [dx, y] of [[-9, -70], [9, -70], [0, -40]] as const) k.slit(x + dx, y, 16);
    c.beginPath(); c.ellipse(x, -113, 24, 6.4, 0, 0, Math.PI * 2); c.fillStyle = k.fade(-120, -106, GRANITE.base, GRANITE.dark); c.fill();
    for (let j = 0; j < 7; j++) { const a = (0.08 + (j / 6) * 0.84) * Math.PI, mx = x + 28 * Math.cos(a), my = -112 + 7.6 * Math.sin(a); k.crenels(mx - 4.5, mx + 4.5, my, 9, 7, 9); }
  }
  b.line([[-hw, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Torre de menagem no meio do terraço: o corpo de pedra, o topo com ameias, a porta, frestas, estandartes e a bandeira no mastro. */
function keep(k: HallKit, v: number): void {
  const c = k.c, b = k.b, w = 72, base = -168, top = base - 76, far = top - 84;
  b.poly([[w, base], [w + 22, base + 7], [w + 22, far + 30], [w, far + 12]]); c.fillStyle = k.sweep(w, w + 22, "rgba(27,31,42,0.42)", "rgba(27,31,42,0)"); c.fill();
  c.fillStyle = k.fade(base, base + 10, "rgba(27,31,42,0.4)", "rgba(27,31,42,0)"); c.fillRect(-w, base, w * 2 + 10, 10);
  // topo: lajes mais escuras cercadas pelo parapeito
  c.fillStyle = k.fade(far, top, TERRACE.base, TERRACE.dark); c.fillRect(-w, far, w * 2, top - far);
  c.fillStyle = k.fade(far, far + 10, LIMESTONE.light, LIMESTONE.base); c.fillRect(-w, far, w * 2, 10);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-w, far, w * 2, top - far); c.strokeRect(-w, far, w * 2, 10);
  k.crenels(-w, w, far, 16, 10, 9);
  // bandeira da capital: mastro, o pano azul que voa para a direita e o sol dourado
  b.line([[0, far + 44], [0, far - 26]], WOOD.dark, 2.2); ellipse(c, 0, far - 27, 2.8, 2.8, GOLD.base);
  c.beginPath(); c.moveTo(1, far - 24); c.bezierCurveTo(14, far - 30, 26, far - 18, 44, far - 23); c.lineTo(42, far + 1); c.bezierCurveTo(26, far + 6, 14, far - 6, 1, far); c.closePath();
  c.fillStyle = k.sweep(0, 44, ROYAL.light, ROYAL.dark); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 1.2; c.stroke();
  k.sun(22, far - 11, 3.6, 8);
  // corpo: cantaria, cornija, ameias, porta para o terraço, frestas e dois estandartes
  k.ashlar(-w, w, top, base, v + 1, LIMESTONE, 8);
  k.cornice(-w, w, top);
  k.crenels(-w, w, top - 6, 16);
  k.door(0, base, 22, 32);
  for (const s of [-1, 1]) { k.slit(s * 26, base - 44, 16); new Banner(c).hang(s * 50, top + 12, 13, 40); }
  k.sun(0, base - 56, 4.4, 8);
}

/** Escudo da Guarda preso ao muro: azul, com a borda e o sol dourados. */
function shield(k: HallKit, x: number, y: number): void {
  const c = k.c;
  c.beginPath(); c.moveTo(x - 7, y - 8); c.lineTo(x + 7, y - 8); c.lineTo(x + 7, y); c.quadraticCurveTo(x + 6, y + 7, x, y + 10); c.quadraticCurveTo(x - 6, y + 7, x - 7, y); c.closePath();
  c.fillStyle = k.sweep(x - 7, x + 7, ROYAL.light, ROYAL.dark); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 1.4; c.stroke();
  ellipse(c, x, y - 1, 2.6, 2.6, GOLD.base); ellipse(c, x - 0.8, y - 1.8, 1, 0.8, rgba(GOLD.light, 0.95));
}

/** Cavalete de lanças: dois pés, a travessa e as lanças encostadas, com a ponta de ferro. */
function rack(k: HallKit, x: number, y: number): void {
  const c = k.c, b = k.b;
  ellipse(c, x + 4, y + 2, 24, 4, rgba(OUTLINE, 0.22));
  for (const dx of [-18, 18]) b.line([[x + dx, y], [x + dx, y - 22]], WOOD.dark, 2.6);
  b.line([[x - 20, y - 16], [x + 20, y - 16]], WOOD.base, 2.4); b.line([[x - 20, y - 5], [x + 20, y - 5]], WOOD.base, 2);
  for (const dx of [-12, -4, 4, 12]) {
    b.line([[x + dx, y - 1], [x + dx + 2, y - 36]], WOOD.light, 1.4);
    b.poly([[x + dx + 0.4, y - 36], [x + dx + 3.6, y - 36], [x + dx + 2.4, y - 44]]); c.fillStyle = "#c8ced6"; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.6; c.stroke();
  }
}

/** Boneco de treino: poste, travessa, o corpo e a cabeça de palha amarrados e um escudo velho. */
function dummy(k: HallKit, x: number, y: number): void {
  const c = k.c, b = k.b;
  ellipse(c, x + 3, y + 1, 11, 3.2, rgba(OUTLINE, 0.24));
  b.line([[x, y], [x, y - 30]], WOOD.dark, 2.4); b.line([[x - 11, y - 20], [x + 11, y - 20]], WOOD.base, 2.2);
  c.beginPath(); c.ellipse(x, y - 16, 6.4, 8.6, 0, 0, Math.PI * 2); c.fillStyle = k.sweep(x - 7, x + 7, STRAW.light, STRAW.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  c.beginPath(); c.arc(x, y - 30, 4.6, 0, Math.PI * 2); c.fillStyle = STRAW.base; c.fill(); c.stroke();
  for (const dy of [-20, -13]) b.line([[x - 6, y + dy], [x + 6, y + dy]], WOOD.dark, 0.9);
  ellipse(c, x - 9, y - 15, 3.6, 4.6, "#8a8f98"); ellipse(c, x - 9.6, y - 16, 1.4, 1.8, rgba(GLINT, 0.6));
}

/** Alvo de arqueiro num tripé: os aros brancos, azuis e o centro dourado. */
function target(k: HallKit, x: number, y: number): void {
  const c = k.c, b = k.b;
  ellipse(c, x + 3, y + 1, 12, 3.2, rgba(OUTLINE, 0.24));
  b.line([[x - 9, y], [x, y - 22]], WOOD.dark, 1.8); b.line([[x + 9, y], [x, y - 22]], WOOD.dark, 1.8);
  for (const [r, color] of [[11, STRAW.light], [8, ROYAL.base], [5, "#f3eee2"], [2.4, GOLD.base]] as const) { c.beginPath(); c.ellipse(x, y - 17, r, r * 0.92, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.strokeStyle = rgba(OUTLINE, 0.7); c.lineWidth = 0.7; c.stroke(); }
}

/** Caixote de madeira com as ripas em cruz. */
function crate(k: HallKit, x: number, y: number, s: number): void {
  const c = k.c;
  c.fillStyle = k.sweep(x - s / 2, x + s / 2, WOOD.light, WOOD.dark); c.fillRect(x - s / 2, y - s, s, s);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - s / 2, y - s, s, s);
  k.b.line([[x - s / 2, y - s], [x + s / 2, y]], rgba(WOOD.dark, 0.9), 1.2); k.b.line([[x + s / 2, y - s], [x - s / 2, y]], rgba(WOOD.dark, 0.9), 1.2);
}

/** Barril de aduelas com dois aros de ferro. */
function barrel(k: HallKit, x: number, y: number): void {
  const c = k.c;
  c.beginPath(); c.moveTo(x - 6, y - 15); c.quadraticCurveTo(x - 8.4, y - 8, x - 6, y); c.lineTo(x + 6, y); c.quadraticCurveTo(x + 8.4, y - 8, x + 6, y - 15); c.closePath();
  c.fillStyle = k.sweep(x - 8, x + 8, WOOD.light, WOOD.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  for (const dy of [-11, -4]) k.b.line([[x - 7.2, y + dy], [x + 7.2, y + dy]], IRON, 1.5);
  c.beginPath(); c.ellipse(x, y - 15, 6, 2, 0, 0, Math.PI * 2); c.fillStyle = WOOD.base; c.fill(); c.stroke();
}
