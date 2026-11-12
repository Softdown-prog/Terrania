import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { CHUNK_PIXELS, CHUNK_TILES, TILE_SIZE, getTile } from "../src/world/terrain.ts";
import { BLACK_LAKE_THRESHOLD, blackLakeNoise } from "../src/world/south/blackLake.ts";
import { COAST_WOBBLE, LAKE_SIZE, LAKE_STEP, MUD_WET, SHALLOW, blackLakeLayerCanvas, lakeCoverage, lerpColor, shadeBlackLake,
  waterColor, wobbledCoverage, type LakeAt } from "../src/render/south/terrain/blackLake/index.ts";
import { paintChunk, withDocument } from "./helpers/paintChunk.ts";
import { Recorder } from "./helpers/recordingContext.ts";

/**
 * Lago negro do Sul (ADR 0039): costa orgânica que segue a colisão, água com profundidade, lama só na margem e fio
 * de luz. O sombreamento é puro, então a forma se prova sem navegador.
 */
const SEED = 842136;
const luma = (r: number, g: number, b: number): number => (r * .2126 + g * .7152 + b * .0722) / 255;
const lakeAtChunk = (cx: number, cy: number): LakeAt => (lx, ly) => {
  const tile = getTile(cx * CHUNK_TILES + lx, cy * CHUNK_TILES + ly, SEED);
  return tile.ground === "water" && tile.biome === "black-lake";
};
/** Chunks do lago: (4, 974) é só água; (6, 974) tem a costa; (0, 0) é o vilarejo, sem água. */
const FULL = [4, 974] as const, COAST = [5, 973] as const, VILLAGE = [0, 0] as const;
const at = (data: Uint8ClampedArray, i: number, j: number): [number, number, number, number] => {
  const o = (j * LAKE_SIZE + i) * 4;
  return [data[o]!, data[o + 1]!, data[o + 2]!, data[o + 3]!];
};

