import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CAPITAL_PROP_ART, paintCapitalGate, paintCapitalTower, paintCapitalWall, paintCapitalWallSide } from "../src/render/center/capital/props/index.ts";
import { MERLON_H, WALL_HALF, WALL_PERIOD, WALL_TOP } from "../src/render/center/capital/props/wall.ts";
import { SIDE_HALF, SIDE_HEIGHT, SIDE_LENGTH, SIDE_PERIOD } from "../src/render/center/capital/props/wallSide.ts";
import { ROOF_HEIGHT, TOWER } from "../src/render/center/capital/props/tower.ts";
import { ARCH_SPRING, FACE_TOP, GATE_HALF, GATE_PERIOD, archY } from "../src/render/center/capital/props/gate.ts";
import { renderScenery, clearSceneryCache, type Scenery } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";
import { signature, spy, type Spy } from "./helpers/spyContext.ts";

/**
 * A arte da muralha da capital (ADR 0056): cada peça no seu arquivo, estável por variação, com as emendas de período fixo
 * (os trechos se encostam sem linha escura) e o cadastro que leva o corpo de cada uma para o cache de sprites.
 */
const count = (s: Spy, method: string, pick: (a: number[]) => boolean): number => (s.args[method] ?? []).filter(pick).length;
const balanced = (draw: (c: CanvasRenderingContext2D) => void): boolean => { const r = new Recorder(); draw(r.ctx); const m = r.metrics(); return m.saves === m.restores; };

