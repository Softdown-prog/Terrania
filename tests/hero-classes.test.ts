import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { ARCHER, DEFAULT_HERO_CLASS, DRUID, HERO_CLASSES, HERO_CLASS_IDS, KNIGHT, MAGE, MAGE_BASE_MANA, MAGE_FULL_RECHARGE_SECONDS, MAGE_MANA_PER_LEVEL, heroClassSheet, normalizeHeroClass,
  normalizeMana, regenerateMana } from "../src/engine/character/classes/index.ts";
import { loadLocalSave, saveLocal } from "../src/storage/localSave.ts";

/**
 * As vocações do herói e a mana do Mago (ADR 0065): o Cavaleiro é a de sempre (sem mana), o Mago tem mana que cresce com o nível e volta
 * com o tempo de jogo; a vocação é do mundo, vai para o save e saves antigos são Cavaleiro.
 */
const SEED = 842136, STILL = { x: 0, y: 0 };
const mage = (extra: Record<string, unknown> = {}) => new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), heroClass: "mage", ...extra });

test("as vocações: Cavaleiro (a de sempre), Mago, Arqueiro e Druida; o que não é vocação conhecida vira Cavaleiro", () => {
  assert.deepEqual([...HERO_CLASS_IDS], ["knight", "mage", "archer", "druid"]); assert.equal(DEFAULT_HERO_CLASS, "knight");
  assert.deepEqual(HERO_CLASSES, { knight: KNIGHT, mage: MAGE, archer: ARCHER, druid: DRUID }); assert.strictEqual(heroClassSheet("mage"), MAGE);
  assert.deepEqual([KNIGHT.name, MAGE.name], ["Cavaleiro", "Mago"]); assert.deepEqual([KNIGHT.usesMana, MAGE.usesMana], [false, true]);
  for (const bad of [undefined, null, 1, "", "Mage", "Archer", "Druid", {}, []]) assert.equal(normalizeHeroClass(bad), "knight", String(bad));
  assert.equal(normalizeHeroClass("mage"), "mage"); assert.equal(normalizeHeroClass("archer"), "archer"); assert.equal(normalizeHeroClass("druid"), "druid"); assert.equal(normalizeHeroClass("knight"), "knight");
});

test("a mana do Mago: 50 no nível 1, mais 10 por nível, e a barra enche inteira em 20 s em qualquer nível; o Cavaleiro nunca tem mana", () => {
  assert.deepEqual([MAGE_BASE_MANA, MAGE_MANA_PER_LEVEL, MAGE_FULL_RECHARGE_SECONDS], [50, 10, 20]);
  assert.deepEqual([1, 2, 10, 50, 100].map(MAGE.maxMana), [50, 60, 140, 540, 1_040]);
  assert.deepEqual([0, -3, 1.9, 2.5].map(MAGE.maxMana), [50, 50, 50, 60], "nível quebrado ou fora do limite não quebra a conta");
  for (const level of [1, 7, 40]) assert.equal(MAGE.manaPerSecond(level) * MAGE_FULL_RECHARGE_SECONDS, MAGE.maxMana(level), `nível ${level}`);
  assert.equal(MAGE.manaPerSecond(1), 2.5);
  for (const level of [1, 10, 100]) assert.deepEqual([KNIGHT.maxMana(level), KNIGHT.manaPerSecond(level)], [0, 0]);
});

test("mana do save e regeneração: só números válidos de 0 ao máximo; a regeneração só sobe e nunca passa do máximo", () => {
  for (const bad of [undefined, null, "10", Number.NaN, Number.POSITIVE_INFINITY, -5, 0, {}]) assert.equal(normalizeMana(bad, 50), 0, String(bad));
  assert.equal(normalizeMana(12.3, 50), 12.3); assert.equal(normalizeMana(999, 50), 50, "acima do máximo volta ao máximo"); assert.equal(normalizeMana(12.3456, 50), 12.35, "duas casas");
  assert.equal(normalizeMana(10, 0), 0, "quem não tem mana não guarda mana");
  assert.equal(regenerateMana(10, "mage", 1, 2), 15, "2,5 por segundo"); assert.equal(regenerateMana(49, "mage", 1, 5), 50, "não passa do máximo");
  assert.equal(regenerateMana(10, "mage", 1, 0), 10); assert.equal(regenerateMana(10, "mage", 1, -1), 10); assert.equal(regenerateMana(10, "mage", 1, Number.NaN), 10);
  assert.equal(regenerateMana(80, "mage", 1, 1), 50, "mana acima do máximo do nível desce ao máximo");
  assert.equal(regenerateMana(0, "knight", 10, 100), 0, "o Cavaleiro nunca ganha mana");
});

test("o herói Cavaleiro: sem mana, sem gastar, e o save fica igual ao de antes", () => {
  const sim = new OfflineSimulation(SEED);
  assert.deepEqual([sim.heroClass, sim.usesMana, sim.mana, sim.maxMana], ["knight", false, 0, 0]);
  assert.equal(sim.spendMana(1), false); sim.advanceClock(5); sim.update(0.1, STILL, false); assert.equal(sim.mana, 0);
  const snapshot = sim.snapshot(); assert.equal("heroClass" in snapshot, false); assert.equal("mana" in snapshot, false);
});

