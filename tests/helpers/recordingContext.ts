/**
 * Gravador de chamadas de Canvas 2D para auditar arte procedural em Node, sem navegador.
 * Registra o que foi desenhado (preenchimentos, traços, cores, gradientes, curvas) e deixa
 * medir se uma peça tem camadas de acabamento. Mede estrutura, não beleza.
 */
export interface Metrics {
  /** Chamadas que realmente pintam: fill, stroke, fillRect, strokeRect, drawImage. */
  paintOps: number;
  fills: number;
  strokes: number;
  /** Cores distintas (#rrggbb, ignorando alfa) usadas em preenchimentos, traços e gradientes. */
  colors: number;
  gradients: number;
  /** Curvas e arcos: formas orgânicas em vez de só retângulos. */
  curves: number;
  /** Luminância (0..1) da cor mais escura e da mais clara usadas. */
  darkest: number;
  lightest: number;
  saves: number;
  restores: number;
  /** Alguma cor foi usada com alfa < 1 (sombras, brilho, vidro). */
  usesAlpha: boolean;
  /** Pixels (em unidades do contexto) cobertos pela caixa de todos os caminhos desenhados. */
  width: number;
  height: number;
  /** Hash do fluxo de chamadas: igual entre execuções iguais (determinismo). */
  signature: string;
}

const PAINT = new Set(["fill", "stroke", "fillRect", "strokeRect", "drawImage", "fillText"]);
const CURVE = new Set(["arc", "ellipse", "quadraticCurveTo", "bezierCurveTo", "arcTo"]);

function parseColor(value: unknown): { hex: string; alpha: number } | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return { hex: "#" + m[1]!.split("").map(c => c + c).join(""), alpha: 1 };
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
  if (m) return { hex: "#" + m[1], alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (rgb) {
    const h = (n: string) => Math.max(0, Math.min(255, Math.round(Number(n)))).toString(16).padStart(2, "0");
    return { hex: "#" + h(rgb[1]!) + h(rgb[2]!) + h(rgb[3]!), alpha: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  }
  return null;
}
const luminance = (hex: string): number => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};

export class Recorder {
  private readonly palette = new Set<string>();
  private readonly calls: string[] = [];
  private readonly counts: Record<string, number> = {};
  private alpha = false;
  private minX = Infinity; private minY = Infinity; private maxX = -Infinity; private maxY = -Infinity;
  private readonly state: Record<string, unknown> = {};
  private readonly stack: Record<string, unknown>[] = [];
  private tx = 0; private ty = 0; private sx = 1; private sy = 1;
  private readonly txStack: number[][] = [];
  private pending: [number, number][] = [];

