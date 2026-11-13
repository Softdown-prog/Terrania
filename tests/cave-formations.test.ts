import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { CaveFloor } from "../src/world/caveFloor.ts";
import { caveEntranceInCell, type CaveTheme } from "../src/world/caves.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { drawCaveView } from "../src/render/cave.ts";
import { drawCaveFormation } from "../src/render/caveDetails.ts";
import { FORMATION_SHARE, formationKindFor, formationOutline, formationParts, formationPieces, type FormationKind, type FormationShape } from "../src/render/caveFormations/index.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * Formações das cavernas maiores e variadas (ADR 0053): cada formação é uma peça principal (escala, largura, inclinação e
 * silhueta próprias) e, às vezes, uma ou duas menores ao lado; ficam junto às paredes, num passe próprio do piso.
 */
const SEED = 842136;
const THEMES: readonly CaveTheme[] = ["verdant", "glacial", "desert", "coastal", "basalt", "marsh"];
const KINDS: readonly FormationKind[] = ["crystal", "root", "stone"];
const SHAPES: readonly FormationShape[] = [0, 1, 2];
const VARIATIONS = Array.from({ length: 400 }, (_, i) => (i * 0.00251 + 0.0007) % 1);
const CELLS: ReadonlyArray<readonly [number, number]> = [[60, -76], [60, -85], [75, -75], [-124, -130]];
const floorOf = (c: readonly [number, number]): CaveFloor => new CaveFloor(caveEntranceInCell(c[0], c[1], SEED)!);
const seedOf = (f: CaveFloor): number => f.entrance.seed ^ Math.imul(f.entrance.tileX, 313) ^ Math.imul(f.entrance.tileY, 971);
const balanced = (draw: (c: CanvasRenderingContext2D) => void): boolean => { const r = new Recorder(); draw(r.ctx); const m = r.metrics(); return m.saves === m.restores; };

test("cada tema tem o seu material: cristal na geada e no basalto, raiz na mata e no brejo, pedra no deserto e na costa", () => {
  assert.deepEqual(THEMES.map(formationKindFor), ["root", "crystal", "stone", "stone", "crystal", "root"]);
});

test("cada silhueta é um contorno fechado, as nove são diferentes e a alta passa da normal e a larga é mais larga", () => {
  const seen = new Set<string>();
  for (const kind of KINDS) {
    const box = (shape: FormationShape): { top: number; half: number } => {
      const s = spy(c => formationOutline(kind, shape, c));
      assert.equal(s.calls.beginPath, 1); assert.equal(s.calls.closePath, 1); assert.equal(s.calls.moveTo, 1);
      // caminha pelo contorno (retas e curvas de segundo grau) e pega os pontos de verdade, não só as pontas
      const pts: Array<readonly [number, number]> = [[s.args.moveTo![0]![0]!, s.args.moveTo![0]![1]!]];
      let cur = pts[0]!;
      const draw = new Proxy({} as CanvasRenderingContext2D, { get: (_t, name) => (...a: number[]) => {
        if (name === "lineTo") { cur = [a[0]!, a[1]!]; pts.push(cur); }
        if (name === "quadraticCurveTo") {
          for (let i = 1; i <= 12; i++) { const k = i / 12; pts.push([(1 - k) * (1 - k) * cur[0] + 2 * (1 - k) * k * a[0]! + k * k * a[2]!, (1 - k) * (1 - k) * cur[1] + 2 * (1 - k) * k * a[1]! + k * k * a[3]!]); }
          cur = [a[2]!, a[3]!];
        }
        if (name === "moveTo") { cur = [a[0]!, a[1]!]; pts[0] = cur; }
      } });
      formationOutline(kind, shape, draw);
      for (const [x, y] of pts) assert.ok(Math.abs(x) <= 13 && y <= 1 && y >= -28, `${kind} ${shape}: ${x},${y}`);
      seen.add(signature(c => formationOutline(kind, shape, c)));
      return { top: Math.min(...pts.map(p => p[1])), half: Math.max(...pts.map(p => Math.abs(p[0]))) };
    };
    const [a, b, c] = [box(0), box(1), box(2)];
    assert.ok(b.top < a.top - 4, `${kind}: a forma 1 é a alta (${b.top} contra ${a.top})`);
    assert.ok(c.half > b.half + 1.5 && c.top > b.top + 6, `${kind}: a forma 2 é a larga e baixa`);
  }
  assert.equal(seen.size, 9, "nove silhuetas diferentes");
  // as nove silhuetas ficam travadas: mexer num contorno exige atualizar a impressão digital dele de propósito
  const pinned = { crystal0: "81fb49c7", crystal1: "c5e19e", crystal2: "8a6e27ad", root0: "aef7db84", root1: "5eb6fc73", root2: "d3a73c54", stone0: "906cdcab", stone1: "668189b8", stone2: "82c36a9" };
  for (const kind of KINDS) for (const shape of SHAPES)
    assert.equal(signature(c => formationOutline(kind, shape, c)), pinned[`${kind}${shape}` as keyof typeof pinned], `${kind} ${shape}`);
});

