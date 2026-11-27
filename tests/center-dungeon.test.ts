import test from "node:test";
import assert from "node:assert/strict";
import { caveEntranceInCell, isStarterCave, type CaveEntrance } from "../src/world/caves.ts";
import { CREATURE_CATALOG } from "../src/monsters/catalog.ts";
import { DUNGEONS, caveFloorCount, dungeonFloor, dungeonFloors, dungeonFor, usesDungeon } from "../src/dungeons/index.ts";
import { CENTER_DUNGEONS } from "../src/dungeons/center/index.ts";
import { masmorraDasRaizes } from "../src/dungeons/center/masmorra-das-raizes.ts";
import { caveDefeatDrops } from "../src/engine/rooms/CaveLoot.ts";
import { CaveRoom } from "../src/engine/rooms/CaveRoom.ts";

/** Masmorra das Raízes (ADR 0094 e 0101): toda gruta verde do Centro tem cinco andares (ou três), a Raiz-Viva do segundo para baixo e o Ent Ancião no fundo. */
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
const names = masmorraDasRaizes.floors.map(floor => floor.name);

test("masmorra das raízes: registrada no Centro, no tema verde, com cinco andares e sem fração (vale para toda gruta)", () => {
  assert.deepEqual(CENTER_DUNGEONS, [masmorraDasRaizes]);
  assert.ok(DUNGEONS.includes(masmorraDasRaizes));
  assert.equal(masmorraDasRaizes.id, "masmorra-das-raizes"); assert.equal(masmorraDasRaizes.region, "center"); assert.equal(masmorraDasRaizes.theme, "verdant");
  assert.equal("share" in masmorraDasRaizes, false, "sem `share`: toda gruta verde é a masmorra");
  assert.deepEqual(names, ["Raízes Rasas", "Galeria dos Cipós", "Jardim dos Fungos", "Túneis Retorcidos", "Coração da Gruta"]);
  assert.deepEqual(masmorraDasRaizes.floors.map(floor => floor.encounters), [4, 5, 5, 6, 5], "os andares de baixo têm mais gente");
  assert.deepEqual(masmorraDasRaizes.shortVariant, [0, 1, 4], "a versão curta pula o jardim e os túneis e mantém a elite e o chefe");
});

test("masmorra das raízes: toda gruta verde comum é masmorra, e a de treinamento da Aela nunca", () => {
  const all = common();
  assert.ok(all.length > 300, "há muitas grutas verdes para conferir");
  for (const entrance of all) {
    assert.equal(dungeonFor(entrance), masmorraDasRaizes, entrance.id);
    assert.equal(usesDungeon(masmorraDasRaizes, entrance), true);
  }
  const starters = verdant().filter(isStarterCave);
  assert.ok(starters.length >= 1);
  for (const entrance of starters) {
    assert.equal(dungeonFor(entrance), null); assert.equal(caveFloorCount(entrance), 1); assert.deepEqual(dungeonFloors(entrance), []);
  }
  for (let seed = 1; seed <= 400; seed++) { // mesmo se a regra de `share` voltasse a sortear, a de treinamento fica de fora
    const entrance = caveEntranceInCell(0, 0, seed);
    if (entrance && entrance.theme === "verdant") assert.equal(dungeonFor(entrance), null, "seed " + seed);
  }
});

test("masmorra das raízes: cinco andares ou três (a versão curta é sorteada pela entrada), com o primeiro e o chefe fixos", () => {
  const counts = new Map<number, number>();
  for (const entrance of common()) {
    const floors = dungeonFloors(entrance); counts.set(floors.length, (counts.get(floors.length) ?? 0) + 1);
    assert.equal(floors[0]?.name, "Raízes Rasas"); assert.equal(floors.at(-1)?.name, "Coração da Gruta"); assert.equal(floors.at(-1)?.boss, "elder-cave-ent");
    assert.deepEqual(floors.map(floor => floor.name), floors.length === 5 ? names : ["Raízes Rasas", "Galeria dos Cipós", "Coração da Gruta"]);
    assert.equal(dungeonFloor(entrance, floors.length)?.boss, "elder-cave-ent"); assert.equal(dungeonFloor(entrance, floors.length + 1), null);
    assert.deepEqual(dungeonFloors(entrance), floors, "determinístico");
  }
  assert.deepEqual([...counts.keys()].sort(), [3, 5]);
  const share = counts.get(3)! / common().length;
  assert.ok(share > .35 && share < .55, `a versão curta aparece em perto de 45 % (${share.toFixed(2)})`);
});

test("masmorra das raízes: o Ent Ancião só no último andar, a Raiz-Viva do segundo para baixo, e ninguém repetido na tabela", () => {
  const floors = masmorraDasRaizes.floors;
  floors.forEach((floor, i) => {
    assert.equal("boss" in floor, i === floors.length - 1, floor.name);
    assert.equal(new Set(floor.monsters).size, floor.monsters.length, floor.name + ": sem repetir na tabela");
    assert.equal((floor.monsters as readonly string[]).includes("living-root"), i >= 1 && i !== 2, `${floor.name}: elite só em andares fundos (o jardim é de bichos menores)`);
    assert.equal((floor.monsters as readonly string[]).includes("elder-cave-ent"), false, "o chefe não é morador comum");
    for (const kind of [...floor.monsters, ..."boss" in floor ? [floor.boss] : []]) assert.ok(CREATURE_CATALOG[kind].caveThemes.includes("verdant"), `${kind} mora em caverna verde`);
  });
});

test("masmorra das raízes: cada andar sorteia o povo da sua tabela, no número de encontros pedido, e o último tem o chefe", () => {
  for (const entrance of common().slice(0, 25)) {
    const count = caveFloorCount(entrance);
    for (let index = 1; index <= count; index++) {
      const plan = dungeonFloor(entrance, index)!, room = new CaveRoom(entrance, 100, 100, new Set(), { floorIndex: index });
      const kinds = new Set<string>([...room.monsters.values()].map(mob => mob.kind)), allowed = new Set<string>([...plan.monsters, ...("boss" in plan ? [plan.boss] : [])]);
      for (const kind of kinds) assert.ok(allowed.has(kind), `${plan.name}: ${kind} fora da tabela`);
      const common = [...room.monsters.keys()].filter(id => !id.endsWith(":boss")).length;
      assert.ok(common >= Math.min(3, plan.encounters) && common <= plan.encounters, `${plan.name}: ${common} encontros de até ${plan.encounters}`);
      assert.equal([...room.monsters.keys()].some(id => id.endsWith(":boss")), index === count, `${plan.name}: chefe só no último`);
    }
  }
});

test("masmorra das raízes: o chefe deixa moedas dobradas, e a Raiz-Viva só as moedas comuns", () => {
  const boss = caveDefeatDrops("elder-cave-ent", "cave:1:0:3:boss", 5, 6), ordinary = caveDefeatDrops("elder-cave-ent", "cave:1:0:3:m1", 5, 6);
  const coin = (drops: ReturnType<typeof caveDefeatDrops>) => drops.find(drop => drop.item === "coin")?.amount ?? 0;
  assert.ok(coin(boss) > coin(ordinary) * 3, "o baú do chefe vale bem mais");
  const root = caveDefeatDrops("living-root", "cave:1:0:2:m1", 1, 2);
  assert.equal(root.length, 1); assert.equal(root[0]?.item, "coin");
});
