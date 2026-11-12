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

/** Níveis de variação de luz de uma laje: poucos, para o desenho reaproveitar as cores já montadas (o chunk pinta milhares de lajes). */
export const SLAB_LEVELS = 8;
export interface SlabLook { readonly body: string; readonly light: string; readonly dark: string }
const looks = new Map<number, SlabLook>();
const shadeRgb = (base: string, k: number): [number, number, number] =>
  [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(parseInt(base.slice(1 + i * 2, 3 + i * 2), 16) * k)))) as [number, number, number];
const mixRgb = (a: readonly number[], b: readonly number[], t: number): string => `rgb(${[0, 1, 2].map(i => Math.round(a[i]! + (b[i]! - a[i]!) * t)).join(",")})`;
/**
 * As três cores de uma laje (o corpo, a quina de luz e a quina de sombra) para um tom e um sorteio. O sorteio vira um de
 * `SLAB_LEVELS` níveis de luz (±6 %), então há no máximo 4 × 8 combinações, montadas uma vez e guardadas.
 */
export function slabLook(tone: number, roll: number): SlabLook {
  const t = Number.isFinite(tone) ? Math.max(0, Math.min(SLAB_TONES.length - 1, Math.floor(tone))) : 0;
  const r = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0.5, level = Math.min(SLAB_LEVELS - 1, Math.floor(r * SLAB_LEVELS));
  const key = t * SLAB_LEVELS + level, hit = looks.get(key);
  if (hit) return hit;
  const body = shadeRgb(SLAB_TONES[t]!, 1 + ((level + 0.5) / SLAB_LEVELS - 0.5) * 0.12);
  const made = { body: `rgb(${body.join(",")})`, light: mixRgb(body, [255, 246, 220], 0.2), dark: mixRgb(body, [27, 20, 36], 0.5) };
  looks.set(key, made);
  return made;
}
/** Cor da laje: o tom da pedra com uma variação própria da laje (±6 % de luz), para duas lajes quase nunca serem idênticas. */
export function slabColor(tone: number, roll: number): string {
  const t = Number.isFinite(tone) ? Math.floor(tone) : 0, r = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0.5;
  const base = SLAB_TONES[Math.max(0, Math.min(SLAB_TONES.length - 1, t))]!, k = 1 + (r - 0.5) * 0.12;
  const ch = (i: number): number => Math.max(0, Math.min(255, Math.round(parseInt(base.slice(1 + i * 2, 3 + i * 2), 16) * k)));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

/** Quinas das lajes e brilhos como cores prontas com transparência: pintar com `globalAlpha` a cada laje custa mais. */
export const EDGE_LIGHT_TOP = "rgba(154,136,164,0.6)";
export const EDGE_LIGHT_LEFT = "rgba(154,136,164,0.4)";
export const EDGE_DARK_BOTTOM = "rgba(27,20,36,0.5)";
export const EDGE_DARK_RIGHT = "rgba(27,20,36,0.4)";
export const CHIP_LIGHT = "rgba(255,246,220,0.28)";
export const POLISH_FLAT = "rgba(255,246,220,0.12)";
/** Fração dos tiles cuja laje de destaque tem o degradê radial de polimento (as outras têm um brilho chapado). */
export const GLOW_SHARE = 0.34;
