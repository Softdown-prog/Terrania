import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster, regionalSurfaceSpawns, southCommonSpawns, caveMonsterKinds, rollCreatureLoot } from "../src/actors/RegionalMonster.ts";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS } from "../src/actors/CreatureCatalog.ts";
import { CENTER_KINDS } from "../src/monsters/catalog.ts";
import { CENTER_MONSTERS } from "../src/monsters/center/index.ts";
import { SPECIES_BEHAVIORS, speciesRetreats, pursuitStep } from "../src/monsters/behavior.ts";
import { renderRegionalCreature } from "../src/render/regionalCreatures.ts";
import { drawGiantRat, CREATURE_PALETTE as GIANT_RAT_PALETTE } from "../src/render/creatures/center/rats/giantRat.ts";
import { drawCaveBat, CREATURE_PALETTE as CAVE_BAT_PALETTE } from "../src/render/creatures/center/bats/caveBat.ts";
import { drawRootSpider, CREATURE_PALETTE as ROOT_SPIDER_PALETTE } from "../src/render/creatures/center/spiders/rootSpider.ts";
import { creatureMotion } from "../src/render/creatures/shared/creatureMotion.ts";
import { hashString } from "../src/render/draw.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import { rollCoinDrop } from "../src/engine/character/coins/index.ts";
import { normalizeMaterials } from "../src/engine/character/Inventory.ts";

/**
 * Lote 1 do bestiário do Centro (ADR 0087, docs/BESTIARIO_CENTRO.md): rato gigante, morcego de caverna e aranha das raízes. Cada um tem ficha, comportamento e
 * desenho no seu arquivo; a mistura na Gruta das Raízes é testada em cave-central-monsters.test.ts.
 */
const open = { canMove: () => true, speedAt: () => 1 };
const capture = (draw: (ctx: CanvasRenderingContext2D) => void) => { const r = new Recorder(); return withFakeDocument(r, () => { draw(r.ctx); return r.metrics(); }); };
const FILES = { "giant-rat": ["rats", "giant-rat", "giantRat"], "cave-bat": ["bats", "cave-bat", "caveBat"], "root-spider": ["spiders", "root-spider", "rootSpider"] } as const;

test("as três criaturas têm a ficha do documento do bestiário (região Centro, caverna verde, saque próprio)", () => {
  assert.deepEqual([...CENTER_KINDS], ["giant-rat", "cave-bat", "root-spider"]);
  const sheet = (kind: typeof CENTER_KINDS[number]) => { const d = CREATURE_CATALOG[kind]; return [d.name, d.maxHp, d.contactDamage, d.experience, d.special, d.status, d.region, [...d.caveThemes]]; };
  assert.deepEqual(sheet("giant-rat"), ["Rato Gigante", 28, 5, 9, "none", null, "center", ["verdant"]]);
  assert.deepEqual(sheet("cave-bat"), ["Morcego de Caverna", 24, 6, 11, "none", null, "center", ["verdant"]]);
  assert.deepEqual(sheet("root-spider"), ["Aranha das Raízes", 38, 7, 15, "web", "weak-venom", "center", ["verdant"]]);
  // ritmo de cada um: velocidade, alcance, intervalo entre golpes e duração do efeito (o morcego é o mais veloz; a aranha, a mais lenta)
  const pace = (kind: typeof CENTER_KINDS[number]) => { const d = CREATURE_CATALOG[kind]; return [d.speed, d.range, d.interval, d.statusSeconds]; };
  assert.deepEqual(pace("giant-rat"), [88, 24, .7, 0]); assert.deepEqual(pace("cave-bat"), [104, 22, .55, 0]); assert.deepEqual(pace("root-spider"), [70, 26, .95, 3]);
  assert.ok(pace("cave-bat")[0]! > pace("giant-rat")[0]! && pace("giant-rat")[0]! > pace("root-spider")[0]!);
  assert.deepEqual(CENTER_KINDS.map(k => CREATURE_CATALOG[k].biomes), [["meadow", "woodland", "trail"], ["woodland", "trail"], ["woodland", "trail"]]);
  assert.deepEqual(CREATURE_CATALOG["giant-rat"].loot, [{ item: "Rabo de Rato Gigante", chance: .55 }, { item: "Dente de Roedor", chance: .3 }]);
  assert.deepEqual(CREATURE_CATALOG["cave-bat"].loot, [{ item: "Asa de Morcego", chance: .5 }, { item: "Guano Seco", chance: .25 }]);
  assert.deepEqual(CREATURE_CATALOG["root-spider"].loot, [{ item: "Fio de Teia", chance: .5 }, { item: "Presa de Aranha", chance: .25 }]);
  assert.deepEqual(Object.keys(CENTER_MONSTERS).sort(), ["cave-bat", "giant-rat", "root-spider", "slime"]);
  // o Centro é o começo do jogo: vida até 40, dano até 7, experiência até 15 (as outras regiões chegam a 450 de vida e 40 de dano)
  for (const kind of CENTER_KINDS) { const d = CREATURE_CATALOG[kind]; assert.ok(d.maxHp <= 40 && d.contactDamage <= 7 && d.experience <= 15, kind); }
  assert.ok(Math.max(...REGIONAL_CREATURE_KINDS.map(k => CREATURE_CATALOG[k].maxHp)) >= 10 * CREATURE_CATALOG["root-spider"].maxHp, "o resto do mundo continua muito mais duro");
});

