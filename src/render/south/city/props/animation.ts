import { rgba } from "../../../draw.ts";
import { FlameBrush, GREEN_FLAME, VIOLET_FLAME } from "../buildings/flame.ts";
import { GLINT } from "../buildings/palette.ts";
import { TORCH_FIRE } from "./torch.ts";
import { WATCHTOWER_BRAZIER } from "./watchtower.ts";
import { WELL_WATER } from "./well.ts";

/**
 * O que se mexe nas peças da cidade (ADR 0049 e 0050): o fogo do braseiro da torre de guarda (violeta na da esquerda, verde na da
 * direita), o fogo das tochas de rua (violeta nas de variação par, verde nas ímpares) e os reflexos da água do poço. O corpo da peça fica no cache; só isto é pintado a cada quadro, com o relógio da
 * simulação. Devolve se a peça tem animação.
 */
export function cityPropAnimates(kind: string): boolean { return kind === "tower" || kind === "well" || kind === "torch"; }

/** Pinta a animação da peça (se tiver), com a origem na base da peça. Tempo inválido não pinta nada. */
export function paintCityPropAnimation(c: CanvasRenderingContext2D, kind: string, variant: number, time: number): void {
  if (!Number.isFinite(time)) return;
  if (kind === "tower") {
    new FlameBrush(c).draw(WATCHTOWER_BRAZIER.x, WATCHTOWER_BRAZIER.y + 6, Math.round(variant) === 1 ? GREEN_FLAME : VIOLET_FLAME, time, 0.8);
  } else if (kind === "torch") {
    new FlameBrush(c).draw(TORCH_FIRE.x, TORCH_FIRE.y, Math.round(variant) % 2 === 1 ? GREEN_FLAME : VIOLET_FLAME, time, 0.55);
  } else if (kind === "well") {
    // dois reflexos de luz que deslizam sobre a água, recortados na elipse da água
    c.save();
    c.beginPath(); c.ellipse(WELL_WATER.x, WELL_WATER.y, WELL_WATER.rx - 2, WELL_WATER.ry - 2, 0, 0, Math.PI * 2); c.clip();
    for (const [phase, y, w, alpha] of [[1.1, -12, 15, 0.34], [0.7, 2, 10, 0.22]] as const) {
      const x = -15 + Math.sin(time * phase) * 14;
      c.beginPath(); c.ellipse(x, y, w, 1.7, 0, 0, Math.PI * 2); c.fillStyle = rgba(GLINT, alpha); c.fill();
    }
    c.restore();
  }
}
