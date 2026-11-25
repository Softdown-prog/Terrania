import { MAGE_STARTING_GEAR, type GearState } from "../../../engine/character/Equipment.ts";
import type { HeroLook } from "../look.ts";
import { drawMageCloak } from "./cloak.ts";
import { MAGE_PAL } from "./palette.ts";
import { drawWizardHat } from "./hat.ts";
import { drawMageRobe } from "./robe.ts";
import { drawMageTorso } from "./torso.ts";
import { APPRENTICE_LEGWEAR, type LegWear } from "./gear/legwear.ts";

const none = (): void => undefined;

/** A aparência do herói Mago (ADR 0067) com o conjunto do Aprendiz inteiro: túnica azul-violeta, manto escuro, chapéu pontudo. */
export const MAGE_LOOK: HeroLook = {
  tunic: { light: MAGE_PAL.tunic.light, mid: MAGE_PAL.tunic.mid, dark: MAGE_PAL.tunic.dark },
  sleeve: MAGE_PAL.tunic.mid, cuff: MAGE_PAL.cuff,
  robe: drawMageRobe, cloak: drawMageCloak, torso: drawMageTorso, hat: drawWizardHat,
};
// Sem a túnica, o Mago fica de camisa lisa (sem barra, manto nem detalhes do peito); sem o chapéu, de cabeça descoberta (ADR 0078).
const LOOKS = [false, true].map(robed => [false, true].map(hatted => ({
  ...MAGE_LOOK,
  robe: robed ? drawMageRobe : none, cloak: robed ? drawMageCloak : none, torso: robed ? drawMageTorso : none, hat: hatted ? drawWizardHat : none,
})));

/** O que o Mago veste, pronto para o desenho. Sem registro de equipamento (`undefined`), vale o conjunto do Aprendiz inteiro. */
export interface MageWear {
  readonly look: HeroLook;
  readonly legwear: LegWear;
  readonly book: boolean;
  readonly ring: boolean;
  readonly pendant: boolean;
}
export function mageWear(gear: GearState | undefined): MageWear {
  const worn = gear ?? MAGE_STARTING_GEAR;
  const look = LOOKS[worn.chest === "apprentice-robe" ? 1 : 0]![worn.head === "apprentice-hat" ? 1 : 0]!;
  return {
    look,
    legwear: {
      pants: worn.legs === "apprentice-trousers" ? APPRENTICE_LEGWEAR.pants : null,
      boots: worn.feet === "apprentice-boots" ? APPRENTICE_LEGWEAR.boots : null,
      bootsLight: worn.feet === "apprentice-boots" ? APPRENTICE_LEGWEAR.bootsLight : null,
    },
    book: worn.shield === "apprentice-notebook",
    ring: worn.ring === "brass-ring",
    pendant: worn.neck === "dull-crystal-pendant",
  };
}
export { MAGE_PAL } from "./palette.ts";