test("cada criatura mora no seu arquivo: ficha em monsters/center/<família>/, desenho em render/creatures/center/<família>/", () => {
  for (const [kind, [family, file, painter]] of Object.entries(FILES)) {
    const sheet = `src/monsters/center/${family}/${file}.ts`, art = `src/render/creatures/center/${family}/${painter}.ts`;
    assert.ok(existsSync(sheet) && existsSync(art), kind);
    assert.deepEqual(readdirSync(`src/monsters/center/${family}`), [`${file}.ts`], family + ": um arquivo por criatura");
    assert.deepEqual(readdirSync(`src/render/creatures/center/${family}`), [`${painter}.ts`]);
    assert.match(readFileSync(sheet, "utf8"), /satisfies CreatureDefinition/); assert.match(readFileSync(sheet, "utf8"), /satisfies SpeciesBehavior/);
    assert.ok(readFileSync(art, "utf8").length > 3000, kind + ": desenho com anatomia de verdade");
  }
});

test("comportamento: o rato ronda, o morcego zigue-zagueia e foge quase morto, a aranha cerca devagar; nenhum repete o perfil de outro", () => {
  assert.deepEqual(SPECIES_BEHAVIORS["giant-rat"], { gait: "skitter", pursuit: "flank", cadence: 2.3, weave: .22 });
  assert.deepEqual(SPECIES_BEHAVIORS["cave-bat"], { gait: "flap", pursuit: "flank", cadence: 2.7, weave: .46, retreatAt: .25 });
  assert.deepEqual(SPECIES_BEHAVIORS["root-spider"], { gait: "scuttle", pursuit: "cautious", cadence: 1.5, weave: .3 });
  assert.equal(Math.max(...REGIONAL_CREATURE_KINDS.map(k => SPECIES_BEHAVIORS[k].weave)), SPECIES_BEHAVIORS["cave-bat"].weave, "o morcego é quem mais zigue-zagueia");
  assert.equal(speciesRetreats("cave-bat", 6, 24), true); assert.equal(speciesRetreats("cave-bat", 7, 24), false);
  assert.equal(speciesRetreats("giant-rat", 1, 28), false); assert.equal(speciesRetreats("root-spider", 1, 38), false);
  const steps = CENTER_KINDS.map(k => pursuitStep(k, .35, 150, 20, 151));
  assert.equal(new Set(steps.map(s => [s.x.toFixed(3), s.y.toFixed(3), s.pace.toFixed(3)].join(":"))).size, 3);
});

test("a mordida da aranha deixa o herói lento e com veneno fraco; a do rato e a do morcego só machucam", () => {
  const bite = (kind: typeof CENTER_KINDS[number]) => {
    const hero = new Player(); hero.x = 400; hero.y = 400;
    const mob = new RegionalMonster("bite-" + kind, kind, 420, 400);
    // como na caverna: sem a proteção da vila (o ponto 400,400 fica dentro dela)
    for (let i = 0; i < 120 && hero.hp === hero.maxHp; i++) mob.update(1 / 60, hero, open, 0, false);
    return { hurt: hero.maxHp - hero.hp, slow: hero.debuffs.slow, venom: hero.debuffs["weak-venom"] };
  };
  const spider = bite("root-spider"), rat = bite("giant-rat"), bat = bite("cave-bat");
  assert.ok(spider.hurt > 0 && spider.slow > 0 && spider.venom > 0, JSON.stringify(spider));
  assert.ok(spider.slow <= 2.5 && spider.venom <= 3, "a teia dura pouco: " + JSON.stringify(spider));
  for (const [name, r] of [["rato", rat], ["morcego", bat]] as const) { assert.ok(r.hurt > 0, name + " machuca"); assert.equal(r.slow, 0, name + ": sem lentidão"); assert.equal(r.venom, 0, name + ": sem veneno"); }
});