  private note(color: unknown): void {
    const parsed = parseColor(color);
    if (!parsed) return;
    this.palette.add(parsed.hex);
    if (parsed.alpha < 0.999) this.alpha = true;
  }
  private point(x: unknown, y: unknown, rx = 0, ry = rx): void {
    if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x + y)) return;
    this.pending.push([this.tx + (x - rx) * this.sx, this.ty + (y - ry) * this.sy]);
    this.pending.push([this.tx + (x + rx) * this.sx, this.ty + (y + ry) * this.sy]);
  }
  private commit(): void {
    for (const [x, y] of this.pending) {
      this.minX = Math.min(this.minX, x); this.maxX = Math.max(this.maxX, x);
      this.minY = Math.min(this.minY, y); this.maxY = Math.max(this.maxY, y);
    }
  }
  private gradient(kind: string): object {
    this.counts.gradients = (this.counts.gradients ?? 0) + 1;
    return { addColorStop: (_: number, color: string) => { this.note(color); this.calls.push(kind + "stop" + color); } };
  }

  readonly ctx: CanvasRenderingContext2D;
  constructor() {
    const self = this;
    const target: Record<string, unknown> = { canvas: { width: 256, height: 256 } };
    this.ctx = new Proxy(target, {
      get(_t, prop: string) {
        if (prop in self.state) return self.state[prop];
        if (prop === "canvas") return target.canvas;
        if (prop === "createRadialGradient" || prop === "createLinearGradient" || prop === "createConicGradient")
          return () => self.gradient(prop);
        if (prop === "createPattern") return () => ({});
        if (prop === "measureText") return () => ({ width: 8 });
        if (prop === "getTransform") return () => ({ a: self.sx, d: self.sy, e: self.tx, f: self.ty });
        return (...args: unknown[]) => {
          self.counts[prop] = (self.counts[prop] ?? 0) + 1;
          self.calls.push(prop + args.map(a => typeof a === "number" ? a.toFixed(2) : typeof a === "string" ? a : "").join(","));
          switch (prop) {
            case "save": self.stack.push({ ...self.state }); self.txStack.push([self.tx, self.ty, self.sx, self.sy]); break;
            case "restore": {
              const s = self.stack.pop(); if (s) for (const k of Object.keys(self.state)) delete self.state[k];
              if (s) Object.assign(self.state, s);
              const t = self.txStack.pop(); if (t) [self.tx, self.ty, self.sx, self.sy] = t as [number, number, number, number];
              break;
            }
            case "translate": self.tx += Number(args[0]) * self.sx; self.ty += Number(args[1]) * self.sy; break;
            case "scale": self.sx *= Number(args[0]); self.sy *= Number(args[1] ?? args[0]); break;
            case "beginPath": self.pending = []; break;
            case "moveTo": case "lineTo": self.point(args[0], args[1]); break;
            case "quadraticCurveTo": self.point(args[0], args[1]); self.point(args[2], args[3]); break;
            case "bezierCurveTo": self.point(args[0], args[1]); self.point(args[4], args[5]); break;
            case "arc": self.point(args[0], args[1], Number(args[2])); break;
            case "ellipse": self.point(args[0], args[1], Number(args[2]), Number(args[3])); break;
            case "rect": case "fillRect": case "strokeRect":
              self.point(args[0], args[1]); self.point(Number(args[0]) + Number(args[2]), Number(args[1]) + Number(args[3])); break;
            case "fill": case "stroke": self.commit(); break;
            default: break;
          }
          if (prop === "fillRect" || prop === "strokeRect") self.commit();
          return undefined;
        };
      },
      set(_t, prop: string, value: unknown) {
        self.state[prop] = value;
        if (prop === "fillStyle" || prop === "strokeStyle" || prop === "shadowColor") self.note(value);
        if (prop === "globalAlpha" && typeof value === "number" && value < 0.999) self.alpha = true;
        self.calls.push("=" + prop + (typeof value === "string" ? value : typeof value === "number" ? value.toFixed(2) : ""));
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
  }

  metrics(): Metrics {
    let paintOps = 0, curves = 0;
    for (const [name, n] of Object.entries(this.counts)) {
      if (PAINT.has(name)) paintOps += n;
      if (CURVE.has(name)) curves += n;
    }
    const lums = [...this.palette].map(luminance);
    let h = 2166136261;
    for (const call of this.calls) for (let i = 0; i < call.length; i++) h = Math.imul(h ^ call.charCodeAt(i), 16777619);
    return {
      paintOps, fills: (this.counts.fill ?? 0) + (this.counts.fillRect ?? 0), strokes: (this.counts.stroke ?? 0) + (this.counts.strokeRect ?? 0),
      colors: this.palette.size, gradients: this.counts.gradients ?? 0, curves,
      darkest: lums.length ? Math.min(...lums) : 1, lightest: lums.length ? Math.max(...lums) : 0,
      saves: this.counts.save ?? 0, restores: this.counts.restore ?? 0, usesAlpha: this.alpha,
      width: Number.isFinite(this.maxX) ? this.maxX - this.minX : 0, height: Number.isFinite(this.maxY) ? this.maxY - this.minY : 0,
      signature: (h >>> 0).toString(16),
    };
  }
}

/** `document.createElement("canvas")` falso: cada canvas de cache grava no mesmo Recorder. */
export function withFakeDocument<T>(recorder: Recorder, run: () => T): T {
  const g = globalThis as Record<string, unknown>;
  const previous = g.document;
  g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => recorder.ctx }) };
  try { return run(); } finally { if (previous === undefined) delete g.document; else g.document = previous; }
}
