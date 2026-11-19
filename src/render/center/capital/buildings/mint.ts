import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, GRANITE, IRON, LIMESTONE, OUTLINE, SLATE } from "../../kit/index.ts";
import { AWNING, GLASS, HOLLOW } from "./palette.ts";
import { TimberKit } from "./timber.ts";

/** A Casa da Moeda e dos Mercadores ocupa o terreno inteiro (11 × 13 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const MINT = { width: 352, depth: 416, rise: 28 } as const;

/**
 * Casa da Moeda e dos Mercadores (ADR 0060): um banco de pedra de dois andares. No térreo, uma arcada de cinco arcos com um
 * balcão de feira e toldo listrado em cada vão e, no meio, o arco do cofre com a porta de ferro e ouro; em cima, janelas de
 * grade com moldura dourada e a grande moeda do sol sobre a cornija. Telhado de ardósia com cumeeira dourada e um cata-vento
 * em forma de moeda. Sacos, caixotes e uma balança de ouro na frente.
 */
export function paintMintHall(c: CanvasRenderingContext2D): void {
  const t = new TimberKit(c), k = t.h, b = k.b, hw = MINT.width / 2, H = 104, back = -(MINT.depth + 14), v = 15;
  k.castShadow(hw, MINT.depth, H);
  const roof = k.hipRoof(-hw, hw, -H, back, v, SLATE);
  for (const x of [-96, 96]) dormer(t, x, -130);
  // cumeeira dourada sobre as duas pontas e o cata-vento: a moeda girando no alto
  b.line([[roof.left, roof.ridge], [roof.right, roof.ridge]], GOLD.base, 2.4); b.line([[roof.left, roof.ridge - 1.4], [roof.right, roof.ridge - 1.4]], rgba(GLINT, 0.7), 0.9);
  b.line([[0, roof.ridge], [0, roof.ridge - 54]], IRON, 2.2); coin(t, 0, roof.ridge - 62, 12);
  // fachada de dois andares: o térreo em arcada, o andar de cima em cantaria
  k.ashlar(-hw, hw, -H, 0, v, LIMESTONE, 8);
  k.cornice(-hw, hw, -H);
  k.quoins(-hw, -H, 0, 1); k.quoins(hw, -H, 0, -1);
  c.fillStyle = k.fade(-52, -46, rgba(GLINT, 0.9), LIMESTONE.base); c.fillRect(-hw, -52, hw * 2, 6); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-hw, -52, hw * 2, 6);
  t.arcade(-hw + 14, hw - 14, -46, 0, 5, LIMESTONE);
  for (const x of [-132, -66, 66, 132]) t.awning(x - 28, x + 28, -34, 14, x < 0 ? AWNING.red : "#2f5fa8", AWNING.cream);
  vault(t, 0);
  // andar de cima: cinco janelas de grade com moldura dourada e a moeda do sol sobre a cornija
  for (const x of [-132, -66, 66, 132]) { k.window(x, -64, 18, 38, GLASS); bars(t, x, -64, 18, 38); goldFrame(t, x, -64, 18, 38); }
  coin(t, 0, -80, 15);
  for (const s of [-1, 1] as const) { k.cloth(s * 30, -98, 11, 34, { light: "#e0b83c", base: "#b88a1c", dark: "#6a4a0c" }); k.lantern(s * 52, -66); }
  // sacos, caixotes e a balança de ouro na frente
  t.sack(-160, 0); t.sack(-146, 0, "#d8c590"); t.crate(-124, 0, 16); t.crate(-124, -16, 12); t.crate(150, 0, 18); t.sack(168, 0);
  scales(t, 112, 0);
  b.line([[-hw, 0], [hw, 0]], OUTLINE, 1.1);
}

