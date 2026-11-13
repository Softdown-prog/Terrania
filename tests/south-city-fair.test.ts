import test from "node:test";
import assert from "node:assert/strict";
import { paintCityArena, paintCityBarrel, paintCityBones, paintCityCorral, paintCityPalm, paintCitySign, paintCityStall, paintCityTent, paintCityTorch,
  paintCityPropAnimation, CITY_PROP_ART } from "../src/render/south/city/props/index.ts";
import { TORCH_FIRE } from "../src/render/south/city/props/torch.ts";
import { GREEN_FLAME, VIOLET_FLAME } from "../src/render/south/city/buildings/flame.ts";
import { BONE, POISON, WINE, BRONZE } from "../src/render/south/city/buildings/palette.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy, usesTone, type Spy } from "./helpers/spyContext.ts";

/**
 * A feira e o resto das peças da cidade do Poço Negro (ADR 0050): tendas, barracas, tochas, ossos, barris, placas, palmeiras, arena e
 * curral. Cada peça tem forma e cor próprias, é estável por variação e deixa o canvas como encontrou (save e restore em par).
 */
const count = (s: Spy, method: string, pick: (a: number[]) => boolean): number => (s.args[method] ?? []).filter(pick).length;
const balanced = (draw: (c: CanvasRenderingContext2D) => void): boolean => { const r = new Recorder(); draw(r.ctx); const m = r.metrics(); return m.saves === m.restores; };

