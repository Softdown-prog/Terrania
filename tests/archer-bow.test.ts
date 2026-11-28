import test from "node:test";
import assert from "node:assert/strict";
import { OfflineSimulation } from "../src/engine/OfflineSimulation.ts";
import { Inventory, normalizeInventory } from "../src/engine/character/Inventory.ts";
import { BOWS, BOW_IDS, DEFAULT_BOW, bowUnlocked, isBowId } from "../src/engine/character/Bows.ts";
import { ARROWS, ARROW_IDS, DEFAULT_ARROW, MAX_ARROWS, isArrowId } from "../src/engine/character/Arrows.ts";
import { EMPTY_QUIVER, STARTING_ARROWS, STARTING_QUIVER, addArrows, sanitizeQuiver, spendArrows, totalArrows } from "../src/engine/character/Quiver.ts";
import { TILE_SIZE } from "../src/world/terrain.ts";

/** O arco e a munição do Arqueiro (ADR 0110, lote A1b): o Arco de Caça, a flecha de junco, a aljava na bolsa e no save, e o perfil de combate à distância. */
const SEED = 842136;
const archer = (extra: Record<string, unknown> = {}) => new OfflineSimulation(SEED, { ...new OfflineSimulation(SEED).snapshot(), heroClass: "archer", ...extra });

test("o Arco de Caça: nível 0, 8 de dano, 0,8 s entre tiros, 0,12 s de preparo, 7 tiles, uma flecha por tiro", () => {
  assert.deepEqual([...BOW_IDS], ["hunting", "horn", "yew", "bone", "ember", "thorn", "boreal", "sun", "moon", "storm", "astral"]); assert.equal(DEFAULT_BOW, "hunting");
  const bow = BOWS.hunting;
  assert.deepEqual([bow.name, bow.level, bow.damage, bow.interval, bow.windup, bow.range, bow.arrowsPerShot, bow.material], ["Arco de Caça", 0, 8, 0.8, 0.12, 7, 1, "madeira de freixo"]);
  assert.equal(bowUnlocked("hunting", 1), true); assert.equal(bowUnlocked("hunting", 0), true); assert.equal(bowUnlocked("hunting", -1), false); assert.equal(bowUnlocked("hunting", 1.5), false);
  assert.equal(isBowId("hunting"), true); for (const bad of ["", "Hunting", "long", null, 3, {}]) assert.equal(isBowId(bad), false, String(bad));
});

test("a flecha de junco: a comum, sem dano extra; no máximo 99 por tipo", () => {
  assert.deepEqual([...ARROW_IDS], ["reed", "iron"]); assert.equal(DEFAULT_ARROW, "reed"); assert.equal(MAX_ARROWS, 99);
  assert.deepEqual(ARROWS.reed, { name: "Flecha de Junco", bonusDamage: 0, price: 1 });
  assert.equal(isArrowId("reed"), true); for (const bad of ["", "fire", undefined, 1]) assert.equal(isArrowId(bad), false, String(bad));
});

test("a aljava: começa com 30 de junco; gasta tudo ou nada; enche até 99; o save é limpo", () => {
  assert.equal(STARTING_ARROWS, 30); assert.deepEqual(STARTING_QUIVER.counts, { reed: 30, iron: 0 }); assert.deepEqual(EMPTY_QUIVER.counts, { reed: 0, iron: 0 });
  assert.equal(totalArrows(STARTING_QUIVER), 30);
  assert.deepEqual(spendArrows(STARTING_QUIVER, 1)!.counts, { reed: 29, iron: 0 }); assert.deepEqual(spendArrows(STARTING_QUIVER, 30)!.counts, { reed: 0, iron: 0 });
  assert.equal(spendArrows(STARTING_QUIVER, 31), null, "sem o bastante nada muda"); assert.equal(spendArrows(EMPTY_QUIVER, 1), null);
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(spendArrows(STARTING_QUIVER, bad), null, String(bad));
  assert.deepEqual(addArrows(STARTING_QUIVER, "reed", 10), { quiver: { equipped: "reed", counts: { reed: 40, iron: 0 } }, added: 10 });
  assert.deepEqual(addArrows(STARTING_QUIVER, "reed", 500), { quiver: { equipped: "reed", counts: { reed: 99, iron: 0 } }, added: 69 }, "para no máximo");
  assert.equal(addArrows({ equipped: "reed", counts: { reed: 99, iron: 0 } }, "reed", 1).added, 0, "cheia não recebe");
  for (const bad of [0, -2, 1.5, Number.NaN]) assert.equal(addArrows(STARTING_QUIVER, "reed", bad).added, 0, String(bad));
  assert.equal(addArrows(STARTING_QUIVER, "fire" as never, 5).added, 0);
  assert.deepEqual(sanitizeQuiver({ equipped: "reed", counts: { reed: 12, iron: 0 } }), { equipped: "reed", counts: { reed: 12, iron: 0 } });
  assert.deepEqual(sanitizeQuiver({ equipped: "x", counts: { reed: 500, fire: 4 } }), { equipped: "reed", counts: { reed: 99, iron: 0 } }, "tipo desconhecido some e o excesso vira 99");
  for (const bad of [undefined, null, 5, "a", [], { counts: { reed: -3 } }, { counts: { reed: 1.5 } }, { counts: { reed: "9" } }, { counts: 4 }]) assert.deepEqual(sanitizeQuiver(bad).counts, { reed: 0, iron: 0 }, JSON.stringify(bad));
});

