import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Player } from "../src/actors/Player.ts";
import { RegionalMonster } from "../src/actors/RegionalMonster.ts";
import { Slime } from "../src/actors/Slime.ts";
import { GEAR, MAGE_STARTING_GEAR, type GearId } from "../src/engine/character/Equipment.ts";
import { MAX_GEAR_BONUS_PERCENT, NO_GEAR_BONUS, gearBonus, scaledMaxMana } from "../src/engine/character/gearBonus.ts";
import { MAGE, regenerateMana } from "../src/engine/character/classes/index.ts";
import { experienceForLevel } from "../src/engine/character/Experience.ts";
import { resolveSpellStrike, spellHitDamage } from "../src/engine/combat/SpellCombat.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";
import { equipGear } from "../src/game/actions/shopActions.ts";
import type { ShopContext } from "../src/game/actions/shopContext.ts";
import { describeGearBonus, describeGearTotals } from "../src/game/messages/gearBonus.ts";
import { caveEntranceInCell } from "../src/world/caves.ts";
import type { CollisionMap } from "../src/world/collision.ts";

/**
 * Os atributos das roupas do Mago, lote A2 (ADR 0079): mana máxima, recarga de mana e dano das magias, somados pelo que está vestido e valendo na
 * superfície e na caverna. As peças do Aprendiz (lista em `docs/MAGO_ROUPAS.md`) não dão bônus; aqui peças de teste entram no catálogo por um instante.
 */
const SEED = 842136, OPEN: CollisionMap = { canMove: () => true }, STILL = { x: 0, y: 0 };
const read = (path: string): string => readFileSync(path, "utf8");
const context = (sim: OfflineSimulation): ShopContext => ({ sim, hero: sim.player, inInterior: false, menuOpen: true, caveHeroDown: false } as unknown as ShopContext);
const PIECES = {
  "test-hat": { slot: "head", name: "Chapéu de teste", defense: 0, heroClass: "mage", bonus: { mana: 20, regen: 10 } },
  "test-ring": { slot: "ring", name: "Anel de teste", defense: 0, heroClass: "mage", bonus: { damage: 50, mana: 30 } },
  "test-knight-helm": { slot: "head", name: "Elmo de teste", defense: 0, bonus: { mana: 40, regen: 40, damage: 40 } },
  "test-huge": { slot: "neck", name: "Colar enorme", defense: 0, heroClass: "mage", bonus: { mana: 90, regen: 150, damage: 80 } },
  "test-inf": { slot: "legs", name: "Calça infinita", defense: 0, heroClass: "mage", bonus: { mana: Infinity, regen: Infinity, damage: Infinity } },
  "test-junk": { slot: "feet", name: "Botas estranhas", defense: 0, heroClass: "mage", bonus: { mana: -5, regen: Number.NaN, damage: 2.9 } },
} as const;
/** Põe as peças de teste no catálogo só durante `run`. */
function withPieces(run: () => void): void {
  const gear = GEAR as unknown as Record<string, unknown>;
  Object.assign(gear, PIECES);
  try { run(); } finally { for (const id of Object.keys(PIECES)) delete gear[id]; }
}
const mageAt = (level: number, gear: Record<string, string>) => {
  const { mana: _m, inventory: _i, ...rest } = new OfflineSimulation(SEED, undefined, "mage").snapshot();
  return new OfflineSimulation(SEED, { ...rest, experience: experienceForLevel(level), inventory: { gel: 0, potion: 0, questRewardClaimed: false, gear } } as never);
};

