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
import { drawMossSlime, CREATURE_PALETTE as MOSS_SLIME_PALETTE } from "../src/render/creatures/center/slimes/mossSlime.ts";
import { drawVineSnake, CREATURE_PALETTE as VINE_SNAKE_PALETTE } from "../src/render/creatures/center/snakes/vineSnake.ts";
import { drawRootBeetle, CREATURE_PALETTE as ROOT_BEETLE_PALETTE } from "../src/render/creatures/center/beetles/rootBeetle.ts";
import { ROOT_BEETLE_SHELL } from "../src/monsters/center/beetles/root-beetle.ts";
import { drawWildBoar, CREATURE_PALETTE as WILD_BOAR_PALETTE } from "../src/render/creatures/center/boars/wildBoar.ts";
import { drawGrayWolf, CREATURE_PALETTE as GRAY_WOLF_PALETTE } from "../src/render/creatures/center/wolves/grayWolf.ts";
import { drawWalkingMushroom, CREATURE_PALETTE as WALKING_MUSHROOM_PALETTE } from "../src/render/creatures/center/mushrooms/walkingMushroom.ts";
import { creatureMotion } from "../src/render/creatures/shared/creatureMotion.ts";
import { hashString } from "../src/render/draw.ts";
import { Recorder, withFakeDocument } from "./helpers/recordingContext.ts";
import { rollCoinDrop } from "../src/engine/character/coins/index.ts";
import { normalizeMaterials } from "../src/engine/character/Inventory.ts";

/**
 * Lotes 1 a 3 do bestiário do Centro (ADR 0087, 0088 e 0089, docs/BESTIARIO_CENTRO.md): rato gigante, morcego de caverna, aranha das raízes, slime de musgo, cobra-cipó, besouro de raiz, javali, lobo cinzento e cogumelo andante. Cada um tem ficha, comportamento e
 * desenho no seu arquivo; a mistura na Gruta das Raízes é testada em cave-central-monsters.test.ts.
 */
const open = { canMove: () => true, speedAt: () => 1 };
const capture = (draw: (ctx: CanvasRenderingContext2D) => void) => { const r = new Recorder(); return withFakeDocument(r, () => { draw(r.ctx); return r.metrics(); }); };
const FILES = { "giant-rat": ["rats", "giant-rat", "giantRat"], "cave-bat": ["bats", "cave-bat", "caveBat"], "root-spider": ["spiders", "root-spider", "rootSpider"],
  "moss-slime": ["slimes", "moss-slime", "mossSlime"], "vine-snake": ["snakes", "vine-snake", "vineSnake"], "root-beetle": ["beetles", "root-beetle", "rootBeetle"],
  "wild-boar": ["boars", "wild-boar", "wildBoar"], "gray-wolf": ["wolves", "gray-wolf", "grayWolf"], "walking-mushroom": ["mushrooms", "walking-mushroom", "walkingMushroom"] } as const;

