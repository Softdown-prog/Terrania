import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CAPITAL_RELEASE_SLACK, CAPITAL_WARM_MARGIN, releaseCapitalSprites, warmCapitalSprites } from "../src/render/center/capital/warm.ts";
import { capitalBuildingSprite, capitalBuildingSpriteKey } from "../src/render/center/capital/sceneryPainter.ts";
import { CAPITAL_BUILDING_ART, buildingBox, capitalBuildingArtFor } from "../src/render/center/capital/buildings/index.ts";
import { releaseRegionSprites, releaseWith, warmRegionSprites } from "../src/render/props/registry.ts";
import { RES, hasSprite, releaseSprite, sprite } from "../src/render/props/spriteCache.ts";
import { clearSceneryCache, renderScenery, type Scenery } from "../src/render/scenery.ts";
import { CAPITAL, CAPITAL_BUILDINGS, CAPITAL_PROPS, CAPITAL_TILE, capitalPoint, capitalPropsInView } from "../src/world/center/capital/index.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";
import { spy } from "./helpers/spyContext.ts";

/**
 * Soltar da memória os sprites dos edifícios quando a câmera se afasta da capital (ADR 0061): o cache solta e repinta, o
 * soltador só age quando nenhuma peça da capital poderia estar na tela (nem numa tela 4.000 px maior), e a cena o chama a cada quadro.
 */
interface FakeCanvas { width: number; height: number; getContext: () => unknown }
const fakeDocument = (made: FakeCanvas[]) => ({ createElement: () => { const canvas: FakeCanvas = { width: 0, height: 0, getContext: () => new Recorder().ctx }; made.push(canvas); return canvas; } });
const center = capitalPoint(0, 0), N = CAPITAL_BUILDINGS.length;
/** Pinta os N sprites com um desenho vazio: só interessa o cache, não a arte. */
const seed = (made: FakeCanvas[]): void => withDocument(fakeDocument(made), () => { for (let i = 0; i < N; i++) sprite(capitalBuildingSpriteKey(i), 10, 20, 0, 0, () => {}); });
const painted = (): number => CAPITAL_BUILDINGS.filter((_, i) => hasSprite(capitalBuildingSpriteKey(i))).length;

test("o cache solta um sprite: o canvas vai a zero, a chave some e o próximo pedido pinta de novo", () => {
  clearSceneryCache();
  const made: FakeCanvas[] = [];
  withDocument(fakeDocument(made), () => {
    assert.equal(releaseSprite("teste-solto"), false, "o que nunca foi pintado");
    const s = sprite("teste-solto", 30, 40, 5, 6, () => {});
    assert.deepEqual([made[0]!.width, made[0]!.height], [30 * RES, 40 * RES]); assert.equal(hasSprite("teste-solto"), true);
    assert.equal(releaseSprite("teste-solto"), true);
    assert.deepEqual([made[0]!.width, made[0]!.height], [0, 0], "a memória do canvas volta na hora"); assert.equal(hasSprite("teste-solto"), false);
    assert.equal(s!.canvas, made[0], "era o canvas desse sprite");
    assert.equal(releaseSprite("teste-solto"), false, "soltar duas vezes não faz nada");
    const again = sprite("teste-solto", 30, 40, 5, 6, () => {});
    assert.equal(made.length, 2, "pinta de novo, num canvas novo"); assert.notEqual(again!.canvas, made[0]); assert.deepEqual([again!.canvas.width, again!.canvas.height], [30 * RES, 40 * RES]);
    releaseSprite("teste-solto");
  });
  // sem Canvas (no Node) o sprite é `null`, e não há o que soltar
  assert.equal(sprite("sem-canvas", 10, 10, 0, 0, () => {}), null); assert.equal(releaseSprite("sem-canvas"), false);
  clearSceneryCache();
});

