import type { CreatureDefinition } from "../types.ts";
import { basaltGolem } from "./basalt-golem.ts";
import { cliffDraconid } from "./cliff-draconid.ts";
import { summitGriffin } from "./summit-griffin.ts";
import { magmaSalamander } from "./magma-salamander.ts";

/** Região Oeste: apenas agrega fichas, sem duplicar IA e render. */
export const WEST_MONSTERS = {
  "basalt-golem": basaltGolem,
  "cliff-draconid": cliffDraconid,
  "summit-griffin": summitGriffin,
  "magma-salamander": magmaSalamander,
} as const satisfies Readonly<Record<string, CreatureDefinition>>;
