import assert from "node:assert/strict";
import test from "node:test";
import { Slime } from "../src/actors/Slime.ts";
import {
  MAX_BATTLE_CREATURES, visibleBattleCreatures,
  type BattleViewport,
} from "../src/engine/combat/ClassicBattleList.ts";

const HERO = { x: 32, y: 32 };
const VIEW: BattleViewport = {
  centerX: 90, centerY: 60, halfWidth: 100, halfHeight: 80,
};

test("Battle List inclui somente criaturas vivas que realmente entram na câmera", () => {
  const center = new Slime("center", 80, 50);
  const nearEdge = new Slime("edge", 197, 60); // center outside by 7px, sprite inside
  const outside = new Slime("offscreen", 205, 60);
  const above = new Slime("above", 90, -45);
  const defeated = new Slime("dead", 75, 50);
  defeated.hp = 0;
  const visible = visibleBattleCreatures(
    [outside, center, above, defeated, nearEdge], HERO, VIEW,
  );
  assert.deepEqual(visible.map(row => row.id), ["center", "edge"]);
  assert.deepEqual(visible[0], {
    id: "center", name: "Slime", hp: 2, maxHp: 2, distanceTiles: 2,
  });
  assert.equal(visible[1]?.distanceTiles, 6);
});

test("os monstros entram e saem da lista ao caminhar, mover a câmera ou reduzir o zoom", () => {
  const mob = new Slime("moving", 180, 32);
  const centered: BattleViewport = {
    centerX: 32, centerY: 32, halfWidth: 80, halfHeight: 90,
  };
  assert.deepEqual(visibleBattleCreatures([mob], HERO, centered), []);
  assert.equal(visibleBattleCreatures([mob], HERO, {
    ...centered, centerX: 110,
  }).length, 1);
  assert.equal(visibleBattleCreatures([mob], HERO, {
    ...centered, halfWidth: 150,
  }).length, 1);
  mob.x = 320;
  assert.deepEqual(visibleBattleCreatures([mob], HERO, {
    ...centered, centerX: 110, halfWidth: 150,
  }), []);
});

test("ordem por distância e ID estável; vida atualiza e máximo limita linhas", () => {
  const monsters = Array.from({ length: MAX_BATTLE_CREATURES + 5 }, (_, i) =>
    new Slime("slime-" + String(i).padStart(2, "0"), 40 + i, 32));
  monsters[1]!.hp = 1;
  const view = { ...VIEW, centerX: 70, halfWidth: 300 };
  const rows = visibleBattleCreatures(monsters.reverse(), HERO, view);
  assert.equal(rows.length, MAX_BATTLE_CREATURES);
  assert.equal(rows[0]?.id, "slime-00");
  assert.equal(rows[1]?.hp, 1);
  assert.equal(rows[1]?.maxHp, 2);
  assert.equal(rows.at(-1)?.id, "slime-23");
});

test("dados fora do mundo não entram na UI nem permitem cálculos inválidos", () => {
  const invalid = new Slime("broken", NaN, Infinity);
  assert.deepEqual(visibleBattleCreatures([invalid], HERO, VIEW), []);
  assert.deepEqual(visibleBattleCreatures([new Slime("valid", 50, 50)],
    HERO, { ...VIEW, halfWidth: 0 }), []);
  assert.deepEqual(visibleBattleCreatures([], HERO, VIEW), []);
  assert.deepEqual(visibleBattleCreatures([new Slime("valid", 50, 50)],
    { x: NaN, y: 0 }, VIEW), []);
});
