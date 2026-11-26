import type { CreatureDefinition } from "../types.ts";
import { slime } from "./slimes/slime.ts";
import { giantRat } from "./rats/giant-rat.ts";
import { caveBat } from "./bats/cave-bat.ts";
import { rootSpider } from "./spiders/root-spider.ts";

/** Região Centro: apenas agrega fichas, sem duplicar IA e render. */
export const CENTER_MONSTERS = {
  "slime": slime,
  "giant-rat": giantRat,
  "cave-bat": caveBat,
  "root-spider": rootSpider,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
