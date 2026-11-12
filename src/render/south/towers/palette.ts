import { hash2 } from "../../../world/random.ts";

/** Cores, tipos e sorteio das torres do Sul (ADR 0019). */
export type Ramp = { readonly light: string; readonly base: string; readonly dark: string };
export type Point = readonly [number, number];
export const OUTLINE = "#142a2a";
export const GLINT = "#fff6dc";
export const SANDSTONE: Ramp = { light: "#e8d0a0", base: "#bf9f6c", dark: "#7b5f40" };
export const PALE_STONE: Ramp = { light: "#f3e7cb", base: "#d4c196", dark: "#8f7d5e" };
export const BASALT: Ramp = { light: "#8a739b", base: "#54446a", dark: "#2a2038" };
export const GOLD: Ramp = { light: "#ffe29a", base: "#e0a24a", dark: "#8a5a1e" };
export const WOOD: Ramp = { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" };
export const IRON = "#3b3f46";
export const noise = (i: number, v: number, salt: number): number => hash2(i + 41, v * 37 + 5, salt);

