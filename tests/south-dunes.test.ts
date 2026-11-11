import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CHUNK_PIXELS, CHUNK_TILES, TILE_SIZE, getTile } from "../src/world/terrain.ts";
import { generateChunkCanvas } from "../src/render/terrain.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { DUNES_LOOK, DUNE_ACROSS, DUNE_LIGHT, HARDPAN_LOOK, RAMP_STEPS, SHADE_SIZE, duneHeight, duneReliefCanvas,
  rippleHeight, sandColor, shadeDuneRelief } from "../src/render/south/terrain/dunes/index.ts";

/**
 * Relevo das dunas do Sul (ADR 0033): campo de altura contínuo, sombreamento com luz de noroeste e a camada
 * por chunk. Tudo puro até a última etapa (o canvas), então dá para provar a forma sem navegador.
 */
const SEED = 842136;
const luma = (r: number, g: number, b: number): number => r * .2126 + g * .7152 + b * .0722;
const pixel = (data: Uint8ClampedArray, i: number, j: number): [number, number, number] =>
  [data[(j * SHADE_SIZE + i) * 4]!, data[(j * SHADE_SIZE + i) * 4 + 1]!, data[(j * SHADE_SIZE + i) * 4 + 2]!];

test("cada assunto do relevo está no seu arquivo", () => {
  const files = readdirSync(new URL("../src/render/south/terrain/dunes/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["field", "index", "palette", "relief", "shade"]);
});

test("o campo de altura é determinístico, limitado e depende da semente", () => {
  let min = Infinity, max = -Infinity, differs = 0;
  for (let i = 0; i < 4000; i++) {
    const tx = (i % 80) * 1.7 - 40, ty = Math.floor(i / 80) * 1.9 + 15500;
    const h = duneHeight(tx, ty, SEED);
    assert.equal(h, duneHeight(tx, ty, SEED));
    assert.ok(Number.isFinite(h));
    min = Math.min(min, h); max = Math.max(max, h);
    if (h !== duneHeight(tx, ty, SEED + 1)) differs++;
    assert.ok(Math.abs(rippleHeight(tx, ty, SEED)) <= 0.0067, "ondulação fina é só um detalhe");
  }
  assert.ok(min > -0.15 && max < 1.4, `faixa ${min.toFixed(2)}..${max.toFixed(2)}`);
  assert.ok(max - min > 0.7, "há dunas de verdade, não um plano");
  assert.ok(differs > 3900, "outra semente dá outro deserto");
});

test("a duna é assimétrica: sobe devagar pelo lado do vento e cai rápido na face de deslizamento", () => {
  let rising = 0, falling = 0, steepFall = 0, steepRise = 0;
  const step = 0.1;
  for (let line = 0; line < 20; line++) {
    const ox = line * 37.3, oy = 15500 + line * 11.1;
    let previous = duneHeight(ox, oy, SEED);
    for (let k = 1; k < 400; k++) {
      const h = duneHeight(ox + DUNE_ACROSS.x * k * step, oy + DUNE_ACROSS.y * k * step, SEED);
      const slope = (h - previous) / step;
      if (slope > 0) { rising++; steepRise = Math.max(steepRise, slope); } else { falling++; steepFall = Math.max(steepFall, -slope); }
      previous = h;
    }
  }
  // Simétrica daria 0,50; o perfil de 72 % / 28 % chega perto de 0,57 com o ruído e as dunas menores.
  assert.ok(rising / (rising + falling) > 0.55, `trechos de subida ${(rising / (rising + falling)).toFixed(2)}`);
  assert.ok(steepFall > steepRise * 1.2, `queda mais íngreme que a subida (${steepFall.toFixed(2)} × ${steepRise.toFixed(2)})`);
});

test("o sombreamento é determinístico, opaco e usa só as cores da rampa", () => {
  const a = shadeDuneRelief(1, 977, SEED), b = shadeDuneRelief(1, 977, SEED);
  assert.equal(a.length, SHADE_SIZE * SHADE_SIZE * 4);
  assert.deepEqual([...a.slice(0, 4000)], [...b.slice(0, 4000)]);
  assert.notDeepEqual([...a.slice(0, 4000)], [...shadeDuneRelief(1, 977, SEED + 1).slice(0, 4000)]);
  const palette = new Set(DUNES_LOOK.ramp.map(c => c.join(",")));
  for (let k = 0; k < a.length; k += 4 * 97) {
    assert.equal(a[k + 3], 255);
    assert.ok(palette.has([a[k], a[k + 1], a[k + 2]].join(",")), "cor fora da rampa");
  }
  assert.equal(CHUNK_PIXELS / SHADE_SIZE, 4, "uma amostra a cada 4 px");
});

test("o campo é contínuo em qualquer ponto: nenhum salto ao longo de linhas longas nos dois eixos", () => {
  const step = 0.05;
  let worst = 0, at = "";
  for (const [fx, fy, ox, oy] of [[1, 0, -300, 15500], [0, 1, 40, 15200], [1, 0.37, -900, 15900], [0.6, 1, 700, 15300]] as const)
    for (let k = 1; k <= 24000; k++) {
      const x0 = ox + fx * (k - 1) * step, y0 = oy + fy * (k - 1) * step, x1 = ox + fx * k * step, y1 = oy + fy * k * step;
      const jump = Math.abs((duneHeight(x1, y1, SEED) + rippleHeight(x1, y1, SEED)) - (duneHeight(x0, y0, SEED) + rippleHeight(x0, y0, SEED)));
      if (jump > worst) { worst = jump; at = `${x1.toFixed(2)},${y1.toFixed(2)}`; }
    }
  assert.ok(worst < 0.06, `maior salto ${worst.toFixed(3)} em ${at}`);
});

test("sem costura: o sombreamento de chunks vizinhos se encaixa na borda", () => {
  const left = shadeDuneRelief(3, 977, SEED), right = shadeDuneRelief(4, 977, SEED);
  const below = shadeDuneRelief(3, 978, SEED);
  const colour = (data: Uint8ClampedArray, i: number, j: number): number => luma(...pixel(data, i, j));
  let seam = 0, inner = 0, seamV = 0, innerV = 0;
  for (let j = 0; j < SHADE_SIZE; j++) {
    seam += Math.abs(colour(left, SHADE_SIZE - 1, j) - colour(right, 0, j));
    inner += Math.abs(colour(left, SHADE_SIZE - 2, j) - colour(left, SHADE_SIZE - 1, j));
  }
  for (let i = 0; i < SHADE_SIZE; i++) {
    seamV += Math.abs(colour(left, i, SHADE_SIZE - 1) - colour(below, i, 0));
    innerV += Math.abs(colour(left, i, SHADE_SIZE - 2) - colour(left, i, SHADE_SIZE - 1));
  }
  assert.ok(seam <= inner * 1.35 + 20, `costura horizontal ${seam.toFixed(0)} × interno ${inner.toFixed(0)}`);
  assert.ok(seamV <= innerV * 1.35 + 20, `costura vertical ${seamV.toFixed(0)} × interno ${innerV.toFixed(0)}`);
});

test("a luz vem de noroeste: o lado voltado para ela é mais claro que o lado de sombra", () => {
  assert.ok(DUNE_LIGHT.x < 0 && DUNE_LIGHT.y < 0, "luz de noroeste, como no resto do jogo");
  const data = shadeDuneRelief(2, 977, SEED);
  const unit = 1 / (TILE_SIZE / 4), originX = 2 * CHUNK_TILES, originY = 977 * CHUNK_TILES;
  let lit = 0, litN = 0, dark = 0, darkN = 0;
  for (let j = 4; j < SHADE_SIZE - 4; j += 3) for (let i = 4; i < SHADE_SIZE - 4; i += 3) {
    const tx = originX + i * unit, ty = originY + j * unit;
    const gx = (duneHeight(tx + unit, ty, SEED) - duneHeight(tx - unit, ty, SEED)) / (2 * unit);
    const gy = (duneHeight(tx, ty + unit, SEED) - duneHeight(tx, ty - unit, SEED)) / (2 * unit);
    const facing = -(gx * DUNE_LIGHT.x + gy * DUNE_LIGHT.y);
    const l = luma(...pixel(data, i, j));
    if (facing > 0.08) { lit += l; litN++; } else if (facing < -0.08) { dark += l; darkN++; }
  }
  assert.ok(litN > 100 && darkN > 100, `amostras ${litN}/${darkN}`);
  assert.ok(lit / litN > dark / darkN + 15, `claro ${(lit / litN).toFixed(0)} × sombra ${(dark / darkN).toFixed(0)}`);
});

test("as rampas vão da sombra ao realce, e a terra batida é mais cinza e mais suave que a duna", () => {
  for (const look of [DUNES_LOOK, HARDPAN_LOOK]) {
    assert.equal(look.ramp.length, RAMP_STEPS);
    const lumas = look.ramp.map(c => luma(...c));
    assert.deepEqual([...lumas].sort((a, b) => a - b), lumas, "do escuro ao claro, sem inversão");
    assert.ok(lumas[RAMP_STEPS - 1]! - lumas[0]! > 60, "contraste suficiente para ler a forma");
  }
  const saturation = ([r, g, b]: readonly [number, number, number]): number => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);
  const mid = (look: typeof DUNES_LOOK) => look.ramp[RAMP_STEPS >> 1]!;
  assert.ok(saturation(mid(HARDPAN_LOOK)) < saturation(mid(DUNES_LOOK)), "terra batida mais cinza");
  assert.ok(HARDPAN_LOOK.contrast < DUNES_LOOK.contrast, "e com relevo mais suave");
  assert.deepEqual(sandColor(Number.NaN), sandColor(0.5));
  assert.deepEqual(sandColor(-3), sandColor(0));
  assert.deepEqual(sandColor(9), sandColor(1));
});

/** Canvas falso mínimo: registra o que foi desenhado e guarda os pixels gravados. */
function fakeDocument(withImageData = true) {
  const log: string[] = [];
  const canvases: Array<{ width: number; height: number; put: Uint8ClampedArray | null }> = [];
  const doc = { createElement: () => {
    const canvas = { width: 0, height: 0, put: null as Uint8ClampedArray | null,
      getContext: () => ({
        ...(withImageData ? { createImageData: (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }) } : {}),
        putImageData: (image: { data: Uint8ClampedArray }) => { canvas.put = image.data; },
        drawImage: (_src: unknown, ...a: number[]) => { log.push("draw:" + a.join(",") + ":" + String(ctxState.op)); },
        set globalCompositeOperation(value: string) { ctxState.op = value; log.push("op:" + value); },
        get globalCompositeOperation() { return ctxState.op; },
        imageSmoothingEnabled: false,
      }) };
    const ctxState = { op: "source-over" };
    canvases.push(canvas);
    return canvas;
  } };
  return { doc, log, canvases };
}
function withDocument<T>(doc: object, run: () => T): T {
  const g = globalThis as Record<string, unknown>, previous = g.document;
  g.document = doc;
  try { return run(); } finally { if (previous === undefined) delete g.document; else g.document = previous; }
}

