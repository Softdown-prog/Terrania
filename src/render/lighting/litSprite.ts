import { CREATURE_BOX, LIGHT, type LightRig, type SpriteBox } from "./lightRig.ts";
import { relightSprite } from "./relight.ts";
import { cachedFrame, frameSurface, scratchSurface, storeFrame } from "./spritePool.ts";

export interface LitSpriteOptions {
  /** Identifica o quadro: a mesma chave, o mesmo desenho (criatura, indivíduo, pose e estado já arredondados em degraus). */
  readonly key: string;
  /** O grupo de quadros do mesmo indivíduo: se o orçamento do quadro acabar, o último quadro pronto do grupo é reaproveitado em vez de refazer. */
  readonly group?: string;
  readonly box?: SpriteBox;
  readonly rig?: LightRig;
}

let enabled = true;
/** Quantos quadros novos ainda podem ser iluminados neste quadro de tela (ilimitado até alguém chamar `beginLightingFrame`). */
let budget = Number.POSITIVE_INFINITY;
const latest = new Map<string, string>();
/** Começa um quadro de tela: no máximo `misses` iluminações novas; passando disso, quem já tem quadro pronto reaproveita o último (a pose atrasa um degrau) e só quem nunca foi visto é refeito. */
export function beginLightingFrame(misses = 8): void { budget = misses; }
/** Liga ou desliga a luz comum (os testes e a opção de economia usam; o jogo deixa ligada). */
export function setLightingEnabled(value: boolean): void { enabled = value; }
export const lightingEnabled = (): boolean => enabled;

/** Pixels por unidade do mundo na transformação atual (zoom da câmera e densidade da tela), em degraus de um quarto para a chave do cache ficar estável. */
function pixelScale(ctx: CanvasRenderingContext2D): number {
  const m = typeof ctx.getTransform === "function" ? ctx.getTransform() : null;
  const s = m ? Math.hypot(m.a, m.b) : 1;
  return Number.isFinite(s) && s > 0 ? Math.min(4, Math.max(.5, Math.round(s * 4) / 4)) : 1;
}

/**
 * Desenha `draw` (que pinta com a origem nos pés) com a luz comum por cima, só dentro da silhueta. Sem tela de verdade (testes sem navegador) ou com a luz desligada,
 * desenha direto. O quadro iluminado fica no cache pela chave: o mesmo estado volta do cache em vez de ser refeito.
 */
export function drawLit(options: LitSpriteOptions, ctx: CanvasRenderingContext2D, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (!enabled || typeof document === "undefined") { draw(ctx); return; }
  const box = options.box ?? CREATURE_BOX, scale = pixelScale(ctx);
  const width = Math.max(1, Math.ceil((box.right - box.left) * scale)), height = Math.max(1, Math.ceil((box.bottom - box.top) * scale));
  const key = `${options.key}@${scale}`;
  let frame = cachedFrame(key);
  if (!frame && budget <= 0 && options.group) {
    const stale = latest.get(options.group);
    frame = stale === undefined ? undefined : cachedFrame(stale);
  }
  if (!frame) {
    budget--;
    const source = scratchSurface("source", width, height), sctx = source.getContext("2d");
    if (!sctx) { draw(ctx); return; }
    sctx.setTransform(scale, 0, 0, scale, -box.left * scale, -box.top * scale);
    draw(sctx);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    frame = frameSurface(width, height);
    const fctx = frame.getContext("2d");
    if (fctx) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalCompositeOperation = "source-over"; fctx.clearRect(0, 0, width, height); }
    relightSprite(source, frame, box, scale, options.rig ?? LIGHT);
    storeFrame(key, frame);
    if (options.group) latest.set(options.group, key);
    if (latest.size > 512) latest.clear();
  } else if (options.group && latest.get(options.group) !== key && cachedFrame(key) === frame) latest.set(options.group, key);
  ctx.drawImage(frame, box.left, box.top, box.right - box.left, box.bottom - box.top);
}
