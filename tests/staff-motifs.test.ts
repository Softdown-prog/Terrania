import test from "node:test";
import assert from "node:assert/strict";
import { STAFF_IDS, STAVES, type StaffId } from "../src/engine/character/Staves.ts";
import { renderHero } from "../src/render/actors.ts";
import { drawMageStaff } from "../src/render/staves.ts";
import { paintStaffMotif } from "../src/render/staves/motif.ts";
import { paintCoralMotif } from "../src/render/staves/motifs/coral.ts";
import { paintFeatherMotif } from "../src/render/staves/motifs/feather.ts";
import { paintEmberMotif } from "../src/render/staves/motifs/ember.ts";
import { paintThornMotif } from "../src/render/staves/motifs/thorn.ts";
import { paintCrystalMotif } from "../src/render/staves/motifs/crystal.ts";
import { paintSunMotif } from "../src/render/staves/motifs/sun.ts";
import { paintMoonMotif } from "../src/render/staves/motifs/moon.ts";
import { paintCoilMotif } from "../src/render/staves/motifs/coil.ts";
import { paintAstralMotif } from "../src/render/staves/motifs/astral.ts";
import { paintStoneMotif } from "../src/render/staves/motifs/stone.ts";
import { drawSpellBolt } from "../src/render/spells/bolt.ts";
import { drawSpellBurst } from "../src/render/spells/burst.ts";
import { mix } from "../src/render/draw.ts";
import { paintStaffHead } from "../src/render/staves/head.ts";
import { paintStaffShaft } from "../src/render/staves/shaft.ts";
import { Recorder } from "./helpers/recordingContext.ts";
import { signature, spy } from "./helpers/spyContext.ts";

/**
 * O desenho dos cajados do lote 1 (ADR 0073): cada um tem a sua matéria (pena, rocha, coral) atrás e na frente da gema, a cor da gema
 * dele e o projétil da cor dele; o Aprendiz não mudou.
 */
const id = (c: string): string => c;
const MOTIFS = [["breeze", paintFeatherMotif], ["stone", paintStoneMotif], ["tide", paintCoralMotif], ["ember", paintEmberMotif], ["thorn", paintThornMotif], ["frost", paintCrystalMotif], ["sun", paintSunMotif], ["moon", paintMoonMotif], ["storm", paintCoilMotif], ["astral", paintAstralMotif]] as const;
/** Se o desenho usou a cor (#rrggbb ou rgba() dela). */
const usesColor = (s: ReturnType<typeof spy>, hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return s.raw.some(c => c.toLowerCase() === hex || c.replace(/\s/g, "").startsWith(`rgba(${r},${g},${b},`));
};

test("cada matéria desenha atrás e na frente da gema, de forma reproduzível, e o carvalho não desenha nada", () => {
  for (const [staff, paint] of MOTIFS) {
    const v = STAVES[staff].visual;
    const sig = (layer: "back" | "front", time = 1): string => signature(c => paint(c, v, id, time, layer));
    assert.equal(sig("back"), sig("back"), staff + " atrás é reproduzível"); assert.equal(sig("front"), sig("front"), staff + " na frente é reproduzível");
    assert.notEqual(sig("back"), sig("front"), staff + ": as duas camadas são peças diferentes");
    const back = spy(c => paint(c, v, id, 1, "back")), front = spy(c => paint(c, v, id, 1, "front"));
    assert.ok(Object.values(back.calls).reduce((a, b) => a + b, 0) > 20, staff + " atrás tem desenho de verdade");
    assert.ok(Object.values(front.calls).reduce((a, b) => a + b, 0) > 8, staff + " na frente tem desenho de verdade");
    assert.equal(signature(c => paintStaffMotif(c, v, id, 1, "back")), sig("back"), "o despachante escolhe a matéria pela ficha");
    assert.equal(signature(c => paintStaffMotif(c, v, id, 1, "front")), sig("front"));
  }
  assert.equal(signature(c => paintStaffMotif(c, STAVES.apprentice.visual, id, 1, "back")), signature(() => {}), "o carvalho não desenha enfeite atrás");
  assert.equal(signature(c => paintStaffMotif(c, STAVES.apprentice.visual, id, 1, "front")), signature(() => {}), "nem na frente");
});