test("as nove criaturas têm a ficha do documento do bestiário (região Centro, caverna verde, saque próprio)", () => {
  assert.deepEqual([...CENTER_KINDS], ["giant-rat", "cave-bat", "root-spider", "moss-slime", "vine-snake", "root-beetle", "wild-boar", "gray-wolf", "walking-mushroom"]);
  const sheet = (kind: typeof CENTER_KINDS[number]) => { const d = CREATURE_CATALOG[kind]; return [d.name, d.maxHp, d.contactDamage, d.experience, d.special, d.status, d.region, [...d.caveThemes]]; };
  assert.deepEqual(sheet("giant-rat"), ["Rato Gigante", 28, 5, 9, "none", null, "center", ["verdant"]]);
  assert.deepEqual(sheet("cave-bat"), ["Morcego de Caverna", 24, 6, 11, "none", null, "center", ["verdant"]]);
  assert.deepEqual(sheet("root-spider"), ["Aranha das Raízes", 38, 7, 15, "web", "weak-venom", "center", ["verdant"]]);
  assert.deepEqual(sheet("moss-slime"), ["Slime de Musgo", 30, 5, 10, "none", "slow", "center", ["verdant"]]);
  assert.deepEqual(sheet("vine-snake"), ["Cobra-Cipó", 34, 8, 14, "weak-venom", "weak-venom", "center", ["verdant"]]);
  assert.deepEqual(sheet("root-beetle"), ["Besouro de Raiz", 55, 6, 17, "none", null, "center", ["verdant"]]);
  assert.deepEqual(CREATURE_CATALOG["moss-slime"].loot, [{ item: "Gel Esverdeado", chance: .6 }, { item: "Musgo Úmido", chance: .3 }]);
  assert.deepEqual(CREATURE_CATALOG["vine-snake"].loot, [{ item: "Pele de Cipó", chance: .5 }, { item: "Presa de Cobra-Cipó", chance: .25 }]);
  assert.deepEqual(CREATURE_CATALOG["root-beetle"].loot, [{ item: "Carapaça de Raiz", chance: .5 }, { item: "Seiva Escura", chance: .2 }]);
  assert.deepEqual(sheet("wild-boar"), ["Javali Selvagem", 110, 14, 45, "none", null, "center", []]);
  assert.deepEqual(sheet("gray-wolf"), ["Lobo Cinzento", 90, 13, 42, "none", null, "center", []]);
  assert.deepEqual(sheet("walking-mushroom"), ["Cogumelo Andante", 100, 11, 48, "spore-cloud", "slow", "center", ["verdant"]]);
  assert.deepEqual(CREATURE_CATALOG["wild-boar"].loot, [{ item: "Presa de Javali", chance: .5 }, { item: "Couro Grosso", chance: .35 }, { item: "Carne de Javali", chance: .3 }]);
  assert.deepEqual(CREATURE_CATALOG["gray-wolf"].loot, [{ item: "Pele de Lobo", chance: .5 }, { item: "Presa de Lobo", chance: .3 }]);
  assert.deepEqual(CREATURE_CATALOG["walking-mushroom"].loot, [{ item: "Esporos de Cogumelo", chance: .6 }, { item: "Chapéu de Cogumelo", chance: .3 }]);
  // ritmo de cada um: velocidade, alcance, intervalo entre golpes e duração do efeito (o morcego é o mais veloz; a aranha, a mais lenta)
  const pace = (kind: typeof CENTER_KINDS[number]) => { const d = CREATURE_CATALOG[kind]; return [d.speed, d.range, d.interval, d.statusSeconds]; };
  assert.deepEqual(pace("moss-slime"), [46, 22, .9, 2]); assert.deepEqual(pace("vine-snake"), [80, 24, 1, 4]); assert.deepEqual(pace("root-beetle"), [52, 22, 1.1, 0]);
  assert.deepEqual(pace("wild-boar"), [92, 26, 1.2, 0]); assert.deepEqual(pace("gray-wolf"), [98, 26, .9, 0]); assert.deepEqual(pace("walking-mushroom"), [30, 72, 3, 3]);
  assert.equal(Math.min(...CENTER_KINDS.map(k => CREATURE_CATALOG[k].speed)), CREATURE_CATALOG["walking-mushroom"].speed, "o cogumelo é o mais lento");
  assert.equal(Math.max(...CENTER_KINDS.map(k => CREATURE_CATALOG[k].speed)), CREATURE_CATALOG["cave-bat"].speed, "o morcego é o mais veloz");
  assert.ok(CREATURE_CATALOG["gray-wolf"].speed > CREATURE_CATALOG["wild-boar"].speed, "o lobo é mais veloz que o javali");
  assert.ok(CREATURE_CATALOG["moss-slime"].speed < CREATURE_CATALOG["giant-rat"].speed && CREATURE_CATALOG["moss-slime"].speed < CREATURE_CATALOG["vine-snake"].speed, "o slime de musgo é mais lento que o rato e a cobra");
  assert.deepEqual(pace("giant-rat"), [88, 24, .7, 0]); assert.deepEqual(pace("cave-bat"), [104, 22, .55, 0]); assert.deepEqual(pace("root-spider"), [70, 26, .95, 3]);
  assert.ok(pace("cave-bat")[0]! > pace("giant-rat")[0]! && pace("giant-rat")[0]! > pace("root-spider")[0]!);
  assert.deepEqual(CENTER_KINDS.map(k => CREATURE_CATALOG[k].biomes), [["meadow", "woodland", "trail"], ["woodland", "trail"], ["woodland", "trail"], ["woodland", "trail"], ["woodland", "trail"], ["meadow", "woodland"], ["meadow", "woodland"], ["woodland"], ["woodland"]]);
  assert.deepEqual(CREATURE_CATALOG["giant-rat"].loot, [{ item: "Rabo de Rato Gigante", chance: .55 }, { item: "Dente de Roedor", chance: .3 }]);
  assert.deepEqual(CREATURE_CATALOG["cave-bat"].loot, [{ item: "Asa de Morcego", chance: .5 }, { item: "Guano Seco", chance: .25 }]);
  assert.deepEqual(CREATURE_CATALOG["root-spider"].loot, [{ item: "Fio de Teia", chance: .5 }, { item: "Presa de Aranha", chance: .25 }]);
  assert.deepEqual(Object.keys(CENTER_MONSTERS).sort(), ["cave-bat", "elder-cave-ent", "giant-rat", "gray-wolf", "living-root", "moss-slime", "root-beetle", "root-spider", "slime", "vine-snake", "walking-mushroom", "wild-boar"]);
  // o Centro é o começo do jogo: os seis comuns (lotes 1 e 2) têm vida até 55, dano até 8 e experiência até 17; os três médios (lote 3), até 110, 14 e 48
  // (as outras regiões chegam a 450 de vida e 40 de dano)
  for (const kind of CENTER_KINDS.slice(0, 6)) { const d = CREATURE_CATALOG[kind]; assert.ok(d.maxHp <= 55 && d.contactDamage <= 8 && d.experience <= 17, kind); }
  for (const kind of CENTER_KINDS.slice(6)) { const d = CREATURE_CATALOG[kind]; assert.ok(d.maxHp >= 90 && d.maxHp <= 110 && d.contactDamage >= 11 && d.contactDamage <= 14 && d.experience >= 42 && d.experience <= 48, kind); }
  assert.ok(Math.max(...REGIONAL_CREATURE_KINDS.map(k => CREATURE_CATALOG[k].maxHp)) >= 4 * CREATURE_CATALOG["wild-boar"].maxHp, "o resto do mundo continua muito mais duro");
});