test("cada assunto do lago está no seu arquivo: o mundo na pasta do Sul e o desenho na do lago", () => {
  assert.equal(existsSync(new URL("../src/world/south/blackLake.ts", import.meta.url)), true);
  const files = readdirSync(new URL("../src/render/south/terrain/blackLake/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["coverage", "index", "layer", "palette", "shade"]);
});

test("o ruído do lago é a única fonte: o terreno e o desenho concordam em onde há água", () => {
  let water = 0, lakeTiles = 0;
  for (let ty = 15560; ty < 15640; ty++) for (let tx = 20; tx < 140; tx++) {
    const tile = getTile(tx, ty, SEED), isWater = tile.ground === "water" && tile.biome === "black-lake";
    if (isWater) { water++; assert.ok(blackLakeNoise(tx, ty, SEED) > BLACK_LAKE_THRESHOLD, `${tx},${ty}`); }
    else if (blackLakeNoise(tx, ty, SEED) > BLACK_LAKE_THRESHOLD) lakeTiles++;
  }
  assert.ok(water > 1000, "água na amostra: " + water);
  assert.equal(lakeTiles, 0, "nenhum tile acima do limite deixou de ser água");
  assert.notEqual(blackLakeNoise(80, 15560, SEED), blackLakeNoise(80, 15560, SEED + 1));
  assert.equal(blackLakeNoise(80.3, 15560.7, SEED), blackLakeNoise(80.3, 15560.7, SEED));
});

test("a cobertura vale 1 dentro, 0 na terra e 0,5 exatamente na borda entre um tile de água e um de terra", () => {
  const half: LakeAt = lx => lx < 0;
  assert.equal(lakeCoverage(half, -3.5, 4.5), 1);
  assert.equal(lakeCoverage(half, 3.5, 4.5), 0);
  assert.equal(lakeCoverage(half, 0, 4.5), 0.5, "a costa passa pela borda do tile, onde fica a colisão");
  const spot: LakeAt = (lx, ly) => lx === 2 && ly === 2;
  assert.equal(lakeCoverage(spot, 2.5, 2.5), 1);
  assert.ok(lakeCoverage(spot, 3, 3) === 0.25 && lakeCoverage(spot, 3, 2.5) === 0.5, "o canto de um tile isolado é arredondado");
  assert.equal(lakeCoverage(() => false, 1.3, 7.7), 0);
});

test("a ondulação da costa é limitada: dentro continua água e longe do lago nunca vira água", () => {
  let maxWobble = 0, differs = new Set<number>();
  for (let i = 0; i < 4000; i++) {
    const gx = (i % 80) * 0.77 + 100, gy = Math.floor(i / 80) * 0.83 + 15500;
    const w = wobbledCoverage(0, gx, gy, SEED);
    maxWobble = Math.max(maxWobble, Math.abs(w));
    assert.ok(w < 0.5 && wobbledCoverage(1, gx, gy, SEED) > 0.5, "o miolo fica água e a terra fica terra");
    assert.equal(w, wobbledCoverage(0, gx, gy, SEED));
    differs.add(Math.round(w * 1000));
  }
  assert.ok(maxWobble <= COAST_WOBBLE * 1.3 && maxWobble > 0.08, "ondula de verdade, dentro do limite: " + maxWobble);
  assert.ok(differs.size > 200, "a ondulação varia pela posição");
  assert.notEqual(wobbledCoverage(0, 100.4, 15500.4, SEED), wobbledCoverage(0, 100.4, 15500.4, SEED + 1), "e pela semente");
});

test("no desenho, onde o ruído do lago é mais alto a água é mais escura (profundidade de verdade)", () => {
  const lakeAt = lakeAtChunk(...FULL), data = shadeBlackLake(...FULL, SEED, lakeAt);
  const samples: Array<{ noise: number; l: number }> = [];
  for (let j = 8; j < LAKE_SIZE - 8; j += 2) for (let i = 8; i < LAKE_SIZE - 8; i += 2) {
    const [r, g, b] = at(data, i, j);
    samples.push({ noise: blackLakeNoise(FULL[0] * CHUNK_TILES + ((i + 0.5) * LAKE_STEP) / TILE_SIZE, FULL[1] * CHUNK_TILES + ((j + 0.5) * LAKE_STEP) / TILE_SIZE, SEED), l: luma(r, g, b) });
  }
  samples.sort((x, y) => x.noise - y.noise);
  const third = Math.floor(samples.length / 3), mean = (xs: typeof samples): number => xs.reduce((n, x) => n + x.l, 0) / xs.length;
  const shallow = mean(samples.slice(0, third)), deep = mean(samples.slice(-third));
  assert.ok(samples[samples.length - 1]!.noise - samples[0]!.noise > 0.03, "o chunk tem raso e fundo");
  assert.ok(deep < shallow - 0.004, `fundo ${deep} mais escuro que raso ${shallow}`);
});

test("a água escurece com a profundidade e as cores são as do lago de antes", () => {
  const lums = [0, 0.1, 0.2, 0.35, 0.5, 0.75, 1].map(d => luma(...waterColor(d)));
  for (let i = 1; i < lums.length; i++) assert.ok(lums[i]! <= lums[i - 1]!, `profundidade ${i}`);
  assert.deepEqual(waterColor(0), [0x2b, 0x3b, 0x3d]);
  assert.deepEqual(waterColor(1), [0x0d, 0x12, 0x1a]);
  assert.deepEqual(waterColor(Number.NaN), waterColor(0));
  assert.deepEqual(waterColor(9), waterColor(1));
  assert.deepEqual(lerpColor(SHALLOW, MUD_WET, 0), SHALLOW);
  assert.deepEqual(lerpColor(SHALLOW, MUD_WET, 5), MUD_WET);
});

test("o sombreamento é puro e estável, e sem lago por perto não pinta nada", () => {
  const first = shadeBlackLake(...FULL, SEED, lakeAtChunk(...FULL));
  assert.equal(first.length, LAKE_SIZE * LAKE_SIZE * 4);
  assert.equal(LAKE_SIZE * LAKE_STEP, CHUNK_PIXELS);
  assert.deepEqual(shadeBlackLake(...FULL, SEED, lakeAtChunk(...FULL)), first);
  assert.notDeepEqual(shadeBlackLake(...FULL, SEED + 1, lakeAtChunk(...FULL)), first, "a semente muda o brilho e a profundidade");
  const none = shadeBlackLake(...VILLAGE, SEED, lakeAtChunk(...VILLAGE));
  assert.equal(none.every(v => v === 0), true, "transparente em chunk sem água");
});

test("no meio do lago a água é opaca, escura e com profundidade; nada é lama", () => {
  const data = shadeBlackLake(...FULL, SEED, lakeAtChunk(...FULL));
  let min = 1, max = 0;
  for (let j = 8; j < LAKE_SIZE - 8; j += 3) for (let i = 8; i < LAKE_SIZE - 8; i += 3) {
    const [r, g, b, a] = at(data, i, j);
    assert.equal(a, 255, `${i},${j}`);
    const l = luma(r, g, b);
    assert.ok(l < 0.25, `água escura em ${i},${j}: ${l}`);
    min = Math.min(min, l); max = Math.max(max, l);
  }
  assert.ok(max - min > 0.02, "a água não é chapada: " + (max - min));
});

/** Primeira coluna de água (alfa pleno) numa linha, a partir da terra; a lama nunca passa de 82 % de opacidade. */
const isWaterPixel = (data: Uint8ClampedArray, i: number, j: number): boolean => at(data, i, j)[3] >= 250;

test("a costa fica perto da borda do tile (a colisão) e a terra longe do lago não recebe nada", () => {
  let boundaries = 0, farLand = 0, deepWater = 0;
  for (const chunk of [[5, 973], [3, 973], [3, 972], [6, 974], [5, 975], [6, 975], [5, 972]] as const) {
    const lakeAt = lakeAtChunk(...chunk), data = shadeBlackLake(...chunk, SEED, lakeAt);
    for (let ly = 0; ly < CHUNK_TILES; ly++) for (let lx = 0; lx < CHUNK_TILES; lx++) {
      const ci = Math.round(((lx + 0.5) * TILE_SIZE) / LAKE_STEP), cj = Math.round(((ly + 0.5) * TILE_SIZE) / LAKE_STEP);
      let around = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (lakeAt(lx + dx, ly + dy)) around++;
      if (lakeAt(lx, ly) && around === 9) { deepWater++; assert.ok(isWaterPixel(data, ci, cj), `centro de água em ${chunk} ${lx},${ly}`); }
      if (!lakeAt(lx, ly) && around === 0) { farLand++; assert.equal(at(data, ci, cj)[3], 0, `terra seca em ${chunk} ${lx},${ly}`); }
      // Costa reta na vertical: água à esquerda, terra à direita, igual acima e abaixo.
      if (lakeAt(lx, ly) && !lakeAt(lx + 1, ly) && lakeAt(lx, ly - 1) && !lakeAt(lx + 1, ly - 1) && lakeAt(lx, ly + 1) && !lakeAt(lx + 1, ly + 1)) {
        const edge = ((lx + 1) * TILE_SIZE) / LAKE_STEP;
        let last = -1;
        for (let i = Math.max(0, Math.floor(edge) - 8); i < Math.min(LAKE_SIZE, Math.ceil(edge) + 8); i++) if (isWaterPixel(data, i, cj)) last = i;
        assert.ok(last >= 0, `água na costa de ${chunk} ${lx},${ly}`);
        assert.ok(Math.abs((last + 1) * LAKE_STEP - (lx + 1) * TILE_SIZE) <= 14, `a costa de ${chunk} ${lx},${ly} está em ${(last + 1) * LAKE_STEP}, a borda em ${(lx + 1) * TILE_SIZE}`);
        boundaries++;
      }
    }
  }
  assert.ok(boundaries >= 3 && farLand >= 20 && deepWater >= 20, `${boundaries}/${farLand}/${deepWater}`);
});

test("a lama existe só na margem, junto da água e mais escura perto dela", () => {
  const lakeAt = lakeAtChunk(...COAST), data = shadeBlackLake(...COAST, SEED, lakeAt);
  let mud = 0, darker = 0, pairs = 0;
  for (let j = 0; j < LAKE_SIZE; j++) for (let i = 0; i < LAKE_SIZE; i++) {
    const [r, g, b, a] = at(data, i, j);
    if (a > 0 && a < 250) {
      mud++;
      // Lama pura (sem água por cima) é marrom: vermelho acima de verde e de azul, nunca o azul-tinta da água.
      if (a < 190) assert.ok(r > g && g > b, `lama marrom em ${i},${j}: ${r},${g},${b}`);
      const lx = Math.floor((i * LAKE_STEP) / TILE_SIZE), ly = Math.floor((j * LAKE_STEP) / TILE_SIZE);
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (lakeAt(lx + dx, ly + dy)) { near = true; break; }
      assert.ok(near, `lama longe da água em ${lx},${ly}`);
    }
  }
  assert.ok(mud > 200, "há lama na margem: " + mud);
  // Em linha reta saindo da água para a terra, a lama clareia (seca) conforme se afasta.
  for (let ly = 0; ly < CHUNK_TILES; ly++) for (let lx = 0; lx < CHUNK_TILES - 3; lx++) {
    if (!(lakeAt(lx, ly) && !lakeAt(lx + 1, ly) && !lakeAt(lx + 2, ly) && !lakeAt(lx + 3, ly))) continue;
    const j = Math.round(((ly + 0.5) * TILE_SIZE) / LAKE_STEP), near = at(data, Math.round(((lx + 1.2) * TILE_SIZE) / LAKE_STEP), j), far = at(data, Math.round(((lx + 2.4) * TILE_SIZE) / LAKE_STEP), j);
    if (near[3] > 0 && far[3] > 0) { pairs++; if (luma(near[0], near[1], near[2]) <= luma(far[0], far[1], far[2])) darker++; }
  }
  assert.ok(pairs >= 2 && darker === pairs, `mais escura junto da água: ${darker}/${pairs}`);
});

test("o fio de luz fica só na linha d'água, fino e do lado de dentro", () => {
  const data = shadeBlackLake(...COAST, SEED, lakeAtChunk(...COAST));
  let rim = 0, water = 0;
  for (let j = 0; j < LAKE_SIZE; j++) for (let i = 0; i < LAKE_SIZE; i++) {
    const [, g, b, a] = at(data, i, j);
    if (a < 150) continue;
    if (a >= 250) water++;
    if (b > g + 15) rim++;
  }
  assert.ok(rim > 20, "há um fio claro arroxeado: " + rim);
  assert.ok(rim / water < 0.08, "e ele é fino: " + rim / water);
});

test("chunks vizinhos se encaixam: o salto na emenda nunca passa do maior salto dentro do chunk", () => {
  const a = shadeBlackLake(4, 974, SEED, lakeAtChunk(4, 974)), b = shadeBlackLake(5, 974, SEED, lakeAtChunk(5, 974));
  const c = shadeBlackLake(4, 973, SEED, lakeAtChunk(4, 973));
  const jump = (p: [number, number, number, number], q: [number, number, number, number]): number =>
    Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]), Math.abs(p[3] - q[3]));
  let inner = 0, innerV = 0, seam = 0, seamV = 0;
  for (let k = 0; k < LAKE_SIZE; k++) {
    for (let i = 0; i < LAKE_SIZE - 1; i++) { inner = Math.max(inner, jump(at(a, i, k), at(a, i + 1, k))); innerV = Math.max(innerV, jump(at(a, k, i), at(a, k, i + 1))); }
    seam = Math.max(seam, jump(at(a, LAKE_SIZE - 1, k), at(b, 0, k)));
    seamV = Math.max(seamV, jump(at(c, k, LAKE_SIZE - 1), at(a, k, 0)));
  }
  assert.ok(inner > 0 && innerV > 0, "o chunk tem variação");
  assert.ok(seam <= inner, `emenda horizontal ${seam} contra ${inner}`);
  assert.ok(seamV <= innerV, `emenda vertical ${seamV} contra ${innerV}`);
});

