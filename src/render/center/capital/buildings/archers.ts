import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, IRON, OUTLINE, WOOD } from "../../kit/index.ts";
import { GLASS_WARM, FOREST, SHINGLE, TIMBER } from "./palette.ts";
import { TimberKit } from "./timber.ts";

/** A Irmandade dos Arqueiros ocupa o terreno inteiro (12 × 13 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const ARCHERS = { width: 384, depth: 416, rise: 58 } as const;

/**
 * Irmandade dos Arqueiros (ADR 0060), a guilda do arqueiro: um pavilhão de caça de madeira aparente sobre soco de pedra, com
 * telhado de telhas de madeira de quatro águas, uma empena sobre a porta, a torre de vigia de galeria aberta e telhado cônico
 * verde no meio, alvos de treino e carcaz na parede, fardos de feno e um suporte de arcos. O verde-floresta é a cor da guilda.
 */
export function paintArchersLodge(c: CanvasRenderingContext2D): void {
  const t = new TimberKit(c), k = t.h, b = k.b, hw = ARCHERS.width / 2, H = 98, back = -(ARCHERS.depth + 14), v = 11;
  k.castShadow(hw, ARCHERS.depth, H);
  const roof = k.hipRoof(-hw, hw, -H, back, v, SHINGLE);
  for (const x of [-132, 132]) dormer(t, x, -128);
  k.gableRoof(-84, 84, -H - 14, -262, 50, v + 5, SHINGLE);
  lookout(t, roof.ridge + 6, v);
  for (const x of [roof.left + 8, roof.right - 8]) k.pennant(x, roof.ridge, 28, FOREST, 20);
  // parede da frente: madeira aparente, viga do beiral e as janelas com veneziana e floreira
  t.halfTimber(-hw, hw, -H, 0, v);
  c.fillStyle = k.fade(-H - 6, -H + 2, TIMBER.light, TIMBER.dark); c.fillRect(-hw - 4, -H - 6, hw * 2 + 8, 8);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(-hw - 4, -H - 6, hw * 2 + 8, 8);
  for (const s of [-1, 1] as const) for (const x of [96, 150]) {
    const wx = s * x;
    k.window(wx, -34, 18, 36, GLASS_WARM); t.shutters(wx, -34, 18, 36, FOREST); t.flowerBox(wx, -32, 26, "#e8545a", "#f3d34f");
    k.spill(wx, -50, 24, "#ffd27a");
  }
  // porta de carvalho em arco sob um beiral, a escada e o brasão do arco e flecha entre dois panos verdes
  for (const s of [-1, 1] as const) { k.cloth(s * 52, -88, 13, 44, FOREST); bowEmblem(t, s * 52, -64, 0.8); }
  k.door(0, 0, 46, 58);
  k.steps(-30, 30, 0, 2);
  bowEmblem(t, 0, -86, 1.5);
  for (const s of [-1, 1] as const) k.lantern(s * 36, -50);
  // alvos de treino presos à parede, carcaz com flechas, suporte de arcos, fardos e barris
  for (const x of [-178, 178]) target(t, x, -52, x < 0 ? 1 : -1);
  for (const x of [-72, 72]) quiver(t, x, -34);
  rack(t, -118, 0);
  t.hay(124, 0); t.hay(150, 0); t.hay(137, -14); t.barrel(168, 0); t.sack(-176, 0);
  b.line([[-hw, 0], [-30, 0]], OUTLINE, 1.1); b.line([[30, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Torre de vigia de madeira sobre a cumeeira: quatro pilares, galeria aberta com guarda-corpo, telhado cônico verde e a flâmula. */
function lookout(t: TimberKit, ridge: number, v: number): void {
  const c = t.h.c, k = t.h, b = k.b, w = 44, base = ridge + 8, floor = base - 62;
  c.fillStyle = k.sweep(-w, w, TIMBER.light, TIMBER.dark); c.fillRect(-w, floor, w * 2, base - floor);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-w, floor, w * 2, base - floor);
  for (let x = -w + 7; x < w; x += 14) b.line([[x, floor], [x, base]], rgba("#1e1410", 0.7), 0.9);
  b.line([[-w, floor + 8], [w, floor + 8]], rgba("#1e1410", 0.8), 1.4);
  c.fillStyle = k.sweep(-w, w, "#4a3320", "#26180f"); c.fillRect(-12, base - 30, 24, 30);
  b.line([[-w - 6, floor], [w + 6, floor]], OUTLINE, 5); b.line([[-w - 6, floor], [w + 6, floor]], WOOD.light, 3);
  // galeria aberta: o escuro entre quatro pilares, com o guarda-corpo na frente
  const top = floor - 42;
  c.fillStyle = "#14100c"; c.fillRect(-w + 6, top, (w - 6) * 2, floor - top);
  for (const x of [-w + 4, -14, 14, w - 4]) { c.fillStyle = k.sweep(x - 3, x + 3, WOOD.light, WOOD.dark); c.fillRect(x - 3, top - 4, 6, floor - top + 4); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - 3, top - 4, 6, floor - top + 4); }
  c.fillStyle = k.fade(floor - 14, floor, WOOD.light, WOOD.dark); c.fillRect(-w + 2, floor - 14, (w - 2) * 2, 4);
  for (let x = -w + 8; x < w - 4; x += 8) b.line([[x, floor - 10], [x, floor]], WOOD.dark, 1.5);
  ellipse(c, 0, floor - 24, 4, 4, rgba(GLINT, 0.9)); b.line([[0, floor - 20], [0, floor - 8]], "#7a6226", 2); // o vigia com a lanterna
  k.cone(0, top - 3, w + 10, 64, FOREST);
  k.pennant(0, top - 64, 22, FOREST, 20);
  void v;
}

/** Água-furtada de madeira com a sua janela acesa. */
function dormer(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, k = t.h;
  k.gableRoof(x - 8, x + 8, y - 16, y - 42, 10, 13, SHINGLE);
  k.b.poly([[x - 11, y], [x - 11, y - 16], [x, y - 26], [x + 11, y - 16], [x + 11, y]]);
  c.fillStyle = k.sweep(x - 11, x + 11, "#e9dfc4", "#b9ab84"); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  k.window(x, y - 2, 8, 13, GLASS_WARM);
}

/** Arco e flecha em dois traços: o arco curvo, a corda e a flecha com a ponta e a pena; `s` é a escala. */
function bowEmblem(t: TimberKit, x: number, y: number, s: number): void {
  const c = t.h.c, b = t.h.b;
  c.beginPath(); c.arc(x - 3 * s, y, 11 * s, -Math.PI * 0.42, Math.PI * 0.42); c.strokeStyle = GOLD.light; c.lineWidth = 2 * s; c.stroke();
  b.line([[x - 3 * s + Math.cos(-Math.PI * 0.42) * 11 * s, y + Math.sin(-Math.PI * 0.42) * 11 * s], [x - 3 * s + Math.cos(Math.PI * 0.42) * 11 * s, y + Math.sin(Math.PI * 0.42) * 11 * s]], rgba(GLINT, 0.9), 0.8 * s);
  b.line([[x - 9 * s, y], [x + 11 * s, y]], "#e8ecf1", 1.2 * s); b.poly([[x + 11 * s, y - 2.4 * s], [x + 15 * s, y], [x + 11 * s, y + 2.4 * s]]); c.fillStyle = "#c8ced6"; c.fill();
  b.line([[x - 9 * s, y], [x - 12 * s, y - 2.6 * s]], FOREST.light, 1.1 * s); b.line([[x - 9 * s, y], [x - 12 * s, y + 2.6 * s]], FOREST.light, 1.1 * s);
}

/** Alvo de treino preso à parede em (x, y): aros vermelhos, creme e verdes, o centro dourado e uma flecha cravada; `side` inverte a flecha. */
function target(t: TimberKit, x: number, y: number, side: 1 | -1): void {
  const c = t.h.c, b = t.h.b;
  for (const [r, color] of [[13, "#f0e6cc"], [10.4, "#b8322e"], [7.8, "#f0e6cc"], [5.2, FOREST.base], [2.6, GOLD.base]] as const) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); c.strokeStyle = rgba(OUTLINE, 0.8); c.lineWidth = 0.7; c.stroke(); }
  b.line([[x, y], [x + side * 15, y - 7]], "#e8ecf1", 1.3); b.line([[x + side * 15, y - 7], [x + side * 19, y - 10]], FOREST.light, 1.6);
  ellipse(c, x - 4, y - 5, 2.4, 1.4, rgba(GLINT, 0.5));
}