test("cada criatura mora no seu arquivo: ficha em monsters/center/<família>/, desenho em render/creatures/center/<família>/", () => {
  for (const [kind, [family, file, painter]] of Object.entries(FILES)) {
    const sheet = `src/monsters/center/${family}/${file}.ts`, art = `src/render/creatures/center/${family}/${painter}.ts`;
    assert.ok(existsSync(sheet) && existsSync(art), kind);
    // a pasta dos slimes também guarda o slime comum, que veio antes do bestiário regional
    const own = (names: string[]) => names.filter(name => name !== "slime.ts");
    assert.deepEqual(own(readdirSync(`src/monsters/center/${family}`)), [`${file}.ts`], family + ": um arquivo por criatura");
    assert.deepEqual(own(readdirSync(`src/render/creatures/center/${family}`)), [`${painter}.ts`]);
    assert.match(readFileSync(sheet, "utf8"), /satisfies CreatureDefinition/); assert.match(readFileSync(sheet, "utf8"), /satisfies SpeciesBehavior/);
    assert.ok(readFileSync(art, "utf8").length > 3000, kind + ": desenho com anatomia de verdade");
  }
});

test("comportamento: cada um anda do seu jeito (o morcego zigue-zagueia e foge quase morto; o cogumelo é o mais lento; a cobra e o javali avançam de uma vez; o lobo cerca); nenhum repete o perfil de outro", () => {
  assert.deepEqual(SPECIES_BEHAVIORS["giant-rat"], { gait: "skitter", pursuit: "flank", cadence: 2.3, weave: .22 });
  assert.deepEqual(SPECIES_BEHAVIORS["cave-bat"], { gait: "flap", pursuit: "flank", cadence: 2.7, weave: .46, retreatAt: .25 });
  assert.deepEqual(SPECIES_BEHAVIORS["root-spider"], { gait: "scuttle", pursuit: "cautious", cadence: 1.5, weave: .3 });
  assert.deepEqual(SPECIES_BEHAVIORS["moss-slime"], { gait: "crawl", pursuit: "direct", cadence: 1.02, weave: .08 });
  assert.deepEqual(SPECIES_BEHAVIORS["vine-snake"], { gait: "slither", pursuit: "rush", cadence: 1.4, weave: .24 });
  assert.deepEqual(SPECIES_BEHAVIORS["root-beetle"], { gait: "lumber", pursuit: "direct", cadence: .9, weave: .05 });
  assert.deepEqual(SPECIES_BEHAVIORS["wild-boar"], { gait: "gallop", pursuit: "rush", cadence: 1.1, weave: .02 });
  assert.deepEqual(SPECIES_BEHAVIORS["gray-wolf"], { gait: "gallop", pursuit: "flank", cadence: 1.6, weave: .33 });
  assert.deepEqual(SPECIES_BEHAVIORS["walking-mushroom"], { gait: "hop", pursuit: "cautious", cadence: .7, weave: .12 });
  assert.equal(Math.max(...REGIONAL_CREATURE_KINDS.map(k => SPECIES_BEHAVIORS[k].weave)), SPECIES_BEHAVIORS["cave-bat"].weave, "o morcego é quem mais zigue-zagueia");
  assert.equal(speciesRetreats("cave-bat", 6, 24), true); assert.equal(speciesRetreats("cave-bat", 7, 24), false);
  for (const [kind, hp] of [["giant-rat", 28], ["root-spider", 38], ["moss-slime", 30], ["vine-snake", 34], ["root-beetle", 55], ["wild-boar", 110], ["gray-wolf", 90], ["walking-mushroom", 100]] as const) assert.equal(speciesRetreats(kind, 1, hp), false, kind);
  const steps = CENTER_KINDS.map(k => pursuitStep(k, .35, 150, 20, 151));
  assert.equal(new Set(steps.map(s => [s.x.toFixed(3), s.y.toFixed(3), s.pace.toFixed(3)].join(":"))).size, 9);
});

