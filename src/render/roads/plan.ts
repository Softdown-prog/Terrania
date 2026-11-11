import { hash2 } from "../../world/random.ts";
import { rutPositions } from "./lanes.ts";
import type { RoadProfile } from "./profile.ts";
import type { RoadEdge, RoadPiece, RoadSide, RoadSurface } from "./types.ts";
import { rutShift, rutStrength } from "./wobble.ts";

/** Chão ao redor de um tile de estrada, nos quatro lados (N, L, S, O). */
export type NeighbourGround = "grass" | "forest" | "path" | "sand" | "water";

export interface RoadTileInput {
  readonly profile: RoadProfile;
  /** Posição global do tile. */
  readonly tx: number;
  readonly ty: number;
  readonly seed: number;
  readonly neighbours: readonly NeighbourGround[];
  /** O entorno é mais areia que capim: o leito é de areia compactada. */
  readonly sandy: boolean;
}

/** Margem lateral (fração do tile) para a marca de roda ficar inteira dentro do tile. */
const RUT_EDGE = 0.07;

/** Qual transição o vizinho pede: capim para grama e mata, areia solta para areia; nenhuma para água e estrada. */
export function edgeFor(ground: NeighbourGround | undefined): RoadEdge | null {
  if (ground === "grass" || ground === "forest") return "grass";
  if (ground === "sand") return "sand";
  return null;
}

/**
 * Peças de um tile de estrada, em ordem de pintura (ADR 0034): marcas de roda que seguem a direção real da
 * estrada, pedras cravadas e a transição em cada lado que margeia outra coisa. Só decide o que e onde.
 */
export function planRoadTile(input: RoadTileInput): RoadPiece[] {
  const { profile, tx, ty, seed, neighbours, sandy } = input;
  const surface: RoadSurface = sandy ? "sand" : "earth";
  const h = (k: number): number => hash2(tx * 13 + k * 7, ty * 11 + k * 3, seed + 1700 + k);
  const pieces: RoadPiece[] = [];

  if (profile.axis === "vertical" || profile.axis === "horizontal") {
    const vertical = profile.axis === "vertical";
    // Posição do tile ao longo da estrada e do eixo transversal, em tiles do mundo.
    const along0 = vertical ? ty : tx;
    const acrossCenter = (vertical ? tx : ty) + 0.5 - profile.offsetTiles;
    rutPositions(profile.widthTiles).forEach((position, index) => {
      const local = 0.5 + position - profile.offsetTiles;
      if (local <= RUT_EDGE || local >= 1 - RUT_EDGE) return;
      const lateral = acrossCenter + position;
      const fadeA = rutStrength(along0, lateral, seed), fadeB = rutStrength(along0 + 1, lateral, seed);
      if (fadeA < 0.02 && fadeB < 0.02) return;
      pieces.push({ kind: "rut", surface, axis: vertical ? "y" : "x", across: local * 32,
        shiftA: rutShift(along0, lateral, seed), shiftB: rutShift(along0 + 1, lateral, seed),
        fadeA, fadeB, variation: h(20 + index) });
    });
  }
  // Pedras: nem todo tile tem, e quando tem são uma a três.
  if (h(40) > 0.5) {
    const count = 1 + Math.floor(h(41) * 2.99);
    for (let i = 0; i < count; i++)
      pieces.push({ kind: "stones", surface, x: 3 + h(50 + i) * 26, y: 4 + h(60 + i) * 24, variation: h(70 + i) });
  }
  neighbours.forEach((ground, side) => {
    const edge = edgeFor(ground);
    if (edge) pieces.push({ kind: "verge", side: side as RoadSide, edge, variation: h(80 + side) });
  });
  return pieces;
}
