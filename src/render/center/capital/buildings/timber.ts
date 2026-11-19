import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, GRANITE, IRON, OUTLINE, WOOD, noise, type Ramp } from "../../kit/index.ts";
import { HallKit } from "./kit.ts";
import { AWNING, HOLLOW, PLASTER, TIMBER } from "./palette.ts";

/**
 * O kit de madeira, toldos e arcadas dos edifícios da Alameda (ADR 0060): parede de madeira aparente com reboco entre as vigas,
 * venezianas, floreira, toldo listrado, arcada, placa pendurada, barril, caixote, saco, fardo de feno, chama e fumaça. Cada
 * peça é um método (as peças de arte são os edifícios). Mesma origem e mesma luz de noroeste do `HallKit`.
 */
export class TimberKit {
  readonly h: HallKit;
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; this.h = new HallKit(c); }

  /**
   * Parede de madeira aparente: reboco em degradê entre vigas escuras (montantes a cada 32 px, travessas, mãos-francesas em X
   * nos vãos pares), soco de pedra embaixo, sombra do lado direito e contorno.
   */
  halfTimber(x0: number, x1: number, yTop: number, yBase: number, v: number, plaster: Ramp = PLASTER, plinth = 20): void {
    const c = this.c, b = this.h.b, w = x1 - x0;
    c.fillStyle = this.h.fade(yTop, yBase, plaster.light, plaster.base); c.fillRect(x0, yTop, w, yBase - yTop);
    c.save(); c.beginPath(); c.rect(x0, yTop, w, yBase - yTop); c.clip();
    for (let i = 0, n = Math.round(w / 12); i < n; i++) { // manchas de reboco, para a parede não parecer lisa
      const x = x0 + noise(i, v, 451) * w, y = yTop + noise(i, v, 453) * (yBase - yTop), r = 5 + noise(i, v, 455) * 9;
      ellipse(c, x, y, r, r * 0.6, rgba(noise(i, v, 457) > 0.5 ? plaster.dark : GLINT, 0.1));
    }
    const bays = Math.max(1, Math.round(w / 32)), bw = w / bays;
    for (let i = 0; i < bays; i++) {
      const bx = x0 + i * bw;
      if (i % 2 === 0) { // mão-francesa em X no vão
        b.line([[bx + 3, yTop + 5], [bx + bw - 3, yBase - plinth - 3]], rgba(TIMBER.base, 0.95), 3);
        b.line([[bx + bw - 3, yTop + 5], [bx + 3, yBase - plinth - 3]], rgba(TIMBER.base, 0.95), 3);
      }
    }
    for (let i = 0; i <= bays; i++) { const bx = x0 + i * bw; c.fillStyle = this.h.sweep(bx - 3, bx + 3, TIMBER.light, TIMBER.dark); c.fillRect(bx - 3, yTop, 6, yBase - yTop); }
    for (const y of [yTop, yTop + (yBase - plinth - yTop) / 2, yBase - plinth]) { c.fillStyle = this.h.fade(y - 3, y + 3, TIMBER.light, TIMBER.dark); c.fillRect(x0, y - 3, w, 6); }
    c.fillStyle = this.h.fade(yBase - plinth, yBase, GRANITE.light, GRANITE.dark); c.fillRect(x0, yBase - plinth, w, plinth);
    c.beginPath(); for (let x = x0 + 14; x < x1; x += 14) { c.moveTo(x, yBase - plinth); c.lineTo(x, yBase); }
    c.strokeStyle = rgba("#000000", 0.32); c.lineWidth = 0.8; c.stroke();
    const shade = Math.min(40, w * 0.2);
    c.fillStyle = this.h.sweep(x1 - shade, x1, "rgba(27,31,42,0)", "rgba(27,31,42,0.3)"); c.fillRect(x1 - shade, yTop, shade, yBase - yTop);
    c.restore();
    c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.strokeRect(x0, yTop, w, yBase - yTop);
  }

  /** Par de venezianas ao lado de uma janela centrada em x, com a base em yBase: tábuas com a frincha e a cor da guilda. */
  shutters(x: number, yBase: number, windowW: number, h: number, ramp: Ramp): void {
    const c = this.c;
    for (const s of [-1, 1] as const) {
      const sx = s === -1 ? x - windowW / 2 - 8 : x + windowW / 2 + 1;
      c.fillStyle = this.h.sweep(sx, sx + 7, ramp.light, ramp.dark); c.fillRect(sx, yBase - h, 7, h);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(sx, yBase - h, 7, h);
      c.beginPath(); for (let y = yBase - h + 4; y < yBase - 2; y += 4) { c.moveTo(sx + 1, y); c.lineTo(sx + 6, y); }
      c.strokeStyle = rgba(ramp.dark, 0.7); c.lineWidth = 0.7; c.stroke();
    }
  }

  /** Floreira de madeira sob uma janela: a caixa e três tufos de flores de duas cores. */
  flowerBox(x: number, y: number, w: number, a: string, b2: string): void {
    const c = this.c;
    c.fillStyle = this.h.fade(y, y + 7, WOOD.light, WOOD.dark); c.fillRect(x - w / 2, y, w, 7);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(x - w / 2, y, w, 7);
    for (let i = 0, n = Math.max(3, Math.round(w / 7)); i < n; i++) {
      const fx = x - w / 2 + 4 + (i / Math.max(1, n - 1)) * (w - 8);
      ellipse(c, fx, y - 1, 3.4, 2.6, "#3c6b34"); ellipse(c, fx - 1, y - 3, 1.7, 1.7, i % 2 ? a : b2); ellipse(c, fx + 1.4, y - 2, 1.4, 1.4, i % 2 ? b2 : a);
    }
  }

  /** Toldo listrado inclinado, de x0 a x1, preso em y e caindo `drop` px na frente: listras de 8 px, barra e sombra no que está embaixo. */
  awning(x0: number, x1: number, y: number, drop: number, red: string = AWNING.red, cream: string = AWNING.cream): void {
    const c = this.c, w = x1 - x0, n = Math.max(2, Math.round(w / 8)), sw = w / n;
    c.fillStyle = this.h.fade(y + drop, y + drop + 12, "rgba(27,31,42,0.4)", "rgba(27,31,42,0)"); c.fillRect(x0, y + drop, w, 12);
    for (let i = 0; i < n; i++) {
      const a = x0 + i * sw;
      this.h.b.poly([[a, y], [a + sw, y], [a + sw + 1.6, y + drop], [a - 1.6, y + drop]]);
      c.fillStyle = i % 2 ? cream : red; c.fill();
    }
    c.fillStyle = this.h.fade(y, y + drop, "rgba(255,246,220,0.22)", "rgba(27,31,42,0.2)"); c.fillRect(x0, y, w, drop);
    for (let i = 0; i < n; i++) { const a = x0 + i * sw; c.beginPath(); c.arc(a + sw / 2, y + drop, sw / 2, 0, Math.PI); c.fillStyle = i % 2 ? cream : red; c.fill(); c.strokeStyle = rgba(OUTLINE, 0.75); c.lineWidth = 0.7; c.stroke(); }
    c.strokeStyle = OUTLINE; c.lineWidth = 1; c.strokeRect(x0, y - 1.4, w, 3); this.h.b.line([[x0, y], [x1, y]], rgba(GLINT, 0.5), 0.9);
  }

  /** Arcada de `n` arcos de pedra entre yTop e yBase: pilares, arcos em meia-lua, o escuro dentro e um balcão em cada vão. */
  arcade(x0: number, x1: number, yTop: number, yBase: number, n: number, ramp: Ramp): void {
    const c = this.c, w = (x1 - x0) / n, pier = 8, span = w - pier, spring = yTop + span / 2;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w + pier / 2, m = a + span / 2;
      c.beginPath(); c.moveTo(a, yBase); c.lineTo(a, spring); c.arc(m, spring, span / 2, Math.PI, 0); c.lineTo(a + span, yBase); c.closePath();
      c.fillStyle = HOLLOW; c.fill();
      c.strokeStyle = rgba(ramp.light, 0.95); c.lineWidth = 3.4; c.stroke(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = this.h.fade(yBase - 12, yBase, WOOD.light, WOOD.dark); c.fillRect(a, yBase - 12, span, 12);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.strokeRect(a, yBase - 12, span, 12);
      c.fillStyle = this.h.fade(yBase - 14, yBase - 12, rgba(GLINT, 0.7), rgba(GLINT, 0)); c.fillRect(a, yBase - 14, span, 2);
    }
  }

  /** Placa pendurada num braço de ferro preso à parede em (x, y): o braço, as correntes e a tábua (w × h) com a cor de fundo. */
  hangingSign(x: number, y: number, w: number, h: number, ground: Ramp): void {
    const c = this.c, b = this.h.b;
    b.line([[x - w / 2 - 14, y], [x + w / 2 + 4, y]], IRON, 2.4); b.line([[x - w / 2 - 14, y + 1], [x - w / 2 - 14, y + 8]], IRON, 2);
    for (const dx of [-w / 2 + 3, w / 2 - 3]) b.line([[x + dx, y], [x + dx, y + 7]], IRON, 1);
    c.fillStyle = this.h.sweep(x - w / 2, x + w / 2, ground.light, ground.dark); c.fillRect(x - w / 2, y + 7, w, h);
    c.strokeStyle = GOLD.base; c.lineWidth = 1.4; c.strokeRect(x - w / 2, y + 7, w, h);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.strokeRect(x - w / 2 - 1, y + 6, w + 2, h + 2);
  }

  /** Barril de aduelas com dois aros de ferro, a base em (x, y). */
  barrel(x: number, y: number): void {
    const c = this.c;
    c.beginPath(); c.moveTo(x - 7, y - 17); c.quadraticCurveTo(x - 9.6, y - 9, x - 7, y); c.lineTo(x + 7, y); c.quadraticCurveTo(x + 9.6, y - 9, x + 7, y - 17); c.closePath();
    c.fillStyle = this.h.sweep(x - 9, x + 9, WOOD.light, WOOD.dark); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    for (const dy of [-12, -4.5]) this.h.b.line([[x - 8.4, y + dy], [x + 8.4, y + dy]], IRON, 1.5);
    c.beginPath(); c.ellipse(x, y - 17, 7, 2.3, 0, 0, Math.PI * 2); c.fillStyle = WOOD.base; c.fill(); c.stroke();
  }

  /** Caixote de madeira com as ripas em cruz, de lado `s`, a base em (x, y). */
  crate(x: number, y: number, s: number): void {
    const c = this.c;
    c.fillStyle = this.h.sweep(x - s / 2, x + s / 2, WOOD.light, WOOD.dark); c.fillRect(x - s / 2, y - s, s, s);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - s / 2, y - s, s, s);
    this.h.b.line([[x - s / 2, y - s], [x + s / 2, y]], rgba(WOOD.dark, 0.9), 1.2); this.h.b.line([[x + s / 2, y - s], [x - s / 2, y]], rgba(WOOD.dark, 0.9), 1.2);
  }

  /** Saco de pano amarrado no alto, a base em (x, y). */
  sack(x: number, y: number, tone = "#cdb98a"): void {
    const c = this.c;
    c.beginPath(); c.moveTo(x - 7, y); c.quadraticCurveTo(x - 10, y - 9, x - 4, y - 15); c.lineTo(x + 4, y - 15); c.quadraticCurveTo(x + 10, y - 9, x + 7, y); c.closePath();
    c.fillStyle = this.h.sweep(x - 9, x + 9, tone, "#8a7a52"); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    this.h.b.line([[x - 4.4, y - 14], [x + 4.4, y - 14]], "#5a4a2a", 1.3); ellipse(c, x - 2.4, y - 8, 1.8, 3, rgba(GLINT, 0.28));
  }

  /** Fardo de feno amarrado com duas cordas, a base em (x, y). */
  hay(x: number, y: number): void {
    const c = this.c;
    c.fillStyle = this.h.sweep(x - 13, x + 13, "#e6cf7a", "#a8893a"); c.fillRect(x - 13, y - 14, 26, 14);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - 13, y - 14, 26, 14);
    for (let i = 0; i < 9; i++) this.h.b.line([[x - 12 + i * 3, y - 13], [x - 11 + i * 3, y - 2]], rgba("#7a6226", 0.55), 0.7);
    for (const dx of [-6, 6]) this.h.b.line([[x + dx, y - 14], [x + dx, y]], "#5a4426", 1.2);
  }

  /** Chama de braseiro ou de tocha, com o centro em (x, y) e `s` de altura: três línguas e o clarão em "screen". */
  flame(x: number, y: number, s: number): void {
    const c = this.c;
    this.h.spill(x, y - s * 0.5, s * 2.4, "#ffb347");
    for (const [k, color] of [[1, "#e8541c"], [0.74, "#ffa11f"], [0.46, "#ffe27a"]] as const) {
      c.beginPath(); c.moveTo(x - 4 * k, y); c.quadraticCurveTo(x - 6 * k, y - s * 0.5 * k, x - 1 * k, y - s * k); c.quadraticCurveTo(x + 5 * k, y - s * 0.5 * k, x + 4 * k, y); c.closePath();
      c.fillStyle = color; c.fill();
    }
  }

  /** Fumaça de chaminé subindo de (x, y): quatro sopros que crescem e clareiam, levemente para a direita. */
  smoke(x: number, y: number): void {
    for (let i = 0; i < 4; i++) ellipse(this.c, x + i * 3.4, y - i * 11, 5 + i * 2.2, 4 + i * 1.6, rgba("#d9dde4", 0.5 - i * 0.1));
  }
}
