import { RUIN_PIECES, type RuinVariant } from "../../../world/southRuins.ts";
import { softShadow } from "../../draw.ts";
import { paintRuinClayFloor } from "./clayFloor.ts";
import { paintRuinColumn } from "./column.ts";
import { paintRuinDrum } from "./drum.ts";
import { paintRuinGround } from "./ground.ts";
import { isTall, ruinLayerOf, type RuinLayer } from "./layer.ts";
import { MUDBRICK, SANDSTONE } from "./palette.ts";
import { paintRuinOven } from "./oven.ts";
import { paintRuinPillar } from "./pillar.ts";
import { paintRuinPot } from "./pot.ts";
import { paintRuinSteps } from "./steps.ts";
import { paintRuinTowerFloor } from "./towerFloor.ts";
import { paintRuinWall } from "./wall.ts";

/**
 * Pinta uma ruína no ponto de contato (0,0), até ~112 px de cada lado e ~100 px de altura.
 * `layer`: "back" desenha o chão e as peças altas do fundo; "front" desenha as da frente,
 * para o herói passar entre as duas; "all" desenha tudo (registro de arte e prévia).
 * Posição, nome e colisão ficam em `world/southRuins.ts`; aqui se desenham as MESMAS peças (`RUIN_PIECES`).
 */
export function paintSouthRuin(c: CanvasRenderingContext2D, variant: number, layer: RuinLayer = "all"): void {
  const v = (Number.isFinite(variant) ? Math.max(0, Math.min(3, Math.floor(variant))) : 0) as RuinVariant;
  const ramp = v === 3 ? MUDBRICK : SANDSTONE;
  const pieces = RUIN_PIECES[v].map((piece, idx) => ({ piece, idx }));
  const glints: Array<() => void> = [];
  c.save();
  if (layer !== "front") {
    // 1. sombra de contato de toda a pegada, antes de qualquer forma
    softShadow(c, 4, 10, 112, 24, 0.3);
    paintRuinGround(c, v);
    for (const { piece, idx } of pieces) {
      if (piece.kind === "steps") (v === 2 ? paintRuinTowerFloor : v === 3 ? paintRuinClayFloor : paintRuinSteps)(c, piece, v);
      else if (piece.kind === "drum") paintRuinDrum(c, piece, v, idx);
      else if (piece.kind === "pot") paintRuinPot(c, piece, idx);
    }
  }
  const tall = pieces.filter(({ piece }) => isTall(piece) && (layer === "all" || ruinLayerOf(piece) === layer))
    .sort((a, b) => (a.piece.y + a.piece.h / 2) - (b.piece.y + b.piece.h / 2));
  for (const { piece, idx } of tall) {
    if (piece.kind === "wall") paintRuinWall(c, piece, v, idx, ramp, glints);
    else if (piece.kind === "column") paintRuinColumn(c, piece, v, idx, ramp, glints);
    else if (piece.kind === "pillar") paintRuinPillar(c, piece, idx, ramp, glints);
    else paintRuinOven(c, piece, glints);
  }
  // 9. brilho especular por último, do lado da luz
  for (const glint of glints) glint();
  c.restore();
}