test("o que se mexe com o relógio: penas e vento, cacos de pedra e bolhas; o que é fixo não se mexe", () => {
  const sig = (staff: StaffId, layer: "back" | "front", time: number): string => signature(c => paintStaffMotif(c, STAVES[staff].visual, id, time, layer));
  assert.notEqual(sig("breeze", "back", 0.5), sig("breeze", "back", 1.4), "as penas balançam");
  assert.notEqual(sig("breeze", "front", 0.5), sig("breeze", "front", 1.4), "o vento gira");
  assert.equal(sig("stone", "back", 0.5), sig("stone", "back", 1.4), "as lascas de rocha ficam paradas");
  assert.notEqual(sig("stone", "front", 0.5), sig("stone", "front", 1.4), "os cacos giram");
  assert.equal(sig("tide", "back", 0.5), sig("tide", "back", 1.4), "o coral fica parado");
  assert.notEqual(sig("tide", "front", 0.5), sig("tide", "front", 1.4), "as bolhas sobem");
  assert.notEqual(sig("ember", "back", 0.5), sig("ember", "back", 1.4), "as chamas balançam"); assert.notEqual(sig("ember", "front", 0.5), sig("ember", "front", 1.4), "as fagulhas sobem");
  assert.notEqual(sig("thorn", "back", 0.5), sig("thorn", "back", 1.4), "as folhas balançam"); assert.notEqual(sig("thorn", "front", 0.5), sig("thorn", "front", 1.4), "as pétalas descem");
  assert.equal(sig("frost", "back", 0.5), sig("frost", "back", 1.4), "os estilhaços de gelo ficam parados"); assert.notEqual(sig("frost", "front", 0.5), sig("frost", "front", 1.4), "as faíscas piscam");
  assert.notEqual(sig("sun", "back", 0.5), sig("sun", "back", 1.4), "os raios do sol respiram"); assert.notEqual(sig("sun", "front", 0.5), sig("sun", "front", 1.4), "os grãos de luz sobem");
  assert.equal(sig("moon", "back", 0.5), sig("moon", "back", 1.4), "a lua e as runas ficam paradas"); assert.notEqual(sig("moon", "front", 0.5), sig("moon", "front", 1.4), "as fitas de sombra ondulam e as estrelas piscam");
  assert.equal(sig("astral", "back", 0.5), sig("astral", "back", 1.4), "a estrela grande e a constelação ficam paradas"); assert.notDeepEqual(sig("astral", "front", 0.5), sig("astral", "front", 1.4), "as estrelinhas giram e a poeira sobe");
  assert.equal(sig("storm", "back", 0.5), sig("storm", "back", 1.4), "a bobina e os pólos ficam parados"); assert.notEqual(sig("storm", "front", 0.5), sig("storm", "front", 1.4), "os arcos elétricos tremem");
});

test("a cor de cada cajado: a haste e a gema vêm da ficha, e o brilho de dano (tone) chega à matéria", () => {
  for (const [staff, paint] of MOTIFS) {
    const v = STAVES[staff].visual, all = spy(c => { paint(c, v, id, 1, "back"); paint(c, v, id, 1, "front"); });
    for (const color of [v.shaft.light, v.shaft.mid, v.shaft.dark]) assert.ok(usesColor(all, color), `${staff} usa a rampa da haste ${color}`);
    assert.ok(usesColor(all, v.gem.light) || usesColor(all, v.gem.glow) || usesColor(all, v.gem.mid), staff + " usa a cor da gema");
    const tinted = spy(c => { paint(c, v, () => "#ff0000", 1, "back"); paint(c, v, () => "#ff0000", 1, "front"); });
    assert.ok(tinted.raw.some(c => c.toLowerCase() === "#ff0000"), staff + ": o brilho de dano pinta a matéria");
    for (const color of [v.shaft.light, v.shaft.mid, v.shaft.dark]) assert.ok(!usesColor(tinted, color), `${staff}: com o brilho de dano nada da rampa ${color} fica sem o brilho`);
  }
});

