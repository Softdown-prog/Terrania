import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { HERO_CLASSES, HERO_CLASS_IDS, KNIGHT, MAGE, heroClassSheet, isHeroClassPlayable } from "../src/engine/character/classes/index.ts";
import { HERO_CLASS_HINT, HERO_CLASS_INTRO, HERO_CLASS_LOCKED, HERO_CLASS_TITLE } from "../src/game/messages/classIntro.ts";

/**
 * A tela de escolha do herói (ADR 0066): o jogador novo e o "Novo mundo" escolhem a vocação; o Mago aparece bloqueado ("Em breve") até
 * estar completo; a vocação escolhida vale para o mundo criado, e um save do mesmo mundo manda mais.
 */
const SEED = 842136;
const game = readFileSync("src/game/Game.ts", "utf8"), page = readFileSync("src/app/game-page.html", "utf8"), component = readFileSync("src/app/game-page.component.ts", "utf8"),
  hud = readFileSync("src/app/hud.service.ts", "utf8");

test("quem pode ser escolhido: o Cavaleiro sim, o Mago ainda não (só quando corpo, cajados, combate e animação estiverem prontos)", () => {
  assert.equal(KNIGHT.playable, true); assert.equal(MAGE.playable, false);
  assert.deepEqual(HERO_CLASS_IDS.map(isHeroClassPlayable), [true, false]);
  assert.deepEqual(HERO_CLASS_IDS.filter(id => heroClassSheet(id).playable), ["knight"], "uma só vocação jogável por enquanto");
  assert.equal(HERO_CLASSES.mage.playable, false);
});

test("os textos da tela: cada vocação tem uma frase e três traços; o Mago diz que vem em breve", () => {
  assert.deepEqual(Object.keys(HERO_CLASS_INTRO).sort(), [...HERO_CLASS_IDS].sort(), "toda vocação tem texto");
  for (const id of HERO_CLASS_IDS) {
    const intro = HERO_CLASS_INTRO[id];
    assert.ok(intro.tagline.length > 10, `frase de ${id}`); assert.equal(intro.traits.length, 3, `três traços de ${id}`);
    for (const trait of intro.traits) assert.ok(trait.length > 10, trait);
  }
  assert.match(HERO_CLASS_INTRO.knight.traits.join(" "), /11 níveis/); assert.match(HERO_CLASS_INTRO.mage.traits.join(" "), /mana/);
  assert.equal(HERO_CLASS_LOCKED, "Em breve"); assert.equal(HERO_CLASS_TITLE, "Escolha o seu herói"); assert.match(HERO_CLASS_HINT, /uma vez por mundo/);
});

test("a vocação escolhida vale para o mundo criado; um save do mesmo mundo manda mais; lixo vira Cavaleiro", () => {
  assert.equal(new OfflineSimulation(SEED).heroClass, "knight", "sem escolha, Cavaleiro como sempre");
  const mage = new OfflineSimulation(SEED, undefined, "mage");
  assert.deepEqual([mage.heroClass, mage.mana, mage.maxMana], ["mage", 50, 50], "o Mago escolhido já nasce de mana cheia");
  assert.equal(new OfflineSimulation(SEED, undefined, "knight").heroClass, "knight");
  assert.equal(new OfflineSimulation(SEED, undefined, "lua" as never).heroClass, "knight", "vocação inválida vira Cavaleiro");
  const knightSave = new OfflineSimulation(SEED).snapshot();
  assert.equal(new OfflineSimulation(SEED, knightSave, "mage").heroClass, "knight", "o save do mesmo mundo manda: a vocação nunca muda");
  const mageSave = new OfflineSimulation(SEED, undefined, "mage").snapshot();
  assert.equal(new OfflineSimulation(SEED, mageSave, "knight").heroClass, "mage");
  assert.equal(new OfflineSimulation(SEED + 1, mageSave, "knight").heroClass, "knight", "outro mundo não herda: vale a vocação escolhida nele");
  assert.equal(new OfflineSimulation(SEED + 1, mageSave, "mage").heroClass, "mage");
});

test("o jogo abre a escolha para o jogador novo e no mundo novo, e só salva depois que o herói é escolhido", () => {
  assert.match(game, /if \(!saved \|\| saved\.seed !== seed\) this\.askHeroClass\(\);/, "sem save deste mundo, pergunta antes de jogar");
  assert.match(game, /private askHeroClass\(\): void \{ this\.hud\.promptHeroClass\(heroClass => this\.startAs\(heroClass\)\); \}/);
  assert.match(game, /if \(!isHeroClassPlayable\(heroClass\)\) return;\s*\n\s*if \(heroClass !== this\.sim\.heroClass\) this\.replaceWorld\(this\.sim\.seed, undefined, heroClass\);\s*\n\s*this\.save\(\);/,
    "só escolhe quem é jogável, recria o mundo com a vocação e salva");
  assert.match(game, /this\.sim = new OfflineSimulation\(seed, saved, startingClass\);/);
  const newWorld = /private newWorld\(\): void \{[\s\S]*?\n  \}/.exec(game)![0];
  assert.match(newWorld, /this\.askHeroClass\(\);/, "o mundo novo pergunta o herói");
  assert.equal(/this\.save\(\)/.test(newWorld), false, "e só o escolher salva (sem salvar um Cavaleiro antes da escolha)");
});

test("a tela: janela que Esc não fecha, uma carta por vocação, o Mago bloqueado, e só a vocação jogável fecha a tela", () => {
  assert.match(page, /<dialog id="classDialog" #classDialog \(cancel\)="\$event\.preventDefault\(\)"/, "Esc não dispensa a escolha");
  assert.match(page, /@for \(id of hud\.heroClassIds; track id\)/); assert.match(page, /\[class\.locked\]="!sheet\.playable"/);
  assert.match(page, /\[attr\.id\]="'choose-' \+ id"\s*\n\s*\[disabled\]="!sheet\.playable" \(click\)="hud\.chooseHeroClass\(id\)"/, "botão do bloqueado fica desabilitado");
  assert.match(page, /<canvas #classKnight/); assert.match(page, /hero-card-badge/);
  assert.match(hud, /if \(!this\.heroClassPrompt\(\) \|\| !isHeroClassPlayable\(heroClass\)\) return;/, "mesmo pelo código, o bloqueado não passa");
  assert.match(hud, /promptHeroClass\(onChoose: \(heroClass: HeroClassId\) => void\): void \{ this\.heroClassCallback = onChoose; this\.heroClassPrompt\.set\(true\); \}/);
  assert.match(component, /const prompt = this\.hud\.heroClassPrompt\(\);/); assert.match(component, /if \(prompt\) \{\s*\n\s*this\.open\(dialog\);/, "abre pausando o jogo");
  assert.match(component, /\.\/styles\/hero-select\.css/);
});
