import { MAGE_STARTING_GEAR, type GearState } from "../../../engine/character/Equipment.ts";
import type { HeroLook } from "../look.ts";
import { drawMageCloak } from "./cloak.ts";
import { drawWizardHat } from "./hat.ts";
import { drawMageHead } from "./head.ts";
import { drawMageRobe } from "./robe.ts";
import { drawMageTorso } from "./torso.ts";
import { legwearOf, type LegWear } from "./gear/legwear.ts";
import { APPRENTICE_THEME, themeOfPiece, type MageSetTheme } from "./sets/index.ts";

const none = (): void => undefined;

/** A aparência de um Mago de túnica e chapéu do conjunto `robe` e `hat` (cada um pode faltar). Sem a túnica, ele fica de camisa lisa; sem o chapéu, de cabeça descoberta (ADR 0078). */
function buildLook(robe: MageSetTheme | null, hat: MageSetTheme | null): HeroLook {
  const base = robe ?? APPRENTICE_THEME;
  return {
    tunic: { light: base.tunic.light, mid: base.tunic.mid, dark: base.tunic.dark },
    sleeve: base.tunic.mid, cuff: base.cuff, head: drawMageHead,
    robe: robe ? (ctx, c) => drawMageRobe(ctx, c, robe) : none,
    cloak: robe ? (ctx, c) => drawMageCloak(ctx, c, robe) : none,
    torso: robe ? (ctx, c) => drawMageTorso(ctx, c, robe) : none,
    hat: hat ? (ctx, c) => drawWizardHat(ctx, c, hat) : none,
  };
}

/** A aparência do herói Mago (ADR 0067) com o conjunto do Aprendiz inteiro: túnica azul-violeta, manto escuro, chapéu pontudo. */
export const MAGE_LOOK: HeroLook = buildLook(APPRENTICE_THEME, APPRENTICE_THEME);

// As aparências são reaproveitadas entre quadros: uma por par (conjunto da túnica, conjunto do chapéu), criada na primeira vez que aparece (ADR 0080).
const looks = new Map<string, HeroLook>();
function lookFor(robe: MageSetTheme | null, hat: MageSetTheme | null): HeroLook {
  const key = (robe?.id ?? "-") + "|" + (hat?.id ?? "-");
  let look = looks.get(key);
  if (look === undefined) { look = buildLook(robe, hat); looks.set(key, look); }
  return look;
}

/** O que o Mago veste, pronto para o desenho: a ficha de cor de cada peça vestida (`null` se a peça falta). Sem registro de equipamento (`undefined`), vale o conjunto do Aprendiz inteiro. */
export interface MageWear {
  readonly look: HeroLook;
  readonly legwear: LegWear;
  readonly book: MageSetTheme | null;
  readonly ring: MageSetTheme | null;
  readonly pendant: MageSetTheme | null;
}
const NO_LEGWEAR: LegWear = { pants: null, boots: null, bootsLight: null };
export function mageWear(gear: GearState | undefined): MageWear {
  const worn = gear ?? MAGE_STARTING_GEAR;
  const pants = themeOfPiece(worn.legs), boots = themeOfPiece(worn.feet);
  return {
    look: lookFor(themeOfPiece(worn.chest), themeOfPiece(worn.head)),
    legwear: pants === null && boots === null ? NO_LEGWEAR : {
      pants: pants ? legwearOf(pants).pants : null,
      boots: boots ? legwearOf(boots).boots : null,
      bootsLight: boots ? legwearOf(boots).bootsLight : null,
    },
    book: themeOfPiece(worn.shield),
    ring: themeOfPiece(worn.ring),
    pendant: themeOfPiece(worn.neck),
  };
}
export { MAGE_PAL } from "./palette.ts";
