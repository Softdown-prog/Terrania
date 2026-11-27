import type { Npc, NpcAppearance } from "../../types.ts";
import { BANKER_ID, bankerDialogue, bankerLook, bankerNpc } from "./banker.ts";
import { INNKEEPER_ID, innkeeperDialogue, innkeeperLook, innkeeperNpc } from "./innkeeper.ts";
import { MAGE_MASTER_ID, mageMasterDialogue, mageMasterLook, mageMasterNpc } from "./mageMaster.ts";
import { PRIESTESS_ID, priestessDialogue, priestessLook, priestessNpc } from "./priestess.ts";
import { CAPITAL_CITIZENS, CAPITAL_CITIZEN_DIALOGUES, CAPITAL_CITIZEN_LOOKS, CITIZEN_PATROLS } from "./citizens/index.ts";

/** Os moradores da capital dos povos humanos (ADR 0062, 0063, 0064 e 0074): quem tem uma função de jogo, mais os moradores que andam pelas ruas (ADR 0108). */
export const CAPITAL_NPCS: readonly Npc[] = [innkeeperNpc, bankerNpc, priestessNpc, mageMasterNpc, ...CAPITAL_CITIZENS];
export const CAPITAL_NPC_LOOKS: Readonly<Record<string, NpcAppearance>> = { [INNKEEPER_ID]: innkeeperLook, [BANKER_ID]: bankerLook, [PRIESTESS_ID]: priestessLook, [MAGE_MASTER_ID]: mageMasterLook, ...CAPITAL_CITIZEN_LOOKS };
export const CAPITAL_NPC_DIALOGUES: Readonly<Record<string, readonly string[]>> = {
  [INNKEEPER_ID]: innkeeperDialogue, [BANKER_ID]: bankerDialogue, [PRIESTESS_ID]: priestessDialogue, [MAGE_MASTER_ID]: mageMasterDialogue, ...CAPITAL_CITIZEN_DIALOGUES,
};
export { BANKER_ID, CAPITAL_CITIZENS, CITIZEN_PATROLS, INNKEEPER_ID, MAGE_MASTER_ID, PRIESTESS_ID };
