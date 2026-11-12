import { SOUTH_CITY_PALETTE as C } from "../../../../world/southCity.ts";
import { type Ramp, type WearTone } from "../../kit/index.ts";

/** Rampas (claro, médio, escuro) da cidade do Poço Negro, na mesma paleta das peças da cidade e do piso (ADR 0043). */
const ramp = (c: readonly [string, string, string]): Ramp => ({ light: c[0], base: c[1], dark: c[2] });
export const CLAY = ramp(C.clay);
export const STONE = ramp(C.stone);
export const WINE = ramp(C.wine);
export const BRONZE = ramp(C.bronze);
export const BONE = ramp(C.bone);
export const POISON = ramp(C.poison);
export const SAND = ramp(C.sand);
export const OUTLINE = "#142a2a";
export const GLINT = "#fff6dc";
/** Desgaste de cada material: reboco de barro (sal e fuligem), pedra roxa (musgo escuro) e osso (amarelado). */
export const CLAY_WEAR: WearTone = { stain: "#3d2616", lichenA: "#d9b26a", lichenB: "#a8884a", salt: "#f3e4c0" };
export const STONE_WEAR: WearTone = { stain: "#150f1d", lichenA: "#6f5a8c", lichenB: "#4a6a60", salt: "#b9a8d8" };
export const BONE_WEAR: WearTone = { stain: "#4a3a22", lichenA: "#b79a52", lichenB: "#8a8f4e", salt: "#fff6dc" };
/** Madeira, palha e couro curtido (as moradias e o estábulo): rampas próprias da cidade. */
export const WOOD: Ramp = { light: "#b98255", base: "#8a5e3b", dark: "#5a3a24" };
export const STRAW: Ramp = { light: "#ecd58e", base: "#c9a85c", dark: "#8a6e30" };
export const HIDE: Ramp = { light: "#b98a58", base: "#8a6338", dark: "#4f361e" };
