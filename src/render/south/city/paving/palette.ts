import { hash2 } from "../../../../world/random.ts";

/** Cores do piso da cidade do Poço Negro (ADR 0042): pedra roxa em quatro tons, argamassa, meio-fio e bronze da praça. */
export const MORTAR = "#1d1626";
export const SLAB_TONES: readonly string[] = ["#5f4f69", "#54445e", "#6a5a74", "#4a3c55"];
export const SLAB_LIGHT = "#9a88a4";
export const SLAB_DARK = "#1b1424";
export const CURB_TONES: readonly string[] = ["#82728c", "#74647e"];
export const INLAY_TONES: readonly string[] = ["#86642f", "#94723a"];
export const INLAY_LIGHT = "#e8bb68";
export const GLINT = "#fff6dc";
export const SAND = { light: "#e3c58a", base: "#c9a468", dark: "#8f6f3f" } as const;

/** Sorteio estável do piso por duas coordenadas globais e um sal. */
export const paveNoise = (a: number, b: number, salt: number): number => hash2(a + 29, b * 23 + 7, salt);

/** Cor da laje: o tom da pedra com uma variação própria da laje (±6 % de luz), para duas lajes quase nunca serem idênticas. */
export function slabColor(tone: number, roll: number): string {
  const t = Number.isFinite(tone) ? Math.floor(tone) : 0, r = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0.5;
  const base = SLAB_TONES[Math.max(0, Math.min(SLAB_TONES.length - 1, t))]!, k = 1 + (r - 0.5) * 0.12;
  const ch = (i: number): number => Math.max(0, Math.min(255, Math.round(parseInt(base.slice(1 + i * 2, 3 + i * 2), 16) * k)));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}
