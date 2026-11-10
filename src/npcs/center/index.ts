import type { Npc, NpcAppearance, NpcDialogueState } from "../types.ts";
import { aelaNpc, aelaLook, aelaDialogue } from "./aela.ts";
import { miraNpc, miraLook, miraDialogue } from "./mira.ts";
import { torenNpc, torenLook, torenDialogue } from "./toren.ts";
import { linaNpc, linaLook, linaDialogue } from "./lina.ts";
import { eronNpc, eronDialogue } from "./eron.ts";

/** Preserva ordem das interações e os IDs já usados por quests e HUD. */
export const CENTER_NPCS:readonly Npc[]=[aelaNpc,miraNpc,torenNpc,linaNpc,eronNpc];
/** Eron mantém o fallback visual original, sem visual novo inventado. */
export const CENTER_NPC_LOOKS:Readonly<Record<string,NpcAppearance>>={
  aela:aelaLook,mira:miraLook,toren:torenLook,lina:linaLook,
};
export const CENTER_NPC_DIALOGUES:Readonly<Record<string,(state:NpcDialogueState)=>readonly string[]>>={
  aela:aelaDialogue,mira:miraDialogue,toren:torenDialogue,
  lina:linaDialogue,stablemaster:eronDialogue,
};