test("a soma dos bônus: peça a peça, só o que está vestido, com teto de 100% e sem aceitar lixo; as roupas do Aprendiz não dão bônus", () => {
  assert.strictEqual(gearBonus({}), NO_GEAR_BONUS, "sem nada vestido, sem bônus"); assert.strictEqual(gearBonus(MAGE_STARTING_GEAR), NO_GEAR_BONUS, "o conjunto do Aprendiz não dá bônus (docs/MAGO_ROUPAS.md)");
  withPieces(() => {
    assert.deepEqual(gearBonus({ head: "test-hat" as GearId }), { mana: 20, regen: 10, damage: 0 });
    assert.deepEqual(gearBonus({ head: "test-hat" as GearId, ring: "test-ring" as GearId }), { mana: 50, regen: 10, damage: 50 }, "soma de duas peças");
    assert.deepEqual(gearBonus({ ring: "test-ring" as GearId }), { mana: 30, regen: 0, damage: 50 });
    assert.deepEqual(gearBonus({ head: "test-hat" as GearId, neck: "test-huge" as GearId, ring: "test-ring" as GearId }), { mana: MAX_GEAR_BONUS_PERCENT, regen: MAX_GEAR_BONUS_PERCENT, damage: 100 }, "tudo tem teto de 100%");
    assert.deepEqual(gearBonus({ feet: "test-junk" as GearId }), { mana: 0, regen: 0, damage: 2 }, "negativo e NaN não somam, e a fração é cortada");
    assert.deepEqual(gearBonus({ legs: "test-inf" as GearId }), NO_GEAR_BONUS, "bônus infinito não vale (não vira 100%)");
    assert.deepEqual(gearBonus({ head: "inexistente" as GearId }), NO_GEAR_BONUS, "id que não existe não soma");
  });
  assert.equal(MAX_GEAR_BONUS_PERCENT, 100);
  assert.deepEqual(gearBonus({ head: "test-hat" as GearId }), NO_GEAR_BONUS, "fora do `withPieces` a peça de teste não existe mais");
});

test("a mana máxima e a recarga: o máximo cresce com o bônus, a barra maior enche no mesmo tempo e a recarga soma velocidade", () => {
  const level = 10, base = MAGE.maxMana(level);
  assert.equal(scaledMaxMana(base, NO_GEAR_BONUS), base); assert.equal(scaledMaxMana(base, { mana: 20, regen: 0, damage: 0 }), Math.round(base * 1.2)); assert.equal(scaledMaxMana(1, { mana: 50, regen: 0, damage: 0 }), 2, "arredonda");
  const rate = MAGE.manaPerSecond(level);
  assert.equal(regenerateMana(0, "mage", level, 1), rate, "sem bônus, como antes");
  assert.equal(regenerateMana(0, "mage", level, 1, NO_GEAR_BONUS), rate);
  assert.ok(Math.abs(regenerateMana(0, "mage", level, 1, { mana: 0, regen: 100, damage: 0 }) - rate * 2) < 1e-9, "100% de recarga dobra a velocidade");
  assert.ok(Math.abs(regenerateMana(0, "mage", level, 1, { mana: 50, regen: 0, damage: 0 }) - rate * 1.5) < 1e-9, "a barra 50% maior volta 50% mais depressa (o mesmo tempo para encher)");
  assert.ok(Math.abs(regenerateMana(0, "mage", level, 1, { mana: 20, regen: 10, damage: 0 }) - rate * 1.2 * 1.1) < 1e-9, "os dois bônus se multiplicam");
  assert.equal(regenerateMana(0, "mage", level, 1000, { mana: 20, regen: 0, damage: 0 }), Math.round(base * 1.2), "nunca passa do máximo com bônus");
  assert.equal(regenerateMana(base * 3, "mage", level, 0.1, NO_GEAR_BONUS), base, "mana acima do máximo (peça tirada) cai ao máximo");
  assert.equal(regenerateMana(5, "knight", level, 1, { mana: 50, regen: 50, damage: 0 }), 0, "o Cavaleiro continua sem mana");
});

test("no mundo: vestir e tirar peças muda a mana máxima na hora, o bônus é só do Mago, e a barra enche em 20 s com ou sem bônus de mana", () => {
  withPieces(() => {
    const sim = mageAt(10, {}), base = sim.maxMana; assert.equal(base, MAGE.maxMana(10)); assert.deepEqual(sim.gearBonus, NO_GEAR_BONUS);
    assert.equal(equipGear(context(sim), "head", "test-hat" as GearId).changed, true); assert.equal(sim.maxMana, Math.round(base * 1.2), "o chapéu aumenta a mana máxima");
    assert.equal(equipGear(context(sim), "ring", "test-ring" as GearId).changed, true); assert.equal(sim.maxMana, Math.round(base * 1.5), "o anel soma 30%");
    assert.deepEqual(sim.gearBonus, { mana: 50, regen: 10, damage: 50 });
    sim.gainMana(1e6); assert.equal(sim.mana, sim.maxMana, "ganhar mana respeita o novo máximo");
    equipGear(context(sim), "ring", null); sim.advanceClock(0.1); assert.equal(sim.maxMana, Math.round(base * 1.2)); assert.ok(sim.mana <= sim.maxMana + 1e-9, "tirar a peça baixa a mana ao novo máximo");
    // do zero até o máximo em 20 s: o bônus de mana só aumenta a barra, não o tempo (e a recarga encurta)
    const plain = mageAt(10, {}); plain.spendMana(plain.mana); for (let i = 0; i < 200; i++) plain.advanceClock(0.1); assert.ok(Math.abs(plain.mana - plain.maxMana) < 1e-6, "sem bônus enche em 20 s");
    const fast = mageAt(10, {}); equipGear(context(fast), "neck", "test-huge" as GearId); fast.spendMana(fast.mana); for (let i = 0; i < 100; i++) fast.advanceClock(0.1);
    assert.ok(fast.mana > 0 && fast.mana <= fast.maxMana + 1e-9, "com recarga alta a barra volta mais depressa"); assert.ok(fast.maxMana > base);
    const knight = new OfflineSimulation(SEED); (GEAR as unknown as Record<string, unknown>)["test-knight-helm"] = PIECES["test-knight-helm"];
    assert.equal(equipGear(context(knight), "head", "test-knight-helm" as GearId).changed, true); assert.deepEqual(knight.gearBonus, NO_GEAR_BONUS, "o bônus é só de quem usa mana"); assert.equal(knight.maxMana, 0); assert.equal(knight.mana, 0);
  });
});

