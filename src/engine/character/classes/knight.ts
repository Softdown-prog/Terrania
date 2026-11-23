import type { HeroClassSheet } from "./sheet.ts";

/** O Cavaleiro: espada de perto, sem mana. */
export const KNIGHT: HeroClassSheet = { id: "knight", name: "Cavaleiro", playable: true, usesMana: false, maxMana: () => 0, manaPerSecond: () => 0 };
