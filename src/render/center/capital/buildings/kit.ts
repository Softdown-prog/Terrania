import { ellipse, rgba } from "../../../draw.ts";
import { GLINT, GOLD, GRANITE, IRON, LIMESTONE, OUTLINE, SLATE, StoneBrush, WOOD, noise, type Point, type Ramp } from "../../kit/index.ts";
import { HOLLOW } from "./palette.ts";

/** Onde a reta `eixo = at` cruza o polígono convexo: o trecho coberto no outro eixo, ou `null` se não cruza. */
function cross(pts: readonly Point[], at: number, axis: 0 | 1): readonly [number, number] | null {
  const o = axis === 1 ? 0 : 1;
  let lo = Number.POSITIVE_INFINITY, hi = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!, q = pts[(i + 1) % pts.length]!, a = p[axis], b = q[axis];
    if ((a - at) * (b - at) > 0 || a === b) continue;
    const x = p[o] + ((at - a) / (b - a)) * (q[o] - p[o]);
    lo = Math.min(lo, x); hi = Math.max(hi, x);
  }
  return hi > lo ? [lo, hi] : null;
}

/**
 * O kit dos edifícios da capital (ADR 0058): parede de cantaria com soco e cornija, águas de telhado de ardósia, cúpula,
 * tambor, cone, janelas, porta, colunas, frontão, degraus, ameias, panos e brasões. Não são peças (por isso são métodos de
 * uma classe): as peças são os edifícios, um por arquivo. A origem de todo edifício é o meio da frente, no chão; a parede da
 * frente sobe a partir dela e o telhado cobre o resto do terreno, para trás (para cima na tela). A luz vem de noroeste.
 */