test("o morcego quase morto foge do herói em vez de morder; o rato e a aranha seguem até o fim", () => {
  const run = (kind: typeof CENTER_KINDS[number]) => {
    const hero = new Player(); hero.x = 0; hero.y = -600;
    const mob = new RegionalMonster("fuga-" + kind, kind, 60, -600); mob.hp = 1;
    const start = mob.x;
    for (let i = 0; i < 25; i++) mob.update(1 / 60, hero, open);
    return mob.x - start;
  };
  assert.ok(run("cave-bat") > 0, "o morcego se afasta");
  assert.ok(run("giant-rat") < 0 && run("root-spider") < 0, "os outros continuam vindo");
});

test("as criaturas do Centro não nascem na superfície nem fora da Gruta das Raízes (por enquanto só caverna)", () => {
  assert.deepEqual(caveMonsterKinds("verdant"), ["giant-rat", "cave-bat", "root-spider"]);
  for (const theme of ["glacial", "desert", "coastal", "basalt", "marsh"] as const) for (const kind of CENTER_KINDS) assert.ok(!caveMonsterKinds(theme).includes(kind), `${kind} não mora em ${theme}`);
  const seen = new Set<string>();
  for (let cx = -1000; cx <= 1000; cx += 7) for (let cy = -1000; cy <= 1000; cy += 7) for (const mob of [...regionalSurfaceSpawns(cx, cy, 842136), ...southCommonSpawns(cx, cy, 842136)]) seen.add(mob.kind);
  assert.ok(seen.size > 5, "a varredura achou criaturas de verdade: " + seen.size);
  for (const kind of CENTER_KINDS) assert.ok(!seen.has(kind), `${kind} não nasce na superfície`);
});

test("saque e moeda: nomes novos viram material aceito pela bolsa, e a moeda cresce com a experiência", () => {
  for (const kind of CENTER_KINDS) for (const { item } of CREATURE_CATALOG[kind].loot) assert.deepEqual(normalizeMaterials({ [item]: 2 }), { [item]: 2 }, item + ": a bolsa aceita");
  for (const kind of CENTER_KINDS) { assert.deepEqual(rollCreatureLoot(kind, "id:1"), rollCreatureLoot(kind, "id:1")); assert.ok(rollCoinDrop(kind, "id:1") >= 0); }
  const total = (kind: typeof CENTER_KINDS[number]) => Array.from({ length: 60 }, (_, i) => rollCoinDrop(kind, "moeda:" + i)).reduce((a, b) => a + b, 0);
  assert.ok(total("root-spider") >= total("giant-rat"), "a aranha (15 de XP) paga ao menos o que o rato (9) paga");
});

test("arte: cada uma tem silhueta própria, é determinística e aparece pelo registro com a anatomia de verdade", () => {
  const frame = (kind: typeof CENTER_KINDS[number], extra: object = {}) => capture(c => renderRegionalCreature(c, { kind, hp: CREATURE_CATALOG[kind].maxHp, id: "arte-" + kind, ...extra }, 0, 0, 1.3));
  const idle = CENTER_KINDS.map(k => frame(k));
  assert.equal(new Set(idle.map(m => m.signature)).size, 3);
  for (const [i, kind] of CENTER_KINDS.entries()) {
    const m = idle[i]!;
    assert.ok(m.paintOps > 70 && m.curves > 50 && m.gradients >= 3 && m.colors >= 9, `${kind}: anatomia de verdade ${JSON.stringify({ o: m.paintOps, c: m.curves, g: m.gradients, k: m.colors })}`);
    assert.equal(m.saves, m.restores, kind + ": Canvas balanceado");
    assert.equal(frame(kind).signature, m.signature, kind + ": determinístico");
    assert.notEqual(frame(kind, { id: "outro-" + kind }).signature, m.signature, kind + ": indivíduos iguais");
  }
  // cada criatura é desenhada pelo seu pintor: as cores dominantes são as da paleta dela (cinza do rato, roxo do morcego, marrom e musgo da aranha)
  const palettes = [GIANT_RAT_PALETTE, CAVE_BAT_PALETTE, ROOT_SPIDER_PALETTE];
  assert.equal(new Set(palettes.map(p => p.base)).size, 3);
  const draws = [drawGiantRat, drawCaveBat, drawRootSpider] as const;
  for (const [i, kind] of CENTER_KINDS.entries()) {
    const viaRegistry = capture(c => renderRegionalCreature(c, { kind, hp: CREATURE_CATALOG[kind].maxHp, id: "arte-" + kind }, 0, 0, 1.3));
    const wrongPalette = capture(c => renderRegionalCreature(c, { kind: CENTER_KINDS[(i + 1) % 3]!, hp: CREATURE_CATALOG[CENTER_KINDS[(i + 1) % 3]!].maxHp, id: "arte-" + kind }, 0, 0, 1.3));
    assert.notEqual(viaRegistry.signature, wrongPalette.signature, kind);
    assert.ok(draws[i] && viaRegistry.paintOps > 0);
  }
});

