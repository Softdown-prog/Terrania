/** Rocha contínua das cavernas (ADR 0051), uma peça por arquivo. Só reexporta. */
export { ROCK_LIGHT, rockHeight, stratum } from "./field.ts";
export { ROCK_PER_TILE, ROCK_STEP, distanceTo, rockShape, type RockShape, type TileOpenness } from "./openness.ts";
export { ROCK_RAMP_STEPS, rockLook, rgbOf, type RockLook } from "./look.ts";
export { AO_REACH, DEPTH_REACH, LIP_WIDTH, SHORE_WIDTH, shadeRock } from "./shade.ts";
export { caveRockCanvas } from "./layer.ts";
