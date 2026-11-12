import test from "node:test";
import assert from "node:assert/strict";
import { BUILDING_PAINTERS } from "../src/render/south/city/buildings/index.ts";
import { BuildingKit } from "../src/render/south/city/buildings/kit.ts";
import { BONE, HIDE, STRAW, WOOD } from "../src/render/south/city/buildings/palette.ts";
import { Recorder } from "./helpers/recordingContext.ts";

/**
 * Ossuário, estábulo e moradias da cidade (ADR 0044): os telhados de palha e de couro, o osso e a caveira do kit, e a
 * identidade de cada um dos seis prédios.
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
const paint = (id: string): Spy => spy(c => BUILDING_PAINTERS[id]!(c));

test("o telhado de palha: fios em três tons, franja no beiral, cumeeira amarrada e sombra na parede", () => {
  const roof = (high: number): Spy => spy(c => new BuildingKit(c).thatchRoof(-40, 40, 0, -high, 6, STRAW, 2));
  const r = roof(28);
  for (const tone of [STRAW.light, STRAW.base, STRAW.dark]) assert.ok(r.raw.some(x => x.startsWith("rgba(") || x === tone), tone);
  assert.ok((r.args.lineTo ?? []).length > 40, "um fio a cada 2,4 px: " + r.args.lineTo?.length);
  assert.ok((r.args.fillRect ?? []).filter(a => a[1] === 0 && a[2] === 2).length > 25, "franja de palha no beiral");
  assert.ok(r.raw.includes("rgba(34,26,43,0.4)"), "sombra do beiral");
  assert.ok(r.raw.includes("#6a4a2a"), "cumeeira amarrada");
  assert.notEqual(signature(c => new BuildingKit(c).thatchRoof(-40, 40, 0, -28, 6, STRAW, 2)), signature(c => new BuildingKit(c).thatchRoof(-40, 40, 0, -28, 6, STRAW, 3)));
  assert.ok((roof(40).args.lineTo ?? []).length === (roof(20).args.lineTo ?? []).length, "o número de fios depende só da largura");
});

test("o telhado de couro: painéis costurados que crescem com a largura, remendos tracejados e o travessão de osso", () => {
  const roof = (w: number): Spy => spy(c => new BuildingKit(c).hideRoof(-w, w, 0, -26, 6, HIDE, 4));
  assert.ok((roof(60).args.lineTo ?? []).length > (roof(30).args.lineTo ?? []).length, "mais largura, mais costuras");
  const r = roof(36);
  assert.equal((r.args.setLineDash ?? []).length, 6, "três remendos, cada um com o tracejado ligado e desligado");
  assert.equal(r.calls.strokeRect, 3, "contorno dos remendos");
  assert.ok(r.raw.includes("#efe3c8"), "o travessão de osso no cume");
  assert.ok(r.raw.includes("rgba(34,26,43,0.4)"), "sombra do beiral");
});

test("o osso tem haste e duas cabeças, e a caveira tem crânio, maxilar, órbitas, nariz e dentes", () => {
  const bone = spy(c => new BuildingKit(c).bone(0, 0, 12, 0, 2));
  assert.equal((bone.args.arc ?? []).length, 4, "duas cabeças de dois lóbulos");
  assert.ok(bone.raw.includes("#efe3c8") && bone.raw.includes("#a08f6c") && bone.raw.includes("#d3c3a0"));
  assert.notEqual(signature(c => new BuildingKit(c).bone(0, 0, 12, 0, 2)), signature(c => new BuildingKit(c).bone(0, 0, 12, 6, 2)));
  const skull = spy(c => new BuildingKit(c).skull(5, 5, 1));
  assert.equal((skull.args.fillRect ?? []).length, 5, "cinco dentes");
  assert.ok(skull.raw.includes("#221a2b"), "órbitas e nariz");
  assert.deepEqual(skull.args.translate![0], [5, 5]);
  assert.deepEqual(skull.args.scale![0], [1, 1]);
  const big = spy(c => new BuildingKit(c).skull(0, 0, 2));
  assert.deepEqual(big.args.scale![0], [2, 2]);
  const r = new Recorder(); new BuildingKit(r.ctx).skull(0, 0, 1);
  assert.equal(r.metrics().saves, r.metrics().restores);
});

test("o Ossuário tem um friso de sete caveiras, nove espetos de osso, duas urnas e a pilha de ossos", () => {
  const s = paint("south-ossuary");
  const scales = (k: number): number => (s.args.scale ?? []).filter(a => a[0] === k).length;
  assert.deepEqual([scales(0.85), scales(1.3), scales(0.9)], [7, 1, 1], "sete caveiras menores no friso, uma maior sobre a porta e uma no chão");
  assert.equal((s.args.ellipse ?? []).filter(a => a[2] === 6 && a[3] === 8).length, 2, "duas urnas");
  assert.ok(s.raw.includes("#1e1818"), "os nichos são fundos");
  assert.ok((s.args.arc ?? []).length > 12, "ossos da pilha com cabeça");
});

test("o Estábulo tem a baia escura com meia-porta, feno, cocho com água, poste com argola e telhado de palha", () => {
  const s = paint("south-stable");
  assert.ok(s.raw.includes("#171210"), "baia escura");
  assert.ok((s.args.fillRect ?? []).some(a => a[0] === -14 && a[1] === -13 && a[2] === 28 && a[3] === 13), "a meia-porta de madeira");
  assert.ok(s.raw.includes("#2f6f73"), "água do cocho");
  assert.equal(s.raw.filter(r => r === "rgba(255,207,106,0.35)").length, 2, "dois olhos de lagarto no escuro");
  assert.ok((s.args.arc ?? []).some(a => a[2] === 2.4), "argola de ferro");
  assert.ok((s.args.lineTo ?? []).length > 150, "palha no telhado: " + s.args.lineTo?.length);
  assert.ok(s.raw.includes(STRAW.light) || s.raw.some(r => r.startsWith("rgba(236,213,142")), "tom de palha");
  assert.ok(s.raw.includes(WOOD.light) || s.raw.includes(WOOD.base), "madeira");
});

test("a Casa de Argila tem vigas aparecendo, janela redonda, pimentas no varal e potes", () => {
  const s = paint("south-home-clay");
  const beams = (s.args.arc ?? []).filter(a => a[2] === 2.8);
  assert.equal(beams.length, 8, "oito pontas de viga sob o teto (a cada 9 px)");
  assert.equal((s.args.arc ?? []).filter(a => a[2] === 6.5).length, 2, "janela redonda: o vidro com a moldura clara e o contorno");
  assert.ok(s.raw.includes("#c9503f") && s.raw.includes("#e0a24a"), "pimentas vermelhas e amarelas");
  assert.equal((s.args.roundRect ?? []).length, 1, "teto plano de platibanda arredondada");
});

test("a Tenda de Couro é um cone vinho em painéis, com entrada de aba, ossos cruzados e franja de pelos", () => {
  const s = paint("south-home-hide");
  assert.ok(s.raw.includes("#171210"), "entrada escura");
  assert.equal((s.args.setLineDash ?? []).length, 8, "quatro remendos tracejados");
  assert.ok((s.args.arc ?? []).length >= 8, "dois ossos cruzados, quatro lóbulos cada");
  assert.ok((s.args.lineTo ?? []).length > 100, "costuras, pontos de linha e franja");
  assert.ok(s.raw.includes("#a08f6c"), "vareta de osso que segura a aba");
});

test("o Casebre de Ossos tem paredes de ossos deitados, telhado de couro, costelas e a caveira grande", () => {
  const s = paint("south-home-bone");
  assert.equal((s.args.arc ?? []).length, 99, "cinco fiadas de ossos (quatro cabeças de duas pontas cada), a caveira, as costelas e o resto");
  assert.ok((s.args.scale ?? []).some(a => a[0] === 1.5), "a caveira grande sobre a porta");
  assert.ok(s.raw.includes("#2a2018"), "vão escuro entre os ossos");
  assert.ok((s.args.setLineDash ?? []).length === 6, "o telhado de couro tem três remendos");
  assert.ok(s.raw.includes("#d3c3a0"), "costelas de moldura");
});

test("a Barraca sobre Estacas tem quatro estacas com travessas, plataforma, escada de mão e potes pendurados", () => {
  const s = paint("south-home-stilts");
  const posts = (s.args.fillRect ?? []).filter(a => a[2] === 6 && a[3] === 16);
  assert.deepEqual(posts.map(a => a[0]).sort((a, b) => a! - b!), [-33, -13, 7, 27], "quatro estacas de 6 px, do chão à plataforma");
  assert.ok((s.args.fillRect ?? []).some(a => a[0] === -40 && a[2] === 80 && a[3] === 5), "a plataforma de tábuas");
  assert.equal((s.args.ellipse ?? []).filter(a => a[2] === 3 && a[3] === 3.4).length, 2, "dois potes pendurados");
  assert.ok((s.args.lineTo ?? []).length > 40, "travessas, escada e costuras");
  assert.ok(s.raw.includes("#d98b5b") || s.raw.some(r => r.startsWith("rgba(217,139,91")) || s.raw.includes("#a8613a"), "barro dos potes");
  assert.ok(BONE.base.length === 7, "paleta de osso");
});