test("o cajado inteiro é a soma das peças na ordem: haste, matéria de trás, engaste, matéria da frente", () => {
  const ops = (draw: (c: CanvasRenderingContext2D) => void): Record<string, number> => spy(draw).calls;
  const sum = (...parts: Array<Record<string, number>>): Record<string, number> => { const out: Record<string, number> = {}; for (const p of parts) for (const [k, n] of Object.entries(p)) out[k] = (out[k] ?? 0) + n; return out; };
  for (const staff of ["breeze", "stone", "tide", "ember", "thorn", "frost", "sun", "moon", "storm", "astral"] as const) {
    const v = STAVES[staff].visual;
    assert.deepEqual(ops(c => drawMageStaff(c, staff, 1)), sum(ops(c => paintStaffShaft(c, v, id)), ops(c => paintStaffMotif(c, v, id, 1, "back")), ops(c => paintStaffHead(c, v, id, 1)), ops(c => paintStaffMotif(c, v, id, 1, "front"))), staff);
    const order: string[] = [];
    const watch = spy(c => drawMageStaff(c, staff, 1)); assert.ok(watch.calls.fill > 10, staff);
    void order;
  }
  assert.deepEqual(ops(c => drawMageStaff(c, "apprentice", 1)), sum(ops(c => paintStaffShaft(c, STAVES.apprentice.visual, id)), ops(c => paintStaffHead(c, STAVES.apprentice.visual, id, 1))), "o Aprendiz é só haste e engaste");
});

test("as bolhas do coral sobem com o tempo (a altura muda, não só o balanço)", () => {
  const heights = (time: number): number[] => (spy(c => paintCoralMotif(c, STAVES.tide.visual, id, time, "front")).args.arc ?? []).slice(1).map(a => a[1] ?? 0);
  const early = heights(0.2), later = heights(0.6);
  assert.equal(early.length, 3, "três bolhas"); assert.ok(early.every((y, i) => y !== later[i]), "cada bolha está em outra altura");
});

test("o tom do coral intermediário também recebe o brilho de dano", () => {
  const v = STAVES.tide.visual, mid = mix(v.shaft.mid, v.shaft.dark, 0.35);
  const plain = spy(c => { paintCoralMotif(c, v, id, 1, "back"); }), tinted = spy(c => { paintCoralMotif(c, v, () => "#ff0000", 1, "back"); });
  assert.ok(plain.raw.some(c => c.toLowerCase() === mid.toLowerCase()), "o tom intermediário é usado");
  assert.ok(!tinted.raw.some(c => c.toLowerCase() === mid.toLowerCase()), "e some quando o brilho de dano pinta tudo");
});

test("o que sobe, desce e pisca de verdade: a altura das fagulhas e das pétalas muda com o tempo, as faíscas de gelo mudam de tamanho e as chamas são degradês", () => {
  const ys = (staff: StaffId, layer: "back" | "front", time: number, take: number): number[] => (spy(c => paintStaffMotif(c, STAVES[staff].visual, id, time, layer)).args.ellipse ?? []).slice(-take).map(a => a[1] ?? 0);
  const embers = [ys("ember", "front", 0.2, 8), ys("ember", "front", 0.6, 8)]; assert.notDeepEqual(embers[0], embers[1], "as fagulhas mudam de altura");
  assert.ok(embers[0]!.some((y, i) => y !== embers[1]![i]), "a altura (não só o balanço)");
  const petals = [ys("thorn", "front", 0.2, 3), ys("thorn", "front", 1.0, 3)]; assert.ok(petals[0]!.every((y, i) => y !== petals[1]![i]), "cada pétala desce com o tempo");
  const sparkles = (time: number): number[][] => spy(c => paintStaffMotif(c, STAVES.frost.visual, id, time, "front")).args.moveTo ?? [];
  assert.notDeepEqual(sparkles(0.2), sparkles(0.9), "as faíscas de gelo mudam de tamanho ao piscar");
  assert.equal(spy(c => paintStaffMotif(c, STAVES.ember.visual, id, 1, "back")).calls.createLinearGradient, 3, "cada uma das três chamas tem o seu degradê");
});

