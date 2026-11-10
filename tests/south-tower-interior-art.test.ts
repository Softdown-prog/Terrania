import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { caveEntranceInCell, type CaveEntrance } from "../src/world/caves.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { towerEntrance } from "../src/world/towers/entrance.ts";
import { TOWERS } from "../src/world/towers/index.ts";
import { getSouthTowerForCell } from "../src/world/towers/placement.ts";
import { drawCaveView } from "../src/render/cave.ts";
import { TOWER_INTERIOR_STYLES } from "../src/render/south/towers/interior/index.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";

/**
 * Arte do interior das torres (ADR 0021): um estilo por torre, em arquivo próprio, e o pintor de
 * andar de torre só entra quando a entrada é de torre. As peças físicas estão no contrato de arte.
 */
const SEED = 842136;
const HEX = /^#[0-9a-f]{6}$/i;
const towerDoor = (id: string): CaveEntrance => {
  for (let cy = 24; cy < 70; cy++) for (let cx = -10; cx <= 10; cx++) {
    const t = getSouthTowerForCell(cx, cy, SEED);
    if (t && t.tower.id === id) return towerEntrance(t, SEED);
  }
  throw new Error(id);
};
/** Cores (#rrggbb) que o desenho do andar usou, lidas do gravador. */
function paletteOf(entrance: CaveEntrance): Set<string> {
  const recorder = new Recorder();
  withFakeDocument(recorder, () => drawCaveView(recorder.ctx, new CaveRoom(entrance, 100, 100), 0, 0, 640, 360, 0));
  return (recorder as unknown as { palette: Set<string> }).palette;
}

test("cada torre tem o seu arquivo de estilo de interior, com o id dela", () => {
  const files = readdirSync(new URL("../src/render/south/towers/interior/", import.meta.url))
    .filter(f => f.endsWith(".ts") && !["index.ts", "types.ts", "floor.ts", "wallFace.ts", "window.ts", "sconce.ts"].includes(f))
    .map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, TOWERS.map(t => t.id).sort(), "um arquivo de estilo por torre, nomeado pelo id");
  assert.deepEqual(Object.keys(TOWER_INTERIOR_STYLES).sort(), TOWERS.map(t => t.id).sort());
  for (const tower of TOWERS) assert.equal(TOWER_INTERIOR_STYLES[tower.id].id, tower.id);
});

test("os estilos são cores válidas, probabilidades de 0 a 1 e diferentes entre as torres", () => {
  const styles = Object.values(TOWER_INTERIOR_STYLES);
  for (const style of styles) {
    for (const color of [...Object.values(style.floor), ...Object.values(style.brick), style.glow, style.flame])
      assert.match(color, HEX, style.id);
    for (const chance of [style.sconces, style.windows]) assert.ok(chance >= 0 && chance <= 1, style.id);
  }
  for (const key of ["glow", "flame"] as const)
    assert.equal(new Set(styles.map(s => s[key])).size, styles.length, key + " é diferente em cada torre");
  assert.equal(new Set(styles.map(s => s.floor.base)).size, styles.length, "pisos diferentes");
  assert.equal(new Set(styles.map(s => s.brick.base)).size, styles.length, "tijolos diferentes");
  assert.ok(TOWER_INTERIOR_STYLES["sol-negro"].sconces > TOWER_INTERIOR_STYLES["vigia-caida"].sconces,
    "a torre rara tem mais braseiros que a comum");
});

test("o andar de torre usa as cores do estilo da sua torre; a caverna comum não", () => {
  for (const tower of TOWERS) {
    const door = towerDoor(tower.id), style = TOWER_INTERIOR_STYLES[tower.id];
    const palette = paletteOf(door);
    for (const color of [style.floor.grout, style.brick.mortar, style.glow])
      assert.ok(palette.has(color.toLowerCase()), `${tower.id}: faltou ${color} no desenho`);
    assert.deepEqual([...paletteOf(door)].sort(), [...palette].sort(), "determinístico");
  }
  const cave = caveEntranceInCell(1, 125, SEED) ?? caveEntranceInCell(0, 125, SEED);
  assert.ok(cave);
  const cavePalette = paletteOf(cave);
  for (const style of Object.values(TOWER_INTERIOR_STYLES))
    assert.equal(cavePalette.has(style.floor.grout.toLowerCase()), false, "a caverna não usa o rejunte da torre");
});
