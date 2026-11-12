import { rgba } from "../../draw.ts";
import { noise } from "./palette.ts";

/** Cores do desgaste de uma torre: fuligem de chuva, dois tons de líquen ou azinhavre e o sal que aflora da pedra. */
export interface WearTone { readonly stain: string; readonly lichenA: string; readonly lichenB: string; readonly salt: string }
export const SAND_WEAR: WearTone = { stain: "#3b2a1c", lichenA: "#c8a14a", lichenB: "#8a8f4e", salt: "#f1e6c8" };
export const PATINA_WEAR: WearTone = { stain: "#4a3a2c", lichenA: "#4f9a8a", lichenB: "#8fc4b0", salt: "#fff6dc" };
export const BASALT_WEAR: WearTone = { stain: "#0e0814", lichenA: "#7a5fa0", lichenB: "#3f6f7a", salt: "#b9a8d8" };

/**
 * Desgaste da alvenaria das torres (ADR 0041): riscos de chuva, blocos que caíram, líquen e a umidade que sobe do chão.
 * Os métodos pintam numa região retangular; o chamador recorta na silhueta antes (a pedra nunca passa do contorno).
 * Tudo sai de `noise`: a mesma torre dá sempre o mesmo desgaste.
 */
export class TowerWear {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  /** Riscos escuros que descem do topo e somem no caminho, um a cada ~13 px de largura. */
  streaks(x0: number, x1: number, yTop: number, yBase: number, v: number, tone: WearTone): void {
    const c = this.c, n = Math.max(2, Math.round((x1 - x0) / 13));
    for (let i = 0; i < n; i++) {
      const x = x0 + ((i + 0.25 + noise(i, v, 61) * 0.5) / n) * (x1 - x0), len = (yBase - yTop) * (0.35 + noise(i, v, 63) * 0.5);
      const g = c.createLinearGradient(0, yTop, 0, yTop + len);
      g.addColorStop(0, rgba(tone.stain, 0.5)); g.addColorStop(1, rgba(tone.stain, 0));
      c.fillStyle = g; c.fillRect(x, yTop, 1.6 + noise(i, v, 65) * 1.6, len);
    }
  }
  /** Blocos que se soltaram: cova escura com a quina de baixo iluminada. */
  pits(x0: number, x1: number, yTop: number, yBase: number, v: number, tone: WearTone, count = 3): void {
    const c = this.c;
    for (let i = 0; i < count; i++) {
      const w = 8 + noise(i, v, 67) * 6, h = 5 + noise(i, v, 69) * 2;
      const x = x0 + 3 + noise(i, v, 71) * Math.max(1, x1 - x0 - w - 6), y = yTop + 10 + noise(i, v, 73) * Math.max(1, yBase - yTop - 34);
      c.fillStyle = rgba(tone.stain, 0.8); c.fillRect(x, y, w, h);
      c.fillStyle = rgba(tone.salt, 0.5); c.fillRect(x, y + h, w, 1);
    }
  }
  /** Manchas de líquen (ou azinhavre, ou musgo de basalto): um disco largo e outro menor por cima. */
  lichen(x0: number, x1: number, yTop: number, yBase: number, v: number, tone: WearTone, count = 3): void {
    const c = this.c;
    for (let i = 0; i < count; i++) {
      const x = x0 + 5 + noise(i, v, 75) * Math.max(1, x1 - x0 - 10), y = yTop + 14 + noise(i, v, 77) * Math.max(1, yBase - yTop - 40), r = 3 + noise(i, v, 79) * 3;
      c.beginPath(); c.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2); c.fillStyle = rgba(tone.lichenA, 0.7); c.fill();
      c.beginPath(); c.ellipse(x - r * 0.25, y - r * 0.1, r * 0.55, r * 0.34, 0, 0, Math.PI * 2); c.fillStyle = rgba(tone.lichenB, 0.75); c.fill();
    }
  }
  /** Umidade que sobe do chão: faixa escura que clareia para cima, com crosta de sal na linha de cima. */
  damp(x0: number, x1: number, yBase: number, v: number, tone: WearTone): void {
    const c = this.c, g = c.createLinearGradient(0, yBase - 14, 0, yBase);
    g.addColorStop(0, rgba(tone.stain, 0)); g.addColorStop(1, rgba(tone.stain, 0.42));
    c.fillStyle = g; c.fillRect(x0, yBase - 14, x1 - x0, 14);
    for (let x = x0 + 2; x < x1 - 2; x += 5 + noise(Math.floor(x), v, 81) * 5) {
      c.fillStyle = rgba(tone.salt, 0.3); c.fillRect(x, yBase - 11 - noise(Math.floor(x), v, 83) * 3, 1.6 + noise(Math.floor(x), v, 85) * 1.6, 0.9);
    }
  }
}
