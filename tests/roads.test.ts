import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CHUNK_TILES } from "../src/world/terrain.ts";
import { GAUGE_TILES, LANE_TILES, ROAD_MARGIN, buildRoadMask, edgeFor, planRoadTile, roadProfile, rutPositions,
  rutShift, rutStrength, type NeighbourGround, type RoadMask, type RoadPiece, type RoadProfile, type WheelRutPiece } from "../src/render/roads/index.ts";
import { paintChunk, withDocument } from "./helpers/paintChunk.ts";
import { ROAD_SPRITE_LIMIT, VARIATION_LEVELS, clearRoadSprites, quantizeVariation, roadSprite, roadSpriteCount, roadSpriteKeys } from "../src/render/roads/index.ts";
import { drawRoadStones, drawRoadVerge, drawWheelRut } from "../src/render/roads/index.ts";
import { Recorder } from "./helpers/recordingContext.ts";

/**
 * Estradas, trilhas e marcas de roda (ADR 0034): a direção e a largura vêm da própria estrada, as marcas correm
 * ao longo dela e se emendam de um tile ao outro. Quase tudo é puro; o resto roda o chunk inteiro num Canvas gravador.
 */
const SEED = 842136;

/** Estrada sintética: `rows` desenham o mapa ("#" estrada) com a origem no tile (0, 0). */
function roadFrom(rows: readonly string[]): RoadMask {
  return { at: (lx, ly) => rows[ly]?.[lx] === "#" };
}
const column = (x0: number, width: number, height = 40): string[] =>
  Array.from({ length: height }, () => ".".repeat(x0) + "#".repeat(width) + ".".repeat(30));
const row = (y0: number, width: number, length = 60): string[] =>
  Array.from({ length: y0 + width + 12 }, (_, y) => (y >= y0 && y < y0 + width ? "#" : ".").repeat(length));

