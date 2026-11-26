import { APPRENTICE_THEME, type MageSetTheme } from "../sets/index.ts";

/** As cores da calça e das botas do Mago (ADR 0078): sem elas, o corpo mostra a calça e a bota de base de todos os heróis. */
export interface LegWear { readonly pants: string | null; readonly boots: string | null; readonly bootsLight: string | null }
/** As do conjunto do Aprendiz: calça violeta-noite e botas de couro roxo com a borda mais clara. */
export const APPRENTICE_LEGWEAR = { pants: APPRENTICE_THEME.pants, boots: APPRENTICE_THEME.boots, bootsLight: APPRENTICE_THEME.bootsLight } as const;
/** A calça e as botas de um conjunto, lidas da ficha dele (ADR 0080). */
export const legwearOf = (t: MageSetTheme): { readonly pants: string; readonly boots: string; readonly bootsLight: string } => ({ pants: t.pants, boots: t.boots, bootsLight: t.bootsLight });
