import { aelaQuestProgress } from "../../../world/aelaQuest.ts";
import { NPCS } from "../../../world/npcs.ts";
import { QUEST_REWARD_POTIONS } from "../../character/Inventory.ts";
import type { JournalEntry, JournalPlace } from "./types.ts";

const aela = NPCS.find(npc => npc.id === "aela")!;
const AELA: JournalPlace = { x: aela.x, y: aela.y, label: "Aela, na clareira da vila" };

/** A missão do começo (a clareira da Aela): derrotar 5 slimes na Gruta dos Slimes e voltar a ela para a recompensa. `cave` é a entrada da gruta, se se sabe. */
export function clearingEntry(trainingKills: number, rewardClaimed: boolean, cave?: { readonly x: number; readonly y: number }): JournalEntry {
  const progress = aelaQuestProgress(trainingKills);
  const gruta: JournalPlace | undefined = cave ? { x: cave.x, y: cave.y, label: "a entrada da Gruta dos Slimes" } : undefined;
  const fighting = !progress.completed, claiming = progress.completed && !rewardClaimed;
  return {
    id: "clearing",
    title: "Proteja a clareira",
    giver: "Aela · Vila da Travessia",
    summary: "Slimes estão invadindo a clareira da vila. Aela pede que você os afaste na Gruta dos Slimes, que fica perto da vila, e volte a falar com ela.",
    status: rewardClaimed ? "completed" : "active",
    steps: [
      { text: `Entre na Gruta dos Slimes (a entrada de pedra perto da vila) e derrote ${progress.goal} slimes (${progress.defeated}/${progress.goal}).`,
        short: `Derrote ${progress.goal} slimes na gruta (${progress.defeated}/${progress.goal})`, state: fighting ? "current" : "done", ...(fighting && gruta ? { place: gruta } : {}) },
      { text: `Volte a falar com Aela (tecla E perto dela) para receber ${QUEST_REWARD_POTIONS} poções de cura.`,
        short: "Volte a falar com a Aela", state: rewardClaimed ? "done" : claiming ? "current" : "todo", ...(claiming ? { place: AELA } : {}) },
    ],
    percent: rewardClaimed ? 100 : Math.round(progress.defeated / progress.goal * 80),
    reward: `${QUEST_REWARD_POTIONS} poções de cura`,
  };
}
