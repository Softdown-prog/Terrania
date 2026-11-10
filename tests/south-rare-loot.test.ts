import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SOUTH_RARE_LOOT, southRareDrop, southRareLootById, southRareLootByName } from "../src/monsters/rareLoot.ts";
import { CREATURE_CATALOG } from "../src/monsters/catalog.ts";
import { rollCreatureLoot } from "../src/actors/RegionalMonster.ts";
import { Inventory, MAX_STACK } from "../src/engine/character/Inventory.ts";
import { gameCatalog } from "../server/src/db/catalog.ts";

const sheetOrder = [
  "dune-rat", "sand-beetle", "sand-goblin", "horned-viper", "dune-scorpion",
  "desert-orc", "mirage-imp", "oasis-elf", "clay-troll", "carrion-sandworm",
] as const;

test("Sul: os dez raros únicos seguem a cartela 5×2 e suas espécies", () => {
  assert.deepEqual(Object.keys(SOUTH_RARE_LOOT), sheetOrder);
  const items=Object.values(SOUTH_RARE_LOOT);
  assert.equal(new Set(items.map(item=>item.id)).size,10);
  assert.equal(new Set(items.map(item=>item.name)).size,10);
  for(const kind of sheetOrder) {
    const rare=SOUTH_RARE_LOOT[kind],def=CREATURE_CATALOG[kind];
    assert.equal(def.region,"south");
    assert.ok(rare.chance>0&&rare.chance<.05);
    assert.deepEqual(def.loot.at(-1),southRareDrop(kind));
    assert.equal(def.loot.filter(item=>item.item===rare.name).length,1);
    assert.equal(southRareLootById(rare.id),rare);
    assert.equal(southRareLootByName(rare.name),rare);
    assert.ok(rare.id.startsWith("rare-"));
  }
  assert.equal(southRareLootById("rare-inexistente"),null);
});

test("Sul: drops raros são possíveis, infrequentes e determinísticos por monstro", () => {
  for(const kind of sheetOrder) {
    const rare=SOUTH_RARE_LOOT[kind];
    let found=0;
    for(let i=0;i<1500;i++) {
      const id="rare-audit:"+kind+":"+i;
      const once=rollCreatureLoot(kind,id);
      assert.deepEqual(once,rollCreatureLoot(kind,id));
      if(once.includes(rare.name))found++;
    }
    assert.ok(found>=3,kind+": raro precisa ser possível");
    assert.ok(found<150,kind+": não pode ser garantido");
  }
});

test("Sul: raros são materiais legítimos e persistem após salvar a bolsa", () => {
  const bag=new Inventory();
  for(const item of Object.values(SOUTH_RARE_LOOT)) {
    assert.equal(bag.addMaterial(item.name),true,item.name);
    assert.equal(bag.materials[item.name],1);
  }
  const loaded=new Inventory(JSON.parse(JSON.stringify(bag.snapshot())));
  assert.deepEqual(loaded.materials,bag.materials);
  for(let i=1;i<MAX_STACK;i++) loaded.addMaterial(SOUTH_RARE_LOOT["dune-rat"].name);
  assert.equal(loaded.materials[SOUTH_RARE_LOOT["dune-rat"].name],MAX_STACK);
  assert.equal(loaded.addMaterial(SOUTH_RARE_LOOT["dune-rat"].name),false);
  assert.equal(loaded.addMaterial("Raro falso"),false);
});

test("Sul: catálogo PostgreSQL publica dez raros reais sem inventar negociação", () => {
  const catalog=gameCatalog();
  assert.equal(catalog.length,34);
  for(const [monster,rare] of Object.entries(SOUTH_RARE_LOOT)) {
    const item=catalog.find(row=>row.id===rare.id);
    assert.ok(item,rare.id);
    assert.equal(item.name,rare.name);
    assert.equal(item.rarity,"rare");
    assert.equal(item.category,"collectible");
    assert.ok("region" in item.attributes);
    assert.ok("monster" in item.attributes);
    if("monster" in item.attributes)assert.equal(item.attributes.monster,monster);
  }
  const svg=readFileSync("src/app/item-icon.component.ts","utf8");
  for(const rare of Object.values(SOUTH_RARE_LOOT))
    assert.ok(svg.includes("@case ('"+rare.id+"')"),rare.id+": ícone procedural ausente");
});
