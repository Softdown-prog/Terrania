/**
 * Contratos do desenho de estradas (ADR 0034). Só tipos: a regra está nos arquivos vizinhos e a arte nas peças.
 */

/** Material do leito: terra batida (estrada comum) ou areia compactada (estrada que cruza o deserto). */
export type RoadSurface = "earth" | "sand";

/** Direção em que a estrada corre neste tile, ou `junction`/`patch` quando não há uma direção clara. */
export type RoadAxis = "horizontal" | "vertical" | "junction" | "patch";

/** Lados de um tile, na ordem N, L, S, O (a mesma de `DIRS` do pintor de terreno). */
export type RoadSide = 0 | 1 | 2 | 3;

/** Com o que a estrada faz fronteira num lado: capim (grama e mata) ou areia solta. */
export type RoadEdge = "grass" | "sand";

/** Marca de roda que cruza o tile, com a mesma posição lateral e o mesmo fio de sombra dos tiles vizinhos. */
export interface WheelRutPiece {
  readonly kind: "rut";
  readonly surface: RoadSurface;
  /** `x` corre na horizontal (estrada horizontal), `y` na vertical. */
  readonly axis: "x" | "y";
  /** Posição da marca no sentido transversal, em pixels do tile (0 a 32). */
  readonly across: number;
  /** Desvio lateral (px) na entrada e na saída do tile; o mesmo valor que o vizinho usa no seu lado. */
  readonly shiftA: number;
  readonly shiftB: number;
  /** Intensidade (0 a 1) na entrada e na saída: a marca some e volta aos poucos, sem corte no limite do tile. */
  readonly fadeA: number;
  readonly fadeB: number;
  readonly variation: number;
}

/** Pedras e cascalho cravados no leito. */
export interface RoadStonesPiece {
  readonly kind: "stones";
  readonly surface: RoadSurface;
  /** Posição dentro do tile, em pixels. */
  readonly x: number;
  readonly y: number;
  readonly variation: number;
}

/** Transição da estrada para o que a margeia, num dos quatro lados do tile. */
export interface RoadVergePiece {
  readonly kind: "verge";
  readonly side: RoadSide;
  readonly edge: RoadEdge;
  readonly variation: number;
}

export type RoadPiece = WheelRutPiece | RoadStonesPiece | RoadVergePiece;