test("a tenda: cinco variações, cada uma na sua cor de pano; 5 é a 0 e o valor inválido é a 0", () => {
  const sigs = [0, 1, 2, 3, 4].map(v => signature(c => paintCityTent(c, v)));
  assert.equal(new Set(sigs).size, 5);
  assert.deepEqual([0, 1, 2, 3, 4].map(v => signature(c => paintCityTent(c, v))), sigs, "estável");
  assert.equal(signature(c => paintCityTent(c, 5)), sigs[0]);
  assert.equal(signature(c => paintCityTent(c, -2)), sigs[2]);
  assert.equal(signature(c => paintCityTent(c, Number.NaN)), sigs[0]);
  // as listras do pano (claro a 40%) têm a cor da variação: cada tenda usa só as suas
  const rgb = (h: string): string => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},0.4)`;
  const stripes = [WINE.light, "#a64d70", POISON.light, BRONZE.light, "#b0587a"].map(rgb);
  const used = [0, 1, 2, 3, 4].map(v => spy(c => paintCityTent(c, v)));
  used.forEach((u, v) => stripes.forEach((st, other) => assert.equal(u.raw.includes(st), v === other, `tenda ${v}, listras da ${other}`)));
  assert.ok(balanced(c => paintCityTent(c, 0)));
});

test("a tenda tem sete listras no pano, seis ondas na bainha, dois mastros de osso e cordas até as estacas", () => {
  const s = spy(c => paintCityTent(c, 0));
  assert.equal(count(s, "arc", a => a[2] === 3.5 && a[4] === Math.PI), 6, "ondas da bainha (meia-lua de raio 3,5)");
  assert.equal(count(s, "fillRect", a => a[2] === 3 && a[3] === 28), 2, "dois mastros");
  assert.equal(count(s, "fillRect", a => a[2] === 52 && a[3] === 20), 1, "a boca escura");
  assert.equal(s.calls.clip, 1, "listras só dentro do pano");
  assert.deepEqual((s.args.arc ?? []).filter(a => a[2] === 3.5).map(a => a[0]), [-34.5, -27.5, -20.5, -13.5, -6.5, 0.5], "ondas de 7 em 7 px");
});

test("a barraca: cinco frutas em duas cores, dois potes, caveira de enfeite, dois postes e toldo listrado", () => {
  const s = spy(c => paintCityStall(c));
  const fruits = (s.args.ellipse ?? []).filter(a => a[2] === 4 && a[3] === 3.4);
  assert.deepEqual(fruits.map(a => a[0]), [-21, -11, -1, 9, 19]);
  assert.deepEqual((s.args.ellipse ?? []).filter(a => a[3] === (4.4 * 1.2) || a[3] === 3.6 * 1.2).map(a => a[2]), [4.4, 3.6], "dois potes");
  assert.equal(count(s, "fillRect", a => a[2] === 2.8 && a[3] === 26), 2, "postes do toldo");
  assert.ok(usesTone(s, WINE.base.toLowerCase()) || s.raw.some(r => r.toLowerCase().includes(WINE.base.toLowerCase())), "toldo vinho");
  assert.ok(balanced(c => paintCityStall(c)));
  assert.equal(signature(c => paintCityStall(c)), signature(c => paintCityStall(c)));
});

test("a tocha: variações par/ímpar têm brasa e fogo de cores diferentes, e o fogo nasce no centro da bacia", () => {
  const a = spy(c => paintCityTorch(c, 0)), b = spy(c => paintCityTorch(c, 1));
  assert.ok(usesTone(a, "#8a3b5c") && !usesTone(a, "#5aa032"));
  assert.ok(usesTone(b, "#5aa032") && !usesTone(b, "#8a3b5c"));
  assert.notEqual(signature(c => paintCityTorch(c, 0)), signature(c => paintCityTorch(c, 1)));
  assert.equal(signature(c => paintCityTorch(c, 2)), signature(c => paintCityTorch(c, 0)));
  assert.equal(signature(c => paintCityTorch(c, Number.NaN)), signature(c => paintCityTorch(c, 0)));
  assert.ok((a.args.ellipse ?? []).some(e => e[0] === TORCH_FIRE.x && e[1] === TORCH_FIRE.y && e[2] === 8), "as brasas ficam onde o fogo se apoia");
  assert.equal(count(a, "fillRect", e => e[2] === 6.8 && e[3] === 1.8), 3, "três anéis no poste");
});

test("o fogo da tocha: violeta nas pares, verde nas ímpares, aceso na bacia, dançando e sem efeito com tempo inválido", () => {
  const even = spy(c => paintCityPropAnimation(c, "torch", 0, 0.4)), odd = spy(c => paintCityPropAnimation(c, "torch", 1, 0.4));
  assert.ok(usesTone(even, VIOLET_FLAME.body) && !usesTone(even, GREEN_FLAME.body));
  assert.ok(usesTone(odd, GREEN_FLAME.body) && !usesTone(odd, VIOLET_FLAME.body));
  assert.deepEqual(even.args.translate![0], [TORCH_FIRE.x, TORCH_FIRE.y]);
  assert.notEqual(signature(c => paintCityPropAnimation(c, "torch", 0, 0.4)), signature(c => paintCityPropAnimation(c, "torch", 0, 0.9)));
  assert.deepEqual(spy(c => paintCityPropAnimation(c, "torch", 0, Number.POSITIVE_INFINITY)).calls, {});
  assert.ok(balanced(c => paintCityPropAnimation(c, "torch", 0, 0.3)));
});

test("ossos, barril e placa: cada um com seus detalhes e a sombra no chão", () => {
  const bones = spy(c => paintCityBones(c));
  const ribs = (bones.args.arc ?? []).filter(a => a[2]! >= 4.2);
  assert.equal(ribs.length, 8, "quatro costelas, cada uma com o realce");
  assert.deepEqual(ribs.filter((_, i) => i % 2 === 0).map(a => a[2]), [6, 5.4, 4.8, 4.2], "afinam de uma ponta à outra");
  assert.deepEqual(ribs.filter((_, i) => i % 2 === 0).map(a => a[0]), [-23, -17, -11, -5], "de 6 em 6 px");
  assert.ok(usesTone(bones, BONE.base.toLowerCase()));
  const barrel = spy(c => paintCityBarrel(c));
  assert.equal(count(barrel, "fillRect", a => a[2] === 22.4 && a[3] === 1.8), 3, "três aros de ferro");
  assert.equal(barrel.calls.createLinearGradient! >= 1, true);
  assert.ok(barrel.raw.includes("rgba(30,20,16,0.7)"), "a mancha de alcatrão");
  const sign = spy(c => paintCitySign(c));
  assert.equal(count(sign, "strokeRect", a => a[2] === 34 && a[3] === 14), 1, "a tábua");
  assert.equal(count(sign, "ellipse", a => a[2] === 1 && a[3] === 1), 4, "quatro pregos");
  for (const draw of [paintCityBones, paintCityBarrel, paintCitySign]) assert.ok(balanced(draw));
});

test("a palmeira: oito folhas saindo da copa, cinco tâmaras, anéis no tronco e duas folhas secas", () => {
  const s = spy(c => paintCityPalm(c));
  assert.equal(count(s, "moveTo", a => a[0] === 0 && a[1] === -55), 16, "nervura e realce de cada uma das oito folhas");
  assert.equal(count(s, "ellipse", a => a[2] === 2.2 && a[3] === 2.8), 5, "tâmaras");
  assert.equal(s.calls.clip, 1, "anéis só dentro do tronco");
  assert.ok(usesTone(s, POISON.base.toLowerCase()) && usesTone(s, POISON.light.toLowerCase()) && usesTone(s, POISON.dark.toLowerCase()));
  assert.equal(signature(c => paintCityPalm(c)), signature(c => paintCityPalm(c)));
});

test("a arena: três degraus de arquibancada, 90 assentos, picadeiro, doze pontas de osso e pedra e quatro bandeiras", () => {
  const s = spy(c => paintCityArena(c));
  assert.deepEqual((s.args.ellipse ?? []).slice(1, 4).map(a => [a[2], a[3]]), [[94, 59], [86, 52], [78, 45]]);
  assert.equal(count(s, "fillRect", a => a[2] === 4.8 && a[3] === 3.2), 26 + 30 + 34, "assentos");
  assert.equal(count(s, "fillRect", a => a[2] === 6 && a[3] === 8), 12, "pontas de osso e pedra");
  assert.equal(count(s, "ellipse", a => a[2] === 1.8 && a[3] === 1.8), 4, "bronze no alto de cada mastro");
  assert.equal(count(s, "ellipse", a => a[2] === 1.4 && a[3] === 0.9), 14 * 3, "rastros de patas no picadeiro");
  assert.equal(s.calls.createRadialGradient, 1);
  assert.ok(balanced(c => paintCityArena(c)));
});

test("o curral: duas cercas de nove estacas e três travessas, mourões altos nas pontas, fardo de palha e cocho", () => {
  const s = spy(c => paintCityCorral(c));
  assert.equal(count(s, "fillRect", a => a[2] === 4 && a[3] === 16), 18, "estacas das duas cercas");
  assert.equal(count(s, "fillRect", a => a[2] === 132 && a[3] === 3), 6, "travessas");
  assert.equal(count(s, "fillRect", a => a[2] === 4 && a[3] === 48), 2, "mourões");
  assert.equal(count(s, "fillRect", a => a[2] === 22 && a[3] === 12), 1, "fardo");
  assert.equal(count(s, "fillRect", a => a[2] === 20 && a[3] === 8), 1, "cocho");
  assert.ok(balanced(c => paintCityCorral(c)));
});

test("o cadastro: cada peça nova cabe no seu sprite, com a origem dentro e o desenho ancorado no chão", () => {
  for (const kind of ["tent", "stall", "torch", "bones", "barrel", "sign", "palm", "arena", "corral"]) {
    const art = CITY_PROP_ART[kind]!;
    assert.ok(art, kind);
    const [w, h, ox, oy] = art.box;
    assert.ok(w > ox && h > oy, `${kind}: sobra espaço à direita e embaixo da origem`);
    for (let v = 0; v < art.variants; v++) assert.ok(balanced(c => art.paint(c, v)), `${kind} ${v}`);
  }
  assert.deepEqual(["tent", "torch"].map(k => CITY_PROP_ART[k]!.variants), [5, 2]);
  assert.deepEqual(["stall", "bones", "barrel", "sign", "palm", "arena", "corral"].map(k => CITY_PROP_ART[k]!.variants), [1, 1, 1, 1, 1, 1, 1]);
});
