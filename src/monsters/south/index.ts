import type { CreatureDefinition } from "../types.ts";
import { mireHydra } from "./mire-hydra.ts";
import { duneScorpion } from "./dune-scorpion.ts";
import { solarScarab } from "./solar-scarab.ts";
import { rottenMarshEnt } from "./rotten-marsh-ent.ts";
import { poisonScoutToad } from "./poison-scout-toad.ts";
import { carrionSandworm } from "./carrion-sandworm.ts";
import { duneRat } from "./dune-rat.ts";
import { sandGoblin } from "./sand-goblin.ts";
import { desertOrc } from "./desert-orc.ts";
import { clayTroll } from "./clay-troll.ts";
import { duneScout } from "./dune-scout.ts";
import { oasisElf } from "./oasis-elf.ts";
import { mirageImp } from "./mirage-imp.ts";
import { hornedViper } from "./horned-viper.ts";
import { carrionVulture } from "./carrion-vulture.ts";
import { cactusSprout } from "./cactus-sprout.ts";

/** Região Sul: apenas agrega fichas, sem duplicar IA e render. */
export const SOUTH_MONSTERS = {
  "mire-hydra": mireHydra,
  "dune-scorpion": duneScorpion,
  "solar-scarab": solarScarab,
  "rotten-marsh-ent": rottenMarshEnt,
  "poison-scout-toad": poisonScoutToad,
  "carrion-sandworm": carrionSandworm,
  "dune-rat": duneRat,
  "sand-goblin": sandGoblin,
  "desert-orc": desertOrc,
  "clay-troll": clayTroll,
  "dune-scout": duneScout,
  "oasis-elf": oasisElf,
  "mirage-imp": mirageImp,
  "horned-viper": hornedViper,
  "carrion-vulture": carrionVulture,
  "cactus-sprout": cactusSprout,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