test("as matérias do lote 4 (astral): a estrela, a órbita e a constelação, e o que se mexe de verdade com o relógio", () => {
  const calls = (layer: "back" | "front"): Record<string, number> => spy(c => paintStaffMotif(c, STAVES.astral.visual, id, 1, layer)).calls;
  const args = (layer: "back" | "front", time: number, fn: string): number[][] => spy(c => paintStaffMotif(c, STAVES.astral.visual, id, time, layer)).args[fn] ?? [];
  assert.equal(calls("back").createRadialGradient, 1, "a estrela grande tem o seu degradê"); assert.equal(calls("back").lineTo, 23, "a estrela de oito pontas (16 vértices), os fios da constelação e as pontas"); assert.equal(calls("back").ellipse, 17, "cinco estrelas da constelação (com o brilho), dois anéis de marfim (três peças cada) e a ponta da haste");
  assert.equal(calls("front").quadraticCurveTo, 20, "duas estrelinhas em órbita e três estrelas que piscam, cada uma de quatro pontas curvas");
  const orbit = (time: number): number[] => args("front", time, "ellipse").slice(0, 4).map(a => a[0] ?? 0); assert.ok(orbit(0.2).every((x, i) => x !== orbit(0.6)[i]), "as estrelinhas giram na órbita");
  const dust = (time: number): number[] => args("front", time, "ellipse").slice(-3).map(a => a[1] ?? 0); assert.equal(dust(0.2).length, 3, "três grãos de poeira"); assert.ok(dust(0.2).every((y, i) => y !== dust(0.6)[i]), "a poeira sobe com o tempo");
  assert.notDeepEqual(args("front", 0.2, "moveTo"), args("front", 0.6, "moveTo"), "as estrelas piscam (mudam de tamanho)");
  const blink = (time: number): number[][] => args("front", time, "moveTo").slice(-3); assert.equal(blink(0.2).length, 3, "três estrelas que piscam");
  assert.ok(blink(0.2).every((p, i) => p[0] === blink(0.6)[i]![0] && p[1] !== blink(0.6)[i]![1]), "ficam no mesmo lugar e mudam de tamanho ao piscar");
  assert.deepEqual(args("back", 1, "arc")[0]?.slice(3), [Math.PI, Math.PI * 2], "a órbita de trás é a metade de cima"); assert.deepEqual(args("front", 1, "arc")[1]?.slice(3), [0, Math.PI], "a da frente é a metade de baixo");
  const gemY = -26 - 7.4, outline = [args("back", 1, "moveTo")[0]!, ...args("back", 1, "lineTo").slice(0, 15)].map(p => Math.round(Math.hypot(p[0] ?? 0, (p[1] ?? 0) - gemY) * 10) / 10);
  assert.equal(outline.length, 16, "dezesseis vértices"); for (const [radius, count] of [[13.5, 4], [8.6, 4], [4.4, 8]] as const) assert.equal(outline.filter(r => r === radius).length, count, `${count} vértices a ${radius} de raio (quatro pontas longas, quatro médias e as reentrâncias)`);
  const tinted = spy(c => { paintAstralMotif(c, STAVES.astral.visual, () => "#ff0000", 1, "back"); paintAstralMotif(c, STAVES.astral.visual, () => "#ff0000", 1, "front"); }); const v = STAVES.astral.visual;
  for (const color of [v.collar, v.collarDark, v.ferrule, v.ferruleLight]) assert.ok(!tinted.raw.some(c => c.toLowerCase() === color.toLowerCase()), "o brilho de dano pinta " + color);
});

