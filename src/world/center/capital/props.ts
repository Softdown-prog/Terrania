import { CAPITAL, CAPITAL_TILE, capitalPoint } from "./layout.ts";
import { CAPITAL_TOWERS, TOWER_TILES } from "./towers.ts";

/** O que se desenha na capital: trecho de muralha de frente (muros norte e sul) e de lado (leste e oeste), portão, torre e o monumento da praça. */
export type CapitalPropKind = "wall" | "wall-side" | "gate" | "tower" | "monument";
/** Uma peça de cenário da capital, em pixels do mundo: a base fica no pé da peça. `variant` escolhe a variação do desenho. */
export interface CapitalProp { readonly kind: CapitalPropKind; readonly x: number; readonly y: number; readonly variant: number; readonly id?: string }

/** Tamanho de um trecho de muralha, em tiles, e o desenho de meio trecho (variação 4 a 7) que fecha uma ponta ímpar. */
export const WALL_SEGMENT_TILES = 2;
const HALF_SEGMENT = 4;

/** Posição em pixels de uma coordenada em "bordas" de tile (a borda esquerda do tile lx é lx; a direita é lx + 1). */
const edgeX = (u: number): number => (CAPITAL.centerX + u) * CAPITAL_TILE;
const edgeY = (v: number): number => (CAPITAL.centerY + v) * CAPITAL_TILE;

function makeProps(): readonly CapitalProp[] {
  const props: CapitalProp[] = [];
  const { minX, maxX, minY, maxY, gateHalf } = CAPITAL;
  // Muros norte e sul: trechos de 2 tiles entre as torres. Do lado direito sobra 1 tile, fechado por meio trecho.
  for (const ly of [minY, maxY]) {
    const base = edgeY(ly + 1), tag = ly === minY ? "norte" : "sul";
    const leftStart = minX + TOWER_TILES, leftEnd = -gateHalf - TOWER_TILES;
    for (let a = leftStart, i = 0; a < leftEnd; a += WALL_SEGMENT_TILES, i++)
      props.push({ kind: "wall", x: edgeX(a + 1), y: base, variant: (i + (ly === minY ? 0 : 2)) % 4, id: `muro-${tag}-oeste-${i}` });
    const rightStart = gateHalf + 1 + TOWER_TILES, rightEnd = maxX + 1 - TOWER_TILES;
    let i = 0, a = rightStart;
    for (; a + WALL_SEGMENT_TILES <= rightEnd; a += WALL_SEGMENT_TILES, i++)
      props.push({ kind: "wall", x: edgeX(a + 1), y: base, variant: (i + (ly === minY ? 1 : 3)) % 4, id: `muro-${tag}-leste-${i}` });
    if (a < rightEnd) props.push({ kind: "wall", x: edgeX(a + 0.5), y: base, variant: HALF_SEGMENT + (i % 4), id: `muro-${tag}-leste-${i}` });
    props.push({ kind: "gate", x: capitalPoint(0, ly).x, y: base, variant: 0, id: `portao-${tag}` });
  }
  // Muros oeste e leste: trechos de 2 tiles na vertical, entre as torres dos cantos.
  for (const lx of [minX, maxX]) {
    const tag = lx === minX ? "oeste" : "leste";
    for (let a = minY + TOWER_TILES, i = 0; a < maxY + 1 - TOWER_TILES; a += WALL_SEGMENT_TILES, i++)
      props.push({ kind: "wall-side", x: capitalPoint(lx, 0).x, y: edgeY(a + WALL_SEGMENT_TILES), variant: (i + (lx === minX ? 0 : 1)) % 2, id: `muro-${tag}-${i}` });
  }
  // Torres: a base fica na borda de baixo do bloco de 2 × 2 tiles.
  for (const t of CAPITAL_TOWERS)
    props.push({ kind: "tower", x: edgeX(t.lx + TOWER_TILES / 2), y: edgeY(t.ly + TOWER_TILES), variant: t.kind === "corner" ? 0 : 1, id: t.id });
  // O monumento da Concórdia, no centro da praça: a base fica no centro do tile do meio.
  props.push({ kind: "monument", x: capitalPoint(0, 0).x, y: capitalPoint(0, 0).y, variant: 0, id: "monumento-da-concordia" });
  return props;
}
/** Todas as peças da capital (muralha, portões, torres e monumento), determinísticas e fixas (independentes da semente). */
export const CAPITAL_PROPS: readonly CapitalProp[] = makeProps();
