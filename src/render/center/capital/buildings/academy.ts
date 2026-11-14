import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, OUTLINE } from "../../kit/index.ts";
import { HallKit } from "./kit.ts";
import { ARCANE, GLASS_ARCANE, HOLLOW, SLATE_ARCANE } from "./palette.ts";

/** A Academia Arcana ocupa o terreno inteiro (11 × 11 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const ACADEMY = { width: 352, depth: 352, rise: 58 } as const;

/**
 * Academia Arcana (ADR 0058), a guilda do mago: um quadrado de calcário com telhado de ardósia arroxeada, quatro torreões de
 * ponta de cristal e, no meio, o observatório redondo de cúpula violeta com a fenda do telescópio e um cristal que flutua
 * sobre ela. As janelas em ogiva brilham em violeta e o sinete arcano fica no frontão sobre a porta. O violeta é a cor da Academia.
 */
export function paintArcaneAcademy(c: CanvasRenderingContext2D): void {
  const k = new HallKit(c), b = k.b, hw = ACADEMY.width / 2, H = 88, back = -(ACADEMY.depth + 14), v = 9;
  k.castShadow(hw, ACADEMY.depth, H);
  const roof = k.hipRoof(-hw, hw, -H, back, v, SLATE_ARCANE);
  // torreões de trás: só o telhado e o cristal aparecem atrás do telhado
  for (const s of [-1, 1]) { k.cone(s * (hw - 20), back + 30, 16, 46, SLATE_ARCANE); crystal(k, s * (hw - 20), back - 22, 5); }
  // observatório: tambor de pedra com janelas acesas, cúpula violeta de nervuras douradas, a fenda e o telescópio de latão
  const cy = roof.ridge + 26;
  k.drum(0, cy, 60, 42);
  for (const dx of [-42, -22, 0, 22, 42]) { const wy = cy - 7 + Math.sqrt(1 - (dx / 60) ** 2) * 16; k.window(dx, wy, 9, 22, GLASS_ARCANE, true); }
  k.spill(0, cy - 14, 54, ARCANE.light);
  k.dome(0, cy - 42, 56, 58, ARCANE, 10);
  b.poly([[4, cy - 99], [13, cy - 97], [30, cy - 50], [15, cy - 44]]); c.fillStyle = HOLLOW; c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 1.2; c.stroke();
  b.poly([[14, cy - 72], [20, cy - 76], [44, cy - 100], [39, cy - 105]]); c.fillStyle = k.sweep(14, 44, GOLD.light, GOLD.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  ellipse(c, 41.5, cy - 102.5, 4.4, 3, GOLD.base); ellipse(c, 41.5, cy - 102.5, 2.6, 1.7, "#bfe6ff");
  crystal(k, 0, cy - 126, 9);
  // fachada: cantaria, cornija, janelas em ogiva que brilham, panos violeta e o frontão com o sinete arcano
  k.ashlar(-hw, hw, -H, 0, v);
  k.cornice(-hw, hw, -H);
  for (const s of [-1, 1]) {
    for (const x of [50, 86, 122]) { k.window(s * x, -20, 16, 42, GLASS_ARCANE, true); k.spill(s * x, -40, 22, ARCANE.light); }
    k.cloth(s * 68, -80, 10, 34, ARCANE); k.cloth(s * 104, -80, 10, 34, ARCANE);
  }
  k.pediment(-34, 34, -H - 6, 30);
  sigil(k, 0, -H - 18, 8);
  k.door(0, 0, 36, 48, undefined, true);
  sigil(k, 0, -70, 6);
  for (const s of [-1, 1]) { crystal(k, s * 32, -30, 5); b.line([[s * 32, -22], [s * 32, 0]], "#3b414d", 2); ellipse(c, s * 32, -1, 5, 1.8, "#3b414d"); }
  k.steps(-28, 28, 0, 2);
  // torreões da frente: corpo redondo, janelas, o telhado cônico e a ponta de cristal
  for (const s of [-1, 1]) {
    const x = s * (hw - 17);
    k.drum(x, -3, 18, 118);
    for (const y of [-84, -48]) k.window(x, y, 7, 18, GLASS_ARCANE, true);
    k.cone(x, -119, 23, 56, SLATE_ARCANE);
    crystal(k, x, -183, 5);
  }
  b.line([[-hw, 0], [-28, 0]], OUTLINE, 1.1); b.line([[28, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Cristal arcano: um losango violeta facetado com o clarão em volta. */
function crystal(k: HallKit, x: number, y: number, s: number): void {
  const c = k.c, b = k.b;
  k.spill(x, y, s * 3.2, ARCANE.light);
  b.poly([[x, y - s * 1.7], [x + s, y], [x, y + s * 1.5], [x - s, y]]);
  c.fillStyle = k.sweep(x - s, x + s, GLASS_ARCANE.light, GLASS_ARCANE.dark); c.fill(); c.strokeStyle = ARCANE.dark; c.lineWidth = 0.9; c.stroke();
  b.line([[x, y - s * 1.7], [x - s * 0.2, y], [x, y + s * 1.5]], rgba(GLINT, 0.7), 0.8); b.line([[x - s, y], [x + s, y]], rgba(ARCANE.dark, 0.6), 0.7);
}

/** Sinete arcano: aro dourado com a estrela de seis pontas e o brilho violeta por dentro. */
function sigil(k: HallKit, x: number, y: number, r: number): void {
  const c = k.c;
  k.spill(x, y, r * 2.2, ARCANE.light);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = k.sweep(x - r, x + r, ARCANE.base, ARCANE.dark); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 1.5; c.stroke();
  for (const turn of [0, Math.PI]) {
    c.beginPath();
    for (let i = 0; i < 3; i++) { const a = turn - Math.PI / 2 + (i / 3) * Math.PI * 2, px = x + Math.cos(a) * r * 0.78, py = y + Math.sin(a) * r * 0.78; if (i === 0) c.moveTo(px, py); else c.lineTo(px, py); }
    c.closePath(); c.strokeStyle = GOLD.light; c.lineWidth = 0.9; c.stroke();
  }
  ellipse(c, x, y, r * 0.2, r * 0.2, rgba(GLINT, 0.95));
}
