import type { CreatureDefinition } from "../types.ts";
import { mireHydra } from "./hydras/mire-hydra.ts";
import { duneScorpion } from "./scorpions/dune-scorpion.ts";
import { solarScarab } from "./beetles/solar-scarab.ts";
import { rottenMarshEnt } from "./ents/rotten-marsh-ent.ts";
import { poisonScoutToad } from "./toads/poison-scout-toad.ts";
import { carrionSandworm } from "./worms/carrion-sandworm.ts";
import { sandBeetle } from "./beetles/sand-beetle.ts";
import { duneRat } from "./rats/dune-rat.ts";
import { sandGoblin } from "./goblins/sand-goblin.ts";
import { desertOrc } from "./orcs/desert-orc.ts";
import { clayTroll } from "./trolls/clay-troll.ts";
import { duneScout } from "./smallfolk/dune-scout.ts";
import { oasisElf } from "./elves/oasis-elf.ts";
import { mirageImp } from "./demons/mirage-imp.ts";
import { hornedViper } from "./snakes/horned-viper.ts";
import { carrionVulture } from "./vultures/carrion-vulture.ts";
import { cactusSprout } from "./plants/cactus-sprout.ts";

/** Região Sul: apenas agrega fichas, sem duplicar IA e render. */
export const SOUTH_MONSTERS = {
  "mire-hydra": mireHydra,
  "dune-scorpion": duneScorpion,
  "solar-scarab": solarScarab,
  "rotten-marsh-ent": rottenMarshEnt,
  "poison-scout-toad": poisonScoutToad,
  "carrion-sandworm": carrionSandworm,
  "sand-beetle": sandBeetle,
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
