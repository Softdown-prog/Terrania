import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { maxHpForExperience, experienceForLevel } from "../src/engine/character/Experience.ts";
import { ARCHER, ARCHER_HP_PERCENT, ARCHER_SPEED_PERCENT, HERO_CLASSES, HERO_CLASS_IDS, KNIGHT, MAGE, heroClassSheet, isHeroClassPlayable, normalizeHeroClass, regenerateMana } from "../src/engine/character/classes/index.ts";
import { HERO_CLASS_INTRO } from "../src/game/messages/classIntro.ts";
import { EQUIPMENT_SLOTS } from "../src/engine/character/Equipment.ts";

/** O Arqueiro como vocação (ADR 0109, lote A1a): ficha, vida de 85%, 10% mais ágil, sem mana, e ainda bloqueado na tela de escolha. */
const SEED = 842136;

test("a ficha do Arqueiro: nome, sem mana, 85% de vida, 10% mais ágil, e jogável", () => {
  assert.deepEqual([ARCHER.id, ARCHER.name, ARCHER.usesMana, ARCHER.usesSwords, ARCHER.wearsArmor], ["archer", "Arqueiro", false, false, true]);
  assert.deepEqual([ARCHER_HP_PERCENT, ARCHER_SPEED_PERCENT], [85, 110]); assert.deepEqual([ARCHER.hpPercent, ARCHER.speedPercent], [85, 110]);
  assert.deepEqual([KNIGHT.speedPercent, MAGE.speedPercent], [100, 100], "só o Arqueiro é mais ágil");
  assert.deepEqual([1, 10, 100].map(ARCHER.maxMana).concat([1, 10, 100].map(ARCHER.manaPerSecond)), [0, 0, 0, 0, 0, 0], "nunca tem mana");
  assert.equal(ARCHER.playable, true); assert.equal(isHeroClassPlayable("archer"), true); assert.strictEqual(heroClassSheet("archer"), ARCHER); assert.strictEqual(HERO_CLASSES.archer, ARCHER);
  assert.equal(normalizeHeroClass("archer"), "archer");
  assert.equal(regenerateMana(0, "archer", 10, 100), 0);
});

test("os espaços do Arqueiro têm nomes próprios: capuz, gibão, arco, luvas no lugar do escudo e flechas; sem mochila", () => {
  const known = new Set(EQUIPMENT_SLOTS.map(slot => slot.id));
  assert.equal(ARCHER.equipmentSlots.length, 9); assert.equal(new Set(ARCHER.equipmentSlots).size, 9);
  for (const slot of ARCHER.equipmentSlots) assert.ok(known.has(slot), slot);
  assert.ok(!ARCHER.equipmentSlots.includes("backpack"), "sem mochila");
  assert.deepEqual(ARCHER.slotLabels, { head: "Capuz", neck: "Colar", ring: "Anel", chest: "Gibão", weapon: "Arco", shield: "Luvas", legs: "Calça", ammo: "Flechas", feet: "Botas" });
  assert.deepEqual(Object.keys(ARCHER.slotLabels).sort(), [...ARCHER.equipmentSlots].sort(), "cada espaço tem o seu nome");
});

test("a vida: 85% da do Cavaleiro em qualquer nível, arredondada", () => {
  for (const level of [1, 2, 10, 50, 100]) {
    const xp = experienceForLevel(level), knight = maxHpForExperience(xp, "knight");
    assert.equal(maxHpForExperience(xp, "archer"), Math.round(knight * .85), `nível ${level}`);
    assert.ok(maxHpForExperience(xp, "archer") < knight && maxHpForExperience(xp, "archer") > maxHpForExperience(xp, "mage"), `entre o Cavaleiro e o Mago no nível ${level}`);
  }
  assert.equal(maxHpForExperience(0, "archer"), 85);
});

test("a velocidade: o herói Arqueiro anda 10% mais que o Cavaleiro no mesmo tempo; o Mago anda igual; golpes de status ainda valem", () => {
  const walk = (heroClass: "knight" | "mage" | "archer"): number => {
    const sim = new OfflineSimulation(SEED, undefined, heroClass), startX = sim.player.x;
    for (let i = 0; i < 20; i++) sim.update(.05, { x: 1, y: 0 }, false);
    return sim.player.x - startX;
  };
  const knight = walk("knight"), mage = walk("mage"), archer = walk("archer");
  assert.ok(knight > 20, "o Cavaleiro andou");
  assert.ok(Math.abs(mage - knight) < 1e-6, "o Mago anda como o Cavaleiro");
  assert.ok(Math.abs(archer / knight - 1.1) < .02, `Arqueiro/Cavaleiro = ${(archer / knight).toFixed(3)}`);
  const player = new Player(); assert.equal(player.speedScale, 1); assert.equal(player.movementMultiplier, 1);
  player.speedScale = 1.1; assert.ok(Math.abs(player.movementMultiplier - 1.1) < 1e-12);
  player.applyStatus("slow", 5); assert.ok(Math.abs(player.movementMultiplier - .58 * 1.1) < 1e-12, "lentidão continua valendo");
});

test("a velocidade acompanha o herói para a caverna e de volta, e depois de renascer", () => {
  const cave = new Player(), surface = new Player(); surface.speedScale = 1.1;
  cave.syncAdventureStateFrom(surface); assert.equal(cave.speedScale, 1.1);
  const sim = new OfflineSimulation(SEED, undefined, "archer");
  assert.equal(sim.player.speedScale, 1.1); sim.player.hp = 0; sim.update(.05, { x: 0, y: 0 }, false);
  assert.equal(sim.respawn(), true); assert.equal(sim.player.speedScale, 1.1, "depois de renascer");
  assert.equal(new OfflineSimulation(SEED).player.speedScale, 1, "o Cavaleiro segue em 1");
});

test("o Arqueiro nasce com 85 de vida e o save guarda a vocação; ninguém o escolhe ainda: a tela mostra o cartão bloqueado, com o corpo dele desenhado", () => {
  const sim = new OfflineSimulation(SEED, undefined, "archer");
  assert.deepEqual([sim.heroClass, sim.usesMana, sim.player.maxHp, sim.player.hp], ["archer", false, 85, 85]);
  assert.equal(sim.snapshot().heroClass, "archer");
  assert.deepEqual(Object.keys(HERO_CLASS_INTRO), [...HERO_CLASS_IDS]); assert.equal(HERO_CLASS_INTRO.archer.traits.length, 3);
  assert.match(HERO_CLASS_INTRO.archer.traits.join(" "), /7 tiles/); assert.match(HERO_CLASS_INTRO.archer.traits.join(" "), /flecha/);
  const page = readFileSync("src/app/game-page.html", "utf8");
  assert.match(page, /@else if \(id === 'mage'\) \{ <canvas #classMage width="170" height="190"><\/canvas> \}\s*\n\s*@else \{ <canvas #classArcher width="170" height="190"><\/canvas> \}/, "o Arqueiro tem o canvas dele, não o do Mago");
  assert.doesNotMatch(page, /hero-card-soon/, "o ➶ de antes saiu");
  const component = readFileSync("src/app/game-page.component.ts", "utf8");
  assert.match(component, /\[this\.classArcher\(\), 'archer', 2\.6\]/, "o corpo do Arqueiro é desenhado na prévia da escolha");
});