test("as peças saem da variação: estáveis, em faixas certas, com 0 a 2 peças menores do outro lado", () => {
  const extras = [0, 0, 0], shapes = new Set<number>(), keys = new Set<string>();
  for (const v of VARIATIONS) {
    const parts = formationParts(v);
    assert.deepEqual(formationParts(v), parts);
    assert.ok(parts.length >= 1 && parts.length <= 3);
    const main = parts[parts.length - 1]!;
    assert.equal(main.dx, 0);
    assert.ok(main.scale >= 1 && main.scale <= 1.6 && main.width >= 0.85 && main.width <= 1.35 && Math.abs(main.lean) <= 0.2, `principal ${JSON.stringify(main)}`);
    assert.deepEqual(parts.map(p => p.scale), parts.map(p => p.scale).sort((a, b) => a - b), "as menores primeiro");
    extras[parts.length - 1]!++;
    for (const small of parts.slice(0, -1)) {
      assert.ok(small.scale >= main.scale * 0.4 - 1e-9 && small.scale <= main.scale * 0.7 + 1e-9);
      assert.ok(Math.abs(small.dx) >= 8 && Math.abs(small.dx) <= 14);
      assert.ok(small.lean * (main.lean || 1) < 0, "inclinada para o outro lado");
    }
    for (const p of parts) { shapes.add(p.shape); assert.ok(p.v >= 0 && p.v <= 1); }
    keys.add(JSON.stringify(parts));
  }
  assert.ok(extras[0]! > 160 && extras[0]! < 240, `sozinhas ${extras[0]}`);
  assert.ok(extras[1]! > 90 && extras[1]! < 170, `com uma menor ${extras[1]}`);
  assert.ok(extras[2]! > 40 && extras[2]! < 100, `com duas menores ${extras[2]}`);
  assert.deepEqual([...shapes].sort(), [0, 1, 2]);
  assert.ok(keys.size > 380, "quase todas as formações são diferentes");
  assert.deepEqual(formationParts(Number.NaN), formationParts(0.5));
  assert.deepEqual(formationParts(-3), formationParts(0));
  assert.deepEqual(formationParts(8), formationParts(1));
});

test("o desenho: estável por variação, equilibrado, uma peça por parte e cada parte com a sua largura, altura e inclinação", () => {
  for (const theme of THEMES) {
    const sig = signature(c => drawCaveFormation(c, theme, 0, 0, 0.4));
    assert.equal(signature(c => drawCaveFormation(c, theme, 0, 0, 0.4)), sig);
    assert.notEqual(signature(c => drawCaveFormation(c, theme, 0, 0, 0.9)), sig, theme + ": a variação muda a formação");
    assert.ok(balanced(c => drawCaveFormation(c, theme, 5, 6, 0.4)));
    for (const bad of [Number.NaN, -3, 7, Infinity]) assert.doesNotThrow(() => signature(c => drawCaveFormation(c, theme, 0, 0, bad)));
  }
  for (const v of [0.05, 0.31, 0.57, 0.82, 0.94]) {
    const parts = formationParts(v), s = spy(c => drawCaveFormation(c, "glacial", 10, 20, v));
    assert.equal((s.args.createLinearGradient ?? []).filter(a => a.join() === "-11,-18,10,3").length, parts.length, "um volume por parte");
    assert.deepEqual(s.args.transform, parts.map(p => [p.width, 0, p.lean, p.scale, 0, 0]));
    assert.deepEqual((s.args.translate ?? []).filter(a => a[1] === 20), parts.map(p => [10 + p.dx, 20]), "cada parte no seu deslocamento");
  }
  const crystal = spy(c => drawCaveFormation(c, "glacial", 0, 0, 0.5)), root = spy(c => drawCaveFormation(c, "verdant", 0, 0, 0.5));
  assert.notDeepEqual(crystal.args.moveTo, root.args.moveTo, "materiais diferentes, contornos diferentes");
  const first = formationParts(0.5)[0]!;
  const starts = { crystal: [[-7, 0], [-4, 0], [-8, 0]], root: [[-8, 0], [-8, 0], [-11, 0]], stone: [[-10, 0], [-8, 0], [-12, 0]] } as const;
  assert.deepEqual(crystal.args.moveTo!.find(a => a[1] === 0 && starts.crystal.some(s => s[0] === a[0])), starts.crystal[first.shape]);
});