test("cada assunto das estradas está no seu arquivo", () => {
  const files = readdirSync(new URL("../src/render/roads/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["index", "lanes", "mask", "plan", "profile", "roadStones", "roadVerge", "sprites", "surface", "types", "wheelRut", "wobble"]);
});

test("a máscara cobre o chunk e uma margem, na orientação certa, e nada fora dela", () => {
  const asked: Array<[number, number]> = [];
  const mask = buildRoadMask(3, -2, CHUNK_TILES, (tx, ty) => { asked.push([tx, ty]); return tx === 48 && ty === -32 + 5; });
  assert.equal(asked.length, (CHUNK_TILES + ROAD_MARGIN * 2) ** 2);
  assert.deepEqual(asked[0], [3 * CHUNK_TILES - ROAD_MARGIN, -2 * CHUNK_TILES - ROAD_MARGIN], "começa na margem noroeste");
  assert.deepEqual(asked.at(-1), [4 * CHUNK_TILES + ROAD_MARGIN - 1, -1 * CHUNK_TILES + ROAD_MARGIN - 1]);
  assert.equal(mask.at(0, 5), true, "tile local (0, 5) = global (48, -27)");
  assert.equal(mask.at(1, 5), false);
  assert.equal(mask.at(0, 4), false);
  for (const [lx, ly] of [[-ROAD_MARGIN - 1, 0], [0, -ROAD_MARGIN - 1], [CHUNK_TILES + ROAD_MARGIN, 0], [0, CHUNK_TILES + ROAD_MARGIN]] as const)
    assert.equal(mask.at(lx, ly), false, `fora da máscara (${lx}, ${ly})`);
});

test("o perfil acha a direção e a largura, mesmo nas estradas largas em que o meio tem todos os vizinhos", () => {
  for (const width of [1, 2, 3, 4, 5, 6, 8]) {
    const vertical = roadFrom(column(10, width)), horizontal = roadFrom(row(10, width));
    for (let k = 0; k < width; k++) {
      const v = roadProfile(vertical, 10 + k, 20), h = roadProfile(horizontal, 25, 10 + k);
      assert.deepEqual([v.axis, v.widthTiles, v.offsetTiles], ["vertical", width, k - (width - 1) / 2], `vertical largura ${width} coluna ${k}`);
      assert.deepEqual([h.axis, h.widthTiles, h.offsetTiles], ["horizontal", width, k - (width - 1) / 2], `horizontal largura ${width} linha ${k}`);
    }
  }
  assert.equal(roadProfile(roadFrom(column(10, 3)), 5, 20).axis, "patch", "fora da estrada não há perfil");
});

test("cruzamento, ponta e curva não têm direção, e estrada mais larga que o alcance vira cruzamento", () => {
  const cross = roadFrom(Array.from({ length: 40 }, (_, y) => (y >= 18 && y < 21 ? "#".repeat(40) : ".".repeat(10) + "###" + ".".repeat(27))));
  assert.equal(roadProfile(cross, 11, 19).axis, "junction", "o centro do cruzamento");
  assert.equal(roadProfile(cross, 11, 5).axis, "vertical", "longe do cruzamento a estrada volta a ter direção");
  assert.equal(roadProfile(cross, 30, 19).axis, "horizontal");
  const end = roadFrom(Array.from({ length: 40 }, (_, y) => (y < 3 ? "#".repeat(3) : ".".repeat(3)).padEnd(40, ".")));
  assert.equal(roadProfile(end, 1, 1).axis, "patch", "um bloco curto não corre para lado nenhum");
  const wide = roadProfile(roadFrom(column(5, ROAD_MARGIN * 2 + 3)), 15, 20);
  assert.equal(wide.axis, "junction", "além do alcance de medida não se arrisca uma direção");
});

test("as faixas de roda: duas rodas por faixa, simétricas, dentro da estrada e emendadas por construção", () => {
  assert.deepEqual(rutPositions(3), [-GAUGE_TILES, GAUGE_TILES]);
  assert.deepEqual(rutPositions(1), [-GAUGE_TILES, GAUGE_TILES]);
  assert.equal(rutPositions(6).length, 4, "estrada larga tem duas faixas");
  assert.equal(rutPositions(9).length, 6, "e as mais largas, três");
  assert.equal(LANE_TILES, 3);
  for (const width of [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]) {
    const positions = rutPositions(width);
    assert.deepEqual(positions.map(p => +(-p).toFixed(9)).sort((a, b) => a - b), positions.map(p => +p.toFixed(9)).sort((a, b) => a - b), `simétrica na largura ${width}`);
    for (const p of positions) assert.ok(Math.abs(p) < width / 2, `dentro da estrada (${p}, largura ${width})`);
    assert.deepEqual(rutPositions(width), positions, "mesma largura, mesmas posições");
  }
  assert.deepEqual(rutPositions(Number.NaN), rutPositions(1));
  assert.deepEqual(rutPositions(-4), rutPositions(1));
});

test("a ondulação e a intensidade são contínuas e a marca é firme, com poucas falhas", () => {
  let worstShift = 0, worstStrength = 0, gaps = 0, strong = 0, samples = 0;
  for (let line = 0; line < 12; line++) {
    const lateral = line * 1.7 + 0.5;
    let previous = [rutShift(0, lateral, SEED), rutStrength(0, lateral, SEED)] as const;
    for (let k = 1; k <= 4000; k++) {
      const along = k * 0.05, shift = rutShift(along, lateral, SEED), strength = rutStrength(along, lateral, SEED);
      assert.ok(Math.abs(shift) <= 1.7 + 1e-9, "desvio limitado a ±1,7 px");
      assert.ok(strength >= 0 && strength <= 1);
      worstShift = Math.max(worstShift, Math.abs(shift - previous[0]));
      worstStrength = Math.max(worstStrength, Math.abs(strength - previous[1]));
      if (strength < 0.05) gaps++;
      if (strength > 0.55) strong++;
      samples++;
      previous = [shift, strength];
    }
  }
  assert.ok(worstShift < 0.12, `salto de desvio ${worstShift.toFixed(3)}`);
  assert.ok(worstStrength < 0.2, `salto de intensidade ${worstStrength.toFixed(3)}`);
  assert.ok(gaps / samples > 0.03 && gaps / samples < 0.22, `falhas ${(gaps / samples).toFixed(3)} (raras, mas existem)`);
  assert.ok(strong / samples > 0.55, `trechos firmes ${(strong / samples).toFixed(2)}`);
  assert.equal(rutShift(3.3, 4.4, SEED), rutShift(3.3, 4.4, SEED));
  assert.notEqual(rutShift(3.3, 4.4, SEED), rutShift(3.3, 4.4, SEED + 1));
});

const NEIGHBOURS: readonly NeighbourGround[] = ["path", "path", "path", "path"];
const tileInput = (profile: RoadProfile, tx: number, ty: number, over: Partial<{ neighbours: readonly NeighbourGround[]; sandy: boolean }> = {}) =>
  ({ profile, tx, ty, seed: SEED, neighbours: over.neighbours ?? NEIGHBOURS, sandy: over.sandy ?? false });
const ruts = (pieces: RoadPiece[]): WheelRutPiece[] => pieces.filter((p): p is WheelRutPiece => p.kind === "rut");

test("as marcas correm ao longo da estrada: eixo y na vertical, x na horizontal, e nenhuma em cruzamento ou ponta", () => {
  let vertical = 0, horizontal = 0;
  for (let ty = 100; ty < 160; ty++) {
    const v = ruts(planRoadTile(tileInput({ axis: "vertical", widthTiles: 3, offsetTiles: 0 }, 5, ty)));
    const h = ruts(planRoadTile(tileInput({ axis: "horizontal", widthTiles: 3, offsetTiles: 0 }, ty, 5)));
    assert.ok(v.every(r => r.axis === "y") && h.every(r => r.axis === "x"));
    vertical += v.length; horizontal += h.length;
    for (const axis of ["junction", "patch"] as const)
      assert.deepEqual(ruts(planRoadTile(tileInput({ axis, widthTiles: 3, offsetTiles: 0 }, 5, ty))), [], axis + " não tem marca");
  }
  assert.ok(vertical > 60 && horizontal > 60, `marcas ${vertical}/${horizontal}`);
});

test("sem costura: tiles vizinhos da mesma estrada se emendam (mesma posição, mesmo desvio e mesma intensidade na junção)", () => {
  for (const width of [3, 4, 6]) for (let ty = 200; ty < 260; ty++) {
    const mid = (width - 1) / 2;
    for (let col = 0; col < width; col++) {
      const profile: RoadProfile = { axis: "vertical", widthTiles: width, offsetTiles: col - mid };
      const upper = ruts(planRoadTile(tileInput(profile, 7 + col, ty))), lower = ruts(planRoadTile(tileInput(profile, 7 + col, ty + 1)));
      for (const a of upper) {
        const b = lower.find(r => Math.abs(r.across - a.across) < 1e-6);
        if (a.fadeB < 0.02) continue;
        assert.ok(b, `a marca em ${a.across.toFixed(2)} continua no tile de baixo (largura ${width})`);
        assert.ok(Math.abs(a.shiftB - b.shiftA) < 1e-9 && Math.abs(a.fadeB - b.fadeA) < 1e-9, "valores iguais na emenda");
      }
    }
    // Entre colunas vizinhas de uma estrada larga, a marca de uma está inteira e a outra não a repete.
    const marks = Array.from({ length: width }, (_, col) => ruts(planRoadTile(tileInput({ axis: "vertical", widthTiles: width, offsetTiles: col - (width - 1) / 2 }, 7 + col, ty))))
      .flatMap((list, col) => list.map(r => +(7 + col + r.across / 32).toFixed(4)));
    assert.equal(new Set(marks).size, marks.length, "nenhuma marca é desenhada em dobro");
  }
  // O mesmo na horizontal.
  const profile: RoadProfile = { axis: "horizontal", widthTiles: 3, offsetTiles: 0 };
  for (let tx = 300; tx < 340; tx++) {
    const left = ruts(planRoadTile(tileInput(profile, tx, 9))), right = ruts(planRoadTile(tileInput(profile, tx + 1, 9)));
    for (const a of left) {
      const b = right.find(r => Math.abs(r.across - a.across) < 1e-6);
      if (a.fadeB >= 0.02) { assert.ok(b); assert.ok(Math.abs(a.shiftB - b.shiftA) < 1e-9); }
    }
  }
});

test("a marca fica inteira dentro do tile, sem passar da borda, e o material segue o entorno", () => {
  for (let ty = 0; ty < 80; ty++) for (const offsetTiles of [-1, 0, 1]) {
    for (const piece of ruts(planRoadTile(tileInput({ axis: "vertical", widthTiles: 3, offsetTiles }, 3, ty)))) {
      assert.ok(piece.across > 2 && piece.across < 30, `posição ${piece.across}`);
      assert.ok(piece.fadeA >= 0 && piece.fadeA <= 1 && piece.fadeB >= 0 && piece.fadeB <= 1);
    }
  }
  const sandy = planRoadTile(tileInput({ axis: "vertical", widthTiles: 3, offsetTiles: 0 }, 5, 50, { sandy: true }));
  const earthy = planRoadTile(tileInput({ axis: "vertical", widthTiles: 3, offsetTiles: 0 }, 5, 50));
  assert.ok(sandy.every(p => p.kind === "verge" || p.surface === "sand") && earthy.every(p => p.kind === "verge" || p.surface === "earth"));
  assert.deepEqual(planRoadTile(tileInput({ axis: "vertical", widthTiles: 3, offsetTiles: 0 }, 5, 50)), earthy, "determinístico");
  assert.notDeepEqual(planRoadTile(tileInput({ axis: "vertical", widthTiles: 3, offsetTiles: 0 }, 5, 51)), earthy);
});

test("a transição aparece só nos lados que margeiam capim ou areia, e as pedras ficam dentro do tile", () => {
  assert.equal(edgeFor("grass"), "grass");
  assert.equal(edgeFor("forest"), "grass");
  assert.equal(edgeFor("sand"), "sand");
  for (const none of ["path", "water", undefined] as const) assert.equal(edgeFor(none), null, String(none));
  const verges = planRoadTile(tileInput({ axis: "patch", widthTiles: 1, offsetTiles: 0 }, 9, 9, { neighbours: ["grass", "path", "sand", "forest"] }))
    .filter(p => p.kind === "verge");
  assert.deepEqual(verges.map(p => [p.side, p.edge]), [[0, "grass"], [2, "sand"], [3, "grass"]]);
  assert.deepEqual(planRoadTile(tileInput({ axis: "patch", widthTiles: 1, offsetTiles: 0 }, 9, 9, { neighbours: ["water", "path", "path", "water"] }))
    .filter(p => p.kind === "verge"), [], "água e estrada não pedem transição");
  let withStones = 0, total = 0;
  for (let ty = 0; ty < 400; ty++) {
    const stones = planRoadTile(tileInput({ axis: "patch", widthTiles: 1, offsetTiles: 0 }, 4, ty)).filter(p => p.kind === "stones");
    total++;
    if (stones.length) withStones++;
    assert.ok(stones.length <= 3);
    for (const s of stones) assert.ok(s.x >= 3 && s.x <= 29 && s.y >= 4 && s.y <= 28);
  }
  assert.ok(withStones / total > 0.35 && withStones / total < 0.65, `tiles com pedra ${(withStones / total).toFixed(2)}`);
});

test("no chunk de verdade: a estrada vertical gira o eixo das marcas, a horizontal não, e sem estrada nada se pinta", () => {
  // (0, 18): estrada vertical do norte (x ≈ 0, y ≈ 300). (18, 0): estrada horizontal do leste (y ≈ 0, x ≈ 300). (40, 40): mata sem estrada.
  const vertical = paintChunk(0, 18, SEED), horizontal = paintChunk(18, 0, SEED), none = paintChunk(40, 40, SEED);
  const flips = (r: { transforms: number[][] }): number => r.transforms.filter(t => t.join(",") === "0,1,1,0,0,0").length;
  assert.ok(flips(vertical) > 8, `marcas verticais: ${flips(vertical)}`);
  assert.equal(flips(horizontal), 0, "estrada horizontal: as marcas já correm em x");
  assert.equal(flips(none), 0);
});

test("o desenho antigo (duas linhas horizontais fixas por tile) saiu do pintor de terreno", () => {
  const source = readFileSync("src/render/terrain.ts", "utf8");
  assert.equal(/ctx\.moveTo\(x, y \+ 11 \+ r\(200\) \* 3\)/.test(source), false);
  assert.match(source, /planRoadTile\(/);
  assert.match(source, /drawWheelRut\(ctx, piece, x, y\)/);
  assert.match(source, /drawRoadStones\(ctx, piece, x, y\)/);
  assert.match(source, /drawRoadVerge\(ctx, piece, x, y\)/);
});

test("as peças aguentam valores inválidos, equilibram o contexto e viram o eixo só na vertical", () => {
  const bad = [Number.NaN, -3, 9, Infinity];
  for (const surface of ["earth", "sand"] as const) for (const axis of ["x", "y"] as const) for (const value of bad) {
    const recorder = new Recorder();
    assert.doesNotThrow(() => {
      drawWheelRut(recorder.ctx, { kind: "rut", surface, axis, across: 16, shiftA: 0, shiftB: 0, fadeA: value, fadeB: value, variation: value }, 0, 0);
      drawRoadStones(recorder.ctx, { kind: "stones", surface, x: 10, y: 10, variation: value }, 0, 0);
      for (const side of [0, 1, 2, 3] as const) for (const edge of ["grass", "sand"] as const)
        drawRoadVerge(recorder.ctx, { kind: "verge", side, edge, variation: value }, 0, 0);
    });
    const m = recorder.metrics();
    assert.equal(m.saves, m.restores, `${surface} ${axis} ${value}`);
  }
  const flips = (axis: "x" | "y"): number => {
    const recorder = new Recorder(); let count = 0;
    const spy = new Proxy(recorder.ctx, { get(t, p) { if (p === "transform") return () => { count++; }; const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(t) : v; } });
    drawWheelRut(spy, { kind: "rut", surface: "earth", axis, across: 16, shiftA: 0, shiftB: 0, fadeA: 1, fadeB: 1, variation: .5 }, 0, 0);
    return count;
  };
  assert.deepEqual([flips("x"), flips("y")], [0, 1], "só a marca vertical troca os eixos");
});

test("as pedras são pintadas na posição delas dentro do tile, e não no canto (defeito corrigido)", () => {
  const recorder = new Recorder(); const translations: number[][] = [];
  const spy = new Proxy(recorder.ctx, { get(t, p) {
    if (p === "translate") return (...a: number[]) => { translations.push(a); };
    const v = (t as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(t) : v; } });
  drawRoadStones(spy, { kind: "stones", surface: "earth", x: 10, y: 7, variation: .3 }, 64, 96);
  assert.deepEqual(translations[0], [74, 103], "tile (64, 96) + posição (10, 7)");
  translations.length = 0;
  drawRoadStones(spy, { kind: "stones", surface: "sand", x: 26.5, y: 4, variation: .8 }, 0, 0);
  assert.deepEqual(translations[0], [26.5, 4]);
});

test("a variação é arredondada em níveis fixos, e o sprite de uma peça é pintado uma vez por chave", () => {
  assert.equal(VARIATION_LEVELS, 24);
  const levels = new Set<number>();
  for (let i = 0; i <= 1000; i++) {
    const q = quantizeVariation(i / 1000);
    assert.ok(q > 0 && q < 1);
    levels.add(q);
  }
  assert.equal(levels.size, VARIATION_LEVELS);
  assert.equal(quantizeVariation(Number.NaN), quantizeVariation(0.5));
  assert.equal(quantizeVariation(-4), quantizeVariation(0));
  assert.equal(quantizeVariation(7), quantizeVariation(1));
  assert.equal(quantizeVariation(0.5), quantizeVariation(0.51));

  clearRoadSprites();
  let painted = 0;
  const doc = { createElement: () => ({ width: 0, height: 0, getContext: () => ({}) }) };
  withDocument(doc, () => {
    const a = roadSprite("k1", 32, 32, () => { painted++; });
    assert.equal(roadSprite("k1", 32, 32, () => { painted++; }), a, "a mesma chave devolve o mesmo sprite");
    assert.notEqual(roadSprite("k2", 32, 32, () => { painted++; }), a);
    assert.equal(painted, 2, "cada chave é pintada uma vez");
    assert.deepEqual([a!.width, a!.height], [32, 32]);
    // Teto: passando do limite, o mais antigo sai e volta a ser pintado se for pedido de novo.
    for (let i = 0; i < ROAD_SPRITE_LIMIT + 5; i++) roadSprite("lote" + i, 8, 8, () => {});
    assert.equal(roadSpriteCount(), ROAD_SPRITE_LIMIT);
    const before = painted;
    roadSprite("k1", 32, 32, () => { painted++; });
    assert.equal(painted, before + 1, "o mais antigo foi descartado");
  });
  clearRoadSprites();
  assert.equal(roadSpriteCount(), 0);
  assert.equal(withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => null }) }, () => roadSprite("sem-ctx", 8, 8, () => { throw new Error("não deveria pintar"); })), null);
  assert.equal(roadSpriteCount(), 0, "sem Canvas nada é guardado");
});

