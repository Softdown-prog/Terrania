import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CityEarth } from "../src/render/south/city/earth.ts";
import { CITY_EARTH_LOOK, HARDPAN_LOOK } from "../src/render/south/terrain/dunes/index.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * A terra pisada de dentro dos muros (ADR 0050): um relevo suave próprio (mais quente e mais escuro que a terra batida das planícies)
 * e, em alguns tiles, seixos, capim seco ou uma rachadura. Tudo estável por posição e semente, e raro.
 */
const lum = ([r, g, b]: readonly [number, number, number]): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mean = (look: { ramp: ReadonlyArray<readonly [number, number, number]> }): number => look.ramp.reduce((s, c) => s + lum(c), 0) / look.ramp.length;

test("o relevo da terra da cidade é mais escuro e mais suave que o da terra batida, e vai do marrom fundo ao claro de sol", () => {
  assert.ok(mean(CITY_EARTH_LOOK) < mean(HARDPAN_LOOK), "mais escuro");
  assert.ok(CITY_EARTH_LOOK.contrast < HARDPAN_LOOK.contrast, "marca menos a forma");
  assert.deepEqual(CITY_EARTH_LOOK.ramp[0], [0x8a, 0x66, 0x42]);
  assert.deepEqual(CITY_EARTH_LOOK.ramp[CITY_EARTH_LOOK.ramp.length - 1], [0xe6, 0xca, 0x9a]);
  const [r, g, b] = CITY_EARTH_LOOK.ramp[30]!; assert.ok(r > g && g > b, "tom quente (vermelho > verde > azul)");
});

test("os detalhes de cada tile são estáveis, dependem do lugar e da semente, e só desenham dentro do tile", () => {
  const draw = (tx: number, ty: number, seed: number) => (c: CanvasRenderingContext2D): number => new CityEarth(c).paint(64, 96, tx, ty, seed);
  const sig = (tx: number, ty: number, seed: number): string => signature(c => { draw(tx, ty, seed)(c); });
  assert.equal(sig(40, 50, 7), sig(40, 50, 7));
  const sigs = new Set<string>();
  for (let i = 0; i < 40; i++) sigs.add(sig(i, 3, 7));
  assert.ok(sigs.size > 3, "tiles diferentes, detalhes diferentes");
  assert.notEqual(Array.from({ length: 40 }, (_, i) => sig(i, 3, 7)).join(), Array.from({ length: 40 }, (_, i) => sig(i, 3, 8)).join(), "outra semente, outro chão");
  for (let i = 0; i < 200; i++) {
    const s = spy(c => { draw(i, i * 3, 11)(c); });
    for (const [x, y] of [...(s.args.ellipse ?? []), ...(s.args.moveTo ?? [])]) assert.ok(x! >= 64 && x! <= 96 && y! >= 96 && y! <= 128, `tile ${i}: ${x},${y}`);
  }
});

test("é raro: cerca de um terço dos tiles ganha seixos, um em oito capim e poucos rachaduras; nunca mais de dois detalhes", () => {
  let pebbles = 0, tufts = 0, cracks = 0, total = 0, none = 0;
  for (let ty = 0; ty < 60; ty++) for (let tx = 0; tx < 60; tx++) {
    const r = new Recorder(); const n = new CityEarth(r.ctx).paint(0, 0, tx, ty, 99);
    const s = spy(c => { new CityEarth(c).paint(0, 0, tx, ty, 99); });
    total++; assert.ok(n >= 0 && n <= 2);
    if (n === 0) none++;
    if ((s.args.ellipse ?? []).length) pebbles++;
    if (s.calls.quadraticCurveTo && !(s.args.ellipse ?? []).length) { /* tufo ou rachadura */ }
    if ((s.calls.quadraticCurveTo ?? 0) >= 5) tufts++;
    if ((s.calls.quadraticCurveTo ?? 0) === 2) cracks++;
  }
  assert.ok(pebbles / total > 0.25 && pebbles / total < 0.43, `seixos ${(pebbles / total).toFixed(2)}`);
  assert.ok(tufts / total > 0.07 && tufts / total < 0.2, `capim ${(tufts / total).toFixed(2)}`);
  assert.ok(cracks / total < 0.1, `rachaduras ${(cracks / total).toFixed(2)}`);
  assert.ok(none / total > 0.45, "a maior parte da terra fica limpa");
});

test("um seixo tem sombra, corpo e a quina clara, nessa ordem, com o corpo de dois tons", () => {
  for (let tx = 0; tx < 100; tx++) {
    const s = spy(c => { new CityEarth(c).paint(0, 0, tx, 1, 5); });
    if ((s.args.ellipse ?? []).length < 3) continue;
    assert.equal(s.raw[0], "rgba(60,40,24,0.35)", "sombra primeiro");
    assert.ok(s.raw.includes("#8d7757") || s.raw.includes("#9a8466"));
    assert.ok(s.raw.includes("rgba(255,246,220,0.45)"), "brilho");
    return;
  }
  assert.fail("nenhum tile de teste teve seixo");
});

test("o chão do chunk usa a terra da cidade só onde é areia dentro dos muros, e o passo extra vem logo depois do relevo", () => {
  const src = readFileSync("src/render/terrain.ts", "utf8");
  assert.match(src, /duneReliefCanvas\(cx, cy, seed, CITY_EARTH_LOOK,/);
  assert.match(src, /grid\.at\(lx, ly\)\.ground !== "sand"\) return false/);
  assert.match(src, /return southCitySafe\(tx, ty\)/);
  assert.match(src, /new CityEarth\(ctx\)\.paint\(x, y, tx, ty, seed\)/);
  assert.ok(src.indexOf("duneReliefCanvas(cx, cy, seed, CITY_EARTH_LOOK,") > src.indexOf("[[DUNES_LOOK, \"dunes\"], [HARDPAN_LOOK, \"ruins\"]]"), "depois das duas camadas de relevo");
  assert.ok(src.indexOf("duneReliefCanvas(cx, cy, seed, CITY_EARTH_LOOK,") < src.indexOf("Lago negro: água com profundidade"), "antes do lago");
});
