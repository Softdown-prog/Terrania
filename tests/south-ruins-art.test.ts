import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { RUIN_PIECES, type RuinPiece } from "../src/world/southRuins.ts";
import { RuinBrush } from "../src/render/south/ruins/brush.ts";
import { LICHEN, MUDBRICK, SANDSTONE, STAIN, noise } from "../src/render/south/ruins/palette.ts";
import { paintRuinClayFloor, paintRuinColumn, paintRuinDrum, paintRuinGround, paintRuinOven, paintRuinPillar, paintRuinPot,
  paintRuinSteps, paintRuinTowerFloor, paintRuinWall, paintSouthRuin, ruinLayerOf } from "../src/render/south/ruins/index.ts";
import { renderScenery, clearSceneryCache } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Acabamento das ruínas do Sul (ADR 0040): cada peça no seu arquivo, com desgaste (riscos, covas, líquen), entulho,
 * areia com volume e brilho próprios. A divisão em arquivos não mudou nenhum pixel; o acabamento sim.
 */
type Rgb = readonly [number, number, number];
const signature = (draw: (c: CanvasRenderingContext2D) => void): string => { const r = new Recorder(); draw(r.ctx); return r.metrics().signature; };

interface Spy { colors: Rgb[]; calls: Record<string, number>; args: Record<string, number[][]> }
/** Grava as cores usadas (preenchimento, traço e degradês) e quantas vezes cada operação foi chamada. */
function spy(draw: (c: CanvasRenderingContext2D) => void): Spy {
  const out: Spy = { colors: [], calls: {}, args: {} }, recorder = new Recorder();
  const note = (value: unknown): void => {
    if (typeof value !== "string") return;
    const hex = /^#([0-9a-f]{6})/i.exec(value), rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
    if (hex) out.colors.push([parseInt(hex[1]!.slice(0, 2), 16), parseInt(hex[1]!.slice(2, 4), 16), parseInt(hex[1]!.slice(4, 6), 16)]);
    else if (rgb) out.colors.push([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]);
  };
  const proxy = new Proxy(recorder.ctx, {
    get(t, p) {
      const v = (t as unknown as Record<string | symbol, unknown>)[p];
      if (typeof v !== "function") return v;
      return (...a: unknown[]) => {
        out.calls[String(p)] = (out.calls[String(p)] ?? 0) + 1;
        (out.args[String(p)] ??= []).push(a.filter((x): x is number => typeof x === "number"));
        const result = (v as (...x: unknown[]) => unknown).apply(t, a);
        if (p === "createLinearGradient" || p === "createRadialGradient") {
          const g = result as { addColorStop: (o: number, c: string) => void }, add = g.addColorStop.bind(g);
          g.addColorStop = (o, c) => { note(c); add(o, c); };
        }
        return result;
      };
    },
    set(t, p, v) { if (p === "fillStyle" || p === "strokeStyle") note(v); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
  });
  draw(proxy);
  return out;
}
const moved = (s: Spy, x: number, y: number): boolean => (s.args.moveTo ?? []).some(([mx, my]) => Math.abs(mx! - x) < 1e-9 && Math.abs(my! - y) < 1e-9);
const has = (s: Spy, [r, g, b]: Rgb): boolean => s.colors.some(([cr, cg, cb]) => cr === r && cg === g && cb === b);
const hexOf = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const STAIN_DARK = hexOf(STAIN.dark), OCHRE_LICHEN = hexOf(LICHEN.ochre), OLIVE_LICHEN = hexOf(LICHEN.olive);
const piece = (variant: 0 | 1 | 2 | 3, kind: RuinPiece["kind"], n = 0): RuinPiece => RUIN_PIECES[variant].filter(p => p.kind === kind)[n]!;

test("cada peça das ruínas está no seu arquivo, na pasta do Sul; o arquivo único saiu", () => {
  const files = readdirSync(new URL("../src/render/south/ruins/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["brush", "clayFloor", "column", "drum", "ground", "index", "layer", "oven", "paint", "palette", "pillar", "pot", "steps", "towerFloor", "wall"]);
  assert.equal(existsSync(new URL("../src/render/southRuinsArt.ts", import.meta.url)), false);
  assert.match(readFileSync("src/render/scenery.ts", "utf8"), /from "\.\/south\/ruins\/index\.ts"/);
});

test("a ruína inteira é estável, tem quatro desenhos e três camadas, e ignora variações inválidas", () => {
  const all = [0, 1, 2, 3].map(v => signature(c => paintSouthRuin(c, v, "all")));
  assert.equal(new Set(all).size, 4);
  assert.deepEqual([0, 1, 2, 3].map(v => signature(c => paintSouthRuin(c, v))), all, "sem camada é a inteira");
  for (const v of [0, 1, 2, 3]) {
    const layers = (["all", "back", "front"] as const).map(l => signature(c => paintSouthRuin(c, v, l)));
    assert.equal(new Set(layers).size, 3, `ruína ${v}`);
    const r = new Recorder(); paintSouthRuin(r.ctx, v, "all");
    assert.equal(r.metrics().saves, r.metrics().restores);
  }
  for (const bad of [Number.NaN, -4, 99, Infinity])
    assert.equal(signature(c => paintSouthRuin(c, bad)), signature(c => paintSouthRuin(c, Number.isFinite(bad) ? Math.max(0, Math.min(3, bad)) : 0)), String(bad));
  assert.equal(ruinLayerOf(piece(1, "steps")), "back", "o chão fica sempre ao fundo");
  assert.equal(ruinLayerOf(piece(1, "wall")), "back", "parede de fundo: o herói passa à frente");
  assert.equal(ruinLayerOf(piece(0, "column", 2)), "front", "coluna na linha de contato: o herói passa por trás");
});

test("o pincel de entulho desenha um bloco com três faces, contorno e sombra, e cada bloco gira de um jeito", () => {
  const block = (turn: number): Spy => spy(c => new RuinBrush(c).rubble(10, 10, 6, SANDSTONE, turn));
  const one = block(0.2);
  assert.equal(one.calls.fill, 4, "sombra de contato + frente + topo + lado");
  assert.equal(one.calls.stroke, 1, "contorno único");
  assert.equal(one.calls.createLinearGradient, 1, "a frente tem volume");
  assert.notEqual(signature(c => new RuinBrush(c).rubble(10, 10, 6, SANDSTONE, 0.1)), signature(c => new RuinBrush(c).rubble(10, 10, 6, SANDSTONE, 0.9)));
  assert.ok(has(block(0.5), hexOf(SANDSTONE.light)) && has(block(0.5), hexOf(SANDSTONE.dark)), "topo claro e lado escuro da pedra");
});

test("o pincel de riscos desce do topo em tantos riscos quanto a largura pede e depende do sorteio", () => {
  const streaks = (x1: number, seed: number): Spy => spy(c => new RuinBrush(c).streaks(0, x1, 0, 40, seed, 1));
  assert.equal(streaks(28, 5).calls.createLinearGradient, 2);
  assert.equal(streaks(56, 5).calls.createLinearGradient, 4);
  assert.equal(streaks(28, 5).calls.fillRect, 2);
  assert.ok(has(streaks(28, 5), STAIN_DARK), "fuligem escura");
  assert.notEqual(signature(c => new RuinBrush(c).streaks(0, 56, 0, 40, 5, 1)), signature(c => new RuinBrush(c).streaks(0, 56, 0, 40, 9, 1)));
});

test("a areia acumulada tem volume (degradê), uma crista clara e mais de um tamanho de crista", () => {
  const pile = spy(c => new RuinBrush(c).drift(20, 20, 9, 2.4, 1, 3));
  assert.equal(pile.calls.createLinearGradient, 1);
  assert.ok(pile.colors.some(([r, g, b]) => r === 255 && g === 246 && b === 220), "crista de luz");
  assert.notEqual(signature(c => new RuinBrush(c).drift(20, 20, 9, 2.4, 1, 1)), signature(c => new RuinBrush(c).drift(20, 20, 9, 2.4, 1, 2)));
  const lichen = spy(c => new RuinBrush(c).lichen(5, 5, 4));
  assert.ok(has(lichen, OCHRE_LICHEN) && has(lichen, OLIVE_LICHEN), "líquen ocre com olivo por cima");
});

test("a parede tem riscos de chuva, covas, líquen e entulho aos pés; a de barro também", () => {
  for (const [v, ramp] of [[1, SANDSTONE], [3, MUDBRICK]] as const) {
    const wall = piece(v, "wall"), s = spy(c => paintRuinWall(c, wall, v, 0, ramp, []));
    assert.ok(has(s, STAIN_DARK), `covas e fuligem na parede ${v}`);
    assert.ok(has(s, OCHRE_LICHEN) && has(s, OLIVE_LICHEN), `líquen na parede ${v}`);
    assert.ok((s.calls.createLinearGradient ?? 0) >= 8, `riscos, oclusão, volume e areia: ${s.calls.createLinearGradient}`);
    assert.ok(has(s, hexOf(ramp.light)), "topo claro do entulho");
    assert.ok(moved(s, wall.x + wall.w / 2 + 4, wall.y + wall.h / 2 + 3), `bloco caído à direita da parede ${v}`);
  }
  const long = spy(c => paintRuinWall(c, piece(1, "wall"), 1, 0, SANDSTONE, [])), short = spy(c => paintRuinWall(c, { ...piece(1, "wall"), w: 28 }, 1, 0, SANDSTONE, []));
  assert.ok((long.calls.fill ?? 0) > (short.calls.fill ?? 0), "parede curta tem um bloco a menos");
});

test("coluna e pilar ganham desgaste e areia no pé; coluna baixa tem entulho e a inteira, não", () => {
  const states = [1, 2, 3, 4, 5, 6, 7, 8].map(idx => spy(c => paintRuinColumn(c, piece(0, "column"), 0, idx, SANDSTONE, [])));
  for (const s of states) assert.ok(has(s, STAIN_DARK) && has(s, OCHRE_LICHEN), "desgaste em toda coluna");
  const col = piece(0, "column"), at = (idx: number): boolean => moved(states[idx - 1]!, col.x + col.w / 2 + 5, col.y + col.h / 2 - 1 + 2);
  const full = [1, 2, 3, 4, 5, 6, 7, 8].filter(idx => noise(idx, 0, 61) >= 0.62), low = [1, 2, 3, 4, 5, 6, 7, 8].filter(idx => noise(idx, 0, 61) < 0.62);
  assert.ok(full.length >= 1 && low.length >= 1, "a amostra tem colunas inteiras e baixas");
  for (const idx of low) assert.equal(at(idx), true, `coluna ${idx} (baixa) com entulho`);
  for (const idx of full) assert.equal(at(idx), false, `coluna ${idx} (inteira) sem entulho`);
  for (const i of [2, 3]) {
    const s = spy(c => paintRuinPillar(c, RUIN_PIECES[1][i]!, i, SANDSTONE, []));
    assert.ok(has(s, STAIN_DARK) && has(s, OCHRE_LICHEN) && has(s, OLIVE_LICHEN), `pilar ${i}`);
    assert.ok((s.calls.createLinearGradient ?? 0) >= 7, `pilar ${i}: ${s.calls.createLinearGradient}`);
  }
});

test("o forno tem fuligem na boca, brasa apagada, rachadura e entulho de tijolo", () => {
  const s = spy(c => paintRuinOven(c, piece(3, "oven"), []));
  assert.ok(has(s, [140, 132, 120]), "cinza na boca");
  assert.ok(has(s, hexOf(MUDBRICK.light)), "tijolo caído");
  assert.ok((s.calls.createLinearGradient ?? 0) >= 4, `fuligem, oclusão, volume, tijolo e areia: ${s.calls.createLinearGradient}`);
});

test("degraus, pisos, tambor, pote e chão em volta têm o acabamento próprio", () => {
  const steps = spy(c => paintRuinSteps(c, piece(0, "steps"), 0));
  assert.ok(has(steps, [163, 154, 99]), "capim seco na junta");
  assert.ok(has(steps, STAIN_DARK), "quina lascada");
  const st = piece(0, "steps");
  assert.ok(moved(steps, st.x - st.w / 2 + 2, st.y - 0 + 3 - 3), "brilho no degrau de baixo");
  const tower = spy(c => paintRuinTowerFloor(c, piece(2, "steps"), 2));
  assert.equal(tower.calls.createRadialGradient, 1, "lajes com luz de noroeste");
  assert.ok(has(tower, STAIN_DARK) && has(tower, [111, 122, 74]), "lajes soltas e capim");
  const clay = spy(c => paintRuinClayFloor(c, piece(3, "steps"), 3));
  assert.ok(has(clay, STAIN_DARK), "barro com rachaduras");
  assert.ok((clay.args.createLinearGradient ?? []).some(([x0, y0, x1, y1]) => Math.abs(x1! - x0!) > 100 && Math.abs(y1! - y0!) > 30), "o barro tem luz na diagonal, de noroeste a sudeste, por todo o piso");
  const drum = spy(c => paintRuinDrum(c, piece(0, "drum"), 0, 7));
  assert.ok(has(drum, OCHRE_LICHEN) && has(drum, STAIN_DARK), "tambor com líquen e lasca");
  const pot = spy(c => paintRuinPot(c, piece(3, "pot"), 0));
  assert.ok(has(pot, [201, 138, 58]) && has(pot, STAIN_DARK), "pote com faixa ocre e lasca");
  for (const v of [0, 1, 2, 3] as const) {
    const ground = spy(c => paintRuinGround(c, v));
    assert.equal(ground.calls.createRadialGradient, 1, `língua de areia ${v}`);
    assert.ok((ground.args.ellipse ?? []).some(a => a[2] === 118 && a[3] === 30), `a língua de areia é desenhada ${v}`);
    assert.ok((ground.calls.quadraticCurveTo ?? 0) >= 7, `marcas de ondulação ${v}: ${ground.calls.quadraticCurveTo}`);
  }
});

test("o cenário pinta cada camada da ruína num sprite próprio, uma vez só", () => {
  clearSceneryCache();
  let created = 0;
  const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
  const draw = (variant: number, layer: "back" | "front"): void =>
    withDocument(doc, () => renderScenery(new Recorder().ctx, { kind: "south-ruin", x: 100, y: 100, variant, ruinLayer: layer }, 0, 0, 0));
  for (const v of [0, 1, 2, 3]) for (const layer of ["back", "front"] as const) draw(v, layer);
  assert.equal(created, 8, "quatro ruínas × duas camadas");
  draw(2, "back"); draw(3, "front");
  assert.equal(created, 8, "pedir de novo reaproveita");
  clearSceneryCache();
});