/** O arco do cofre no meio da arcada: porta de ferro com ouro, a fechadura e o brasão do sol sobre o arco. */
function vault(t: TimberKit, x: number): void {
  const c = t.h.c, k = t.h, b = k.b;
  c.beginPath(); c.moveTo(x - 17, 0); c.lineTo(x - 17, -30); c.arc(x, -30, 17, Math.PI, 0); c.lineTo(x + 17, 0); c.closePath();
  c.fillStyle = k.sweep(x - 17, x + 17, "#6a7080", "#2f3440"); c.fill(); c.strokeStyle = rgba(LIMESTONE.light, 0.95); c.lineWidth = 4; c.stroke(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  for (let yy = -42; yy < 0; yy += 8) b.line([[x - 17, yy], [x + 17, yy]], rgba("#14161c", 0.8), 1);
  for (const dx of [-12, 12]) for (const yy of [-34, -14]) ellipse(c, x + dx, yy, 1.6, 1.6, rgba(GLINT, 0.7));
  c.beginPath(); c.arc(x, -20, 7, 0, Math.PI * 2); c.fillStyle = k.sweep(x - 7, x + 7, GOLD.light, GOLD.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, x, -20, 2, 2, HOLLOW); b.line([[x, -20], [x, -14]], HOLLOW, 1.6);
  k.sun(x, -60, 5, 8);
}

/** Moeda dourada de pé: o disco com o aro, o sol em relevo e o reflexo. */
function coin(t: TimberKit, x: number, y: number, r: number): void {
  const c = t.h.c, k = t.h;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, GOLD.light); g.addColorStop(0.6, GOLD.base); g.addColorStop(1, GOLD.dark);
  c.fillStyle = g; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.arc(x, y, r * 0.74, 0, Math.PI * 2); c.strokeStyle = GOLD.dark; c.lineWidth = 0.9; c.stroke();
  k.sun(x, y, r * 0.3, 8); ellipse(c, x - r * 0.4, y - r * 0.46, r * 0.26, r * 0.14, rgba(GLINT, 0.75));
}

/** Grade de ferro na frente de uma janela de arco: duas barras verticais e uma horizontal. */
function bars(t: TimberKit, x: number, yBase: number, w: number, h: number): void {
  for (const dx of [-w / 4, w / 4]) t.h.b.line([[x + dx, yBase - h + w / 2], [x + dx, yBase]], IRON, 1.3);
  t.h.b.line([[x - w / 2, yBase - h * 0.45], [x + w / 2, yBase - h * 0.45]], IRON, 1.3);
}

/** Moldura dourada fina em volta de uma janela de arco. */
function goldFrame(t: TimberKit, x: number, yBase: number, w: number, h: number): void {
  const c = t.h.c, spring = yBase - h + w / 2;
  c.beginPath(); c.moveTo(x - w / 2 - 3, yBase); c.lineTo(x - w / 2 - 3, spring); c.arc(x, spring, w / 2 + 3, Math.PI, 0); c.lineTo(x + w / 2 + 3, yBase);
  c.strokeStyle = GOLD.base; c.lineWidth = 1.3; c.stroke();
}

/** Água-furtada de ardósia com a janela de vidro azul. */
function dormer(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, k = t.h;
  k.gableRoof(x - 8, x + 8, y - 16, y - 42, 10, 17, SLATE);
  k.b.poly([[x - 11, y], [x - 11, y - 16], [x, y - 26], [x + 11, y - 16], [x + 11, y]]);
  c.fillStyle = k.sweep(x - 11, x + 11, LIMESTONE.light, LIMESTONE.base); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  k.window(x, y - 2, 8, 13, GLASS);
}

/** Balança de dois pratos sobre um pedestal de pedra: o travessão, as correntes, os pratos e as moedas, a base em (x, y). */
function scales(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b;
  c.fillStyle = t.h.sweep(x - 7, x + 7, LIMESTONE.light, GRANITE.dark); c.fillRect(x - 7, y - 12, 14, 12); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 7, y - 12, 14, 12);
  b.line([[x, y - 12], [x, y - 40]], IRON, 2.4); b.line([[x - 20, y - 38], [x + 20, y - 38]], GOLD.base, 2.2); ellipse(c, x, y - 41, 2.8, 2.8, GOLD.light);
  for (const dx of [-20, 20]) { b.line([[x + dx, y - 38], [x + dx - 6, y - 27]], IRON, 0.8); b.line([[x + dx, y - 38], [x + dx + 6, y - 27]], IRON, 0.8); ellipse(c, x + dx, y - 26, 8, 2.8, GOLD.dark); ellipse(c, x + dx, y - 27.4, 7, 2.2, GOLD.base); ellipse(c, x + dx - 1, y - 29.4, 2.6, 1.4, GOLD.light); }
}
