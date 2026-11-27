import type { Npc, NpcAppearance } from "../../../types.ts";
import { TOME_ID, tomeDialogue, tomeLook, tomeNpc, tomePatrol } from "./tome.ts";
import { CECILIA_ID, ceciliaDialogue, ceciliaLook, ceciliaNpc, ceciliaPatrol } from "./cecilia.ts";
import { RUI_ID, ruiDialogue, ruiLook, ruiNpc, ruiPatrol } from "./rui.ts";
import { MARTA_ID, martaDialogue, martaLook, martaNpc, martaPatrol } from "./marta.ts";
import { BENTO_ID, bentoDialogue, bentoLook, bentoNpc, bentoPatrol } from "./bento.ts";
import { INES_ID, inesDialogue, inesLook, inesNpc, inesPatrol } from "./ines.ts";
import { OLAVO_ID, olavoDialogue, olavoLook, olavoNpc, olavoPatrol } from "./olavo.ts";
import { CLARA_ID, claraDialogue, claraLook, claraNpc, claraPatrol } from "./clara.ts";

/** Os moradores que andam pelas ruas da capital (ADR 0108), um arquivo por morador. Não têm função de jogo: só conversam. */
export const CAPITAL_CITIZENS: readonly Npc[] = [tomeNpc, ceciliaNpc, ruiNpc, martaNpc, bentoNpc, inesNpc, olavoNpc, claraNpc];
export const CAPITAL_CITIZEN_LOOKS: Readonly<Record<string, NpcAppearance>> = { [TOME_ID]: tomeLook, [CECILIA_ID]: ceciliaLook, [RUI_ID]: ruiLook, [MARTA_ID]: martaLook, [BENTO_ID]: bentoLook, [INES_ID]: inesLook, [OLAVO_ID]: olavoLook, [CLARA_ID]: claraLook };
export const CAPITAL_CITIZEN_DIALOGUES: Readonly<Record<string, readonly string[]>> = { [TOME_ID]: tomeDialogue, [CECILIA_ID]: ceciliaDialogue, [RUI_ID]: ruiDialogue, [MARTA_ID]: martaDialogue, [BENTO_ID]: bentoDialogue, [INES_ID]: inesDialogue, [OLAVO_ID]: olavoDialogue, [CLARA_ID]: claraDialogue };
/** A rota de cada morador: quanto anda para cada lado, em tiles, e a fase do passo. */
export const CITIZEN_PATROLS: Readonly<Record<string, { readonly x: number; readonly y: number; readonly phase: number }>> = { [TOME_ID]: tomePatrol, [CECILIA_ID]: ceciliaPatrol, [RUI_ID]: ruiPatrol, [MARTA_ID]: martaPatrol, [BENTO_ID]: bentoPatrol, [INES_ID]: inesPatrol, [OLAVO_ID]: olavoPatrol, [CLARA_ID]: claraPatrol };
