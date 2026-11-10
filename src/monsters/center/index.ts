import type { CreatureDefinition } from "../types.ts";
import { slime } from "./slimes/slime.ts";

/** Região Centro: apenas agrega fichas, sem duplicar IA e render. */
export const CENTER_MONSTERS = {
  "slime": slime,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