test("perto da capital nada é solto, longe tudo é, e ao voltar os sprites são repintados um por quadro", () => {
  clearSceneryCache();
  const made: FakeCanvas[] = [];
  seed(made); assert.equal(painted(), N);
  const W = 1280, H = 720;
  for (const [dx, dy] of [[0, 0], [40 * CAPITAL_TILE, 0], [0, -40 * CAPITAL_TILE], [(CAPITAL.maxX + CAPITAL_WARM_MARGIN) * CAPITAL_TILE - 1, 0]] as const) {
    assert.equal(releaseCapitalSprites(center.x + dx, center.y + dy, W, H), 0, `perto, em ${dx},${dy}`); assert.equal(painted(), N);
  }
  assert.equal(releaseCapitalSprites(0, 0, W, H), N, "na Vila, a 800 tiles: solta os oito");
  assert.equal(painted(), N - N); assert.ok(made.every(c => c.width === 0 && c.height === 0), "todos os canvases foram a zero");
  assert.equal(releaseCapitalSprites(0, 0, W, H), 0, "sem nada pintado, não há o que soltar");
  withDocument(fakeDocument(made), () => {
    const near = { x: center.x, y: center.y + 20 * CAPITAL_TILE };
    for (let i = 0; i < N; i++) { assert.equal(warmCapitalSprites(near.x, near.y), true, `quadro ${i}`); assert.equal(painted(), i + 1, "um por quadro"); }
    assert.equal(warmCapitalSprites(near.x, near.y), false);
  });
  assert.equal(made.length, 2 * N, "cada edifício foi pintado de novo, num canvas novo");
  clearSceneryCache();
});

test("só solta quando nenhuma peça poderia estar na tela nem numa tela 4.000 px maior: varredura de câmeras e de tamanhos de tela", () => {
  clearSceneryCache();
  assert.equal(CAPITAL_RELEASE_SLACK, 4000);
  const boxes = CAPITAL_BUILDINGS.map((b, i) => { const [w, h, ox, oy] = buildingBox(capitalBuildingArtFor(i)!.size); return { x0: b.x - ox, x1: b.x - ox + w, y0: b.y - oy, y1: b.y - oy + h }; });
  let released = 0, kept = 0;
  for (const [W, H] of [[412, 915], [1280, 720], [1920, 1080], [3840, 2160], [7680, 4320]] as const) for (let dx = -5200; dx <= 5200; dx += 260) for (let dy = -4600; dy <= 4600; dy += 230) {
    const cameraX = center.x + dx, cameraY = center.y + dy;
    seed([]);
    const empty = capitalPropsInView(cameraX, cameraY, W + CAPITAL_RELEASE_SLACK, H + CAPITAL_RELEASE_SLACK).length === 0;
    const got = releaseCapitalSprites(cameraX, cameraY, W, H);
    assert.equal(got, empty ? N : 0, `câmera ${dx},${dy} em ${W}×${H}`);
    if (empty) { released++; for (const b of boxes) assert.ok(!(b.x1 > cameraX - W / 2 && b.x0 < cameraX + W / 2 && b.y1 > cameraY - H / 2 && b.y0 < cameraY + H / 2), "soltou um sprite que estaria na tela"); }
    else { kept++; assert.equal(painted(), N); }
    for (let i = 0; i < N; i++) releaseSprite(capitalBuildingSpriteKey(i));
  }
  assert.ok(released > 400 && kept > 400, `${released} câmeras longe, ${kept} perto`);
  clearSceneryCache();
});

test("a histerese: onde o preparo começa, o soltador nunca age, em nenhum tamanho de tela, e entre os dois a câmera pode ir e voltar sem repintar", () => {
  clearSceneryCache();
  for (const W of [320, 1280, 1920, 3840, 8000]) for (const H of [480, 720, 2160]) {
    for (const [dx, dy] of [[(CAPITAL.maxX + CAPITAL_WARM_MARGIN) * CAPITAL_TILE - 1, 0], [0, (CAPITAL.maxY + CAPITAL_WARM_MARGIN) * CAPITAL_TILE - 1], [-(CAPITAL.maxX + CAPITAL_WARM_MARGIN) * CAPITAL_TILE + 1, 0], [0, -(CAPITAL.maxY + CAPITAL_WARM_MARGIN) * CAPITAL_TILE + 1]] as const) {
      seed([]);
      assert.equal(releaseCapitalSprites(center.x + dx, center.y + dy, W, H), 0, `${W}×${H} em ${dx},${dy}`); assert.equal(painted(), N);
      for (let i = 0; i < N; i++) releaseSprite(capitalBuildingSpriteKey(i));
    }
  }
  // a distância exata em que o soltador passa a agir (em x, a leste, tela de 1280): fica bem além de onde o preparo começa
  const warmEdge = (CAPITAL.maxX + CAPITAL_WARM_MARGIN) * CAPITAL_TILE;
  let boundary = -1;
  for (let d = warmEdge; d < warmEdge + 6000; d++) { seed([]); const got = releaseCapitalSprites(center.x + d, center.y, 1280, 720); for (let i = 0; i < N; i++) releaseSprite(capitalBuildingSpriteKey(i)); if (got > 0) { boundary = d; break; } }
  assert.ok(boundary > warmEdge + 1500 && boundary < warmEdge + 3500, `o soltador age a ${boundary - warmEdge} px além do começo do preparo`);
  seed([]); assert.equal(releaseCapitalSprites(center.x + boundary - 1, center.y, 1280, 720), 0, "um pixel antes: nada"); assert.equal(releaseCapitalSprites(center.x + boundary, center.y, 1280, 720), N, "no pixel: os oito");
  clearSceneryCache();
});

