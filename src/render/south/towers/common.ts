import { ellipse, mix, rgba, shade, softShadow } from "../../draw.ts";
import { TowerBlocks } from "./blocks.ts";
import { GLINT, IRON, OUTLINE, WOOD, noise, type Point, type Ramp } from "./palette.ts";
import { TowerSand } from "./sand.ts";
import { SAND_WEAR, TowerWear, type WearTone } from "./wear.ts";

/**
 * Ajudantes das torres do Sul (ADR 0019): pedra, janela, porta e entulho. Nenhuma torre mora aqui;
 * cada uma tem o seu arquivo em `render/south/towers/`. Origem (0,0) = contato do centro da frente.
 * As ferramentas são métodos de `TowerBrush` porque NÃO são peças: o portão de arte exige registrar
 * toda função exportada que recebe um Canvas, e as peças aqui são as torres.
 */
export * from "./palette.ts";

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
  /** Areia acumulada junto à base, com volume e crista (ver `TowerSand`). */
  drift(x: number, y: number, rx: number, ry: number, i = 0): void { new TowerSand(this.c).drift(x, y, rx, ry, i); }
  /** Rampa de areia encostada na parede, de x0 a x1 (ver `TowerSand`). */
  sandSlope(x0: number, x1: number, v: number, gap = 0): void { new TowerSand(this.c).slope(x0, x1, v, gap); }
  /** Sombra de contato da torre, projetada para a direita e para baixo (a luz vem da esquerda e de cima). */
  shadow(width: number, height: number): void {
    softShadow(this.c, width * 0.28, 4, width * 0.78 + height * 0.16, 9, 0.38);
  }

  /** Face frontal de alvenaria: gradiente de volume, fiadas deslocadas, tijolos de tom próprio e rachaduras. */
  brickFace(path: () => void, x0: number, x1: number, yTop: number, yBase: number, ramp: Ramp, v: number, course = 9, wear: WearTone = SAND_WEAR, ground = true): void {
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
    // desgaste: riscos de chuva, blocos soltos, líquen e a umidade que sobe do chão
    const wearer = new TowerWear(c);
    wearer.streaks(x0, x1, yTop, yBase, v, wear);
    wearer.pits(x0, x1, yTop, yBase, v, wear, Math.max(1, Math.round((x1 - x0) / 22)));
    wearer.lichen(x0, x1, yTop, yBase, v, wear, Math.max(1, Math.round((x1 - x0) / 20)));
    if (ground) wearer.damp(x0, x1, yBase, v, wear);
    this.occlusion((x0 + x1) / 2, yBase, x1 - x0);
    c.restore();
  }

  /** Coroa de um topo quebrado: a espessura da parede à mostra, em tom claro, 4 px à direita e 3 px acima dos dentes. */
  crown(top: readonly Point[], ramp: Ramp): void {
    const c = this.c;
    c.beginPath(); c.moveTo(top[0]![0], top[0]![1]);
    for (const [x, y] of top) c.lineTo(x, y);
    for (let i = top.length - 1; i >= 0; i--) c.lineTo(top[i]![0] + 4, top[i]![1] - 3.2);
    c.closePath(); c.fillStyle = ramp.light; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
  }

  /** Lado direito da torre, mais escuro e estreito, com degradê, fiadas em perspectiva e riscos de chuva. */
  sideFace(xRight: number, yBase: number, yTop: number, depth: number, ramp: Ramp, wear: WearTone = SAND_WEAR): void {
    const c = this.c, path = (): void => this.poly([[xRight, yBase], [xRight, yTop], [xRight + depth, yTop - depth * 0.5], [xRight + depth, yBase - depth * 0.5]]);
    const g = c.createLinearGradient(xRight, 0, xRight + depth, 0);
    g.addColorStop(0, shade(ramp.dark, -0.04)); g.addColorStop(1, shade(ramp.dark, -0.24));
    path(); c.fillStyle = g; c.fill();
    c.save(); path(); c.clip();
    for (let y = yBase - 9; y > yTop - depth; y -= 9) this.line([[xRight, y], [xRight + depth, y - depth * 0.5]], rgba("#000000", 0.28), 0.8);
    new TowerWear(c).streaks(xRight, xRight + depth, yTop - depth * 0.5, yBase, 7, wear);
    this.occlusion(xRight + depth / 2, yBase - depth * 0.25, depth);
    c.restore();
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
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

  /** Entulho em volta da base: blocos lapidados e seixos, de tamanho e lugar fixos por sorteio (ver `TowerBlocks`). */
  rubble(v: number, count: number, spread: number, ramp: Ramp): void { new TowerBlocks(this.c).scatter(v, count, spread, ramp); }
}
