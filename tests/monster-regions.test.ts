import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { CREATURE_CATALOG, REGIONAL_CREATURE_KINDS, SOUTH_SURFACE_KINDS, sandBeetleBuried } from "../src/monsters/catalog.ts";
import { CENTER_MONSTERS } from "../src/monsters/center/index.ts";
import { NORTH_MONSTERS } from "../src/monsters/north/index.ts";
import { SOUTH_MONSTERS } from "../src/monsters/south/index.ts";
import { EAST_MONSTERS } from "../src/monsters/east/index.ts";
import { WEST_MONSTERS } from "../src/monsters/west/index.ts";

const regions={center:CENTER_MONSTERS,north:NORTH_MONSTERS,south:SOUTH_MONSTERS,
  east:EAST_MONSTERS,west:WEST_MONSTERS} as const;

/** Biologia/linhagem canônica por região, independente do tipo de ataque. */
const speciesFamilies = {
  "center": {
    "slime": "slimes"
  },
  "north": {
    "boreal-yeti": "yetis",
    "glacial-wolf": "wolves",
    "frost-spirit": "spirits",
    "tundra-mammoth": "mammoths",
    "frost-banshee": "banshees",
    "runic-polar-bear": "bears"
  },
  "south": {
    "mire-hydra": "hydras",
    "dune-scorpion": "scorpions",
    "solar-scarab": "beetles",
    "rotten-marsh-ent": "ents",
    "poison-scout-toad": "toads",
    "carrion-sandworm": "worms",
    "sand-beetle": "beetles",
    "dune-rat": "rats",
    "sand-goblin": "goblins",
    "desert-orc": "orcs",
    "clay-troll": "trolls",
    "dune-scout": "smallfolk",
    "oasis-elf": "elves",
    "mirage-imp": "demons",
    "horned-viper": "snakes",
    "carrion-vulture": "vultures",
    "cactus-sprout": "plants"
  },
  "east": {
    "coral-crab": "crabs",
    "storm-serpent": "serpents",
    "abyssal-octopus": "octopuses",
    "tide-hunter-triton": "tritons"
  },
  "west": {
    "basalt-golem": "golems",
    "cliff-draconid": "draconids",
    "summit-griffin": "griffins",
    "magma-salamander": "salamanders"
  }
} as const;


test("bestiário: 32 fichas únicas e nenhuma espécie ausente do catálogo",()=>{
  assert.deepEqual(Object.keys(CREATURE_CATALOG).sort(),["slime",...REGIONAL_CREATURE_KINDS].sort());
  assert.equal(new Set(REGIONAL_CREATURE_KINDS).size,31);
  assert.equal(Object.keys(CREATURE_CATALOG).length,32);
});

test("bestiário: uma ficha por espécie em região/categoria/nome.ts, sem duplicatas",()=>{
  let count=0;
  for(const region of Object.keys(regions) as Array<keyof typeof regions>){
    const definitions=regions[region], ids=Object.keys(definitions).sort();
    const catalogIds=Object.entries(CREATURE_CATALOG)
      .filter(([,def])=>def.region===region).map(([kind])=>kind).sort();
    assert.deepEqual(ids,catalogIds,region+" cadastrou criaturas de outra região");
    const folders=speciesFamilies[region] as Readonly<Record<string,string>>;
    assert.deepEqual(Object.keys(folders).sort(),ids,"todas as criaturas devem ter sua categoria");
    const root="src/monsters/"+region;
    const rootEntries=readdirSync(root,{withFileTypes:true});
    const rootFiles=rootEntries.filter(x=>x.isFile()).map(x=>x.name).sort();
    assert.deepEqual(rootFiles,["index.ts"],region+" deve conter somente index.ts no nível da região");
    const categories=[...new Set(Object.values(folders))].sort();
    assert.deepEqual(rootEntries.filter(x=>x.isDirectory()).map(x=>x.name).sort(),
      categories,region+" contém categoria incorreta ou sobrando");
    for(const category of categories){
      const expected=Object.entries(folders)
        .filter(([,value])=>value===category).map(([id])=>id+".ts").sort();
      const files=readdirSync(root+"/"+category,{withFileTypes:true});
      assert.ok(files.every(x=>x.isFile()&&x.name.endsWith(".ts")),
        region+"/"+category+" deve conter somente arquivos de monstro .ts");
      assert.deepEqual(files.map(x=>x.name).sort(),expected,
        region+"/"+category+" deve ter somente fichas da linhagem correspondente");
      for(const name of expected){
        const file=root+"/"+category+"/"+name;
        const content=readFileSync(file,"utf8");
        assert.match(content,/satisfies CreatureDefinition/,
          file+" precisa exportar uma ficha TypeScript válida");
        count++;
      }
    }
    for(const [kind,definition] of Object.entries(definitions)){
      assert.strictEqual(CREATURE_CATALOG[kind as keyof typeof CREATURE_CATALOG],definition,
        kind+" não pode ter definição duplicada");
      assert.equal(definition.region,region);
    }
  }
  assert.equal(count,32,"32 arquivos individuais reais, nenhum monstro esquecido");
});

test("bestiário: API anterior aponta para as mesmas definições (sem cópias)",async()=>{
  const legacy=await import("../src/actors/CreatureCatalog.ts");
  assert.strictEqual(legacy.CREATURE_CATALOG,CREATURE_CATALOG);
  assert.strictEqual(legacy.REGIONAL_CREATURE_KINDS,REGIONAL_CREATURE_KINDS);
});

test("bestiário: atributos críticos não mudaram na reorganização",()=>{
  assert.deepEqual([CREATURE_CATALOG.slime.maxHp,CREATURE_CATALOG.slime.contactDamage],[2,9]);
  assert.deepEqual([CREATURE_CATALOG["dune-rat"].maxHp,CREATURE_CATALOG["dune-rat"].contactDamage],[35,6]);
  assert.deepEqual([CREATURE_CATALOG["boreal-yeti"].maxHp,CREATURE_CATALOG["boreal-yeti"].contactDamage],[380,36]);
  assert.deepEqual([CREATURE_CATALOG["coral-crab"].maxHp,CREATURE_CATALOG["coral-crab"].contactDamage],[240,21]);
  assert.deepEqual([CREATURE_CATALOG["basalt-golem"].maxHp,CREATURE_CATALOG["basalt-golem"].contactDamage],[320,28]);
});

test("empacotamento: a imagem Docker do backend inclui todas as fichas de monstros",()=>{
  const dockerfile=readFileSync("server/Dockerfile","utf8");
  assert.match(dockerfile,/COPY src\/monsters \/work\/src\/monsters/);
});

test("besouro: ficha original, nível e enterro abaixo de 20% mantidos",()=>{
  const beetle=CREATURE_CATALOG["sand-beetle"];
  assert.deepEqual(SOUTH_SURFACE_KINDS,["sand-beetle"]);
  assert.equal(beetle.region,"south");
  assert.deepEqual(beetle.caveThemes,[]);
  assert.deepEqual(beetle.recommendedLevels,[5,18]);
  assert.equal(beetle.maxHp,40);
  assert.equal(beetle.contactDamage,7);
  assert.equal(sandBeetleBuried(8),false);
  assert.equal(sandBeetleBuried(7),true);
  assert.equal(sandBeetleBuried(0),false);
});