test("a mana salva com o bônus volta como foi (o máximo com as roupas vale ao carregar)", () => {
  withPieces(() => {
    const sim = mageAt(10, { head: "test-hat", ring: "test-ring" }); sim.gainMana(1e6); const full = sim.mana, base = MAGE.maxMana(10); assert.ok(full > base);
    const reopened = new OfflineSimulation(SEED, JSON.parse(JSON.stringify(sim.snapshot())));
    assert.equal(reopened.mana, Math.round(full * 100) / 100, "a mana acima do máximo base volta inteira com as peças vestidas"); assert.equal(reopened.maxMana, sim.maxMana);
  });
});

test("o dano das magias: o bônus aumenta o dano do cajado antes da defesa e dos saltos, e sem bônus nada muda", () => {
  const wolf = new RegionalMonster("w", "glacial-wolf", 150, 100), golem = new Slime("g", 0, 0, "basalt-golem");
  assert.equal(spellHitDamage("apprentice", wolf), 8); assert.equal(spellHitDamage("apprentice", wolf, 0, 0), 8); assert.equal(spellHitDamage("apprentice", wolf, 0, 50), 12);
  assert.equal(spellHitDamage("apprentice", golem, 0, 100), Math.max(1, 16 - 20), "a defesa vale depois do bônus (mínimo 1)"); assert.equal(spellHitDamage("storm", golem, 0, 100), 230 - 20);
  assert.equal(spellHitDamage("storm", wolf, 0, 50), 173, "115 +50% = 172,5 arredonda para 173"); assert.equal(spellHitDamage("storm", wolf, 1, 50), Math.round(173 * 0.6), "o salto leva 60% do dano já com o bônus");
  assert.equal(spellHitDamage("storm", wolf, 1, 0), 69); assert.equal(spellHitDamage("sun", wolf, 1, 100), 168, "o feixe atravessa com o dano inteiro, com bônus");
  const hero = new Player(); hero.x = 100; hero.y = 100; hero.faceX = 1; hero.faceY = 0; hero.hp = 50; hero.maxHp = 100;
  const target = new RegionalMonster("a", "glacial-wolf", 150, 100), gains: number[] = []; target.hp = 5000;
  resolveSpellStrike("moon", hero, [target], OPEN, () => {}, a => gains.push(a), 10);
  assert.equal(5000 - target.hp, 108 - target.defense, "98 +10% = 108"); assert.deepEqual(gains, [Math.round((108 - target.defense) / 10)], "a mana devolvida vem do dano com bônus");
  const plain = new RegionalMonster("b", "glacial-wolf", 150, 100); plain.hp = 5000; resolveSpellStrike("moon", hero, [plain], OPEN, () => {}); assert.equal(5000 - plain.hp, 98 - plain.defense, "sem o argumento, sem bônus");
});

