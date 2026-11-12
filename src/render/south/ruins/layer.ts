import type { RuinPiece } from "../../../world/southRuins.ts";

/** A ruína sai em duas camadas (fundo e frente) para o herói passar entre elas; "all" é o registro de arte e a prévia. */
export type RuinLayer = "all" | "back" | "front";
export const isTall = (piece: RuinPiece): boolean =>
  piece.kind === "column" || piece.kind === "wall" || piece.kind === "pillar" || piece.kind === "oven";
/** Peças altas cuja base termina antes de y=-14 ficam ao fundo; o herói passa à frente delas. */
export const ruinLayerOf = (piece: RuinPiece): "back" | "front" =>
  !isTall(piece) || piece.y + piece.h / 2 <= -14 ? "back" : "front";
