import type { GearState } from "../../../engine/character/Equipment.ts";
import type { LegWear } from "../mage/gear/legwear.ts";
import type { MageWear } from "../mage/index.ts";
import type { HeroLook } from "../look.ts";
import { drawArcherHead } from "./head.ts";
import { ARCHER_PAL as P } from "./palette.ts";
import { drawArcherQuiver } from "./quiver.ts";
import { drawArcherTorso } from "./torso.ts";

const none = (): void => undefined;

/**
 * A aparência do herói Arqueiro (ADR 0114): gibão de couro cru verde-musgo com braçais, a aljava às costas no lugar do manto, o rosto anguloso e o cabelo curto
 * preso por uma faixa. Sem barra de túnica e sem capuz por enquanto (o capuz vem com os conjuntos altos, lote A6).
 */
export const ARCHER_LOOK: HeroLook = {
  tunic: { light: P.jerkin.light, mid: P.jerkin.mid, dark: P.jerkin.dark },
  sleeve: P.sleeve, cuff: P.bracer, head: drawArcherHead,
  robe: none, cloak: drawArcherQuiver, torso: drawArcherTorso, hat: none,
};

const NO_LEGWEAR: LegWear = { pants: null, boots: null, bootsLight: null };
/** O que o Arqueiro veste, no formato que o desenho do herói lê (o mesmo do Mago; o Arqueiro ainda não tem peças avulsas, lote A6). */
export const ARCHER_WEAR: MageWear = { look: ARCHER_LOOK, legwear: NO_LEGWEAR, book: null, ring: null, pendant: null };
export function archerWear(_gear: GearState | undefined): MageWear { return ARCHER_WEAR; }
export { ARCHER_BODY, ARCHER_PAL } from "./palette.ts";