test("na superfície e na caverna o dano do Mago leva o bônus das roupas vestidas", () => {
  withPieces(() => {
    const hit = (gear: Record<string, string>): number => {
      const sim = mageAt(1, gear); sim.update(0.01, STILL, false); sim.slimes.clear(); sim.player.x = 16; sim.player.y = 16; sim.player.faceX = 1; sim.player.faceY = 0;
      const mob = new RegionalMonster("m", "glacial-wolf", 100, 16); mob.hp = 5000; sim.slimes.set("m", mob);
      assert.equal(sim.player.startCast("apprentice", c => sim.spendMana(c)), true);
      for (let i = 0; i < 60 && sim.player.attackTime > 0; i++) sim.update(1 / 60, STILL, false, "m");
      return 5000 - mob.hp;
    };
    const plain = hit({}), boosted = hit({ ring: "test-ring" });
    assert.equal(plain, 8 - new RegionalMonster("d", "glacial-wolf", 0, 0).defense, "sem anel, o dano de sempre"); assert.equal(boosted, 12 - new RegionalMonster("d", "glacial-wolf", 0, 0).defense, "com o anel de +50%, 8 viram 12 (superfície)");
    const entrance = caveEntranceInCell(0, 0, SEED)!;
    const cave = (damagePercent: number): number => {
      const room = new CaveRoom(entrance), p = room.player; room.monsters.clear(); let dir: { dx: number; dy: number } | null = null;
      for (let a = 0; a < 16 && !dir; a++) { const dx = Math.cos(a * Math.PI / 8), dy = Math.sin(a * Math.PI / 8); let clear = true; for (let s = 1; s <= 25 && clear; s++) clear = room.collision.canMove(p.x + dx * 6 * s, p.y + dy * 6 * s); if (clear) dir = { dx, dy }; }
      assert.ok(dir); room.player.faceX = dir.dx; room.player.faceY = dir.dy;
      const mob = new RegionalMonster("c", "glacial-wolf", p.x + dir.dx * 80, p.y + dir.dy * 80); mob.hp = 5000; room.monsters.set("c", mob);
      for (let i = 0; i < 30; i++) room.update(1 / 60, STILL, i === 0, "starter", 0, "c", { staff: "apprentice", spend: () => true, damagePercent });
      return 5000 - mob.hp;
    };
    const d = new RegionalMonster("d", "glacial-wolf", 0, 0).defense;
    assert.equal(cave(0), 8 - d, "caverna sem bônus"); assert.equal(cave(50), 12 - d, "na caverna o bônus vale igual");
  });
});

test("o texto dos bônus no inventário e as ligações do HUD, da simulação e da caverna", () => {
  assert.equal(describeGearBonus(undefined), ""); assert.equal(describeGearBonus({}), ""); assert.equal(describeGearBonus({ mana: 0, regen: 0, damage: 0 }), "");
  assert.equal(describeGearBonus({ mana: 2, regen: 3, damage: 1 }), "mana máxima +2% · recarga de mana +3% · dano das magias +1%"); assert.equal(describeGearBonus({ damage: 5 }), "dano das magias +5%");
  assert.equal(describeGearTotals({ mana: 20, regen: 10, damage: 5 }), "Mana +20% · Recarga +10% · Dano +5%"); assert.equal(describeGearTotals(NO_GEAR_BONUS), "Mana +0% · Recarga +0% · Dano +0%");
  const service = read("src/app/hud.service.ts"), page = read("src/app/game-page.html"), sim = read("src/engine/OfflineSimulation.ts");
  assert.match(service, /readonly gearBonusTotal = computed\(\(\) => this\.heroClass\(\) === 'mage' \? gearBonus\(this\.gear\(\) \?\? \{\}\) : NO_GEAR_BONUS\);/, "só o Mago mostra os bônus");
  assert.match(service, /\(this\.gearBonusLabel\(id\) \? ' · ' \+ this\.gearBonusLabel\(id\) : ''\)/, "a mochila diz o bônus de cada peça");
  assert.match(page, /@if \(hud\.heroClass\(\) === 'mage' && hud\.gear\(\) !== null\) \{ <span id="equipmentBonus">\{\{ hud\.gearBonusText\(\) \}\}<\/span> \}/);
  assert.match(page, /hud\.gearBonusLabel\(id\) \? " · " \+ hud\.gearBonusLabel\(id\) : ""/, "o painel da peça diz o bônus dela");
  assert.match(sim, /get maxMana\(\): number \{ return scaledMaxMana\(heroClassSheet\(this\.heroClass\)\.maxMana\(this\.level\), this\.gearBonus\); \}/);
  assert.match(sim, /regenerateMana\(this\.manaPoints, this\.heroClass, this\.level, dt, this\.gearBonus\)/); assert.match(sim, /amount=>this\.gainMana\(amount\),this\.gearBonus\.damage\)/);
  assert.match(read("src/game/modes/caveMode.ts"), /damagePercent: host\.sim\.gearBonus\.damage \}/); assert.match(read("src/engine/rooms/CaveRoom.ts"), /caster\?\.gain,caster\?\.damagePercent\)/);
});