test("o herói Mago: nasce de mana cheia, gasta tudo ou nada e recupera com o tempo de jogo (na superfície e fora dela)", () => {
  const sim = mage();
  assert.deepEqual([sim.heroClass, sim.usesMana, sim.mana, sim.maxMana], ["mage", true, 50, 50]);
  assert.equal(sim.spendMana(20), true); assert.equal(sim.mana, 30);
  assert.equal(sim.spendMana(31), false, "sem mana suficiente nada muda"); assert.equal(sim.mana, 30);
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(sim.spendMana(bad), false, `custo ${bad}`);
  assert.equal(sim.mana, 30);
  sim.update(0.1, STILL, false); assert.ok(Math.abs(sim.mana - 30.25) < 1e-9, "um quadro de 0,1 s na superfície devolve 0,25");
  sim.advanceClock(0.1); assert.ok(Math.abs(sim.mana - 30.5) < 1e-9, "fora da superfície (caverna) a mana também volta");
  for (let i = 0; i < 400; i++) sim.update(0.1, STILL, false);
  assert.equal(sim.mana, 50, "40 s depois está cheia e não passa do máximo");
  assert.equal(sim.spendMana(50), true); assert.equal(sim.mana, 0);
});

test("a mana máxima acompanha o nível, e a derrota seguida de renascimento devolve a mana cheia", () => {
  const sim = mage({ experience: experienceForLevel(10) });
  assert.equal(sim.maxMana, 140); assert.equal(sim.mana, 140, "de mana cheia no nível dele");
  sim.spendMana(100); sim.player.hp = 0; assert.equal(sim.respawn(), true); assert.equal(sim.mana, 140, "renascer devolve a mana");
  const early = mage(); early.experience = experienceForLevel(20); assert.equal(early.maxMana, 240, "subir de nível sobe o máximo");
  early.advanceClock(0.1); assert.ok(early.mana > 50 && early.mana <= 240, "e a barra passa a encher até o novo máximo");
});

test("a vocação vai para o save: só o Mago ocupa espaço, a mana volta, e outro mundo não herda", () => {
  const sim = mage(); sim.spendMana(12.5);
  const snapshot = sim.snapshot(); assert.equal(snapshot.heroClass, "mage"); assert.equal(snapshot.mana, 37.5);
  const back = new OfflineSimulation(SEED, snapshot); assert.deepEqual([back.heroClass, back.mana], ["mage", 37.5]);
  assert.equal(new OfflineSimulation(SEED + 1, snapshot).heroClass, "knight", "outro mundo não herda a vocação");
  assert.equal(new OfflineSimulation(SEED, { ...snapshot, mana: 9_999 }).mana, 50, "mana acima do máximo volta ao máximo");
  assert.equal(new OfflineSimulation(SEED, { ...snapshot, mana: -4 }).mana, 0);
  assert.equal(new OfflineSimulation(SEED, { ...snapshot, heroClass: "lua" as never }).heroClass, "knight");
  const { mana: _omit, ...withoutMana } = snapshot; assert.equal(new OfflineSimulation(SEED, withoutMana).mana, 50, "mago sem mana no save começa de mana cheia");
  assert.equal(new OfflineSimulation(SEED, { ...snapshot, heroClass: "knight", mana: 30 }).mana, 0, "o Cavaleiro ignora mana do save");
});

test("save do navegador: o Mago e a mana sobrevivem a fechar e abrir o jogo; o resto é normalizado", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage"), store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } } });
  const raw = (extra: Record<string, unknown>) => store.set("terrania-origins-v1", JSON.stringify({ seed: SEED, x: 16, y: 16, hp: 50, kills: 0, defeated: [], ...extra }));
  try {
    const sim = mage(); sim.spendMana(20); saveLocal(sim.snapshot());
    const loaded = loadLocalSave()!; assert.equal(loaded.heroClass, "mage"); assert.equal(loaded.mana, 30);
    assert.deepEqual([new OfflineSimulation(SEED, loaded).heroClass, new OfflineSimulation(SEED, loaded).mana], ["mage", 30]);
    raw({ heroClass: "knight", mana: 40 }); const knight = loadLocalSave()!; assert.equal("heroClass" in knight, false); assert.equal("mana" in knight, false, "o Cavaleiro não guarda mana");
    raw({}); assert.equal("heroClass" in loadLocalSave()!, false, "save antigo é Cavaleiro");
    raw({ heroClass: "lua", mana: 10 }); assert.equal("heroClass" in loadLocalSave()!, false, "lixo vira Cavaleiro");
    raw({ heroClass: "mage" }); const fresh = loadLocalSave()!; assert.equal(fresh.heroClass, "mage"); assert.equal("mana" in fresh, false, "sem mana no save, o Mago começa cheio");
    raw({ heroClass: "mage", mana: 9_999 }); assert.equal(loadLocalSave()!.mana, 50, "mana acima do máximo do nível volta ao máximo");
    raw({ heroClass: "mage", mana: "muita" }); assert.equal(loadLocalSave()!.mana, 0, "mana que não é número vira zero");
    raw({ heroClass: "mage", mana: 100, experience: experienceForLevel(10) }); assert.equal(loadLocalSave()!.mana, 100, "o máximo vem do nível salvo");
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});
