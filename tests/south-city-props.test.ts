import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CITY_PROP_ART, cityPropAnimates, paintCityGate, paintCityPropAnimation, paintCityWall, paintCityWatchtower, paintCityWell } from "../src/render/south/city/props/index.ts";
import { GATE_BEAM_BOTTOM, GATE_HALF } from "../src/render/south/city/props/gate.ts";
import { MERLON_H, WALL_HALF, WALL_TOP } from "../src/render/south/city/props/wall.ts";
import { WATCHTOWER_BRAZIER } from "../src/render/south/city/props/watchtower.ts";
import { WELL_WATER } from "../src/render/south/city/props/well.ts";
import { GREEN_FLAME, ORANGE_FLAME, VIOLET_FLAME } from "../src/render/south/city/buildings/flame.ts";
import { renderScenery, clearSceneryCache, type Scenery } from "../src/render/scenery.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { withDocument } from "./helpers/paintChunk.ts";

/**
 * Muralha, portão, torres de guarda e poço da cidade do Poço Negro (ADR 0049): cada peça no seu arquivo, com o corpo no cache
 * e só o fogo e a água animados a cada quadro. Os trechos de muralha se encostam, então o que atravessa a emenda tem período fixo.
 */
interface Spy { raw: string[]; calls: Record<string, number>; args: Record<string, number[][]> }
function spy(draw: (c: CanvasRenderingContext2D) => void): Spy {
  const out: Spy = { raw: [], calls: {}, args: {} }, recorder = new Recorder();
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
const tone = (s: Spy, hex: string): boolean => s.raw.some(r => r.toLowerCase() === hex);

test("cada peça está no seu arquivo, na pasta da cidade; o desenho antigo saiu de vez", () => {
  const files = readdirSync(new URL("../src/render/south/city/props/", import.meta.url)).map(f => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, ["animation", "arena", "barrel", "bones", "corral", "gate", "index", "palm", "sign", "stall", "tent", "torch", "wall", "watchtower", "well"]);
  assert.deepEqual(Object.keys(CITY_PROP_ART).sort(), ["arena", "barrel", "bones", "corral", "gate", "palm", "sign", "stall", "tent", "torch", "tower", "wall", "well"]);
  const old = readFileSync("src/render/southCityArt.ts", "utf8");
  assert.equal(old.includes("paintSouthCity"), false, "o desenho antigo da cidade não existe mais");
  for (const fn of ["function wall(", "function tower(", "function well(", "function tent(", "function stall(", "function torch(", "function palm("]) assert.equal(old.includes(fn), false, fn);
});

test("a muralha: quatro variações estáveis e o que cruza a emenda tem período fixo (ameias, fiadas e juntas)", () => {
  const sigs = [0, 1, 2, 3].map(v => signature(c => paintCityWall(c, v)));
  assert.equal(new Set(sigs).size, 4);
  assert.deepEqual([0, 1, 2, 3].map(v => signature(c => paintCityWall(c, v))), sigs);
  assert.equal(signature(c => paintCityWall(c, 5)), sigs[1], "5 é a variação 1");
  assert.equal(signature(c => paintCityWall(c, -3)), sigs[3]);
  assert.equal(signature(c => paintCityWall(c, Number.NaN)), sigs[0]);
  for (const v of [0, 1, 2, 3]) {
    const s = spy(c => paintCityWall(c, v));
    const merlons = (s.args.fillRect ?? []).filter(a => a[2] === 10 && a[3] === MERLON_H).map(a => a[0]!).sort((a, b) => a - b);
    assert.deepEqual(merlons, [-29, -13, 3, 19], `ameias da variação ${v}: de 16 em 16 px, o vão cai na emenda`);
    const courses = (s.args.moveTo ?? []).filter(a => a[0] === -WALL_HALF && a[1]! > WALL_TOP && a[1]! < 0 && Number.isInteger(a[1]!)).map(a => a[1]!);
    assert.deepEqual([...new Set(courses)].filter(y => y % 8 === 0).sort((a, b) => b - a), [-8, -16, -24, -32].filter(y => y > WALL_TOP), `fiadas da variação ${v} nas mesmas alturas`);
    const joints = (s.args.moveTo ?? []).filter(a => a[1]! % 8 === 0 && a[0]! > -WALL_HALF && a[0]! < WALL_HALF && (a[0]! + WALL_HALF) % 8 === 0).length;
    assert.ok(joints >= 8, `juntas dos tijolos em múltiplos de 8 px: ${joints}`);
    const drifts = (s.args.ellipse ?? []).filter(a => a[3] === 2.4 || a[3] === 2.2);
    for (const [x, , rx] of drifts) assert.ok(x! - rx! >= -WALL_HALF - 0.01 && x! + rx! <= WALL_HALF + 0.01, `a areia da variação ${v} não passa da emenda (${x},${rx})`);
  }
});

test("a muralha tem desgaste só no miolo: remendo nas variações ímpares, fresta na 2 e rachaduras curvas em todas", () => {
  const patch = (v: number): boolean => (spy(c => paintCityWall(c, v)).args.strokeRect ?? []).some(a => a[0] === -14 && a[2] === 22 && a[3] === 12);
  assert.deepEqual([0, 1, 2, 3].map(patch), [false, true, false, true]);
  const slit = (v: number): boolean => spy(c => paintCityWall(c, v)).raw.includes("rgba(255,246,220,0.4)") && (spy(c => paintCityWall(c, v)).args.arc ?? []).some(a => a[2] === 2.5);
  assert.deepEqual([0, 1, 2, 3].map(slit), [false, false, true, false]);
  for (const v of [0, 1, 2, 3]) assert.ok((spy(c => paintCityWall(c, v)).args.quadraticCurveTo ?? []).length >= 4, `rachaduras curvas na variação ${v}`);
});

test("o portão: Presas (9 presas) e Ossos (7 ossos pendurados), grade erguida, estandarte com caveira e abertura livre", () => {
  const presas = spy(c => paintCityGate(c, 0)), ossos = spy(c => paintCityGate(c, 1));
  assert.notEqual(signature(c => paintCityGate(c, 0)), signature(c => paintCityGate(c, 1)));
  assert.deepEqual(signature(c => paintCityGate(c, 0)), signature(c => paintCityGate(c, 0)));
  assert.equal(signature(c => paintCityGate(c, 7)), signature(c => paintCityGate(c, 0)), "fora de 1 é o portão das presas");
  const fangs = (s: Spy): number => (s.args.lineTo ?? []).filter(a => a[1] === GATE_BEAM_BOTTOM && a[0]! > 0 && Math.abs(a[0]! % 1) > 0 || a[1] === GATE_BEAM_BOTTOM + 9 || a[1] === GATE_BEAM_BOTTOM + 12 || a[1] === GATE_BEAM_BOTTOM + 15).length;
  assert.ok(fangs(presas) >= 9, "as presas penduradas da viga: " + fangs(presas));
  assert.ok((ossos.args.arc ?? []).length > (presas.args.arc ?? []).length, "os ossos pendurados têm cabeças arredondadas");
  for (const s of [presas, ossos]) {
    assert.deepEqual((s.args.scale ?? []).filter(a => a[0] === 1.5).length, 1, "uma caveira no estandarte");
    assert.ok(tone(s, "#3b3f46"), "ferro da grade");
    const bars = (s.args.moveTo ?? []).filter(a => a[1] === GATE_BEAM_BOTTOM && a[0]! >= -GATE_HALF + 8 && (a[0]! + GATE_HALF - 8) % 9 === 0).length;
    assert.ok(bars >= 16, "as barras da grade, uma a cada 9 px: " + bars);
    // a abertura é livre abaixo da grade: nada de contorno entre os pilares (o entulho dos pilares é desenhado deslocado, por isso só se olha acima do chão)
    for (const [x, y] of [...(s.args.lineTo ?? []), ...(s.args.moveTo ?? [])]) if (y! > GATE_BEAM_BOTTOM + 22 && y! < -6) assert.ok(Math.abs(x!) >= GATE_HALF - 4, `desenho dentro da abertura em ${x},${y}`);
  }
});

test("a torre de guarda: ameias, frestas e braseiro; a esquerda é violeta e a direita verde; o fogo nasce nas brasas", () => {
  const left = spy(c => paintCityWatchtower(c, 0)), right = spy(c => paintCityWatchtower(c, 1));
  assert.notEqual(signature(c => paintCityWatchtower(c, 0)), signature(c => paintCityWatchtower(c, 1)));
  assert.equal(left.calls.strokeRect, 5 + 1 + 1, "cinco ameias, a cornija e o soco");
  assert.ok(tone(left, "#8a3b5c") && !tone(left, "#5aa032"), "brasa e estandarte da esquerda");
  assert.ok(tone(right, "#5aa032") && !tone(right, "#8a3b5c"), "brasa e estandarte da direita");
  const coals = (left.args.ellipse ?? []).find(a => a[2] === 8 && a[3] === 2.6)!;
  assert.deepEqual([coals[0], coals[1]], [WATCHTOWER_BRAZIER.x, WATCHTOWER_BRAZIER.y + 6], "as brasas ficam onde o fogo animado se apoia");
  assert.equal((left.args.arc ?? []).filter(a => a[2] === 2.6).length, 3, "três frestas de arqueiro com ponta em arco");
});

test("o poço: anel de 22 blocos, água com degradê e a mesma elipse da animação, totem com caveira, balde e corda", () => {
  const s = spy(c => paintCityWell(c));
  assert.equal((s.args.roundRect ?? []).length, 22, "vinte e dois blocos de borda");
  const water = (s.args.ellipse ?? []).filter(a => a[0] === WELL_WATER.x && a[1] === WELL_WATER.y && a[2] === WELL_WATER.rx && a[3] === WELL_WATER.ry);
  assert.ok(water.length >= 2, "a água é preenchida e contornada pela elipse que a animação usa");
  assert.ok((s.args.scale ?? []).some(a => a[0] === 1.9), "a caveira grande do totem");
  assert.ok(tone(s, "#4b5870") && tone(s, "#0d121a"), "o degradê da água");
  assert.ok(tone(s, "#d3c3a0") || s.raw.some(r => r.startsWith("rgba(211,195,160")), "a corda");
  assert.equal(signature(c => paintCityWell(c)), signature(c => paintCityWell(c)));
});

test("a animação existe só para a torre e a tocha (fogo) e o poço (reflexos), com cores certas e tempo inválido sem efeito", () => {
  assert.deepEqual(["tower", "well", "torch", "wall", "gate", "tent", "palm"].map(cityPropAnimates), [true, true, true, false, false, false, false]);
  assert.deepEqual(spy(c => paintCityPropAnimation(c, "wall", 0, 1)).calls, {});
  assert.deepEqual(spy(c => paintCityPropAnimation(c, "tower", 0, Number.NaN)).calls, {});
  const l = spy(c => paintCityPropAnimation(c, "tower", 0, 0.4)), r = spy(c => paintCityPropAnimation(c, "tower", 1, 0.4));
  assert.ok(tone(l, VIOLET_FLAME.body) && !tone(l, GREEN_FLAME.body), "fogo violeta na esquerda");
  assert.ok(tone(r, GREEN_FLAME.body) && !tone(r, VIOLET_FLAME.body), "fogo verde na direita");
  assert.ok(!tone(l, ORANGE_FLAME.body));
  assert.deepEqual(l.args.translate![0], [WATCHTOWER_BRAZIER.x, WATCHTOWER_BRAZIER.y + 6]);
  assert.notEqual(signature(c => paintCityPropAnimation(c, "tower", 0, 0.4)), signature(c => paintCityPropAnimation(c, "tower", 0, 0.9)), "o fogo dança");
  const w1 = signature(c => paintCityPropAnimation(c, "well", 0, 0.4)), w2 = signature(c => paintCityPropAnimation(c, "well", 0, 0.9));
  assert.notEqual(w1, w2, "os reflexos deslizam");
  const w = spy(c => paintCityPropAnimation(c, "well", 0, 0.4));
  assert.equal(w.calls.clip, 1, "recortados na água");
  assert.equal(w.calls.ellipse, 3, "o recorte e dois reflexos");
  for (const [kind, v] of [["tower", 0], ["well", 0]] as const) { const rec = new Recorder(); paintCityPropAnimation(rec.ctx, kind, v, 0.3); assert.equal(rec.metrics().saves, rec.metrics().restores, kind); }
});

test("o cenário põe o corpo de cada peça no cache, uma vez por variação, e anima só a torre, a tocha e o poço a cada quadro", () => {
  clearSceneryCache();
  let created = 0;
  const doc = { createElement: () => { created++; return { width: 0, height: 0, getContext: () => new Recorder().ctx }; } };
  const frame = (kind: string, variant: number, time: number): Spy => spy(c => withDocument(doc, () => renderScenery(c, { kind: "south-city", cityKind: kind, x: 5, y: 5, variant } as unknown as Scenery, 0, 0, time)));
  for (const v of [0, 1, 2, 3]) frame("wall", v, 0.1);
  assert.equal(created, 4, "quatro trechos de muralha, quatro sprites");
  frame("wall", 5, 0.2); frame("wall", 4, 0.3);
  assert.equal(created, 4, "5 e 4 reaproveitam os sprites 1 e 0");
  frame("gate", 0, 0.1); frame("gate", 1, 0.1); frame("gate", 0, 0.5);
  assert.equal(created, 6);
  const t0 = frame("tower", 0, 0.1), t1 = frame("tower", 0, 0.6), wall = frame("wall", 0, 0.9);
  frame("tower", 1, 0.1); frame("well", 0, 0.1);
  assert.equal(created, 9, "torres 0 e 1 e o poço");
  assert.ok((t0.calls.createRadialGradient ?? 0) >= 1 && (t1.calls.createRadialGradient ?? 0) >= 1, "o fogo é pintado em todo quadro");
  assert.equal(wall.calls.createRadialGradient ?? 0, 0, "a muralha não anima");
  const before = created;
  frame("tent", 0, 0.1); frame("tent", 5, 0.2); frame("tent", 4, 0.3);
  assert.equal(created, before + 2, "tendas 0 e 4; o 5 volta à 0");
  const t2 = frame("torch", 0, 0.1), t3 = frame("torch", 0, 0.7), b1 = frame("barrel", 0, 0.1), b2 = frame("barrel", 0, 0.9);
  assert.equal(created, before + 4, "uma tocha e um barril");
  assert.ok((t2.calls.createRadialGradient ?? 0) >= 1 && (t3.calls.createRadialGradient ?? 0) >= 1, "o fogo da tocha é pintado em todo quadro");
  assert.equal(b1.calls.createRadialGradient ?? 0, 0); assert.equal(b2.calls.createRadialGradient ?? 0, 0);
  clearSceneryCache();
});

test("o pintor de cenário da cidade usa só o cadastro de peças e não desenha tipo sem pintor", () => {
  const source = readFileSync("src/render/south/city/sceneryPainter.ts", "utf8");
  assert.match(source, /CITY_PROP_ART\[kind\]/);
  assert.match(source, /sprite\(`south-city-\$\{kind\}-\$\{v\}`, w, h, ox, oy,/);
  assert.match(source, /if \(cityPropAnimates\(kind\)\) paintCityPropAnimation\(ctx, kind, v, time\)/);
  assert.equal(source.includes("paintSouthCity"), false);
  assert.equal(source.includes("southCityArt"), false);
  for (const [kind, art] of Object.entries(CITY_PROP_ART)) {
    assert.ok(art && art.variants >= 1 && art.box.every(n => n > 0), kind);
    assert.ok(art.box[2] <= art.box[0] && art.box[3] <= art.box[1], `${kind}: a origem fica dentro do sprite`);
  }
});