test("o efeito de cada mordida: a aranha deixa lento e envenena fraco; o slime de musgo só deixa lento; a cobra só envenena; os outros só machucam", () => {
  const bite = (kind: typeof CENTER_KINDS[number]) => {
    const hero = new Player(); hero.x = 400; hero.y = 400;
    const mob = new RegionalMonster("bite-" + kind, kind, 420, 400);
    // como na caverna: sem a proteção da vila (o ponto 400,400 fica dentro dela)
    for (let i = 0; i < 120 && hero.hp === hero.maxHp; i++) mob.update(1 / 60, hero, open, 0, false);
    return { hurt: hero.maxHp - hero.hp, slow: hero.debuffs.slow, venom: hero.debuffs["weak-venom"] };
  };
  const spider = bite("root-spider"), moss = bite("moss-slime"), snake = bite("vine-snake"), mushroom = bite("walking-mushroom");
  assert.ok(spider.hurt > 0 && spider.slow > 0 && spider.venom > 0, JSON.stringify(spider));
  assert.ok(spider.slow <= 2.5 && spider.venom <= 3, "a teia dura pouco: " + JSON.stringify(spider));
  assert.ok(moss.hurt > 0 && moss.slow > 0 && moss.slow <= 2 && moss.venom === 0, "slime de musgo: " + JSON.stringify(moss));
  assert.ok(snake.hurt > 0 && snake.venom > 0 && snake.venom <= 4 && snake.slow === 0, "cobra-cipó: " + JSON.stringify(snake));
  assert.ok(mushroom.hurt > 0 && mushroom.slow > 0 && mushroom.slow <= 3 && mushroom.venom === 0, "cogumelo: " + JSON.stringify(mushroom));
  for (const kind of ["giant-rat", "cave-bat", "root-beetle", "wild-boar", "gray-wolf"] as const) { const r = bite(kind); assert.ok(r.hurt > 0, kind + " machuca"); assert.equal(r.slow, 0, kind + ": sem lentidão"); assert.equal(r.venom, 0, kind + ": sem veneno"); }
  // o dano de cada mordida é o da ficha (sem defesa do herói)
  for (const kind of CENTER_KINDS) assert.equal(bite(kind).hurt, CREATURE_CATALOG[kind].contactDamage, kind + ": dano da ficha");
});

