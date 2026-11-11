import type { RoadSurface } from "./types.ts";

/** Cores de um material de estrada: o fundo do sulco, o leito batido, o lábio claro e o escuro e as pedras. */
export interface RoadPalette {
  readonly groove: string;
  readonly bed: string;
  readonly lip: string;
  readonly lipShade: string;
  readonly stoneDark: string;
  readonly stoneLight: string;
  readonly dust: string;
}

/** Terra batida (estrada comum) e areia compactada (estrada do deserto), em torno dos tons do chão de cada uma. */
export const ROAD_PALETTE: Readonly<Record<RoadSurface, RoadPalette>> = {
  earth: { groove: "#3c2c1a", bed: "#c9b68c", lip: "#e6d7b0", lipShade: "#5e4a32", stoneDark: "#9c8963", stoneLight: "#d9cba6", dust: "#8a7452" },
  sand: { groove: "#7c5c30", bed: "#e8d29c", lip: "#f4e4b4", lipShade: "#8c6c3c", stoneDark: "#c2ad82", stoneLight: "#efe0b8", dust: "#b9965c" },
};

/** Contorno e reflexo compartilhados com o resto da arte (contrato de arte procedural). */
export const ROAD_OUTLINE = "#142a2a";
export const ROAD_GLINT = "#fff6dc";

/** Variação 0..1 sempre válida, e um sorteio estável por índice a partir dela. */
export const clampVariation = (value: number): number => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
