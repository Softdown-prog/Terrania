import { hash2 } from "../../../../world/random.ts";

/** Cores do piso da capital (ADR 0057): granito cinzento nas ruas, calcário claro na praça, e o dourado e o azul da incrustação. */
export type PavingKind = "street" | "plaza";
export const MORTAR: Readonly<Record<PavingKind, string>> = { street: "#2f3137", plaza: "#8a806d" };
export const TONES: Readonly<Record<PavingKind, readonly string[]>> = {
  street: ["#6d6f74", "#62656b", "#797b80", "#575a62"],
  plaza: ["#cfc6b2", "#c4baa4", "#d8cfbb", "#b9ae96"],
};
export const STONE_LIGHT = "#fff6dc";
export const STONE_DARK: Readonly<Record<PavingKind, string>> = { street: "#1d1f25", plaza: "#4d4638" };
/** A incrustação da praça: o sol da Concórdia, em dourado e azul-real, com o contorno mais escuro. */
export const INLAY = { gold: "#d9a63c", goldLight: "#f2cf78", goldDark: "#8a5a1a", royal: "#2f5fa8", royalLight: "#4f86d6", royalDark: "#173a78", groove: "#2c2619", outline: "#1b1f2a" } as const;
/** O meio-fio de calcário e a sombra que ele lança no gramado. */
export const CURB = { body: "#d9d1bd", light: "#fff6dc", dark: "#8a806d", shade: "rgba(24,34,22,0.2)" } as const;

/** Uma em cada três pedras de destaque é polida pelo uso e ganha um brilho em degradê (um degradê por tile custa caro num chunk inteiro). */
export const GLOW_SHARE = 0.34;

/** Sorteio estável do piso por duas coordenadas globais e um sal. */
export const paveNoise = (a: number, b: number, salt: number): number => hash2(a + 29, b * 23 + 7, salt);

/** Níveis de luz de uma pedra: poucos, para o desenho reaproveitar as cores já montadas (o chunk pinta milhares de pedras). */
export const LEVELS = 8;
export interface StoneLook { readonly body: string; readonly light: string; readonly dark: string }
const looks = new Map<string, StoneLook>();
const channels = (hex: string): number[] => [0, 1, 2].map(i => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16));
const rgb = (c: readonly number[]): string => `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v)))).join(",")})`;
const blend = (a: readonly number[], b: readonly number[], t: number): number[] => a.map((v, i) => v + (b[i]! - v) * t);

/**
 * As três cores de uma pedra (corpo, quina de luz e quina de sombra) para um tipo, um tom e um sorteio. O sorteio vira um de
 * `LEVELS` níveis de luz (±6 %), então há no máximo 2 × 4 × 8 combinações, montadas uma vez e guardadas.
 */
export function stoneLook(kind: PavingKind, tone: number, roll: number): StoneLook {
  const tones = TONES[kind], t = Number.isFinite(tone) ? Math.max(0, Math.min(tones.length - 1, Math.floor(tone))) : 0;
  const r = Number.isFinite(roll) ? Math.max(0, Math.min(1, roll)) : 0.5, level = Math.min(LEVELS - 1, Math.floor(r * LEVELS));
  const key = `${kind}:${t}:${level}`, hit = looks.get(key);
  if (hit) return hit;
  const k = 1 + ((level + 0.5) / LEVELS - 0.5) * 0.12, body = channels(tones[t]!).map(v => v * k);
  const made = { body: rgb(body), light: rgb(blend(body, channels(STONE_LIGHT), 0.22)), dark: rgb(blend(body, channels(STONE_DARK[kind]), 0.5)) };
  looks.set(key, made);
  return made;
}
