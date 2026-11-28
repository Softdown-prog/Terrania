import type { HeroClassId } from "./heroClass.ts";
import { ARCHER } from "./archer.ts";
import { DRUID } from "./druid.ts";
import { KNIGHT } from "./knight.ts";
import { MAGE } from "./mage.ts";
import type { HeroClassSheet } from "./sheet.ts";

export const HERO_CLASSES: Readonly<Record<HeroClassId, HeroClassSheet>> = { knight: KNIGHT, mage: MAGE, archer: ARCHER, druid: DRUID };
export const heroClassSheet = (id: HeroClassId): HeroClassSheet => HERO_CLASSES[id];
/** Um jogador novo pode começar com esta vocação? */
export const isHeroClassPlayable = (id: HeroClassId): boolean => Object.hasOwn(HERO_CLASSES, id) && HERO_CLASSES[id].playable;