test("entradas inválidas não soltam nada; o registro das regiões chama o soltador da capital e soma o que soltou", () => {
  clearSceneryCache();
  seed([]);
  for (const bad of [[Number.NaN, 0, 1280, 720], [0, Number.POSITIVE_INFINITY, 1280, 720], [0, 0, 0, 720], [0, 0, 1280, -1], [0, 0, Number.NaN, 720]] as const) assert.equal(releaseCapitalSprites(bad[0], bad[1], bad[2], bad[3]), 0);
  assert.equal(painted(), N);
  assert.equal(releaseRegionSprites(center.x, center.y, 1280, 720), 0, "na capital: nada"); assert.equal(painted(), N);
  assert.equal(releaseRegionSprites(0, 0, 1280, 720), N, "longe: os oito"); assert.equal(painted(), 0);
  assert.equal(releaseRegionSprites(0, 0, 1280, 720), 0);
  const calls: number[][] = [];
  assert.equal(releaseWith([(...a) => { calls.push(a); return 3; }, (...a) => { calls.push(a); return 4; }], 1, 2, 3, 4), 7, "soma o que cada região soltou");
  assert.deepEqual(calls, [[1, 2, 3, 4], [1, 2, 3, 4]], "cada soltador recebe a câmera e a tela"); assert.equal(releaseWith([], 1, 2, 3, 4), 0);
  withDocument(fakeDocument([]), () => assert.equal(warmRegionSprites(center.x, center.y), true, "e o preparo das regiões repinta"));
  assert.equal(painted(), 1);
  clearSceneryCache();
});

test("depois de soltos, os edifícios voltam a ser desenhados pelo cenário (um sprite novo cada um) e a cena chama o soltador a cada quadro", () => {
  clearSceneryCache();
  const made: FakeCanvas[] = [];
  const draw = (variant: number) => spy(c => withDocument(fakeDocument(made), () => renderScenery(c, { kind: "center-capital", capitalKind: "building", x: 5, y: 5, variant } as unknown as Scenery, 0, 0, 0)));
  for (let i = 0; i < N; i++) assert.equal(draw(i).calls.drawImage, 1);
  assert.equal(made.length, N);
  assert.equal(releaseCapitalSprites(0, 0, 1280, 720), N);
  for (let i = 0; i < N; i++) assert.equal(draw(i).calls.drawImage, 1, `edifício ${i} desenhado de novo`);
  assert.equal(made.length, 2 * N); assert.ok(made.slice(N).every((c, i) => c.width === (buildingBox(CAPITAL_BUILDING_ART[CAPITAL_BUILDINGS[i]!.id]!.size)[0]) * RES), "cada sprite novo tem o tamanho da caixa do edifício");
  assert.equal(capitalBuildingSprite(N), undefined);
  const scene = readFileSync("src/ui/CanvasScene.ts", "utf8");
  assert.match(scene, /warmRegionSprites\(cameraX, cameraY\);\n[^\n]*\n  releaseRegionSprites\(cameraX, cameraY, width, height\);/);
  assert.ok(scene.indexOf("releaseRegionSprites(cameraX") < scene.indexOf("world.objects(cameraX"), "solta antes de entregar as peças ao desenho, e só quando nenhuma está à vista");
  assert.ok(CAPITAL_PROPS.some(p => p.kind === "building"));
  clearSceneryCache();
});
