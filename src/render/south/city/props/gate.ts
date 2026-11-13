import { ellipse, rgba } from "../../../draw.ts";
import { BuildingKit } from "../buildings/kit.ts";
import { BONE, BRONZE, CLAY, CLAY_WEAR, GLINT, OUTLINE, WINE } from "../buildings/palette.ts";

/** Meia largura da abertura do portão (2,5 tiles) e a altura do vigamento, em px. */
export const GATE_HALF = 81, GATE_BEAM_TOP = -78, GATE_BEAM_BOTTOM = -62;

/**
 * Portão da cidade (ADR 0049): viga de alvenaria sobre a abertura, grade de ferro erguida, estandarte de guerra com a
 * caveira e, na variante 0, o Portão das Presas (presas de osso pendendo da viga) ou, na 1, o Portão dos Ossos (ossos
 * pendurados em cordas). Só desenho: a abertura é livre e a colisão está nos tiles da muralha.
 */
export function paintCityGate(c: CanvasRenderingContext2D, variant: number): void {
  const v = Number.isFinite(variant) && Math.round(variant) === 1 ? 1 : 0, k = new BuildingKit(c), b = k.b;
  // sombra da viga no chão, para a direita e para baixo
  const cast = c.createLinearGradient(0, -20, 0, 18); cast.addColorStop(0, "rgba(34,26,43,0.3)"); cast.addColorStop(1, "rgba(34,26,43,0)");
  c.fillStyle = cast; c.fillRect(-GATE_HALF + 6, -20, GATE_HALF * 2, 38);
  // grade de ferro erguida: barras e ponteiras, vistas por baixo da viga
  c.fillStyle = "#171210"; c.fillRect(-GATE_HALF + 3, GATE_BEAM_BOTTOM, GATE_HALF * 2 - 6, 12);
  for (let x = -GATE_HALF + 8; x < GATE_HALF - 4; x += 9) {
    b.line([[x, GATE_BEAM_BOTTOM], [x, GATE_BEAM_BOTTOM + 14]], "#3b3f46", 2);
    b.poly([[x - 2, GATE_BEAM_BOTTOM + 14], [x + 2, GATE_BEAM_BOTTOM + 14], [x, GATE_BEAM_BOTTOM + 21]]); c.fillStyle = "#3b3f46"; c.fill();
    b.line([[x - 0.6, GATE_BEAM_BOTTOM + 1], [x - 0.6, GATE_BEAM_BOTTOM + 12]], rgba(GLINT, 0.35), 0.7);
  }
  // viga: alvenaria com volume, riscos, covas e cornija de osso com merlões baixos
  k.facade(-GATE_HALF, GATE_HALF, GATE_BEAM_TOP, GATE_BEAM_BOTTOM, CLAY, 50 + v, "masonry", CLAY_WEAR, false);
  c.fillStyle = b.gradient(-GATE_HALF - 4, GATE_HALF + 4, BONE); c.fillRect(-GATE_HALF - 4, GATE_BEAM_TOP - 5, GATE_HALF * 2 + 8, 5);
  c.fillStyle = rgba(GLINT, 0.55); c.fillRect(-GATE_HALF - 4, GATE_BEAM_TOP - 5, GATE_HALF * 2 + 8, 0.9);
  c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(-GATE_HALF - 4, GATE_BEAM_TOP - 5, GATE_HALF * 2 + 8, 5);
  for (let x = -GATE_HALF + 4; x < GATE_HALF - 6; x += 16) {
    c.fillStyle = b.gradient(x, x + 10, BONE); c.fillRect(x, GATE_BEAM_TOP - 13, 10, 8);
    c.fillStyle = BONE.light; c.fillRect(x - 1, GATE_BEAM_TOP - 15, 12, 2.4);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x, GATE_BEAM_TOP - 13, 10, 8);
  }
  // o que faz o nome do portão: presas (0) ou ossos pendurados (1), alinhados à beira de baixo da viga
  if (v === 0) {
    for (let i = 0; i < 9; i++) {
      const x = -GATE_HALF + 12 + i * ((GATE_HALF * 2 - 24) / 8), h = 9 + (i % 3) * 3;
      b.poly([[x - 3.4, GATE_BEAM_BOTTOM], [x + 3.4, GATE_BEAM_BOTTOM], [x + 0.6, GATE_BEAM_BOTTOM + h]]);
      c.fillStyle = b.gradient(x - 3.4, x + 3.4, BONE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const x = -GATE_HALF + 14 + i * ((GATE_HALF * 2 - 28) / 6), len = 10 + (i % 3) * 4;
      b.line([[x, GATE_BEAM_BOTTOM], [x, GATE_BEAM_BOTTOM + len]], "#8a5e3b", 0.9);
      k.bone(x - 4, GATE_BEAM_BOTTOM + len + 2, x + 4, GATE_BEAM_BOTTOM + len + 4, 1.6);
    }
  }
  // estandarte de guerra com a caveira, no meio da viga, preso por duas argolas
  const bx = 0, by = GATE_BEAM_TOP + 4;
  b.poly([[bx - 13, by], [bx + 13, by], [bx + 13, by + 32], [bx, by + 26], [bx - 13, by + 32]]);
  c.fillStyle = b.gradient(bx - 13, bx + 13, WINE); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  b.line([[bx - 12, by + 3], [bx + 12, by + 3]], rgba("#d9a24a", 0.9), 1.4);
  k.skull(bx, by + 24, 1.5);
  for (const x of [-9, 9]) { ellipse(c, bx + x, by + 0.4, 1.6, 1.6, BRONZE.base); }
  // pilares nas pontas e entulho: o desgaste de uma entrada velha
  for (const side of [-1, 1]) {
    const px = side * (GATE_HALF + 8);
    k.facade(px - 8, px + 8, GATE_BEAM_TOP + 6, 0, CLAY, 52 + v + (side > 0 ? 1 : 0), "masonry", CLAY_WEAR);
    c.fillStyle = BONE.light; c.fillRect(px - 10, GATE_BEAM_TOP + 3, 20, 4);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(px - 10, GATE_BEAM_TOP + 3, 20, 4);
    c.save(); c.translate(px, 0); b.rubble(60 + v * 2 + (side > 0 ? 1 : 0), 3, 16, CLAY); c.restore(); // entulho aos pés do pilar, não no meio da abertura
  }
  b.drift(-GATE_HALF - 12, 3, 13, 2.6, 1); b.drift(GATE_HALF + 14, 4, 12, 2.4, 2);
  b.line([[-GATE_HALF + 2, GATE_BEAM_TOP + 1], [GATE_HALF - 2, GATE_BEAM_TOP + 1]], rgba(GLINT, 0.5), 1);
}