test("a camada do chunk devolve null sem lago por perto e sem Canvas completo, e é montada com o sombreamento", () => {
  const recorders: Recorder[] = [];
  const full = (r: Recorder): CanvasRenderingContext2D => new Proxy(r.ctx, { get(t, p) {
    if (p === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (v as (...x: unknown[]) => unknown).bind(t) : v; } });
  const doc = { createElement: () => { const r = new Recorder(); recorders.push(r); return { width: 0, height: 0, getContext: () => full(r) }; } };
  assert.equal(withDocument(doc, () => blackLakeLayerCanvas(...VILLAGE, SEED, lakeAtChunk(...VILLAGE))), null);
  assert.equal(recorders.length, 0, "nem cria canvas sem lago");
  const noImageData = { createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }) };
  assert.equal(withDocument(noImageData, () => blackLakeLayerCanvas(...FULL, SEED, lakeAtChunk(...FULL))), null);
  // Lago só na margem de 2 tiles do chunk também conta (a costa cruza a emenda).
  const edgeOnly: LakeAt = (lx, ly) => lx === -2 && ly === 5;
  assert.notEqual(withDocument(doc, () => blackLakeLayerCanvas(0, 0, SEED, edgeOnly)), null);
  const outer: LakeAt = (lx, ly) => lx === -3 && ly === 5;
  assert.equal(withDocument(doc, () => blackLakeLayerCanvas(0, 0, SEED, outer)), null, "mais longe que a margem não conta");
});

