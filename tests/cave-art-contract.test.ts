import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CaveRoom, CAVE_EXIT, CAVE_HEIGHT, CAVE_WIDTH } from "../src/engine/CaveRoom.ts";
import { drawCaveAtlas, drawCaveView } from "../src/render/cave.ts";
import { CAVE_PALETTE, drawCaveExitStair, drawCaveFormation } from "../src/render/caveDetails.ts";
import type { CaveEntrance, CaveTheme } from "../src/world/caves.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import { ASSETS, FLOORS, NOT_AN_ASSET } from "./helpers/artAssets.ts";

/**
 * This is NOT a visual-beauty score. It tests scene composition and the
 * previously unaudited real cave pieces. Browser screenshots remain required.
 */
const THEMES: readonly CaveTheme[] = [
  "verdant", "glacial", "desert", "coastal", "basalt", "marsh",
];
function entrance(theme: CaveTheme, i: number): CaveEntrance {
  return {
    id: "art-contract:" + theme, theme,
    kind: "stairs", name: "Teste " + theme,
    seed: 842136, tileX: 100 + i, tileY: 200 + i,
    x: 0, y: 0,
  };
}
function record(draw: (ctx: CanvasRenderingContext2D) => void) {
  const recorder = new Recorder();
  withFakeDocument(recorder, () => draw(recorder.ctx));
  return recorder.metrics();
}

test("arte de cavernas: formações e escadas estão realmente registradas nos seis temas", () => {
  for (const theme of THEMES) {
    const formation = ASSETS.find(a => a.id === "formação subterrânea " + theme);
    const stair = ASSETS.find(a => a.id === "escada subterrânea " + theme);
    assert.equal(formation?.tier, "prop");
    assert.equal(formation.fn, "drawCaveFormation");
    assert.equal(stair?.tier, "prop");
    assert.equal(stair.fn, "drawCaveExitStair");
    assert.ok(!(formation.fn in NOT_AN_ASSET));
    assert.ok(!(stair.fn in NOT_AN_ASSET));
    for (const item of [formation, stair]) {
      const m = record(item.draw);
      assert.ok(m.clips >= 1, item.id + ": material deve ser recortado com clip()");
      assert.ok(m.gradients >= FLOORS.prop.gradients, item.id + ": sem volume");
      assert.ok(m.curves >= FLOORS.prop.curves, item.id + ": sem silhueta orgânica");
      assert.ok(m.colors >= FLOORS.prop.colors, item.id + ": sem paleta de material");
      assert.ok(m.strokes >= FLOORS.prop.strokes, item.id + ": sem contorno");
      assert.equal(m.saves, m.restores, item.id + ": contexto desbalanceado");
      assert.equal(record(item.draw).signature, m.signature, item.id + ": instável por seed");
    }
  }
  const src = readFileSync("src/render/cave.ts", "utf8");
  assert.match(src, /drawCaveFormation\s*\(\s*ctx\s*,/, "o piso deve usar a formação auditada, não uma cópia simplificada");
  assert.match(src, /drawCaveExitStair\s*\(\s*ctx\s*,/, "a saída deve usar a escada auditada");
});

test("arte de cavernas: temas têm materiais próprios e contraste de luz", () => {
  const palettes = THEMES.map(theme => {
    const p = CAVE_PALETTE[theme];
    assert.notEqual(p.wall, p.ground, "rocha e piso não devem ser indistinguíveis em " + theme);
    assert.notEqual(p.light, p.wall, "iluminação da rocha deve ser distinguível em " + theme);
    return JSON.stringify(p);
  });
  assert.equal(new Set(palettes).size, THEMES.length, "seis temas devem possuir paletas distintas");
});

for (const [index, theme] of THEMES.entries()) {
  test("arte de cavernas: cenário completo e atlas de " + theme + " não podem ser ignorados pelo portão", () => {
    const makeRoom = () => new CaveRoom(entrance(theme, index));
    const room = makeRoom();
    assert.equal(room.floor.at(CAVE_EXIT.x, CAVE_EXIT.y), 1);
    const view = () => {
      const r = makeRoom();
      return record(ctx => drawCaveView(ctx, r,
        r.player.x - 100, r.player.y - 95, 200, 190, 1));
    };
    const first = view();
    assert.ok(first.paintOps > 1000, theme + ": piso da cena não desenhado");
    assert.ok(first.gradients > 20, theme + ": piso sem volume/sombra");
    assert.ok(first.curves > 40, theme + ": formações ou relevos ausentes");
    assert.ok(first.colors > 30, theme + ": piso monocromático");
    assert.equal(first.saves, first.restores, theme + ": save/restore na cena");
    assert.equal(view().signature, first.signature, theme + ": mesma seed deu cena diferente");

    const atlas = () => {
      const r = makeRoom();
      return record(ctx => drawCaveAtlas(ctx, r.floor, CAVE_EXIT.x, CAVE_EXIT.y - 3));
    };
    const map = atlas();
    assert.ok(map.paintOps > 100, theme + ": planta subterrânea não desenhada");
    assert.ok(map.colors > 10, theme + ": cartografia sem materiais");
    assert.ok(map.curves >= 3, theme + ": marcadores da posição e saída ausentes");
    assert.equal(map.saves, map.restores);
    assert.equal(atlas().signature, map.signature, theme + ": atlas não determinístico");
    assert.ok(CAVE_WIDTH > 20 && CAVE_HEIGHT > 20, "validar planta real e não miniatura artificial");
  });
}
