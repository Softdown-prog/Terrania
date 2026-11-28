import type { ToneRamp } from "../look.ts";

/**
 * As cores do corpo do personagem Arqueiro (ADR 0114, `docs/ARQUEIRO.md`): a pele é a mesma dos outros heróis, o cabelo é castanho-avermelhado e curto,
 * os olhos verde-avelã, e o gibão é de couro cru em verde-musgo, com braçais de couro mais escuros.
 */
export const ARCHER_BODY = {
  skin: { light: "#f3d6b2", mid: "#e2bb91", dark: "#b98a64" } satisfies ToneRamp,
  hair: { light: "#a87245", mid: "#74492a", dark: "#42281a" } satisfies ToneRamp,
  eyeWhite: "#f6f1e3", iris: "#6f8a4a", irisDark: "#44602c", pupil: "#16200f", glint: "#ffffff",
  blush: "#d9806a", mouth: "#6b4535", mouthOpen: "#5a2f2a", lash: "#1b1210",
  band: "#a8482a", bandDark: "#6e2c18",
} as const;

/** O couro e o tecido do equipamento do Arqueiro: gibão, braçais, correia, aljava e penas das flechas. */
export const ARCHER_PAL = {
  jerkin: { light: "#7f9358", mid: "#5f7340", dark: "#3d4d28" } satisfies ToneRamp,
  sleeve: "#a98a58", bracer: "#5a4026", bracerDark: "#35261a",
  leather: { light: "#a47a46", mid: "#7a5530", dark: "#4a3220" } satisfies ToneRamp,
  strap: "#4b3322", strapLight: "#8a6540", buckle: "#d6b45a", buckleDark: "#8a7030",
  feather: "#ece6d2", featherDark: "#9a937c", shaft: "#c9b27a", lace: "#e4d3a2",
} as const;