test("a casca dura do besouro de raiz tira 1 de cada golpe; nenhum outro do Centro tem armadura", () => {
  assert.equal(ROOT_BEETLE_SHELL, 1);
  assert.equal(new RegionalMonster("b", "root-beetle", 0, 0).defense, 1);
  for (const kind of ["giant-rat", "cave-bat", "root-spider", "moss-slime", "vine-snake"] as const) assert.equal(new RegionalMonster("b", kind, 0, 0).defense, 0, kind);
  // no golpe de verdade: o mesmo golpe fere o rato e fere o besouro 1 a menos
  const hit = (kind: typeof CENTER_KINDS[number]) => { const mob = new RegionalMonster("golpe", kind, 0, 0), hp = mob.hp; const hero = new Player(); mob.takeHit(hero.x, hero.y, Math.max(1, 6 - mob.defense)); return hp - mob.hp; };
  assert.equal(hit("giant-rat") - hit("root-beetle"), 1);
});

test("o morcego quase morto foge do herói em vez de morder; os outros seguem até o fim", () => {
  const run = (kind: typeof CENTER_KINDS[number]) => {
    const hero = new Player(); hero.x = 0; hero.y = -600;
    const mob = new RegionalMonster("fuga-" + kind, kind, 60, -600); mob.hp = 1;
    const start = mob.x;
    for (let i = 0; i < 25; i++) mob.update(1 / 60, hero, open);
    return mob.x - start;
  };
  assert.ok(run("cave-bat") > 0, "o morcego se afasta");
  for (const kind of ["giant-rat", "root-spider", "moss-slime", "vine-snake", "root-beetle", "wild-boar", "gray-wolf"] as const) assert.ok(run(kind) < 0, kind + " continua vindo");
  assert.equal(run("walking-mushroom"), 0, "o cogumelo não foge nem avança: já está no alcance do sopro");
});

