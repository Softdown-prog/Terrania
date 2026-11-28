import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { maxHpForExperience, experienceForLevel } from "../src/engine/character/Experience.ts";
import { ARCHER, DRUID, DRUID_BASE_MANA, DRUID_FULL_RECHARGE_SECONDS, DRUID_HP_PERCENT, DRUID_MANA_PER_LEVEL, HERO_CLASSES, HERO_CLASS_IDS, KNIGHT, MAGE, MAGE_BASE_MANA, MAGE_FULL_RECHARGE_SECONDS, MAGE_MANA_PER_LEVEL, heroClassSheet, isHeroClassPlayable, normalizeHeroClass, regenerateMana } from "../src/engine/character/classes/index.ts";
import { HERO_CLASS_INTRO, HERO_CLASS_LOCKED } from "../src/game/messages/classIntro.ts";

/** O Druida como vocação (ADR 0124, lote D1a): ficha, 90% de vida, a mana do Mago, o bordão como arma e o cartão bloqueado ("Em breve") na tela de escolha. */
const SEED = 842136;
const read = (path: string): string => readFileSync(path, "utf8");

test("a ficha do Druida: nome, bordão, usa mana, 90% de vida, anda como o Cavaleiro, veste pele e ainda não é jogável", () => {
  assert.deepEqual([DRUID.id, DRUID.name, DRUID.weapon, DRUID.usesMana, DRUID.usesSwords, DRUID.wearsArmor, DRUID.playable], ["druid", "Druida", "crook", true, false, true, false]);
  assert.deepEqual([DRUID_HP_PERCENT, DRUID.hpPercent, DRUID.speedPercent], [90, 90, 100]);
  assert.strictEqual(heroClassSheet("druid"), DRUID); assert.strictEqual(HERO_CLASSES.druid, DRUID); assert.equal(isHeroClassPlayable("druid"), false);
  assert.equal(normalizeHeroClass("druid"), "druid"); assert.equal(HERO_CLASS_IDS.at(-1), "druid"); assert.equal(HERO_CLASS_IDS.length, 4);
  assert.deepEqual(new Set([KNIGHT.weapon, MAGE.weapon, ARCHER.weapon, DRUID.weapon]).size, 4, "uma arma de cada tipo");
});

test("os espaços do Druida têm nomes próprios: cocar, colar, anel, peitoral, bordão, totem de mão, calça e botas; sem mochila nem flechas", () => {
  assert.deepEqual([...DRUID.equipmentSlots], ["head", "neck", "ring", "chest", "weapon", "shield", "legs", "feet"]);
  assert.deepEqual(DRUID.slotLabels, { head: "Cocar", neck: "Colar", ring: "Anel", chest: "Peitoral", weapon: "Bordão", shield: "Totem de mão", legs: "Calça", feet: "Botas" });
  assert.deepEqual(Object.keys(DRUID.slotLabels).sort(), [...DRUID.equipmentSlots].sort(), "cada espaço tem o seu nome");
  assert.equal(DRUID.equipmentSlots.includes("backpack"), false); assert.equal(DRUID.equipmentSlots.includes("ammo"), false);
});

test("a vida: 90% da do Cavaleiro em qualquer nível, arredondada, entre o Mago e o Arqueiro-e-Cavaleiro", () => {
  for (const level of [1, 2, 10, 50, 100]) {
    const xp = experienceForLevel(level), knight = maxHpForExperience(xp, "knight"), druid = maxHpForExperience(xp, "druid");
    assert.equal(druid, Math.round(knight * .9), `nível ${level}`);
    assert.ok(druid < knight && druid > maxHpForExperience(xp, "archer") && druid > maxHpForExperience(xp, "mage"), `entre o Cavaleiro e o Arqueiro no nível ${level}`);
  }
  assert.equal(maxHpForExperience(0, "druid"), 90);
  const sim = new OfflineSimulation(SEED, undefined, "druid");
  assert.deepEqual([sim.heroClass, sim.usesMana, sim.player.maxHp, sim.player.hp], ["druid", true, 90, 90]); assert.equal(sim.snapshot().heroClass, "druid");
});

test("a mana: a do Mago, 50 no nível 1, mais 10 por nível, e a barra enche inteira em 20 s em qualquer nível", () => {
  assert.deepEqual([DRUID_BASE_MANA, DRUID_MANA_PER_LEVEL, DRUID_FULL_RECHARGE_SECONDS], [MAGE_BASE_MANA, MAGE_MANA_PER_LEVEL, MAGE_FULL_RECHARGE_SECONDS]);
  assert.deepEqual([1, 2, 10, 100].map(DRUID.maxMana), [50, 60, 140, 1040]);
  for (const level of [1, 10, 40]) { assert.equal(DRUID.manaPerSecond(level) * 20, DRUID.maxMana(level), `nível ${level}`); assert.equal(Math.round(regenerateMana(0, "druid", level, 20)), DRUID.maxMana(level)); assert.equal(regenerateMana(0, "druid", level, 10) < DRUID.maxMana(level), true); }
  assert.equal(DRUID.maxMana(0), 50, "nível 0 vale o 1"); 
  const sim = new OfflineSimulation(SEED, undefined, "druid"); assert.equal(sim.maxMana, 50);
});

test("o cartão bloqueado: o Druida aparece na tela de escolha com a faixa 'Em breve', os três traços e uma folha no lugar do desenho", () => {
  assert.deepEqual(Object.keys(HERO_CLASS_INTRO), [...HERO_CLASS_IDS]); assert.equal(HERO_CLASS_INTRO.druid.traits.length, 3);
  assert.match(HERO_CLASS_INTRO.druid.tagline, /natureza`?/); assert.match(HERO_CLASS_INTRO.druid.traits.join(" "), /bordão/); assert.match(HERO_CLASS_INTRO.druid.traits.join(" "), /mana/);
  assert.equal(HERO_CLASS_LOCKED, "Em breve");
  const page = read("src/app/game-page.html"), css = read("src/app/styles/hero-select.css");
  assert.match(page, /@else if \(id === 'archer'\) \{ <canvas #classArcher width="170" height="190"><\/canvas> \}\s*\n\s*@else \{ <span class="hero-card-glyph">❦<\/span> \}/);
  assert.match(page, /\[class\.locked\]="!sheet\.playable"/); assert.match(page, /\[disabled\]="!sheet\.playable"/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); gap: 12px; \}/, "quatro cartões lado a lado"); assert.match(css, /\.hero-card-glyph \{/);
  assert.match(css, /@media \(max-width: 1100px\) \{\s*\n\s*\.hero-select-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/, "duas por linha em telas médias");
});