test("a colocação é determinística, só junto às paredes, dentro do tile e na fatia certa dos tiles elegíveis", () => {
  let eligible = 0, placed = 0;
  const variations = new Set<number>();
  for (const cell of CELLS) {
    const floor = floorOf(cell), seed = seedOf(floor), pieces = formationPieces(floor, seed);
    assert.deepEqual(formationPieces(floor, seed), pieces);
    assert.notDeepEqual(formationPieces(floor, seed + 1), pieces, "outra semente, outras formações");
    assert.deepEqual(pieces.map(p => [p.y, p.x]), [...pieces].map(p => [p.y, p.x]).sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!), "de trás para frente");
    for (const p of pieces) {
      const tx = Math.floor(p.x / TILE_SIZE), ty = Math.floor((p.y - 3) / TILE_SIZE);
      assert.equal(floor.at(tx, ty), 1, "em chão aberto");
      assert.ok(floor.at(tx, ty + 1) === 0 || floor.at(tx - 1, ty) === 0 || floor.at(tx + 1, ty) === 0, `junto à parede em ${tx},${ty}`);
      assert.ok(p.x - tx * TILE_SIZE >= 7 && p.x - tx * TILE_SIZE <= 24 && p.y - 3 - ty * TILE_SIZE >= 11 && p.y - 3 - ty * TILE_SIZE <= 25);
      assert.ok(p.variation >= 0 && p.variation <= 1); variations.add(p.variation);
    }
    for (let y = 0; y < 30; y++) for (let x = 0; x < 42; x++)
      if (floor.at(x, y) === 1 && (floor.at(x, y + 1) === 0 || floor.at(x - 1, y) === 0 || floor.at(x + 1, y) === 0)) eligible++;
    placed += pieces.length;
  }
  assert.ok(Math.abs(placed / eligible - FORMATION_SHARE) < 0.05, `${placed} de ${eligible} (${(placed / eligible).toFixed(3)}) contra ${FORMATION_SHARE}`);
  assert.ok(variations.size > placed * 0.95, "variações quase todas diferentes");
});

test("o piso pinta as formações num passe só, depois de todos os tiles; a gruta luminosa não tem nenhuma", () => {
  const src = readFileSync("src/render/cave.ts", "utf8");
  assert.match(src, /if \(style !== "luminous"\)\s*\n\s*for \(const piece of formationPieces\(floor, seed\)\) drawCaveFormation\(ctx, floor\.theme, piece\.x, piece\.y, piece\.variation\);/);
  assert.ok(src.indexOf("formationPieces(floor, seed)") > src.indexOf("// Contact shadows exist only next to physical wall"), "depois do laço dos tiles");
  assert.equal(/drawCaveFormation\(ctx, floor\.theme, cx, cy/.test(src), false, "a pintura dentro do laço dos tiles saiu");
  const count = (cell: readonly [number, number]): { formations: number; expected: number } => {
    const entrance = caveEntranceInCell(cell[0], cell[1], SEED)!, room = new CaveRoom(entrance);
    const g = globalThis as Record<string, unknown>, previous = g.document;
    const s = spy(c => {
      g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => c }) };
      try { drawCaveView(c, room, 0, 0, 200, 200, 1); } finally { if (previous === undefined) delete g.document; else g.document = previous; }
    });
    const floor = new CaveFloor(entrance);
    const expected = formationPieces(floor, seedOf(floor)).reduce((n, p) => n + formationParts(p.variation).length, 0);
    return { formations: (s.args.createLinearGradient ?? []).filter(a => a.join() === "-11,-18,10,3").length, expected };
  };
  const plain = count([60, -76]);
  assert.ok(plain.expected > 10);
  assert.equal(plain.formations, plain.expected, "uma peça de formação por parte de cada formação da lista");
  assert.equal(count([64, -76]).formations, 0, "a gruta luminosa não pinta formações comuns");
});

test("cada peça está no seu arquivo e nada de relógio ou sorteio solto", () => {
  const files = readdirSync(new URL("../src/render/caveFormations/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["index", "outline", "parts", "placement"]);
  for (const f of files) for (const bad of ["Math.random", "Date.now", "performance.now", "new Date("])
    assert.equal(readFileSync(`src/render/caveFormations/${f}.ts`, "utf8").includes(bad), false, `${f}: ${bad}`);
});
