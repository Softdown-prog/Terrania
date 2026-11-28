import type { HeroClassSheet } from "./sheet.ts";

/** O Cavaleiro: espada de perto, sem mana. */
export const KNIGHT: HeroClassSheet = { id: "knight", name: "Cavaleiro", playable: true, weapon: "sword", usesSwords: true, wearsArmor: true, equipmentSlots: ["ring", "head", "neck", "shield", "chest", "weapon", "backpack", "legs", "ammo", "feet"], slotLabels: {}, hpPercent: 100, speedPercent: 100, usesMana: false, maxMana: () => 0, manaPerSecond: () => 0 };
