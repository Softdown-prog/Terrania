import { hash2 } from "../../../world/random.ts";
import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";

/**
 * Ajudantes das torres do Sul (ADR 0019): pedra, janela, porta e entulho. Nenhuma torre mora aqui;
 * cada uma tem o seu arquivo em `render/south/towers/`. Origem (0,0) = contato do centro da frente.
 * As ferramentas são métodos de `TowerBrush` porque NÃO são peças: o portão de arte exige registrar
 * toda função exportada que recebe um Canvas, e as peças aqui são as torres.
 */
export type Ramp = { readonly light: string; readonly base: string; readonly dark: string };
export type Point = readonly [number, number];
export const OUTLINE = "#142a2a";
export const GLINT = "#fff6dc";
export const SANDSTONE: Ramp = { light: "#e8d0a0", base: "#bf9f6c", dark: "#7b5f40" };
export const PALE_STONE: Ramp = { light: "#f3e7cb", base: "#d4c196", dark: "#8f7d5e" };
export const BASALT: Ramp = { light: "#8a739b", base: "#54446a", dark: "#2a2038" };
export const GOLD: Ramp = { light: "#ffe29a", base: "#e0a24a", dark: "#8a5a1e" };
export const WOOD: Ramp = { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" };
export const IRON = "#3b3f46";
export const noise = (i: number, v: number, salt: number): number => hash2(i + 41, v * 37 + 5, salt);

export class TowerBrush {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }

  gradient(x0: number, x1: number, ramp: Ramp): CanvasGradient {
    const g = this.c.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, ramp.light); g.addColorStop(0.42, ramp.base); g.addColorStop(1, ramp.dark);
    return g;
  }
  poly(pts: readonly Point[]): void {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.closePath();
  }
  line(pts: readonly Point[], color: string, width = 1): void {
    const c = this.c;
    c.beginPath(); c.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]![0], pts[i]![1]);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  /** Escurece onde a peça encontra o chão (oclusão ambiente). */
  occlusion(x: number, y: number, w: number, h = 9): void {
    const c = this.c;
    const g = c.createLinearGradient(0, y - h, 0, y + 1);
    g.addColorStop(0, rgba("#2c1f14", 0)); g.addColorStop(1, rgba("#2c1f14", 0.45));
    c.fillStyle = g; c.fillRect(x - w / 2, y - h, w, h + 1);
  }
  /** Areia acumulada junto à base. */
  drift(x: number, y: number, rx: number, ry: number): void {
    const c = this.c;
    ellipse(c, x + 1, y + 1, rx, ry, rgba("#a07f4d", 0.35));
    ellipse(c, x, y, rx, ry, rgba("#d3b377", 0.95));
    ellipse(c, x - rx * 0.18, y - ry * 0.25, rx * 0.7, ry * 0.55, rgba("#ecd29a", 0.9));
  }
  /** Sombra de contato da torre, projetada para a direita e para baixo (a luz vem da esquerda e de cima). */
  shadow(width: number, height: number): void {
    softShadow(this.c, width * 0.28, 4, width * 0.78 + height * 0.16, 9, 0.38);
  }

  /** Face frontal de alvenaria: gradiente de volume, fiadas deslocadas, tijolos de tom próprio e rachaduras. */
  brickFace(path: () => void, x0: number, x1: number, yTop: number, yBase: number, ramp: Ramp, v: number, course = 9): void {
    const c = this.c;
    path(); c.fillStyle = this.gradient(x0, x1, ramp); c.fill();
    c.save(); path(); c.clip();
    for (let j = 0, y = yBase - course; y > yTop; j++, y -= course) {
      this.line([[x0, y], [x1, y]], rgba(ramp.dark, 0.5), 0.9);
      for (let x = x0 + (j % 2 ? 5 : 12); x < x1; x += course * 1.9) {
        this.line([[x, y], [x - 0.5, y + course]], rgba(ramp.dark, 0.45), 0.8);
        if (noise(Math.floor(x) + j * 11, v, 3) > 0.7) { c.fillStyle = rgba(ramp.light, 0.2); c.fillRect(x + 1, y + 1, course * 1.5, course - 2); }
      }
    }
    for (let i = 0; i < 5; i++) {
      const cx = x0 + noise(i, v, 5) * (x1 - x0), cy = yBase - 12 - noise(i, v, 7) * (yBase - yTop - 24);
      this.line([[cx, cy], [cx + 2.5, cy - 5], [cx - 1, cy - 10]], rgba("#2c1f14", 0.55), 0.9);
    }
    this.occlusion((x0 + x1) / 2, yBase, x1 - x0);
    c.restore();
  }

  /** Lado direito da torre, mais escuro e estreito, para dar volume. */
  sideFace(xRight: number, yBase: number, yTop: number, depth: number, ramp: Ramp): void {
    const c = this.c;
    this.poly([[xRight, yBase], [xRight, yTop], [xRight + depth, yTop - depth * 0.5], [xRight + depth, yBase - depth * 0.5]]);
    c.fillStyle = shade(ramp.dark, -0.12); c.fill();
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  }

  /** Janela em arco; com `glow` vira vidro aceso. */
  window(x: number, y: number, w: number, h: number, frame: Ramp, glow?: string): void {
    const c = this.c;
    const path = (): void => {
      c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h + w / 2);
      c.arc(x, y - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y); c.closePath();
    };
    c.save();
    ellipse(c, x + 1.5, y + 1, w * 0.62, 2, rgba("#1e1410", 0.3));
    path(); c.fillStyle = glow ? mix(glow, "#0b1519", 0.35) : "#0b1519"; c.fill();
    if (glow) {
      const g = c.createLinearGradient(x - w / 2, y - h, x + w / 2, y);
      g.addColorStop(0, rgba(glow, 0.95)); g.addColorStop(1, rgba(shade(glow, -0.3), 0.8));
      c.save(); path(); c.clip(); c.fillStyle = g; c.fillRect(x - w / 2, y - h, w, h);
      this.line([[x, y - h + 1], [x, y]], rgba("#1e1440", 0.6), 0.9);
      this.line([[x - w / 2, y - h * 0.45], [x + w / 2, y - h * 0.45]], rgba("#1e1440", 0.6), 0.9);
      c.restore();
    }
    path(); c.strokeStyle = frame.light; c.lineWidth = 2.2; c.stroke();
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    c.restore();
  }

  /** Porta de madeira com tiras de ferro, moldura de pedra em arco e degraus. */
  door(x: number, yBase: number, w: number, h: number, frame: Ramp): void {
    const c = this.c;
    const path = (): void => {
      c.beginPath(); c.moveTo(x - w / 2, yBase); c.lineTo(x - w / 2, yBase - h + w / 2);
      c.arc(x, yBase - h + w / 2, w / 2, Math.PI, 0); c.lineTo(x + w / 2, yBase); c.closePath();
    };
    c.fillStyle = this.gradient(x - w / 2 - 3, x + w / 2 + 3, frame);
    c.fillRect(x - w / 2 - 4, yBase - 3, w + 8, 4);                         // soleira
    c.fillRect(x - w / 2 - 7, yBase - 0.5, w + 14, 3.5);                    // degrau
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - w / 2 - 7, yBase - 0.5, w + 14, 3.5);
    path(); c.strokeStyle = frame.light; c.lineWidth = 5; c.stroke();
    path(); c.fillStyle = this.gradient(x - w / 2, x + w / 2, WOOD); c.fill();
    c.save(); path(); c.clip();
    for (let k = 1; k < 4; k++) this.line([[x - w / 2 + (w * k) / 4, yBase - h], [x - w / 2 + (w * k) / 4, yBase]], rgba(WOOD.dark, 0.7), 0.9);
    for (const t of [0.3, 0.68]) { c.fillStyle = IRON; c.fillRect(x - w / 2, yBase - h * t, w, 2.2); c.fillStyle = rgba(GLINT, 0.35); c.fillRect(x - w / 2, yBase - h * t, w, 0.7); }
    c.restore();
    ellipse(c, x + w * 0.22, yBase - h * 0.42, 1.5, 1.5, "#d9a24a");
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  }

  /** Pedras caídas em volta da base, de tamanho e lugar fixos por sorteio. */
  rubble(v: number, count: number, spread: number, ramp: Ramp): void {
    const c = this.c;
    for (let i = 0; i < count; i++) {
      const side = noise(i, v, 11) < 0.5 ? -1 : 1, x = side * (spread * 0.4 + noise(i, v, 13) * spread * 0.6);
      const y = 4 + noise(i, v, 17) * 20, r = 1.6 + noise(i, v, 19) * 3.6;
      ellipse(c, x + 1, y + 1, r * 1.3, r * 0.6, rgba("#2c1f14", 0.3));
      ellipse(c, x, y, r, r * 0.62, i % 3 ? ramp.base : ramp.light);
    }
  }
}