test("onde moram: só o cogumelo mora na caverna; o javali e o lobo só na superfície (e nenhum deles em outro tema nem em outra região)", () => {
  assert.deepEqual(caveMonsterKinds("verdant"), ["giant-rat", "cave-bat", "root-spider", "moss-slime", "vine-snake", "root-beetle", "walking-mushroom", "living-root", "elder-cave-ent"]);
  for (const theme of ["glacial", "desert", "coastal", "basalt", "marsh"] as const) for (const kind of CENTER_KINDS) assert.ok(!caveMonsterKinds(theme).includes(kind), `${kind} não mora em ${theme}`);
  // as geradoras das outras regiões nunca criam bicho do Centro
  const seen = new Set<string>();
  for (let cx = -1000; cx <= 1000; cx += 7) for (let cy = -1000; cy <= 1000; cy += 7) for (const mob of [...regionalSurfaceSpawns(cx, cy, 842136), ...southCommonSpawns(cx, cy, 842136)]) seen.add(mob.kind);
  assert.ok(seen.size > 5, "a varredura achou criaturas de verdade: " + seen.size);
  for (const kind of CENTER_KINDS) assert.ok(!seen.has(kind), `${kind} não nasce pelas geradoras das outras regiões`);
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
  assert.equal(new Set(idle.map(m => m.signature)).size, 9);
  for (const [i, kind] of CENTER_KINDS.entries()) {
    const m = idle[i]!;
    assert.ok(m.paintOps > 50 && m.curves > 50 && m.gradients >= 3 && m.colors >= 9, `${kind}: anatomia de verdade ${JSON.stringify({ o: m.paintOps, c: m.curves, g: m.gradients, k: m.colors })}`);
    assert.equal(m.saves, m.restores, kind + ": Canvas balanceado");
    assert.equal(frame(kind).signature, m.signature, kind + ": determinístico");
    assert.notEqual(frame(kind, { id: "outro-" + kind }).signature, m.signature, kind + ": indivíduos iguais");
  }
  // cada criatura é desenhada pelo seu pintor: as cores dominantes são as da paleta dela (cinza do rato, roxo do morcego, marrom e musgo da aranha)
  const palettes = [GIANT_RAT_PALETTE, CAVE_BAT_PALETTE, ROOT_SPIDER_PALETTE, MOSS_SLIME_PALETTE, VINE_SNAKE_PALETTE, ROOT_BEETLE_PALETTE, WILD_BOAR_PALETTE, GRAY_WOLF_PALETTE, WALKING_MUSHROOM_PALETTE];
  assert.equal(new Set(palettes.map(p => p.base)).size, 9);
  const draws = [drawGiantRat, drawCaveBat, drawRootSpider, drawMossSlime, drawVineSnake, drawRootBeetle, drawWildBoar, drawGrayWolf, drawWalkingMushroom] as const;
  for (const [i, kind] of CENTER_KINDS.entries()) {
    const viaRegistry = capture(c => renderRegionalCreature(c, { kind, hp: CREATURE_CATALOG[kind].maxHp, id: "arte-" + kind }, 0, 0, 1.3));
    const wrongPalette = capture(c => renderRegionalCreature(c, { kind: CENTER_KINDS[(i + 1) % 9]!, hp: CREATURE_CATALOG[CENTER_KINDS[(i + 1) % 9]!].maxHp, id: "arte-" + kind }, 0, 0, 1.3));
    assert.notEqual(viaRegistry.signature, wrongPalette.signature, kind);
    assert.ok(draws[i] && viaRegistry.paintOps > 0);
  }
});