test("a camada do chunk só existe onde há duna, é recortada pelo mapa suave e some sem Canvas completo", () => {
  const none = fakeDocument();
  assert.equal(withDocument(none.doc, () => duneReliefCanvas(1, 977, SEED, DUNES_LOOK, () => false)), null, "sem duna: nada");
  assert.equal(none.canvases.length, 0, "e nem aloca canvas");
  assert.equal(withDocument(fakeDocument(false).doc, () => duneReliefCanvas(1, 977, SEED, DUNES_LOOK, () => true)), null, "sem ImageData: nada, sem erro");

  const fake = fakeDocument();
  const out = withDocument(fake.doc, () => duneReliefCanvas(1, 977, SEED, DUNES_LOOK, (lx, ly) => lx >= 4 && ly >= 0 && lx <= 9));
  assert.ok(out);
  assert.equal(out.width, CHUNK_PIXELS);
  const [small, maskSmall] = fake.canvases;
  assert.equal(small!.width, SHADE_SIZE);
  assert.deepEqual([...small!.put!.slice(0, 64)], [...shadeDuneRelief(1, 977, SEED, DUNES_LOOK).slice(0, 64)], "grava o sombreamento do chunk");
  const span = CHUNK_TILES + 2;
  assert.equal(maskSmall!.width, span);
  const alpha = (lx: number, ly: number): number => maskSmall!.put![((ly + 1) * span + (lx + 1)) * 4 + 3]!;
  assert.deepEqual([alpha(3, 5), alpha(4, 5), alpha(9, 5), alpha(10, 5), alpha(6, -1)], [0, 255, 255, 0, 0], "máscara = tiles de duna");
  // Primeiro amplia o sombreamento, depois recorta (destination-in) pelo mapa ampliado e suave, e volta ao normal.
  assert.deepEqual(fake.log, [
    `draw:0,0,${CHUNK_PIXELS},${CHUNK_PIXELS}:source-over`, "op:destination-in",
    `draw:${-TILE_SIZE},${-TILE_SIZE},${span * TILE_SIZE},${span * TILE_SIZE}:destination-in`, "op:source-over"]);
});

