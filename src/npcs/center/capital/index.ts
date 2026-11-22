import type { Npc, NpcAppearance } from "../../types.ts";
import { BANKER_ID, bankerDialogue, bankerLook, bankerNpc } from "./banker.ts";
import { INNKEEPER_ID, innkeeperDialogue, innkeeperLook, innkeeperNpc } from "./innkeeper.ts";
import { PRIESTESS_ID, priestessDialogue, priestessLook, priestessNpc } from "./priestess.ts";

/** Os moradores da capital dos povos humanos (ADR 0062, 0063 e 0064). Só quem tem uma função de jogo; a lista cresce com os edifícios. */
export const CAPITAL_NPCS: readonly Npc[] = [innkeeperNpc, bankerNpc, priestessNpc];
export const CAPITAL_NPC_LOOKS: Readonly<Record<string, NpcAppearance>> = { [INNKEEPER_ID]: innkeeperLook, [BANKER_ID]: bankerLook, [PRIESTESS_ID]: priestessLook };
export const CAPITAL_NPC_DIALOGUES: Readonly<Record<string, readonly string[]>> = {
  [INNKEEPER_ID]: innkeeperDialogue, [BANKER_ID]: bankerDialogue, [PRIESTESS_ID]: priestessDialogue,
};
export { BANKER_ID, INNKEEPER_ID, PRIESTESS_ID };
