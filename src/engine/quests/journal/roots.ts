import { NPCS } from "../../../world/npcs.ts";
import { ROOTS_REWARD_COINS, type RootsQuestState } from "../center/roots/index.ts";
import type { JournalEntry, JournalPlace } from "./types.ts";

const aela = NPCS.find(npc => npc.id === "aela")!;
const AELA: JournalPlace = { x: aela.x, y: aela.y, label: "Aela, na clareira da vila" };

/**
 * "A Raiz Velha" (ADR 0104), a segunda missão de Aela. `clearingDone`: já recebeu a recompensa da clareira (antes disso a missão só aparece como "para começar", dizendo o que falta).
 * `dungeon`: a entrada da Masmorra das Raízes mais perto do herói, se se sabe, para o guia.
 */
export function rootsEntry(state: RootsQuestState, clearingDone: boolean, dungeon?: { readonly x: number; readonly y: number }): JournalEntry {
  const hunting = state.accepted && !state.bossDown, reporting = state.bossDown && !state.reported;
  const cave: JournalPlace | undefined = dungeon ? { x: dungeon.x, y: dungeon.y, label: "a Masmorra das Raízes mais perto" } : undefined;
  const offering = !state.accepted && clearingDone;
  return {
    id: "roots",
    title: "A Raiz Velha",
    giver: "Aela · Vila da Travessia",
    summary: "As raízes de um espírito antigo, o Ent Ancião, crescem sob a clareira. Aela pede que você desça a uma Masmorra das Raízes (gruta de pedra verde), vença o Ent no quinto andar e volte a ela.",
    status: state.reported ? "completed" : state.accepted ? "active" : "available",
    steps: [
      { text: clearingDone ? "Fale com Aela (tecla E perto dela) para ouvir da Raiz Velha e aceitar a missão." : "Termine antes a missão \"Proteja a clareira\": só depois Aela conta da Raiz Velha.",
        short: clearingDone ? "Fale com a Aela" : "Termine a missão da clareira", state: state.accepted ? "done" : "current", ...(offering ? { place: AELA } : {}) },
      { text: "Entre numa Masmorra das Raízes (a gruta de pedra verde), desça os cinco andares (a escada fica no fundo de cada um) e derrote o Ent Ancião no Coração da Gruta.",
        short: "Vença o Ent Ancião (5º andar)", state: state.bossDown ? "done" : hunting ? "current" : "todo", ...(hunting && cave ? { place: cave } : {}) },
      { text: `Volte a falar com Aela para receber ${ROOTS_REWARD_COINS} Terrania Gold.`,
        short: "Volte a falar com a Aela", state: state.reported ? "done" : reporting ? "current" : "todo", ...(reporting ? { place: AELA } : {}) },
    ],
    percent: state.reported ? 100 : state.bossDown ? 80 : state.accepted ? 30 : 0,
    reward: `${ROOTS_REWARD_COINS} Terrania Gold`,
  };
}
