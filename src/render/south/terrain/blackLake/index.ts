/** Lago negro dos Ermos do Sul (ADR 0039): cores, cobertura da costa, sombreamento e a camada do chunk. Só reexporta. */
export { DEEP, MID, MUD_DRY, MUD_WET, RIM, SHALLOW, lerpColor, waterColor, type Rgb } from "./palette.ts";
export { COAST_WOBBLE, lakeCoverage, wobbledCoverage, type LakeAt } from "./coverage.ts";
export { LAKE_SIZE, LAKE_STEP, shadeBlackLake } from "./shade.ts";
export { blackLakeLayerCanvas } from "./layer.ts";
