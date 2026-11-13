import type { CaveTheme } from "../../world/caves.ts";

/** Os três materiais de formação das cavernas: cristal, raiz e pedra (estalagmite). */
export type FormationKind = "crystal" | "root" | "stone";
/** Cada material tem três silhuetas: de 0 a 2. */
export type FormationShape = 0 | 1 | 2;

/** Qual material cada tema usa: geada e basalto têm cristal, mata e brejo têm raiz, deserto e costa têm pedra. */
export function formationKindFor(theme: CaveTheme): FormationKind {
  return theme === "glacial" || theme === "basalt" ? "crystal"
    : theme === "marsh" || theme === "verdant" ? "root" : "stone";
}

/**
 * Contorno de uma formação (ADR 0053), com a base em (0, 0) e o alto para cima (y negativo). A forma 0 é a de sempre de cada
 * material; a 1 é a alta e fina (espigão de cristal, raiz bifurcada, estalagmite em cone); a 2 é a larga e baixa (cristal de duas
 * pontas, raiz em arco, pedra de duas corcovas).
 */
export function formationOutline(kind: FormationKind, shape: FormationShape, c: CanvasRenderingContext2D): void {
  c.beginPath();
  if (kind === "crystal") {
    if (shape === 0) {
      c.moveTo(-7, 0); c.quadraticCurveTo(-7, -5, -4, -12); c.lineTo(1, -20); c.quadraticCurveTo(3, -19, 7, -10); c.lineTo(7, -2); c.quadraticCurveTo(6, 1, -7, 0);
    } else if (shape === 1) {
      c.moveTo(-4, 0); c.quadraticCurveTo(-4, -8, -2, -16); c.lineTo(0.5, -27); c.quadraticCurveTo(2, -18, 4, -9); c.lineTo(4.5, -2); c.quadraticCurveTo(3, 1, -4, 0);
    } else {
      c.moveTo(-8, 0); c.lineTo(-7, -9); c.lineTo(-3, -15); c.lineTo(0, -10); c.lineTo(3, -18); c.lineTo(8, -8); c.lineTo(8, -2); c.quadraticCurveTo(6, 1, -8, 0);
    }
  } else if (kind === "root") {
    if (shape === 0) {
      c.moveTo(-8, 0); c.quadraticCurveTo(-9, -6, -5, -12); c.quadraticCurveTo(-1, -19, 1, -17); c.quadraticCurveTo(2, -9, 7, -11); c.quadraticCurveTo(8, -6, 6, 0);
    } else if (shape === 1) {
      c.moveTo(-8, 0); c.quadraticCurveTo(-9, -9, -6, -17); c.quadraticCurveTo(-5, -22, -3, -23); c.quadraticCurveTo(-1, -19, 0, -12);
      c.quadraticCurveTo(3, -15, 4, -21); c.quadraticCurveTo(9, -12, 7, 0);
    } else {
      c.moveTo(-11, 0); c.quadraticCurveTo(-12, -6, -6, -9); c.quadraticCurveTo(0, -13, 5, -8); c.quadraticCurveTo(11, -6, 10, 0);
    }
  } else {
    if (shape === 0) {
      c.moveTo(-10, 0); c.quadraticCurveTo(-12, -4, -7, -9); c.quadraticCurveTo(-2, -14, 3, -11); c.quadraticCurveTo(9, -10, 11, -3); c.quadraticCurveTo(10, 1, -10, 0);
    } else if (shape === 1) {
      c.moveTo(-8, 0); c.quadraticCurveTo(-8, -8, -3, -18); c.quadraticCurveTo(0, -27, 3, -18); c.quadraticCurveTo(8, -8, 9, 0);
    } else {
      c.moveTo(-12, 0); c.quadraticCurveTo(-13, -6, -8, -11); c.quadraticCurveTo(-5, -14, -2, -8); c.quadraticCurveTo(1, -15, 6, -13); c.quadraticCurveTo(12, -9, 12, 0);
    }
  }
  c.closePath();
}
