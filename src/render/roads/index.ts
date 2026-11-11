/**
 * Estradas, trilhas e marcas de roda (ADR 0034). Só reexporta: a máscara, o perfil (direção e largura), as
 * faixas, a ondulação, o planejador de peças e as três peças de arte, cada assunto no seu arquivo.
 */
export type { NeighbourGround, RoadTileInput } from "./plan.ts";
export type { RoadAxis, RoadEdge, RoadPiece, RoadSide, RoadStonesPiece, RoadSurface, RoadVergePiece, WheelRutPiece } from "./types.ts";
export { ROAD_MARGIN, buildRoadMask, type RoadMask } from "./mask.ts";
export { roadProfile, type RoadProfile } from "./profile.ts";
export { GAUGE_TILES, LANE_TILES, rutPositions } from "./lanes.ts";
export { rutShift, rutStrength } from "./wobble.ts";
export { edgeFor, planRoadTile } from "./plan.ts";
export { ROAD_PALETTE, type RoadPalette } from "./surface.ts";
export { drawWheelRut } from "./wheelRut.ts";
export { drawRoadStones } from "./roadStones.ts";
export { drawRoadVerge } from "./roadVerge.ts";
export { ROAD_SPRITE_LIMIT, VARIATION_LEVELS, clearRoadSprites, quantizeVariation, roadSprite, roadSpriteCount, roadSpriteKeys } from "./sprites.ts";
