import { MAGE_PAL } from "../palette.ts";

/** As cores da calça e das botas do Mago (ADR 0078): sem elas, o corpo mostra a calça e a bota de base de todos os heróis. */
export interface LegWear { readonly pants: string | null; readonly boots: string | null; readonly bootsLight: string | null }
/** As do conjunto do Aprendiz: calça violeta-noite e botas de couro roxo com a borda mais clara. */
export const APPRENTICE_LEGWEAR = { pants: MAGE_PAL.pants, boots: "#2e2358", bootsLight: "#6f68c6" } as const;
