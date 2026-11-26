import type { ToneRamp } from "../../look.ts";

/**
 * As cores do corpo do personagem Mago (docs/MAGO_APARENCIA.md, lote M1): a pele é a mesma do Cavaleiro (decisão da proposta), o cabelo é castanho-escuro,
 * mais frio que o castanho-quente do Cavaleiro, e os olhos são azul-acinzentados (os do Cavaleiro são verde-escuros).
 */
export const MAGE_BODY = {
  skin: { light: "#f3d6b2", mid: "#e2bb91", dark: "#b98a64" } satisfies ToneRamp,
  hair: { light: "#6a4b3c", mid: "#3e2b23", dark: "#231812" } satisfies ToneRamp,
  eyeWhite: "#f6f1e3", iris: "#4d6f8f", irisDark: "#2f4966", pupil: "#141c2a", glint: "#ffffff",
  blush: "#d9806a", mouth: "#6b4535", mouthOpen: "#5a2f2a", lash: "#1b1210",
} as const;