/** Roda `generateChunkCanvas` inteiro num Canvas gravador e devolve o que foi desenhado e a opacidade usada em cada desenho. */
function paintChunk(cx: number, cy: number): { draws: Array<{ args: unknown[]; alpha: unknown; composite: unknown }>; sets: string[]; puts: number[][] } {
  const recorder = new Recorder(), inner = recorder.ctx;
  const draws: Array<{ args: unknown[]; alpha: unknown; composite: unknown }> = [], sets: string[] = [], puts: number[][] = [];
  const state: Record<string, unknown> = { globalAlpha: 1, globalCompositeOperation: "source-over" };
  const spy = new Proxy(inner, {
    get(target, prop) {
      if (prop === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
      if (prop === "putImageData") return (image: { data: Uint8ClampedArray }) => { puts.push([...image.data.slice(0, 64)]); };
      if (prop === "drawImage") return (...args: unknown[]) => { draws.push({ args: args.slice(1), alpha: state.globalAlpha, composite: state.globalCompositeOperation }); };
      if (prop === "globalAlpha" || prop === "globalCompositeOperation") return state[prop];
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof value === "function" ? (value as (...x: unknown[]) => unknown).bind(target) : value;
    },
    set(target, prop, value) {
      if (prop === "globalAlpha" || prop === "globalCompositeOperation") { state[prop] = value; sets.push(`${String(prop)}=${String(value)}`); return true; }
      (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true;
    },
  });
  withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => spy }) }, () => generateChunkCanvas(cx, cy, SEED));
  return { draws, sets, puts };
}

