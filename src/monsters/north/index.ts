import type { CreatureDefinition } from "../types.ts";
import { borealYeti } from "./yetis/boreal-yeti.ts";
import { glacialWolf } from "./wolves/glacial-wolf.ts";
import { frostSpirit } from "./spirits/frost-spirit.ts";
import { tundraMammoth } from "./mammoths/tundra-mammoth.ts";
import { frostBanshee } from "./banshees/frost-banshee.ts";
import { runicPolarBear } from "./bears/runic-polar-bear.ts";

/** Região Norte: apenas agrega fichas, sem duplicar IA e render. */
export const NORTH_MONSTERS = {
  "boreal-yeti": borealYeti,
  "glacial-wolf": glacialWolf,
  "frost-spirit": frostSpirit,
  "tundra-mammoth": tundraMammoth,
  "frost-banshee": frostBanshee,
  "runic-polar-bear": runicPolarBear,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
