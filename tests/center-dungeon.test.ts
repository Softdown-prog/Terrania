import test from "node:test";
import assert from "node:assert/strict";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../src/world/caves.ts";
import { CREATURE_CATALOG } from "../src/monsters/catalog.ts";
import { DUNGEONS, caveFloorCount, dungeonFloor, dungeonFloors, dungeonFor, usesDungeon } from "../src/dungeons/index.ts";
import { CENTER_DUNGEONS } from "../src/dungeons/center/index.ts";
import { masmorraDasRaizes } from "../src/dungeons/center/masmorra-das-raizes.ts";
import { caveDefeatDrops } from "../src/engine/rooms/CaveLoot.ts";

/** Masmorra das Raízes (ADR 0094, parte 4b): parte das cavernas verdes do Centro, três andares (ou dois), Raiz-Viva no meio e o Ent Ancião no fundo. */
const SEED = 842136;
const verdant = (): CaveEntrance[] => {
  const found: CaveEntrance[] = [];
  for (let cx = -20; cx <= 20; cx++)
    for (let cy = -20; cy <= 20; cy++) {
      const entrance = caveEntranceInCell(cx, cy, SEED);
      if (entrance && !entrance.tower && entrance.theme === "verdant") found.push(entrance);
    }
  return found;
};
const common = (): CaveEntrance[] => verdant().filter(entrance => !isStarterCave(entrance));
const dungeons = (): CaveEntrance[] => common().filter(entrance => dungeonFor(entrance));

test("masmorra das raízes: está registrada no Centro, no tema verde, com a fração certa", () => {
  assert.deepEqual(CENTER_DUNGEONS, [masmorraDasRaizes]);
  assert.ok(DUNGEONS.includes(masmorraDasRaizes));
  assert.equal(masmorraDasRaizes.id, "masmorra-das-raizes");
  assert.equal(masmorraDasRaizes.region, "center");
  assert.equal(masmorraDasRaizes.theme, "verdant");
  assert.equal(masmorraDasRaizes.share, .4);
  assert.deepEqual(masmorraDasRaizes.shortVariant, [0, 2]);
  assert.deepEqual(masmorraDasRaizes.floors.map(floor => floor.name), ["Raízes Rasas", "Galeria dos Cipós", "Coração da Gruta"]);
  assert.deepEqual(masmorraDasRaizes.floors.map(floor => floor.encounters), [4, 5, 4]);
});

test("masmorra das raízes: a fração das cavernas verdes é sorteada pela entrada, e é sempre a mesma", () => {
  const all = common();
  assert.ok(all.length > 300, "há muitas cavernas verdes para medir");
  const withDungeon = dungeons();
  const share = withDungeon.length / all.length;
  assert.ok(share > .32 && share < .48, `fração ${share.toFixed(2)} perto de 40%`);
  for (const entrance of all) {
    assert.equal(Boolean(dungeonFor(entrance)), usesDungeon(masmorraDasRaizes, entrance));
    assert.equal(dungeonFor(entrance), dungeonFor(entrance), "determinístico");
  }
  assert.ok(all.some(entrance => !dungeonFor(entrance)), "as outras seguem como a Gruta das Raízes comum");
});

test("masmorra das raízes: a caverna de treinamento da Aela nunca vira masmorra", () => {
  const starters = verdant().filter(isStarterCave);
  assert.ok(starters.length >= 1);
  for (const entrance of starters) {
    assert.equal(dungeonFor(entrance), null);
    assert.equal(caveFloorCount(entrance), 1);
    assert.deepEqual(dungeonFloors(entrance), []);
  }
});

test("masmorra das raízes: mesmo quando o sorteio da fração a escolheria, a de treinamento fica de fora", () => {
  let drawn = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const entrance = caveEntranceInCell(0, 0, seed);
    if (!entrance || entrance.theme !== "verdant" || !usesDungeon(masmorraDasRaizes, entrance)) continue;
    drawn++;
    assert.ok(isStarterCave(entrance));
    assert.equal(dungeonFor(entrance), null, "seed " + seed);
    assert.equal(caveFloorCount(entrance), 1);
  }
  assert.ok(drawn >= 5, "o sorteio escolheria a de treinamento em vários mundos (" + drawn + ")");
});

test("masmorra das raízes: três andares ou dois, o primeiro e o chefe sempre os mesmos", () => {
  const counts = new Set(dungeons().map(caveFloorCount));
  assert.deepEqual([...counts].sort(), [2, 3]);
  for (const entrance of dungeons()) {
    const floors = dungeonFloors(entrance);
    assert.equal(floors[0]?.name, "Raízes Rasas");
    assert.equal(floors.at(-1)?.name, "Coração da Gruta");
    assert.equal(floors.at(-1)?.boss, "elder-cave-ent");
    assert.equal(dungeonFloor(entrance, floors.length)?.boss, "elder-cave-ent");
    assert.equal(dungeonFloor(entrance, floors.length + 1), null);
    if (floors.length === 3) assert.equal(floors[1]?.name, "Galeria dos Cipós");
  }
});

test("masmorra das raízes: o Ent Ancião só no último andar, a Raiz-Viva só do segundo para baixo", () => {
  const [first, middle, last] = masmorraDasRaizes.floors;
  assert.equal("boss" in first, false);
  assert.equal("boss" in middle, false);
  assert.equal(last.boss, "elder-cave-ent");
  const living = (floor: { readonly monsters: readonly string[] }) => floor.monsters.includes("living-root");
  assert.equal(living(first), false, "o primeiro andar não tem elite");
  assert.equal(living(middle), true);
  assert.equal(living(last), true);
  for (const floor of masmorraDasRaizes.floors) assert.equal((floor.monsters as readonly string[]).includes("elder-cave-ent"), false, "o chefe não é morador comum");
});

test("masmorra das raízes: todos os moradores e o chefe moram em cavernas verdes", () => {
  for (const floor of masmorraDasRaizes.floors) {
    assert.equal(new Set(floor.monsters).size, floor.monsters.length, "sem repetição");
    for (const kind of [...floor.monsters, ..."boss" in floor ? [floor.boss] : []])
      assert.ok(CREATURE_CATALOG[kind].caveThemes.includes("verdant"), `${kind} mora em caverna verde`);
  }
});

test("masmorra das raízes: o chefe deixa moedas dobradas, e a Raiz-Viva só as moedas comuns", () => {
  const boss = caveDefeatDrops("elder-cave-ent", "cave:1:0:3:boss", 5, 6);
  const ordinary = caveDefeatDrops("elder-cave-ent", "cave:1:0:3:m1", 5, 6);
  const coin = (drops: ReturnType<typeof caveDefeatDrops>) => drops.find(drop => drop.item === "coin")?.amount ?? 0;
  assert.ok(coin(boss) > coin(ordinary) * 3, "o baú do chefe vale bem mais");
  const root = caveDefeatDrops("living-root", "cave:1:0:2:m1", 1, 2);
  assert.equal(root.length, 1);
  assert.equal(root[0]?.item, "coin");
});
