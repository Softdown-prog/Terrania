import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { TILE_SIZE } from "../src/world/terrain.ts";
import { SOUTH_CITY, southPoint } from "../src/world/southCity.ts";
import { PLAZA_CENTER, PLAZA_RINGS, isSouthCityPlaza, plazaRingStrength } from "../src/world/south/cityPlaza.ts";
import { COURSES_PER_TILE, COURSE_HEIGHT, CURB_STONE, CURB_THICKNESS, CityCurb, JOINT_JITTER, MORTAR, NO_EDGES, PlazaRings, SLAB_TONES,
  SLAB_WIDTH, curbJoints, paintCityPaving, pavingSlabs, slabColor, slabJoint, type PavedEdges } from "../src/render/south/city/paving/index.ts";
import { CURB_TONES } from "../src/render/south/city/paving/palette.ts";
import { generateChunkCanvas } from "../src/render/terrain.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Piso da cidade do Poço Negro (ADR 0042): lajes em fiadas globais (sem quadriculado), meio-fio e sombra nas bordas
 * que encostam na areia, e os anéis de bronze embutidos na praça em volta do poço.
 */
const SEED = 842136, TY = SOUTH_CITY.centerY;
type Rgb = readonly [number, number, number];
interface Spy { dashes: number[][]; raw: string[]; calls: Record<string, number>; args: Record<string, number[][]> }
function spy(draw: (c: CanvasRenderingContext2D) => void): Spy {
  const out: Spy = { dashes: [], raw: [], calls: {}, args: {} }, recorder = new Recorder();
  const proxy = new Proxy(recorder.ctx, {
    get(t, p) {
      const v = (t as unknown as Record<string | symbol, unknown>)[p];
      if (typeof v !== "function") return v;
      return (...a: unknown[]) => {
        out.calls[String(p)] = (out.calls[String(p)] ?? 0) + 1;
        if (p === "setLineDash") out.dashes.push([...(a[0] as number[])]);
        (out.args[String(p)] ??= []).push(a.filter((x): x is number => typeof x === "number"));
        const result = (v as (...x: unknown[]) => unknown).apply(t, a);
        if (p === "createLinearGradient" || p === "createRadialGradient") {
          const g = result as { addColorStop: (o: number, c: string) => void }, add = g.addColorStop.bind(g);
          g.addColorStop = (o, c) => { out.raw.push(c); add(o, c); };
        }
        return result;
      };
    },
    set(t, p, v) { if ((p === "fillStyle" || p === "strokeStyle") && typeof v === "string") out.raw.push(v); (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
  });
  draw(proxy);
  return out;
}
const signature = (draw: (c: CanvasRenderingContext2D) => void): string => { const r = new Recorder(); draw(r.ctx); return r.metrics().signature; };
const edges = (n: boolean, e: boolean, s: boolean, w: boolean): PavedEdges => ({ n, e, s, w });
const hexOf = (hex: string): Rgb => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

test("cada assunto do piso está no seu arquivo: o mundo na pasta do Sul e o desenho na pasta da cidade", () => {
  const files = readdirSync(new URL("../src/render/south/city/paving/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["curb", "index", "palette", "paving", "ring", "slabs"]);
  assert.match(readFileSync("src/render/southCityArt.ts", "utf8"), /^(?![\s\S]*paintSouthCityPaving)/, "o piso antigo saiu do arquivo da cidade");
});

test("a praça: 13 × 13 tiles em volta do poço, com dois anéis de bronze centrados no poço", () => {
  assert.deepEqual([PLAZA_CENTER.x, PLAZA_CENTER.y], [southPoint(0, 0).x, southPoint(0, 0).y], "o centro é o do poço");
  for (const [dx, dy, inside] of [[0, 0, true], [6, 6, true], [-6, -6, true], [7, 0, false], [0, 7, false], [-7, 3, false]] as const)
    assert.equal(isSouthCityPlaza(dx, TY + dy), inside, `${dx},${dy}`);
  for (const bad of [Number.NaN, 1.5, Infinity]) assert.equal(isSouthCityPlaza(bad, TY), false);
  for (const ring of PLAZA_RINGS) {
    assert.equal(plazaRingStrength(PLAZA_CENTER.x + ring.radius, PLAZA_CENTER.y), 1, "forte no meio da faixa");
    assert.equal(plazaRingStrength(PLAZA_CENTER.x, PLAZA_CENTER.y - ring.radius), 1);
    assert.ok(plazaRingStrength(PLAZA_CENTER.x + ring.radius + ring.half / 2, PLAZA_CENTER.y) > 0.4 && plazaRingStrength(PLAZA_CENTER.x + ring.radius + ring.half / 2, PLAZA_CENTER.y) < 1);
    assert.equal(plazaRingStrength(PLAZA_CENTER.x + ring.radius + ring.half, PLAZA_CENTER.y), 0, "zero na borda");
  }
  assert.equal(plazaRingStrength(PLAZA_CENTER.x, PLAZA_CENTER.y), 0, "nenhum no poço");
  assert.equal(plazaRingStrength(Number.NaN, 0), 0);
  assert.ok(PLAZA_RINGS.every(r => r.radius + r.half < 6.5 * TILE_SIZE), "os anéis cabem na praça");
});

test("as lajes cobrem o tile inteiro em três fiadas, sem buracos nem sobreposição", () => {
  for (const [tx, ty] of [[0, TY], [3, TY - 4], [-9, TY + 2], [12, TY + 12]] as const) {
    const slabs = pavingSlabs(tx, ty, SEED);
    for (let row = 0; row < COURSES_PER_TILE; row++) {
      const course = slabs.filter(s => Math.abs(s.y - row * COURSE_HEIGHT) < 1e-9).sort((a, b) => a.x - b.x);
      assert.ok(course.length >= 2 && course.length <= 5, `fiada ${row}: ${course.length} lajes`);
      assert.equal(course[0]!.x, 0);
      for (let i = 1; i < course.length; i++) assert.ok(Math.abs(course[i]!.x - (course[i - 1]!.x + course[i - 1]!.w)) < 1e-9, "contíguas");
      const last = course[course.length - 1]!;
      assert.ok(Math.abs(last.x + last.w - TILE_SIZE) < 1e-9, "até a borda do tile");
      assert.ok(course.every(s => Math.abs(s.h - COURSE_HEIGHT) < 1e-9 && s.w > 0));
    }
  }
  assert.deepEqual(pavingSlabs(Number.NaN, 0, SEED), []);
  assert.deepEqual(pavingSlabs(0, 1.5, SEED), []);
});

test("a emenda entre tiles some: a laje que a atravessa sai igual nos dois lados", () => {
  let crossings = 0;
  for (let tx = -5; tx < 6; tx++) {
    const a = pavingSlabs(tx, TY, SEED), b = pavingSlabs(tx + 1, TY, SEED);
    for (let row = 0; row < COURSES_PER_TILE; row++) {
      const left = a.filter(s => !s.right && Math.abs(s.y - row * COURSE_HEIGHT) < 1e-9)[0], right = b.filter(s => !s.left && Math.abs(s.y - row * COURSE_HEIGHT) < 1e-9)[0];
      if (!left || !right) { assert.ok(!left && !right, "uma laje que cruza a emenda existe nos dois tiles"); continue; }
      crossings++;
      assert.equal(left.worldX, right.worldX);
      assert.equal(left.tone, right.tone);
      assert.equal(left.roll, right.roll);
      assert.ok(Math.abs(left.x + left.w - TILE_SIZE) < 1e-9 && right.x === 0, "as duas partes se tocam na emenda");
    }
  }
  assert.ok(crossings >= 15, "há muitas lajes cruzando emendas: " + crossings);
});

test("as juntas variam dentro do limite, as fiadas alternam e a semente muda o desenho", () => {
  let min = Infinity, max = 0;
  for (let k = -20; k < 20; k++) for (const course of [0, 1, 2, 3]) {
    const regular = k * SLAB_WIDTH + (course % 2 === 0 ? 0 : SLAB_WIDTH / 2), j = slabJoint(course, k, SEED);
    assert.ok(Math.abs(j - regular) <= JOINT_JITTER + 1e-9);
    assert.equal(j, slabJoint(course, k, SEED));
    const w = slabJoint(course, k + 1, SEED) - j;
    min = Math.min(min, w); max = Math.max(max, w);
  }
  assert.ok(min > 4 && max < 25 && max - min > 8, `larguras de ${min.toFixed(1)} a ${max.toFixed(1)}`);
  assert.notEqual(slabJoint(2, 3, SEED), slabJoint(2, 3, SEED + 1));
  const tones = new Set(pavingSlabs(0, TY, SEED).concat(pavingSlabs(1, TY, SEED), pavingSlabs(2, TY, SEED)).map(s => s.tone));
  assert.ok(tones.size >= 3, "vários tons de pedra");
  assert.notDeepEqual(pavingSlabs(0, TY, SEED).map(s => s.tone), pavingSlabs(0, TY, SEED + 1).map(s => s.tone));
  const rolls = new Set<number>();
  for (let tx = 0; tx < 8; tx++) for (const s of pavingSlabs(tx, TY, SEED)) { assert.ok(s.roll >= 0 && s.roll < 1); rolls.add(s.roll); }
  assert.ok(rolls.size > 20, "cada laje tem o seu sorteio: " + rolls.size);
  const layout = (ty: number): string => pavingSlabs(0, ty, SEED).map(s => `${s.x.toFixed(2)}:${s.w.toFixed(2)}:${s.tone}`).join("|");
  assert.notEqual(layout(TY), layout(TY + 1), "o desenho depende da linha do mundo, não repete de tile em tile");
  assert.notEqual(layout(TY), layout(TY + 2));
});

test("a cor da laje varia por laje dentro do tom e nunca sai do limite", () => {
  const colors = new Set<string>();
  for (let tone = 0; tone < SLAB_TONES.length; tone++) for (let i = 0; i <= 10; i++) colors.add(slabColor(tone, i / 10));
  assert.ok(colors.size >= 30, "muitas cores: " + colors.size);
  assert.equal(slabColor(0, 0.5), `rgb(${hexOf(SLAB_TONES[0]!).join(",")})`, "roll médio é o tom puro");
  assert.notEqual(slabColor(0, 0), slabColor(0, 1));
  assert.equal(slabColor(0, 5), slabColor(0, 1), "roll fora de 0..1 é limitado");
  for (const bad of [-3, 99, Number.NaN]) assert.match(slabColor(bad, 0.5), /^rgb\(\d+,\d+,\d+\)$/);
});

test("o piso pinta o tile inteiro sobre a argamassa, com lajes, rachaduras e uma laje de destaque, e é estável", () => {
  const input = { x: 5, y: 7, tx: 3, ty: TY - 7, seed: SEED, plaza: false };
  const s = spy(c => paintCityPaving(c, input));
  assert.deepEqual(s.args.fillRect![0], [5, 7, 32, 32], "argamassa em todo o tile");
  assert.ok(s.raw.includes(MORTAR));
  assert.ok((s.args.fillRect ?? []).length > 20, "lajes e quinas");
  assert.ok((s.calls.createRadialGradient ?? 0) >= 1, "polimento da laje de destaque");
  const cracks = pavingSlabs(input.tx, input.ty, SEED).filter(slab => slab.roll > 0.84 && slab.w > 9).length;
  assert.equal(s.calls.quadraticCurveTo, cracks + 2, `${cracks} rachaduras de uma curva e a da laje de destaque, de duas`);
  assert.ok((s.calls.arc ?? 0) >= 1, "quina gasta");
  assert.equal(signature(c => paintCityPaving(c, input)), signature(c => paintCityPaving(c, input)));
  assert.notEqual(signature(c => paintCityPaving(c, input)), signature(c => paintCityPaving(c, { ...input, tx: 4 })));
  assert.notEqual(signature(c => paintCityPaving(c, input)), signature(c => paintCityPaving(c, { ...input, seed: SEED + 1 })));
  const r = new Recorder(); paintCityPaving(r.ctx, input);
  assert.equal(r.metrics().saves, r.metrics().restores);
  // O tile pintado em outra posição do canvas é o mesmo desenho, deslocado.
  const moved = spy(c => paintCityPaving(c, { ...input, x: 105, y: 207 }));
  assert.deepEqual(moved.args.fillRect![0], [105, 207, 32, 32]);
  assert.equal(moved.calls.fillRect, s.calls.fillRect);
});

test("o meio-fio só aparece nos lados marcados, com pedras claras e areia por cima", () => {
  const base = { x: 0, y: 0, tx: 3, ty: TY - 7, seed: SEED, plaza: false };
  const none = spy(c => paintCityPaving(c, base)), all = spy(c => paintCityPaving(c, { ...base, edges: edges(true, true, true, true) }));
  const one = spy(c => paintCityPaving(c, { ...base, edges: edges(true, false, false, false) }));
  assert.ok(!CURB_TONES.some(t => none.raw.includes(t)), "sem lado marcado, sem meio-fio");
  assert.ok(CURB_TONES.some(t => all.raw.includes(t)), "com lado marcado, pedra clara");
  assert.ok((all.args.fillRect ?? []).length > (one.args.fillRect ?? []).length && (one.args.fillRect ?? []).length > (none.args.fillRect ?? []).length, "mais lados, mais pedras");
  assert.ok(all.raw.includes("rgba(143,111,63,0.4)") || one.raw.includes("rgba(143,111,63,0.4)") || all.calls.ellipse! > none.calls.ellipse!, "areia sobre o meio-fio");
  // O meio-fio do lado norte fica na faixa de cima do tile (0 a 5 px).
  const north = spy(c => new CityCurb(c).stones(0, 0, 3, TY, edges(true, false, false, false), SEED));
  assert.ok((north.args.fillRect ?? []).every(a => a[1]! < CURB_THICKNESS + 1 || a[3] === 1 || a[3] === CURB_THICKNESS || a[1]! <= 6), "faixa no alto");
  const south = spy(c => new CityCurb(c).stones(0, 0, 3, TY, edges(false, false, true, false), SEED));
  assert.ok((south.args.fillRect ?? []).some(a => a[1]! >= TILE_SIZE - CURB_THICKNESS - 1), "faixa embaixo");
  assert.deepEqual(NO_EDGES, edges(false, false, false, false));
});

test("as juntas do meio-fio são globais: a mesma pedra sai igual do tile vizinho", () => {
  const a = curbJoints(3 * TILE_SIZE, 4 * TILE_SIZE, TY, SEED), b = curbJoints(4 * TILE_SIZE, 5 * TILE_SIZE, TY, SEED);
  const shared = a.filter(j => b.some(k => k === j));
  assert.ok(shared.length >= 2, "as listas dos tiles vizinhos têm juntas em comum");
  for (let i = 1; i < a.length; i++) assert.ok(a[i]! > a[i - 1]!, "crescente");
  assert.ok(a.every((j, i) => i === 0 || j - a[i - 1]! > CURB_STONE - 5 && j - a[i - 1]! < CURB_STONE + 5));
  assert.notDeepEqual(curbJoints(96, 128, TY, SEED), curbJoints(96, 128, TY + 1, SEED), "cada linha tem as suas juntas");
});

test("a areia da cidade ganha a sombra do piso só nos lados que encostam nele", () => {
  const side = (e: PavedEdges): Spy => spy(c => new CityCurb(c).shade(10, 20, e));
  assert.equal(side(NO_EDGES).calls.createLinearGradient ?? 0, 0);
  assert.equal(side(edges(true, false, false, false)).calls.createLinearGradient, 1);
  assert.equal(side(edges(true, true, true, true)).calls.createLinearGradient, 4);
  assert.deepEqual(side(edges(false, false, false, true)).args.fillRect, [[10, 20, 7, 32]], "o lado oeste: faixa de 7 px de largura");
  assert.deepEqual(side(edges(false, true, false, false)).args.fillRect, [[35, 20, 7, 32]], "o lado leste: faixa de 7 px, colada na borda");
  assert.ok(side(edges(true, false, false, false)).raw.includes("rgba(29,22,38,0.34)"));
});

test("os anéis de bronze: só nos tiles que eles cruzam, recortados no tile, com o raio e o centro do mundo", () => {
  assert.equal(PlazaRings.touches(0, TY), false, "o tile do poço não tem anel");
  assert.equal(PlazaRings.touches(3, TY), true, "o primeiro anel passa a ~96 px do poço");
  assert.equal(PlazaRings.touches(-5, TY), true, "o segundo anel passa a ~164 px do poço");
  assert.equal(PlazaRings.touches(12, TY), false);
  const ring = spy(c => new PlazaRings(c).paint(40, 60, 3, TY));
  assert.equal(ring.calls.clip, 1, "recortado no tile");
  assert.deepEqual(ring.args.rect![0], [40, 60, 32, 32]);
  const radii = new Set((ring.args.arc ?? []).map(a => Math.round(a[2]!)));
  for (const r of PLAZA_RINGS) assert.ok(radii.has(r.radius), `raio ${r.radius}`);
  const first = (ring.args.arc ?? [])[0]!;
  assert.equal(first[0], 40 + PLAZA_CENTER.x - 3 * TILE_SIZE, "o centro do anel no canvas, pelo mundo");
  assert.equal(first[1], 60 + PLAZA_CENTER.y - TY * TILE_SIZE);
  assert.ok((ring.calls.setLineDash ?? 0) >= 4, "juntas entre os blocos");
  for (const r of PLAZA_RINGS) assert.ok(ring.dashes.some(d => d.length === 2 && Math.abs(d[0]! - r.radius * 0.11) < 1e-9 && d[1] === 1.4), `blocos do anel de raio ${r.radius}: traço de ${(r.radius * 0.11).toFixed(1)} px e junta de 1,4 px`);
  assert.ok(ring.raw.includes("#86642f") && ring.raw.includes("#e8bb68"), "bronze com fio de luz");
  // Dois tiles vizinhos desenham o mesmo anel: o centro deles difere exatamente de um tile.
  const next = spy(c => new PlazaRings(c).paint(40, 60, 4, TY));
  assert.equal((ring.args.arc![0]![0]! - next.args.arc![0]![0]!), TILE_SIZE);
});

test("o piso da praça desenha os anéis só quando é praça e o anel passa pelo tile", () => {
  const base = { x: 0, y: 0, ty: TY, seed: SEED };
  assert.ok((spy(c => paintCityPaving(c, { ...base, tx: 3, plaza: true })).calls.arc ?? 0) >= 6, "anel nos dois anéis e na laje de destaque");
  const off = spy(c => paintCityPaving(c, { ...base, tx: 3, plaza: false }));
  assert.ok(!(off.args.arc ?? []).some(a => a[2] === 96), "fora da praça não há anel");
  assert.ok(!(spy(c => paintCityPaving(c, { ...base, tx: 0, plaza: true })).args.arc ?? []).some(a => a[2] === 96 || a[2] === 164), "tile do poço sem anel");
});

test("o chunk da praça pinta o anel e o meio-fio; um chunk sem cidade não pinta nenhum", () => {
  const arcsOf = (cx: number, cy: number): { radii: Set<number>; strips: number } => {
    const recorder = new Recorder(), radii = new Set<number>();
    let strips = 0;
    const proxy = new Proxy(recorder.ctx, {
      get(t, p) {
        if (p === "createImageData") return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
        const v = (t as unknown as Record<string | symbol, unknown>)[p];
        if (typeof v !== "function") return v;
        return (...a: unknown[]) => {
          if (p === "arc" && typeof a[2] === "number") radii.add(Math.round(a[2]));
          if (p === "createLinearGradient" && a[0] === a[2] && a[1] !== a[3] && Math.abs((a[3] as number) - (a[1] as number)) === 7) strips++;
          return (v as (...x: unknown[]) => unknown).apply(t, a);
        };
      },
      set(t, p, v) { (t as unknown as Record<string | symbol, unknown>)[p] = v; return true; },
    });
    withDocument({ createElement: () => ({ width: 0, height: 0, getContext: () => proxy }) }, () => generateChunkCanvas(cx, cy, SEED));
    return { radii, strips };
  };
  const city = arcsOf(0, Math.floor(TY / 16)), desert = arcsOf(1, 977);
  assert.ok(city.radii.has(96) && city.radii.has(164), "os dois anéis no chunk do poço: " + [...city.radii].join(","));
  assert.equal(desert.radii.has(96) || desert.radii.has(164), false);
  assert.ok(city.strips >= 4, "sombra do piso na areia: " + city.strips);
  assert.equal(desert.strips, 0);
});

test("o terreno usa o piso novo e a sombra, e o piso antigo não existe mais", () => {
  const source = readFileSync("src/render/terrain.ts", "utf8");
  assert.match(source, /paintCityPaving\(ctx, \{ x, y, tx, ty, seed, plaza: isSouthCityPlaza\(tx, ty\), edges \}\)/);
  assert.match(source, /new CityCurb\(ctx\)\.shade\(x, y, sides\)/);
  assert.equal(/paintSouthCityPaving/.test(source), false);
});