test("a bolsa do Arqueiro: nasce com as 30 flechas, gasta e ganha flechas, e o save guarda a aljava; as outras vocações não têm aljava", () => {
  const bag = new Inventory(undefined, 1, "archer");
  assert.deepEqual(bag.quiver, STARTING_QUIVER); assert.deepEqual(bag.snapshot().quiver, STARTING_QUIVER);
  assert.equal(bag.spendArrows(1), true); assert.equal(bag.quiver.counts.reed, 29);
  assert.equal(bag.spendArrows(30), false); assert.equal(bag.quiver.counts.reed, 29, "tudo ou nada");
  assert.equal(bag.gainArrows("reed", 100), 70); assert.equal(bag.quiver.counts.reed, 99);
  const back = new Inventory(bag.snapshot(), 1, "archer"); assert.equal(back.quiver.counts.reed, 99, "o save volta igual");
  const empty = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, quiver: { equipped: "reed", counts: { reed: 0, iron: 0 } } }, 1, "archer");
  assert.equal(empty.quiver.counts.reed, 0, "sem flechas fica sem flechas (não volta a 30)"); assert.deepEqual(empty.snapshot().quiver!.counts, { reed: 0, iron: 0 });
  for (const heroClass of ["knight", "mage"] as const) {
    const other = new Inventory({ gel: 0, potion: 0, questRewardClaimed: false, quiver: { equipped: "reed", counts: { reed: 50, iron: 0 } } }, 1, heroClass);
    assert.equal(other.quiver.counts.reed, 0, heroClass); assert.equal(other.spendArrows(1), false); assert.equal(other.gainArrows("reed", 5), 0); assert.equal("quiver" in other.snapshot(), false, heroClass);
  }
  assert.deepEqual(normalizeInventory({ gel: 0, potion: 0, questRewardClaimed: false, quiver: { counts: { reed: 7, iron: 0 } } }).quiver, { equipped: "reed", counts: { reed: 7, iron: 0 } });
  assert.equal("quiver" in normalizeInventory({ gel: 1 }), false);
});

test("o perfil de combate do Arqueiro: de longe, 7 tiles, 0,8 s; pronto só com flecha; o Cavaleiro segue de perto", () => {
  const sim = archer(), profile = sim.combatProfile;
  assert.equal(sim.equippedBow, "hunting"); assert.equal(profile.interval, 0.8); assert.equal(profile.ranged!.reach, 7 * TILE_SIZE); assert.equal(profile.ranged!.ready, true);
  assert.equal(profile.followStop, 7 * TILE_SIZE - 4);
  assert.equal(sim.inventory.quiver.counts.reed, 30, "o herói nasce com 30 flechas");
  for (let i = 0; i < 29; i++) assert.equal(sim.inventory.spendArrows(1), true);
  assert.equal(sim.combatProfile.ranged!.ready, true, "com uma flecha ainda atira");
  assert.equal(sim.inventory.spendArrows(1), true);
  assert.equal(sim.combatProfile.ranged!.ready, false, "sem flecha não atira");
  assert.equal(sim.combatProfile.ranged!.reach, 7 * TILE_SIZE, "o alcance não muda");
  assert.equal(new OfflineSimulation(SEED).combatProfile.ranged, undefined);
});

test("a aljava vai ao save da aventura e volta: sem perder nem ganhar flechas", () => {
  const sim = archer(); sim.inventory.spendArrows(8);
  const snapshot = sim.snapshot(); assert.equal(snapshot.inventory!.quiver!.counts.reed, 22);
  const loaded = new OfflineSimulation(SEED, JSON.parse(JSON.stringify(snapshot)));
  assert.equal(loaded.heroClass, "archer"); assert.equal(loaded.inventory.quiver.counts.reed, 22);
  assert.equal(new OfflineSimulation(SEED).snapshot().inventory!.quiver, undefined, "o Cavaleiro não ganha campo novo");
});
