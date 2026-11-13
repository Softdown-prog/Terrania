import { SOUTH_BUILDINGS } from "../../../../world/southCity.ts";
import { FORGE_CHIMNEY_TOP } from "./forge.ts";
import { POISONS_STILL_TOP } from "./poisons.ts";

/**
 * Chamas animadas dos prédios da cidade (ADR 0043): a chaminé da Fornalha dos Trolls e o alambique da Casa de Venenos.
 * O prédio fica no cache; só a chama é pintada a cada quadro, no topo certo, e com `time` vindo da simulação.
 */
const FLAMES: Readonly<Record<string, { top: { x: number; y: number }; poison: boolean }>> = {
  "south-forge": { top: FORGE_CHIMNEY_TOP, poison: false },
  "south-poisons": { top: POISONS_STILL_TOP, poison: true },
};

/** O prédio de índice `variant` tem chama? */
export function buildingHasFlame(variant: number): boolean {
  const id = SOUTH_BUILDINGS.find(b => b.variant === Math.round(variant))?.id;
  return id !== undefined && id in FLAMES;
}

/** As cores de uma chama: o corpo externo, o miolo, a borda e a luz que ela espalha. */
export interface FlameColors { readonly body: string; readonly core: string; readonly edge: string; readonly glow: string }
export const ORANGE_FLAME: FlameColors = { body: "#ff9a3c", core: "#ffcf6a", edge: "#c9503f", glow: "rgba(255,154,60,0.4)" };
export const GREEN_FLAME: FlameColors = { body: "#5aa032", core: "#8bd450", edge: "#356a1f", glow: "rgba(139,212,80,0.4)" };
export const VIOLET_FLAME: FlameColors = { body: "#b985ff", core: "#e3ccff", edge: "#5e2a9a", glow: "rgba(185,133,255,0.4)" };

/** Pincel da chama animada dos prédios e das peças da cidade (ADR 0043 e 0049): um só desenho para todos os fogos. */
export class FlameBrush {
  private readonly c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) { this.c = c; }
  /** Uma chama com a base em (x, y): luz no entorno, corpo, miolo e o ponto branco; `scale` aumenta tudo. */
  draw(x: number, y: number, colors: FlameColors, time: number, scale = 1): void {
    const c = this.c, wiggle = Math.sin(time * 10) * 2, lick = Math.sin(time * 7 + 1.3) * 1.2;
    c.save(); c.translate(x, y); c.scale(scale, scale);
    const glow = c.createRadialGradient(0, -14, 0, 0, -14, 26);
    glow.addColorStop(0, colors.glow); glow.addColorStop(1, "rgba(255,154,60,0)");
    c.fillStyle = glow; c.fillRect(-26, -40, 52, 52);
    c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-7 + lick, -12, wiggle, -28); c.quadraticCurveTo(7 - lick, -12, 6, 0); c.closePath();
    c.fillStyle = colors.body; c.fill(); c.strokeStyle = colors.edge; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-3.5, -8, wiggle * 0.5, -19); c.quadraticCurveTo(3.5, -8, 3, 0); c.closePath();
    c.fillStyle = colors.core; c.fill();
    c.beginPath(); c.ellipse(0, -2, 2.2, 3, 0, 0, Math.PI * 2); c.fillStyle = "#fff6dc"; c.fill();
    c.restore();
  }
}

/** Pinta a chama do prédio (se tiver) com a origem na base do prédio. */
export function paintBuildingFlame(c: CanvasRenderingContext2D, variant: number, time: number): void {
  const id = SOUTH_BUILDINGS.find(b => b.variant === Math.round(variant))?.id, flame = id === undefined ? undefined : FLAMES[id];
  if (!flame || !Number.isFinite(time)) return;
  new FlameBrush(c).draw(flame.top.x, flame.top.y, flame.poison ? GREEN_FLAME : ORANGE_FLAME, time);
}
