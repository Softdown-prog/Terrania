import type { Ramp } from "../../kit/index.ts";

/** Cores dos edifícios da capital (ADR 0058): a cor de cada guilda, o vidro das janelas e a pedra do terraço do quartel. */
export const CRIMSON: Ramp = { light: "#dc6c62", base: "#a8322f", dark: "#681a1e" };
export const ARCANE: Ramp = { light: "#cdaaf5", base: "#8a5ad0", dark: "#472a82" };
/** Ardósia arroxeada do telhado da Academia Arcana. */
export const SLATE_ARCANE: Ramp = { light: "#9088ba", base: "#625b93", dark: "#363162" };
export const GLASS: Ramp = { light: "#c4e2f3", base: "#5f93bf", dark: "#1f3c5c" };
export const GLASS_ARCANE: Ramp = { light: "#f3defe", base: "#b47cf2", dark: "#4a2a86" };
export const GLASS_WARM: Ramp = { light: "#fff0bd", base: "#f0b45c", dark: "#8a5222" };
export const TERRACE: Ramp = { light: "#bdb8ab", base: "#969186", dark: "#605c55" };
export const STRAW: Ramp = { light: "#ecd68a", base: "#c9a850", dark: "#8a6c2a" };
/** O escuro de dentro de uma porta ou de uma fresta. */
export const HOLLOW = "#0d1118";

/** Cores da Alameda das Guildas (ADR 0060): a guilda dos arqueiros (verde-floresta), as telhas de madeira, de barro e de cobre. */
export const FOREST: Ramp = { light: "#8dc26a", base: "#4f8a3e", dark: "#2b5a2a" };
export const SHINGLE: Ramp = { light: "#b08a5a", base: "#7d5a38", dark: "#4a3320" };
export const TERRACOTTA: Ramp = { light: "#e08a62", base: "#b4502f", dark: "#6e2c1a" };
export const COPPER: Ramp = { light: "#9fe0cc", base: "#4fa896", dark: "#2a6460" };
/** Mármore claro do templo, o reboco das casas de madeira aparente e o escuro das vigas. */
export const MARBLE: Ramp = { light: "#f6f1e6", base: "#d6cfbd", dark: "#948d7c" };
export const PLASTER: Ramp = { light: "#f3ead2", base: "#dccfae", dark: "#a89b7a" };
export const TIMBER: Ramp = { light: "#7a5436", base: "#553823", dark: "#35221a" };
/** Listras de toldo: vermelho e creme. */
export const AWNING = { red: "#b8322e", redDark: "#7d1f1f", cream: "#f0e6cc" } as const;
