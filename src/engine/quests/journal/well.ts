import { NPCS } from "../../../world/npcs.ts";
import { WELL_REWARD_COINS, WELL_SAMPLE_MATERIAL, WELL_WITNESSES } from "../south/well/constants.ts";
import { wellQuestStarted } from "../south/well/summary.ts";
import type { WellQuestState } from "../south/well/questState.ts";
import type { JournalEntry, JournalPlace, JournalStep } from "./types.ts";

const at = (id: string, label: string): JournalPlace => { const npc = NPCS.find(n => n.id === id)!; return { x: npc.x, y: npc.y, label }; };
const WITNESS_NAMES: Readonly<Record<string, string>> = { "south-gorrak": "Gorrak", "south-khemet": "Khemet", "south-sylrael": "Sylrael" };

/** "A Água Escura" (Poço Negro, no deserto ao sul): ouvir as três versões, examinar o poço, levar a gosma a Ixtal e contar a Gorrak. */
export function wellEntry(state: WellQuestState): JournalEntry {
  const total = WELL_WITNESSES.length, heard = state.heard.length, allHeard = heard >= total;
  const next = WELL_WITNESSES.find(id => !state.heard.includes(id));
  const done = [allHeard, state.inspected, state.analyzed, state.reported];
  const current = done.findIndex(flag => !flag);
  const texts = [
    `Ouça as três versões do que aconteceu com a água do poço: Gorrak, Khemet e Sylrael (${heard}/${total}).`,
    "Examine a água do poço, na placa do poço (tecla E perto dela).",
    `Leve ${WELL_SAMPLE_MATERIAL} (saque da hidra do brejo) a Ixtal, o Destilador, para ele comparar com a água.`,
    "Conte a Gorrak o que Ixtal descobriu e receba o pagamento.",
  ];
  const shorts = [`Ouça as 3 versões (${heard}/${total})`, "Examine a placa do poço", `Leve ${WELL_SAMPLE_MATERIAL} a Ixtal`, "Conte tudo a Gorrak"];
  const places = [next ? at(next, WITNESS_NAMES[next] ?? "uma testemunha") : undefined, at("south-well-sign", "a placa do poço"), at("south-ixtal", "Ixtal"), at("south-gorrak", "Gorrak")];
  const steps: JournalStep[] = texts.map((text, i) => ({ text, short: shorts[i]!, state: done[i] ? "done" : i === current ? "current" : "todo", ...(i === current && places[i] ? { place: places[i]! } : {}) }));
  const percents = [Math.round(heard / total * 50), 50, 65, 90], started = wellQuestStarted(state);
  return {
    id: "well", title: "A Água Escura", giver: "Gorrak · Poço Negro (deserto ao sul)",
    summary: "A água do Poço Negro ficou escura e ninguém concorda com o motivo. Gorrak quer saber a verdade: converse com as testemunhas, examine o poço e peça a Ixtal que analise.",
    status: state.reported ? "completed" : started ? "active" : "available", steps,
    percent: state.reported ? 100 : percents[Math.max(0, current)]!,
    reward: `${WELL_REWARD_COINS} Terrania Gold`,
  };
}
