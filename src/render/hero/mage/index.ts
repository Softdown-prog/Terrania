import type { HeroLook } from "../look.ts";
import { drawMageCloak } from "./cloak.ts";
import { MAGE_PAL } from "./palette.ts";
import { drawWizardHat } from "./hat.ts";
import { drawMageRobe } from "./robe.ts";
import { drawMageTorso } from "./torso.ts";

/** A aparência do herói Mago (ADR 0067): túnica azul-violeta, manto escuro, chapéu pontudo. */
export const MAGE_LOOK: HeroLook = {
  tunic: { light: MAGE_PAL.tunic.light, mid: MAGE_PAL.tunic.mid, dark: MAGE_PAL.tunic.dark },
  sleeve: MAGE_PAL.tunic.mid, cuff: MAGE_PAL.cuff,
  robe: drawMageRobe, cloak: drawMageCloak, torso: drawMageTorso, hat: drawWizardHat,
};
export { MAGE_PAL } from "./palette.ts";