export class HallKit {
  readonly b: StoneBrush;
  readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; this.b = new StoneBrush(c); }

  /** Degradê vertical entre duas cores. */
  fade(y0: number, y1: number, from: string, to: string): CanvasGradient {
    const g = this.c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, from); g.addColorStop(1, to); return g;
  }
  /** Degradê horizontal entre duas cores. */
  sweep(x0: number, x1: number, from: string, to: string): CanvasGradient {
    const g = this.c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, from); g.addColorStop(1, to); return g;
  }

  /** Sombra do edifício no chão: uma faixa à direita, ao longo da profundidade, e outra na frente. */
  castShadow(hw: number, depth: number, height: number): void {
    const c = this.c, reach = Math.min(26, height * 0.3);
    this.b.poly([[hw, 2], [hw + reach, 9], [hw + reach, -depth + 16], [hw, -depth + 4]]);
    c.fillStyle = this.sweep(hw, hw + reach, "rgba(27,31,42,0.44)", "rgba(27,31,42,0)"); c.fill();
    c.fillStyle = this.fade(0, 12, "rgba(27,31,42,0.42)", "rgba(27,31,42,0)"); c.fillRect(-hw, 0, hw * 2 + reach * 0.5, 12);
  }

  /**
   * Parede de frente em cantaria: fiadas de 8 px com juntas alternadas a cada 16, pedras de tom próprio, riscos de chuva,
   * soco de granito com a umidade que sobe, sombra do lado direito, fio de luz à esquerda e contorno.
   */
  ashlar(x0: number, x1: number, yTop: number, yBase: number, v: number, ramp: Ramp = LIMESTONE, plinth = 10): void {
    const c = this.c, w = x1 - x0, h = yBase - yTop;
    c.fillStyle = this.fade(yTop, yBase, ramp.light, ramp.base); c.fillRect(x0, yTop, w, h);
    c.save(); c.beginPath(); c.rect(x0, yTop, w, h); c.clip();
    for (let i = 0, n = Math.round((w * h) / 950); i < n; i++) { // pedras de tom próprio, alinhadas às fiadas
      const row = Math.floor(noise(i, v, 411) * (h / 8)), col = Math.floor(noise(i, v, 413) * (w / 16));
      c.fillStyle = noise(i, v, 415) > 0.5 ? rgba(GLINT, 0.26) : rgba(ramp.dark, 0.2);
      c.fillRect(x0 + col * 16 + (row % 2) * 8 + 1, yBase - (row + 1) * 8 + 1, 14, 6);
    }
    c.beginPath();
    for (let row = 0, y = yBase - 8; y > yTop; row++, y -= 8) {
      c.moveTo(x0, y); c.lineTo(x1, y);
      for (let x = x0 + (row % 2) * 8; x < x1; x += 16) { c.moveTo(x, y); c.lineTo(x, y + 8); }
    }
    c.strokeStyle = rgba(ramp.dark, 0.5); c.lineWidth = 0.85; c.stroke();
    for (let x = x0 + 14, i = 0; x < x1 - 8; x += 26 + noise(i, v, 417) * 22, i++) if (noise(i, v, 419) > 0.35) this.b.streak(x, yTop + 2, 12 + noise(i, v, 421) * 20, 0.3);
    c.fillStyle = this.fade(yBase - plinth - 12, yBase - plinth, "rgba(40,52,38,0)", "rgba(40,52,38,0.3)"); c.fillRect(x0, yBase - plinth - 12, w, 12);
    c.fillStyle = this.fade(yBase - plinth, yBase, GRANITE.light, GRANITE.dark); c.fillRect(x0, yBase - plinth, w, plinth);
    c.beginPath(); for (let x = x0 + 16; x < x1; x += 16) { c.moveTo(x, yBase - plinth); c.lineTo(x, yBase); }
    c.strokeStyle = rgba("#000000", 0.32); c.lineWidth = 0.8; c.stroke();
    this.b.glint(x0, x1, yBase - plinth, 0.35);
    for (let i = 0, n = Math.max(1, Math.round(w / 150)); i < n; i++) { const mx = x0 + 10 + noise(i, v, 423) * Math.max(1, w - 50); this.b.moss(mx, mx + 22 + noise(i, v, 425) * 16, yBase - plinth + 2, 13, v + i); }
    const shade = Math.min(40, w * 0.22);
    c.fillStyle = this.sweep(x1 - shade, x1, "rgba(27,31,42,0)", "rgba(27,31,42,0.3)"); c.fillRect(x1 - shade, yTop, shade, h);
    c.restore();
    c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.strokeRect(x0, yTop, w, h);
    this.b.line([[x0 + 1.4, yBase - 3], [x0 + 1.4, yTop + 2]], rgba(GLINT, 0.5), 1);
  }

  /** Cornija no alto de uma parede: a faixa de pedra que avança, os dentículos por baixo e a sombra que ela lança. */
  cornice(x0: number, x1: number, y: number, ramp: Ramp = LIMESTONE): void {
    const c = this.c;
    c.fillStyle = this.fade(y, y + 10, "rgba(27,31,42,0.42)", "rgba(27,31,42,0)"); c.fillRect(x0, y, x1 - x0, 10);
    c.beginPath(); for (let x = x0 + 2; x < x1 - 2; x += 8) c.rect(x, y, 4, 4);
    c.fillStyle = GRANITE.base; c.fill();
    c.fillStyle = this.fade(y - 6, y, ramp.light, ramp.base); c.fillRect(x0 - 2, y - 6, x1 - x0 + 4, 6);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x0 - 2, y - 6, x1 - x0 + 4, 6);
    this.b.glint(x0 - 1, x1 + 1, y - 5, 0.6);
  }

  /** Pedras de canto (cunhais): blocos grandes e pequenos alternados, subindo a quina da parede. */
  quoins(x: number, yTop: number, yBase: number, side: 1 | -1): void {
    const c = this.c;
    for (let y = yBase - 10, i = 0; y - 8 >= yTop; y -= 8, i++) {
      const w = i % 2 ? 7 : 12;
      c.fillStyle = i % 2 ? LIMESTONE.light : rgba(GLINT, 0.75); c.fillRect(side === 1 ? x : x - w, y - 8, w, 8);
      c.strokeStyle = rgba(LIMESTONE.dark, 0.8); c.lineWidth = 0.8; c.strokeRect(side === 1 ? x : x - w, y - 8, w, 8);
    }
  }

  /** Pilastra: uma faixa de pedra mais clara, com a base e o capitel, que marca o ritmo da fachada. */
  pilaster(x: number, yTop: number, yBase: number, w = 8): void {
    const c = this.c;
    c.fillStyle = this.sweep(x - w / 2, x + w / 2, rgba(GLINT, 0.8), LIMESTONE.base); c.fillRect(x - w / 2, yTop, w, yBase - yTop);
    c.strokeStyle = rgba(LIMESTONE.dark, 0.85); c.lineWidth = 0.8; c.strokeRect(x - w / 2, yTop, w, yBase - yTop);
    c.fillStyle = LIMESTONE.light;
    c.fillRect(x - w / 2 - 1.5, yTop, w + 3, 3.4); c.fillRect(x - w / 2 - 1.5, yBase - 4, w + 3, 4);
    c.strokeRect(x - w / 2 - 1.5, yTop, w + 3, 3.4); c.strokeRect(x - w / 2 - 1.5, yBase - 4, w + 3, 4);
  }

  /**
   * Uma água de telhado: o polígono (convexo) pintado, ardósias de tom próprio e as fiadas com juntas alternadas. `rows` diz
   * se as fiadas correm na horizontal (águas da frente e de trás) ou na vertical (águas dos lados); `bulge` é para que lado a
   * água desce. As fiadas são retângulos finos postos só onde a água existe (a conta é feita aqui, sem recorte do Canvas):
   * um telhado grande tem milhares de telhas, e traçar um caminho ou recortar um polígono custaria dez vezes mais.
   */
  slope(pts: readonly Point[], fill: string | CanvasGradient, rows: "h" | "v", bulge: 1 | -1, v: number, ramp: Ramp = SLATE): void {
    const c = this.c, flat = rows === "h", u = flat ? 0 : 1, w = flat ? 1 : 0;
    const u0 = Math.min(...pts.map(p => p[u])), w0 = Math.min(...pts.map(p => p[w])), w1 = Math.max(...pts.map(p => p[w]));
    const bar = (a: number, s: number, len: number, thick: number): void => { if (flat) c.fillRect(a, s, len, thick); else c.fillRect(s, a, thick, len); };
    this.b.poly(pts); c.fillStyle = fill; c.fill();
    const line = rgba(ramp.dark, 0.6), joint = rgba(ramp.dark, 0.42), lit = rgba(ramp.light, 0.16), pale = rgba(ramp.light, 0.22), dim = rgba(OUTLINE, 0.16);
    for (let s = w0 + 7, r = 0; s < w1 + 7; s += 7, r++) {
      const band = bulge === 1 ? s - 7 : s, a0 = cross(pts, band + 0.5, w), a1 = cross(pts, band + 6.5, w), at = s + 2 < w1 ? cross(pts, s, w) : null;
      if (at) { c.fillStyle = line; bar(at[0], s, at[1] - at[0], 1); c.fillStyle = lit; bar(at[0], s + bulge, at[1] - at[0], 1); }
      if (!a0 || !a1) continue;
      const lo = Math.max(a0[0], a1[0]), hi = Math.min(a0[1], a1[1]), first = u0 + (r % 2) * 4 + Math.ceil((lo - u0 - (r % 2) * 4) / 8) * 8;
      for (let a = first, i = 0; a + 8 <= hi; a += 8, i++) { const t = noise(r * 97 + i, v, 431); if (t > 0.9 || t < 0.08) { c.fillStyle = t > 0.9 ? pale : dim; bar(a, band, 8, 7); } }
      c.fillStyle = joint; for (let a = first; a < hi; a += 8) bar(a, band + 1, 1, 5);
    }
    this.b.poly(pts); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  }

  /**
   * Telhado de quatro águas visto de cima e de frente, entre o beiral da frente (`yEave`) e o de trás (`yBack`): a água de
   * trás (clara), as dos lados (a da esquerda na luz, a da direita na sombra), a da frente e a cumeeira. Com `inset` 0 vira
   * um telhado de duas águas. Devolve a altura da cumeeira e as pontas dela.
   */
  hipRoof(x0: number, x1: number, yEave: number, yBack: number, v: number, ramp: Ramp = SLATE, inset?: number): { ridge: number; left: number; right: number } {
    const c = this.c, L = x0 - 6, R = x1 + 6, ridge = yBack + (yEave - yBack) * 0.42, k = inset ?? Math.min((R - L) * 0.3, (yEave - yBack) * 0.5);
    const A: Point = [L + k, ridge], B: Point = [R - k, ridge];
    this.slope([[L, yBack], [R, yBack], B, A], this.fade(yBack, ridge, ramp.base, ramp.light), "h", -1, v, ramp);
    if (k > 0) {
      this.slope([[L, yBack], A, [L, yEave]], this.sweep(L, L + k, ramp.light, ramp.base), "v", -1, v + 1, ramp);
      this.slope([[R, yBack], [R, yEave], B], this.sweep(R - k, R, ramp.base, ramp.dark), "v", 1, v + 2, ramp);
    }
    this.slope([[L, yEave], [R, yEave], B, A], this.fade(ridge, yEave, ramp.base, ramp.dark), "h", 1, v + 3, ramp);
    // espigões (as quinas entre as águas), cumeeira com o capote de pedra clara e o beiral da frente com a linha de sombra
    if (k > 0) for (const [from, to] of [[[L, yBack], A], [[L, yEave], A], [[R, yBack], B], [[R, yEave], B]] as const) { this.b.line([from, to], OUTLINE, 3); this.b.line([from, to], rgba(LIMESTONE.light, 0.85), 1.4); }
    this.b.line([A, B], OUTLINE, 4.4); this.b.line([A, B], LIMESTONE.light, 2.6); this.b.line([[A[0], ridge - 0.8], [B[0], ridge - 0.8]], rgba(GLINT, 0.7), 0.8);
    c.fillStyle = ramp.dark; c.fillRect(L, yEave - 1, R - L, 3.2);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(L, yEave - 1, R - L, 3.2);
    return { ridge, left: A[0], right: B[0] };
  }

  /**
   * Telhado de duas águas com a empena virada para a frente: a cumeeira corre da frente para o fundo, no meio, `gable` px
   * acima dos beirais; a água da esquerda fica na luz e a da direita, na sombra.
   */
  gableRoof(x0: number, x1: number, yFront: number, yBack: number, gable: number, v: number, ramp: Ramp = SLATE): void {
    const L = x0 - 6, R = x1 + 6, m = (x0 + x1) / 2, top = yFront - gable;
    this.slope([[L, yFront], [m, top], [m, yBack], [L, yBack + gable]], this.sweep(L, m, ramp.light, ramp.base), "v", -1, v, ramp);
    this.slope([[m, top], [R, yFront], [R, yBack + gable], [m, yBack]], this.sweep(m, R, ramp.base, ramp.dark), "v", 1, v + 1, ramp);
    this.b.line([[m, top], [m, yBack]], OUTLINE, 4.4); this.b.line([[m, top], [m, yBack]], LIMESTONE.light, 2.6);
    this.b.line([[L, yFront], [m, top], [R, yFront]], OUTLINE, 4.6); this.b.line([[L, yFront], [m, top], [R, yFront]], LIMESTONE.light, 2.8);
  }

  /** Tambor de pedra (cilindro) com a base em (x, y) e `h` de altura: fiadas curvas, luz à esquerda e sombra à direita. */
  drum(x: number, y: number, rx: number, h: number, ramp: Ramp = LIMESTONE): void {
    const c = this.c, ry = rx * 0.28;
    const body = (): void => { c.beginPath(); c.moveTo(x - rx, y - h); c.lineTo(x - rx, y); c.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); c.lineTo(x + rx, y - h); c.ellipse(x, y - h, rx, ry, 0, 0, Math.PI, true); c.closePath(); };
    const g = c.createLinearGradient(x - rx, 0, x + rx, 0); g.addColorStop(0, ramp.light); g.addColorStop(0.35, ramp.base); g.addColorStop(1, ramp.dark);
    body(); c.fillStyle = g; c.fill();
    c.save(); body(); c.clip();
    for (let yy = y - 8; yy > y - h - ry; yy -= 8) { c.beginPath(); c.ellipse(x, yy, rx, ry, 0, 0, Math.PI); c.strokeStyle = rgba(ramp.dark, 0.5); c.lineWidth = 0.85; c.stroke(); }
    c.restore();
    body(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    c.beginPath(); c.ellipse(x, y - h, rx + 2, ry + 1, 0, 0, Math.PI * 2); c.fillStyle = this.fade(y - h - ry, y - h + ry, ramp.light, ramp.base); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
  }

  /** Cúpula sobre a base em (x, y): meia esfera com o brilho no alto e à esquerda, nervuras douradas do topo até a base e dois aros. */
  dome(x: number, y: number, rx: number, h: number, ramp: Ramp, ribs = 8, rib = GOLD.base): void {
    const c = this.c, ry = rx * 0.28;
    const shape = (): void => {
      c.beginPath(); c.moveTo(x - rx, y); c.bezierCurveTo(x - rx, y - h * 0.78, x - rx * 0.56, y - h, x, y - h);
      c.bezierCurveTo(x + rx * 0.56, y - h, x + rx, y - h * 0.78, x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.closePath();
    };
    const g = c.createRadialGradient(x - rx * 0.36, y - h * 0.62, rx * 0.08, x, y - h * 0.3, rx * 1.25);
    g.addColorStop(0, ramp.light); g.addColorStop(0.45, ramp.base); g.addColorStop(1, ramp.dark);
    shape(); c.fillStyle = g; c.fill();
    c.save(); shape(); c.clip();
    for (let j = 1; j < ribs; j++) {
      const a = (j / ribs) * Math.PI, bx = x + rx * Math.cos(a), by = y + ry * Math.sin(a);
      c.beginPath(); c.moveTo(x, y - h); c.quadraticCurveTo(x + (bx - x) * 1.05, y - h * 0.62, bx, by); c.strokeStyle = rib; c.lineWidth = 1.6; c.stroke();
    }
    for (const t of [0.34, 0.7]) { c.beginPath(); c.ellipse(x, y - h * t, rx * Math.sqrt(1 - t * t * 0.86), ry * (1 - t * 0.5), 0, 0, Math.PI); c.strokeStyle = rgba(ramp.dark, 0.55); c.lineWidth = 0.9; c.stroke(); }
    c.fillStyle = this.sweep(x + rx * 0.2, x + rx, "rgba(27,31,42,0)", "rgba(27,31,42,0.34)"); c.fillRect(x + rx * 0.2, y - h, rx * 0.8, h + ry);
    c.restore();
    shape(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI); c.strokeStyle = rib; c.lineWidth = 2.4; c.stroke();
  }

  /** Telhado cônico sobre a base em (x, y): fiadas de telha que encolhem rumo ao pico e a luz à esquerda. */
  cone(x: number, y: number, r: number, h: number, ramp: Ramp = SLATE): void {
    const c = this.c, ry = r * 0.28;
    const shape = (): void => { c.beginPath(); c.moveTo(x - r, y); c.lineTo(x, y - h); c.lineTo(x + r, y); c.ellipse(x, y, r, ry, 0, 0, Math.PI); c.closePath(); };
    const g = c.createLinearGradient(x - r, 0, x + r, 0); g.addColorStop(0, ramp.light); g.addColorStop(0.4, ramp.base); g.addColorStop(1, ramp.dark);
    shape(); c.fillStyle = g; c.fill();
    c.save(); shape(); c.clip();
    for (let k = 1; k <= 5; k++) { const t = k / 6; c.beginPath(); c.ellipse(x, y - h * t + ry * (1 - t) * 0.9, r * (1 - t), ry * (1 - t), 0, 0, Math.PI); c.strokeStyle = rgba(ramp.dark, 0.6); c.lineWidth = 0.9; c.stroke(); }
    c.restore();
    shape(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    this.b.line([[x - r * 0.28, y - h + h * 0.22], [x - r * 0.66, y - 3]], rgba(GLINT, 0.4), 1.1);
  }

  /**
   * Janela em arco (redondo ou em ogiva) com a base em (x, yBase): moldura de pedra clara, vidro em degradê, montante,
   * travessa, um reflexo em diagonal e o peitoril.
   */
  window(x: number, yBase: number, w: number, h: number, glass: Ramp, pointed = false): void {
    const c = this.c, hw = w / 2;
    const shape = (g: number): void => {
      const r = hw + g, spring = yBase - h + hw;
      c.beginPath(); c.moveTo(x - r, yBase); c.lineTo(x - r, spring);
      if (pointed) { c.quadraticCurveTo(x - r, spring - r * 1.05, x, spring - r * 1.5); c.quadraticCurveTo(x + r, spring - r * 1.05, x + r, spring); }
      else c.arc(x, spring, r, Math.PI, 0);
      c.lineTo(x + r, yBase); c.closePath();
    };
    shape(2.4); c.fillStyle = rgba(GLINT, 0.9); c.fill(); c.strokeStyle = rgba(LIMESTONE.dark, 0.9); c.lineWidth = 0.9; c.stroke();
    const top = yBase - h - (pointed ? hw * 0.5 : 0);
    const g = c.createLinearGradient(0, top, 0, yBase); g.addColorStop(0, glass.light); g.addColorStop(0.5, glass.base); g.addColorStop(1, glass.dark);
    shape(0); c.fillStyle = g; c.fill();
    c.save(); shape(0); c.clip();
    this.b.poly([[x - hw, yBase - h * 0.55], [x + hw, yBase - h * 0.9], [x + hw, yBase - h * 0.72], [x - hw, yBase - h * 0.37]]); c.fillStyle = rgba(GLINT, 0.26); c.fill();
    this.b.line([[x, top], [x, yBase]], OUTLINE, 1.1); this.b.line([[x - hw, yBase - h + hw], [x + hw, yBase - h + hw]], OUTLINE, 1.1);
    if (h > 30) this.b.line([[x - hw, yBase - (h - hw) * 0.5], [x + hw, yBase - (h - hw) * 0.5]], OUTLINE, 0.9);
    c.restore();
    shape(0); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    c.fillStyle = LIMESTONE.light; c.fillRect(x - hw - 4, yBase, w + 8, 3); c.strokeStyle = rgba(LIMESTONE.dark, 0.9); c.lineWidth = 0.8; c.strokeRect(x - hw - 4, yBase, w + 8, 3);
  }

  /** Fresta de arqueiro com a ponta em arco, a partir da soleira em (x, yBase). */
  slit(x: number, yBase: number, h = 15): void {
    const c = this.c;
    c.beginPath(); c.moveTo(x - 2.4, yBase); c.lineTo(x - 2.4, yBase - h + 2.4); c.arc(x, yBase - h + 2.4, 2.4, Math.PI, 0); c.lineTo(x + 2.4, yBase); c.closePath();
    c.fillStyle = HOLLOW; c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
    this.b.line([[x + 1.6, yBase - h + 3], [x + 1.6, yBase - 1]], rgba(GLINT, 0.35), 0.7);
    c.fillStyle = LIMESTONE.light; c.fillRect(x - 4, yBase, 8, 2);
  }

  /** Luz que escorre de uma janela acesa para a parede e o chão, em "screen". */
  spill(x: number, y: number, r: number, color: string): void {
    const c = this.c;
    c.save(); c.globalCompositeOperation = "screen";
    const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, rgba(color, 0.42)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /**
   * Porta de duas folhas em arco com a soleira em (x, yBase): aduelas de pedra e a chave, tábuas, ferragens, argolas e a
   * fresta do meio. `pointed` faz o arco em ogiva.
   */
  door(x: number, yBase: number, w: number, h: number, wood: Ramp = WOOD, pointed = false): void {
    const c = this.c, hw = w / 2, spring = yBase - h + hw;
    const shape = (g: number): void => {
      const r = hw + g;
      c.beginPath(); c.moveTo(x - r, yBase); c.lineTo(x - r, spring);
      if (pointed) { c.quadraticCurveTo(x - r, spring - r * 0.95, x, spring - r * 1.35); c.quadraticCurveTo(x + r, spring - r * 0.95, x + r, spring); }
      else c.arc(x, spring, r, Math.PI, 0);
      c.lineTo(x + r, yBase); c.closePath();
    };
    shape(6); c.fillStyle = this.sweep(x - hw - 6, x + hw + 6, rgba(GLINT, 0.95), LIMESTONE.base); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1; c.stroke();
    for (let j = 1; j < 8; j++) { const a = Math.PI + (j / 8) * Math.PI; this.b.line([[x + (hw + 0.5) * Math.cos(a), spring + (hw + 0.5) * Math.sin(a) * (pointed ? 1.3 : 1)], [x + (hw + 6) * Math.cos(a), spring + (hw + 6) * Math.sin(a) * (pointed ? 1.3 : 1)]], rgba(LIMESTONE.dark, 0.8), 0.8); }
    shape(0); c.fillStyle = HOLLOW; c.fill();
    c.save(); shape(-1.4); c.clip();
    c.fillStyle = this.sweep(x - hw, x + hw, wood.light, wood.dark); c.fillRect(x - hw, yBase - h - hw, w, h + hw);
    c.beginPath(); for (let px = x - hw + 5; px < x + hw; px += 5) { c.moveTo(px, yBase - h - hw); c.lineTo(px, yBase); }
    c.strokeStyle = rgba(wood.dark, 0.75); c.lineWidth = 0.8; c.stroke();
    for (const yy of [yBase - h * 0.22, yBase - h * 0.62]) { c.fillStyle = IRON; c.fillRect(x - hw, yy - 1.6, w, 3.2); c.fillStyle = rgba(GLINT, 0.25); c.fillRect(x - hw, yy - 1.6, w, 0.8); }
    this.b.line([[x, yBase - h - hw], [x, yBase]], HOLLOW, 1.6);
    for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 4.4, yBase - h * 0.42, 2.2, 0, Math.PI * 2); c.strokeStyle = GOLD.base; c.lineWidth = 1.2; c.stroke(); }
    c.fillStyle = this.fade(yBase - h - hw, yBase - h + 6, "rgba(13,17,24,0.6)", "rgba(13,17,24,0)"); c.fillRect(x - hw, yBase - h - hw, w, hw + 6);
    c.restore();
    shape(0); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    const ky = pointed ? spring - (hw + 6) * 1.3 : spring - hw - 6;
    this.b.poly([[x - 3.6, ky - 2.4], [x + 3.6, ky - 2.4], [x + 2.6, ky + 6.4], [x - 2.6, ky + 6.4]]); c.fillStyle = rgba(GLINT, 0.95); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 0.8; c.stroke();
  }

  /** Coluna de pedra com a base em (x, yBase): fuste com caneluras, base e capitel. */
  column(x: number, yBase: number, h: number, w = 9): void {
    const c = this.c, hw = w / 2;
    const g = c.createLinearGradient(x - hw, 0, x + hw, 0); g.addColorStop(0, rgba(GLINT, 1)); g.addColorStop(0.45, LIMESTONE.light); g.addColorStop(1, LIMESTONE.dark);
    c.fillStyle = g; c.fillRect(x - hw, yBase - h + 4, w, h - 8);
    c.strokeStyle = OUTLINE; c.lineWidth = 0.9; c.strokeRect(x - hw, yBase - h + 4, w, h - 8);
    c.beginPath(); for (const fx of [-hw * 0.4, hw * 0.3]) { c.moveTo(x + fx, yBase - h + 7); c.lineTo(x + fx, yBase - 6); }
    c.strokeStyle = rgba(LIMESTONE.dark, 0.5); c.lineWidth = 0.8; c.stroke();
    c.fillStyle = LIMESTONE.light;
    c.fillRect(x - hw - 2.4, yBase - h, w + 4.8, 4.4); c.fillRect(x - hw - 2, yBase - 4.4, w + 4, 4.4);
    c.strokeRect(x - hw - 2.4, yBase - h, w + 4.8, 4.4); c.strokeRect(x - hw - 2, yBase - 4.4, w + 4, 4.4);
  }

  /** Frontão: o triângulo de pedra sobre uma colunata ou uma porta, com as cornijas inclinadas e o tímpano mais fundo. */
  pediment(x0: number, x1: number, y: number, h: number, ramp: Ramp = LIMESTONE): void {
    const c = this.c, m = (x0 + x1) / 2;
    this.b.poly([[x0 - 4, y], [m, y - h], [x1 + 4, y]]); c.fillStyle = this.sweep(x0, x1, ramp.light, ramp.base); c.fill(); c.strokeStyle = OUTLINE; c.lineWidth = 1.1; c.stroke();
    this.b.poly([[x0 + 8, y - 3], [m, y - h + 7], [x1 - 8, y - 3]]); c.fillStyle = rgba(ramp.dark, 0.55); c.fill(); c.strokeStyle = rgba(OUTLINE, 0.7); c.lineWidth = 0.8; c.stroke();
    this.b.line([[x0 - 3, y - 1.2], [m, y - h + 1.4]], rgba(GLINT, 0.75), 1);
  }

  /** Degraus de pedra que descem de `y`: `n` lances, cada um mais largo que o de cima. */
  steps(x0: number, x1: number, y: number, n: number, rise = 3, run = 5): void {
    const c = this.c;
    for (let i = n - 1; i >= 0; i--) {
      const a = x0 - (i + 1) * run, w = x1 - x0 + (i + 1) * run * 2, top = y + i * rise;
      c.fillStyle = this.fade(top, top + rise, LIMESTONE.light, LIMESTONE.dark); c.fillRect(a, top, w, rise);
      c.strokeStyle = rgba(OUTLINE, 0.8); c.lineWidth = 0.8; c.strokeRect(a, top, w, rise);
      this.b.glint(a + 1, a + w - 1, top + 0.6, 0.55);
    }
  }

  /** Ameias sobre a linha `y`, uma a cada `period` px, com a laje de cima. */
  crenels(x0: number, x1: number, y: number, period = 16, w = 10, h = 11, ramp: Ramp = LIMESTONE): void {
    const c = this.c;
    for (let x = x0 + (period - w) / 2; x + w <= x1 + 0.01; x += period) {
      c.fillStyle = this.sweep(x, x + w, ramp.light, ramp.base); c.fillRect(x, y - h, w, h);
      c.fillStyle = rgba(GLINT, 0.8); c.fillRect(x - 1, y - h - 2.4, w + 2, 2.4);
      c.strokeStyle = OUTLINE; c.lineWidth = 0.85; c.strokeRect(x, y - h, w, h); c.strokeRect(x - 1, y - h - 2.4, w + 2, 2.4);
    }
  }

  /** Pano pendurado na cor de uma guilda: borda dourada, dobra de luz e de sombra e a ponta em V. A barra de cima fica em (x, y). */
  cloth(x: number, y: number, w: number, h: number, ramp: Ramp): void {
    const c = this.c, hw = w / 2;
    c.fillStyle = WOOD.dark; c.fillRect(x - hw - 2, y - 2.2, w + 4, 2.6);
    this.b.poly([[x - hw, y], [x + hw, y], [x + hw, y + h], [x, y + h - Math.min(8, h * 0.2)], [x - hw, y + h]]);
    c.fillStyle = this.sweep(x - hw, x + hw, ramp.light, ramp.dark); c.fill();
    c.strokeStyle = GOLD.base; c.lineWidth = 1.3; c.stroke();
    c.fillStyle = rgba(GLINT, 0.2); c.fillRect(x - hw + 1.6, y + 1, 2.2, h - 8);
    this.b.poly([[x - hw, y], [x + hw, y], [x + hw, y + h], [x, y + h - Math.min(8, h * 0.2)], [x - hw, y + h]]); c.strokeStyle = rgba(OUTLINE, 0.55); c.lineWidth = 0.6; c.stroke();
  }

  /** O sol dourado da capital: disco com reflexo e `rays` raios. */
  sun(x: number, y: number, r: number, rays = 12): void {
    const c = this.c;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2, long = i % 2 === 0 ? 1.9 : 1.5;
      this.b.poly([[x + Math.cos(a - 0.16) * r, y + Math.sin(a - 0.16) * r], [x + Math.cos(a) * r * long, y + Math.sin(a) * r * long], [x + Math.cos(a + 0.16) * r, y + Math.sin(a + 0.16) * r]]);
      c.fillStyle = i % 2 === 0 ? GOLD.light : GOLD.base; c.fill(); c.strokeStyle = GOLD.dark; c.lineWidth = 0.6; c.stroke();
    }
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, GOLD.light); g.addColorStop(0.6, GOLD.base); g.addColorStop(1, GOLD.dark);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = g; c.fill(); c.strokeStyle = GOLD.dark; c.lineWidth = 0.9; c.stroke();
    ellipse(c, x - r * 0.32, y - r * 0.36, r * 0.32, r * 0.22, rgba(GLINT, 0.8));
  }

  /** Lanterna de ferro presa à parede em (x, y): o braço, a caixa de vidro quente e o clarão em volta. */
  lantern(x: number, y: number): void {
    const c = this.c;
    this.spill(x, y + 4, 15, "#ffd27a");
    this.b.line([[x, y - 7], [x, y - 2]], IRON, 1.4);
    c.fillStyle = this.fade(y - 2, y + 9, "#fff0bd", "#f0a03c"); c.fillRect(x - 3, y - 2, 6, 10);
    c.strokeStyle = IRON; c.lineWidth = 1.1; c.strokeRect(x - 3, y - 2, 6, 10);
    this.b.poly([[x - 4.4, y - 2], [x, y - 6.4], [x + 4.4, y - 2]]); c.fillStyle = IRON; c.fill();
    ellipse(c, x - 0.8, y + 2, 1.1, 2, rgba(GLINT, 0.9));
  }

  /** Mastro com uma flâmula que voa para a direita, a partir do ponto (x, y) da base do mastro. */
  pennant(x: number, y: number, h: number, ramp: Ramp, size = 16): void {
    const c = this.c;
    this.b.line([[x, y], [x, y - h]], WOOD.dark, 1.5);
    ellipse(c, x, y - h, 2.2, 2.2, GOLD.base);
    c.beginPath(); c.moveTo(x + 0.8, y - h + 2); c.quadraticCurveTo(x + size * 0.55, y - h + 3.4, x + size, y - h + 6); c.quadraticCurveTo(x + size * 0.55, y - h + 7.6, x + 0.8, y - h + 10.5); c.closePath();
    c.fillStyle = this.sweep(x, x + size, ramp.light, ramp.dark); c.fill(); c.strokeStyle = GOLD.base; c.lineWidth = 0.8; c.stroke();
  }
}
