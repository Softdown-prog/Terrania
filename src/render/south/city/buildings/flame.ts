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

/** Pinta a chama do prédio (se tiver) com a origem na base do prédio. */
export function paintBuildingFlame(c: CanvasRenderingContext2D, variant: number, time: number): void {
  const id = SOUTH_BUILDINGS.find(b => b.variant === Math.round(variant))?.id, flame = id === undefined ? undefined : FLAMES[id];
  if (!flame || !Number.isFinite(time)) return;
  const wiggle = Math.sin(time * 10) * 2, lick = Math.sin(time * 7 + 1.3) * 1.2, base = flame.poison ? ["#8bd450", "#5aa032", "#356a1f"] : ["#ffcf6a", "#ff9a3c", "#c9503f"];
  c.save(); c.translate(flame.top.x, flame.top.y);
  const glow = c.createRadialGradient(0, -14, 0, 0, -14, 26);
  glow.addColorStop(0, flame.poison ? "rgba(139,212,80,0.4)" : "rgba(255,154,60,0.4)"); glow.addColorStop(1, "rgba(255,154,60,0)");
  c.fillStyle = glow; c.fillRect(-26, -40, 52, 52);
  c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-7 + lick, -12, wiggle, -28); c.quadraticCurveTo(7 - lick, -12, 6, 0); c.closePath();
  c.fillStyle = base[1]!; c.fill(); c.strokeStyle = base[2]!; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.moveTo(-3, 0); c.quadraticCurveTo(-3.5, -8, wiggle * 0.5, -19); c.quadraticCurveTo(3.5, -8, 3, 0); c.closePath();
  c.fillStyle = base[0]!; c.fill();
  c.beginPath(); c.ellipse(0, -2, 2.2, 3, 0, 0, Math.PI * 2); c.fillStyle = "#fff6dc"; c.fill();
  c.restore();
}
