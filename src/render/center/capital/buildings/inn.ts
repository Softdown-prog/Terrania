import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, IRON, OUTLINE, WOOD } from "../../kit/index.ts";
import { AWNING, GLASS_WARM, TERRACOTTA, TIMBER } from "./palette.ts";
import { TimberKit } from "./timber.ts";

/** A Hospedaria dos Viajantes ocupa o terreno inteiro (11 × 13 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const INN = { width: 352, depth: 416, rise: 28 } as const;

/**
 * Hospedaria dos Viajantes (ADR 0060): uma estalagem de madeira aparente de telhado de barro com duas chaminés que fumegam,
 * águas-furtadas acesas, janelas grandes de luz quente com floreiras, um alpendre de toldo listrado sobre a porta, a placa da
 * cama e da caneca num braço de ferro, mesas e bancos na frente, barris e uma roda de carroça encostada.
 */
export function paintTravelersInn(c: CanvasRenderingContext2D): void {
  const t = new TimberKit(c), k = t.h, b = k.b, hw = INN.width / 2, H = 96, back = -(INN.depth + 14), v = 13;
  k.castShadow(hw, INN.depth, H);
  const roof = k.hipRoof(-hw, hw, -H, back, v, TERRACOTTA);
  for (const x of [-104, 104]) dormer(t, x, -124);
  k.gableRoof(-70, 70, -H - 12, -230, 46, v + 5, TERRACOTTA);
  for (const x of [-110, 112]) chimney(t, x, roof.ridge + 30);
  t.halfTimber(-hw, hw, -H, 0, v);
  c.fillStyle = k.fade(-H - 6, -H + 2, TIMBER.light, TIMBER.dark); c.fillRect(-hw - 4, -H - 6, hw * 2 + 8, 8);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-hw - 4, -H - 6, hw * 2 + 8, 8);
  // quatro janelas grandes acesas, com veneziana vermelha e floreira
  for (const s of [-1, 1] as const) for (const x of [70, 112]) {
    const wx = s * x;
    k.window(wx, -30, 24, 42, GLASS_WARM); t.shutters(wx, -30, 24, 42, TERRACOTTA); t.flowerBox(wx, -28, 32, "#e8545a", "#f3d34f"); k.spill(wx, -50, 30, "#ffd27a");
  }
  // alpendre: dois pilares de madeira sustentam o toldo listrado sobre a porta e a escada
  t.awning(-48, 48, -78, 26);
  for (const s of [-1, 1] as const) { c.fillStyle = k.sweep(s * 46 - 3, s * 46 + 3, WOOD.light, WOOD.dark); c.fillRect(s * 46 - 3, -78, 6, 78); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(s * 46 - 3, -78, 6, 78); }
  k.door(0, 0, 40, 54, WOOD);
  k.steps(-34, 34, 0, 2);
  for (const s of [-1, 1] as const) k.lantern(s * 30, -50);
  t.hangingSign(-152, -72, 36, 32, TERRACOTTA); innEmblem(t, -152, -57);
  // mesas e bancos na frente, barris, roda de carroça e saco de grãos
  table(t, -150, 4); table(t, 150, 4);
  t.barrel(-168, 0); t.barrel(-154, -8); t.barrel(170, -2); wheel(t, 174, 0); t.sack(-130, 0);
  b.line([[-hw, 0], [-34, 0]], OUTLINE, 1.1); b.line([[34, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Chaminé de tijolo com o capelo de pedra e a fumaça subindo. */
function chimney(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, k = t.h;
  c.fillStyle = k.sweep(x - 9, x + 9, "#c97a5a", "#7a3e2a"); c.fillRect(x - 9, y - 40, 18, 40);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 9, y - 40, 18, 40);
  c.beginPath(); for (let yy = y - 34; yy < y; yy += 6) { c.moveTo(x - 9, yy); c.lineTo(x + 9, yy); } c.strokeStyle = rgba("#3b1a10", 0.5); c.lineWidth = 0.7; c.stroke();
  c.fillStyle = k.fade(y - 46, y - 40, GLINT, "#b9b2a0"); c.fillRect(x - 12, y - 46, 24, 6); c.strokeRect(x - 12, y - 46, 24, 6);
  t.smoke(x, y - 52);
}

/** Água-furtada de telhado de barro com a janela acesa. */
function dormer(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, k = t.h;
  k.gableRoof(x - 8, x + 8, y - 16, y - 42, 10, 13, TERRACOTTA);
  k.b.poly([[x - 11, y], [x - 11, y - 16], [x, y - 26], [x + 11, y - 16], [x + 11, y]]);
  c.fillStyle = k.sweep(x - 11, x + 11, "#efe3c6", "#bfae86"); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  k.window(x, y - 2, 8, 13, GLASS_WARM);
}

/** A cama e a caneca da hospedaria, em dourado sobre o fundo da placa: o travesseiro, o colchão, os pés e a caneca com espuma. */
function innEmblem(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b;
  c.fillStyle = "#f0e6cc"; c.fillRect(x - 14, y - 7, 11, 5);
  c.fillStyle = GOLD.base; c.fillRect(x - 15, y - 2, 18, 5); c.fillStyle = GOLD.dark; c.fillRect(x - 15, y + 3, 2.4, 5); c.fillRect(x + 0.6, y + 3, 2.4, 5);
  c.fillStyle = GOLD.light; c.fillRect(x + 7, y - 4, 8, 10); ellipse(c, x + 11, y - 5, 5, 2.6, "#fff6dc"); b.line([[x + 15, y - 2], [x + 18, y - 2], [x + 18, y + 3], [x + 15, y + 3]], GOLD.light, 1.3);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(x + 7, y - 4, 8, 10);
}

/** Mesa de madeira com dois bancos e uma caneca em cima, a base em (x, y). */
function table(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b;
  ellipse(c, x + 3, y + 3, 24, 5, rgba(OUTLINE, 0.22));
  for (const dx of [-14, 14]) b.line([[x + dx, y - 12], [x + dx, y + 1]], WOOD.dark, 3);
  c.fillStyle = t.h.fade(y - 16, y - 10, WOOD.light, WOOD.base); c.fillRect(x - 22, y - 16, 44, 6); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 22, y - 16, 44, 6);
  for (const dx of [-30, 30]) { c.fillStyle = WOOD.base; c.fillRect(x + dx - 6, y - 8, 12, 3); b.line([[x + dx - 4, y - 5], [x + dx - 4, y + 1]], WOOD.dark, 2); b.line([[x + dx + 4, y - 5], [x + dx + 4, y + 1]], WOOD.dark, 2); }
  c.fillStyle = GOLD.light; c.fillRect(x - 3, y - 24, 6, 8); ellipse(c, x, y - 24, 3.4, 1.6, "#fff6dc"); c.strokeStyle = OUTLINE; c.strokeRect(x - 3, y - 24, 6, 8);
}

/** Roda de carroça encostada na parede: o aro de ferro, oito raios e o cubo, a base em (x, y). */
function wheel(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b, r = 16;
  c.beginPath(); c.arc(x, y - r, r, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 5.2; c.stroke(); c.strokeStyle = IRON; c.lineWidth = 3; c.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.line([[x, y - r], [x + Math.cos(a) * (r - 1), y - r + Math.sin(a) * (r - 1)]], WOOD.base, 1.7); }
  ellipse(c, x, y - r, 3.4, 3.4, WOOD.dark); ellipse(c, x, y - r, 1.4, 1.4, AWNING.cream);
}
