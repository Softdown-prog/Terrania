import { hash2 } from "../../../world/random.ts";

/** Cores e sorteio das ruínas do Sul (ADR 0017). A luz vem da esquerda e de cima. */
export type Ramp = { readonly light: string; readonly base: string; readonly dark: string };
export const SANDSTONE: Ramp = { light: "#e8d0a0", base: "#bf9f6c", dark: "#7b5f40" };
export const MUDBRICK: Ramp = { light: "#dba372", base: "#b27c4e", dark: "#704c32" };
export const SAND: Ramp = { light: "#ecd29a", base: "#d3b377", dark: "#a07f4d" };
export const CLAY: Ramp = { light: "#d98b5b", base: "#a8613a", dark: "#6a3a24" };
export const CLOTH: Ramp = { light: "#8f3d62", base: "#5e2440", dark: "#36142a" };
export const OUTLINE = "#142a2a";
export const GLINT = "#fff6dc";
export const BONE = "#efe3c8";
export const OCHRE = "#c98a3a";
export const GLAZE = { light: "#5fb0a6", dark: "#2f6f73" } as const;
export const SCRUB = { base: "#6f7a4a", dry: "#a39a63" } as const;

/** Sorteio estável por peça (índice), variante e sal. */
export const noise = (i: number, v: number, salt: number): number => hash2(i + 17, v * 31 + 3, salt);
/** Desgaste: fuligem e chuva escorrida, e líquen seco de pedra (ocre e olivo desbotado). */
export const STAIN = { dark: "#3b2a1c", mid: "#5a4330" } as const;
export const LICHEN = { ochre: "#c8a14a", olive: "#8a8f4e" } as const;
