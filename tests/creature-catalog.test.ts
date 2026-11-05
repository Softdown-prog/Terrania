import assert from "node:assert/strict";
import test from "node:test";
import { CREATURE_CATALOG, type CreatureView } from "../src/actors/CreatureCatalog.ts";
import { Player } from "../src/actors/Player.ts";
import { Slime } from "../src/actors/Slime.ts";
import { visibleBattleCreatures } from "../src/engine/ClassicBattleList.ts";
import { ClassicCombat } from "../src/engine/ClassicCombat.ts";
import { ClassicPursuit, inClassicAttackPosition } from "../src/engine/ClassicPursuit.ts";

const open = { canMove: () => true };

test("Slimes compartilham a definição sem compartilhar HP ou dano recebido", () => {
  const hero = new Player();
  hero.x = -660;
  hero.y = -1008;
  const wounded = new Slime("wounded", hero.x + 32, hero.y);
  const attacker = new Slime("attacker", hero.x + 12, hero.y);
  assert.equal(attacker.kind, "slime");
  wounded.takeHit(hero.x, hero.y);
  assert.equal(wounded.hp, 1);
  assert.equal(attacker.hp, 2);
  assert.equal(CREATURE_CATALOG.slime.maxHp, 2);
  attacker.update(1 / 60, hero, open);
  assert.equal(hero.hp, 91, "o dano de contato existente permanece 9");
  attacker.update(1 / 60, hero, open);
  assert.equal(hero.hp, 91, "o intervalo entre contatos continua ativo");
});

test("Battle List, perseguição e combate aceitam uma visão sem a classe Slime", () => {
  const creature: CreatureView = Object.freeze({ id: "view", kind: "slime", x: 215, y: 16, hp: 1 });
  const hero = new Player();
  const visible = visibleBattleCreatures([creature], hero, {
    centerX: 100, centerY: 16, halfWidth: 150, halfHeight: 100,
  });
  assert.deepEqual(visible, [{ id: "view", name: "Slime", hp: 1, maxHp: 2, distanceTiles: 7 }]);
  const mobs = new Map([[creature.id, creature]]);
  const follow = new ClassicPursuit(), combat = new ClassicCombat();
  assert.equal(combat.selectAt(creature, mobs.values()), true);
  assert.equal(combat.label(mobs), "Slime");
  assert.equal(combat.tick(1 / 60, hero, mobs, open), false, "ainda fora do alcance");
  for (let frame = 0; frame < 240 && !inClassicAttackPosition(hero, creature, open); frame++)
    hero.update(1 / 60, follow.direction(1 / 60, hero, combat.targetId, mobs, open), open);
  assert.equal(inClassicAttackPosition(hero, creature, open), true);
  assert.equal(combat.tick(1 / 60, hero, mobs, open), true);
  assert.equal(creature.hp, 1, "a projeção e o controlador não alteram HP autoritativo");
});