test("o chunk de deserto desenha a camada de relevo com 90 % de opacidade; o chunk sem duna não a desenha", () => {
  // Um chunk de dunas e outro de terra batida (ruínas), achados no mundo desta semente.
  const find = (biome: string): [number, number] => {
    for (let cy = 960; cy < 1000; cy++) for (let cx = -20; cx < 40; cx++) {
      let n = 0;
      for (let y = 0; y < CHUNK_TILES; y += 4) for (let x = 0; x < CHUNK_TILES; x += 4) if (getTile(cx * CHUNK_TILES + x, cy * CHUNK_TILES + y, SEED).biome === biome) n++;
      if (n >= 14) return [cx, cy];
    }
    throw new Error("sem chunk de " + biome);
  };
  const [dx, dy] = find("dunes");
  const dunes = paintChunk(dx, dy);
  // Ordem: base borrada, depois o relevo (dois desenhos internos de ampliação e recorte + o desenho final), depois detalhes.
  const finalDraws = dunes.draws.filter(d => d.args.length === 2 && d.args[0] === 0 && d.args[1] === 0);
  assert.equal(finalDraws.length >= 1, true, "a camada de relevo é desenhada sobre o chunk");
  assert.ok(finalDraws.every(d => d.alpha === 0.9), "com 90 % de opacidade: " + JSON.stringify(finalDraws.map(d => d.alpha)));
  assert.ok(dunes.sets.includes("globalAlpha=0.9") && dunes.sets.includes("globalAlpha=1"), "a opacidade volta a 1 para o resto do chunk");
  assert.ok(dunes.sets.includes("globalCompositeOperation=destination-in"), "o recorte pelo mapa de duna acontece");
  assert.ok(dunes.sets.lastIndexOf("globalAlpha=1") > dunes.sets.indexOf("globalAlpha=0.9"));
  // Chunk só de terra batida (bioma "ruins", achado por varredura): recebe o relevo suave, não o de duna.
  assert.equal(getTile(13 * CHUNK_TILES + 8, 902 * CHUNK_TILES + 8, SEED).biome, "ruins");
  const hardpan = paintChunk(13, 902);
  assert.ok(hardpan.draws.some(d => d.args.length === 2 && d.args[0] === 0 && d.args[1] === 0 && d.alpha === 0.9), "a terra batida também ganha relevo");
  assert.ok(hardpan.sets.includes("globalCompositeOperation=destination-in"));
  const gravados = hardpan.puts.map(p => p.join(","));
  assert.ok(gravados.includes([...shadeDuneRelief(13, 902, SEED, HARDPAN_LOOK).slice(0, 64)].join(",")), "com o visual de terra batida");
  // Em chunk sem nenhuma duna nem terra batida (o vilarejo), o relevo nunca é montado.
  const village = paintChunk(0, 0);
  assert.equal(village.sets.includes("globalCompositeOperation=destination-in"), false, "sem duna: nenhum recorte de relevo");
  assert.equal(village.draws.some(d => d.args.length === 2 && d.args[0] === 0 && d.args[1] === 0 && d.alpha === 0.9), false);
});

test("a camada de relevo entra no chunk antes dos detalhes, com os dois biomas e sem concha no deserto", () => {
  const source = readFileSync("src/render/terrain.ts", "utf8");
  assert.match(source, /\[DUNES_LOOK, "dunes"\], \[HARDPAN_LOOK, "ruins"\]/);
  assert.ok(source.indexOf("duneReliefCanvas(") < source.indexOf("drawDetails(ctx, grid, x, y,"), "o relevo vem antes dos detalhes por tile");
  assert.equal(/tile\.biome === "dunes"\) \{\s*ctx\.strokeStyle = "rgba\(255,234,180/.test(source), false, "o traço chapado por tile saiu");
  assert.match(source, /tile\.ground === "sand" && \(tile\.biome === "dunes" \|\| tile\.biome === "ruins"\)/, "o deserto tem o seu ramo, sem concha do mar");
});
