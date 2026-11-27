import type { MountView } from "../../mounts/MountStable.ts";
import { STABLE_MASTER, WILD_HOOFPRINTS, WILD_WARHORSE } from "../../../world/mountLocations.ts";
import { MOUNT_QUESTS } from "../../../world/mountQuests.ts";
import { MOUNTS } from "../../../actors/MountCatalog.ts";
import type { JournalEntry, JournalPlace, JournalStep } from "./types.ts";

const ERON: JournalPlace = { x: STABLE_MASTER.x, y: STABLE_MASTER.y, label: "Eron, no estábulo da vila" };
/** Onde se faz cada etapa da missão (as que não têm lugar fixo, como derrotar slimes, ficam de fora). */
const PLACES: Readonly<Record<string, JournalPlace>> = {
  tracks: { x: WILD_HOOFPRINTS.x, y: WILD_HOOFPRINTS.y, label: "as marcas de cascos" },
  halter: ERON,
  calm: { x: WILD_WARHORSE.x, y: WILD_WARHORSE.y, label: "o garrano" },
  return: ERON,
};
const REWARD = "Cavalo de Batalha e Sela de Couro Simples";
/** As etapas da missão em poucas palavras, para o painel da tela. A de derrotar slimes leva a contagem (ver `shortFor`). */
const SHORT: Readonly<Record<string, string>> = {
  tracks: "Examine as marcas de cascos (oeste da vila)", slimes: "Derrote 5 slimes", halter: "Fale com Eron: cabresto (3 gel)",
  calm: "Acalme o garrano com a maçã doce", return: "Volte a falar com Eron",
};

/**
 * "O Garrano Fugitivo" (a missão de Eron): antes de começar mostra o que falta para começar; durante, as cinco etapas com a atual explicada (e onde é);
 * depois de conquistado o cavalo, a missão concluída. `level` é o nível do herói (a missão pede 15).
 */
export function warhorseEntry(mounts: MountView, level: number): JournalEntry {
  const definition = MOUNT_QUESTS.warhorse, base = { id: "warhorse", title: definition.title, giver: "Eron · estábulo da vila", reward: REWARD } as const;
  const summary = "Slimes romperam as cercas à noite e o garrano (o cavalo de batalha da guarnição, forte e de pequeno porte) fugiu para o bosque a oeste da vila. Eron quer que você o ache, acalme e traga de volta.";
  if (mounts.owned.includes("warhorse"))
    return { ...base, summary, status: "completed", percent: 100, steps: definition.steps.map(step => ({ text: step.hint, state: "done" as const })) };
  const quest = mounts.quest?.id === "warhorse" ? mounts.quest : null;
  if (!quest) {
    const needs = [
      { done: level >= MOUNTS.warhorse.level, text: `Chegar ao nível ${MOUNTS.warhorse.level} (você está no nível ${level}).`, short: `Chegue ao nível ${MOUNTS.warhorse.level}` },
      { done: mounts.stableTier >= 1, text: "Construir o cercado do estábulo com Eron (Montarias, na conversa com ele).", short: "Construa o estábulo com Eron" },
      { done: mounts.ridingTier >= 1, text: "Treinar Cavalaria I com Eron.", short: "Treine Cavalaria I com Eron" },
    ];
    const next = needs.findIndex(need => !need.done), ready = next === -1;
    const steps: JournalStep[] = [
      ...needs.map((need, i) => ({ text: need.text, short: need.short, state: need.done ? "done" as const : i === next ? "current" as const : "todo" as const, ...(i === next ? { place: ERON } : {}) })),
      { text: "Conversar com Eron e pedir a missão do garrano (botão Começar missão do garrano).", short: "Peça a missão a Eron", state: ready ? "current" : "todo", ...(ready ? { place: ERON } : {}) },
    ];
    return { ...base, summary, status: "available", steps, percent: Math.round(needs.filter(need => need.done).length / 4 * 100) };
  }
  const steps: JournalStep[] = definition.steps.map((step, i) => {
    const state = i < quest.step ? "done" as const : i === quest.step ? "current" as const : "todo" as const;
    const place = state === "current" ? PLACES[step.id] : undefined;
    const short = step.id === "slimes" && state === "current" ? /\(\d+\/\d+\)/.exec(mounts.questHint)?.[0] : undefined;
    return { text: state === "current" ? mounts.questHint : step.hint, short: short ? `${SHORT.slimes} ${short}` : SHORT[step.id]!, state, ...(place ? { place } : {}) };
  });
  return { ...base, summary, status: "active", steps, percent: Math.round(quest.step / definition.steps.length * 100) };
}
