import { hash2 } from "../../../world/random.ts";

/** Cores, tipos e sorteio da região central (ADR 0056): a pedra clara dos povos humanos, o azul e o dourado da capital. */
export type Ramp = { readonly light: string; readonly base: string; readonly dark: string };
export type Point = readonly [number, number];
export const OUTLINE = "#1b1f2a";
export const GLINT = "#fff6dc";
/** Calcário claro das muralhas e a pedra mais cinzenta do soco e das torres. */
export const LIMESTONE: Ramp = { light: "#e6dfd0", base: "#bdb4a2", dark: "#7f786b" };
export const GRANITE: Ramp = { light: "#a4a8ad", base: "#757a82", dark: "#464b54" };
/** Telha de ardósia azulada, o azul dos estandartes e o dourado dos brasões. */
export const SLATE: Ramp = { light: "#7f8fae", base: "#56668a", dark: "#2f3b57" };
export const ROYAL: Ramp = { light: "#4f86d6", base: "#2f5fa8", dark: "#173a78" };
export const GOLD: Ramp = { light: "#ffe29a", base: "#e0a73a", dark: "#8a5a1a" };
export const MOSS: Ramp = { light: "#8fb35c", base: "#5f8a3c", dark: "#37562a" };
export const WOOD: Ramp = { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" };
export const IRON = "#3b414d";
/** Manchas de chuva e de fuligem na pedra. */
export const STAIN = "#4a4a48";
export const noise = (i: number, v: number, salt: number): number => hash2(i + 41, v * 37 + 5, salt);
