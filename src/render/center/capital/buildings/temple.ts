import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, IRON, OUTLINE } from "../../kit/index.ts";
import { COPPER, GLASS, GLASS_WARM, HOLLOW, MARBLE } from "./palette.ts";
import { TimberKit } from "./timber.ts";

/** O Templo da Concórdia ocupa o terreno inteiro (11 × 13 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const TEMPLE = { width: 352, depth: 416, rise: 78 } as const;

/**
 * Templo da Concórdia (ADR 0060), a fé dos cinco povos: uma nave de mármore claro de telhado de cobre cinzento-esverdeado, com
 * o pórtico de quatro colunas sob o frontão do sol dourado, janelas de vitral nas naves laterais, braseiros acesos nos degraus
 * e, no meio do telhado, o campanário de arcos abertos com o sino, a agulha de cobre e o grande sol de ouro no alto.
 */
export function paintConcordTemple(c: CanvasRenderingContext2D): void {
  const t = new TimberKit(c), k = t.h, b = k.b, hw = TEMPLE.width / 2, H = 96, back = -(TEMPLE.depth + 14), v = 17;
  k.castShadow(hw, TEMPLE.depth, H);
  const roof = k.hipRoof(-hw, hw, -H, back, v, COPPER);
  k.gableRoof(-96, 96, -H - 10, -246, 50, v + 5, COPPER);
  belfry(t, roof.ridge + 20);
  // naves laterais: parede de mármore com vitrais altos e pilastras entre eles
  marble(t, -hw, hw, -H, 0, v);
  k.cornice(-hw, hw, -H, MARBLE);
  k.quoins(-hw, -H, 0, 1); k.quoins(hw, -H, 0, -1);
  for (const s of [-1, 1] as const) {
    for (const x of [58, 112, 156]) { k.window(s * x, -22, 22, 56, x === 112 ? GLASS_WARM : GLASS, true); k.spill(s * x, -44, 28, x === 112 ? "#ffd27a" : "#9fc4f0"); }
    for (const x of [84, 134, 176]) k.pilaster(s * x, -H, 0);
    k.cloth(s * 36, -86, 12, 36, { light: "#fff6dc", base: "#e0c46a", dark: "#8a6a24" });
  }
  // pórtico: quatro colunas, o entablamento com o friso dourado, o frontão com o sol e a porta grande
  c.fillStyle = k.fade(-100, -4, MARBLE.base, MARBLE.dark); c.fillRect(-74, -100, 148, 100);
  c.fillStyle = k.fade(-100, -60, "rgba(27,31,42,0.5)", "rgba(27,31,42,0)"); c.fillRect(-74, -100, 148, 40);
  k.door(0, 0, 42, 62, undefined, true);
  for (const s of [-1, 1] as const) { k.window(s * 52, -22, 14, 46, GLASS_WARM, true); k.spill(s * 52, -40, 22, "#ffd27a"); }
  k.steps(-80, 80, 0, 4, 3, 5);
  for (const x of [-72, -26, 26, 72]) k.column(x, 0, 104);
  c.fillStyle = k.fade(-118, -104, GLINT, MARBLE.base); c.fillRect(-82, -118, 164, 14); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-82, -118, 164, 14);
  c.fillStyle = GOLD.base; c.fillRect(-80, -112, 160, 2.2); c.fillStyle = rgba(GOLD.light, 0.9); c.fillRect(-80, -112, 160, 0.8);
  k.pediment(-82, 82, -118, 46, MARBLE);
  k.sun(0, -134, 8.5, 16);
  // braseiros acesos nos degraus e as lanternas
  for (const s of [-1, 1] as const) { brazier(t, s * 98, -2); k.lantern(s * 38, -58); }
  b.line([[-hw, 0], [-84, 0]], OUTLINE, 1.1); b.line([[84, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Parede de mármore em blocos grandes (fiadas de 16 px) com veios, soco de pedra e a sombra do lado direito. */
function marble(t: TimberKit, x0: number, x1: number, yTop: number, yBase: number, v: number): void {
  const c = t.h.c, k = t.h, w = x1 - x0;
  k.ashlar(x0, x1, yTop, yBase, v, MARBLE, 12);
  c.save(); c.beginPath(); c.rect(x0, yTop, w, yBase - yTop - 12); c.clip();
  for (let i = 0, n = Math.round(w / 22); i < n; i++) { // veios de mármore: riscos finos em diagonal
    const x = x0 + ((i * 37 + v * 11) % w), y = yTop + ((i * 53 + v * 7) % (yBase - yTop - 20));
    k.b.line([[x, y], [x + 14, y + 7], [x + 22, y + 5]], rgba("#8a8f9a", 0.28), 0.9);
  }
  c.restore();
}

/** Campanário no meio do telhado: o corpo de mármore, a galeria de três arcos com o sino, a agulha de cobre e o sol de ouro. */
function belfry(t: TimberKit, base: number): void {
  const c = t.h.c, k = t.h, b = k.b, w = 46, floor = base - 58, top = floor - 56;
  c.fillStyle = k.sweep(-w, w, MARBLE.light, MARBLE.dark); c.fillRect(-w, floor, w * 2, base - floor);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-w, floor, w * 2, base - floor);
  for (let y = floor + 10; y < base; y += 10) b.line([[-w, y], [w, y]], rgba(MARBLE.dark, 0.5), 0.8);
  k.window(0, base - 12, 16, 36, GLASS_WARM, true);
  c.beginPath(); c.arc(0, floor + 16, 9, 0, Math.PI * 2); c.fillStyle = HOLLOW; c.fill(); k.sun(0, floor + 16, 4.4, 12);
  c.fillStyle = k.fade(floor - 6, floor, MARBLE.light, MARBLE.base); c.fillRect(-w - 4, floor - 6, w * 2 + 8, 6); c.strokeRect(-w - 4, floor - 6, w * 2 + 8, 6);
  // galeria aberta de três arcos
  c.fillStyle = HOLLOW; c.fillRect(-w + 4, top, (w - 4) * 2, floor - 6 - top);
  for (let i = 0; i < 3; i++) {
    const cx = -w + 4 + ((w - 4) * 2 / 6) * (1 + 2 * i), r = ((w - 4) * 2) / 6 - 4;
    c.beginPath(); c.moveTo(cx - r, floor - 6); c.lineTo(cx - r, top + r + 6); c.arc(cx, top + r + 6, r, Math.PI, 0); c.lineTo(cx + r, floor - 6); c.closePath(); c.fillStyle = "#1c1612"; c.fill();
    c.strokeStyle = rgba(MARBLE.light, 0.95); c.lineWidth = 2.6; c.stroke();
  }
  for (const x of [-w + 6, -14, 14, w - 6]) { c.fillStyle = k.sweep(x - 3, x + 3, MARBLE.light, MARBLE.dark); c.fillRect(x - 3, top - 2, 6, floor - top + 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 3, top - 2, 6, floor - top + 2); }
  bell(t, 0, top + 8);
  c.fillStyle = k.fade(top - 6, top, MARBLE.light, MARBLE.base); c.fillRect(-w - 4, top - 6, w * 2 + 8, 6); c.strokeRect(-w - 4, top - 6, w * 2 + 8, 6);
  k.cone(0, top - 6, w + 6, 62, COPPER);
  b.line([[0, top - 68], [0, top - 80]], GOLD.base, 2); k.sun(0, top - 88, 8, 16);
}

/** O sino de bronze pendurado na galeria: o jugo, o corpo em sino e o badalo. */
function bell(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b;
  b.line([[x - 9, y], [x + 9, y]], IRON, 2.4);
  c.beginPath(); c.moveTo(x - 4, y + 2); c.quadraticCurveTo(x - 4, y + 10, x - 9, y + 20); c.lineTo(x + 9, y + 20); c.quadraticCurveTo(x + 4, y + 10, x + 4, y + 2); c.closePath();
  c.fillStyle = t.h.sweep(x - 9, x + 9, GOLD.light, GOLD.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, x, y + 22, 2.2, 2.2, IRON); ellipse(c, x - 3, y + 8, 1.2, 4, rgba(GLINT, 0.55));
}

/** Braseiro de ferro sobre três pés com a chama acesa e brasas, a base em (x, y). */
function brazier(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b;
  ellipse(c, x + 3, y + 2, 14, 3.4, rgba(OUTLINE, 0.25));
  for (const dx of [-8, 0, 8]) b.line([[x + dx * 0.5, y - 20], [x + dx, y]], IRON, 2.2);
  c.beginPath(); c.moveTo(x - 13, y - 26); c.lineTo(x + 13, y - 26); c.lineTo(x + 8, y - 17); c.lineTo(x - 8, y - 17); c.closePath();
  c.fillStyle = t.h.sweep(x - 13, x + 13, "#6a7080", "#2f3440"); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, x, y - 26, 12, 3, "#7a2a14"); for (const dx of [-6, -1, 5]) ellipse(c, x + dx, y - 26.4, 2, 1.1, "#ffb347");
  t.flame(x, y - 26, 20);
}