test("no chunk de estrada, pedras e bordas saem do cache e o segundo desenho não cria sprites novos", () => {
  clearRoadSprites();
  // A estrada do norte (x de -2 a 2) é cortada entre o chunk -1 (margem oeste) e o 0 (margem leste).
  const painted = { draws: [...paintChunk(0, 18, SEED).draws, ...paintChunk(-1, 18, SEED).draws] };
  const first = roadSpriteCount();
  assert.ok(first > 10 && first <= ROAD_SPRITE_LIMIT, `sprites criados: ${first}`);
  const keys = roadSpriteKeys();
  // Estrada vertical: margens a leste e a oeste, nunca ao norte ou ao sul, e as pedras do leito de terra.
  assert.ok(keys.some(k => k.startsWith("verge:grass:1:")) && keys.some(k => k.startsWith("verge:grass:3:")), "bordas leste e oeste");
  assert.equal(keys.some(k => k.startsWith("verge:grass:0:") || k.startsWith("verge:grass:2:")), false, "sem borda ao norte nem ao sul");
  assert.ok(keys.some(k => k.startsWith("stones:earth:")));
  // Cada sprite criado é de fato desenhado no chunk (32 px as bordas, 48 px as pedras).
  const spriteDraws = painted.draws.filter(d => { const i = d.image as { width?: number } | null; return i?.width === 32 || i?.width === 48; });
  assert.ok(spriteDraws.length >= keys.length, `sprites desenhados ${spriteDraws.length} para ${keys.length} criados`);
  assert.ok(new Set(spriteDraws.map(d => d.image)).size >= keys.length - 2, "cada sprite criado aparece desenhado");
  paintChunk(0, 18, SEED);
  paintChunk(-1, 18, SEED);
  assert.equal(roadSpriteCount(), first, "os mesmos chunks reaproveitam tudo");
  clearRoadSprites();
  paintChunk(40, 40, SEED);
  assert.equal(roadSpriteCount(), 0, "chunk sem estrada não cria sprite");
});