test("as matérias do lote 3: as peças certas (raios, voltas de bobina, fitas) e o que se mexe de verdade com o relógio", () => {
  const calls = (staff: StaffId, layer: "back" | "front"): Record<string, number> => spy(c => paintStaffMotif(c, STAVES[staff].visual, id, 1, layer)).calls;
  const args = (staff: StaffId, layer: "back" | "front", time: number, fn: string): number[][] => spy(c => paintStaffMotif(c, STAVES[staff].visual, id, time, layer)).args[fn] ?? [];
  assert.equal(calls("sun", "back").createLinearGradient, 12, "doze raios, cada um com o seu degradê"); assert.equal(calls("sun", "back").createRadialGradient, 1, "e o disco com o dele");
  assert.equal(calls("moon", "back").createLinearGradient, 1, "a lua crescente tem um degradê"); assert.equal(calls("moon", "front").quadraticCurveTo, 6, "duas fitas de sombra de três curvas (o corpo em duas e o fio)");
  assert.equal(calls("storm", "back").quadraticCurveTo, 19, "dois pólos (duas curvas cada) e cinco voltas de bobina (três curvas cada)");
  assert.equal(calls("storm", "back").createLinearGradient, 2, "um degradê em cada pólo");
  const motes = (time: number): number[] => args("sun", "front", time, "ellipse").map(a => a[1] ?? 0);
  assert.equal(motes(0.2).length, 8, "quatro grãos de luz, cada um com o halo"); assert.ok(motes(0.2).every((y, i) => y !== motes(0.6)[i]), "cada grão está em outra altura (sobe com o tempo, não só balança)");
  assert.notDeepEqual(args("sun", "front", 0.2, "moveTo"), args("sun", "front", 0.6, "moveTo"), "o clarão em cruz pulsa"); assert.notDeepEqual(args("sun", "back", 0.2, "lineTo"), args("sun", "back", 0.6, "lineTo"), "os raios crescem e encolhem");
  assert.notDeepEqual(args("moon", "front", 0.2, "quadraticCurveTo"), args("moon", "front", 0.6, "quadraticCurveTo"), "as fitas de sombra ondulam"); assert.notDeepEqual(args("moon", "front", 0.2, "moveTo"), args("moon", "front", 0.6, "moveTo"), "as estrelas mudam de tamanho");
  assert.notDeepEqual(args("storm", "front", 0.2, "lineTo"), args("storm", "front", 0.6, "lineTo"), "os arcos elétricos mudam de caminho");
  const arcXY = (time: number, axis: 0 | 1): Array<number | undefined> => args("storm", "front", time, "lineTo").map(a => a[axis]);
  assert.notDeepEqual(arcXY(0.2, 0), arcXY(0.6, 0), "os arcos tremem de lado"); assert.notDeepEqual(arcXY(0.2, 1), arcXY(0.6, 1), "e de altura");
  const sparks = (time: number): number[] => args("storm", "front", time, "ellipse").map(a => a[2] ?? 0); assert.equal(sparks(0.2).length, 3); assert.ok(sparks(0.2).every((r, i) => r !== sparks(0.6)[i]), "cada faísca solta muda de tamanho");
  const colors = (time: number): string[] => spy(c => paintStaffMotif(c, STAVES.storm.visual, id, time, "front")).raw; assert.notDeepEqual(colors(0.2), colors(0.6), "os arcos acendem e apagam (a transparência muda)");
  const glowAlphas = (time: number): string[] => spy(c => paintStaffMotif(c, STAVES.storm.visual, id, time, "front")).raw.filter(c => c.replace(/\s/g, "").startsWith("rgba(111,176,255,"));
  assert.ok(glowAlphas(0.2).length > 2, "os arcos têm o brilho da cor da gema"); assert.notDeepEqual(glowAlphas(0.2), glowAlphas(0.6), "o brilho dos arcos acende e apaga");
  const tips = (time: number): number[][] => args("moon", "front", time, "quadraticCurveTo").map(a => [a[0] ?? 0, a[2] ?? 0]); assert.notDeepEqual(tips(0.2), tips(0.6), "as fitas de sombra ondulam para os lados (não só crescem)");
  const arcs: unknown[][] = [], recorder = new Recorder(), probe = new Proxy(recorder.ctx, { get(target, prop) { const value = (target as unknown as Record<string | symbol, unknown>)[prop]; return typeof value === "function" ? (...a: unknown[]) => { if (prop === "arc") arcs.push(a); return (value as (...x: unknown[]) => unknown).apply(target, a); } : value; } });
  paintStaffMotif(probe, STAVES.moon.visual, id, 1, "back"); assert.equal(arcs[0]?.[5], undefined, "o arco de fora da lua segue o sentido normal"); assert.equal(arcs[1]?.[5], true, "o de dentro volta no sentido contrário, o que deixa só a foice");
  const copper = ["#ffc98a", "#d98a3d", "#6e3a12"], plain = spy(c => paintStaffMotif(c, STAVES.storm.visual, id, 1, "back")), tinted = spy(c => paintStaffMotif(c, STAVES.storm.visual, () => "#ff0000", 1, "back"));
  for (const color of copper) { assert.ok(plain.raw.some(c => c.toLowerCase() === color), "a bobina usa o cobre " + color); assert.ok(!tinted.raw.some(c => c.toLowerCase() === color), "e o brilho de dano pinta o cobre " + color); }
});