/** Carcaz pendurado: a bolsa de couro e as flechas com a pena verde; a base em (x, yBase), 28 px de altura. */
function quiver(t: TimberKit, x: number, yBase: number): void {
  const c = t.h.c, b = t.h.b;
  for (const dx of [-3, 0, 3]) { b.line([[x + dx, yBase - 28], [x + dx * 1.4, yBase - 38]], "#e8ecf1", 1); b.line([[x + dx * 1.4, yBase - 38], [x + dx * 1.7, yBase - 41]], FOREST.light, 1.8); }
  b.poly([[x - 6, yBase - 28], [x + 6, yBase - 28], [x + 5, yBase], [x - 5, yBase]]); c.fillStyle = t.h.sweep(x - 6, x + 6, "#a8743c", "#5c3a1c"); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  b.line([[x - 6, yBase - 18], [x + 6, yBase - 18]], GOLD.base, 1.2);
}

/** Suporte de arcos encostado na parede: dois pés, a travessa e quatro arcos de madeira com a corda. */
function rack(t: TimberKit, x: number, y: number): void {
  const c = t.h.c, b = t.h.b;
  ellipse(c, x + 4, y + 2, 26, 4, rgba(OUTLINE, 0.22));
  for (const dx of [-20, 20]) b.line([[x + dx, y], [x + dx, y - 26]], WOOD.dark, 3); b.line([[x - 22, y - 18], [x + 22, y - 18]], WOOD.base, 2.6);
  for (const dx of [-13, -4.5, 4.5, 13]) { c.beginPath(); c.arc(x + dx - 5, y - 20, 22, -0.5, 0.5); c.strokeStyle = WOOD.light; c.lineWidth = 2.2; c.stroke(); b.line([[x + dx - 5 + Math.cos(-0.5) * 22, y - 20 + Math.sin(-0.5) * 22], [x + dx - 5 + Math.cos(0.5) * 22, y - 20 + Math.sin(0.5) * 22]], rgba(GLINT, 0.7), 0.6); }
  void IRON;
}