test("arte: o desenho de cada criatura lê a passada, o preparo do golpe e o ferimento, cada um por si (sem a moldura, que também reage)", () => {
  const base = { seed: .3, phase: 0, moving: 0, bite: 0, wound: 0 };
  const cases: ReadonlyArray<readonly [string, (c: CanvasRenderingContext2D, m: typeof base) => void]> = [
    ["rato", (c, m) => drawGiantRat(c, GIANT_RAT_PALETTE, 1.3, m)], ["morcego", (c, m) => drawCaveBat(c, CAVE_BAT_PALETTE, 1.3, m)], ["aranha", (c, m) => drawRootSpider(c, ROOT_SPIDER_PALETTE, 1.3, m)],
    ["slime de musgo", (c, m) => drawMossSlime(c, MOSS_SLIME_PALETTE, 1.3, m)], ["cobra-cipó", (c, m) => drawVineSnake(c, VINE_SNAKE_PALETTE, 1.3, m)], ["besouro de raiz", (c, m) => drawRootBeetle(c, ROOT_BEETLE_PALETTE, 1.3, m)],
    ["javali", (c, m) => drawWildBoar(c, WILD_BOAR_PALETTE, 1.3, m)], ["lobo", (c, m) => drawGrayWolf(c, GRAY_WOLF_PALETTE, 1.3, m)], ["cogumelo", (c, m) => drawWalkingMushroom(c, WALKING_MUSHROOM_PALETTE, 1.3, m)],
  ];
  for (const [name, draw] of cases) {
    const shot = (m: object) => capture(c => draw(c, { ...base, ...m }));
    assert.equal(shot({}).signature, shot({}).signature, name + ": determinístico");
    assert.ok(shot({}).paintOps > 30 && shot({}).saves === shot({}).restores, name);
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
  const stub = new Proxy({}, { get: (_t, name: string) => (...args: unknown[]) => { calls.push({ name, args: args.filter((a): a is number => typeof a === "number") }); return name.startsWith("create") ? { addColorStop() {} } : undefined; }, set: () => true });
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

test("o slime de musgo: a poça se espalha andando e a boca abre no golpe (medidas exatas)", () => {
  const calls = (m: object) => pathCalls(c => drawMossSlime(c, MOSS_SLIME_PALETTE, 1.3, { seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...m }));
  // a poça é o primeiro gradiente radial: raio 20 parado, 27 andando, achatada em 30 %
  const radius = (m: object) => calls(m).find(call => call.name === "createRadialGradient")!.args[5]!;
  assert.ok(Math.abs(radius({ moving: 1 }) - radius({}) - 7) < 1e-9, "andando, a poça cresce 7");
  assert.ok(radius({}) > 18 && radius({}) < 22);
  const puddle = calls({}).find(call => call.name === "ellipse" && call.args[0] === 0 && call.args[1] === -1)!;
  assert.ok(Math.abs(puddle.args[3]! - puddle.args[2]! * .3) < 1e-9, "a poça é achatada");
  // a boca: largura 3,4 + 2,4 e altura 0,9 + 3,4 por unidade de golpe
  const mouth = (bite: number) => calls({ bite }).find(call => call.name === "ellipse" && Math.abs(call.args[2]! - (3.4 + bite * 2.4)) < 1e-9 && Math.abs(call.args[3]! - (.9 + bite * 3.4)) < 1e-9);
  assert.ok(mouth(0) && mouth(.8) && mouth(1), "a boca tem as medidas do golpe");
});

test("a cobra-cipó: a língua sai 7 a mais no golpe e a onda do corpo cresce andando", () => {
  const calls = (m: object) => pathCalls(c => drawVineSnake(c, VINE_SNAKE_PALETTE, 1.3, { seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...m }));
  const tip = (m: object) => Math.min(...calls(m).filter(call => call.name === "lineTo").map(call => call.args[0]!));
  assert.ok(Math.abs(tip({}) - tip({ bite: 1 }) - 7) < 1e-9, "a ponta da língua avança 7 no golpe");
  assert.ok(Math.abs(tip({}) - tip({ bite: .5 }) - 3.5) < 1e-9);
  // a onda do corpo: a altura do último disco muda andando (amplitude 3,4 parada, 6 andando) e com a fase
  const bodyY = (m: object) => calls(m).filter(call => call.name === "ellipse").map(call => call.args[1]!);
  assert.notDeepEqual(bodyY({ moving: 1, phase: 1 }), bodyY({ moving: 0, phase: 1 }));
  assert.notDeepEqual(bodyY({ moving: 1, phase: 0 }), bodyY({ moving: 1, phase: 1 }));
});

test("o lobo: a cauda balança com a passada e se abre correndo; o javali baixa a cabeça no golpe (medidas exatas)", () => {
  const wolf = (m: object) => pathCalls(c => drawGrayWolf(c, GRAY_WOLF_PALETTE, 1.3, { seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...m }));
  // a cauda é a primeira coisa desenhada: três trechos (contorno e miolo cada um), cada curva termina no ponto seguinte do caminho
  const tail = (m: object) => wolf(m).filter(call => call.name === "quadraticCurveTo" && call.args.length === 4).slice(0, 6).map(call => call.args);
  // o segundo ponto sobe 3,5 (5 × 0,7) por unidade de movimento; a ponta oscila 4 por seno da passada
  assert.ok(Math.abs(tail({ moving: 1 })[0]![3]! - tail({})[0]![3]! + 3.5) < 1e-9, "a cauda se abre correndo");
  for (const phase of [.5, 1, 2.4]) assert.ok(Math.abs((tail({ moving: 1, phase })[4]![3]! - tail({ moving: 1 })[4]![3]!) - 4 * Math.sin(phase * 1.2)) < 1e-9, "a ponta da cauda acompanha a passada, fase " + phase);
  assert.equal(tail({ moving: 0, phase: 2 })[4]![3], tail({ moving: 0, phase: 0 })[4]![3], "parada, a cauda não depende da fase");
  assert.equal(tail({})[0]!.join(), tail({})[1]!.join(), "o contorno e o miolo da cauda seguem o mesmo caminho");
  // o javali: a cabeça inteira desce 3 por unidade de golpe (o último deslocamento do desenho é o da cabeça)
  const headDip = (bite: number) => pathCalls(c => drawWildBoar(c, WILD_BOAR_PALETTE, 1.3, { seed: .3, phase: 0, moving: 0, bite, wound: 0 })).filter(call => call.name === "translate").at(-1)!.args;
  assert.deepEqual(headDip(0), [0, 0]); assert.deepEqual(headDip(1), [0, 3]);
  assert.ok(Math.abs(headDip(.5)[1]! - 1.5) < 1e-9);
  assert.deepEqual(headDip(7), [0, 3], "o golpe passa do limite e a cabeça não desce além de 3");
});

test("o cogumelo: o corpo balança com a passada e os pés se alternam no pulinho (medidas exatas)", () => {
  const calls = (m: object) => pathCalls(c => drawWalkingMushroom(c, WALKING_MUSHROOM_PALETTE, 1.3, { seed: .3, phase: 0, moving: 0, bite: 0, wound: 0, ...m }));
  const sway = (m: { phase: number; moving: number }) => Math.sin(m.phase) * m.moving * 1.6 + Math.sin(1.3 * 1.6 + .3 * 5) * .5;
  // o caule é o disco de 10,5 × 12: o centro é o balanço
  const stemX = (m: { phase: number; moving: number }) => calls(m).find(call => call.name === "ellipse" && call.args[2] === 10.5 && call.args[3] === 12)!.args[0]!;
  for (const m of [{ phase: 0, moving: 0 }, { phase: 1.1, moving: 1 }, { phase: 2.6, moving: .5 }]) assert.ok(Math.abs(stemX(m) - sway(m)) < 1e-9, JSON.stringify(m));
  // os pés: discos de 5,4 × 3,2 em x = ±6 + 2 por seno da passada (alternados) e subindo até 4 no passo
  const feet = (m: { phase: number; moving: number }) => calls(m).filter(call => call.name === "ellipse" && call.args[2] === 5.4 && call.args[3] === 3.2).map(call => [call.args[0]!, call.args[1]!]);
  const still = feet({ phase: 0, moving: 0 });
  assert.deepEqual(still.map(([x]) => x).sort((a, b) => a! - b!), [-6, -6, 6, 6], "parado, os pés ficam em ±6");
  assert.ok(still.every(([, y]) => y === -3));
  const step = feet({ phase: 1.1, moving: 1 }), left = step.filter(([x]) => x! < 0), right = step.filter(([x]) => x! > 0);
  assert.ok(Math.abs(left[0]![0]! - (-6 + Math.sin(1.1) * 2)) < 1e-9 && Math.abs(right[0]![0]! - (6 + Math.sin(1.1 + Math.PI) * 2)) < 1e-9, "os pés se alternam");
  assert.ok(Math.abs(left[0]![1]! - (-3 - Math.max(0, Math.sin(1.1)) * 4)) < 1e-9 && Math.abs(right[0]![1]! - -3) < 1e-9, "só o pé do passo sobe");
});