test("os onze cajados inteiros são diferentes entre si, cada um da cor da sua gema, e o Aprendiz continua o mesmo", () => {
  const sigs = STAFF_IDS.map(staff => signature(c => drawMageStaff(c, staff, 1)));
  assert.equal(new Set(sigs).size, STAFF_IDS.length, "nenhum cajado repete o desenho de outro");
  for (const staff of STAFF_IDS) {
    const s = spy(c => drawMageStaff(c, staff, 1)), v = STAVES[staff].visual;
    assert.ok(usesColor(s, v.gem.mid) && usesColor(s, v.gem.light), staff + " tem a gema da cor dele");
    assert.ok(usesColor(s, v.shaft.mid), staff + " tem a haste da cor dele");
  }
  const bare = spy(c => drawMageStaff(c, "apprentice", 1));
  assert.ok(!usesColor(bare, STAVES.breeze.visual.gem.mid) && !usesColor(bare, STAVES.stone.visual.gem.mid) && !usesColor(bare, STAVES.tide.visual.gem.mid), "o Aprendiz não pegou cor emprestada");
  for (const staff of ["breeze", "stone", "tide", "ember", "thorn", "frost", "sun", "moon", "storm", "astral"] as const) {
    assert.notEqual(signature(c => drawMageStaff(c, staff, 1, id, 1)), signature(c => drawMageStaff(c, staff, 1)), staff + " acende a gema ao carregar a magia");
    assert.notEqual(signature(c => drawMageStaff(c, staff, 0.2)), signature(c => drawMageStaff(c, staff, 1.7)), staff + " se mexe com o relógio");
  }
});

test("o mago de cada cajado: a mão segura o cajado equipado, de qualquer elemento", () => {
  const pose = (staff: StaffId): string => signature(c => renderHero(c, { faceX: 1, faceY: 0, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: staff } as never, 3, 4, 1.2));
  assert.equal(new Set(STAFF_IDS.map(pose)).size, STAFF_IDS.length, "cada cajado muda o desenho do mago");
  const withTide = spy(c => renderHero(c, { faceX: 1, faceY: 0, walkTime: 0.3, attackTime: 0, vx: 0, vy: 0, id: "m", heroClass: "mage", equippedStaff: "tide" } as never, 3, 4, 1.2));
  assert.ok(usesColor(withTide, STAVES.tide.visual.gem.mid), "o mago com as Marés tem a pérola azul na mão");
});

test("o projétil e o estouro de cada cajado têm a cor da gema dele", () => {
  for (const staff of STAFF_IDS) {
    const g = STAVES[staff].visual.gem, bolt = spy(c => drawSpellBolt(c, staff, 0.5, 1)), burst = spy(c => drawSpellBurst(c, staff, 0.25));
    for (const color of [g.light, g.mid, g.glow]) { assert.ok(usesColor(bolt, color), `${staff}: projétil ${color}`); assert.ok(usesColor(burst, color) || color === g.mid, `${staff}: estouro ${color}`); }
  }
  assert.equal(new Set(STAFF_IDS.map(staff => signature(c => drawSpellBolt(c, staff, 0.5, 1)))).size, STAFF_IDS.length, "cada cajado tem o projétil da sua cor");
  assert.equal(new Set(STAFF_IDS.map(staff => signature(c => drawSpellBurst(c, staff, 0.25)))).size, STAFF_IDS.length);
});