test("arte: o desenho de cada criatura lê a passada, o preparo do golpe e o ferimento, cada um por si (sem a moldura, que também reage)", () => {
  const base = { seed: .3, phase: 0, moving: 0, bite: 0, wound: 0 };
  const cases: ReadonlyArray<readonly [string, (c: CanvasRenderingContext2D, m: typeof base) => void]> = [
    ["rato", (c, m) => drawGiantRat(c, GIANT_RAT_PALETTE, 1.3, m)], ["morcego", (c, m) => drawCaveBat(c, CAVE_BAT_PALETTE, 1.3, m)], ["aranha", (c, m) => drawRootSpider(c, ROOT_SPIDER_PALETTE, 1.3, m)],
  ];
  for (const [name, draw] of cases) {
    const shot = (m: object) => capture(c => draw(c, { ...base, ...m }));
    assert.equal(shot({}).signature, shot({}).signature, name + ": determinístico");
    assert.ok(shot({}).paintOps > 50 && shot({}).saves === shot({}).restores, name);
    // a passada: a fase muda o desenho andando; o quanto anda (0 a 1) muda também, com a fase fixa
    assert.notEqual(shot({ moving: 1, phase: 0 }).signature, shot({ moving: 1, phase: 2.4 }).signature, name + ": a fase da passada não mexe no desenho");
    assert.notEqual(shot({ moving: 0, phase: 2.4 }).signature, shot({ moving: 1, phase: 2.4 }).signature, name + ": andar ou parar não mexe no desenho");
    // o golpe e o ferimento acrescentam peças de verdade (mais pintura), não só mudam números
    assert.ok(shot({ bite: .8 }).paintOps > shot({}).paintOps, name + ": o golpe não acrescenta nada");
    assert.notEqual(shot({ bite: .3 }).signature, shot({ bite: .9 }).signature, name + ": o golpe não cresce");
    assert.ok(shot({ wound: .7 }).paintOps > shot({}).paintOps, name + ": o ferimento não aparece");
    assert.notEqual(shot({ seed: .31 }).signature, shot({ seed: .77 }).signature, name + ": a semente não varia o indivíduo");
    // o ferimento leve (menos de um terço) ainda não racha nada; o golpe fraquíssimo ainda não abre a boca
    assert.equal(shot({ wound: .1 }).paintOps, shot({}).paintOps, name + ": ferimento leve não deixa marca");
    assert.equal(shot({ bite: .01 }).paintOps, shot({}).paintOps, name + ": um fio de preparo não vira golpe");
  }
});

test("creatureMotion: lê o estado da criatura e põe valores fora de faixa ou inválidos no neutro", () => {
  const actor = (extra: object) => ({ kind: "giant-rat" as const, hp: 28, id: "a", ...extra });
  assert.deepEqual(creatureMotion(actor({}), "x", 28), { seed: creatureMotion(actor({}), "y", 28).seed, phase: 0, moving: 0, bite: 0, wound: 0 });
  assert.equal(creatureMotion(actor({ id: undefined }), "x", 28).seed, hashString("x"), "sem id vale o nome padrão");
  assert.equal(creatureMotion(actor({ id: "a" }), "x", 28).seed, hashString("a"));
  const m = creatureMotion(actor({ hp: 7, moving: 2, casting: -3, motionPhase: 4 }), "x", 28);
  assert.deepEqual([m.phase, m.moving, m.bite, m.wound], [4, 1, 0, .75]);
  assert.equal(creatureMotion(actor({ hp: 99 }), "x", 28).wound, 0, "vida acima do máximo não vira ferimento negativo");
  assert.equal(creatureMotion(actor({ hp: 0 }), "x", 28).wound, 1);
  const bad = creatureMotion(actor({ hp: Number.NaN, moving: Number.NaN, casting: Number.POSITIVE_INFINITY, motionPhase: Number.NaN }), "x", 28);
  assert.deepEqual([bad.phase, bad.moving, bad.bite, bad.wound], [0, 0, 0, 1]);
});