test("cada peça está no seu arquivo, na pasta da região central, e o cadastro tem os quatro tipos com a quantidade de variações", () => {
  assert.deepEqual(readdirSync(new URL("../src/render/center/capital/props/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort(), ["gate", "index", "tower", "wall", "wallSide"]);
  assert.deepEqual(readdirSync(new URL("../src/render/center/kit/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort(), ["banner", "brush", "index", "palette"]);
  assert.deepEqual(Object.keys(CAPITAL_PROP_ART).sort(), ["gate", "tower", "wall", "wall-side"]);
  assert.deepEqual(["wall", "wall-side", "gate", "tower"].map(k => CAPITAL_PROP_ART[k]!.variants), [8, 2, 1, 2]);
  for (const [kind, art] of Object.entries(CAPITAL_PROP_ART)) {
    assert.ok(art.box.every(n => n > 0), kind);
    assert.ok(art.box[2] < art.box[0] && art.box[3] < art.box[1], `${kind}: a origem fica dentro do sprite`);
  }
  for (const f of ["props/wall", "props/wallSide", "props/tower", "props/gate", "sceneryPainter"]) {
    const src = readFileSync(`src/render/center/capital/${f}.ts`, "utf8");
    for (const bad of ["Math.random", "Date.now", "performance.now", "new Date(", "render/south", "world/south"]) assert.equal(src.includes(bad), false, `${f}: ${bad}`);
  }
});

test("a muralha de frente: oito variações estáveis (4 a 7 são o meio trecho) e as ameias, fiadas e juntas têm período fixo", () => {
  const sigs = [0, 1, 2, 3, 4, 5, 6, 7].map(v => signature(c => paintCapitalWall(c, v)));
  assert.equal(new Set(sigs).size, 8);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(v => signature(c => paintCapitalWall(c, v))), sigs, "estável");
  assert.equal(signature(c => paintCapitalWall(c, 8)), sigs[0], "8 é a variação 0");
  assert.equal(signature(c => paintCapitalWall(c, -2)), sigs[2]);
  assert.equal(signature(c => paintCapitalWall(c, Number.NaN)), sigs[0]);
  for (const v of [0, 1, 2, 3]) {
    const s = spy(c => paintCapitalWall(c, v));
    const merlons = (s.args.fillRect ?? []).filter(a => a[2] === 10 && a[3] === MERLON_H).map(a => a[0]!).sort((a, b) => a - b);
    assert.deepEqual(merlons, [-29, -13, 3, 19], `ameias da variação ${v}: uma a cada ${WALL_PERIOD} px, o vão cai na emenda`);
    assert.equal(count(s, "fillRect", a => a[2] === 12 && a[3] === 2.4), 4, "laje de cima de cada ameia");
    const courses = (s.args.moveTo ?? []).filter(a => a[0] === -WALL_HALF && Number.isInteger(a[1]!) && a[1]! < 0 && a[1]! > WALL_TOP).map(a => a[1]!);
    assert.deepEqual([...new Set(courses)].sort((a, b) => b - a), [-8, -16, -24, -32], `fiadas de 8 px em ${v}`);
    for (const a of s.args.moveTo ?? []) if (a[1]! < -8 && a[1]! > WALL_TOP && a[0] !== -WALL_HALF && Math.abs(a[0]!) < WALL_HALF && Number.isInteger(a[0]!) && a[0]! % 8 === 0)
      assert.ok((a[0]! + WALL_HALF) % 8 === 0, `junta fora do período em ${a[0]}`);
    assert.equal(s.calls.arc !== undefined && count(s, "arc", a => a[2] === 2.3), 8, "um arco entre cada par de mísulas, a cada 8 px");
    assert.equal(count(s, "strokeRect", a => a[2] === WALL_HALF * 2), 0, "sem contorno nas pontas: a emenda não tem linha escura");
    assert.ok(balanced(c => paintCapitalWall(c, v)));
  }
  assert.equal(spy(c => paintCapitalWall(c, 0)).calls.clip, 1);
  for (const v of [4, 5, 6, 7]) {
    const s = spy(c => paintCapitalWall(c, v));
    assert.equal(s.calls.clip, 2, "o meio trecho recorta a peça");
    assert.deepEqual(s.args.rect![0]!.slice(0, 3), [-16, WALL_TOP - MERLON_H - 12, 32], "em 32 px de largura, de -16 a 16");
    assert.ok(balanced(c => paintCapitalWall(c, v)));
  }
});

test("cada variação da muralha tem o seu desgaste: rachadura e remendo na 1, fresta na 2, hera na 3, musgo na 0 e na 3", () => {
  const dash = (v: number): number => spy(c => paintCapitalWall(c, v)).calls.setLineDash ?? 0;
  assert.deepEqual([0, 1, 2, 3].map(dash), [0, 2, 0, 0], "o remendo tracejado liga e desliga o tracejado só na variação 1");
  const slit = (v: number): number => count(spy(c => paintCapitalWall(c, v)), "arc", a => a[2] === 3 && a[1] === -28);
  assert.deepEqual([0, 1, 2, 3].map(slit), [0, 0, 1, 0]);
  const ivy = (v: number): number => count(spy(c => paintCapitalWall(c, v)), "ellipse", a => a[2] === 2.6 && a[3] === 1.5);
  assert.deepEqual([0, 1, 2, 3].map(ivy), [0, 0, 0, 5]);
  const mossy = (v: number): boolean => spy(c => paintCapitalWall(c, v)).raw.some(r => r.toLowerCase().startsWith("rgba(95,138,60"));
  assert.deepEqual([0, 1, 2, 3].map(mossy), [true, false, false, true]);
  const lichen = (v: number): number => spy(c => paintCapitalWall(c, v)).raw.filter(r => r.startsWith("rgba(217,161,79") || r.startsWith("rgba(201,194,124")).length;
  for (const v of [0, 1, 2, 3]) assert.ok(lichen(v) >= 2, `líquen em ${v}`);
});

test("o muro de lado: duas variações estáveis, ameias e lajes com período fixo, contorno só nos lados e a ponta de alvenaria no pé", () => {
  const sigs = [0, 1].map(v => signature(c => paintCapitalWallSide(c, v)));
  assert.notEqual(sigs[0], sigs[1]);
  assert.deepEqual([0, 1].map(v => signature(c => paintCapitalWallSide(c, v))), sigs);
  assert.equal(signature(c => paintCapitalWallSide(c, 2)), sigs[0]); assert.equal(signature(c => paintCapitalWallSide(c, Number.NaN)), sigs[0]);
  const far = -SIDE_HEIGHT - SIDE_LENGTH;
  for (const v of [0, 1]) {
    const s = spy(c => paintCapitalWallSide(c, v));
    const merlons = (s.args.fillRect ?? []).filter(a => a[2] === 6 && a[3] === 8);
    assert.deepEqual(merlons.map(a => a[1]!).sort((a, b) => a - b), [-91, -91, -75, -75, -59, -59, -43, -43], `ameias a cada ${SIDE_PERIOD} px nas duas bordas`);
    assert.deepEqual([...new Set(merlons.map(a => a[0]!))].sort((a, b) => a - b), [-SIDE_HALF, SIDE_HALF - 6]);
    assert.equal(count(s, "strokeRect", a => a[3] === SIDE_LENGTH), 0, "sem contorno em cima nem embaixo do trecho: a emenda não tem linha escura");
    assert.equal(count(s, "strokeRect", a => a[2] === SIDE_HALF * 2 && a[3] === SIDE_HEIGHT), 1, "a ponta de alvenaria tem o seu contorno");
    const seams = (s.args.moveTo ?? []).filter(a => a[0] === -SIDE_HALF && a[1]! >= far && a[1]! < -SIDE_HEIGHT && (a[1]! - far) % 8 === 0).map(a => a[1]!);
    assert.deepEqual(seams, [...Array.from({ length: 8 }, (_, i) => far + i * 8), far], "emendas das lajes a cada 8 px (e o contorno da esquerda, que começa em cima)");
    assert.ok(balanced(c => paintCapitalWallSide(c, v)));
  }
  assert.equal(SIDE_LENGTH % SIDE_PERIOD, 0, "o período divide o trecho");
});

test("as torres: de canto com telhado cônico e pendão, de portão com coroa de ameias e estandarte; fiadas curvas de 8 px e três frestas", () => {
  const corner = signature(c => paintCapitalTower(c, 0)), gate = signature(c => paintCapitalTower(c, 1));
  assert.notEqual(corner, gate);
  assert.equal(signature(c => paintCapitalTower(c, 0)), corner); assert.equal(signature(c => paintCapitalTower(c, 1)), gate);
  assert.equal(signature(c => paintCapitalTower(c, 2)), corner, "fora do intervalo vale a de canto"); assert.equal(signature(c => paintCapitalTower(c, Number.NaN)), corner);
  assert.deepEqual(TOWER, [{ r: 34, h: 104 }, { r: 33, h: 96 }]);
  for (const v of [0, 1] as const) {
    const { r, h } = TOWER[v], s = spy(c => paintCapitalTower(c, v));
    const courses = (s.args.ellipse ?? []).filter(a => a.length === 7 && a[0] === 0 && a[2] === r && a[4] === 0 && a[5] === 0 && a[6] === Math.PI && Number.isInteger(a[1]!) && a[1]! % 8 === 0 && a[1]! < 0 && a[1]! > -h);
    assert.equal(courses.length, Math.floor((h - 1) / 8), `fiadas de 8 px na torre ${v}`);
    assert.equal(count(s, "arc", a => a[2] === 2.6), 3, "três frestas de arqueiro com a ponta em arco");
    assert.ok(balanced(c => paintCapitalTower(c, v)));
  }
  assert.equal(ROOF_HEIGHT, 58);
  const roof = (v: number): boolean => (spy(c => paintCapitalTower(c, v)).args.lineTo ?? []).some(a => a[0] === 0 && a[1] === -162);
  assert.deepEqual([roof(0), roof(1)], [true, false], "só a torre de canto tem o pico do telhado");
  const merlons = (v: number): number => count(spy(c => paintCapitalTower(c, v)), "fillRect", a => a[2] === 7 && a[3] === 10);
  assert.deepEqual([merlons(0), merlons(1)], [0, 16], "a torre do portão tem 7 ameias atrás e 9 na frente");
  const flag = (v: number): number => count(spy(c => paintCapitalTower(c, v)), "quadraticCurveTo", a => a[0] === 11 && a[2] === 19);
  assert.deepEqual([flag(0), flag(1)], [1, 0], "o pendão azul é só da torre de canto");
  const banner = (v: number): number => count(spy(c => paintCapitalTower(c, v)), "fillRect", a => a[2] === 24 && a[3] === 2.6);
  assert.deepEqual([banner(0), banner(1)], [0, 1], "o estandarte da capital é só da torre do portão");
});

test("o Grande Portão: arco que sobe 20 px até o meio, 22 barras na grade, duas lanternas, brasão, estandartes e as mesmas ameias da muralha", () => {
  assert.equal(archY(-GATE_HALF), ARCH_SPRING); assert.equal(archY(GATE_HALF), ARCH_SPRING); assert.equal(archY(0), ARCH_SPRING - 20);
  for (let x = 1; x <= GATE_HALF; x += 7) { assert.ok(Math.abs(archY(x) - archY(-x)) < 1e-9, "simétrico"); assert.ok(archY(x) > archY(x - 7) || x === 1, "desce do meio para a ponta"); }
  const sig = signature(c => paintCapitalGate(c, 0));
  assert.equal(signature(c => paintCapitalGate(c, 0)), sig); assert.equal(signature(c => paintCapitalGate(c, Number.NaN)), sig);
  const s = spy(c => paintCapitalGate(c, 0));
  const merlons = (s.args.fillRect ?? []).filter(a => a[2] === 10 && a[3] === MERLON_H).map(a => a[0]! + 5).sort((a, b) => a - b);
  assert.deepEqual(merlons, Array.from({ length: 18 }, (_, i) => -136 + i * 16), "18 ameias, simétricas");
  for (const x of merlons) assert.equal(((x % GATE_PERIOD) + GATE_PERIOD) % GATE_PERIOD, 8, "no mesmo compasso das ameias da muralha");
  for (const x of [-24, -8, 8, 24]) assert.equal(((x % WALL_PERIOD) + WALL_PERIOD) % WALL_PERIOD, 8);
  assert.equal(GATE_PERIOD, WALL_PERIOD);
  assert.equal(count(s, "fillRect", a => a[2] === 12 && a[3] === 2.4), 18, "laje de cima de cada ameia");
  const bars = (s.args.moveTo ?? []).filter(a => (a[0]! + 128) % 12 === 0 && Math.abs(a[0]!) <= 128 && a[1] === archY(a[0]!));
  assert.deepEqual(bars.map(a => a[0]), Array.from({ length: 22 }, (_, i) => -128 + i * 12), "22 barras de ferro penduradas sob o arco, a cada 12 px");
  assert.equal(count(s, "createRadialGradient", a => a[5] === 20), 2, "o brilho de cada lanterna");
  assert.equal(count(s, "createRadialGradient", a => a[5] === GATE_HALF - 4), 1, "a sombra funda da passagem");
  assert.equal(count(s, "ellipse", a => a[2] === 12 && a[3] === 12), 1, "o círculo azul do brasão");
  assert.equal(count(s, "arc", a => a[2] === 12), 1, "o seu aro de ouro"); assert.equal(count(s, "arc", a => a[2] === 13), 1, "e o contorno do brasão");
  assert.equal(count(s, "fillRect", a => a[2] === 12 && a[3] === 18), 1, "a chave do arco");
  assert.equal(count(s, "fillRect", a => a[2] === 16 + 4 && a[3] === 2.6), 2, "as duas barras dos estandartes");
  assert.ok((s.args.lineTo ?? []).some(a => a[0] === GATE_HALF + 6 && a[1] === FACE_TOP), "a face sobe até a cornija");
  assert.ok(balanced(c => paintCapitalGate(c, 0)));
});

test("o cenário põe cada peça da capital no cache, uma vez por variação, e peça sem pintor não desenha nada", () => {
  clearSceneryCache();
  let created = 0;
  const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
  const draw = (capitalKind: string | undefined, variant: number): Spy => spy(c => withDocument(doc, () => renderScenery(c, { kind: "center-capital", ...(capitalKind ? { capitalKind } : {}), x: 5, y: 5, variant } as unknown as Scenery, 0, 0, 0)));
  for (let v = 0; v < 8; v++) draw("wall", v);
  assert.equal(created, 8, "oito sprites de muralha");
  draw("wall", 8); draw("wall", 9);
  assert.equal(created, 8, "8 e 9 reaproveitam os sprites 0 e 1");
  draw("wall-side", 0); draw("wall-side", 1); draw("wall-side", 3);
  assert.equal(created, 10); draw("gate", 0); draw("gate", 5); assert.equal(created, 11); draw("tower", 0); draw("tower", 1); assert.equal(created, 13);
  const before = created;
  const unknown = draw("inexistente", 0), none = draw(undefined, 0);
  assert.equal(created, before); assert.equal(unknown.calls.drawImage ?? 0, 0); assert.equal(none.calls.drawImage ?? 0, 0);
  assert.equal(draw("gate", 0).calls.drawImage, 1, "carimba o sprite uma vez");
  const source = readFileSync("src/render/center/capital/sceneryPainter.ts", "utf8");
  assert.match(source, /sprite\(`center-capital-\$\{kind\}-\$\{v\}`, w, h, ox, oy,/);
  assert.match(readFileSync("src/render/props/registry.ts", "utf8"), /\[SOUTH_SCENERY_PAINTERS, CENTER_SCENERY_PAINTERS\]/);
  clearSceneryCache();
});
