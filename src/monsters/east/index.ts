import type { CreatureDefinition } from "../types.ts";
import { coralCrab } from "./coral-crab.ts";
import { stormSerpent } from "./storm-serpent.ts";
import { abyssalOctopus } from "./abyssal-octopus.ts";
import { tideHunterTriton } from "./tide-hunter-triton.ts";

/** Região Leste: apenas agrega fichas, sem duplicar IA e render. */
export const EAST_MONSTERS = {
  "coral-crab": coralCrab,
  "storm-serpent": stormSerpent,
  "abyssal-octopus": abyssalOctopus,
  "tide-hunter-triton": tideHunterTriton,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
