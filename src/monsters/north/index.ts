import type { CreatureDefinition } from "../types.ts";
import { borealYeti } from "./boreal-yeti.ts";
import { glacialWolf } from "./glacial-wolf.ts";
import { frostSpirit } from "./frost-spirit.ts";
import { tundraMammoth } from "./tundra-mammoth.ts";
import { frostBanshee } from "./frost-banshee.ts";
import { runicPolarBear } from "./runic-polar-bear.ts";

/** Região Norte: apenas agrega fichas, sem duplicar IA e render. */
export const NORTH_MONSTERS = {
  "boreal-yeti": borealYeti,
  "glacial-wolf": glacialWolf,
  "frost-spirit": frostSpirit,
  "tundra-mammoth": tundraMammoth,
  "frost-banshee": frostBanshee,
  "runic-polar-bear": runicPolarBear,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