/** Grava só as chamadas de caminho (nome e números), para conferir a geometria de um desenho sem depender do hash do fluxo inteiro. */
function pathCalls(draw: (ctx: CanvasRenderingContext2D) => void): Array<{ name: string; args: number[] }> {
  const calls: Array<{ name: string; args: number[] }> = [];
  const stub = new Proxy({}, { get: (_t, name: string) => name === "createLinearGradient" || name === "createRadialGradient" ? () => ({ addColorStop() {} }) : (...args: unknown[]) => { calls.push({ name, args: args.filter((a): a is number => typeof a === "number") }); }, set: () => true });
  draw(stub as unknown as CanvasRenderingContext2D);
  return calls;
}

test("o morcego ferido bate com as asas mais curtas e rasga as duas por igual (as asas são espelhadas)", () => {
  const wings = (wound: number) => {
    const calls = pathCalls(c => drawCaveBat(c, CAVE_BAT_PALETTE, 1.3, { seed: .3, phase: 0, moving: 1, bite: 0, wound }));
    // cada asa grava, em ordem: 3 recortes da borda, 1 fecho da membrana e 3 veias; a esquerda vem antes da direita
    const quad = calls.filter(call => call.name === "quadraticCurveTo" && call.args.length === 4);
    const tips = calls.filter(call => call.name === "lineTo" && Math.abs(call.args[0]!) > 20);
    return { left: quad.slice(0, 3), right: quad.slice(7, 10), tips: [tips[0]!, tips[3]!] };
  };
  for (const wound of [0, .2, .7]) {
    const { left, right, tips } = wings(wound);
    assert.equal(left.length, 3); assert.equal(right.length, 3);
    for (const [i, a] of left.entries()) assert.deepEqual([a.args[0], a.args[1], a.args[2], a.args[3]], [-right[i]!.args[0]!, right[i]!.args[1]!, -right[i]!.args[2]!, right[i]!.args[3]!], `ferimento ${wound}: asa ${i} espelhada`);
    assert.ok(tips[0]!.args[0]! < 0 && tips[1]!.args[0]! > 0); assert.equal(tips[0]!.args[1], tips[1]!.args[1], "as duas pontas à mesma altura");
  }
  // a membrana do meio rasga (o controle da curva sobe 3,5 por unidade de ferimento, além de acompanhar as pontas) e as outras duas não
  const rip = (w: ReturnType<typeof wings>, side: "left" | "right", i: number): number => {
    const wing = w[side], startY = i === 0 ? w.tips[side === "left" ? 0 : 1]!.args[1]! : wing[i - 1]!.args[3]!;
    return wing[i]!.args[1]! - ((startY + wing[i]!.args[3]!) / 2 - 3);
  };
  const healthy = wings(0), hurt = wings(.7);
  for (const side of ["left", "right"] as const) {
    assert.ok(Math.abs(rip(hurt, side, 1) - .7 * 3.5) < 1e-9, side + ": a membrana do meio rasga"); assert.ok(Math.abs(rip(healthy, side, 1)) < 1e-9);
    assert.ok(Math.abs(rip(hurt, side, 0)) < 1e-9 && Math.abs(rip(hurt, side, 2)) < 1e-9, side + ": só a do meio rasga");
  }
  const reach = (w: ReturnType<typeof wings>) => -34 - w.tips[0]!.args[1]!;
  assert.ok(Math.abs(reach(healthy)) > 1, "a asa está longe do ponto neutro neste instante");
  assert.ok(Math.abs(Math.abs(reach(hurt)) / Math.abs(reach(healthy)) - (1 - .7 * .4)) < 0.2, "ferido, o bater fica " + Math.abs(reach(hurt) / reach(healthy)).toFixed(2) + " do normal");
});
