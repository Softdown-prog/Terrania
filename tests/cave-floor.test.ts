import test from "node:test";
import assert from "node:assert/strict";
import { CaveFloor, CAVE_EXIT, CAVE_HEIGHT, CAVE_WIDTH } from "../src/world/caveFloor.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";

/**
 * A planta do andar mora em `world/caveFloor.ts` (ADR 0016/0018). Mover o código não pode mudar
 * nenhum mapa: estas impressões digitais (FNV-1a das células) foram tiradas ANTES da mudança,
 * de duas cavernas de cada um dos seis temas.
 */
const SEED = 842136;
const fnv = (cells: Uint8Array): string => {
  let h = 2166136261;
  for (const value of cells) h = Math.imul(h ^ value, 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
};
const BASELINE: ReadonlyArray<readonly [number, number, string, string]> = [
  [0, 125, "desert", "8e105d7d"], [4, 125, "desert", "dcdfc89a"],
  [0, -125, "glacial", "15d22ce1"], [5, -125, "glacial", "2ff1ad62"],
  [127, 0, "coastal", "d4d14945"], [129, 0, "coastal", "57cea9d5"],
  [-124, 0, "basalt", "82c7f924"], [-121, 0, "basalt", "857b2760"],
  [125, 125, "marsh", "86efa20f"], [126, 125, "marsh", "7da5ebc4"],
  [4, 3, "verdant", "f126c2ef"], [7, 3, "verdant", "77c6fd54"],
];

test("andar de caverna: o mapa de cada tema é idêntico ao de antes da mudança de arquivo", () => {
  for (const [cx, cy, theme, hash] of BASELINE) {
    const entrance = caveEntranceInCell(cx, cy, SEED);
    assert.ok(entrance, `caverna ${cx},${cy}`);
    assert.equal(entrance.theme, theme);
    const floor = new CaveFloor(entrance);
    assert.equal(fnv(floor.cells), hash, `${theme} ${cx},${cy}: o mapa mudou`);
    assert.equal(floor.cells.length, CAVE_WIDTH * CAVE_HEIGHT);
    assert.equal(floor.at(CAVE_EXIT.x, CAVE_EXIT.y), 1, "a saída é chão");
  }
});
