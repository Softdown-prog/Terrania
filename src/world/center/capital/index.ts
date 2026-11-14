/** Capital dos povos humanos, no centro do mundo (ADR 0055), uma peça por arquivo. Só reexporta. */
export { CAPITAL, CAPITAL_TILE, capitalLocal, capitalPoint, insideCapital } from "./layout.ts";
export { CAPITAL_STREETS, isCapitalStreet, isCapitalWall, type Rect } from "./streets.ts";
export { CAPITAL_DISTRICTS, type CapitalDistrictId } from "./districts.ts";
export { CAPITAL_PLOTS, doorApproach, inPlot, type CapitalPlot, type DoorSide, type PlotKind } from "./plots.ts";
export { capitalGround } from "./ground.ts";
export { capitalSafe, nearCapital } from "./safe.ts";
export { CAPITAL_MONUMENT, capitalBlocks } from "./blocks.ts";
