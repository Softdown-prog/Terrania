import type { MageSetTheme } from "./theme.ts";

/** O conjunto da Brisa (ADR 0080): azul-céu e branco com prata e verde-água, o redemoinho de vento e as penas. */
export const BREEZE_THEME: MageSetTheme = {
  id: "breeze",
  tunic: { light: "#d2f1f7", mid: "#7fcbdc", dark: "#3b86a0" },
  cloak: { light: "#6fb4d0", mid: "#4a8fb0", dark: "#0f2a42" },
  hat: { light: "#c4ebf3", mid: "#6bbcd2", dark: "#2c7792" },
  hatSheen: "#effffd",
  lining: "#8fe0cf", trim: "#e9f5f9", trimD: "#8fb0bf", gem: "#d8fff3", cuff: "#4c9bb2",
  pants: "#2e6f86", boots: "#3a7f98", bootsLight: "#c2eef2",
  motif: "wind",
  book: { cover: { light: "#c4ebf3", mid: "#6fc3d6", dark: "#2c7a92" }, page: "#f7fcff", ribbon: "#6fd1bd" },
  ring: { bezel: "#dbe9f0", band: { light: "#b7cbd6", mid: "#b7cbd6", dark: "#6d8794" }, shine: "#effaff", gem: { light: "#f3fffb", mid: "#7fe0cf", dark: "#2c9588" } },
  pendant: { stone: { light: "#f1fffc", mid: "#8fe0d6", dark: "#3c9ba2" } },
};
