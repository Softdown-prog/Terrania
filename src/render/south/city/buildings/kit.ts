import { ellipse, rgba, shade } from "../../../draw.ts";
import { MasonryBrush, noise, type Point, type Ramp, MasonryWear, type WearTone } from "../../kit/index.ts";
import { GLINT, OUTLINE } from "./palette.ts";

/** Como a parede é pintada: reboco de barro com camadas, tábuas, ou alvenaria (fiadas de pedra ou osso). */
export type WallTexture = "adobe" | "plank" | "masonry";

/**
 * O kit dos prédios da cidade (ADR 0043): parede com textura e desgaste, telhado de telhas, ameias, toldo e a luz
 * que escorre dos vidros. Usa o pincel das torres (porta, janela, sombra, areia, entulho) e o desgaste delas, porque
 * a pedra e o barro envelhecem do mesmo jeito; aqui só entra o que é de prédio. Não são peças (por isso são métodos):
 * as peças são os prédios, um por arquivo.
 */
export class BuildingKit {
  readonly b: MasonryBrush;
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; this.b = new MasonryBrush(c); }

  /** Parede de frente: degradê de volume, textura recortada na silhueta, desgaste, oclusão no chão e contorno. */
  facade(x0: number, x1: number, yTop: number, yBase: number, ramp: Ramp, v: number, texture: WallTexture, wear: WearTone, ground = true): void {
    const c = this.c, path = (): void => { c.beginPath(); c.rect(x0, yTop, x1 - x0, yBase - yTop); };
    if (texture === "masonry") this.b.brickFace(path, x0, x1, yTop, yBase, ramp, v, 8, wear, ground);
    else {
      path(); c.fillStyle = this.b.gradient(x0, x1, ramp); c.fill();
      c.save(); path(); c.clip();
      if (texture === "adobe") this.adobe(x0, x1, yTop, yBase, ramp, v); else this.planks(x0, x1, yTop, yBase, ramp, v);
      const wearer = new MasonryWear(c);
      wearer.streaks(x0, x1, yTop, yBase, v, wear);
      wearer.pits(x0, x1, yTop, yBase, v, wear, Math.max(1, Math.round((x1 - x0) / 40)));
      if (ground) wearer.damp(x0, x1, yBase, v, wear);
      this.b.occlusion((x0 + x1) / 2, yBase, x1 - x0);
      c.restore();
    }
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
    this.b.line([[x0 + 1, yBase - 2], [x0 + 1, yTop + 1]], rgba(GLINT, 0.55), 1);
  }

  /** Reboco de barro: camadas irregulares feitas à mão, remendos de gesso claro com o tijolo à mostra e rachaduras. */
  private adobe(x0: number, x1: number, yTop: number, yBase: number, ramp: Ramp, v: number): void {
    const c = this.c;
    for (let y = yBase - 7, i = 0; y > yTop; y -= 6 + noise(i, v, 101) * 3, i++) {
      c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + (noise(i, v, 103) - 0.5) * 3.2, x1, y - 1 + noise(i, v, 105) * 2);
      c.strokeStyle = rgba(ramp.dark, 0.32); c.lineWidth = 0.9; c.stroke();
    }
    for (let i = 0; i < Math.max(2, Math.round((x1 - x0) / 30)); i++) {
      const w = 10 + noise(i, v, 107) * 12, h = 7 + noise(i, v, 109) * 8;
      const px = x0 + 4 + noise(i, v, 111) * Math.max(1, x1 - x0 - w - 8), py = yTop + 6 + noise(i, v, 113) * Math.max(1, yBase - yTop - h - 14);
      this.b.poly([[px, py + 1], [px + w * 0.4, py], [px + w, py + 1.5], [px + w - 1, py + h], [px + w * 0.5, py + h + 1], [px, py + h - 1]]);
      c.fillStyle = rgba(ramp.light, 0.4); c.fill();
      c.fillStyle = rgba(ramp.dark, 0.5); c.fillRect(px + w * 0.25, py + h * 0.45, w * 0.5, h * 0.4); // o tijolo que apareceu
      this.b.line([[px, py + h - 1], [px + w * 0.5, py + h + 1], [px + w - 1, py + h]], rgba(ramp.dark, 0.5), 0.8);
    }
    for (let i = 0; i < 2; i++) {
      const cx = x0 + 8 + noise(i, v, 115) * (x1 - x0 - 16), cy = yTop + 6 + noise(i, v, 117) * 10;
      this.b.line([[cx, cy], [cx + 2, cy + 7], [cx - 1, cy + 14], [cx + 2, cy + 22]], rgba("#2c1f14", 0.55), 0.9);
    }
  }

  /** Tábuas verticais com vão escuro entre elas, veios, nós e pregos. */
  private planks(x0: number, x1: number, yTop: number, yBase: number, ramp: Ramp, v: number): void {
    const c = this.c, W = 7;
    for (let x = x0, i = 0; x < x1; x += W, i++) {
      c.fillStyle = rgba(i % 2 ? ramp.light : ramp.dark, i % 2 ? 0.14 : 0.18); c.fillRect(x, yTop, W - 1, yBase - yTop);
      this.b.line([[x + W - 0.5, yTop], [x + W - 0.5, yBase]], rgba("#1e1410", 0.7), 0.9);
      for (let g = 0; g < 2; g++) this.b.line([[x + 2 + g * 2.4, yTop + 2], [x + 2.6 + g * 2.4, yBase - 2]], rgba(ramp.dark, 0.3), 0.7);
      if (noise(i, v, 119) > 0.7) { const ky = yTop + 8 + noise(i, v, 121) * (yBase - yTop - 16); ellipse(c, x + 3, ky, 1.8, 2.6, rgba("#2c1f14", 0.7)); }
      for (const ny of [yTop + 3, yBase - 4]) ellipse(c, x + 3, ny, 0.8, 0.8, rgba(GLINT, 0.5));
    }
    this.b.line([[x0, yBase - (yBase - yTop) * 0.34], [x1, yBase - (yBase - yTop) * 0.34]], rgba("#1e1410", 0.75), 1.6);
  }

  /** Telhado de duas águas visto de frente: telhas em fiadas de escamas, beiral com sombra na parede e cumeeira. */
  tiledRoof(x0: number, x1: number, yEave: number, yRidge: number, overhang: number, ramp: Ramp, v: number): void {
    const c = this.c, rows = Math.max(2, Math.round((yEave - yRidge) / 5)), inset = (x1 - x0) * 0.1;
    const path = (): void => this.b.poly([[x0 - overhang, yEave], [x0 + inset, yRidge], [x1 - inset, yRidge], [x1 + overhang, yEave]]);
    path(); c.fillStyle = this.b.gradient(x0 - overhang, x1 + overhang, ramp); c.fill();
    c.save(); path(); c.clip();
    for (let r = 0; r < rows; r++) {
      const y = yRidge + ((r + 1) / rows) * (yEave - yRidge), spread = (r + 1) / rows, left = x0 + inset * (1 - spread) - overhang * spread, right = x1 - inset * (1 - spread) + overhang * spread;
      for (let x = left - (r % 2) * 4; x < right; x += 8) {
        c.beginPath(); c.arc(x + 4, y - 3, 4, 0.1 * Math.PI, 0.9 * Math.PI);
        c.strokeStyle = rgba(ramp.dark, 0.55); c.lineWidth = 0.9; c.stroke();
        if (noise(Math.floor(x) + r * 13, v, 123) > 0.8) { c.fillStyle = rgba(ramp.light, 0.25); c.fillRect(x + 1, y - 5, 6, 3); }
      }
    }
    c.restore();
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
    c.fillStyle = rgba(shade(ramp.dark, -0.3), 0.9); c.fillRect(x0 - overhang, yEave, x1 - x0 + overhang * 2, 2.4); // espessura do beiral
    const shadow = c.createLinearGradient(0, yEave + 2, 0, yEave + 9);
    shadow.addColorStop(0, "rgba(34,26,43,0.4)"); shadow.addColorStop(1, "rgba(34,26,43,0)");
    c.fillStyle = shadow; c.fillRect(x0, yEave + 2, x1 - x0, 7); // sombra do beiral na parede
    c.fillStyle = ramp.light; c.fillRect(x0 + inset - 1, yRidge - 2, x1 - x0 - inset * 2 + 2, 3); // cumeeira
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x0 + inset - 1, yRidge - 2, x1 - x0 - inset * 2 + 2, 3);
    this.b.line([[x0 - overhang + 2, yEave - 1], [x0 + inset + 2, yRidge + 2]], rgba(GLINT, 0.55), 1);
  }

  /** Ameias: blocos com volume (frente, topo e lado) e o vão entre eles, sobre a platibanda. */
  crenels(x0: number, x1: number, yTop: number, count: number, h: number, ramp: Ramp): void {
    const c = this.c, step = (x1 - x0) / count, w = step * 0.62;
    for (let i = 0; i < count; i++) {
      const x = x0 + i * step + (step - w) / 2;
      c.fillStyle = this.b.gradient(x, x + w, ramp); c.fillRect(x, yTop - h, w, h);
      c.fillStyle = ramp.light; c.fillRect(x - 1, yTop - h - 2.4, w + 2, 2.6);
      c.fillStyle = shade(ramp.dark, -0.1); c.fillRect(x + w, yTop - h - 1, 2.2, h + 1);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x, yTop - h, w, h);
    }
  }

  /** Toldo listrado, em tiras de duas cores, com a bainha em ondas e a sombra que cai embaixo. */
  awning(x0: number, x1: number, y: number, drop: number, a: Ramp, bColor: Ramp, stripes: number): void {
    const c = this.c, w = (x1 - x0) / stripes;
    for (let i = 0; i < stripes; i++) {
      const ramp = i % 2 ? bColor : a, x = x0 + i * w;
      this.b.poly([[x, y], [x + w, y], [x + w + 1, y + drop], [x - 1, y + drop]]);
      c.fillStyle = this.b.gradient(x, x + w, ramp); c.fill();
      c.beginPath(); c.arc(x + w / 2, y + drop, w / 2, 0, Math.PI); c.fillStyle = ramp.base; c.fill();
      c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.stroke();
    }
    const shadow = c.createLinearGradient(0, y + drop + 3, 0, y + drop + 12);
    shadow.addColorStop(0, "rgba(34,26,43,0.32)"); shadow.addColorStop(1, "rgba(34,26,43,0)");
    c.fillStyle = shadow; c.fillRect(x0, y + drop + 3, x1 - x0, 9);
    this.b.line([[x0 + 1, y + 1.4], [x1 - 1, y + 1.4]], rgba(GLINT, 0.5), 1);
  }

  /** Luz quente (ou de outra cor) que um vidro aceso lança na parede em volta. */
  spill(x: number, y: number, r: number, color: string): void {
    const c = this.c, g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, rgba(color, 0.34)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /** Placa pendurada num braço de ferro: o braço, duas correntes, a tábua e o desenho em cima (feito pelo chamador). */
  hangingSign(x: number, y: number, w: number, h: number): void {
    const c = this.c;
    this.b.line([[x - w / 2 - 10, y - 4], [x + w / 2 + 1, y - 4]], "#3b3f46", 2);
    this.b.line([[x - w / 2 + 3, y - 3], [x - w / 2 + 3, y]], "#3b3f46", 1);
    this.b.line([[x + w / 2 - 3, y - 3], [x + w / 2 - 3, y]], "#3b3f46", 1);
    c.fillStyle = OUTLINE; c.fillRect(x - w / 2 - 0.7, y - 0.7, w + 1.4, h + 1.4);
    c.fillStyle = this.b.gradient(x - w / 2, x + w / 2, { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" }); c.fillRect(x - w / 2, y, w, h);
    this.b.line([[x - w / 2 + 1, y + 1], [x + w / 2 - 1, y + 1]], rgba(GLINT, 0.4), 0.8);
  }

  /** Telhado de palha: fios inclinados em três tons, cumeeira amarrada e a franja irregular do beiral. */
  thatchRoof(x0: number, x1: number, yEave: number, yRidge: number, overhang: number, ramp: Ramp, v: number): void {
    const c = this.c, inset = (x1 - x0) * 0.12;
    const path = (): void => this.b.poly([[x0 - overhang, yEave], [x0 + inset, yRidge], [x1 - inset, yRidge], [x1 + overhang, yEave]]);
    path(); c.fillStyle = this.b.gradient(x0 - overhang, x1 + overhang, ramp); c.fill();
    c.save(); path(); c.clip();
    const tones = [ramp.light, ramp.base, ramp.dark];
    for (let x = x0 - overhang, i = 0; x < x1 + overhang; x += 2.4, i++) {
      const lean = (x - (x0 + x1) / 2) * 0.12, len = (yEave - yRidge) * (0.5 + noise(i, v, 131) * 0.5);
      this.b.line([[x + lean * 0.3, yEave], [x + lean, yEave - len]], rgba(tones[i % 3]!, 0.75), 1);
    }
    for (let r = 1; r < 4; r++) this.b.line([[x0 - overhang, yEave - r * 7], [x1 + overhang, yEave - r * 7 - 1]], rgba(ramp.dark, 0.4), 0.9);
    c.restore();
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
    for (let x = x0 - overhang + 1, i = 0; x < x1 + overhang - 1; x += 3, i++) {
      c.fillStyle = tones[(i + 1) % 3]!; c.fillRect(x, yEave, 2, 2 + noise(i, v, 133) * 3);
    }
    const shadow = c.createLinearGradient(0, yEave + 3, 0, yEave + 10);
    shadow.addColorStop(0, "rgba(34,26,43,0.4)"); shadow.addColorStop(1, "rgba(34,26,43,0)");
    c.fillStyle = shadow; c.fillRect(x0, yEave + 3, x1 - x0, 7);
    c.fillStyle = "#6a4a2a"; c.fillRect(x0 + inset, yRidge - 2, x1 - x0 - inset * 2, 3);
    this.b.line([[x0 - overhang + 2, yEave - 1], [x0 + inset + 2, yRidge + 2]], rgba(GLINT, 0.5), 1);
  }

  /** Telhado de couro curtido: painéis costurados que se afinam para o alto, remendos, pontos de linha e o travessão de osso. */
  hideRoof(x0: number, x1: number, yEave: number, yRidge: number, overhang: number, ramp: Ramp, v: number): void {
    const c = this.c, inset = (x1 - x0) * 0.1, n = Math.max(3, Math.round((x1 - x0) / 20));
    const path = (): void => this.b.poly([[x0 - overhang, yEave], [x0 + inset, yRidge], [x1 - inset, yRidge], [x1 + overhang, yEave]]);
    path(); c.fillStyle = this.b.gradient(x0 - overhang, x1 + overhang, ramp); c.fill();
    c.save(); path(); c.clip();
    for (let i = 1; i < n; i++) {
      const t = i / n, xb = x0 - overhang + (x1 - x0 + overhang * 2) * t, xt = x0 + inset + (x1 - x0 - inset * 2) * t;
      this.b.line([[xb, yEave], [xt, yRidge]], rgba("#1e1410", 0.55), 1.1);
      for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6; this.b.line([[xb + (xt - xb) * u - 1.4, yEave + (yRidge - yEave) * u], [xb + (xt - xb) * u + 1.4, yEave + (yRidge - yEave) * u]], rgba(ramp.light, 0.7), 0.8); }
    }
    for (let i = 0; i < 3; i++) {
      const px = x0 + 6 + noise(i, v, 135) * (x1 - x0 - 24), py = yRidge + 4 + noise(i, v, 137) * (yEave - yRidge - 12);
      c.fillStyle = rgba(ramp.light, 0.45); c.fillRect(px, py, 11, 7);
      c.strokeStyle = rgba("#1e1410", 0.6); c.lineWidth = 0.8; c.setLineDash([2, 1.6]); c.strokeRect(px, py, 11, 7); c.setLineDash([]);
    }
    c.restore();
    path(); c.strokeStyle = OUTLINE; c.lineWidth = 1.2; c.stroke();
    const shadow = c.createLinearGradient(0, yEave + 1, 0, yEave + 8);
    shadow.addColorStop(0, "rgba(34,26,43,0.4)"); shadow.addColorStop(1, "rgba(34,26,43,0)");
    c.fillStyle = shadow; c.fillRect(x0, yEave + 1, x1 - x0, 7);
    this.bone(x0 + inset - 5, yRidge - 1, x1 - inset + 5, yRidge - 1, 1.8);
    this.b.line([[x0 - overhang + 2, yEave - 1], [x0 + inset + 2, yRidge + 2]], rgba(GLINT, 0.5), 1);
  }

  /** Osso longo: haste clara com a sombra de baixo e as duas epífises (cabeças arredondadas) nas pontas. */
  bone(x1: number, y1: number, x2: number, y2: number, r: number): void {
    const c = this.c, nx = (y2 - y1), ny = -(x2 - x1), len = Math.hypot(nx, ny) || 1, ox = (nx / len) * r * 0.5, oy = (ny / len) * r * 0.5;
    this.b.line([[x1, y1], [x2, y2]], "#a08f6c", r * 1.2);
    this.b.line([[x1 + ox, y1 + oy], [x2 + ox, y2 + oy]], "#efe3c8", r * 0.7);
    for (const [x, y] of [[x1, y1], [x2, y2]] as const) {
      ellipse(c, x - 0.5, y - r * 0.5, r * 0.8, r * 0.8, "#efe3c8"); ellipse(c, x - 0.5, y + r * 0.5, r * 0.8, r * 0.8, "#d3c3a0");
      c.beginPath(); c.arc(x - 0.5, y - r * 0.5, r * 0.8, 0, Math.PI * 2); c.arc(x - 0.5, y + r * 0.5, r * 0.8, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.7; c.stroke();
    }
  }

  /** Caveira pequena: crânio, maxilar, órbitas e nariz; `s` é a escala (1 = ~10 px de largura). */
  skull(x: number, y: number, s: number): void {
    const c = this.c;
    c.save(); c.translate(x, y); c.scale(s, s);
    ellipse(c, 0, -5, 5.4, 4.6, "#d3c3a0");
    this.b.poly([[-3.6, -3], [-2.4, 3], [2.4, 3], [3.6, -3]]); c.fillStyle = "#efe3c8"; c.fill();
    ellipse(c, -2, -5, 1.4, 1.7, "#221a2b"); ellipse(c, 2, -5, 1.4, 1.7, "#221a2b");
    this.b.poly([[0, -2.2], [-1, 0], [1, 0]]); c.fillStyle = "#221a2b"; c.fill();
    for (let i = -2; i <= 2; i++) { c.fillStyle = "#a08f6c"; c.fillRect(i * 1.1 - 0.4, 1.4, 0.8, 1.8); }
    c.beginPath(); c.ellipse(0, -5, 5.4, 4.6, 0, 0, Math.PI * 2); c.strokeStyle = OUTLINE; c.lineWidth = 0.8 / s; c.stroke();
    c.restore();
  }
}
export type { Point };