test("o chunk com lago ganha a camada sobre o chão; sem lago ela nunca é montada", () => {
  const lake = paintChunk(...COAST, SEED), village = paintChunk(...VILLAGE, SEED);
  const shade = [...shadeBlackLake(...COAST, SEED, lakeAtChunk(...COAST)).slice(0, 64)].join(",");
  assert.ok(lake.puts.map(p => p.join(",")).includes(shade), "o sombreamento do lago é gravado");
  assert.equal(village.puts.some(p => p.join(",") === shade), false);
  const layerDraws = (r: typeof lake): number => r.draws.filter(d => d.args.length === 2 && d.args[0] === 0 && d.args[1] === 0 && d.alpha === 1).length;
  assert.equal(layerDraws(village), 0);
  assert.ok(layerDraws(lake) >= 1, "e a camada é desenhada no chunk, com opacidade plena");
  assert.ok(lake.puts.length > village.puts.length, "só o chunk com lago monta a camada");
});

test("o terreno usa a camada do lago e não pinta mais a lama tile por tile", () => {
  const source = readFileSync("src/render/terrain.ts", "utf8");
  assert.match(source, /blackLakeLayerCanvas\(cx, cy, seed,/);
  assert.match(source, /t\.ground === "water" && t\.biome === "black-lake"/);
  assert.ok(source.indexOf("blackLakeLayerCanvas(") < source.indexOf("drawDetails(ctx, grid, x, y,"), "a camada vem antes dos detalhes por tile");
  assert.equal(/BLACK_DEEP|BLACK_MID|BLACK_SHALLOW/.test(source), false, "as cores do lago saíram do terreno");
  assert.match(readFileSync("src/world/terrain.ts", "utf8"), /blackLakeNoise\(tx, ty, seed\) > BLACK_LAKE_THRESHOLD/);
});

test("a espuma do lago negro recua nas pontas para não passar pelas quinas arredondadas", () => {
  const source = readFileSync("src/render/WorldRenderer.ts", "utf8");
  assert.match(source, /const inset = black \? 8 : 0;/);
  assert.equal((source.match(/x0 \+ inset|y0 \+ inset|x0 \+ S - inset|y0 \+ S - inset/g) ?? []).length, 8, "as quatro arestas, as duas pontas");
});
