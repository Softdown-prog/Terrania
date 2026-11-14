import { ellipse, rgba } from "../../../draw.ts";
import { Banner, GLINT, GOLD, LIMESTONE, MOSS, OUTLINE, ROYAL, SLATE } from "../../kit/index.ts";
import { HallKit } from "./kit.ts";
import { GLASS, GLASS_WARM } from "./palette.ts";

/** O Salão do Conselho ocupa o terreno inteiro (18 × 11 tiles); `rise` é quanto a arte sobe além do fundo do terreno. */
export const COUNCIL = { width: 576, depth: 352, rise: 34 } as const;

/**
 * Salão do Conselho dos Povos (ADR 0058), onde os povos humanos se governam: um palácio de calcário com duas alas de janelas
 * altas entre pilastras, a colunata central de seis colunas sob o frontão com o sol dourado da capital, telhado de ardósia de
 * quatro águas com águas-furtadas e, no meio dele, a rotunda de cúpula azul com nervuras douradas. A origem é o meio da frente.
 */
export function paintCouncilHall(c: CanvasRenderingContext2D): void {
  const k = new HallKit(c), b = k.b, hw = COUNCIL.width / 2, H = 92, back = -(COUNCIL.depth + 14), v = 3;
  k.castShadow(hw, COUNCIL.depth, H);
  // telhado: quatro águas de ardósia, as águas-furtadas da frente e o telhado da colunata, que entra no principal
  const roof = k.hipRoof(-hw, hw, -H, back, v);
  for (const x of [-236, -160, 160, 236]) dormer(k, x, -120);
  k.gableRoof(-104, 104, -110, -206, 44, v + 7);
  // rotunda: tambor de pedra com janelas, cúpula azul de nervuras douradas e o sol no alto
  const cy = roof.ridge + 16;
  k.drum(0, cy, 64, 30);
  for (const dx of [-46, -24, 0, 24, 46]) k.window(dx, cy - 5 + Math.sqrt(1 - (dx / 64) ** 2) * 17, 9, 17, GLASS_WARM);
  k.dome(0, cy - 30, 60, 62, ROYAL, 10);
  k.drum(0, cy - 90, 7, 6); k.sun(0, cy - 105, 6.5);
  for (const x of [roof.left + 8, roof.right - 8]) k.pennant(x, roof.ridge, 32, GOLD, 22);
  // alas: cantaria, cornija, cunhais, janelas altas entre pilastras, estandartes e canteiros
  k.ashlar(-hw, hw, -H, 0, v);
  k.cornice(-hw, hw, -H);
  k.quoins(-hw, -H, 0, 1); k.quoins(hw, -H, 0, -1);
  for (const s of [-1, 1] as const) {
    for (const x of [126, 166, 206, 246]) k.window(s * x, -24, 20, 50, GLASS);
    for (const x of [146, 226]) k.pilaster(s * x, -H, 0);
    for (const x of [106, 186, 268]) { k.pilaster(s * x, -H, 0); if (x === 186) new Banner(c).hang(s * x, -80, 13, 40); }
    hedge(k, s * 186 - 68, s * 186 + 68);
  }
  // corpo central: a parede na sombra da colunata, a porta do Conselho, duas janelas acesas e lanternas
  c.fillStyle = k.fade(-100, 0, LIMESTONE.base, LIMESTONE.dark); c.fillRect(-98, -100, 196, 100);
  c.fillStyle = k.fade(-100, -60, "rgba(27,31,42,0.5)", "rgba(27,31,42,0)"); c.fillRect(-98, -100, 196, 40);
  for (const s of [-1, 1]) { k.window(s * 78, -22, 16, 44, GLASS_WARM); k.spill(s * 78, -34, 26, "#ffd27a"); }
  k.door(0, 0, 38, 54);
  for (const s of [-1, 1]) k.lantern(s * 45, -44);
  // degraus, colunas, entablamento com o friso dourado, frontão com o sol e o remate dourado no topo
  k.steps(-100, 100, 0, 3);
  for (const x of [-96, -62, -28, 28, 62, 96]) k.column(x, 0, 98);
  c.fillStyle = k.fade(-112, -98, GLINT, LIMESTONE.base); c.fillRect(-106, -112, 212, 14);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-106, -112, 212, 14);
  c.fillStyle = GOLD.base; c.fillRect(-104, -106.4, 208, 2.2);
  c.fillStyle = rgba(GOLD.light, 0.9); c.fillRect(-104, -106.4, 208, 0.8);
  k.pediment(-106, 106, -112, 44);
  k.sun(0, -127, 6.5);
  ellipse(c, 0, -159, 3.4, 3.4, GOLD.base); ellipse(c, -1, -160, 1.2, 1.2, rgba(GOLD.light, 0.95));
  b.line([[-hw, 0], [-100, 0]], OUTLINE, 1.1); b.line([[100, 0], [hw, 0]], OUTLINE, 1.1);
}

/** Água-furtada: uma janelinha de pedra em empena, com o seu telhado de duas águas, sobre a água da frente do telhado. */
function dormer(k: HallKit, x: number, y: number): void {
  const c = k.c;
  k.gableRoof(x - 6, x + 6, y - 15, y - 40, 9, 11, SLATE);
  k.b.poly([[x - 10, y], [x - 10, y - 15], [x, y - 24], [x + 10, y - 15], [x + 10, y]]);
  c.fillStyle = k.sweep(x - 10, x + 10, LIMESTONE.light, LIMESTONE.base); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  k.window(x, y - 2, 8, 12, GLASS_WARM);
}

/** Canteiro de pedra com arbustos aparados, ao pé da parede. */
function hedge(k: HallKit, a: number, z: number): void {
  const c = k.c, x0 = Math.min(a, z), x1 = Math.max(a, z);
  c.fillStyle = k.fade(-6, 0, LIMESTONE.light, LIMESTONE.dark); c.fillRect(x0, -6, x1 - x0, 6);
  c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x0, -6, x1 - x0, 6);
  for (let x = x0 + 6, i = 0; x < x1 - 3; x += 9, i++) {
    ellipse(c, x, -9 - (i % 2), 6.2, 4.6, MOSS.dark); ellipse(c, x - 1, -10.5 - (i % 2), 4.4, 3, MOSS.base);
    ellipse(c, x - 2, -11.6 - (i % 2), 1.8, 1.1, rgba(MOSS.light, 0.85));
  }
}
